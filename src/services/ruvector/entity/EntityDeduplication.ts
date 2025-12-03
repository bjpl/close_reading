/**
 * EntityDeduplication - Cross-Document Entity Linking
 *
 * Handles entity deduplication and merging:
 * - Find similar entities across documents
 * - Merge duplicate entities
 * - Entity linking by similarity threshold
 * - Network metadata management
 */

import type { RuvectorClient } from '../client';
import type {
  Entity,
  EntityRelationship,
  PaginatedResponse,
} from '../types';
import { VectorOperationError } from '../types';
import { EntitySearch } from './EntitySearch';
import { EntityRepository } from './EntityRepository';
import { EntityRelationships } from './EntityRelationships';

// ============================================================================
// Types
// ============================================================================

interface ClaudeEntity {
  name: string;
  type: string;
  description?: string;
  traits?: string[];
  development?: string;
  importance?: number;
  mentions?: number;
  significance?: 'high' | 'medium' | 'low';
}

interface EntityLinkCandidate {
  existingEntity: Entity;
  newEntity: Omit<Entity, 'id'>;
  similarityScore: number;
  shouldMerge: boolean;
}

interface NetworkMetadataProperties {
  documentId: string;
  powerDynamics?: unknown[];
  socialStructure?: {
    centrality: Record<string, number>;
    clusters: string[][];
  };
  entityMapping: Record<string, string>;
  timestamp: string;
}

export class EntityDeduplication {
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly search: EntitySearch;
  private readonly repository: EntityRepository;
  private readonly relationships: EntityRelationships;

  constructor(private readonly client: RuvectorClient) {
    this.search = new EntitySearch(client);
    this.repository = new EntityRepository(client);
    this.relationships = new EntityRelationships(client);
  }

  /**
   * Find candidates for entity linking across documents
   */
  async findLinkCandidates(
    claudeEntity: ClaudeEntity,
    documentId: string
  ): Promise<EntityLinkCandidate[]> {
    try {
      // Search for similar entities across all documents
      const searchResults = await this.search.semanticSearch(claudeEntity.name, {
        topK: 5,
        minSimilarity: this.SIMILARITY_THRESHOLD,
        type: claudeEntity.type,
      });

      return searchResults.map((result) => ({
        existingEntity: result.entity,
        newEntity: {
          type: claudeEntity.type,
          name: claudeEntity.name,
          properties: {
            description: claudeEntity.description,
            traits: claudeEntity.traits,
            development: claudeEntity.development,
            importance: claudeEntity.importance,
            mentions: claudeEntity.mentions,
            significance: claudeEntity.significance,
          },
        },
        similarityScore: result.score,
        shouldMerge: result.score >= this.SIMILARITY_THRESHOLD,
      }));
    } catch (error) {
      throw new VectorOperationError(
        `Failed to find link candidates: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Merge entity with new document reference
   */
  async mergeWithDocument(
    entityId: string,
    documentId: string,
    claudeEntity: ClaudeEntity
  ): Promise<void> {
    try {
      const existing = await this.repository.getById(entityId);
      if (!existing) return;

      // Add document reference to entity
      const documentIds = Array.isArray(existing.properties.documentIds)
        ? [...existing.properties.documentIds, documentId]
        : [documentId];

      await this.repository.update(entityId, {
        properties: {
          ...existing.properties,
          documentIds: [...new Set(documentIds)],
          // Merge additional properties from Claude
          additionalContext: {
            ...(typeof existing.properties.additionalContext === 'object' &&
            existing.properties.additionalContext !== null
              ? existing.properties.additionalContext
              : {}),
            [documentId]: claudeEntity,
          },
        },
      });
    } catch (error) {
      throw new VectorOperationError(
        `Failed to merge entity with document: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Store network metadata for a document
   */
  async storeNetworkMetadata(
    documentId: string,
    powerDynamics: unknown[] | undefined,
    socialStructure: NetworkMetadataProperties['socialStructure'] | undefined,
    entityIdMap: Map<string, string>
  ): Promise<void> {
    try {
      const metadata: Entity = {
        id: `network_${documentId}_${Date.now()}`,
        type: 'NetworkMetadata',
        name: `network_${documentId}`,
        properties: {
          documentId,
          powerDynamics,
          socialStructure,
          entityMapping: Object.fromEntries(entityIdMap),
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.repository.create(metadata);
    } catch (error) {
      throw new VectorOperationError(
        `Failed to store network metadata: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Retrieve network metadata for a document
   */
  async getNetworkMetadata(documentId: string): Promise<NetworkMetadataProperties> {
    try {
      const result = await this.repository.query({
        type: 'NetworkMetadata',
        filters: { documentId },
        limit: 1,
      });

      const props = result.items[0]?.properties;
      return {
        documentId: props?.documentId ?? documentId,
        entityMapping: props?.entityMapping ?? {},
        timestamp: props?.timestamp ?? new Date().toISOString(),
        powerDynamics: props?.powerDynamics,
        socialStructure: props?.socialStructure,
      } as NetworkMetadataProperties;
    } catch (error) {
      throw new VectorOperationError(
        `Failed to get network metadata: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Get similarity threshold
   */
  getSimilarityThreshold(): number {
    return this.SIMILARITY_THRESHOLD;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
