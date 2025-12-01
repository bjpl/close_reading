# GOAP Plan: Ruvector Integration

**Swarm ID:** `swarm_1764621807653_p2cylzydm`
**Created:** 2025-12-01
**Planner:** Goal-Oriented Action Planner (GOAP)

## Mission
Create an optimal action sequence for implementing all 5 Ruvector services using SPARC methodology.

## Goal State
- ✅ VectorService fully operational, replacing similarity.ts
- ✅ GraphService fully operational, replacing paragraphLinks.ts
- ✅ RAGService enhancing all 8 ClaudeService features
- ✅ EntityService persisting extracted entities to graph
- ✅ ClusterService providing GNN-powered theme discovery
- ✅ All services tested with >80% coverage
- ✅ Existing components updated to use new services

## Current State
- Empty `/src/services/ruvector/` directory created
- Existing `similarity.ts` with cosine similarity functions
- Existing `ClaudeService` with 8 AI features
- Existing `paragraphLinks.ts` with Supabase operations

---

## Action Sequence (20 Actions, 69 Hours Estimated)

### Phase 1: Foundation (4 hours) - Parallel Execution

#### **A1: Create VectorService Foundation**
- **Preconditions:** ruvector directory exists, similarity.ts analyzed
- **Effects:**
  - VectorService.ts created with interface
  - Vector types defined
  - Cosine similarity migrated
  - Distance metrics implemented
- **Estimated Effort:** 3 hours
- **Parallelizable With:** A2, A3
- **Rollback:** Delete VectorService.ts, restore similarity.ts usage
- **Validation:** Unit tests for vector operations pass
- **Agent:** `coder`

#### **A2: Create GraphService Foundation**
- **Preconditions:** ruvector directory exists, paragraphLinks.ts analyzed
- **Effects:**
  - GraphService.ts created with interface
  - Graph types defined
  - Node/edge CRUD operations
  - Path finding algorithms
  - Community detection stub
- **Estimated Effort:** 4 hours
- **Parallelizable With:** A1, A3
- **Rollback:** Delete GraphService.ts, restore paragraphLinks.ts usage
- **Validation:** Unit tests for graph operations pass
- **Agent:** `coder`

#### **A3: Create Type Definitions**
- **Preconditions:** ruvector directory exists
- **Effects:**
  - types.ts created with all interfaces
  - Vector, Graph, RAG, Entity, Cluster types
  - Shared interfaces across services
- **Estimated Effort:** 2 hours
- **Parallelizable With:** A1, A2
- **Rollback:** Delete types.ts
- **Validation:** TypeScript compilation succeeds
- **Agent:** `coder`

---

### Phase 2: Advanced Features (4 hours) - Parallel Execution

#### **A4: Implement VectorService Advanced Features**
- **Preconditions:** A1 completed, A3 completed
- **Effects:**
  - Batch vector operations
  - Vector normalization
  - Similarity caching
  - Performance optimization
- **Estimated Effort:** 3 hours
- **Parallelizable With:** A5
- **Rollback:** Revert to basic VectorService implementation
- **Dependencies:** A1, A3
- **Validation:** Performance benchmarks meet targets
- **Agent:** `coder`

#### **A5: Implement GraphService Advanced Features**
- **Preconditions:** A2 completed, A3 completed
- **Effects:**
  - Centrality calculations
  - Shortest path algorithms
  - Subgraph extraction
  - Graph metrics
- **Estimated Effort:** 4 hours
- **Parallelizable With:** A4
- **Rollback:** Revert to basic GraphService implementation
- **Dependencies:** A2, A3
- **Validation:** Graph algorithm tests pass
- **Agent:** `coder`

---

### Phase 3: Service Layer (9 hours) - Sequential + Parallel

#### **A6: Create RAGService**
- **Preconditions:** A4 completed, ClaudeService interface analyzed
- **Effects:**
  - RAGService.ts created
  - Vector-enhanced context retrieval
  - Relevance scoring
  - Context window optimization
  - Integration with ClaudeService
- **Estimated Effort:** 5 hours
- **Parallelizable With:** None (critical path)
- **Rollback:** Delete RAGService.ts, ClaudeService uses raw context
- **Dependencies:** A4
- **Validation:** RAG retrieval improves answer quality metrics
- **Agent:** `coder`

#### **A7: Create EntityService**
- **Preconditions:** A5 completed, ClaudeService.extractRelationships analyzed
- **Effects:**
  - EntityService.ts created
  - Entity extraction integration
  - Graph persistence for entities
  - Entity resolution/deduplication
  - Relationship strength calculation
