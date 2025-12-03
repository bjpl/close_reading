/**
 * EntityBatch - Batch Operations
 *
 * Handles bulk entity operations:
 * - Batch create with parallel processing
 * - Batch update/delete operations
 * - Error tracking and reporting
 */

import type { RuvectorClient } from '../client';
import type {
  Entity,
  EntityCreateOptions,
  EntityBatchOperation,
  EntityBatchResult,
} from '../types';
import { VectorOperationError } from '../types';
import { EntityRepository } from './EntityRepository';

export class EntityBatch {
  private readonly BATCH_SIZE = 50;
  private readonly repository: EntityRepository;

  constructor(private readonly client: RuvectorClient) {
    this.repository = new EntityRepository(client);
  }

  /**
   * Create multiple entities in parallel batches
   */
  async createMany(
    entities: Entity[],
    options: EntityCreateOptions = {}
  ): Promise<EntityBatchResult> {
    const result: EntityBatchResult = {
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < entities.length; i += this.BATCH_SIZE) {
      const batch = entities.slice(i, i + this.BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (entity) => {
          try {
            await this.repository.create(entity, options);
            result.succeeded++;
          } catch (error) {
            result.failed++;
            result.errors?.push({
              entity,
              error: this.formatError(error),
            });
          }
        })
      );
    }

    return result;
  }

  /**
   * Execute batch operations (create, update, delete)
   */
  async execute(operations: EntityBatchOperation[]): Promise<EntityBatchResult> {
    const result: EntityBatchResult = {
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    await Promise.allSettled(
      operations.map(async (op) => {
        try {
          switch (op.operation) {
            case 'create':
              if (!op.entity.type || !op.entity.name) {
                throw new Error('Entity must have type and name');
              }
              if (!op.entity.id) {
                throw new Error('Entity must have id for batch create');
              }
              await this.repository.create(op.entity as Entity);
              break;

            case 'update':
              if (!op.entity.id) {
                throw new Error('Entity must have id for update');
              }
              await this.repository.update(op.entity.id, op.entity);
              break;

            case 'delete':
              if (!op.entity.id) {
                throw new Error('Entity must have id for delete');
              }
              await this.repository.delete(op.entity.id);
              break;
          }
          result.succeeded++;
        } catch (error) {
          result.failed++;
          result.errors?.push({
            entity: op.entity,
            error: this.formatError(error),
          });
        }
      })
    );

    return result;
  }

  /**
   * Get batch size for reference
   */
  getBatchSize(): number {
    return this.BATCH_SIZE;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
