/**
 * EntityEmbeddings - Embedding Generation and Storage
 *
 * Handles vector operations for entities:
 * - Generate embeddings from entity data
 * - Store embeddings in vector database
 * - Delete embeddings
 */

import type { RuvectorClient } from '../client';
import type { Entity } from '../types';
import { VectorOperationError } from '../types';

interface EntityWithEmbedding extends Entity {
  embedding: number[];
}

export class EntityEmbeddings {
  private readonly VECTOR_NAMESPACE = 'entities';

  constructor(private readonly client: RuvectorClient) {}

  /**
   * Generate embedding for an entity
   */
  async generateForEntity(entity: Omit<Entity, 'id'>): Promise<number[]> {
    try {
      const text = [
        entity.name,
        entity.type,
        JSON.stringify(entity.properties),
      ].join(' ');

      return this.generateFromText(text);
    } catch (error) {
      throw new VectorOperationError(
        `Failed to generate entity embedding: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Generate embedding from text
   */
  async generateFromText(text: string): Promise<number[]> {
    try {
      const result = await this.client.request<{ embedding: number[] }>({
        method: 'POST',
        path: '/v1/embeddings',
        body: { text },
      });

      return result.embedding;
    } catch (error) {
      throw new VectorOperationError(
        `Failed to generate text embedding: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Store entity embedding in vector database
   */
  async store(entity: EntityWithEmbedding): Promise<void> {
    try {
      await this.client.request({
        method: 'POST',
        path: '/v1/vector/upsert',
        body: {
          vectors: [
            {
              id: entity.id,
              vector: entity.embedding,
              metadata: {
                entityId: entity.id,
                type: entity.type,
                name: entity.name,
                documentId: entity.documentId,
              },
            },
          ],
          namespace: this.VECTOR_NAMESPACE,
        },
      });
    } catch (error) {
      throw new VectorOperationError(
        `Failed to store entity vector: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Delete entity embedding from vector database
   */
  async delete(entityId: string): Promise<void> {
    try {
      await this.client.request({
        method: 'DELETE',
        path: '/v1/vector/delete',
        body: {
          namespace: this.VECTOR_NAMESPACE,
          filter: { entityId },
        },
      });
    } catch (error) {
      throw new VectorOperationError(
        `Failed to delete entity vector: ${this.formatError(error)}`,
        error
      );
    }
  }

  /**
   * Check if entity has stored embedding
   */
  getNamespace(): string {
    return this.VECTOR_NAMESPACE;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
