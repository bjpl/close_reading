# Major Updates Master Plan - Phase 4
## Close Reading Platform - Dependency Modernization Strategy

**Plan Version:** 1.0
**Created:** November 10, 2025
**Status:** Planning Phase
**Estimated Duration:** 6-8 weeks
**Risk Level:** HIGH (Multiple Major Updates)

---

## 1. Executive Summary

### Overview
This master plan coordinates the modernization of the Close Reading Platform's core dependencies, involving multiple major version updates across the React ecosystem, build tooling, UI framework, and supporting libraries. These updates represent significant technical debt that has accumulated and require careful orchestration to minimize risk while maximizing benefits.

### Total Scope
- **15 Major Version Updates** (breaking changes)
- **13 High-Priority Updates**
- **8 Medium-Priority Updates**
- **7 Lower-Priority Updates**
- **Estimated Effort:** 160-240 hours
- **Team Size:** 2-3 developers recommended
- **Timeline:** 6-8 weeks with proper testing

### Critical Success Factors
1. **Zero Production Downtime** - All updates must be backwards compatible during rollout
2. **Comprehensive Testing** - 100% test coverage maintained throughout
3. **Incremental Deployment** - Feature flags for gradual rollout
4. **Performance Validation** - No regressions in core metrics
5. **Documentation** - All breaking changes documented and communicated

### Overall Risk Assessment

| Risk Category | Level | Mitigation Strategy |
|--------------|-------|---------------------|
| Breaking Changes | HIGH | Phased rollout with feature flags |
| Test Suite Impact | MEDIUM | Update tests incrementally per phase |
| Build System Changes | HIGH | Maintain parallel build configs during transition |
| User Experience | LOW | No user-facing changes expected |
| Performance | MEDIUM | Comprehensive benchmarking before/after |
| Timeline Overrun | MEDIUM | Buffer time built into each phase |
| Team Knowledge | MEDIUM | Training sessions and documentation |

### Recommended Execution Order
**Phase 4A** (Weeks 1-2): Foundation - Build & Test Tools
**Phase 4B** (Weeks 3-4): Core Framework - React Ecosystem
**Phase 4C** (Weeks 5-6): UI Layer - Chakra UI & Supporting Libraries
**Phase 4D** (Weeks 7-8): Validation, Optimization & Documentation

---

## 2. Update Inventory

### 2.1 Critical Path Updates (Must Be Coordinated)

#### **Cluster 1: React Ecosystem**
These updates are tightly coupled and must be done together or in rapid succession:

1. **React & React-DOM**: 18.2.0 → 19.2.0
   - **Impact:** HIGH - Core framework affecting all components
   - **Breaking Changes:**
     - New concurrent features behavior
     - Automatic batching changes
     - StrictMode behavior changes
     - Server Components (if adopted)
   - **Compatibility:** Requires React-Router-DOM update
   - **Effort:** 40-60 hours

2. **React-Router-DOM**: 7.9.5 → Latest 7.x (or 8.x if available)
   - **Impact:** MEDIUM - Affects navigation and routing
   - **Breaking Changes:** Route configuration API changes possible
   - **Dependencies:** Must be compatible with React 19
   - **Effort:** 16-24 hours

3. **@testing-library/react**: 14.1.2 → 16.3.0
   - **Impact:** HIGH - Affects all component tests
   - **Breaking Changes:**
     - waitFor API changes
     - render options changes
     - React 19 compatibility updates
   - **Dependencies:** Requires React 19
   - **Effort:** 24-32 hours (test updates)

#### **Cluster 2: Build System**
These updates affect the development and build pipeline:

4. **Vite**: 5.0.11 → 7.2.2
   - **Impact:** HIGH - Core build system
   - **Breaking Changes:**
     - Configuration API changes
     - Plugin API updates
     - Module resolution changes
     - Environment variable handling
   - **Dependencies:** Requires @vitejs/plugin-react update
   - **Effort:** 24-32 hours

5. **@vitejs/plugin-react**: 4.2.1 → 5.1.0
   - **Impact:** MEDIUM - React build integration
   - **Breaking Changes:** Plugin configuration changes
   - **Dependencies:** Must be compatible with Vite 7 and React 19
   - **Effort:** 8-12 hours

6. **Vitest**: 1.2.0 → 4.0.8
   - **Impact:** HIGH - Test runner
   - **Breaking Changes:**
     - Test API changes
     - Configuration format updates
     - Coverage reporting changes
     - Mock API updates
   - **Dependencies:** Compatible with Vite 7
   - **Effort:** 32-40 hours (includes test updates)

#### **Cluster 3: UI Framework**
Major UI framework update with extensive component changes:

7. **@chakra-ui/react**: 2.8.2 → 3.29.0
   - **Impact:** VERY HIGH - All UI components affected
   - **Breaking Changes:**
     - Component API redesign
     - Theme structure changes
     - Import paths changed
     - Styling prop changes
     - Removed/renamed components
   - **Dependencies:** @emotion/react and @emotion/styled compatibility
   - **Effort:** 60-80 hours (most time-consuming update)

### 2.2 Code Quality & Linting

8. **ESLint**: 8.56.0 → 9.39.1
   - **Impact:** MEDIUM - Linting rules and configuration
   - **Breaking Changes:**
     - Flat config format (new default)
     - Plugin system changes
     - Rule changes and deprecations
   - **Effort:** 16-24 hours

