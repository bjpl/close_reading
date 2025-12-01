/**
 * React Hooks for Ruvector Services
 *
 * Custom hooks for using Ruvector in React components.
 * Provides type-safe, reactive interfaces to all Ruvector services.
 *
 * @module RuvectorReactHooks
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RuvectorServiceFactory } from '../factory';
import type {
  VectorSearchOptions,
  GraphTraversalOptions,
  RAGQueryOptions,
  ThemeDiscoveryOptions
} from '../types';

// =============================================================================
// HOOK OPTIONS AND TYPES
// =============================================================================

export interface UseVectorSearchOptions extends VectorSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
  onSuccess?: (results: any[]) => void;
  onError?: (error: Error) => void;
}

export interface UseGraphTraversalOptions extends GraphTraversalOptions {
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface UseRAGQueryOptions extends RAGQueryOptions {
  enabled?: boolean;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onAnswer?: (answer: string, sources: any[]) => void;
}

export interface UseEntityNetworkOptions {
  enabled?: boolean;
  includeRelationships?: boolean;
  minImportance?: number;
}

export interface UseThemeDiscoveryOptions extends ThemeDiscoveryOptions {
  enabled?: boolean;
  autoRefresh?: boolean;
}

// =============================================================================
// VECTOR SEARCH HOOK
// =============================================================================

/**
 * Hook for semantic vector search
 *
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [query, setQuery] = useState('');
 *
 *   const { results, isLoading, error, search } = useVectorSearch(query, {
 *     topK: 10,
 *     debounceMs: 300,
 *     filters: { documentId: 'doc_123' }
 *   });
 *
 *   return (
 *     <div>
 *       <input value={query} onChange={e => setQuery(e.target.value)} />
 *       {isLoading && <Spinner />}
 *       {results.map(result => (
 *         <SearchResult key={result.id} {...result} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVectorSearch(
  query: string,
  options: UseVectorSearchOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 0,
    onSuccess,
    onError,
    ...searchOptions
  } = options;

  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout>();
  const abortController = useRef<AbortController>();

  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !enabled) {
        setResults([]);
        return;
      }

      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const factory = RuvectorServiceFactory.getInstance();
        const vectorService = await factory.getVectorService();

        const searchResults = await vectorService.search({
          query: searchQuery,
          ...searchOptions
        });

        setResults(searchResults);
        onSuccess?.(searchResults);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, searchOptions, onSuccess, onError]
  );

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (debounceMs > 0) {
      debounceTimer.current = setTimeout(() => {
        search(query);
      }, debounceMs);
    } else {
      search(query);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, search, debounceMs]);

  return {
    results,
    isLoading,
    error,
    search: useCallback((q: string) => search(q), [search])
  };
}

// =============================================================================
// GRAPH TRAVERSAL HOOK
// =============================================================================

/**
 * Hook for graph traversal and navigation
 *
 * @example
 * ```tsx
 * function GraphViewer({ nodeId }: { nodeId: string }) {
 *   const { graph, neighbors, path, isLoading, navigateTo, findPath } =
 *     useGraphTraversal(nodeId, {
 *       depth: 2,
 *       autoRefresh: true,
 *       refreshIntervalMs: 30000
 *     });
 *
 *   return (
 *     <div>
 *       <GraphVisualization graph={graph} onNodeClick={navigateTo} />
 *       {neighbors.map(n => (
 *         <NeighborCard key={n.id} {...n} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGraphTraversal(
  nodeId: string,
  options: UseGraphTraversalOptions = {}
) {
  const {
    enabled = true,
    autoRefresh = false,
    refreshIntervalMs = 30000,
    depth = 1,
    ...traversalOptions
  } = options;

  const [graph, setGraph] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [path, setPath] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadGraph = useCallback(async () => {
    if (!nodeId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const factory = RuvectorServiceFactory.getInstance();
      const graphService = await factory.getGraphService();

      // Get subgraph around node
      const subgraph = await graphService.getSubgraph(nodeId, {
        depth,
        ...traversalOptions
      });

      setGraph(subgraph);

      // Get immediate neighbors
      const neighborNodes = await graphService.getNeighbors(nodeId, {
        depth: 1,
        includeMetadata: true
      });

      setNeighbors(neighborNodes);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, enabled, depth, traversalOptions]);

  // Initial load and refresh
  useEffect(() => {
    loadGraph();

    if (autoRefresh) {
      const interval = setInterval(loadGraph, refreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [loadGraph, autoRefresh, refreshIntervalMs]);

  // Navigate to a new node
  const navigateTo = useCallback(
    (newNodeId: string) => {
      setPath(prev => [...prev, nodeId]);
      // In real app, this would update the parent component's nodeId state
      // For now, we just track the path
    },
    [nodeId]
  );

  // Find shortest path between nodes
  const findPath = useCallback(
    async (targetNodeId: string) => {
      try {
        const factory = RuvectorServiceFactory.getInstance();
        const graphService = await factory.getGraphService();

        const shortestPath = await graphService.findPath(nodeId, targetNodeId, {
          algorithm: 'dijkstra',
          maxDepth: 6
        });

        setPath(shortestPath);
        return shortestPath;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      }
    },
    [nodeId]
  );

  return {
    graph,
    neighbors,
    path,
    isLoading,
    error,
    navigateTo,
    findPath,
    refresh: loadGraph
  };
}

// =============================================================================
// RAG QUERY HOOK
// =============================================================================

/**
 * Hook for RAG-enhanced Q&A
 *
 * @example
 * ```tsx
 * function ChatInterface({ documentIds }: { documentIds: string[] }) {
 *   const [question, setQuestion] = useState('');
 *   const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY!;
 *
 *   const {
 *     answer,
 *     sources,
 *     followUps,
 *     isLoading,
 *     history,
 *     ask,
 *     reset
 *   } = useRAGQuery(documentIds, apiKey, {
 *     topK: 5,
 *     generateFollowUps: true
 *   });
 *
 *   return (
 *     <div>
 *       <ChatHistory messages={history} />
 *       <input
 *         value={question}
 *         onChange={e => setQuestion(e.target.value)}
 *         onKeyPress={e => e.key === 'Enter' && ask(question)}
 *       />
 *       {isLoading && <Spinner />}
 *       {answer && <Answer text={answer} sources={sources} />}
 *       {followUps.length > 0 && (
 *         <FollowUpQuestions questions={followUps} onSelect={ask} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRAGQuery(
  documentIds: string[],
  apiKey: string,
  options: UseRAGQueryOptions = {}
) {
  const { enabled = true, conversationHistory = [], onAnswer, ...ragOptions } = options;

  const [answer, setAnswer] = useState<string>('');
  const [sources, setSources] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >(conversationHistory);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || !enabled || !apiKey) return;

      setIsLoading(true);
      setError(null);

      try {
        const factory = RuvectorServiceFactory.getInstance();
        const ragService = await factory.getRAGService();

        const result = await ragService.conversationalQuery({
          question,
          documentIds,
          conversationHistory: history,
          generateFollowUps: true,
          generateCitations: true,
          apiKey,
          ...ragOptions
        });

        setAnswer(result.answer);
        setSources(result.sources || []);
        setFollowUps(result.followUpQuestions || []);

        // Update conversation history
        setHistory(prev => [
          ...prev,
          { role: 'user', content: question },
          { role: 'assistant', content: result.answer }
        ]);

        onAnswer?.(result.answer, result.sources || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [documentIds, apiKey, enabled, history, ragOptions, onAnswer]
  );

  const reset = useCallback(() => {
    setAnswer('');
    setSources([]);
    setFollowUps([]);
    setHistory([]);
    setError(null);
  }, []);

  return {
    answer,
    sources,
    followUps,
    isLoading,
    error,
    history,
    ask,
    reset
  };
}

// =============================================================================
// ENTITY NETWORK HOOK
// =============================================================================

/**
 * Hook for entity extraction and network analysis
 *
 * @example
 * ```tsx
 * function EntityGraph({ documentId }: { documentId: string }) {
 *   const { entities, relationships, network, isLoading } = useEntityNetwork(
 *     documentId,
 *     {
 *       includeRelationships: true,
 *       minImportance: 0.5
 *     }
 *   );
 *
 *   return (
 *     <div>
 *       <NetworkVisualization
 *         nodes={entities}
 *         edges={relationships}
 *         metrics={network}
 *       />
 *       <EntityList entities={entities} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useEntityNetwork(
  documentId: string,
  options: UseEntityNetworkOptions = {}
) {
  const {
    enabled = true,
    includeRelationships = true,
    minImportance = 0
  } = options;

  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [network, setNetwork] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId || !enabled) return;

    const loadEntities = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const factory = RuvectorServiceFactory.getInstance();
        const entityService = await factory.getEntityService();

        // Get entities
        const extractedEntities = await entityService.getEntities(documentId, {
          minImportance,
          includeContext: true
        });

        setEntities(extractedEntities);

        // Get relationships if requested
        if (includeRelationships) {
          const rels = await entityService.getRelationships(documentId, {
            minStrength: 0.3
          });
          setRelationships(rels);
        }

        // Analyze network
        const networkStats = await entityService.analyzeEntityNetwork(documentId);
        setNetwork(networkStats);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntities();
  }, [documentId, enabled, includeRelationships, minImportance]);

  return {
    entities,
    relationships,
    network,
    isLoading,
    error
  };
}

// =============================================================================
// THEME DISCOVERY HOOK
// =============================================================================

/**
 * Hook for theme discovery and clustering
 *
 * @example
 * ```tsx
 * function ThemeExplorer({ documentIds }: { documentIds: string[] }) {
 *   const { themes, evolution, hierarchy, isLoading } = useThemeDiscovery(
 *     documentIds,
 *     {
 *       numClusters: 'auto',
 *       trackEvolution: true
 *     }
 *   );
 *
 *   return (
 *     <div>
 *       <ThemeTimeline themes={themes} evolution={evolution} />
 *       <ThemeHierarchy tree={hierarchy} />
 *       <ThemeList themes={themes} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useThemeDiscovery(
  documentIds: string[],
  options: UseThemeDiscoveryOptions = {}
) {
  const {
    enabled = true,
    autoRefresh = false,
    numClusters = 'auto',
    algorithm = 'kmeans',
    ...discoveryOptions
  } = options;

  const [themes, setThemes] = useState<any[]>([]);
  const [evolution, setEvolution] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const discoverThemes = useCallback(async () => {
    if (documentIds.length === 0 || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const factory = RuvectorServiceFactory.getInstance();
      const clusterService = await factory.getClusterService();

      // Discover themes across all documents
      const discoveredThemes = await clusterService.discoverThemes(documentIds[0], {
        numClusters,
        algorithm,
        extractKeywords: true,
        computeCoherence: true,
        ...discoveryOptions
      });

      setThemes(discoveredThemes);

      // Track evolution if requested
      if (discoveryOptions.trackEvolution) {
        const themeEvolution = await clusterService.trackThemeEvolution(
          documentIds[0],
          {
            windowSize: 10,
            stride: 5,
            trackTransitions: true
          }
        );
        setEvolution(themeEvolution);
      }

      // Build hierarchy if hierarchical algorithm
      if (algorithm === 'hierarchical') {
        const themeHierarchy = await clusterService.hierarchicalClustering(
          documentIds[0],
          {
            linkageMethod: 'ward',
            maxDepth: 4
          }
        );
        setHierarchy(themeHierarchy);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [documentIds, enabled, numClusters, algorithm, discoveryOptions]);

  useEffect(() => {
    discoverThemes();

    if (autoRefresh) {
      const interval = setInterval(discoverThemes, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [discoverThemes, autoRefresh]);

  return {
    themes,
    evolution,
    hierarchy,
    isLoading,
    error,
    refresh: discoverThemes
  };
}

// =============================================================================
// DOCUMENT INDEXING HOOK
// =============================================================================

/**
 * Hook for indexing documents
 *
 * @example
 * ```tsx
 * function DocumentUpload() {
 *   const { indexDocument, isIndexing, progress, error } = useDocumentIndexing({
 *     onComplete: (result) => console.log('Indexed:', result)
 *   });
 *
 *   const handleUpload = async (file: File) => {
 *     const text = await file.text();
 *     await indexDocument({
 *       id: file.name,
 *       text,
 *       metadata: { filename: file.name }
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={e => handleUpload(e.target.files![0])} />
 *       {isIndexing && <ProgressBar value={progress} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDocumentIndexing(options: {
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
} = {}) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const indexDocument = useCallback(
    async (document: { id: string; text: string; metadata?: any }) => {
      setIsIndexing(true);
      setProgress(0);
      setError(null);

      try {
        const factory = RuvectorServiceFactory.getInstance();
        const vectorService = await factory.getVectorService();

        // Split into chunks
        const chunks = document.text.split('\n\n').filter(c => c.trim());

        setProgress(0.2);

        // Index chunks
        const indexedChunks = await vectorService.indexDocumentBatch(
          chunks.map((text, idx) => ({
            id: `${document.id}_chunk${idx}`,
            text,
            metadata: {
              ...document.metadata,
              documentId: document.id,
              chunkIndex: idx
            }
          }))
        );

        setProgress(1);

        options.onComplete?.(indexedChunks);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
      } finally {
        setIsIndexing(false);
      }
    },
    [options]
  );

  return {
    indexDocument,
    isIndexing,
    progress,
    error
  };
}

// =============================================================================
// COMBINED HOOKS
// =============================================================================

/**
 * Combined hook for complete document analysis
 *
 * @example
 * ```tsx
 * function DocumentAnalyzer({ documentId }: { documentId: string }) {
 *   const analysis = useDocumentAnalysis(documentId, {
 *     enableSearch: true,
 *     enableGraph: true,
 *     enableEntities: true,
 *     enableThemes: true
 *   });
 *
 *   return (
 *     <div>
 *       <Overview {...analysis.summary} />
 *       <ThemeSection themes={analysis.themes} />
 *       <EntitySection entities={analysis.entities} />
 *       <GraphSection graph={analysis.graph} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useDocumentAnalysis(
  documentId: string,
  options: {
    enableSearch?: boolean;
    enableGraph?: boolean;
    enableEntities?: boolean;
    enableThemes?: boolean;
  } = {}
) {
  const searchQuery = useState('')[0];

  const search = useVectorSearch(searchQuery, {
    enabled: options.enableSearch,
    filters: { documentId }
  });

  const graph = useGraphTraversal(documentId, {
    enabled: options.enableGraph
  });

  const entities = useEntityNetwork(documentId, {
    enabled: options.enableEntities
  });

  const themes = useThemeDiscovery([documentId], {
    enabled: options.enableThemes
  });

  const isLoading =
    search.isLoading ||
    graph.isLoading ||
    entities.isLoading ||
    themes.isLoading;

  const error =
    search.error || graph.error || entities.error || themes.error;

  const summary = useMemo(
    () => ({
      totalResults: search.results.length,
      graphNodes: graph.graph?.nodes.size || 0,
      entityCount: entities.entities.length,
      themeCount: themes.themes.length
    }),
    [search.results, graph.graph, entities.entities, themes.themes]
  );

  return {
    search: search.results,
    graph: graph.graph,
    entities: entities.entities,
    themes: themes.themes,
    summary,
    isLoading,
    error
  };
}

// Export all hooks
export default {
  useVectorSearch,
  useGraphTraversal,
  useRAGQuery,
  useEntityNetwork,
  useThemeDiscovery,
  useDocumentIndexing,
  useDocumentAnalysis
};
