/**
 * EntityRelationships - Relationship Management
 *
 * Handles entity relationship operations:
 * - Create and delete relationships
 * - Query relationships by entity
 * - Find related entities
 * - Relationship type sanitization
 */

import type { RuvectorClient } from '../client';
import type {
  Entity,
  EntityRelationship,
  GraphNode,
  GraphRelationship,
} from '../types';
import { GraphQueryError } from '../types';

export class EntityRelationships {
  private readonly GRAPH_LABEL = 'Entity';

  constructor(private readonly client: RuvectorClient) {}

  /**
   * Create relationship between entities
   */
  async create(
    rel: Omit<EntityRelationship, 'id'>
  ): Promise<EntityRelationship> {
    try {
      const id = this.generateRelationshipId(
        rel.sourceEntityId,
        rel.targetEntityId,
        rel.type
      );

      const relationship: EntityRelationship = {
        ...rel,
        id,
        created_at: new Date().toISOString(),
      };

      await this.client.request({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH (source:${this.GRAPH_LABEL} {id: $sourceId})
            MATCH (target:${this.GRAPH_LABEL} {id: $targetId})
            CREATE (source)-[r:${this.sanitizeRelationType(rel.type)} {
              id: $id,
              strength: $strength,
              properties: $properties,
              created_at: $created_at
            }]->(target)
            RETURN r
          `,
          parameters: {
            sourceId: rel.sourceEntityId,
            targetId: rel.targetEntityId,
            id,
            strength: rel.strength || 1.0,
            properties: JSON.stringify(rel.properties || {}),
            created_at: relationship.created_at,
          },
        },
      });

      return relationship;
    } catch (error) {
      throw new GraphQueryError(
        `Failed to create relationship: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Get all relationships for an entity
   */
  async getForEntity(entityId: string): Promise<EntityRelationship[]> {
    try {
      const result = await this.client.request<{ data: GraphRelationship[] }>({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH (e:${this.GRAPH_LABEL} {id: $id})-[r]-(other)
            RETURN r
          `,
          parameters: { id: entityId },
        },
      });

      return result.data.map((rel) => this.graphRelToEntityRel(rel));
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get relationships: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Find entities related to given entity
   */
  async findRelated(
    entityId: string,
    relationshipTypes?: string[]
  ): Promise<Entity[]> {
    try {
      const typeFilter = relationshipTypes?.length
        ? relationshipTypes.map((t) => `:${this.sanitizeRelationType(t)}`).join('|')
        : '';

      const result = await this.client.request<{ data: GraphNode[] }>({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH (e:${this.GRAPH_LABEL} {id: $id})-[r${typeFilter}]-(related:${this.GRAPH_LABEL})
            RETURN DISTINCT related
          `,
          parameters: { id: entityId },
        },
      });

      return result.data.map((node) => this.graphNodeToEntity(node));
    } catch (error) {
      throw new GraphQueryError(
        `Failed to find related entities: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Delete a specific relationship
   */
  async delete(relationshipId: string): Promise<void> {
    try {
      await this.client.request({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          query: `
            MATCH ()-[r {id: $id}]-()
            DELETE r
          `,
          parameters: { id: relationshipId },
        },
      });
    } catch (error) {
      throw new GraphQueryError(
        `Failed to delete relationship: ${this.formatError(error)}`,
        error
      );
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateRelationshipId(
    sourceId: string,
    targetId: string,
    type: string
  ): string {
    const hash = `${sourceId}_${targetId}_${type}`.replace(/[^a-zA-Z0-9_]/g, '_');
    return `rel_${hash}`;
  }

  private sanitizeRelationType(type: string): string {
    return type.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  }

  private graphNodeToEntity(node: GraphNode): Entity {
    const props = node.properties;
    return {
      id: props.id as string,
      type: props.type as string,
      name: props.name as string,
      properties:
        typeof props.properties === 'string'
          ? JSON.parse(props.properties)
          : props.properties || {},
      documentId: props.documentId as string | undefined,
      created_at: props.created_at as string | undefined,
      updated_at: props.updated_at as string | undefined,
    };
  }

  private graphRelToEntityRel(rel: GraphRelationship): EntityRelationship {
    const props = rel.properties;
    return {
      id: props.id as string,
      sourceEntityId: rel.startNode,
      targetEntityId: rel.endNode,
      type: rel.type,
      strength: props.strength as number | undefined,
      properties:
        typeof props.properties === 'string'
          ? JSON.parse(props.properties)
          : props.properties || {},
      created_at: props.created_at as string | undefined,
    };
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
