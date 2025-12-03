/**
 * EntityService - Facade for Entity Management
 *
 * Maintains backward compatibility while delegating to specialized modules:
 * - EntityRepository: CRUD operations
 * - EntityEmbeddings: Vector embedding generation/storage
 * - EntitySearch: Semantic and text search
 * - EntityRelationships: Relationship management
 * - EntityDeduplication: Cross-document entity linking
 * - EntityBatch: Batch operations
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
} from '../types';
import { VectorOperationError } from '../types';

import { EntityRepository } from './EntityRepository';
import { EntityEmbeddings } from './EntityEmbeddings';
import { EntitySearch } from './EntitySearch';
import { EntityRelationships } from './EntityRelationships';
import { EntityDeduplication } from './EntityDeduplication';
import { EntityBatch } from './EntityBatch';

// ============================================================================
// Types (duplicated for external consumers)
// ============================================================================

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

interface EntityNetworkPersistenceResult {
  entitiesCreated: number;
  relationshipsCreated: number;
  entitiesMerged: number;
  errors: Array<{ entity: string; error: string }>;
}

// ============================================================================
// EntityService Facade
// ============================================================================

export class EntityService {
  private readonly repository: EntityRepository;
  private readonly embeddings: EntityEmbeddings;
  private readonly search: EntitySearch;
  private readonly relationships: EntityRelationships;
  private readonly deduplication: EntityDeduplication;
  private readonly batch: EntityBatch;

  constructor(private readonly client: RuvectorClient) {
    this.repository = new EntityRepository(client);
    this.embeddings = new EntityEmbeddings(client);
    this.search = new EntitySearch(client);
    this.relationships = new EntityRelationships(client);
    this.deduplication = new EntityDeduplication(client);
    this.batch = new EntityBatch(client);
  }

  // ============================================================================
  // Entity CRUD Operations (delegates to EntityRepository & EntityEmbeddings)
  // ============================================================================

  async createEntity(
    entity: Omit<Entity, 'id'>,
    options: EntityCreateOptions = {}
  ): Promise<Entity> {
    try {
      const id = this.generateEntityId(entity.name, entity.type);
      const timestamp = new Date().toISOString();

      // Generate embedding if requested
      let embedding: number[] | undefined;
      if (options.generateEmbedding !== false) {
        embedding = await this.embeddings.generateForEntity(entity);
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

      // Store embedding in vector database
      if (embedding) {
        await this.embeddings.store(newEntity as Entity & { embedding: number[] });
      }

      // Store entity in graph database
      await this.repository.create(newEntity);

      return newEntity;
    } catch (error) {
      throw new VectorOperationError(
        `Failed to create entity: ${this.formatError(error)}`,
        error
      );
    }
  }

  async getEntity(id: string): Promise<Entity | null> {
    return this.repository.getById(id);
  }

  async updateEntity(
    id: string,
    updates: Partial<Entity>,
    options: EntityUpdateOptions = {}
  ): Promise<Entity> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new VectorOperationError(`Entity not found: ${id}`);
    }

    // Merge properties if requested
    const mergedProperties = options.mergeProperties
      ? { ...existing.properties, ...updates.properties }
      : updates.properties || existing.properties;

    const updatedEntity: Entity = {
      ...existing,
      ...updates,
      id,
      properties: mergedProperties,
      updated_at: new Date().toISOString(),
    };

    // Regenerate embedding if requested
    if (options.regenerateEmbedding && (updates.name || updates.properties)) {
      updatedEntity.embedding = await this.embeddings.generateForEntity(updatedEntity);
    }

    // Update vector database
    if (updatedEntity.embedding) {
      await this.embeddings.store(updatedEntity as Entity & { embedding: number[] });
    }

    // Update graph database
    return this.repository.update(id, updatedEntity);
  }

  async deleteEntity(id: string): Promise<void> {
    await this.embeddings.delete(id);
    await this.repository.delete(id);
  }

  // ============================================================================
  // Batch Operations (delegates to EntityBatch)
  // ============================================================================

  async createEntities(
    entities: Omit<Entity, 'id'>[],
    options: EntityCreateOptions = {}
  ): Promise<EntityBatchResult> {
    // Create entities with IDs first
    const entitiesWithIds = entities.map((entity) => ({
      ...entity,
      id: this.generateEntityId(entity.name, entity.type),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Generate embeddings in parallel if requested
    if (options.generateEmbedding !== false) {
      await Promise.all(
        entitiesWithIds.map(async (entity) => {
          entity.embedding = await this.embeddings.generateForEntity(entity);
          if (entity.embedding) {
            await this.embeddings.store(entity as Entity & { embedding: number[] });
          }
        })
      );
    }

    return this.batch.createMany(entitiesWithIds, options);
  }

  async batchOperation(operations: EntityBatchOperation[]): Promise<EntityBatchResult> {
    return this.batch.execute(operations);
  }

  // ============================================================================
  // Search Operations (delegates to EntitySearch)
  // ============================================================================

  async searchEntities(
    query: string,
    options: EntitySearchOptions = {}
  ): Promise<EntitySearchResult[]> {
    return this.search.search(query, options);
  }

  async queryEntities(
    options: EntityQueryOptions = {}
  ): Promise<PaginatedResponse<Entity>> {
    return this.repository.query(options);
  }

  async findByType(type: string, options: EntityQueryOptions = {}): Promise<Entity[]> {
    return this.repository.findByType(type, options);
  }

  // ============================================================================
  // Relationship Operations (delegates to EntityRelationships)
  // ============================================================================

  async createRelationship(
    rel: Omit<EntityRelationship, 'id'>
  ): Promise<EntityRelationship> {
    return this.relationships.create(rel);
  }

  async getRelationships(entityId: string): Promise<EntityRelationship[]> {
    return this.relationships.getForEntity(entityId);
  }

  async findRelatedEntities(
    entityId: string,
    relationshipTypes?: string[]
  ): Promise<Entity[]> {
    return this.relationships.findRelated(entityId, relationshipTypes);
  }

  // ============================================================================
  // Claude Integration (delegates to EntityDeduplication)
  // ============================================================================

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
      const entityIdMap = new Map<string, string>();

      // Process entities with linking
      for (const claudeEntity of network.entities) {
        try {
          const candidates = await this.deduplication.findLinkCandidates(
            claudeEntity,
            documentId
          );

          let finalEntityId: string;

          if (candidates.length > 0 && candidates[0].shouldMerge) {
            await this.deduplication.mergeWithDocument(
              candidates[0].existingEntity.id,
              documentId,
              claudeEntity
            );
            finalEntityId = candidates[0].existingEntity.id;
            result.entitiesMerged++;
          } else {
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

      // Create relationships
      for (const rel of network.relationships) {
        try {
          const sourceId = entityIdMap.get(rel.entity1);
          const targetId = entityIdMap.get(rel.entity2);

          if (!sourceId || !targetId) {
            throw new Error(`Missing entity mapping: ${rel.entity1} -> ${rel.entity2}`);
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

      // Store metadata
      await this.deduplication.storeNetworkMetadata(
        documentId,
        network.powerDynamics,
        network.socialStructure,
        entityIdMap
      );

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

  async getEntityNetworkForDocument(documentId: string): Promise<EntityNetwork> {
    // Get entities for document
    const entities = await this.repository.query({
      filters: { documentId },
      limit: 1000,
    });

    // Get relationships
    const entityIds = entities.items.map((e) => e.id);
    const relationships: EntityRelationship[] = [];

    for (const entityId of entityIds) {
      const rels = await this.relationships.getForEntity(entityId);
      relationships.push(...rels);
    }

    // Deduplicate relationships
    const uniqueRels = Array.from(
      new Map(relationships.map((r) => [r.id, r])).values()
    );

    // Retrieve metadata
    const metadata = await this.deduplication.getNetworkMetadata(documentId);

    // Convert to Claude format
    return this.toClaudeEntityNetwork(entities.items, uniqueRels, metadata);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateEntityId(name: string, type: string): string {
    const normalized = name.toLowerCase().replace(/\s+/g, '_');
    const timestamp = Date.now().toString(36);
    return `${type}_${normalized}_${timestamp}`;
  }

  private toClaudeEntityNetwork(
    entities: Entity[],
    relationships: EntityRelationship[],
    metadata: { powerDynamics?: unknown[]; socialStructure?: EntityNetwork['socialStructure'] }
  ): EntityNetwork {
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
      powerDynamics: (metadata.powerDynamics || []) as EntityNetwork['powerDynamics'],
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

// Re-export modules for direct use
export { EntityRepository } from './EntityRepository';
export { EntityEmbeddings } from './EntityEmbeddings';
export { EntitySearch } from './EntitySearch';
export { EntityRelationships } from './EntityRelationships';
export { EntityDeduplication } from './EntityDeduplication';
export { EntityBatch } from './EntityBatch';
