/**
 * GraphService Unit Tests
 *
 * Comprehensive test coverage for graph operations including:
 * - Node CRUD operations
 * - Relationship CRUD operations
 * - Cypher query execution
 * - Graph traversal and path finding
 * - Paragraph linking (backward compatibility)
 * - Theme discovery
 * - Error handling and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphService, getGraphService, resetGraphService } from '../../../src/services/ruvector/GraphService';
import type { RuvectorClient } from '../../../src/services/ruvector/client';
import { GraphQueryError } from '../../../src/services/ruvector/types';
import type {
  GraphNode,
  GraphRelationship,
  GraphQueryResult,
  GraphTraversalOptions,
} from '../../../src/services/ruvector/types';

// ============================================================================
// Mock RuvectorClient
// ============================================================================

const createMockClient = (): RuvectorClient => {
  return {
    request: vi.fn(),
    healthCheck: vi.fn(),
    getMetrics: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    clearCache: vi.fn(),
    validateApiKey: vi.fn(),
    destroy: vi.fn(),
  } as unknown as RuvectorClient;
};

// ============================================================================
// Test Suite: GraphService
// ============================================================================

describe('GraphService', () => {
  let mockClient: RuvectorClient;
  let graphService: GraphService;

  beforeEach(() => {
    mockClient = createMockClient();
    graphService = new GraphService(mockClient);
    resetGraphService(); // Reset singleton between tests
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Node Operations - createNode()
  // ============================================================================

  describe('createNode()', () => {
    it('should create a node with labels and properties', async () => {
      const nodeData = {
        labels: ['Paragraph', 'Document'],
        properties: {
          text: 'Sample text',
          position: 0,
          documentId: 'doc-123',
        },
      };

      const mockCreatedNode: GraphNode = {
        id: 'node-1',
        ...nodeData,
      };

      const mockResponse: GraphQueryResult = {
        nodes: [mockCreatedNode],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await graphService.createNode(nodeData);

      expect(result).toEqual(mockCreatedNode);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v1/graph/query',
          body: expect.objectContaining({
            cypher: expect.stringContaining('CREATE'),
          }),
        })
      );
    });

    it('should sanitize labels in Cypher query', async () => {
      const nodeData = {
        labels: ['Invalid-Label!', 'Valid_Label'],
        properties: { name: 'test' },
      };

      const mockResponse: GraphQueryResult = {
        nodes: [{ id: 'node-1', ...nodeData }],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.createNode(nodeData);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain(':Invalid_Label_');
      expect(callArgs.body.cypher).toContain(':Valid_Label');
    });

    it('should parameterize properties to prevent Cypher injection', async () => {
      const nodeData = {
        labels: ['Test'],
        properties: {
          malicious: "'; DROP ALL; --",
          normal: 'value',
        },
      };

      const mockResponse: GraphQueryResult = {
        nodes: [{ id: 'node-1', ...nodeData }],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.createNode(nodeData);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.parameters).toBeDefined();
      expect(Object.values(callArgs.body.parameters)).toContain("'; DROP ALL; --");
    });

    it('should throw GraphQueryError when creation returns no nodes', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(
        graphService.createNode({ labels: ['Test'], properties: {} })
      ).rejects.toThrow(GraphQueryError);
      await expect(
        graphService.createNode({ labels: ['Test'], properties: {} })
      ).rejects.toThrow('Node creation returned no results');
    });

    it('should wrap network errors in GraphQueryError', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Network error'));

      await expect(
        graphService.createNode({ labels: ['Test'], properties: {} })
      ).rejects.toThrow(GraphQueryError);
      await expect(
        graphService.createNode({ labels: ['Test'], properties: {} })
      ).rejects.toThrow('Failed to create node');
    });
  });

  // ============================================================================
  // Node Operations - getNode()
  // ============================================================================

  describe('getNode()', () => {
    it('should retrieve a node by ID', async () => {
      const mockNode: GraphNode = {
        id: 'node-1',
        labels: ['Test'],
        properties: { name: 'Test Node' },
      };

      const mockResponse: GraphQueryResult = {
        nodes: [mockNode],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await graphService.getNode('node-1');

      expect(result).toEqual(mockNode);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v1/graph/query',
          body: expect.objectContaining({
            cypher: expect.stringContaining('MATCH (n)'),
          }),
        })
      );
    });

    it('should return null when node not found', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await graphService.getNode('non-existent');

      expect(result).toBeNull();
    });

    it('should throw GraphQueryError on query failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Database error'));

      await expect(graphService.getNode('node-1')).rejects.toThrow(GraphQueryError);
      await expect(graphService.getNode('node-1')).rejects.toThrow('Failed to get node');
    });
  });

  // ============================================================================
  // Node Operations - updateNode()
  // ============================================================================

  describe('updateNode()', () => {
    it('should update node properties', async () => {
      const updatedNode: GraphNode = {
        id: 'node-1',
        labels: ['Test'],
        properties: { name: 'Updated Name', value: 42 },
      };

      const mockResponse: GraphQueryResult = {
        nodes: [updatedNode],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await graphService.updateNode('node-1', {
        name: 'Updated Name',
        value: 42,
      });

      expect(result).toEqual(updatedNode);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            cypher: expect.stringContaining('SET'),
          }),
        })
      );
    });

    it('should throw error when node not found', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(
        graphService.updateNode('non-existent', { name: 'test' })
      ).rejects.toThrow(GraphQueryError);
      await expect(
        graphService.updateNode('non-existent', { name: 'test' })
      ).rejects.toThrow('Node non-existent not found');
    });

    it('should escape property keys', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [{ id: 'node-1', labels: ['Test'], properties: {} }],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.updateNode('node-1', {
        'invalid-key!': 'value',
        'valid_key': 'value2',
      });

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('invalid_key_');
      expect(callArgs.body.cypher).toContain('valid_key');
    });
  });

  // ============================================================================
  // Node Operations - deleteNode()
  // ============================================================================

  describe('deleteNode()', () => {
    it('should delete a node and its relationships', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.deleteNode('node-1');

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            cypher: expect.stringContaining('DETACH DELETE'),
          }),
        })
      );
    });

    it('should throw error on deletion failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Delete failed'));

      await expect(graphService.deleteNode('node-1')).rejects.toThrow(GraphQueryError);
    });
  });

  // ============================================================================
  // Relationship Operations - createRelationship()
  // ============================================================================

  describe('createRelationship()', () => {
    it('should create a relationship between nodes', async () => {
      const relData = {
        type: 'LINKS_TO',
        startNode: 'node-1',
        endNode: 'node-2',
        properties: {
          strength: 5,
          created_at: Date.now(),
        },
      };

      const mockRel: GraphRelationship = {
        id: 'rel-1',
        ...relData,
      };

      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [mockRel],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await graphService.createRelationship(relData);

      expect(result).toEqual(mockRel);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            cypher: expect.stringContaining('CREATE'),
          }),
        })
      );
    });

    it('should sanitize relationship type', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [
          {
            id: 'rel-1',
            type: 'INVALID_TYPE',
            startNode: 'node-1',
            endNode: 'node-2',
            properties: {},
          },
        ],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.createRelationship({
        type: 'invalid-type!',
        startNode: 'node-1',
        endNode: 'node-2',
        properties: {},
      });

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain(':INVALID_TYPE_');
    });

    it('should throw error when relationship creation fails', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(
        graphService.createRelationship({
          type: 'TEST',
          startNode: 'node-1',
          endNode: 'node-2',
          properties: {},
        })
      ).rejects.toThrow(GraphQueryError);
      await expect(
        graphService.createRelationship({
          type: 'TEST',
          startNode: 'node-1',
          endNode: 'node-2',
          properties: {},
        })
      ).rejects.toThrow('Relationship creation returned no results');
    });
  });

  // ============================================================================
  // Relationship Operations - getRelationships()
  // ============================================================================

  describe('getRelationships()', () => {
    it('should get relationships for a node', async () => {
      const mockRels: GraphRelationship[] = [
        {
          id: 'rel-1',
          type: 'LINKS_TO',
          startNode: 'node-1',
          endNode: 'node-2',
          properties: {},
        },
      ];

      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: mockRels,
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await graphService.getRelationships('node-1');

      expect(result).toEqual(mockRels);
    });

    it('should support direction filtering (outgoing)', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const options: GraphTraversalOptions = {
        direction: 'outgoing',
      };

      await graphService.getRelationships('node-1', options);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('->');
      expect(callArgs.body.cypher).not.toContain('<-');
    });

    it('should support direction filtering (incoming)', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const options: GraphTraversalOptions = {
        direction: 'incoming',
      };

      await graphService.getRelationships('node-1', options);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('<-');
    });

    it('should support relationship type filtering', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const options: GraphTraversalOptions = {
        relationshipTypes: ['LINKS_TO', 'REFERENCES'],
      };

      await graphService.getRelationships('node-1', options);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toMatch(/:LINKS_TO|REFERENCES/);
    });

    it('should support depth and limit options', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const options: GraphTraversalOptions = {
        maxDepth: 3,
        limit: 10,
      };

      await graphService.getRelationships('node-1', options);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('*1..3');
      expect(callArgs.body.cypher).toContain('LIMIT 10');
    });
  });

  // ============================================================================
  // Relationship Operations - deleteRelationship()
  // ============================================================================

  describe('deleteRelationship()', () => {
    it('should delete a relationship by ID', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.deleteRelationship('rel-1');

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            cypher: expect.stringContaining('DELETE r'),
          }),
        })
      );
    });
  });

  // ============================================================================
  // Cypher Query Execution - query()
  // ============================================================================

  describe('query()', () => {
    it('should execute Cypher query with parameters', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [
          {
            id: 'node-1',
            labels: ['Paragraph'],
            properties: { documentId: 'doc-123' },
          },
        ],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const cypher = 'MATCH (n:Paragraph) WHERE n.documentId = $docId RETURN n';
      const result = await graphService.query(cypher, {
        parameters: { docId: 'doc-123' },
      });

      expect(result).toEqual(mockResponse);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/graph/query',
        body: {
          cypher,
          parameters: { docId: 'doc-123' },
          timeout: undefined,
          readOnly: false,
        },
      });
    });

    it('should support timeout option', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.query('MATCH (n) RETURN n', { timeout: 5000 });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            timeout: 5000,
          }),
        })
      );
    });

    it('should support readOnly option', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.query('MATCH (n) RETURN n', { readOnly: true });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            readOnly: true,
          }),
        })
      );
    });

    it('should throw GraphQueryError on query failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Syntax error'));

      await expect(graphService.query('INVALID CYPHER')).rejects.toThrow(GraphQueryError);
      await expect(graphService.query('INVALID CYPHER')).rejects.toThrow(
        'Cypher query failed'
      );
    });
  });

  // ============================================================================
  // Path Finding - findPaths()
  // ============================================================================

  describe('findPaths()', () => {
    it('should find paths between two nodes', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [
          { id: 'node-1', labels: ['Test'], properties: {} },
          { id: 'node-2', labels: ['Test'], properties: {} },
        ],
        relationships: [
          {
            id: 'rel-1',
            type: 'LINKS_TO',
            startNode: 'node-1',
            endNode: 'node-2',
            properties: {},
          },
        ],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const paths = await graphService.findPaths('node-1', 'node-2');

      expect(paths).toHaveLength(1);
      expect(paths[0].nodes).toHaveLength(2);
      expect(paths[0].relationships).toHaveLength(1);
    });

    it('should support maxDepth option', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.findPaths('node-1', 'node-2', { maxDepth: 10 });

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('*1..10');
    });

    it('should support limit option', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.findPaths('node-1', 'node-2', { limit: 5 });

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('LIMIT 5');
    });
  });

  // ============================================================================
  // Traversal - getNeighbors()
  // ============================================================================

  describe('getNeighbors()', () => {
    it('should get neighboring nodes at depth 1', async () => {
      const mockNodes: GraphNode[] = [
        { id: 'neighbor-1', labels: ['Test'], properties: {} },
        { id: 'neighbor-2', labels: ['Test'], properties: {} },
      ];

      const mockResponse: GraphQueryResult = {
        nodes: mockNodes,
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await graphService.getNeighbors('node-1');

      expect(result).toEqual(mockNodes);
    });

    it('should support custom depth', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.getNeighbors('node-1', 3);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('*1..3');
    });

    it('should clamp depth between 1 and 10', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.getNeighbors('node-1', 20);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('*1..10');
    });
  });

  // ============================================================================
  // Paragraph Linking (Backward Compatibility)
  // ============================================================================

  describe('createParagraphLinks()', () => {
    it('should create bidirectional links between paragraphs', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [
          {
            id: 'rel-1',
            type: 'LINKS_TO',
            startNode: 'para-1',
            endNode: 'para-2',
            properties: {},
          },
        ],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const links = await graphService.createParagraphLinks(
        ['para-1', 'para-2'],
        'user-123'
      );

      // Should create 2 relationships (bidirectional)
      expect(links.length).toBe(2);
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('should throw error for less than 2 paragraphs', async () => {
      await expect(
        graphService.createParagraphLinks(['para-1'], 'user-123')
      ).rejects.toThrow(GraphQueryError);
      await expect(
        graphService.createParagraphLinks(['para-1'], 'user-123')
      ).rejects.toThrow('At least 2 paragraphs required for linking');
    });

    it('should create all pairwise combinations', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [
          {
            id: 'rel-1',
            type: 'LINKS_TO',
            startNode: 'para-1',
            endNode: 'para-2',
            properties: {},
          },
        ],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const links = await graphService.createParagraphLinks(
        ['para-1', 'para-2', 'para-3'],
        'user-123'
      );

      // 3 paragraphs = 3 pairs * 2 (bidirectional) = 6 relationships
      expect(links.length).toBe(6);
    });
  });

  describe('getParagraphLinks()', () => {
    it('should retrieve paragraph links for a document', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [
          {
            id: 'node-1',
            labels: ['Paragraph'],
            properties: {
              sourceId: 'para-1',
              linkedIds: ['para-2', 'para-3'],
            },
          },
        ],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const linkMap = await graphService.getParagraphLinks('doc-123');

      expect(linkMap.has('para-1')).toBe(true);
      expect(linkMap.get('para-1')).toEqual(['para-2', 'para-3']);
    });
  });

  describe('removeParagraphLink()', () => {
    it('should remove bidirectional link between paragraphs', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.removeParagraphLink('para-1', 'para-2');

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.cypher).toContain('DELETE r');
    });
  });

  // ============================================================================
  // Theme Discovery
  // ============================================================================

  describe('discoverThemes()', () => {
    it('should discover theme clusters from paragraph links', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [
          {
            id: 'para-1',
            labels: ['Paragraph'],
            properties: {
              cluster: ['para-2', 'para-3', 'para-4'],
              strength: 3,
            },
          },
        ],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const themes = await graphService.discoverThemes('doc-123');

      expect(themes).toHaveLength(1);
      expect(themes[0].paragraphs).toEqual(['para-2', 'para-3', 'para-4']);
      expect(themes[0].strength).toBe(3);
    });

    it('should support custom minimum cluster size', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await graphService.discoverThemes('doc-123', 5);

      const callArgs = vi.mocked(mockClient.request).mock.calls[0][0];
      expect(callArgs.body.parameters).toHaveProperty('param1', 5);
    });
  });

  // ============================================================================
  // Graph Statistics
  // ============================================================================

  describe('getGraphStats()', () => {
    it('should retrieve graph statistics', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [
          {
            id: 'stats',
            labels: [],
            properties: {
              nodeCount: 1000,
              relationshipCount: 500,
              labels: ['Paragraph', 'Document'],
              types: ['LINKS_TO', 'REFERENCES'],
            },
          },
        ],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const stats = await graphService.getGraphStats();

      expect(stats.nodeCount).toBe(1000);
      expect(stats.relationshipCount).toBe(500);
      expect(stats.labels).toEqual(['Paragraph', 'Document']);
      expect(stats.relationshipTypes).toEqual(['LINKS_TO', 'REFERENCES']);
    });

    it('should return zero stats when no data', async () => {
      const mockResponse: GraphQueryResult = {
        nodes: [],
        relationships: [],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const stats = await graphService.getGraphStats();

      expect(stats.nodeCount).toBe(0);
      expect(stats.relationshipCount).toBe(0);
    });
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================

  describe('getGraphService() singleton', () => {
    it('should return singleton instance', () => {
      const service1 = getGraphService(mockClient);
      const service2 = getGraphService();

      expect(service1).toBe(service2);
    });

    it('should throw error when not initialized', () => {
      resetGraphService();
      expect(() => getGraphService()).toThrow(
        'GraphService must be initialized with RuvectorClient on first call'
      );
    });

    it('should allow re-initialization with new client', () => {
      const client1 = createMockClient();
      const client2 = createMockClient();

      getGraphService(client1);
      const service2 = getGraphService(client2);

      expect(service2).toBeDefined();
    });
  });

  describe('resetGraphService()', () => {
    it('should reset singleton instance', () => {
      getGraphService(mockClient);
      resetGraphService();

      expect(() => getGraphService()).toThrow();
    });
  });
});
