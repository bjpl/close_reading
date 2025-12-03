/**
 * EntityRepository - CRUD Operations
 *
 * Handles basic entity persistence operations:
 * - Create, read, update, delete
 * - Batch queries and pagination
 * - Type-based filtering
 */

import type { RuvectorClient } from '../client';
import type {
  Entity,
  EntityQueryOptions,
  EntityCreateOptions,
  EntityUpdateOptions,
  PaginatedResponse,
  GraphNode,
} from '../types';
import {
  EntityNotFoundError,
  VectorOperationError,
  GraphQueryError,
} from '../types';

export class EntityRepository {
  private readonly GRAPH_LABEL = 'Entity';

  constructor(private readonly client: RuvectorClient) {}

  /**
   * Create a new entity in graph database
   */
  async create(
    entity: Entity,
    options: EntityCreateOptions = {}
  ): Promise<Entity> {
    try {
      await this.storeEntityGraph(entity);
      return entity;
    } catch (error) {
      throw new VectorOperationError(
        `Failed to create entity: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<Entity | null> {
    try {
      const graphResult = await this.client.request<{ data: GraphNode[] }>({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH (e:${this.GRAPH_LABEL} {id: $id})
            RETURN e
          `,
          parameters: { id },
        },
      });

      if (!graphResult.data || graphResult.data.length === 0) {
        return null;
      }

      return this.graphNodeToEntity(graphResult.data[0]);
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get entity: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Get multiple entities by IDs
   */
  async getByIds(ids: string[]): Promise<Entity[]> {
    if (ids.length === 0) return [];

    try {
      const result = await this.client.request<{ data: GraphNode[] }>({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH (e:${this.GRAPH_LABEL})
            WHERE e.id IN $ids
            RETURN e
          `,
          parameters: { ids },
        },
      });

      return result.data.map((node) => this.graphNodeToEntity(node));
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get entities by IDs: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Update entity
   */
  async update(id: string, updates: Partial<Entity>): Promise<Entity> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new EntityNotFoundError(id);
      }

      const updatedEntity: Entity = {
        ...existing,
        ...updates,
        id, // Prevent ID changes
        updated_at: new Date().toISOString(),
      };

      await this.updateEntityGraph(updatedEntity);
      return updatedEntity;
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new VectorOperationError(
        `Failed to update entity: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Delete entity and all relationships
   */
  async delete(id: string): Promise<void> {
    try {
      await this.client.request({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH (e:${this.GRAPH_LABEL} {id: $id})
            DETACH DELETE e
          `,
          parameters: { id },
        },
      });
    } catch (error) {
      throw new GraphQueryError(
        `Failed to delete entity: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Query entities with filters and pagination
   */
  async query(
    options: EntityQueryOptions = {}
  ): Promise<PaginatedResponse<Entity>> {
    try {
      const {
        type,
        filters = {},
        includeEmbeddings = false,
        limit = 50,
        offset = 0,
      } = options;

      const filterConditions = this.buildFilterConditions(filters);
      const typeFilter = type ? `:${type}` : '';

      const query = `
        MATCH (e:${this.GRAPH_LABEL}${typeFilter})
        ${filterConditions ? `WHERE ${filterConditions}` : ''}
        RETURN e
        SKIP $offset
        LIMIT $limit
      `;

      const result = await this.client.request<{ data: GraphNode[] }>({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query,
          parameters: { offset, limit },
        },
      });

      const entities = result.data.map((node) =>
        this.graphNodeToEntity(node, includeEmbeddings)
      );

      // Get total count
      const countResult = await this.client.request<{ count: number }>({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH (e:${this.GRAPH_LABEL}${typeFilter})
            ${filterConditions ? `WHERE ${filterConditions}` : ''}
            RETURN count(e) as count
          `,
        },
      });

      const total = countResult.count || 0;

      return {
        items: entities,
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      throw new GraphQueryError(
        `Failed to query entities: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Find entities by type
   */
  async findByType(
    type: string,
    options: EntityQueryOptions = {}
  ): Promise<Entity[]> {
    const result = await this.query({ ...options, type });
    return result.items;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async storeEntityGraph(entity: Entity): Promise<void> {
    await this.client.request({
      method: 'POST',
      path: '/v1/graph/query',
      body: {
        query: `
          MERGE (e:${this.GRAPH_LABEL} {id: $id})
          SET e.type = $type,
              e.name = $name,
              e.properties = $properties,
              e.documentId = $documentId,
              e.created_at = $created_at,
              e.updated_at = $updated_at
          RETURN e
        `,
        parameters: {
          id: entity.id,
          type: entity.type,
          name: entity.name,
          properties: JSON.stringify(entity.properties),
          documentId: entity.documentId,
          created_at: entity.created_at,
          updated_at: entity.updated_at,
        },
      },
    });
  }

  private async updateEntityGraph(entity: Entity): Promise<void> {
    await this.client.request({
      method: 'POST',
      path: '/v1/graph/query',
      body: {
        query: `
          MATCH (e:${this.GRAPH_LABEL} {id: $id})
          SET e.type = $type,
              e.name = $name,
              e.properties = $properties,
              e.updated_at = $updated_at
          RETURN e
        `,
        parameters: {
          id: entity.id,
          type: entity.type,
          name: entity.name,
          properties: JSON.stringify(entity.properties),
          updated_at: entity.updated_at,
        },
      },
    });
  }

  private graphNodeToEntity(
    node: GraphNode,
    includeEmbedding = false
  ): Entity {
    const props = node.properties;
    return {
      id: props.id as string,
      type: props.type as string,
      name: props.name as string,
      properties:
        typeof props.properties === 'string'
          ? JSON.parse(props.properties)
          : props.properties || {},
      embedding: includeEmbedding ? (props.embedding as number[]) : undefined,
      documentId: props.documentId as string | undefined,
      created_at: props.created_at as string | undefined,
      updated_at: props.updated_at as string | undefined,
    };
  }

  private buildFilterConditions(filters: Record<string, unknown>): string {
    const conditions = Object.entries(filters).map(([key, value]) => {
      if (typeof value === 'string') {
        return `e.${key} = '${value}'`;
      }
      return `e.${key} = ${value}`;
    });

    return conditions.join(' AND ');
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
