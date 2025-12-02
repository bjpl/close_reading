/**
 * EntityService - Entity Persistence and Semantic Search
 *
 * Manages entity lifecycle with:
 * - CRUD operations with automatic embedding generation
 * - Semantic search using vector similarity
 * - Relationship management through graph storage
 * - Claude AI EntityNetwork integration
 * - Cross-document entity linking and deduplication
 * - Batch operations for performance
 *
 * Architecture:
 * - Direct RuvectorClient integration (until VectorService/GraphService exist)
 * - Automatic entity embedding generation
 * - Relationship storage in graph database
 * - Entity deduplication across documents
 */

import type { RuvectorClient } from '../client';
import type {
  Entity,
  EntityQueryOptions,
  EntityCreateOptions,
  EntityUpdateOptions,
  EntityRelationship,
  EntitySearchOptions,
  EntitySearchResult,
  EntityBatchOperation,
  EntityBatchResult,
  PaginatedResponse,
  VectorSearchResult,
  GraphNode,
  GraphRelationship,
} from '../types';
import {
  EntityNotFoundError,
  VectorOperationError,
  GraphQueryError,
} from '../types';

// EntityNetwork type (matches ClaudeService output)
interface EntityNetwork {
  entities: Array<{
    name: string;
    type: string;
    description?: string;
    traits?: string[];
    development?: string;
    importance?: number;
    mentions?: number;
    significance?: 'high' | 'medium' | 'low';
  }>;
  relationships: Array<{
    entity1: string;
    entity2: string;
    type: string;
    description?: string;
    strength: number;
    evolution?: string;
    evidence?: string[];
  }>;
  powerDynamics?: Array<{
    dominant: string;
    subordinate: string;
    type: string;
  }>;
  socialStructure?: {
    centrality: Record<string, number>;
    clusters: string[][];
  };
}

// ============================================================================
// Helper Types
// ============================================================================

interface EntityWithEmbedding extends Entity {
  embedding: number[];
}

/** Claude entity from EntityNetwork.entities array */
type ClaudeEntity = EntityNetwork['entities'][number];

/** Network metadata stored with entities */
interface NetworkMetadataProperties {
  documentId: string;
  powerDynamics?: EntityNetwork['powerDynamics'];
  socialStructure?: EntityNetwork['socialStructure'];
  entityMapping: Record<string, string>;
  timestamp: string;
}

interface EntityLinkCandidate {
  existingEntity: Entity;
  newEntity: Omit<Entity, 'id'>;
  similarityScore: number;
  shouldMerge: boolean;
}

interface EntityNetworkPersistenceResult {
  entitiesCreated: number;
  relationshipsCreated: number;
  entitiesMerged: number;
  errors: Array<{ entity: string; error: string }>;
}

// ============================================================================
// EntityService Implementation
// ============================================================================

export class EntityService {
  private readonly VECTOR_NAMESPACE = 'entities';
  private readonly GRAPH_LABEL = 'Entity';
  private readonly SIMILARITY_THRESHOLD = 0.85; // For entity linking
  private readonly BATCH_SIZE = 50;

  constructor(
    private readonly client: RuvectorClient,
    // TODO: Replace with actual VectorService and GraphService when implemented
    // private readonly vectorService: VectorService,
    // private readonly graphService: GraphService
  ) {}

  // ============================================================================
  // Entity CRUD Operations
  // ============================================================================