- **Estimated Effort:** 4 hours
- **Parallelizable With:** A8
- **Rollback:** Delete EntityService.ts, entities not persisted
- **Dependencies:** A5
- **Validation:** Entity graph correctly reflects ClaudeService extractions
- **Agent:** `coder`

#### **A8: Create ClusterService Foundation**
- **Preconditions:** A4 completed, A5 completed
- **Effects:**
  - ClusterService.ts created
  - K-means clustering
  - DBSCAN implementation
  - Hierarchical clustering
  - Cluster quality metrics
- **Estimated Effort:** 5 hours
- **Parallelizable With:** A7
- **Rollback:** Delete ClusterService.ts, use basic similarity clustering
- **Dependencies:** A4, A5
- **Validation:** Clustering produces coherent theme groups
- **Agent:** `coder`

---

### Phase 4: GNN Implementation (6 hours) - Critical Path

#### **A9: Implement GNN Theme Discovery**
- **Preconditions:** A8 completed, GraphService supports message passing
- **Effects:**
  - GNN layer implementation
  - Theme propagation algorithm
  - Node feature aggregation
  - Theme coherence scoring
- **Estimated Effort:** 6 hours
- **Parallelizable With:** None (critical path)
- **Rollback:** Revert to non-GNN clustering
- **Dependencies:** A8
- **Validation:** GNN themes outperform simple clustering
- **Agent:** `ml-developer`
- **⚠️ RISK:** High complexity, may require iteration

---

### Phase 5: Testing (4 hours) - Parallel Execution

#### **A10: Write VectorService Tests**
- **Preconditions:** A4 completed
- **Effects:** VectorService.test.ts with >80% coverage
- **Estimated Effort:** 3 hours
- **Parallelizable With:** A11, A12, A13, A14
- **Agent:** `tester`

#### **A11: Write GraphService Tests**
- **Preconditions:** A5 completed
- **Effects:** GraphService.test.ts with >80% coverage
- **Estimated Effort:** 4 hours
- **Parallelizable With:** A10, A12, A13, A14
- **Agent:** `tester`

#### **A12: Write RAGService Tests**
- **Preconditions:** A6 completed
- **Effects:** RAGService.test.ts with >80% coverage
- **Estimated Effort:** 3 hours
- **Parallelizable With:** A10, A11, A13, A14
- **Agent:** `tester`

#### **A13: Write EntityService Tests**
- **Preconditions:** A7 completed
- **Effects:** EntityService.test.ts with >80% coverage
- **Estimated Effort:** 3 hours
- **Parallelizable With:** A10, A11, A12, A14
- **Agent:** `tester`

#### **A14: Write ClusterService Tests**
- **Preconditions:** A9 completed
- **Effects:** ClusterService.test.ts with >80% coverage
- **Estimated Effort:** 4 hours
- **Parallelizable With:** A10, A11, A12, A13
- **Agent:** `tester`

---

### Phase 6: Integration (4 hours) - Parallel Execution

#### **A15: Update ClaudeService Integration**
- **Preconditions:** A6, A7, A9 completed, all tests pass
- **Effects:**
  - ClaudeService uses RAGService for context
  - extractRelationships persists to EntityService
  - extractThemes uses ClusterService
  - Backward compatibility maintained
- **Estimated Effort:** 4 hours
- **Parallelizable With:** A16, A17
- **Rollback:** Revert ClaudeService to original implementation
- **Dependencies:** A6, A7, A9
- **Validation:** Existing ClaudeService tests still pass
- **Agent:** `coder`
- **⚠️ RISK:** Backward compatibility critical

#### **A16: Migrate similarity.ts Consumers**
- **Preconditions:** A4 completed, all VectorService tests pass
- **Effects:**
  - All imports changed from similarity.ts to VectorService
  - Existing functionality preserved
  - similarity.ts marked deprecated
- **Estimated Effort:** 2 hours
- **Parallelizable With:** A15, A17
- **Rollback:** Revert imports to similarity.ts
- **Agent:** `coder`

#### **A17: Migrate paragraphLinks.ts Consumers**
- **Preconditions:** A5 completed, all GraphService tests pass
- **Effects:**
  - All imports changed from paragraphLinks.ts to GraphService
  - Enhanced graph features available
  - paragraphLinks.ts marked deprecated
- **Estimated Effort:** 2 hours
- **Parallelizable With:** A15, A16
- **Rollback:** Revert imports to paragraphLinks.ts
- **Agent:** `coder`

---

### Phase 7: Documentation & Testing (6 hours) - Sequential

#### **A18: Create Service Index and Documentation**
- **Preconditions:** All services implemented, all tests passing
- **Effects:**
  - index.ts exports all services
  - README.md in ruvector directory
  - API documentation
  - Migration guide
