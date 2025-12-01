/**
 * Ruvector Service Factory
 *
 * Simple factory for creating Ruvector service instances.
 * Uses RuvectorClient for all API communication.
 */

import { VectorService } from './core/VectorService';
import { GraphService } from './core/GraphService';
import { RAGService } from './core/RAGService';
import { EntityService } from './core/EntityService';
import { ClusterService } from './core/ClusterService';
import { RuvectorClient, getRuvectorClient } from './client';
import type { RuvectorConfig } from './types';

/**
 * Service container holding all Ruvector services
 */
export interface RuvectorServices {
  vector: VectorService;
  graph: GraphService;
  rag: RAGService;
  entity: EntityService;
  cluster: ClusterService;
  client: RuvectorClient;
}

/**
 * Factory for creating Ruvector service instances
 */
export class RuvectorServiceFactory {
  private static instance: RuvectorServices | null = null;
  private static client: RuvectorClient | null = null;

  /**
   * Create a complete set of Ruvector services
   */
  static create(config?: RuvectorConfig): RuvectorServices {
    // Get or create client
    const client = getRuvectorClient(config);
    this.client = client;

    // Create core services with shared client
    const vectorService = new VectorService(client);
    const graphService = new GraphService(client);
    const ragService = new RAGService(client);
    const entityService = new EntityService(client);
    const clusterService = new ClusterService(client);

    return {
      vector: vectorService,
      graph: graphService,
      rag: ragService,
      entity: entityService,
      cluster: clusterService,
      client,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: RuvectorConfig): RuvectorServices {
    if (!this.instance) {
      this.instance = this.create(config);
    }
    return this.instance;
  }

  /**
   * Get individual services
   */
  static async getVectorService(config?: RuvectorConfig): Promise<VectorService> {
    return this.getInstance(config).vector;
  }

  static async getGraphService(config?: RuvectorConfig): Promise<GraphService> {
    return this.getInstance(config).graph;
  }

  static async getRAGService(config?: RuvectorConfig): Promise<RAGService> {
    return this.getInstance(config).rag;
  }

  static async getEntityService(config?: RuvectorConfig): Promise<EntityService> {
    return this.getInstance(config).entity;
  }

  static async getClusterService(config?: RuvectorConfig): Promise<ClusterService> {
    return this.getInstance(config).cluster;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null;
    this.client = null;
  }

  /**
   * Health check for all services
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    client: boolean;
  }> {
    try {
      if (!this.client) {
        return { healthy: false, client: false };
      }

      const health = await this.client.healthCheck();
      return {
        healthy: health.status === 'healthy',
        client: true,
      };
    } catch {
      return { healthy: false, client: false };
    }
  }
}
