/**
 * Ruvector SDK Client Singleton
 *
 * Centralized client manager for all Ruvector services with:
 * - Dependency injection for testability
 * - Circuit breaker pattern for resilience
 * - Rate limiting and retry logic
 * - Connection pooling and health checks
 * - Caching layer for performance
 */

import type {
  RuvectorClientConfig,
  ServiceHealth,
  ServiceMetrics,
  CacheEntry,
} from './types';

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private successThreshold = 3;
  private successCount = 0;

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker open - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
      this.state = 'closed';
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.successCount = 0;
    this.state = 'closed';
  }
}

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs = 60000
  ) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.requests.push(now);
  }

  getUsage(): { current: number; max: number; resetIn: number } {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
    const resetIn = this.requests.length > 0
      ? this.windowMs - (now - this.requests[0])
      : 0;

    return {
      current: this.requests.length,
      max: this.maxRequests,
      resetIn,
    };
  }
}

// ============================================================================
// Cache Manager Implementation
// ============================================================================

class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTtl = 300000) {
    this.startCleanup();
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: ttl || this.defaultTtl,
      createdAt: Date.now(),
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    // Simplified stats - would need hit/miss tracking for accurate rate
    return {
      size: this.cache.size,
      hitRate: 0,
    };
  }
}

// ============================================================================
// HTTP Client Wrapper
// ============================================================================

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
}

class HttpClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private timeout = 30000,
    private localMode = false
  ) {}

  async request<T>(options: RequestOptions): Promise<T> {
    const url = new URL(options.path, this.baseUrl);

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.timeout
    );

    // Build headers - skip auth for local mode
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Only add authorization header if not in local mode
    if (!this.localMode && this.apiKey && this.apiKey !== 'local') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url.toString(), {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}

// ============================================================================
// Main Ruvector Client
// ============================================================================

export class RuvectorClient {
  private static instance: RuvectorClient | null = null;
  private config: Required<RuvectorClientConfig>;
  private httpClient: HttpClient;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private cache: CacheManager;
  private metrics: ServiceMetrics;
  private startTime: number;
  private localMode: boolean;

  private constructor(config: RuvectorClientConfig) {
    // Ruvector is self-hosted - local mode is default
    this.localMode = !config.apiKey || config.baseUrl?.includes('localhost') || config.baseUrl?.includes('127.0.0.1');

    this.config = {
      apiKey: config.apiKey || 'local', // Not required for local instances
      baseUrl: config.baseUrl || 'http://localhost:8080', // Local Ruvector default
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      rateLimitPerMinute: config.rateLimitPerMinute || 60,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtl: config.cacheTtl || 300000,
      services: {
        vector: config.services?.vector ?? true,
        graph: config.services?.graph ?? true,
        rag: config.services?.rag ?? true,
        entity: config.services?.entity ?? true,
        cluster: config.services?.cluster ?? true,
      },
    };

    this.httpClient = new HttpClient(
      this.config.baseUrl,
      this.config.apiKey,
      this.config.timeout,
      this.localMode
    );

    this.circuitBreaker = new CircuitBreaker();
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
    this.cache = new CacheManager(this.config.cacheTtl);

    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      cacheHitRate: 0,
      activeConnections: 0,
    };

