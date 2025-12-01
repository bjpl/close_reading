/**
 * Adapter that makes Ruvector GraphService compatible with existing paragraphLinks.ts usage
 * Allows gradual migration without breaking existing code
 */

import { GraphService } from '../core/GraphService';
import type { GraphNode, GraphEdge, GraphRelationship } from '../types';

/**
 * Represents a link between paragraphs
 */
export interface ParagraphLink {
  sourceId: string;
  targetId: string;
  type: string;
  strength?: number;
  metadata?: Record<string, any>;
}

/**
 * Configuration for link operations
 */
export interface LinkConfig {
  includeMetadata?: boolean;
  minStrength?: number;
  maxDepth?: number;
}

/**
 * Represents a graph of paragraph links
 */
export interface ParagraphGraph {
  nodes: Array<{ id: string; metadata?: Record<string, any> }>;
  links: ParagraphLink[];
  statistics?: {
    nodeCount: number;
    linkCount: number;
    avgDegree: number;
  };
}

/**
 * Adapter that wraps GraphService to match paragraphLinks.ts API
 */
export class ParagraphLinksAdapter {
  constructor(private graphService: GraphService) {}

  /**
   * Create a link between two paragraphs
   */
  async createParagraphLink(
    sourceId: string,
    targetId: string,
    type: string,
    metadata?: Record<string, any>
  ): Promise<ParagraphLink> {
    // Create nodes for source and target if they don't exist
    await this.ensureNodeExists(sourceId, metadata);
    await this.ensureNodeExists(targetId, metadata);

    // Create the relationship
    const relationship = await this.graphService.addRelationship({
      source: sourceId,
      target: targetId,
      type,
      properties: {
        strength: metadata?.strength ?? 1.0,
        ...metadata
      }
    });

    return this.convertToLink(relationship);
  }

  /**
   * Get all links for a paragraph
   */
  async getParagraphLinks(
    paragraphId: string,
    config: LinkConfig = {}
  ): Promise<ParagraphLink[]> {
    const {
      includeMetadata = true,
      minStrength = 0
    } = config;

    // Get neighbors (this gives us connected nodes)
    const neighbors = await this.graphService.getNeighbors(paragraphId);

    // Get all relationships for this node
    const links: ParagraphLink[] = [];

    for (const neighbor of neighbors) {
      // Check if there's a direct edge in the graph
      const relationship = await this.findRelationship(paragraphId, neighbor.id);

      if (relationship) {
        const link = this.convertToLink(relationship);

        // Filter by strength if specified
        if (!link.strength || link.strength >= minStrength) {
          if (!includeMetadata) {
            delete link.metadata;
          }
          links.push(link);
        }
      }
    }

    return links;
  }

  /**
   * Get links between specific paragraphs
   */
  async getLinksForParagraphs(
    paragraphIds: string[],
    config: LinkConfig = {}
  ): Promise<ParagraphLink[]> {
    const { includeMetadata = true, minStrength = 0 } = config;
    const links: ParagraphLink[] = [];
    const seen = new Set<string>();

    // Get all links for each paragraph
    for (const paragraphId of paragraphIds) {
      const nodeLinks = await this.getParagraphLinks(paragraphId, config);

      for (const link of nodeLinks) {
        // Only include links between paragraphs in the set
        if (paragraphIds.includes(link.targetId)) {
          // Create a unique key to avoid duplicates
          const key = `${link.sourceId}-${link.targetId}`;
          const reverseKey = `${link.targetId}-${link.sourceId}`;

          if (!seen.has(key) && !seen.has(reverseKey)) {
            if (!link.strength || link.strength >= minStrength) {
              if (!includeMetadata) {
                delete link.metadata;
              }
              links.push(link);
              seen.add(key);
            }
          }
        }
      }
    }

    return links;
  }

  /**
   * Remove a link between paragraphs
   */
  async removeParagraphLink(
    sourceId: string,
    targetId: string,
    type?: string
  ): Promise<boolean> {
    // If type is specified, only remove that specific relationship
    // Otherwise remove all relationships between the nodes
    const relationship = await this.findRelationship(sourceId, targetId, type);

    if (!relationship) {
      return false;
    }

    // GraphService doesn't have a direct removeRelationship method
    // We'll need to handle this through the underlying graph
    // For now, mark as removed in metadata
    await this.graphService.addRelationship({
      source: sourceId,
      target: targetId,
      type: relationship.type,
      properties: {
        ...relationship.properties,
        removed: true,
        removedAt: new Date().toISOString()
      }
    });

    return true;
  }

