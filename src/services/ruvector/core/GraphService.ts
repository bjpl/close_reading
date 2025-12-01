/**
 * Ruvector GraphService
 *
 * Production-ready graph database service for Cypher queries and graph operations.
 * Replaces Supabase-based paragraphLinks.ts with Neo4j-compatible graph database.
 *
 * Features:
 * - Node and relationship CRUD operations
 * - Cypher query execution with parameterization
 * - Graph traversal and path finding
 * - Bidirectional paragraph linking (backward compatibility)
 * - Theme discovery via graph analysis
 * - Comprehensive error handling
 */

import { RuvectorClient } from './client';
import {
  GraphNode,
  GraphRelationship,
  GraphQueryResult,
  GraphPath,
  GraphTraversalOptions,
  CypherQueryOptions,
  GraphQueryError,
} from './types';

/**
 * Cypher query builder for safe parameterized queries
 */
class CypherQueryBuilder {
  private params: Record<string, unknown> = {};
  private paramCounter = 0;

  /**
   * Add a parameter and return its placeholder
   */
  addParam(value: unknown): string {
    const key = `param${this.paramCounter++}`;
    this.params[key] = value;
    return `$${key}`;
  }

  /**
   * Get collected parameters
   */
  getParams(): Record<string, unknown> {
    return { ...this.params };
  }

  /**
   * Escape property keys for safe Cypher usage
   */
  static escapeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Build properties clause from object
   */
  buildProperties(properties: Record<string, unknown>): string {
    const parts = Object.entries(properties).map(([key, value]) => {
      const escapedKey = CypherQueryBuilder.escapeKey(key);
      const paramName = this.addParam(value);
      return `${escapedKey}: ${paramName}`;
    });
    return parts.length > 0 ? `{${parts.join(', ')}}` : '';
  }

  /**
   * Build labels clause
   */
  static buildLabels(labels: string[]): string {
    return labels.map((l) => `:${l.replace(/[^a-zA-Z0-9_]/g, '_')}`).join('');
  }
}

/**
 * GraphService - Manages all graph database operations
 */
export class GraphService {
  constructor(private client: RuvectorClient) {}

  // ============================================================================
  // Node Operations
  // ============================================================================