- **Estimated Effort:** 2 hours
- **Parallelizable With:** None
- **Dependencies:** A15, A16, A17
- **Validation:** Documentation accurately reflects implementation
- **Agent:** `api-docs`

#### **A19: Integration Testing**
- **Preconditions:** All services migrated, all unit tests passing
- **Effects:**
  - End-to-end tests for full workflow
  - Performance benchmarks
  - Regression test suite
- **Estimated Effort:** 4 hours
- **Parallelizable With:** None
- **Dependencies:** A18
- **Validation:** All integration tests pass, performance meets targets
- **Agent:** `tester`

---

### Phase 8: Deployment (3 hours) - Sequential

#### **A20: Production Deployment Preparation**
- **Preconditions:** A19 completed, code review completed
- **Effects:**
  - Migration strategy documented
  - Feature flags configured
  - Monitoring setup
  - Rollback procedures validated
- **Estimated Effort:** 3 hours
- **Parallelizable With:** None
- **Rollback:** Feature flag disable all ruvector services
- **Dependencies:** A19
- **Validation:** Deployment plan approved
- **Agent:** `cicd-engineer`

---

## Execution Timeline

| Phase | Duration | Parallelization | Actions |
|-------|----------|-----------------|---------|
| 1. Foundation | 4h | 3-way | A1, A2, A3 |
| 2. Advanced Features | 4h | 2-way | A4, A5 |
| 3. Service Layer | 9h | Mixed | A6 → A7‖A8 |
| 4. GNN Implementation | 6h | Sequential | A9 |
| 5. Testing | 4h | 5-way | A10-A14 |
| 6. Integration | 4h | 3-way | A15, A16, A17 |
| 7. Docs & E2E Tests | 6h | Sequential | A18 → A19 |
| 8. Deployment | 3h | Sequential | A20 |
| **Total** | **40h** | 5 parallel phases | 20 actions |

**Note:** With optimal parallelization, 69 hours of work can be completed in ~40 hours of wall-clock time.

---

## Critical Path
```
A3 → A1 → A4 → A6 → [A7‖A8] → A9 → A14 → A15 → A18 → A19 → A20
```

**Critical Actions (delays impact total timeline):**
- A3: Type Definitions (foundation for everything)
- A4: VectorService Advanced Features (enables RAG)
- A6: RAGService (enables ClaudeService enhancement)
- A9: GNN Implementation (highest complexity)
- A15: ClaudeService Integration (backward compatibility risk)
- A19: Integration Testing (validates entire system)

---

## Risk Factors

### 🔴 High Risk
- **A9: GNN Implementation** - Complex machine learning algorithm, may require multiple iterations
- **A15: ClaudeService Integration** - Backward compatibility must be maintained, impacts all 8 features

### 🟡 Medium Risk
- **A4: VectorService Performance** - Must meet performance targets for large datasets
- **A6: RAG Quality** - Context retrieval quality directly impacts answer accuracy

### 🟢 Low Risk
- Type definitions, tests, documentation - straightforward implementation

---

## Parallelization Opportunities

1. **Phase 1 (3-way):** A1, A2, A3 can all run concurrently
2. **Phase 2 (2-way):** A4, A5 depend on Phase 1 but are independent
3. **Phase 3 (2-way):** A7, A8 can run in parallel after A6
4. **Phase 5 (5-way):** All testing can run concurrently
5. **Phase 6 (3-way):** A15, A16, A17 are independent migrations

**Speedup Factor:** ~1.7x (69h → 40h with optimal parallelization)

---

## Success Criteria

### Technical
- [ ] All 20 actions completed successfully
- [ ] Test coverage >80% for all 5 services
- [ ] All existing tests still pass (backward compatibility)
- [ ] Performance benchmarks meet targets
- [ ] TypeScript compilation with no errors

### Functional
- [ ] VectorService provides all similarity.ts functionality + enhancements
- [ ] GraphService provides all paragraphLinks.ts functionality + graph algorithms
- [ ] RAGService improves ClaudeService answer quality (measurable)
- [ ] EntityService correctly persists entity networks
- [ ] ClusterService/GNN produces coherent themes

### Operational
- [ ] Migration strategy documented and approved
- [ ] Feature flags in place for gradual rollout
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures tested

---

## Next Steps

1. **Immediate:** Execute Phase 1 (Foundation) - spawn 3 parallel agents for A1, A2, A3
2. **After Phase 1:** Execute Phase 2 (Advanced Features) - spawn 2 parallel agents for A4, A5
3. **Monitor:** Track critical path actions (A6, A9, A15) closely
4. **Adapt:** Use OODA loop for replanning if actions fail or take longer than estimated

**GOAP Plan Status:** ✅ Complete - Ready for execution
**Stored in Memory:** `ruvector-integration/goap/plan`