    this.startTime = Date.now();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: RuvectorClientConfig): RuvectorClient {
    if (!RuvectorClient.instance && !config) {
      throw new Error('RuvectorClient must be initialized with config on first call');
    }

    if (config) {
      RuvectorClient.instance = new RuvectorClient(config);
    }

    return RuvectorClient.instance!;
  }

  /**
   * Reset singleton (mainly for testing)
   */
  static reset(): void {
    if (RuvectorClient.instance) {
      RuvectorClient.instance.destroy();
      RuvectorClient.instance = null;
    }
  }

  /**
   * Execute HTTP request with retry, circuit breaker, and rate limiting
   */
  async request<T>(options: RequestOptions): Promise<T> {
    const cacheKey = this.getCacheKey(options);

    // Check cache for GET requests
    if (options.method === 'GET' && this.config.cacheEnabled) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    await this.rateLimiter.waitForSlot();

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const result = await this.circuitBreaker.execute(() =>
          this.httpClient.request<T>(options)
        );

        // Update metrics
        const duration = Date.now() - startTime;
        this.updateMetrics(duration, false);

        // Cache successful GET requests
        if (options.method === 'GET' && this.config.cacheEnabled) {
          this.cache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        this.metrics.errorCount++;

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }

        // Exponential backoff
        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const duration = Date.now() - startTime;
    this.updateMetrics(duration, true);

    throw lastError || new Error('Max retry attempts exceeded');
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<ServiceHealth> {
    const checks = await Promise.allSettled([
      this.config.services.vector ? this.request({ method: 'GET', path: '/v1/vector/health' }) : Promise.resolve(),
      this.config.services.graph ? this.request({ method: 'GET', path: '/v1/graph/health' }) : Promise.resolve(),
      this.config.services.rag ? this.request({ method: 'GET', path: '/v1/rag/health' }) : Promise.resolve(),
      this.config.services.entity ? this.request({ method: 'GET', path: '/v1/entity/health' }) : Promise.resolve(),
      this.config.services.cluster ? this.request({ method: 'GET', path: '/v1/cluster/health' }) : Promise.resolve(),
    ]);

    const serviceKeys = ['vector', 'graph', 'rag', 'entity', 'cluster'] as const;
    const services = Object.fromEntries(
      serviceKeys.map((key, index) => [
        key,
        checks[index].status === 'fulfilled'
      ])
    ) as ServiceHealth['services'];

    const healthyCount = Object.values(services).filter(Boolean).length;
    const totalEnabled = Object.entries(this.config.services)
      .filter(([_, enabled]) => enabled)
      .length;

    return {
      status: healthyCount === totalEnabled
        ? 'healthy'
        : healthyCount > 0
        ? 'degraded'
        : 'unhealthy',
      services,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get service metrics
   */
  getMetrics(): ServiceMetrics {
    const cacheStats = this.cache.getStats();
    const rateLimitUsage = this.rateLimiter.getUsage();

    return {
      ...this.metrics,
      cacheHitRate: cacheStats.hitRate,
      activeConnections: rateLimitUsage.current,
    };
  }

  /**
   * Get client configuration
   */
  getConfig(): Readonly<Required<RuvectorClientConfig>> {
    return { ...this.config };
  }

  /**
   * Update client configuration
   */
  updateConfig(updates: Partial<RuvectorClientConfig>): void {
    Object.assign(this.config, updates);

    if (updates.apiKey || updates.baseUrl) {
      this.httpClient = new HttpClient(
        this.config.baseUrl,
        this.config.apiKey,
        this.config.timeout
      );
    }

    if (updates.rateLimitPerMinute) {
      this.rateLimiter = new RateLimiter(updates.rateLimitPerMinute);
    }

    if (updates.cacheTtl) {
      this.cache = new CacheManager(updates.cacheTtl);
    }
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
    } else {
      // Pattern-based cache clearing would go here
      this.cache.clear();
    }
  }

  /**
   * Check if running in local mode (no API key required)
   */
  isLocalMode(): boolean {
    return this.localMode;
  }

  /**
   * Validate API key format (only relevant for remote instances)
   * Returns true for local mode since no API key is needed
   */
  validateApiKey(): boolean {
    if (this.localMode) return true;
    return /^rv_[a-zA-Z0-9]{32,}$/.test(this.config.apiKey);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cache.destroy();
    this.circuitBreaker.reset();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getCacheKey(options: RequestOptions): string {
    const parts = [
      options.method,
      options.path,
      JSON.stringify(options.params || {}),
    ];
    return parts.join(':');
  }

  private updateMetrics(duration: number, _isError: boolean): void {
    this.metrics.requestCount++;

    // Update average response time using exponential moving average
    const alpha = 0.2; // Smoothing factor
    this.metrics.avgResponseTime =
      this.metrics.avgResponseTime * (1 - alpha) + duration * alpha;
  }
}

// ============================================================================
// Export singleton accessor
// ============================================================================

export function getRuvectorClient(config?: RuvectorClientConfig): RuvectorClient {
  return RuvectorClient.getInstance(config);
}

export function resetRuvectorClient(): void {
  RuvectorClient.reset();
}
