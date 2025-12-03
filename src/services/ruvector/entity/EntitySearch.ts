/**
 * EntitySearch - Semantic and Text Search
 *
 * Handles entity search operations:
 * - Semantic vector similarity search
 * - Text-based graph search
 * - Result mapping and scoring
 */

import type { RuvectorClient } from '../client';
import type {
  Entity,
  EntitySearchOptions,
  EntitySearchResult,
  VectorSearchResult,
  GraphNode,
} from '../types';
import { VectorOperationError, GraphQueryError } from '../types';
import { EntityEmbeddings } from './EntityEmbeddings';
import { EntityRepository } from './EntityRepository';

export class EntitySearch {
  private readonly GRAPH_LABEL = 'Entity';
  private readonly embeddings: EntityEmbeddings;
  private readonly repository: EntityRepository;

  constructor(private readonly client: RuvectorClient) {
    this.embeddings = new EntityEmbeddings(client);
    this.repository = new EntityRepository(client);
  }

  /**
   * Semantic search for entities using embeddings
   */
  async semanticSearch(
    query: string,
    options: EntitySearchOptions = {}
  ): Promise<EntitySearchResult[]> {
    try {
      const {
        topK = 10,
        minSimilarity = 0.7,
        type,
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.embeddings.generateFromText(query);

      // Search vector database
      const vectorResults = await this.client.request<{
        results: VectorSearchResult[];
      }>({
        method: 'POST',
        path: '/v1/vector/search',
        body: {
          vector: queryEmbedding,
          topK,
          namespace: this.embeddings.getNamespace(),
          minSimilarity,
          filter: type ? { type } : undefined,
        },
      });

      // Hydrate entities from graph database
      const entityIds = vectorResults.results.map((r) => r.id);
      const entities = await this.repository.getByIds(entityIds);

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
        `Failed to perform semantic search: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Text-based search in graph database
   */
  async textSearch(
    query: string,
    options: EntitySearchOptions = {}
  ): Promise<EntitySearchResult[]> {
    try {
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
    } catch (error) {
      throw new GraphQueryError(
        `Failed to perform text search: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Unified search (semantic or text based on options)
   */
  async search(
    query: string,
    options: EntitySearchOptions = {}
  ): Promise<EntitySearchResult[]> {
    const { semanticSearch = true } = options;

    if (!semanticSearch) {
      return this.textSearch(query, options);
    }

    return this.semanticSearch(query, options);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

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

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