  /**
   * Create a new entity with automatic embedding generation
   */
  async createEntity(
    entity: Omit<Entity, 'id'>,
    options: EntityCreateOptions = {}
  ): Promise<Entity> {
    try {
      const id = this.generateEntityId(entity.name, entity.type);
      const timestamp = new Date().toISOString();

      // Generate embedding if requested (default: true)
      let embedding: number[] | undefined;
      if (options.generateEmbedding !== false) {
        embedding = await this.generateEntityEmbedding(entity);
      }

      const newEntity: Entity = {
        ...entity,
        id,
        embedding,
        created_at: timestamp,
        updated_at: timestamp,
        properties: {
          ...entity.properties,
          ...options.metadata,
        },
      };

      // Store in vector database with embedding
      if (embedding) {
        await this.storeEntityVector(newEntity as EntityWithEmbedding);
      }

      // Store in graph database
      await this.storeEntityGraph(newEntity);

      return newEntity;
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
  async getEntity(id: string): Promise<Entity | null> {
    try {
      // Try graph database first (primary source of truth)
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

      const node = graphResult.data[0];
      return this.graphNodeToEntity(node);
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get entity: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Update entity with optional embedding regeneration
   */
  async updateEntity(
    id: string,
    updates: Partial<Entity>,
    options: EntityUpdateOptions = {}
  ): Promise<Entity> {
    try {
      const existing = await this.getEntity(id);
      if (!existing) {
        throw new EntityNotFoundError(id);
      }

      // Merge properties
      const mergedProperties = options.mergeProperties
        ? { ...existing.properties, ...updates.properties }
        : updates.properties || existing.properties;

      const updatedEntity: Entity = {
        ...existing,
        ...updates,
        id, // Prevent ID changes
        properties: mergedProperties,
        updated_at: new Date().toISOString(),
      };

      // Regenerate embedding if content changed
      if (options.regenerateEmbedding && (updates.name || updates.properties)) {
        updatedEntity.embedding = await this.generateEntityEmbedding(updatedEntity);
      }

      // Update vector database
      if (updatedEntity.embedding) {
        await this.storeEntityVector(updatedEntity as EntityWithEmbedding);
      }

      // Update graph database
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
   * Delete entity and all its relationships
   */
  async deleteEntity(id: string): Promise<void> {
    try {
      // Delete from vector database
      await this.client.request({
        method: 'DELETE',
        path: '/v1/vector/delete',
        body: {
          namespace: this.VECTOR_NAMESPACE,
          filter: { entityId: id },
        },
      });

      // Delete from graph database (including relationships)
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

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Create multiple entities in parallel batches
   */
  async createEntities(
    entities: Omit<Entity, 'id'>[],
    options: EntityCreateOptions = {}
  ): Promise<EntityBatchResult> {
    const result: EntityBatchResult = {
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < entities.length; i += this.BATCH_SIZE) {
      const batch = entities.slice(i, i + this.BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (entity) => {
          try {
            await this.createEntity(entity, options);
            result.succeeded++;
          } catch (error) {
            result.failed++;
            result.errors?.push({
              entity,
              error: this.formatError(error),
            });
          }
        })
      );
    }

    return result;
  }

  /**
   * Execute batch operations (create, update, delete)
   */
  async batchOperation(
    operations: EntityBatchOperation[]
  ): Promise<EntityBatchResult> {
    const result: EntityBatchResult = {
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    await Promise.allSettled(
      operations.map(async (op) => {
        try {
          switch (op.operation) {
            case 'create':
              if (!op.entity.type || !op.entity.name) {
                throw new Error('Entity must have type and name');
              }
              await this.createEntity(op.entity as Omit<Entity, 'id'>);
              break;

            case 'update':
              if (!op.entity.id) {
                throw new Error('Entity must have id for update');
              }
              await this.updateEntity(op.entity.id, op.entity);
              break;

            case 'delete':
              if (!op.entity.id) {
                throw new Error('Entity must have id for delete');
              }
              await this.deleteEntity(op.entity.id);
              break;
          }
          result.succeeded++;
        } catch (error) {
          result.failed++;
          result.errors?.push({
            entity: op.entity,
            error: this.formatError(error),
          });
        }
      })
    );

    return result;
  }

  // ============================================================================
  // Search and Query Operations
  // ============================================================================

  /**
   * Semantic search for entities using embeddings
   */
  async searchEntities(
    query: string,
    options: EntitySearchOptions = {}
  ): Promise<EntitySearchResult[]> {
    try {
      const {
        topK = 10,
        minSimilarity = 0.7,
        type,
        semanticSearch = true,
      } = options;

      if (!semanticSearch) {
        // Fallback to text search in graph database
        return this.textSearchEntities(query, options);
      }

      // Generate query embedding
      const queryEmbedding = await this.generateTextEmbedding(query);

      // Search vector database
      const vectorResults = await this.client.request<{
        results: VectorSearchResult[];
      }>({
        method: 'POST',
        path: '/v1/vector/search',
        body: {
          vector: queryEmbedding,
          topK,
          namespace: this.VECTOR_NAMESPACE,
          minSimilarity,
          filter: type ? { type } : undefined,
        },
      });

      // Hydrate entities from graph database
      const entityIds = vectorResults.results.map((r) => r.id);
      const entities = await this.getEntitiesByIds(entityIds);

      // Map to search results
      return vectorResults.results
        .map((result): EntitySearchResult | null => {
          const entity = entities.find((e) => e.id === result.id);
          if (!entity) return null;

          return {
            entity,
            score: result.score,
            distance: result.distance,
          };
        })
        .filter((r): r is EntitySearchResult => r !== null);
    } catch (error) {
      throw new VectorOperationError(
        `Failed to search entities: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Query entities with filters and pagination
   */
  async queryEntities(
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

      // Build Cypher query
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
    const result = await this.queryEntities({ ...options, type });
    return result.items;
  }

  // ============================================================================
  // Relationship Management
  // ============================================================================

  /**
   * Create relationship between entities
   */
  async createRelationship(
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

      // Create in graph database
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
  async getRelationships(entityId: string): Promise<EntityRelationship[]> {
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
  async findRelatedEntities(
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

  // ============================================================================
  // Claude Integration Helpers
  // ============================================================================

  /**
   * Persist entire EntityNetwork from Claude's extractRelationships()
   * Includes entity linking and deduplication across documents
   */
  async persistEntityNetwork(
    network: EntityNetwork,
    documentId: string
  ): Promise<void> {
    const result: EntityNetworkPersistenceResult = {
      entitiesCreated: 0,
      relationshipsCreated: 0,
      entitiesMerged: 0,
      errors: [],
    };

    try {
      // Step 1: Process entities with linking
      const entityIdMap = new Map<string, string>(); // Claude entity name -> Ruvector ID

      for (const claudeEntity of network.entities) {
        try {
          // Check for existing similar entities across all documents
          const candidates = await this.findEntityLinkCandidates(
            claudeEntity,
            documentId
          );

          let finalEntityId: string;

          if (candidates.length > 0 && candidates[0].shouldMerge) {
            // Merge with existing entity
            const existing = candidates[0].existingEntity;
            await this.mergeEntityWithDocument(existing.id, documentId, claudeEntity);
            finalEntityId = existing.id;
            result.entitiesMerged++;
          } else {
            // Create new entity
            const newEntity = await this.createEntity({
              type: claudeEntity.type,
              name: claudeEntity.name,
              properties: {
                description: claudeEntity.description,
                traits: claudeEntity.traits,
                development: claudeEntity.development,
                importance: claudeEntity.importance,
                documentId,
              },
            });
            finalEntityId = newEntity.id;
            result.entitiesCreated++;
          }

          entityIdMap.set(claudeEntity.name, finalEntityId);
        } catch (error) {
          result.errors.push({
            entity: claudeEntity.name,
            error: this.formatError(error),
          });
        }
      }

      // Step 2: Create relationships
      for (const rel of network.relationships) {
        try {
          const sourceId = entityIdMap.get(rel.entity1);
          const targetId = entityIdMap.get(rel.entity2);

          if (!sourceId || !targetId) {
            throw new Error(
              `Missing entity mapping: ${rel.entity1} -> ${rel.entity2}`
            );
          }

          await this.createRelationship({
            sourceEntityId: sourceId,
            targetEntityId: targetId,
            type: rel.type,
            strength: rel.strength,
            properties: {
              description: rel.description,
              evolution: rel.evolution,
              evidence: rel.evidence,
              documentId,
            },
          });

          result.relationshipsCreated++;
        } catch (error) {
          result.errors.push({
            entity: `${rel.entity1}-${rel.entity2}`,
            error: this.formatError(error),
          });
        }
      }

      // Step 3: Store power dynamics and clusters as metadata
      await this.storeNetworkMetadata(documentId, network, entityIdMap);

      if (result.errors.length > 0) {
        console.warn('Entity network persistence completed with errors:', result);
      }
    } catch (error) {
      throw new VectorOperationError(
        `Failed to persist entity network: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Retrieve EntityNetwork for a document
   */
  async getEntityNetworkForDocument(documentId: string): Promise<EntityNetwork> {
    try {
      // Get all entities for document
      const entities = await this.queryEntities({
        filters: { documentId },
        limit: 1000,
      });

      // Get all relationships between these entities
      const entityIds = entities.items.map((e) => e.id);
      const relationships: EntityRelationship[] = [];

      for (const entityId of entityIds) {
        const rels = await this.getRelationships(entityId);
        relationships.push(...rels);
      }

      // Deduplicate relationships
      const uniqueRels = Array.from(
        new Map(relationships.map((r) => [r.id, r])).values()
      );

      // Retrieve network metadata
      const metadata = await this.getNetworkMetadata(documentId);

      // Convert to Claude EntityNetwork format
      return this.toClaudeEntityNetwork(
        entities.items,
        uniqueRels,
        metadata
      );
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get entity network: ${this.formatError(error)}`,
        error
      );
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateEntityId(name: string, type: string): string {
    const normalized = name.toLowerCase().replace(/\s+/g, '_');
    const timestamp = Date.now().toString(36);
    return `${type}_${normalized}_${timestamp}`;
  }

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

  private async generateEntityEmbedding(
    entity: Omit<Entity, 'id'>
  ): Promise<number[]> {
    // Combine entity information for embedding
    const text = [
      entity.name,
      entity.type,
      JSON.stringify(entity.properties),
    ].join(' ');

    return this.generateTextEmbedding(text);
  }

  private async generateTextEmbedding(text: string): Promise<number[]> {
    // TODO: Replace with actual embedding service call
    // For now, use Ruvector's embedding endpoint
    const result = await this.client.request<{ embedding: number[] }>({
      method: 'POST',
      path: '/v1/embeddings',
      body: { text },
    });

    return result.embedding;
  }

  private async storeEntityVector(entity: EntityWithEmbedding): Promise<void> {
    await this.client.request({
      method: 'POST',
      path: '/v1/vector/upsert',
      body: {
        vectors: [
          {
            id: entity.id,
            vector: entity.embedding,
            metadata: {
              entityId: entity.id,
              type: entity.type,
              name: entity.name,
              documentId: entity.documentId,
            },
          },
        ],
        namespace: this.VECTOR_NAMESPACE,
      },
    });
  }

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

  private async getEntitiesByIds(ids: string[]): Promise<Entity[]> {
    if (ids.length === 0) return [];

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
  }

  private async textSearchEntities(
    query: string,
    options: EntitySearchOptions
  ): Promise<EntitySearchResult[]> {
    const { topK = 10, type } = options;

    const result = await this.client.request<{ data: GraphNode[] }>({
      method: 'POST',
      path: '/v1/graph/query',
      body: {
        query: `
          MATCH (e:${this.GRAPH_LABEL}${type ? `:${type}` : ''})
          WHERE e.name CONTAINS $query OR e.properties CONTAINS $query
          RETURN e
          LIMIT $limit
        `,
        parameters: { query, limit: topK },
      },
    });

    return result.data.map((node) => ({
      entity: this.graphNodeToEntity(node),
      score: 0.5, // Arbitrary score for text search
    }));
  }

  private buildFilterConditions(filters: Record<string, unknown>): string {
    const conditions = Object.entries(filters)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `e.${key} = '${value}'`;
        }
        return `e.${key} = ${value}`;
      });

    return conditions.join(' AND ');
  }

  private async findEntityLinkCandidates(
    claudeEntity: ClaudeEntity,
    _documentId: string
  ): Promise<EntityLinkCandidate[]> {
    // Search for similar entities across all documents
    const searchResults = await this.searchEntities(claudeEntity.name, {
      topK: 5,
      minSimilarity: this.SIMILARITY_THRESHOLD,
      type: claudeEntity.type,
    });

    return searchResults.map((result) => ({
      existingEntity: result.entity,
      newEntity: {
        type: claudeEntity.type,
        name: claudeEntity.name,
        properties: claudeEntity,
      },
      similarityScore: result.score,
      shouldMerge: result.score >= this.SIMILARITY_THRESHOLD,
    }));
  }

  private async mergeEntityWithDocument(
    entityId: string,
    documentId: string,
    claudeEntity: ClaudeEntity
  ): Promise<void> {
    const existing = await this.getEntity(entityId);
    if (!existing) return;

    // Add document reference to entity
    const documentIds = Array.isArray(existing.properties.documentIds)
      ? [...existing.properties.documentIds, documentId]
      : [documentId];

    await this.updateEntity(
      entityId,
      {
        properties: {
          ...existing.properties,
          documentIds: [...new Set(documentIds)],
          // Merge additional properties from Claude
          additionalContext: {
            ...(typeof existing.properties.additionalContext === 'object' && existing.properties.additionalContext !== null
              ? existing.properties.additionalContext
              : {}),
            [documentId]: claudeEntity,
          },
        },
      },
      { mergeProperties: true }
    );
  }

  private async storeNetworkMetadata(
    documentId: string,
    network: EntityNetwork,
    entityIdMap: Map<string, string>
  ): Promise<void> {
    // Store as a special metadata entity
    await this.createEntity({
      type: 'NetworkMetadata',
      name: `network_${documentId}`,
      properties: {
        documentId,
        powerDynamics: network.powerDynamics,
        socialStructure: network.socialStructure,
        entityMapping: Object.fromEntries(entityIdMap),
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async getNetworkMetadata(documentId: string): Promise<NetworkMetadataProperties> {
    const result = await this.queryEntities({
      type: 'NetworkMetadata',
      filters: { documentId },
      limit: 1,
    });

    return result.items[0]?.properties || {};
  }

  private toClaudeEntityNetwork(
    entities: Entity[],
    relationships: EntityRelationship[],
    metadata: NetworkMetadataProperties
  ): EntityNetwork {
    // Convert back to Claude's format
    return {
      entities: entities.map((e) => ({
        name: e.name,
        type: e.type,
        description: String(e.properties.description || ''),
        traits: (e.properties.traits as string[]) || [],
        development: String(e.properties.development || ''),
        importance: Number(e.properties.importance) || 0,
      })),
      relationships: relationships.map((r) => ({
        entity1: r.sourceEntityId,
        entity2: r.targetEntityId,
        type: r.type,
        description: String(r.properties?.description || ''),
        strength: r.strength || 1.0,
        evolution: r.properties?.evolution ? String(r.properties.evolution) : undefined,
        evidence: (r.properties?.evidence as string[]) || [],
      })),
      powerDynamics: metadata.powerDynamics || [],
      socialStructure: metadata.socialStructure || {
        centrality: {},
        clusters: [],
      },
    };
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