9. **@typescript-eslint/eslint-plugin**: 6.19.0 → 8.46.4
10. **@typescript-eslint/parser**: 6.19.0 → 8.46.4
    - **Impact:** MEDIUM - TypeScript linting
    - **Breaking Changes:** Rule changes, config format updates
    - **Dependencies:** Must be compatible with ESLint 9
    - **Effort:** 12-16 hours (combined)

### 2.3 Animation & Motion

11. **framer-motion**: 10.16.16 → 12.23.24
    - **Impact:** MEDIUM - Animation library
    - **Breaking Changes:**
      - API changes for layout animations
      - Variant system updates
      - React 19 compatibility
    - **Effort:** 16-20 hours

### 2.4 Document Processing

12. **react-pdf**: 7.7.0 → 10.2.0
    - **Impact:** MEDIUM - PDF rendering functionality
    - **Breaking Changes:** API changes for PDF rendering
    - **Dependencies:** Must be compatible with React 19
    - **Effort:** 12-16 hours

13. **tesseract.js**: 5.1.1 → 6.0.1
    - **Impact:** LOW - OCR functionality
    - **Breaking Changes:** API updates for text recognition
    - **Effort:** 8-12 hours

### 2.5 State Management & Utilities

14. **zustand**: 4.4.7 → 5.0.8
    - **Impact:** MEDIUM - State management
    - **Breaking Changes:**
      - Middleware API changes
      - TypeScript types improvements
      - React 19 compatibility
    - **Effort:** 12-16 hours

15. **wink-nlp**: 1.14.2 → 2.4.0
    - **Impact:** LOW - NLP functionality
    - **Breaking Changes:** API updates for text processing
    - **Effort:** 8-12 hours

### 2.6 Testing Tools

16. **happy-dom**: 12.10.3 → 20.0.10
    - **Impact:** LOW - Test DOM environment
    - **Breaking Changes:** DOM API updates
    - **Effort:** 4-8 hours

17. **eslint-plugin-react-hooks**: 4.6.0 → 7.0.1
    - **Impact:** LOW - React hooks linting
    - **Breaking Changes:** New rules and validations
    - **Effort:** 4-8 hours

### 2.7 Coverage Tools

18. **@vitest/coverage-v8**: 1.2.0 → 4.0.8
19. **@vitest/ui**: 1.2.0 → 4.0.8
    - **Impact:** LOW - Coverage and UI tools
    - **Dependencies:** Must match Vitest version
    - **Effort:** 4-8 hours (combined)

---

## 3. Dependency Compatibility Matrix

### 3.1 Critical Compatibility Requirements

