/**
 * Ruvector Service Factory
 *
 * Factory for creating and configuring Ruvector services with proper
 * dependency injection and initialization.
 */

import { VectorService } from './core/VectorService';
import { GraphService } from './core/GraphService';
import { RAGService } from './core/RAGService';
import { EntityService } from './core/EntityService';
import { ClusterService } from './core/ClusterService';
import { SimilarityAdapter } from './adapters/SimilarityAdapter';
import { ParagraphLinksAdapter } from './adapters/ParagraphLinksAdapter';
import { RAGEnhancedClaudeService, RAGEnhancementConfig } from './RAGEnhancedClaudeService';
import type {
  RuvectorConfig,
  VectorStoreConfig,
  GraphStoreConfig,
  EmbeddingConfig
} from './types';
import type { ClaudeConfig } from '../claude/types';

/**
 * Service container holding all Ruvector services
 */
export interface RuvectorServices {
  vector: VectorService;
  graph: GraphService;
  rag: RAGService;
  entity: EntityService;
  cluster: ClusterService;
  adapters: {
    similarity: SimilarityAdapter;
    paragraphLinks: ParagraphLinksAdapter;
  };
}

/**
 * Extended service container with Claude integration
 */
export interface RuvectorServicesWithClaude extends RuvectorServices {
  claude: RAGEnhancedClaudeService;
}

/**
 * Factory for creating Ruvector service instances
 */
export class RuvectorServiceFactory {
  /**
   * Create a complete set of Ruvector services
   */
  static create(config: RuvectorConfig): RuvectorServices {
    // Validate configuration
    this.validateConfig(config);

    // Create core services with dependency injection
    const vectorService = new VectorService(
      config.vectorStore,
      config.embedding
    );

    const graphService = new GraphService(config.graphStore);

    const ragService = new RAGService(
      vectorService,
      graphService,
      config.rag
    );

    const entityService = new EntityService(
      vectorService,
      graphService,
      config.entity
    );

    const clusterService = new ClusterService(
      vectorService,
      graphService,
      config.clustering
    );

    // Create adapters for backward compatibility
    const similarityAdapter = new SimilarityAdapter(vectorService);
    const paragraphLinksAdapter = new ParagraphLinksAdapter(graphService);

    return {
      vector: vectorService,
      graph: graphService,
      rag: ragService,
      entity: entityService,
      cluster: clusterService,
      adapters: {
        similarity: similarityAdapter,
        paragraphLinks: paragraphLinksAdapter
      }
    };
  }

  /**
   * Create Ruvector services with Claude integration
   */
  static createWithClaude(
    ruvectorConfig: RuvectorConfig,
    claudeConfig: ClaudeConfig,
    ragEnhancementConfig?: Partial<RAGEnhancementConfig>
  ): RuvectorServicesWithClaude {
    // Create base services
    const services = this.create(ruvectorConfig);

    // Create RAG-enhanced Claude service
    const claudeService = new RAGEnhancedClaudeService(
      claudeConfig,
      services.rag,
      ragEnhancementConfig
    );

    return {
      ...services,
      claude: claudeService
    };
  }

  /**
   * Create services from environment variables
   */
  static createFromEnv(): RuvectorServices {
    const config = this.buildConfigFromEnv();
    return this.create(config);
  }

  /**
   * Create services with Claude from environment variables
   */
  static createWithClaudeFromEnv(
    ragEnhancementConfig?: Partial<RAGEnhancementConfig>
  ): RuvectorServicesWithClaude {
    const ruvectorConfig = this.buildConfigFromEnv();
    const claudeConfig = this.buildClaudeConfigFromEnv();

    return this.createWithClaude(
      ruvectorConfig,
      claudeConfig,
      ragEnhancementConfig
    );
  }

  /**
   * Create minimal services for testing
   */
  static createMock(): RuvectorServices {
    const mockConfig: RuvectorConfig = {
      vectorStore: {
        provider: 'chroma',
        url: 'http://localhost:8000',
        collection: 'test_collection'
      },
      graphStore: {
        provider: 'neo4j',
        url: 'bolt://localhost:7687',
        database: 'test_db'
      },
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536
      }
    };

