/**
 * EntityService Unit Tests
 *
 * Comprehensive test coverage for:
 * - CRUD operations (create, get, update, delete)
 * - Batch operations (createEntities, batchOperation)
 * - Search operations (searchEntities, queryEntities, findByType)
 * - Relationship management (create, get, find related)
 * - Claude integration (persistEntityNetwork, getEntityNetworkForDocument)
 * - Entity linking and deduplication
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityService } from '../../../src/services/ruvector/EntityService';
import type { RuvectorClient } from '../../../src/services/ruvector/client';
import type {
  Entity,
  EntityRelationship,
  EntitySearchResult,
  GraphNode,
  GraphRelationship,
} from '../../../src/services/ruvector/types';
import {
  EntityNotFoundError,
  VectorOperationError,
  GraphQueryError,
} from '../../../src/services/ruvector/types';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockClient = (): RuvectorClient => ({
  request: vi.fn(),
  getConfig: vi.fn(() => ({
    apiKey: 'test-key',
    baseUrl: 'https://api.ruvector.com',
  })),
} as unknown as RuvectorClient);

const createMockEntity = (id: string, overrides?: Partial<Entity>): Entity => ({
  id,
  type: 'Person',
  name: `Entity ${id}`,
  properties: { description: 'Test entity' },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

// ============================================================================
// Test Suite
// ============================================================================

describe('EntityService', () => {
  let service: EntityService;
  let mockClient: RuvectorClient;

  beforeEach(() => {
    mockClient = createMockClient();
    service = new EntityService(mockClient);
  });

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  describe('createEntity', () => {
    it('should create entity with automatic embedding generation', async () => {
      const entityData = {
        type: 'Person',
        name: 'John Doe',
        properties: { age: 30, occupation: 'Developer' },
      };

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ embedding: [0.1, 0.2, 0.3] }) // Embedding API
        .mockResolvedValueOnce({ success: true }) // Vector upsert
        .mockResolvedValueOnce({ success: true }); // Graph storage

      const entity = await service.createEntity(entityData);

      expect(entity.id).toBeDefined();
      expect(entity.type).toBe('Person');
      expect(entity.name).toBe('John Doe');
      expect(entity.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(entity.created_at).toBeDefined();
      expect(entity.updated_at).toBeDefined();
      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });

    it('should skip embedding generation when disabled', async () => {
      const entityData = {
        type: 'Organization',
        name: 'Test Corp',
        properties: {},
      };

      vi.mocked(mockClient.request).mockResolvedValue({ success: true });

      const entity = await service.createEntity(entityData, {
        generateEmbedding: false,
      });

      expect(entity.embedding).toBeUndefined();
      expect(mockClient.request).toHaveBeenCalledTimes(1); // Only graph storage
    });

    it('should include custom metadata in properties', async () => {
      const entityData = {
        type: 'Concept',
        name: 'Innovation',
        properties: { domain: 'Technology' },
      };

      vi.mocked(mockClient.request).mockResolvedValue({ success: true });

      const entity = await service.createEntity(entityData, {
        generateEmbedding: false,
        metadata: { source: 'test', confidence: 0.95 },
      });

      expect(entity.properties.domain).toBe('Technology');
      expect(entity.properties.source).toBe('test');
      expect(entity.properties.confidence).toBe(0.95);
    });

    it('should throw VectorOperationError on failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('API error'));

      await expect(
        service.createEntity({ type: 'Test', name: 'Fail', properties: {} })
      ).rejects.toThrow(VectorOperationError);
    });
  });

  describe('getEntity', () => {
    it('should retrieve entity by ID from graph database', async () => {
      const graphNode: GraphNode = {
        id: 'entity-1',
        labels: ['Entity'],
        properties: {
          id: 'entity-1',
          type: 'Person',
          name: 'Alice',
          properties: JSON.stringify({ role: 'Protagonist' }),
          created_at: '2025-01-01T00:00:00Z',
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue({ data: [graphNode] });

      const entity = await service.getEntity('entity-1');

      expect(entity).not.toBeNull();
      expect(entity?.id).toBe('entity-1');
      expect(entity?.name).toBe('Alice');
      expect(entity?.properties.role).toBe('Protagonist');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/graph/query',
        body: expect.objectContaining({
          query: expect.stringContaining('MATCH'),
          parameters: { id: 'entity-1' },
        }),
      });
    });

    it('should return null for non-existent entity', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({ data: [] });

      const entity = await service.getEntity('nonexistent');

      expect(entity).toBeNull();
    });

    it('should throw GraphQueryError on database error', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('DB error'));

      await expect(service.getEntity('entity-1')).rejects.toThrow(GraphQueryError);
    });
  });

  describe('updateEntity', () => {
    it('should update entity properties', async () => {
      const existing = createMockEntity('entity-1', {
        properties: { status: 'active' },
      });

      const graphNode: GraphNode = {
        id: 'entity-1',
        labels: ['Entity'],
        properties: {
          id: 'entity-1',
          type: existing.type,
          name: existing.name,
          properties: JSON.stringify(existing.properties),
        },
      };

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: [graphNode] }) // getEntity
        .mockResolvedValueOnce({ success: true }); // updateEntityGraph

      const updated = await service.updateEntity('entity-1', {
        properties: { status: 'inactive', newField: 'value' },
      });

      expect(updated.properties.status).toBe('inactive');
      expect(updated.properties.newField).toBe('value');
      expect(updated.updated_at).not.toBe(existing.updated_at);
    });

    it('should merge properties when mergeProperties is true', async () => {
      const existing = createMockEntity('entity-1', {
        properties: { field1: 'value1', field2: 'value2' },
      });

      const graphNode: GraphNode = {
        id: 'entity-1',
        labels: ['Entity'],
        properties: {
          id: 'entity-1',
          type: existing.type,
          name: existing.name,
          properties: JSON.stringify(existing.properties),
        },
      };

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: [graphNode] })
        .mockResolvedValueOnce({ success: true });

      const updated = await service.updateEntity(
        'entity-1',
        { properties: { field2: 'updated', field3: 'new' } },
        { mergeProperties: true }
      );

      expect(updated.properties.field1).toBe('value1');
      expect(updated.properties.field2).toBe('updated');
      expect(updated.properties.field3).toBe('new');
    });

    it('should regenerate embedding when requested', async () => {
      const existing = createMockEntity('entity-1');
      const graphNode: GraphNode = {
        id: 'entity-1',
        labels: ['Entity'],
        properties: {
          id: 'entity-1',
          type: existing.type,
          name: existing.name,
          properties: JSON.stringify(existing.properties),
        },
      };

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: [graphNode] })
        .mockResolvedValueOnce({ embedding: [0.5, 0.6, 0.7] })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const updated = await service.updateEntity(
        'entity-1',
        { name: 'New Name' },
        { regenerateEmbedding: true }
      );

      expect(updated.embedding).toEqual([0.5, 0.6, 0.7]);
    });

    it('should throw EntityNotFoundError for non-existent entity', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({ data: [] });

      await expect(
        service.updateEntity('nonexistent', { name: 'New' })
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('deleteEntity', () => {
    it('should delete entity from both vector and graph databases', async () => {
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ success: true }) // Vector delete
        .mockResolvedValueOnce({ success: true }); // Graph delete

      await service.deleteEntity('entity-1');

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/v1/vector/delete',
        body: expect.objectContaining({
          namespace: 'entities',
          filter: { entityId: 'entity-1' },
        }),
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/graph/query',
        body: expect.objectContaining({
          query: expect.stringContaining('DETACH DELETE'),
        }),
      });
    });

    it('should throw GraphQueryError on deletion failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteEntity('entity-1')).rejects.toThrow(
        GraphQueryError
      );
    });
  });

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  describe('createEntities', () => {
    it('should create multiple entities in parallel batches', async () => {
      const entities = Array.from({ length: 5 }, (_, i) => ({
        type: 'Person',
        name: `Person ${i}`,
        properties: { index: i },
      }));

      vi.mocked(mockClient.request).mockResolvedValue({ success: true });

      const result = await service.createEntities(entities, {
        generateEmbedding: false,
      });

      expect(result.succeeded).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle partial failures gracefully', async () => {
      const entities = [
        { type: 'A', name: 'Success1', properties: {} },
        { type: 'B', name: 'Fail', properties: {} },
        { type: 'C', name: 'Success2', properties: {} },
      ];

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce({ success: true });

      const result = await service.createEntities(entities, {
        generateEmbedding: false,
      });

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('batchOperation', () => {
    it('should execute mixed batch operations', async () => {
      const operations = [
        { operation: 'create' as const, entity: { type: 'A', name: 'New' } },
        {
          operation: 'update' as const,
          entity: { id: 'entity-1', name: 'Updated' },
        },
        { operation: 'delete' as const, entity: { id: 'entity-2' } },
      ];

      const graphNode: GraphNode = {
        id: 'entity-1',
        labels: ['Entity'],
        properties: {
          id: 'entity-1',
          type: 'Test',
          name: 'Old',
          properties: JSON.stringify({}),
        },
      };

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ success: true }) // create
        .mockResolvedValueOnce({ data: [graphNode] }) // update: getEntity
        .mockResolvedValueOnce({ success: true }) // update: updateEntityGraph
        .mockResolvedValueOnce({ success: true }) // delete: vector
        .mockResolvedValueOnce({ success: true }); // delete: graph

      const result = await service.batchOperation(operations);

      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should validate entity data for each operation type', async () => {
      const operations = [
        { operation: 'create' as const, entity: { name: 'Missing type' } },
        { operation: 'update' as const, entity: { name: 'Missing id' } },
        { operation: 'delete' as const, entity: { name: 'Missing id' } },
      ];

      const result = await service.batchOperation(operations);

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.errors).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Search Operations
  // ==========================================================================

  describe('searchEntities', () => {
    it('should perform semantic search using embeddings', async () => {
      const vectorResults = [
        { id: 'entity-1', score: 0.95, distance: 0.05 },
        { id: 'entity-2', score: 0.85, distance: 0.15 },
      ];

      const graphNodes: GraphNode[] = [
        {
          id: 'entity-1',
          labels: ['Entity'],
          properties: {
            id: 'entity-1',
            type: 'Person',
            name: 'Alice',
            properties: '{}',
          },
        },
        {
          id: 'entity-2',
          labels: ['Entity'],
          properties: {
            id: 'entity-2',
            type: 'Person',
            name: 'Bob',
            properties: '{}',
          },
        },
      ];

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ embedding: [0.1, 0.2, 0.3] }) // Query embedding
        .mockResolvedValueOnce({ results: vectorResults }) // Vector search
        .mockResolvedValueOnce({ data: graphNodes }); // Hydrate entities

      const results = await service.searchEntities('test query', {
        topK: 2,
        semanticSearch: true,
      });

      expect(results).toHaveLength(2);
      expect(results[0].entity.name).toBe('Alice');
      expect(results[0].score).toBe(0.95);
      expect(results[1].entity.name).toBe('Bob');
    });

    it('should filter by entity type', async () => {
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ embedding: [0.1, 0.2] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ data: [] });

      await service.searchEntities('query', {
        type: 'Organization',
        semanticSearch: true,
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/vector/search',
        body: expect.objectContaining({
          filter: { type: 'Organization' },
        }),
      });
    });

    it('should fallback to text search when semanticSearch is false', async () => {
      const graphNodes: GraphNode[] = [
        {
          id: 'entity-1',
          labels: ['Entity'],
          properties: {
            id: 'entity-1',
            type: 'Concept',
            name: 'Test Concept',
            properties: '{}',
          },
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({ data: graphNodes });

      const results = await service.searchEntities('test', {
        semanticSearch: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.5); // Arbitrary text search score
    });

    it('should throw VectorOperationError on search failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Search failed'));

      await expect(service.searchEntities('query')).rejects.toThrow(
        VectorOperationError
      );
    });
  });

  describe('queryEntities', () => {
    it('should query entities with filters and pagination', async () => {
      const graphNodes: GraphNode[] = [
        {
          id: 'entity-1',
          labels: ['Entity'],
          properties: { id: 'entity-1', type: 'Person', name: 'A', properties: '{}' },
        },
      ];

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: graphNodes }) // Query
        .mockResolvedValueOnce({ count: 10 }); // Count

      const result = await service.queryEntities({
        type: 'Person',
        filters: { status: 'active' },
        limit: 5,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ count: 25 });

      const result = await service.queryEntities({ limit: 10, offset: 20 });

      expect(result.page).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should throw GraphQueryError on query failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Query error'));

      await expect(service.queryEntities()).rejects.toThrow(GraphQueryError);
    });
  });

  describe('findByType', () => {
    it('should find all entities of a specific type', async () => {
      const graphNodes: GraphNode[] = [
        {
          id: 'entity-1',
          labels: ['Entity'],
          properties: {
            id: 'entity-1',
            type: 'Location',
            name: 'Paris',
            properties: '{}',
          },
        },
      ];

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: graphNodes })
        .mockResolvedValueOnce({ count: 1 });

      const entities = await service.findByType('Location');

      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('Location');
    });
  });

  // ==========================================================================
  // Relationship Management
  // ==========================================================================

  describe('createRelationship', () => {
    it('should create relationship between entities', async () => {
      const rel = {
        sourceEntityId: 'entity-1',
        targetEntityId: 'entity-2',
        type: 'KNOWS',
        strength: 0.8,
        properties: { since: '2020' },
      };

      vi.mocked(mockClient.request).mockResolvedValue({ success: true });

      const relationship = await service.createRelationship(rel);

      expect(relationship.id).toBeDefined();
      expect(relationship.type).toBe('KNOWS');
      expect(relationship.strength).toBe(0.8);
      expect(relationship.created_at).toBeDefined();
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/graph/query',
        body: expect.objectContaining({
          query: expect.stringContaining('CREATE'),
        }),
      });
    });

    it('should sanitize relationship type for Cypher', async () => {
      const rel = {
        sourceEntityId: 'e1',
        targetEntityId: 'e2',
        type: 'works-at',
      };

      vi.mocked(mockClient.request).mockResolvedValue({ success: true });

      await service.createRelationship(rel);

      const query = (mockClient.request as any).mock.calls[0][0].body.query;
      expect(query).toContain('WORKS_AT');
    });

    it('should throw GraphQueryError on creation failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Failed'));

      await expect(
        service.createRelationship({
          sourceEntityId: 'e1',
          targetEntityId: 'e2',
          type: 'TEST',
        })
      ).rejects.toThrow(GraphQueryError);
    });
  });

  describe('getRelationships', () => {
    it('should retrieve all relationships for an entity', async () => {
      const graphRels: GraphRelationship[] = [
        {
          id: 'rel-1',
          type: 'KNOWS',
          startNode: 'entity-1',
          endNode: 'entity-2',
          properties: { id: 'rel-1', strength: 0.9, properties: '{}' },
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({ data: graphRels });

      const rels = await service.getRelationships('entity-1');

      expect(rels).toHaveLength(1);
      expect(rels[0].type).toBe('KNOWS');
      expect(rels[0].sourceEntityId).toBe('entity-1');
      expect(rels[0].targetEntityId).toBe('entity-2');
    });

    it('should throw GraphQueryError on failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Failed'));

      await expect(service.getRelationships('entity-1')).rejects.toThrow(
        GraphQueryError
      );
    });
  });

  describe('findRelatedEntities', () => {
    it('should find all entities related to given entity', async () => {
      const graphNodes: GraphNode[] = [
        {
          id: 'entity-2',
          labels: ['Entity'],
          properties: {
            id: 'entity-2',
            type: 'Person',
            name: 'Related Entity',
            properties: '{}',
          },
        },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({ data: graphNodes });

      const related = await service.findRelatedEntities('entity-1');

      expect(related).toHaveLength(1);
      expect(related[0].name).toBe('Related Entity');
    });

    it('should filter by relationship types', async () => {
      vi.mocked(mockClient.request).mockResolvedValue({ data: [] });

      await service.findRelatedEntities('entity-1', ['KNOWS', 'WORKS_WITH']);

      const query = (mockClient.request as any).mock.calls[0][0].body.query;
      expect(query).toContain(':KNOWS|:WORKS_WITH');
    });

    it('should throw GraphQueryError on failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Failed'));

      await expect(service.findRelatedEntities('entity-1')).rejects.toThrow(
        GraphQueryError
      );
    });
  });

  // ==========================================================================
  // Claude Integration
  // ==========================================================================

  describe('persistEntityNetwork', () => {
    it('should persist Claude EntityNetwork with entity linking', async () => {
      const network = {
        entities: [
          {
            name: 'Alice',
            type: 'Person',
            description: 'Main character',
            firstMention: 'Chapter 1',
            significance: 5,
          },
        ],
        relationships: [
          {
            entity1: 'Alice',
            entity2: 'Bob',
            type: 'KNOWS',
            description: 'Friends',
            strength: 0.9,
          },
        ],
        powerDynamics: [],
        socialStructure: { centrality: {}, clusters: [] },
      };

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ embedding: [0.1] }) // Alice embedding
        .mockResolvedValueOnce({ results: [] }) // No similar entities
        .mockResolvedValueOnce({ success: true }) // Vector upsert
        .mockResolvedValueOnce({ success: true }) // Graph create
        .mockResolvedValueOnce({ embedding: [0.2] }) // Bob embedding
        .mockResolvedValueOnce({ results: [] }) // No similar entities
        .mockResolvedValueOnce({ success: true }) // Vector upsert
        .mockResolvedValueOnce({ success: true }) // Graph create
        .mockResolvedValueOnce({ success: true }) // Relationship
        .mockResolvedValueOnce({ embedding: [0.3] }) // NetworkMetadata embedding
        .mockResolvedValueOnce({ success: true }) // NetworkMetadata vector
        .mockResolvedValueOnce({ success: true }); // NetworkMetadata graph

      await service.persistEntityNetwork(network, 'doc-1');

      expect(mockClient.request).toHaveBeenCalled();
    });

    it('should merge entities when similar entities exist', async () => {
      const network = {
        entities: [
          {
            name: 'Alice Smith',
            type: 'Person',
            description: 'A character',
            firstMention: 'Chapter 1',
            significance: 3,
          },
        ],
        relationships: [],
        powerDynamics: [],
        socialStructure: { centrality: {}, clusters: [] },
      };

      const existingEntity = createMockEntity('existing-1', {
        name: 'Alice Smith',
        type: 'Person',
      });

      const graphNode: GraphNode = {
        id: 'existing-1',
        labels: ['Entity'],
        properties: {
          id: 'existing-1',
          type: 'Person',
          name: 'Alice Smith',
          properties: JSON.stringify({}),
        },
      };

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ embedding: [0.1] }) // Embedding
        .mockResolvedValueOnce({
          // Search for similar entities
          results: [{ id: 'existing-1', score: 0.9, distance: 0.1 }],
        })
        .mockResolvedValueOnce({ data: [graphNode] }) // Get entities by IDs
        .mockResolvedValueOnce({ data: [graphNode] }) // getEntity for merge
        .mockResolvedValueOnce({ success: true }); // updateEntityGraph

      await service.persistEntityNetwork(network, 'doc-2');

      // Should update existing entity, not create new one
      const updateCall = (mockClient.request as any).mock.calls.find(
        (call: any) => call[0].body?.query?.includes('SET e.')
      );
      expect(updateCall).toBeDefined();
    });
  });

  describe('getEntityNetworkForDocument', () => {
    it('should retrieve complete entity network for a document', async () => {
      const entities: GraphNode[] = [
        {
          id: 'entity-1',
          labels: ['Entity'],
          properties: {
            id: 'entity-1',
            type: 'Person',
            name: 'Alice',
            properties: JSON.stringify({ description: 'Main character' }),
            documentId: 'doc-1',
          },
        },
      ];

      const relationships: GraphRelationship[] = [
        {
          id: 'rel-1',
          type: 'KNOWS',
          startNode: 'entity-1',
          endNode: 'entity-2',
          properties: { id: 'rel-1', strength: 0.8, properties: '{}' },
        },
      ];

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ data: entities, count: 1 }) // Query entities
        .mockResolvedValueOnce({ count: 1 }) // Count
        .mockResolvedValueOnce({ data: relationships }) // Get relationships
        .mockResolvedValueOnce({ data: [], count: 0 }) // Network metadata query
        .mockResolvedValueOnce({ count: 0 }); // Network metadata count

      const network = await service.getEntityNetworkForDocument('doc-1');

      expect(network.entities).toHaveLength(1);
      expect(network.entities[0].name).toBe('Alice');
      expect(network.relationships).toHaveLength(1);
    });

    it('should throw GraphQueryError on retrieval failure', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Failed'));

      await expect(service.getEntityNetworkForDocument('doc-1')).rejects.toThrow(
        GraphQueryError
      );
    });
  });
});