| Update | Must Update With | Can Update After | Blocks |
|--------|------------------|------------------|--------|
| React 19 | @testing-library/react, React-Router-DOM | - | Most other updates |
| Vite 7 | @vitejs/plugin-react, Vitest 4 | React 19 | Build-related updates |
| Vitest 4 | Vite 7, @vitest/* packages | Vite 7 | Test execution |
| Chakra UI 3 | - | React 19, Vite 7 | UI development |
| ESLint 9 | @typescript-eslint/* | - | Linting workflow |

### 3.2 Update Dependencies Graph

```
Phase 4A: Build & Test Tools
├── Vite 5 → 7
│   ├── @vitejs/plugin-react 4 → 5
│   └── Vitest 1 → 4
│       ├── @vitest/coverage-v8
│       ├── @vitest/ui
│       └── happy-dom 12 → 20

Phase 4B: React Ecosystem (DEPENDS ON 4A)
├── React 18 → 19
│   ├── React-DOM 18 → 19
│   ├── @testing-library/react 14 → 16
│   ├── react-router-dom (verify compatibility)
│   ├── framer-motion 10 → 12
│   ├── react-pdf 7 → 10
│   └── zustand 4 → 5

Phase 4C: UI & Supporting Libraries (DEPENDS ON 4B)
├── Chakra UI 2 → 3 (largest effort)
├── ESLint 8 → 9
│   ├── @typescript-eslint/eslint-plugin 6 → 8
│   ├── @typescript-eslint/parser 6 → 8
│   └── eslint-plugin-react-hooks 4 → 7
├── wink-nlp 1 → 2
└── tesseract.js 5 → 6
```

### 3.3 Version Compatibility Table

| Package | Current | Target | Requires | Compatible With |
|---------|---------|--------|----------|-----------------|
| React | 18.2.0 | 19.2.0 | Node 18+ | All dependencies must support |
| Vite | 5.0.11 | 7.2.2 | Node 18+ | Vitest 4, React 19 |
| Vitest | 1.2.0 | 4.0.8 | Vite 7 | React 19 |
| Chakra UI | 2.8.2 | 3.29.0 | React 18.1+ | React 19 compatible |
| TypeScript | 5.3.3 | 5.3.3 | - | No update needed (latest) |

---

## 4. Recommended Execution Order

### **Phase 4A: Foundation - Build & Test Tools** (Weeks 1-2)

**Objective:** Modernize the build system and test infrastructure without touching application code.

**Why First?**
- Least impact on application code
- Provides better tooling for subsequent phases
- Catches issues early in a controlled environment
- Enables better testing for later phases

**Updates in Phase 4A:**

1. **Vite 5.0.11 → 7.2.2** (Day 1-3)
   - Update vite.config.ts for new API
   - Test development server
   - Test production builds
   - Verify hot module replacement (HMR)
   - Update environment variable handling

2. **@vitejs/plugin-react 4.2.1 → 5.1.0** (Day 3-4)
   - Update plugin configuration
   - Test React Fast Refresh
   - Verify build output

3. **Vitest 1.2.0 → 4.0.8** (Day 4-7)
   - Update vitest.config.ts
   - Update test scripts in package.json
   - Fix test API changes
   - Update mock service worker (MSW) integration
   - Verify all 144 tests still pass

4. **@vitest/coverage-v8 & @vitest/ui** (Day 7-8)
   - Update coverage configuration
   - Verify coverage reports work
   - Test UI interface

5. **happy-dom 12.10.3 → 20.0.10** (Day 9-10)
   - Test DOM environment compatibility
   - Verify no test regressions

**Success Criteria:**
- [ ] All 144 tests passing
- [ ] Development server runs without errors
- [ ] Production build succeeds
- [ ] Coverage reports generate correctly
- [ ] No performance regressions in build time
- [ ] HMR working correctly

**Rollback Plan:** Revert package.json and lock file, restore configs

**Estimated Effort:** 60-80 hours

---

### **Phase 4B: Core Framework - React Ecosystem** (Weeks 3-4)

**Objective:** Update React and directly dependent libraries while maintaining application stability.

**Why Second?**
- Build tools are stable (from Phase 4A)
- React update affects most other libraries
- Need updated React before Chakra UI 3
- Better error messages from updated Vite/Vitest

**Updates in Phase 4B:**

1. **React & React-DOM 18.2.0 → 19.2.0** (Day 1-5)
   - Review React 19 breaking changes
   - Enable React 19 in tsconfig.json
   - Test concurrent features
   - Update Suspense boundaries if needed
   - Verify StrictMode compatibility
   - Test all useEffect and useLayoutEffect hooks

2. **@testing-library/react 14.1.2 → 16.3.0** (Day 5-7)
   - Update all test files for new API
   - Fix waitFor and render usage
   - Update async test patterns
   - Verify all 144 tests pass with React 19

3. **React-Router-DOM** (Day 7-8)
   - Verify current version (7.9.5) compatible
   - Update if needed
   - Test all routing scenarios
   - Verify navigation works

4. **zustand 4.4.7 → 5.0.8** (Day 9-10)
   - Update store configurations
   - Test middleware
   - Verify state management works with React 19
   - Update TypeScript types

5. **framer-motion 10.16.16 → 12.23.24** (Day 11-12)
   - Update animation definitions
   - Test layout animations
   - Verify motion components work

6. **react-pdf 7.7.0 → 10.2.0** (Day 13-14)
   - Update PDF rendering code
   - Test document upload and display
   - Verify PDF viewer functionality

**Success Criteria:**
- [ ] All 144 tests passing with React 19
- [ ] No console warnings in development
- [ ] All pages render correctly
- [ ] Navigation works smoothly
- [ ] Animations perform well
- [ ] PDF viewing functional
- [ ] State management working correctly
- [ ] Performance metrics maintained

**Rollback Plan:** React upgrade can be rolled back independently

**Estimated Effort:** 80-100 hours

---

### **Phase 4C: UI Layer - Chakra UI & Supporting Libraries** (Weeks 5-6)

**Objective:** Migrate UI framework and complete remaining dependency updates.

**Why Third?**
- Most complex and time-consuming update
- Requires React 19 and updated build tools
- Isolated to presentation layer
- Can be done incrementally with feature flags

**Updates in Phase 4C:**

1. **@chakra-ui/react 2.8.2 → 3.29.0** (Day 1-10)
   - Read Chakra UI v3 migration guide thoroughly
   - Create migration plan for each component type:
     - Layout components (Box, Flex, Grid, Stack)
     - Form components (Input, Select, Textarea, etc.)
     - Feedback components (Alert, Toast, Modal, etc.)
     - Data display (Table, List, Badge, Tag)
     - Navigation (Menu, Tabs, Breadcrumb)
   - Update imports (may need to change import paths)
   - Update theme configuration
   - Update component props (many renamed/changed)
   - Update custom components using Chakra
   - Test each component thoroughly
   - Update styling patterns (style props may change)

2. **ESLint 8.56.0 → 9.39.1** (Day 11-12)
   - Convert to flat config format
   - Update eslint.config.js
   - Test linting rules
   - Fix any new lint errors

3. **@typescript-eslint/* 6.19.0 → 8.46.4** (Day 12-13)
   - Update TypeScript ESLint configuration
   - Fix new TypeScript lint errors
   - Update any custom rules

4. **eslint-plugin-react-hooks 4.6.0 → 7.0.1** (Day 13)
   - Update plugin configuration
   - Fix any new hook linting errors

5. **wink-nlp 1.14.2 → 2.4.0** (Day 14)
   - Update NLP processing code
   - Test text analysis features
   - Verify ML functionality

6. **tesseract.js 5.1.1 → 6.0.1** (Day 14)
   - Update OCR code
   - Test text extraction from images

**Success Criteria:**
- [ ] All UI components render correctly
- [ ] Theme and styling consistent
- [ ] All 144 tests passing
- [ ] No ESLint errors
- [ ] NLP features working
- [ ] OCR functionality working
- [ ] Visual regression testing passes
- [ ] Accessibility maintained (WCAG 2.1 AA)

**Rollback Plan:** Chakra UI can be rolled back with component wrapper layer

**Estimated Effort:** 100-120 hours

---

### **Phase 4D: Validation, Optimization & Documentation** (Weeks 7-8)

**Objective:** Comprehensive testing, performance optimization, and documentation.

**Activities:**

1. **Full Regression Testing** (Day 1-3)
   - Run entire test suite multiple times
   - Manual testing of all features
   - Cross-browser testing
   - Mobile responsiveness testing
   - Accessibility audit

2. **Performance Benchmarking** (Day 4-5)
   - Lighthouse scores (before/after)
   - Bundle size analysis
   - Load time metrics
   - Time to interactive
   - Memory usage profiling
   - React DevTools profiling

3. **Security Audit** (Day 6-7)
   - npm audit and fix remaining vulnerabilities
   - Dependency vulnerability scan
   - Code security review
   - Update security documentation

4. **Documentation Updates** (Day 8-10)
   - Update README with new versions
   - Document breaking changes
   - Update ARCHITECTURAL_DECISIONS.md
   - Create migration guides for team
   - Update developer setup docs
   - Create troubleshooting guide

5. **Team Training** (Day 11-12)
   - React 19 new features workshop
   - Chakra UI v3 changes session
   - Vite 7 and Vitest 4 overview
   - Q&A session

6. **Production Deployment Planning** (Day 13-14)
   - Create deployment checklist
   - Plan gradual rollout strategy
   - Setup monitoring and alerts
   - Prepare rollback procedures
   - Schedule deployment window

**Success Criteria:**
- [ ] Zero test failures
- [ ] Performance metrics improved or maintained
- [ ] No security vulnerabilities
- [ ] All documentation updated
- [ ] Team trained on changes
- [ ] Deployment plan approved
- [ ] Stakeholder sign-off

**Estimated Effort:** 40-60 hours

---

## 5. Risk Mitigation Strategies

### 5.1 Backup and Rollback Strategy

**Pre-Update Backup:**
```bash
# Create backup branch before each phase
git checkout -b backup/pre-phase-4a
git push origin backup/pre-phase-4a

# Tag each phase completion
git tag phase-4a-complete
git push origin phase-4a-complete
```

**Rollback Procedures:**

1. **Immediate Rollback (Critical Issues)**
   ```bash
   # Revert to previous stable version
   git revert <commit-range>
   git push origin master
   npm ci  # Reinstall exact previous versions
   ```

2. **Partial Rollback (Specific Package)**
   ```bash
   # Rollback individual package
   npm install package@previous-version
   git checkout HEAD -- package-lock.json
   npm install
   ```

3. **Full Phase Rollback**
   ```bash
   # Return to backup branch
   git reset --hard backup/pre-phase-4a
   git push origin master --force-with-lease
   ```

### 5.2 Feature Flags for Gradual Rollout

**Implementation Strategy:**

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_CHAKRA_V3: import.meta.env.VITE_USE_CHAKRA_V3 === 'true',
  USE_REACT_19: import.meta.env.VITE_USE_REACT_19 === 'true',
  ENABLE_NEW_ANIMATIONS: import.meta.env.VITE_NEW_ANIMATIONS === 'true',
} as const;

// Wrapper components for gradual migration
export const Button = FEATURE_FLAGS.USE_CHAKRA_V3
  ? ChakraV3Button
  : ChakraV2Button;
```

**Rollout Phases:**
1. **Week 1:** Internal testing (10% traffic)
2. **Week 2:** Beta users (25% traffic)
3. **Week 3:** General rollout (50% traffic)
4. **Week 4:** Full deployment (100% traffic)

### 5.3 Testing Strategy Across All Updates

**Test Pyramid:**

```
                  /\
                 /  \    E2E Tests (10%)
                /____\   - Playwright
               /      \  - Critical user flows
              /________\ Integration Tests (20%)
             /          \ - API integration
            /____________\ - Component interaction
           /              \ Unit Tests (70%)
          /________________\ - Component logic
                              - Utility functions
                              - Hook behavior
```

**Testing Checklist Per Phase:**

- [ ] Unit tests (144+ tests, 90%+ coverage)
- [ ] Integration tests (component interactions)
- [ ] E2E tests (critical user flows)
- [ ] Visual regression tests (Chromatic or Percy)
- [ ] Performance tests (Lighthouse)
- [ ] Accessibility tests (axe-core)
- [ ] Cross-browser tests (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness tests
- [ ] Load testing (concurrent users)
- [ ] Security testing (OWASP Top 10)

**Automated Test Gates:**

```yaml
# .github/workflows/phase-4-testing.yml
- name: Phase Gate
  run: |
    npm run test              # Must pass
    npm run test:e2e          # Must pass
    npm run lint              # Must pass
    npm run typecheck         # Must pass
    npm run test:coverage     # Must meet 90% threshold
    npm audit                 # No high/critical vulnerabilities
```

### 5.4 Staging Environment Recommendations

**Environment Parity:**

| Environment | Purpose | Characteristics |
|-------------|---------|-----------------|
| Local Dev | Development | Hot reload, debug tools |
| CI/CD | Automated testing | Clean slate, all tests |
| Staging | Pre-production testing | Production-like, safe to break |
| Production | Live users | Monitored, stable, rollback-ready |

**Staging Environment Setup:**

1. **Infrastructure:**
   - Separate Supabase project (staging)
   - Separate domain (staging.closereadingplatform.com)
   - Production-like data (anonymized)
   - Same server specifications

2. **Deployment Pipeline:**
   ```
   Local Dev → PR → CI/CD → Staging → Production
                     ↓        ↓           ↓
                   Tests   Manual     Gradual
                           Review     Rollout
   ```

3. **Monitoring:**
   - Error tracking (Sentry, staging instance)
   - Performance monitoring (Web Vitals)
   - User session recording (LogRocket, Hotjar)
   - Analytics (separate GA property)

### 5.5 Communication Plan

**Stakeholder Updates:**

- **Weekly Status Reports** (Email)
  - Progress on current phase
  - Blockers and risks
  - Next week's plan

- **Phase Completion Reviews** (Meeting)
  - Demo of changes
  - Metrics review
  - Lessons learned

- **Critical Issue Alerts** (Slack/Email)
  - Immediate notification of blockers
  - Rollback decisions
  - Schedule changes

**Team Communication:**

- **Daily Standups** (15 min)
  - Progress updates
  - Blockers discussion
  - Pair programming coordination

- **Phase Kickoff Meetings** (1 hour)
  - Review phase goals
  - Assign responsibilities
  - Discuss approach

- **Retrospectives** (1 hour)
  - What went well
  - What to improve
  - Action items

---

## 6. Success Criteria

### 6.1 Technical Success Metrics

**Testing:**
- [ ] All 144 tests passing
- [ ] Test coverage maintained at 90%+
- [ ] Zero failing E2E tests
- [ ] Zero console errors in production mode
- [ ] Zero TypeScript errors

**Performance:**
- [ ] Lighthouse score ≥ 90 (Performance)
- [ ] Lighthouse score ≥ 95 (Accessibility)
- [ ] Lighthouse score ≥ 95 (Best Practices)
- [ ] Lighthouse score ≥ 100 (SEO)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.0s
- [ ] Total Blocking Time < 200ms
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size not increased > 10%

**Security:**
- [ ] Zero high/critical npm vulnerabilities
- [ ] Security audit passed
- [ ] No exposed secrets or credentials
- [ ] CSP headers properly configured
- [ ] HTTPS enforced

**Quality:**
- [ ] Zero ESLint errors
- [ ] Zero ESLint warnings (critical rules)
- [ ] Code formatted consistently
- [ ] No deprecated API usage
- [ ] All TODOs and FIXMEs addressed

### 6.2 Functional Success Metrics

**Core Features:**
- [ ] Document upload works (PDF, DOCX, TXT)
- [ ] Annotation creation and editing works
- [ ] Paragraph linking functional
- [ ] ML similarity detection works
- [ ] Citation export functional
- [ ] Document sharing works
- [ ] User authentication works
- [ ] Project management works

**User Experience:**
- [ ] All pages load correctly
- [ ] Navigation smooth and responsive
- [ ] Forms validate correctly
- [ ] Error messages clear and helpful
- [ ] Loading states appropriate
- [ ] Animations smooth (60fps)
- [ ] Mobile responsive on all devices
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

**Data Integrity:**
- [ ] No data loss during updates
- [ ] Database migrations successful
- [ ] Local storage intact
- [ ] User preferences preserved
- [ ] Session persistence works

### 6.3 Business Success Metrics

**Deployment:**
- [ ] Zero unplanned downtime
- [ ] Rollback plan tested
- [ ] Monitoring in place
- [ ] Alerts configured
- [ ] On-call schedule set

**Documentation:**
- [ ] README updated
- [ ] API documentation current
- [ ] Architecture docs updated
- [ ] Migration guide created
- [ ] Troubleshooting guide available

**Team Readiness:**
- [ ] Team trained on changes
- [ ] Knowledge transfer complete
- [ ] Code review guidelines updated
- [ ] CI/CD pipeline documented
- [ ] Support team briefed

**Stakeholder Satisfaction:**
- [ ] Project timeline met (or justified variance)
- [ ] Budget adhered to
- [ ] All requirements delivered
- [ ] No critical issues in production
- [ ] Positive team feedback

---

## 7. Timeline Summary

### Week-by-Week Breakdown

**Week 1: Phase 4A - Build Tools (Part 1)**
- Days 1-3: Vite upgrade and configuration
- Days 4-5: Vite plugin updates and testing
- Milestone: Development server stable with Vite 7
- Deliverable: Updated vite.config.ts

**Week 2: Phase 4A - Build Tools (Part 2)**
- Days 1-3: Vitest upgrade and test updates
- Days 4-5: Coverage and testing tool updates
- Milestone: All 144 tests passing with Vitest 4
- Deliverable: Updated test suite

**Week 3: Phase 4B - React Ecosystem (Part 1)**
- Days 1-3: React 19 upgrade and core testing
- Days 4-5: Testing library updates
- Milestone: React 19 running with zero console errors
- Deliverable: React 19 compatibility confirmed

**Week 4: Phase 4B - React Ecosystem (Part 2)**
- Days 1-2: Router and state management updates
- Days 3-4: Animation and PDF library updates
- Day 5: Integration testing
- Milestone: All React ecosystem libraries updated
- Deliverable: Fully functional React 19 app

**Week 5: Phase 4C - UI Framework (Part 1)**
- Days 1-5: Chakra UI 3 migration (initial components)
- Milestone: Core components migrated
- Deliverable: 50% of components using Chakra UI 3

**Week 6: Phase 4C - UI Framework (Part 2)**
- Days 1-3: Chakra UI 3 migration (remaining components)
- Days 4-5: ESLint and supporting library updates
- Milestone: All UI components on Chakra UI 3
- Deliverable: Fully updated UI layer

**Week 7: Phase 4D - Validation (Part 1)**
- Days 1-3: Comprehensive testing and QA
- Days 4-5: Performance optimization
- Milestone: All tests passing, performance validated
- Deliverable: Test and performance reports

**Week 8: Phase 4D - Validation (Part 2)**
- Days 1-2: Security audit
- Days 3-4: Documentation
- Day 5: Team training and deployment prep
- Milestone: Production-ready
- Deliverable: Deployment package and documentation

### Gantt Chart (Simplified)

```
Week    1         2         3         4         5         6         7         8
Phase   |---4A----|----4A---|----4B---|----4B---|----4C---|----4C---|----4D---|----4D---|
        Vite      Vitest    React     React     Chakra    Chakra    Testing   Docs
        Upgrade   Upgrade   Core      Eco       UI (1)    UI (2)    Perf      Deploy
```

### Critical Path

```
Vite 7 → Vitest 4 → React 19 → Testing Lib → Chakra UI 3 → ESLint 9 → Production
  ↓         ↓          ↓            ↓             ↓            ↓           ↓
Week 1    Week 2    Week 3       Week 4        Week 5      Week 6      Week 8
```

**Total Duration: 8 weeks (56 days)**
**Buffer Time: 2 weeks (14 days) - built into estimates**
**Critical Deadline: Week 8, Day 5**

---

## 8. Post-Migration Tasks

### 8.1 Performance Benchmarking

**Before/After Comparison:**

| Metric | Before | Target | Actual | Status |
|--------|--------|--------|--------|--------|
| Lighthouse Performance | TBD | ≥90 | TBD | Pending |
| Bundle Size | TBD | <+10% | TBD | Pending |
| First Contentful Paint | TBD | <1.5s | TBD | Pending |
| Time to Interactive | TBD | <3.0s | TBD | Pending |
| Test Execution Time | TBD | <baseline | TBD | Pending |
| Build Time | TBD | <baseline | TBD | Pending |

**Benchmarking Tools:**
- Lighthouse CI (automated)
- WebPageTest (external monitoring)
- Chrome DevTools Performance
- React DevTools Profiler
- Webpack Bundle Analyzer (or Vite equivalent)

**Benchmarking Schedule:**
- Pre-Phase 4A baseline (Week 0)
- Post-Phase 4A (Week 2)
- Post-Phase 4B (Week 4)
- Post-Phase 4C (Week 6)
- Final validation (Week 8)
- 30-day post-deployment (Week 12)

### 8.2 Documentation Updates

**Required Documentation:**

1. **README.md**
   - [ ] Update dependency versions
   - [ ] Update installation instructions
   - [ ] Update development setup
   - [ ] Add troubleshooting section for new versions

2. **ARCHITECTURAL_DECISIONS.md**
   - [ ] Document React 19 adoption rationale
   - [ ] Document Chakra UI v3 migration decisions
   - [ ] Document Vite 7 build optimizations
   - [ ] Add section on dependency management strategy

3. **CONTRIBUTING.md**
   - [ ] Update development environment setup
   - [ ] Update coding standards for new ESLint rules
   - [ ] Update testing guidelines
   - [ ] Add migration-specific guidelines

4. **DEPLOYMENT.md** (Create if not exists)
   - [ ] Document deployment process
   - [ ] Add rollback procedures
   - [ ] Include monitoring setup
   - [ ] Add troubleshooting guide

5. **MIGRATION_GUIDE.md** (New)
   - [ ] Document all breaking changes
   - [ ] Provide code examples for common patterns
   - [ ] Include before/after comparisons
   - [ ] Add FAQ section

6. **API_CHANGELOG.md** (New)
   - [ ] List all API changes
   - [ ] Document deprecated features
   - [ ] Provide migration paths
   - [ ] Include version compatibility matrix

7. **Component Documentation**
   - [ ] Update Storybook (if used)
   - [ ] Update component README files
   - [ ] Add new prop examples
   - [ ] Document theming changes

### 8.3 Team Training on New Features

**Training Schedule:**

**Session 1: React 19 New Features (2 hours)**
- Concurrent features and Suspense
- Automatic batching improvements
- Server Components (overview)
- New hooks (useTransition, useDeferredValue)
- Performance optimizations
- Breaking changes and migration patterns

**Session 2: Chakra UI v3 Changes (2 hours)**
- New component APIs
- Theme system updates
- Import path changes
- Styling pattern updates
- Accessibility improvements
- Component migration strategies

**Session 3: Build Tools & Testing (1.5 hours)**
- Vite 7 features and optimizations
- Vitest 4 improvements
- New testing patterns
- Performance profiling tools
- Debugging techniques

**Session 4: Code Quality & Best Practices (1 hour)**
- ESLint 9 flat config
- New TypeScript patterns
- Code review guidelines
- Performance best practices

**Training Materials:**
- [ ] Slide decks for each session
- [ ] Code examples repository
- [ ] Video recordings of sessions
- [ ] Quick reference guides
- [ ] Hands-on exercises
- [ ] FAQ document

**Knowledge Verification:**
- [ ] Post-training quiz (optional)
- [ ] Code review of training exercises
- [ ] Pair programming sessions
- [ ] Q&A follow-up sessions

### 8.4 Monitoring and Validation

**Application Monitoring:**

**1. Error Tracking (Sentry or similar)**
```javascript
// Initialize error monitoring
Sentry.init({
  dsn: "YOUR_DSN",
  environment: process.env.NODE_ENV,
  release: `close-reading@${packageJson.version}`,
  beforeSend(event) {
    // Filter out specific errors
    return event;
  },
});

// Track phase 4 specific issues
Sentry.setTag("migration-phase", "phase-4-complete");
```

**2. Performance Monitoring**
- Real User Monitoring (RUM) setup
- Web Vitals tracking
- Custom performance marks
- Bundle size monitoring
- API response time tracking

**3. User Behavior Analytics**
- Pageview tracking
- Feature usage metrics
- Error frequency by feature
- User journey analysis
- A/B test results (if applicable)

**4. Infrastructure Monitoring**
- Server response times
- Database query performance
- CDN hit rates
- Cache effectiveness
- Resource utilization

**Monitoring Dashboard:**

```
┌─────────────────────────────────────────────┐
│  Close Reading Platform - Phase 4 Monitor  │
├─────────────────────────────────────────────┤
│  Error Rate:        ▁▂▁▁▃▂▁▁  0.02%         │
│  Avg Response:      ▃▄▃▅▄▃▃▄  245ms         │
│  Active Users:      ████████  1,234         │
│  Test Pass Rate:    ████████  100%          │
│  Lighthouse Score:  ████████  95/100        │
├─────────────────────────────────────────────┤
│  Alerts:                                    │
│  ⚠ None                                     │
└─────────────────────────────────────────────┘
```

**Alert Configuration:**

| Condition | Threshold | Action | Severity |
|-----------|-----------|--------|----------|
| Error rate spike | >1% for 5min | Slack alert + Email | Critical |
| Performance drop | LCP >3s for 10min | Slack alert | High |
| Test failure | Any test fails | Slack alert + Block deploy | Critical |
| High CPU usage | >80% for 15min | Email | Medium |
| Bundle size increase | >10% | PR comment | Low |

**Validation Period:**

**Week 1 Post-Deployment:** Intensive monitoring
- [ ] Check dashboards every 2 hours
- [ ] Daily team standup on metrics
- [ ] Immediate triage of any issues

**Week 2-4 Post-Deployment:** Active monitoring
- [ ] Check dashboards daily
- [ ] Weekly metrics review
- [ ] Address non-critical issues

**Month 2-3 Post-Deployment:** Steady state
- [ ] Weekly metrics review
- [ ] Monthly comprehensive analysis
- [ ] Plan optimizations based on data

**Success Criteria for Validation:**
- [ ] Error rate < 0.1%
- [ ] No P0/P1 incidents
- [ ] Performance metrics stable or improved
- [ ] User satisfaction maintained (surveys/feedback)
- [ ] No critical bugs reported

---

## 9. Budget & Resource Allocation

### 9.1 Time Investment

| Phase | Developer Hours | QA Hours | DevOps Hours | Total |
|-------|----------------|----------|--------------|-------|
| 4A: Build Tools | 60-80 | 16-20 | 8-12 | 84-112 |
| 4B: React Ecosystem | 80-100 | 20-24 | 8-12 | 108-136 |
| 4C: UI Framework | 100-120 | 24-32 | 8-12 | 132-164 |
| 4D: Validation | 40-60 | 40-50 | 16-20 | 96-130 |
| **Total** | **280-360** | **100-126** | **40-56** | **420-542** |

**With 2-person team:** 8-14 weeks
**With 3-person team:** 6-8 weeks (recommended)

### 9.2 Risk Contingency

**Buffer Time:** 20% additional (84-108 hours)
**Total Project Hours:** 504-650 hours

### 9.3 Cost Estimate (if outsourced)

| Role | Rate | Hours | Cost |
|------|------|-------|------|
| Senior Dev | $100-150/hr | 280-360 | $28k-54k |
| QA Engineer | $70-100/hr | 100-126 | $7k-13k |
| DevOps | $90-120/hr | 40-56 | $3.6k-6.7k |
| **Total** | | **420-542** | **$38.6k-73.7k** |

---

## 10. Dependencies and Blockers

### 10.1 Known Dependencies

**External:**
- [ ] Chakra UI v3 migration guide availability (✓ Available)
- [ ] React 19 stable release (✓ Available)
- [ ] Vite 7 documentation (✓ Available)
- [ ] Vitest 4 migration guide (✓ Available)

**Internal:**
- [ ] Supabase compatibility with React 19 (✓ Confirmed 2.81.0 compatible)
- [ ] Team availability for 6-8 weeks
- [ ] Staging environment access
- [ ] Stakeholder approval for timeline

### 10.2 Potential Blockers

| Blocker | Probability | Impact | Mitigation |
|---------|-------------|--------|------------|
| Breaking API changes | Medium | High | Extensive testing, feature flags |
| Team capacity issues | Low | High | Cross-training, buffer time |
| Third-party library incompatibility | Low | Medium | Evaluate alternatives early |
| Performance regression | Medium | High | Comprehensive benchmarking |
| Production incident during update | Low | Very High | Maintain stable backup branch |

---

## 11. Sign-off and Approvals

**Plan Prepared By:** Migration Coordination Agent
**Date:** November 10, 2025
**Status:** Draft - Awaiting Review

**Approval Required From:**

- [ ] **Tech Lead** - Technical approach approval
- [ ] **Engineering Manager** - Resource allocation approval
- [ ] **Product Manager** - Timeline and scope approval
- [ ] **QA Lead** - Testing strategy approval
- [ ] **DevOps Lead** - Infrastructure and deployment approval

**Review History:**

| Date | Reviewer | Status | Comments |
|------|----------|--------|----------|
| 2025-11-10 | Migration Coordination Agent | Draft | Initial plan created |
| TBD | TBD | Pending | Awaiting review |

---

## 12. Appendices

### Appendix A: Reference Documents

**Migration Guides:**
- [React 19 Migration Guide](https://react.dev/blog/2024/12/05/react-19-upgrade-guide)
- [Chakra UI v3 Migration Guide](https://www.chakra-ui.com/docs/get-started/migration)
- [Vite 7 Migration Guide](https://vitejs.dev/guide/migration)
- [Vitest 4 Migration Guide](https://vitest.dev/guide/migration)
- [ESLint 9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)

**Project Documents:**
- [DEPENDENCY_UPDATES.md](/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/docs/DEPENDENCY_UPDATES.md)
- [ARCHITECTURAL_DECISIONS.md](/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/docs/ARCHITECTURAL_DECISIONS.md)
- [PLAN_C_COMPLETION_REPORT.md](/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/docs/PLAN_C_COMPLETION_REPORT.md)

### Appendix B: Useful Commands

**Dependency Management:**
```bash
# Check outdated packages
npm outdated

# Update specific package
npm install package@latest

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities (automatic)
npm audit fix

# Fix vulnerabilities (manual review)
npm audit fix --force
```

**Testing:**
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run type checking
npm run typecheck
```

**Build:**
```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Analyze bundle
npm run build -- --mode analyze
```

**Git Workflow:**
```bash
# Create backup before phase
git checkout -b backup/pre-phase-4a
git push origin backup/pre-phase-4a

# Create feature branch for phase
git checkout -b feature/phase-4a-build-tools

# Commit with descriptive message
git commit -m "feat: upgrade to Vite 7 and Vitest 4"

# Tag phase completion
git tag phase-4a-complete
git push origin phase-4a-complete
```

### Appendix C: Troubleshooting Guide

**Common Issues:**

**Issue 1: Module resolution errors after Vite upgrade**
```
Error: Failed to resolve import
```
**Solution:** Update vite.config.ts resolve.alias, clear cache (`rm -rf node_modules/.vite`)

**Issue 2: Test failures after React 19 upgrade**
```
Error: Warning: ReactDOM.render is no longer supported
```
**Solution:** Update test setup to use createRoot API

**Issue 3: Chakra UI components not rendering**
```
Error: Cannot read property 'colorMode' of undefined
```
**Solution:** Ensure ChakraProvider with updated theme is at app root

**Issue 4: ESLint flat config errors**
```
Error: ESLint configuration in .eslintrc.js is no longer supported
```
**Solution:** Convert to eslint.config.js flat config format

**Issue 5: TypeScript errors with new package types**
```
Error: Property 'X' does not exist on type 'Y'
```
**Solution:** Update @types/* packages, check package changelog for type changes

### Appendix D: Glossary

**Terms Used in This Document:**

- **Breaking Change:** A change that requires code modifications to maintain functionality
- **Major Version:** First number in semver (X.0.0), indicates breaking changes
- **Minor Version:** Second number in semver (0.X.0), backward-compatible features
- **Patch Version:** Third number in semver (0.0.X), backward-compatible bug fixes
- **Feature Flag:** Configuration that enables/disables features at runtime
- **Rollback:** Reverting to a previous stable version
- **Rollout:** Gradual deployment to increasing percentage of users
- **Regression:** New bug introduced by changes
- **Smoke Test:** Quick test to verify basic functionality
- **Canary Deployment:** Deploying to small subset of users first
- **Blue-Green Deployment:** Running two identical environments, switching traffic
- **Technical Debt:** Deferred work that accumulates and requires maintenance

---

## 13. Conclusion

This Major Updates Master Plan provides a comprehensive roadmap for modernizing the Close Reading Platform's dependency stack. The phased approach minimizes risk while ensuring thorough testing and validation at each step.

**Key Takeaways:**

1. **Phased Approach:** 4 distinct phases over 8 weeks
2. **Risk Management:** Multiple rollback points, feature flags, extensive testing
3. **Team Coordination:** Clear roles, communication plan, training
4. **Success Metrics:** Quantifiable goals for quality, performance, and stability
5. **Post-Migration:** Ongoing monitoring, documentation, and optimization

**Next Steps:**

1. **Immediate:** Stakeholder review and approval
2. **Week 0:** Team kickoff, environment setup, create backup branches
3. **Week 1:** Begin Phase 4A (Vite/Vitest updates)
4. **Ongoing:** Daily standups, weekly status reports
5. **Week 8:** Final validation and production deployment

**Questions or Concerns:**

Contact the Migration Coordination team for clarification on any aspect of this plan.

---

**Document Version:** 1.0
**Last Updated:** November 10, 2025
**Next Review:** Upon completion of agent-specific planning documents
**Status:** Ready for stakeholder review

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-10 | 1.0 | Initial master plan created | Migration Coordination Agent |
| TBD | 1.1 | Updated after review of agent-specific plans | TBD |
| TBD | 2.0 | Final version post-approval | TBD |

---

**END OF DOCUMENT**