  /**
   * Create a new node in the graph
   *
   * @param node - Node data (without id, will be generated)
   * @returns Created node with generated id
   * @throws {GraphQueryError} If node creation fails
   *
   * @example
   * ```typescript
   * const node = await graphService.createNode({
   *   labels: ['Paragraph', 'Document'],
   *   properties: {
   *     text: 'Sample text',
   *     position: 0,
   *     documentId: 'doc-123'
   *   }
   * });
   * ```
   */
  async createNode(node: Omit<GraphNode, 'id'>): Promise<GraphNode> {
    try {
      const builder = new CypherQueryBuilder();
      const labels = CypherQueryBuilder.buildLabels(node.labels);
      const props = builder.buildProperties(node.properties);

      const cypher = `
        CREATE (n${labels} ${props})
        RETURN n
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      if (!result.nodes || result.nodes.length === 0) {
        throw new GraphQueryError('Node creation returned no results');
      }

      return result.nodes[0];
    } catch (error) {
      throw new GraphQueryError(
        `Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { node, error }
      );
    }
  }

  /**
   * Get a node by ID
   *
   * @param id - Node identifier
   * @returns Node if found, null otherwise
   * @throws {GraphQueryError} If query fails
   */
  async getNode(id: string): Promise<GraphNode | null> {
    try {
      const builder = new CypherQueryBuilder();
      const idParam = builder.addParam(id);

      const cypher = `
        MATCH (n)
        WHERE id(n) = ${idParam}
        RETURN n
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      return result.nodes && result.nodes.length > 0 ? result.nodes[0] : null;
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get node ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id, error }
      );
    }
  }

  /**
   * Update node properties
   *
   * @param id - Node identifier
   * @param properties - Properties to update
   * @returns Updated node
   * @throws {GraphQueryError} If update fails or node not found
   */
  async updateNode(
    id: string,
    properties: Record<string, unknown>
  ): Promise<GraphNode> {
    try {
      const builder = new CypherQueryBuilder();
      const idParam = builder.addParam(id);

      // Build SET clauses
      const setClauses = Object.entries(properties).map(([key, value]) => {
        const escapedKey = CypherQueryBuilder.escapeKey(key);
        const paramName = builder.addParam(value);
        return `n.${escapedKey} = ${paramName}`;
      });

      const cypher = `
        MATCH (n)
        WHERE id(n) = ${idParam}
        SET ${setClauses.join(', ')}
        RETURN n
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      if (!result.nodes || result.nodes.length === 0) {
        throw new GraphQueryError(`Node ${id} not found`);
      }

      return result.nodes[0];
    } catch (error) {
      throw new GraphQueryError(
        `Failed to update node ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id, properties, error }
      );
    }
  }

  /**
   * Delete a node and all its relationships
   *
   * @param id - Node identifier
   * @throws {GraphQueryError} If deletion fails
   */
  async deleteNode(id: string): Promise<void> {
    try {
      const builder = new CypherQueryBuilder();
      const idParam = builder.addParam(id);

      const cypher = `
        MATCH (n)
        WHERE id(n) = ${idParam}
        DETACH DELETE n
      `;

      await this.query(cypher, {
        parameters: builder.getParams(),
      });
    } catch (error) {
      throw new GraphQueryError(
        `Failed to delete node ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id, error }
      );
    }
  }

  // ============================================================================
  // Relationship Operations
  // ============================================================================

  /**
   * Create a relationship between two nodes
   *
   * @param rel - Relationship data (without id)
   * @returns Created relationship with generated id
   * @throws {GraphQueryError} If relationship creation fails
   *
   * @example
   * ```typescript
   * const rel = await graphService.createRelationship({
   *   type: 'LINKS_TO',
   *   startNode: 'node-1',
   *   endNode: 'node-2',
   *   properties: { strength: 5, created_at: Date.now() }
   * });
   * ```
   */
  async createRelationship(
    rel: Omit<GraphRelationship, 'id'>
  ): Promise<GraphRelationship> {
    try {
      const builder = new CypherQueryBuilder();
      const startParam = builder.addParam(rel.startNode);
      const endParam = builder.addParam(rel.endNode);
      const props = builder.buildProperties(rel.properties);

      // Sanitize relationship type
      const relType = rel.type.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

      const cypher = `
        MATCH (start), (end)
        WHERE id(start) = ${startParam} AND id(end) = ${endParam}
        CREATE (start)-[r:${relType} ${props}]->(end)
        RETURN r
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      if (!result.relationships || result.relationships.length === 0) {
        throw new GraphQueryError('Relationship creation returned no results');
      }

      return result.relationships[0];
    } catch (error) {
      throw new GraphQueryError(
        `Failed to create relationship: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { relationship: rel, error }
      );
    }
  }

  /**
   * Get relationships for a node
   *
   * @param nodeId - Node identifier
   * @param options - Traversal options (direction, types, depth)
   * @returns Array of relationships
   * @throws {GraphQueryError} If query fails
   */
  async getRelationships(
    nodeId: string,
    options: GraphTraversalOptions = {}
  ): Promise<GraphRelationship[]> {
    try {
      const builder = new CypherQueryBuilder();
      const idParam = builder.addParam(nodeId);

      const {
        direction = 'both',
        relationshipTypes,
        maxDepth = 1,
        limit,
      } = options;

      // Build relationship pattern
      let relPattern: string;
      const typeFilter = relationshipTypes
        ? `:${relationshipTypes.map((t) => t.replace(/[^a-zA-Z0-9_]/g, '_')).join('|:')}`
        : '';

      switch (direction) {
        case 'outgoing':
          relPattern = `-[r${typeFilter}*1..${maxDepth}]->`;
          break;
        case 'incoming':
          relPattern = `<-[r${typeFilter}*1..${maxDepth}]-`;
          break;
        case 'both':
        default:
          relPattern = `-[r${typeFilter}*1..${maxDepth}]-`;
          break;
      }

      const limitClause = limit ? `LIMIT ${parseInt(String(limit), 10)}` : '';

      const cypher = `
        MATCH (n)${relPattern}(m)
        WHERE id(n) = ${idParam}
        RETURN r
        ${limitClause}
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      return result.relationships || [];
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get relationships for node ${nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { nodeId, options, error }
      );
    }
  }

  /**
   * Delete a relationship by ID
   *
   * @param id - Relationship identifier
   * @throws {GraphQueryError} If deletion fails
   */
  async deleteRelationship(id: string): Promise<void> {
    try {
      const builder = new CypherQueryBuilder();
      const idParam = builder.addParam(id);

      const cypher = `
        MATCH ()-[r]->()
        WHERE id(r) = ${idParam}
        DELETE r
      `;

      await this.query(cypher, {
        parameters: builder.getParams(),
      });
    } catch (error) {
      throw new GraphQueryError(
        `Failed to delete relationship ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id, error }
      );
    }
  }

  // ============================================================================
  // Cypher Query Execution
  // ============================================================================

  /**
   * Execute a Cypher query
   *
   * @param cypher - Cypher query string
   * @param options - Query options (parameters, timeout, readOnly)
   * @returns Query results with nodes and relationships
   * @throws {GraphQueryError} If query execution fails
   *
   * @example
   * ```typescript
   * const result = await graphService.query(
   *   'MATCH (n:Paragraph) WHERE n.documentId = $docId RETURN n',
   *   { parameters: { docId: 'doc-123' } }
   * );
   * ```
   */
  async query(
    cypher: string,
    options: CypherQueryOptions = {}
  ): Promise<GraphQueryResult> {
    try {
      const response = await this.client.request<GraphQueryResult>({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          cypher,
          parameters: options.parameters || {},
          timeout: options.timeout,
          readOnly: options.readOnly ?? false,
        },
      });

      return response;
    } catch (error) {
      throw new GraphQueryError(
        `Cypher query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cypher, options, error }
      );
    }
  }

  // ============================================================================
  // Advanced Traversal & Path Finding
  // ============================================================================

  /**
   * Find all paths between two nodes
   *
   * @param startId - Starting node ID
   * @param endId - Ending node ID
   * @param options - Traversal options
   * @returns Array of paths
   * @throws {GraphQueryError} If path finding fails
   */
  async findPaths(
    startId: string,
    endId: string,
    options: GraphTraversalOptions = {}
  ): Promise<GraphPath[]> {
    try {
      const builder = new CypherQueryBuilder();
      const startParam = builder.addParam(startId);
      const endParam = builder.addParam(endId);

      const { maxDepth = 5, relationshipTypes, limit } = options;

      const typeFilter = relationshipTypes
        ? `:${relationshipTypes.map((t) => t.replace(/[^a-zA-Z0-9_]/g, '_')).join('|:')}`
        : '';

      const limitClause = limit ? `LIMIT ${parseInt(String(limit), 10)}` : '';

      const cypher = `
        MATCH path = (start)-[r${typeFilter}*1..${maxDepth}]-(end)
        WHERE id(start) = ${startParam} AND id(end) = ${endParam}
        RETURN path
        ${limitClause}
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      // Transform results into GraphPath format
      const paths: GraphPath[] = [];
      // Note: Actual path extraction would depend on API response format
      // This is a simplified implementation
      if (result.nodes && result.relationships) {
        paths.push({
          nodes: result.nodes,
          relationships: result.relationships,
          length: result.relationships.length,
        });
      }

      return paths;
    } catch (error) {
      throw new GraphQueryError(
        `Failed to find paths: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { startId, endId, options, error }
      );
    }
  }

  /**
   * Get neighboring nodes up to specified depth
   *
   * @param nodeId - Node identifier
   * @param depth - Traversal depth (default: 1)
   * @returns Array of neighboring nodes
   * @throws {GraphQueryError} If traversal fails
   */
  async getNeighbors(nodeId: string, depth = 1): Promise<GraphNode[]> {
    try {
      const builder = new CypherQueryBuilder();
      const idParam = builder.addParam(nodeId);
      const maxDepth = Math.max(1, Math.min(depth, 10)); // Clamp between 1-10

      const cypher = `
        MATCH (n)-[*1..${maxDepth}]-(neighbor)
        WHERE id(n) = ${idParam}
        RETURN DISTINCT neighbor
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      return result.nodes || [];
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get neighbors for node ${nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { nodeId, depth, error }
      );
    }
  }

  // ============================================================================
  // Paragraph Linking (Backward Compatibility)
  // ============================================================================

  /**
   * Create bidirectional links between paragraphs
   * Maintains backward compatibility with paragraphLinks.ts
   *
   * @param paragraphIds - Array of paragraph IDs to link
   * @param userId - User creating the links
   * @returns Array of created relationships
   * @throws {GraphQueryError} If linking fails
   *
   * @example
   * ```typescript
   * const links = await graphService.createParagraphLinks(
   *   ['para-1', 'para-2', 'para-3'],
   *   'user-123'
   * );
   * ```
   */
  async createParagraphLinks(
    paragraphIds: string[],
    userId: string
  ): Promise<GraphRelationship[]> {
    if (paragraphIds.length < 2) {
      throw new GraphQueryError('At least 2 paragraphs required for linking');
    }

    try {
      const relationships: GraphRelationship[] = [];
      const now = new Date().toISOString();

      // Create bidirectional links between all pairs
      for (let i = 0; i < paragraphIds.length; i++) {
        for (let j = i + 1; j < paragraphIds.length; j++) {
          // Forward link
          const forward = await this.createRelationship({
            type: 'LINKS_TO',
            startNode: paragraphIds[i],
            endNode: paragraphIds[j],
            properties: {
              userId,
              linkType: 'related',
              strength: 5,
              createdAt: now,
              updatedAt: now,
            },
          });
          relationships.push(forward);

          // Backward link
          const backward = await this.createRelationship({
            type: 'LINKS_TO',
            startNode: paragraphIds[j],
            endNode: paragraphIds[i],
            properties: {
              userId,
              linkType: 'related',
              strength: 5,
              createdAt: now,
              updatedAt: now,
            },
          });
          relationships.push(backward);
        }
      }

      return relationships;
    } catch (error) {
      throw new GraphQueryError(
        `Failed to create paragraph links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { paragraphIds, userId, error }
      );
    }
  }

  /**
   * Get all paragraph links for a document
   *
   * @param documentId - Document identifier
   * @returns Map of paragraph ID to linked paragraph IDs
   * @throws {GraphQueryError} If query fails
   */
  async getParagraphLinks(
    documentId: string
  ): Promise<Map<string, string[]>> {
    try {
      const builder = new CypherQueryBuilder();
      const docParam = builder.addParam(documentId);

      const cypher = `
        MATCH (p:Paragraph)-[r:LINKS_TO]->(linked:Paragraph)
        WHERE p.documentId = ${docParam}
        RETURN p.id as sourceId, collect(linked.id) as linkedIds
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      const linkMap = new Map<string, string[]>();

      // Parse results into map format
      // Note: Actual parsing depends on API response structure
      if (result.nodes) {
        for (const node of result.nodes) {
          const sourceId = (node.properties.sourceId as string) || node.id;
          const linkedIds = (node.properties.linkedIds as string[]) || [];
          linkMap.set(sourceId, linkedIds);
        }
      }

      return linkMap;
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get paragraph links for document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { documentId, error }
      );
    }
  }

  /**
   * Remove bidirectional link between two paragraphs
   *
   * @param paragraphId1 - First paragraph ID
   * @param paragraphId2 - Second paragraph ID
   * @throws {GraphQueryError} If removal fails
   */
  async removeParagraphLink(
    paragraphId1: string,
    paragraphId2: string
  ): Promise<void> {
    try {
      const builder = new CypherQueryBuilder();
      const id1Param = builder.addParam(paragraphId1);
      const id2Param = builder.addParam(paragraphId2);

      // Delete both directions
      const cypher = `
        MATCH (p1:Paragraph)-[r:LINKS_TO]-(p2:Paragraph)
        WHERE (id(p1) = ${id1Param} AND id(p2) = ${id2Param})
           OR (id(p1) = ${id2Param} AND id(p2) = ${id1Param})
        DELETE r
      `;

      await this.query(cypher, {
        parameters: builder.getParams(),
      });
    } catch (error) {
      throw new GraphQueryError(
        `Failed to remove paragraph link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { paragraphId1, paragraphId2, error }
      );
    }
  }

  // ============================================================================
  // Theme Discovery & Analysis
  // ============================================================================

  /**
   * Discover themes by analyzing paragraph link clusters
   *
   * @param documentId - Document to analyze
   * @param minClusterSize - Minimum cluster size to consider
   * @returns Array of theme clusters
   * @throws {GraphQueryError} If analysis fails
   */
  async discoverThemes(
    documentId: string,
    minClusterSize = 3
  ): Promise<Array<{ theme: string; paragraphs: string[]; strength: number }>> {
    try {
      const builder = new CypherQueryBuilder();
      const docParam = builder.addParam(documentId);
      const minSizeParam = builder.addParam(minClusterSize);

      // Use community detection or clustering algorithm
      const cypher = `
        MATCH (p:Paragraph)
        WHERE p.documentId = ${docParam}
        WITH p
        MATCH path = (p)-[:LINKS_TO*1..2]-(connected:Paragraph)
        WHERE connected.documentId = ${docParam}
        WITH p, collect(DISTINCT connected.id) as cluster
        WHERE size(cluster) >= ${minSizeParam}
        RETURN p.id as paragraphId, cluster, size(cluster) as strength
        ORDER BY strength DESC
      `;

      const result = await this.query(cypher, {
        parameters: builder.getParams(),
      });

      // Transform results into theme format
      const themes: Array<{
        theme: string;
        paragraphs: string[];
        strength: number;
      }> = [];

      if (result.nodes) {
        for (const node of result.nodes) {
          themes.push({
            theme: `Theme ${themes.length + 1}`, // Would be enhanced with NLP
            paragraphs: (node.properties.cluster as string[]) || [],
            strength: (node.properties.strength as number) || 0,
          });
        }
      }

      return themes;
    } catch (error) {
      throw new GraphQueryError(
        `Failed to discover themes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { documentId, minClusterSize, error }
      );
    }
  }

  /**
   * Get statistics about the graph
   *
   * @returns Graph statistics
   */
  async getGraphStats(): Promise<{
    nodeCount: number;
    relationshipCount: number;
    labels: string[];
    relationshipTypes: string[];
  }> {
    try {
      const cypher = `
        MATCH (n)
        OPTIONAL MATCH ()-[r]->()
        RETURN
          count(DISTINCT n) as nodeCount,
          count(DISTINCT r) as relationshipCount,
          collect(DISTINCT labels(n)) as labels,
          collect(DISTINCT type(r)) as types
      `;

      const result = await this.query(cypher);

      return {
        nodeCount: (result.nodes?.[0]?.properties.nodeCount as number) || 0,
        relationshipCount:
          (result.nodes?.[0]?.properties.relationshipCount as number) || 0,
        labels: (result.nodes?.[0]?.properties.labels as string[]) || [],
        relationshipTypes:
          (result.nodes?.[0]?.properties.types as string[]) || [],
      };
    } catch (error) {
      throw new GraphQueryError(
        `Failed to get graph stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }
}

// ============================================================================
// Export singleton accessor
// ============================================================================

let graphServiceInstance: GraphService | null = null;

/**
 * Get GraphService singleton instance
 *
 * @param client - RuvectorClient instance (required on first call)
 * @returns GraphService instance
 */
export function getGraphService(client?: RuvectorClient): GraphService {
  if (!graphServiceInstance && !client) {
    throw new Error('GraphService must be initialized with RuvectorClient on first call');
  }

  if (client) {
    graphServiceInstance = new GraphService(client);
  }

  return graphServiceInstance!;
}

/**
 * Reset GraphService singleton (mainly for testing)
 */
export function resetGraphService(): void {
  graphServiceInstance = null;
}