    return this.create(mockConfig);
  }

  /**
   * Validate Ruvector configuration
   */
  private static validateConfig(config: RuvectorConfig): void {
    // Validate vector store config
    if (!config.vectorStore) {
      throw new Error('Vector store configuration is required');
    }

    if (!config.vectorStore.provider) {
      throw new Error('Vector store provider is required');
    }

    if (!config.vectorStore.url) {
      throw new Error('Vector store URL is required');
    }

    // Validate graph store config
    if (!config.graphStore) {
      throw new Error('Graph store configuration is required');
    }

    if (!config.graphStore.provider) {
      throw new Error('Graph store provider is required');
    }

    if (!config.graphStore.url) {
      throw new Error('Graph store URL is required');
    }

    // Validate embedding config
    if (!config.embedding) {
      throw new Error('Embedding configuration is required');
    }

    if (!config.embedding.provider) {
      throw new Error('Embedding provider is required');
    }

    if (!config.embedding.model) {
      throw new Error('Embedding model is required');
    }
  }

  /**
   * Build Ruvector configuration from environment variables
   */
  private static buildConfigFromEnv(): RuvectorConfig {
    // Vector store configuration
    const vectorStoreProvider = process.env.VECTOR_STORE_PROVIDER || 'chroma';
    const vectorStoreUrl = process.env.VECTOR_STORE_URL || 'http://localhost:8000';
    const vectorCollection = process.env.VECTOR_COLLECTION || 'close_reading';

    const vectorStore: VectorStoreConfig = {
      provider: vectorStoreProvider as any,
      url: vectorStoreUrl,
      collection: vectorCollection
    };

    // Add API key if available
    if (process.env.VECTOR_STORE_API_KEY) {
      vectorStore.apiKey = process.env.VECTOR_STORE_API_KEY;
    }

    // Graph store configuration
    const graphStoreProvider = process.env.GRAPH_STORE_PROVIDER || 'neo4j';
    const graphStoreUrl = process.env.GRAPH_STORE_URL || 'bolt://localhost:7687';
    const graphDatabase = process.env.GRAPH_DATABASE || 'close_reading';

    const graphStore: GraphStoreConfig = {
      provider: graphStoreProvider as any,
      url: graphStoreUrl,
      database: graphDatabase
    };

    // Add authentication if available
    if (process.env.GRAPH_STORE_USERNAME && process.env.GRAPH_STORE_PASSWORD) {
      graphStore.auth = {
        username: process.env.GRAPH_STORE_USERNAME,
        password: process.env.GRAPH_STORE_PASSWORD
      };
    }

    // Embedding configuration
    const embeddingProvider = process.env.EMBEDDING_PROVIDER || 'openai';
    const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    const embeddingDimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);

    const embedding: EmbeddingConfig = {
      provider: embeddingProvider as any,
      model: embeddingModel,
      dimensions: embeddingDimensions
    };

    // Add API key if available
    if (process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY) {
      embedding.apiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
    }

    return {
      vectorStore,
      graphStore,
      embedding
    };
  }

  /**
   * Build Claude configuration from environment variables
   */
  private static buildClaudeConfigFromEnv(): ClaudeConfig {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    return {
      apiKey,
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7')
    };
  }

  /**
   * Create a singleton instance (useful for application-wide usage)
   */
  private static instance: RuvectorServices | null = null;

  static getInstance(): RuvectorServices {
    if (!this.instance) {
      this.instance = this.createFromEnv();
    }
    return this.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Health check for all services
   */
  static async healthCheck(services: RuvectorServices): Promise<{
    vector: boolean;
    graph: boolean;
    rag: boolean;
    entity: boolean;
    cluster: boolean;
  }> {
    const results = await Promise.allSettled([
      this.checkVectorService(services.vector),
      this.checkGraphService(services.graph),
      this.checkRAGService(services.rag),
      this.checkEntityService(services.entity),
      this.checkClusterService(services.cluster)
    ]);

    return {
      vector: results[0].status === 'fulfilled' && results[0].value,
      graph: results[1].status === 'fulfilled' && results[1].value,
      rag: results[2].status === 'fulfilled' && results[2].value,
      entity: results[3].status === 'fulfilled' && results[3].value,
      cluster: results[4].status === 'fulfilled' && results[4].value
    };
  }

  private static async checkVectorService(service: VectorService): Promise<boolean> {
    try {
      // Try a simple operation to check if service is working
      await service.search({
        id: 'health-check',
        documentId: 'health-check',
        topK: 1,
        threshold: 0
      });
      return true;
    } catch {
      return false;
    }
  }

  private static async checkGraphService(service: GraphService): Promise<boolean> {
    try {
      // Try to get a node to check if service is working
      await service.getNode('health-check');
      return true;
    } catch {
      return false;
    }
  }

  private static async checkRAGService(service: RAGService): Promise<boolean> {
    try {
      // Try a simple retrieve operation
      await service.retrieve({
        query: 'health check',
        documentId: 'health-check',
        topK: 1
      });
      return true;
    } catch {
      return false;
    }
  }

  private static async checkEntityService(service: EntityService): Promise<boolean> {
    try {
      // Try to get entities
      await service.getEntities('health-check');
      return true;
    } catch {
      return false;
    }
  }

  private static async checkClusterService(service: ClusterService): Promise<boolean> {
    try {
      // Try to get clusters
      await service.getClusters('health-check');
      return true;
    } catch {
      return false;
    }
  }
}