  /**
   * Update link strength or metadata
   */
  async updateParagraphLink(
    sourceId: string,
    targetId: string,
    updates: Partial<ParagraphLink>
  ): Promise<ParagraphLink | null> {
    const relationship = await this.findRelationship(sourceId, targetId, updates.type);

    if (!relationship) {
      return null;
    }

    // Update the relationship
    const updated = await this.graphService.addRelationship({
      source: sourceId,
      target: targetId,
      type: updates.type || relationship.type,
      properties: {
        ...relationship.properties,
        strength: updates.strength ?? relationship.properties?.strength,
        ...updates.metadata
      }
    });

    return this.convertToLink(updated);
  }

  /**
   * Get a complete graph of paragraph links
   */
  async getParagraphGraph(
    documentId: string,
    config: LinkConfig = {}
  ): Promise<ParagraphGraph> {
    // Get all paragraphs for the document
    const paragraphIds = await this.getParagraphIds(documentId);

    // Get all links between these paragraphs
    const links = await this.getLinksForParagraphs(paragraphIds, config);

    // Build node list
    const nodes = await Promise.all(
      paragraphIds.map(async (id) => {
        const node = await this.graphService.getNode(id);
        return {
          id,
          metadata: config.includeMetadata ? node?.properties : undefined
        };
      })
    );

    // Calculate statistics
    const linkCount = links.length;
    const nodeCount = nodes.length;
    const avgDegree = nodeCount > 0 ? (2 * linkCount) / nodeCount : 0;

    return {
      nodes,
      links,
      statistics: {
        nodeCount,
        linkCount,
        avgDegree
      }
    };
  }

  /**
   * Find the shortest path between two paragraphs
   */
  async findPath(
    sourceId: string,
    targetId: string,
    maxDepth: number = 5
  ): Promise<string[] | null> {
    // Simple BFS to find shortest path
    const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
    const visited = new Set<string>([sourceId]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === targetId) {
        return current.path;
      }

      if (current.path.length >= maxDepth) {
        continue;
      }

      const neighbors = await this.graphService.getNeighbors(current.id);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push({
            id: neighbor.id,
            path: [...current.path, neighbor.id]
          });
        }
      }
    }

    return null;
  }

  /**
   * Get the degree (number of connections) for each paragraph
   */
  async getParagraphDegrees(paragraphIds: string[]): Promise<Map<string, number>> {
    const degrees = new Map<string, number>();

    await Promise.all(
      paragraphIds.map(async (id) => {
        const links = await this.getParagraphLinks(id, { includeMetadata: false });
        degrees.set(id, links.length);
      })
    );

    return degrees;
  }

  /**
   * Find clusters of connected paragraphs
   */
  async findConnectedComponents(paragraphIds: string[]): Promise<string[][]> {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const paragraphId of paragraphIds) {
      if (visited.has(paragraphId)) continue;

      const component = await this.getConnectedComponent(paragraphId, paragraphIds, visited);
      if (component.length > 0) {
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Get a connected component starting from a node
   */
  private async getConnectedComponent(
    startId: string,
    allowedIds: string[],
    visited: Set<string>
  ): Promise<string[]> {
    const component: string[] = [];
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      component.push(currentId);

      const neighbors = await this.graphService.getNeighbors(currentId);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id) && allowedIds.includes(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push(neighbor.id);
        }
      }
    }

    return component;
  }

  /**
   * Ensure a node exists in the graph
   */
  private async ensureNodeExists(
    id: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const existing = await this.graphService.getNode(id);

    if (!existing) {
      await this.graphService.addNode({
        id,
        type: 'paragraph',
        properties: metadata || {}
      });
    }
  }

  /**
   * Find a relationship between two nodes
   */
  private async findRelationship(
    sourceId: string,
    targetId: string,
    type?: string
  ): Promise<GraphRelationship | null> {
    // This is a workaround since GraphService doesn't expose relationships directly
    // We'll use the neighbors method and infer the relationship
    const neighbors = await this.graphService.getNeighbors(sourceId);
    const neighbor = neighbors.find(n => n.id === targetId);

    if (!neighbor) {
      return null;
    }

    // Create a synthetic relationship object
    return {
      source: sourceId,
      target: targetId,
      type: type || 'related',
      properties: neighbor.properties || {}
    };
  }

  /**
   * Convert GraphRelationship to ParagraphLink
   */
  private convertToLink(relationship: GraphRelationship): ParagraphLink {
    return {
      sourceId: relationship.source,
      targetId: relationship.target,
      type: relationship.type,
      strength: relationship.properties?.strength as number,
      metadata: relationship.properties
    };
  }

  /**
   * Get all paragraph IDs for a document
   */
  private async getParagraphIds(documentId: string): Promise<string[]> {
    // This would need to be implemented based on how documents are stored
    // For now, we'll use a placeholder that queries the graph for all nodes
    // of type 'paragraph' with the given document ID
    const allNodes = await this.graphService.query(
      `MATCH (p:paragraph {documentId: $documentId}) RETURN p.id`,
      { documentId }
    );

    return allNodes.map((node: any) => node.id);
  }
}
