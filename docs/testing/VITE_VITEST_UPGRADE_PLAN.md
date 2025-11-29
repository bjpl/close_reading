# Vite & Vitest Major Version Upgrade Plan

## Executive Summary

### Current vs Target Versions

| Tool | Current | Target | Major Versions to Jump |
|------|---------|--------|------------------------|
| Vite | 5.4.21 | 7.2.2 | 2 major versions (5 → 6 → 7) |
| Vitest | 1.6.1 | 4.0.8 | 3 major versions (1 → 2 → 3 → 4) |
| @vitejs/plugin-react | 4.7.0 | 5.1.0 | 1 major version |
| @vitest/coverage-v8 | 1.6.1 | 4.0.8 | 3 major versions |
| @vitest/ui | 1.6.1 | 4.0.8 | 3 major versions |

### Impact Assessment

**HIGH IMPACT**: These are significant multi-version jumps involving:
- Breaking changes across 5 major releases
- New runtime requirements (Node.js 20.19+/22.12+)
- Complete architectural rewrites (Rolldown bundler in Vite 7)
- Major API changes in test framework
- 24 test files requiring potential updates
- Configuration file changes
- Plugin compatibility concerns

### Risk Level
**MEDIUM-HIGH**: While the ecosystem is mature and migration guides exist, the multiple major version jumps increase complexity and testing burden.

### Timeline Estimate
- **Planning & Research**: 1 day (completed)
- **Vite Upgrade (5→6→7)**: 2-3 days
- **Vitest Upgrade (1→2→3→4)**: 3-4 days
- **Plugin Updates**: 1 day
- **Test Suite Validation**: 2-3 days
- **Performance Testing**: 1 day
- **Rollback Testing**: 0.5 days
- **Buffer for Issues**: 2 days
- **Total Estimated Time**: 12-15 days

---

## Part 1: Vite Upgrade (5.4.21 → 7.2.2)

### Vite 6.0 Breaking Changes

#### 1. Node.js Runtime Requirements
- **Change**: Minimum Node.js version increased
- **Old**: Node.js 18+ supported
- **New**: Node.js 18.18+ or 20+ required (for Vite 6)
- **Impact**: Verify local development and CI/CD environments
- **Action Required**: Update Node.js if running older versions

#### 2. resolve.conditions Default Value Changes
- **Change**: Internal conditions no longer added automatically
- **Old**: ['module', 'browser', 'development|production'] added internally
- **New**: Must be explicitly included in config
- **Impact**: May affect module resolution for certain packages
- **Action Required**:
  ```typescript
  // vite.config.ts - Add if needed
  export default defineConfig({
    resolve: {
      conditions: ['module', 'browser', process.env.NODE_ENV === 'production' ? 'production' : 'development']
    }
  })
  ```

#### 3. CSS Output File Names in Library Mode
- **Change**: CSS file naming now follows package.json "name"
- **Impact**: LOW (not using library mode)
- **Action Required**: None for this project

#### 4. Sass API Modernization
- **Change**: Modern API is now default (legacy API removed in v7)
- **Impact**: LOW (not using Sass in this project)
- **Action Required**: None

#### 5. Glob Pattern Changes
- **Change**: Range braces ({01..03}) and incremental braces ({2..8..2}) no longer supported
- **Impact**: LOW (would only affect custom import.meta.glob patterns)
- **Action Required**: Review any glob patterns in code

#### 6. dotenv-expand Behavior
- **Change**: Variables in interpolation must be declared before use
- **Impact**: LOW (basic .env usage in project)
- **Action Required**: Review .env files if using variable interpolation

#### 7. Module Runner API
- **Change**: Experimental Runtime API evolved to Module Runner API
- **Impact**: NONE (not using experimental Runtime API)
- **Action Required**: None

### Vite 7.0 Breaking Changes

#### 1. Node.js Version Requirements (CRITICAL)
- **Change**: Node.js 18 support dropped
- **Old**: Node.js 18+ (end-of-life April 2025)
- **New**: Node.js 20.19+ or 22.12+ required
- **Reason**: Enables native require(esm) without flags, allows ESM-only distribution
- **Impact**: HIGH - Must upgrade Node.js in all environments
- **Action Required**:
  - Update local development environment
  - Update CI/CD pipeline (GitHub Actions, etc.)
  - Update production deployment environments
  - Update package.json engines field

#### 2. Browser Target Baseline
- **Change**: Default browser target updated
- **Old**: 'modules' (basic ES modules support)
- **New**: 'baseline-widely-available' (features stable for 30+ months)
- **New Minimum Versions**:
  - Chrome 107+
  - Firefox 104+
  - Safari 16.0+
  - Edge 107+
- **Impact**: MEDIUM - May drop support for older browsers
- **Action Required**:
  - Verify target audience browser usage
  - Consider overriding if broader support needed:
    ```typescript
    export default defineConfig({
      build: {
        target: 'modules' // Revert if needed
      }
    })
    ```

#### 3. Sass Legacy API Removed
- **Change**: Only modern Sass API supported
- **Impact**: NONE (not using Sass)
- **Action Required**: None

#### 4. splitVendorChunkPlugin Removed
- **Change**: Deprecated plugin removed (since v5.2.7)
- **Impact**: NONE (not using this plugin)
- **Action Required**: None

#### 5. transformIndexHtml Hook Changes
- **Change**: Hook-level enforcement updated
- **Old**: 'enforce' property, 'transform' function
- **New**: 'order' property, 'handler' function
- **Impact**: LOW (only affects custom Vite plugins)
- **Action Required**: None (not using custom index.html transformations)

#### 6. Rolldown Bundler (MAJOR ARCHITECTURAL CHANGE)
- **Description**: Rust-based bundler replaces Rollup/esbuild
- **Benefits**:
  - Up to 100× reduction in peak memory consumption
  - Significantly faster builds
  - Drop-in replacement (mostly transparent)
- **Impact**: MEDIUM - Should be transparent but may have edge cases
- **Performance Expected**: Major improvements in build speed and memory
- **Action Required**:
  - Monitor build process after upgrade
  - Test all build outputs thoroughly
  - Report any issues to Vite team

#### 7. Environment API Enhancements
- **Change**: New buildApp hook for environment coordination
- **Impact**: NONE (experimental API, not used)
- **Action Required**: None

### Vite Configuration Changes Required

```typescript
// vite.config.ts - Updated configuration
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Add if module resolution issues occur:
    // conditions: ['module', 'browser', process.env.NODE_ENV === 'production' ? 'production' : 'development']
  },
  build: {
    target: 'baseline-widely-available', // New default, explicit for clarity
    // OR: target: 'modules' // If broader browser support needed
  },
  test: {
    globals: true,
    environment: 'jsdom', // Note: May need updates for Vitest 4
    setupFiles: './tests/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
})
```

---

## Part 2: Vitest Upgrade (1.6.1 → 4.0.8)

### Vitest 2.0 Breaking Changes

#### 1. Default Pool Changed to 'forks'
- **Change**: Default test execution pool updated
- **Old**: 'threads' (multi-threading)
- **New**: 'forks' (process forking) for better stability
- **Impact**: MEDIUM - May affect test execution and performance
- **Behavior**: Each test file runs in isolated process
- **Action Required**:
  ```typescript
  // vite.config.ts - Explicit pool configuration
  test: {
    pool: 'forks', // New default, or 'threads' to keep old behavior
    poolOptions: {
      threads: {
        singleThread: false,
      },
      forks: {
        singleFork: false,
      }
    }
  }
  ```

#### 2. Hooks Run Serially
- **Change**: All hooks now run in serial order
- **Old**: Hooks could run in parallel
- **New**: Sequential execution, afterAll/afterEach run in reverse order
- **Impact**: LOW - May slightly increase test time, improves predictability
- **Action Required**:
  - Review test hooks for timing assumptions
  - Revert if needed: `sequence: { hooks: 'parallel' }`

#### 3. Concurrent Suite Behavior Changed
- **Change**: concurrent tests within suites run differently
- **Old**: Concurrent tests grouped by suite, suites run sequentially
- **New**: All concurrent tests run truly concurrently (Jest behavior)
- **Impact**: MEDIUM - Tests with shared state may behave differently
- **Action Required**:
  - Review any `describe.concurrent` or `test.concurrent` usage
  - Check for race conditions in concurrent tests
  - Current project uses concurrent tests - needs review

#### 4. Coverage ignoreEmptyLines Default
- **Change**: Empty lines excluded from coverage by default
- **Old**: `coverage.ignoreEmptyLines: false`
- **New**: `coverage.ignoreEmptyLines: true`
- **Impact**: MEDIUM - Coverage percentages will change
- **Effect**: Coverage reports will show higher percentages (more accurate)
- **Action Required**:
  - Recalibrate coverage thresholds
  - Review coverage reports after upgrade
  - Update CI/CD coverage gates if needed

#### 5. Mock Results Handling
- **Change**: Async mock results now wrapped in promises
- **Old**: `mock.results` contained unwrapped values
- **New**: Use `mock.settledResults` for unwrapped values
- **New Matchers**: `toHaveResolved*` matchers added (similar to `toHaveReturned`)
- **Impact**: LOW - Only if directly accessing mock results
- **Action Required**:
  - Search for `.results` usage in tests
  - Update to `.settledResults` for async mocks

#### 6. Snapshot Format Changes
- **Change**: Snapshot string formatting updated
- **Old**: Escaped quotes, various quote styles
- **New**: Backticks for all snapshots, no quote escaping
- **Impact**: HIGH - All existing snapshots will need update
- **Action Required**:
  - Run `vitest --update-snapshots` or `vitest -u`
  - Review snapshot changes carefully
  - Commit updated snapshots

### Vitest 3.0 Breaking Changes

#### 1. spy.mockReset Behavior
- **Change**: Reset behavior now more thorough
- **Impact**: LOW - Improves test isolation
- **Action Required**: Review any tests using `mockReset()`

#### 2. Test Context Passing
- **Change**: Context passed down to test hooks
- **Impact**: LOW - Improves hook capabilities
- **Action Required**: None unless using advanced test context

#### 3. V8 Coverage Remapping (v3.2.0+)
- **Change**: AST-based coverage remapping for accuracy
- **Old**: v8-to-istanbul remapping (false positives)
- **New**: AST-based analysis (Istanbul-level accuracy)
- **Impact**: MEDIUM - Coverage reports will be more accurate
- **Benefits**: Speed of V8 with accuracy of Istanbul
- **Action Required**:
  - Expect coverage report differences
  - Recalibrate coverage thresholds
  - Review new accuracy in reports

### Vitest 4.0 Breaking Changes

#### 1. Configuration Options Removed (BREAKING)
The following config options removed:

**a) poolMatchGlobs (removed)**
- **Old**: Match test files to specific pools via globs
- **New**: Use `projects` instead
- **Impact**: NONE (not currently used)
- **Action Required**: None

**b) environmentMatchGlobs (removed)**
- **Old**: Match test files to environments via globs
- **New**: Use `projects` instead
- **Impact**: NONE (not currently used)
- **Action Required**: None

**c) deps.external, deps.inline, deps.fallbackCJS (removed)**
- **Old**: `deps.*` configuration
- **New**: `server.deps.*` configuration
- **Impact**: NONE (not currently used explicitly)
- **Action Required**: None (handled by defaults)

**d) browser.testerScripts (removed)**
- **Old**: Array of tester scripts
- **New**: Use `browser.testerHtmlPath` instead
- **Impact**: NONE (not using browser mode)
- **Action Required**: None

**e) minWorkers (removed)**
- **Old**: Configure minimum worker count
- **New**: Only `maxWorkers` affects worker count
- **Impact**: LOW (relying on defaults)
- **Action Required**: None

#### 2. Test API Changes (CRITICAL)
- **Change**: Test options argument position
- **Old**: `test('name', fn, { timeout: 1000 })` (third argument)
- **New**: `test('name', { timeout: 1000 }, fn)` (second argument)
- **Impact**: HIGH - Must update all tests with options
- **Action Required**:
  - Search for test options usage: grep for `test\(.*,.*,.*{`
  - Update argument order
  - Current project: Review 24 test files

#### 3. Browser Mode Provider Changes
- **Change**: Browser providers now separate packages
- **Old**: Built-in providers
- **New**: Install @vitest/browser-playwright, @vitest/browser-webdriverio, or @vitest/browser-preview
- **Impact**: NONE (not using browser mode)
- **Action Required**: None

#### 4. Mock Behavior Changes

**a) vi.fn().getMockName() Default**
- **Old**: Returns 'spy'
- **New**: Returns 'vi.fn()'
- **Impact**: LOW - Only affects mock name assertions
- **Action Required**: Update if testing mock names

**b) Automocked Getters**
- **Old**: Varied behavior
- **New**: Return `undefined` by default
- **Impact**: LOW - Only if using automocking
- **Action Required**: Review automocked objects

#### 5. Vitest 4.0 Requires Vite 7.0+
- **Compatibility**: Vitest 4.0 requires Vite 7.0+
- **Previous**: Vitest 3.2+ supports Vite 7
- **Impact**: MEDIUM - Must upgrade both together
- **Action Required**: Upgrade in correct order (Vite first, then Vitest)

### Vitest Configuration Changes Required

```typescript
// vite.config.ts - Updated Vitest configuration
export default defineConfig({
  test: {
    // Specify pool explicitly (new default is 'forks')
    pool: 'forks', // or 'threads' to maintain old behavior

    // Pool-specific options
    poolOptions: {
      forks: {
        singleFork: false,
      },
      threads: {
        singleThread: false,
      }
    },

    // Hook execution (new default is serial)
    sequence: {
      hooks: 'serial', // or 'parallel' to revert
    },

    // Globals and environment
    globals: true,
    environment: 'jsdom', // or 'happy-dom' for speed
    setupFiles: './tests/setup.ts',
    css: true,

    // Coverage configuration (updated for v3+)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],

      // Note: ignoreEmptyLines removed (always true now)
      // Note: experimentalAstAwareRemapping removed (always enabled)

      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
      ],

      // ignoreClassMethods now supported in v8
      ignoreClassMethods: [], // Add if needed
    },
  },
})
```

---

## Part 3: Plugin Compatibility

### @vitejs/plugin-react (4.7.0 → 5.1.0)

#### Compatibility Status
- **Vite 6**: Compatible with @vitejs/plugin-react 5.x
- **Vite 7**: Fully compatible (warning removed in testing)
- **Current Version**: 4.7.0 (for Vite 4/5)
- **Target Version**: 5.1.0 (for Vite 6/7)

#### Breaking Changes
- **Version 5.0**: Requires Vite 5+
- **Peer Dependencies**: Vite 6/7 requires plugin-react 5.x
- **Impact**: MEDIUM - Must upgrade plugin with Vite
- **Action Required**: Update in package.json
  ```json
  {
    "devDependencies": {
      "@vitejs/plugin-react": "^5.1.0"
    }
  }
  ```

#### Features in 5.x
- React Fast Refresh improvements
- Better error messages
- Optimized HMR performance
- Rolldown compatibility

### happy-dom (12.10.3 → latest)

#### Compatibility Status
- **Vitest 4.0**: Fully compatible
- **Alternative**: jsdom (current project uses jsdom)
- **Recommendation**: Continue using jsdom for accuracy

#### Key Differences
- **happy-dom**: Faster, fewer APIs
- **jsdom**: More accurate, more APIs, slightly slower
- **Current Choice**: jsdom (good for this project)
- **Action Required**: None (keep jsdom) or upgrade happy-dom if switching

### Other Dependencies

#### @testing-library/jest-dom (6.2.0)
- **Status**: Compatible with Vitest 4.0
- **Action**: Update to latest (likely 6.x)

#### @testing-library/react (14.1.2)
- **Status**: Compatible with React 18 and Vitest 4
- **Action**: Update to latest 14.x or 15.x

#### @testing-library/user-event (14.5.2)
- **Status**: Compatible
- **Action**: Update to latest 14.x

#### msw (2.0.11)
- **Status**: MSW 2.x compatible with Vitest 4
- **Action**: Update to latest 2.x

---

## Part 4: Configuration Migration

### package.json Updates

```json
{
  "engines": {
    "node": ">=20.19.0 || >=22.12.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:watch": "vitest --watch",
    "test:update-snapshots": "vitest --update-snapshots",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.0",
    "@vitest/coverage-v8": "^4.0.8",
    "@vitest/ui": "^4.0.8",
    "vite": "^7.2.2",
    "vitest": "^4.0.8",
    "happy-dom": "^15.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2"
  }
}
```

### vite.config.ts Complete Updated Configuration

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'baseline-widely-available', // Vite 7 default
  },

  test: {
    // Pool configuration (Vitest 2.0+)
    pool: 'forks', // Changed from 'threads'

    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

    // Hook execution
    sequence: {
      hooks: 'serial', // New default in Vitest 2.0
    },

    // Environment and globals
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
      ],
      // Note: ignoreEmptyLines removed (default: true)
      // Note: experimentalAstAwareRemapping removed (always enabled)
    },
  },
})
```

### tsconfig.json Considerations

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    // ... rest stays same
  }
}
```

**Notes**:
- ES2020 target compatible with new browser baseline
- No changes needed for Vite/Vitest upgrades
- Path aliases remain compatible

---

## Part 5: Migration Strategy

### Option A: Incremental Migration (Lower Risk, More Time)

**Approach**: Upgrade one major version at a time, testing at each step.

**Steps**:
1. **Phase 1: Vite 5 → 6**
   - Update Vite to 6.x
   - Update @vitejs/plugin-react to 5.x
   - Test build and dev server
   - Commit

2. **Phase 2: Vitest 1 → 2**
   - Update Vitest to 2.x
   - Update coverage and UI packages
   - Update test configuration
   - Run all tests
   - Update snapshots
   - Commit

3. **Phase 3: Vitest 2 → 3**
   - Update Vitest to 3.x
   - Review coverage changes (AST-based)
   - Adjust coverage thresholds
   - Commit

4. **Phase 4: Vite 6 → 7**
   - Update Node.js to 20.19+
   - Update Vite to 7.x
   - Test with Rolldown bundler
   - Verify build outputs
   - Commit

5. **Phase 5: Vitest 3 → 4**
   - Update Vitest to 4.x
   - Update test options syntax
   - Final test suite validation
   - Commit

**Pros**:
- Lower risk of breaking multiple things
- Easier to identify which upgrade caused issues
- Can rollback individual steps
- More commits = better history

**Cons**:
- More time-consuming (12-15 days)
- More intermediate testing needed
- May need temporary workarounds

**Recommended For**: Production environments, critical projects, teams with limited testing resources

---

### Option B: Direct Jump (Higher Risk, Less Time) - RECOMMENDED

**Approach**: Upgrade Vite and Vitest to latest versions simultaneously with comprehensive testing.

**Steps**:
1. **Phase 1: Preparation (Day 1)**
   - Create feature branch
   - Backup current state
   - Update Node.js to 20.19+ or 22.12+
   - Review all migration guides
   - Document current test results baseline

2. **Phase 2: Package Updates (Day 2)**
   - Update all packages in package.json:
     ```bash
     npm install --save-dev \
       vite@^7.2.2 \
       vitest@^4.0.8 \
       @vitejs/plugin-react@^5.1.0 \
       @vitest/coverage-v8@^4.0.8 \
       @vitest/ui@^4.0.8 \
       happy-dom@^15.0.0
     ```
   - Update vite.config.ts with all changes
   - Commit: "chore: update Vite and Vitest to latest versions"

3. **Phase 3: Configuration Migration (Day 3)**
   - Update vite.config.ts:
     - Add pool: 'forks'
     - Add sequence.hooks: 'serial'
     - Update coverage config
     - Remove deprecated options
   - Update package.json engines field
   - Commit: "chore: migrate Vite and Vitest configurations"

4. **Phase 4: Test Suite Updates (Days 4-5)**
   - Review all 24 test files
   - Update test options syntax (if used)
   - Fix any test-specific issues
   - Run: `npm run test:update-snapshots`
   - Review snapshot changes
   - Commit: "test: update tests for Vitest 4 compatibility"

5. **Phase 5: Build Validation (Day 6)**
   - Run: `npm run build`
   - Verify build outputs
   - Test dev server: `npm run dev`
   - Test preview: `npm run preview`
   - Monitor memory usage and build speed
   - Document performance improvements

6. **Phase 6: Test Suite Validation (Days 7-8)**
   - Run full test suite: `npm run test`
   - Run with UI: `npm run test:ui`
   - Run coverage: `npm run test:coverage`
   - Review coverage report changes
   - Adjust coverage thresholds if needed
   - Run integration tests
   - Run e2e tests (Playwright)

7. **Phase 7: Performance Testing (Day 9)**
   - Measure build times (before/after)
   - Measure test execution times
   - Measure dev server HMR performance
   - Measure memory usage
   - Document improvements

8. **Phase 8: Rollback Testing (Day 10)**
   - Test rollback procedure
   - Document rollback steps
   - Ensure git history allows clean rollback

9. **Phase 9: Documentation & Review (Day 11)**
   - Update project documentation
   - Document any workarounds
   - Create PR with detailed description
   - Team code review

10. **Phase 10: Merge & Monitor (Day 12)**
    - Merge to main/master
    - Monitor CI/CD pipeline
    - Monitor production builds
    - Be ready for quick rollback if needed

**Pros**:
- Faster overall (10-12 days)
- Single large change = one PR to review
- Latest features immediately available
- Less intermediate state management

**Cons**:
- Higher risk if issues occur
- Harder to pinpoint exact cause of issues
- Larger rollback if needed
- More comprehensive testing required

**Recommended For**: This project (non-production or with good test coverage), agile teams, projects needing latest features

---

### Rollback Procedures

#### Quick Rollback (Git)
```bash
# If changes not yet merged
git checkout main
git branch -D upgrade/vite-vitest

# If merged but issues found
git revert <merge-commit-hash>

# Or hard reset (if safe)
git reset --hard <commit-before-upgrade>
```

#### Package Rollback
```bash
# Restore previous versions
npm install --save-dev \
  vite@5.4.21 \
  vitest@1.6.1 \
  @vitejs/plugin-react@4.7.0 \
  @vitest/coverage-v8@1.6.1 \
  @vitest/ui@1.6.1
```

#### Configuration Rollback
- Keep backup of vite.config.ts
- Revert package.json changes
- Restore test snapshots

---

## Part 6: Test Suite Updates

### Current Test Structure
- **Total Test Files**: 24
- **Test Categories**:
  - Unit tests (tests/unit/): Document upload, annotation system, paragraph linking, project management, sharing, citation export, logger, ML features, citation formats, components
  - Integration tests (tests/integration/): Sharing flow, logger integration
- **Test Environment**: jsdom
- **Setup File**: tests/setup.ts
- **Current Mocks**: Logger, Supabase, IntersectionObserver, ResizeObserver, matchMedia

### Changes Required

#### 1. Test Options Syntax (Vitest 4.0)
**Before**:
```typescript
test('should do something', async () => {
  // test code
}, { timeout: 10000 })
```

**After**:
```typescript
test('should do something', { timeout: 10000 }, async () => {
  // test code
})
```

**Impact**: MEDIUM - Need to search all test files
**Search Command**:
```bash
grep -rn "test\|it" tests/ | grep -E ",\s*{\s*(timeout|retry|concurrent)"
```

#### 2. Concurrent Test Behavior
**Review**: Tests using `describe.concurrent` or `test.concurrent`
**Current Project**: Check for concurrent tests with shared state
**Action**:
- Review concurrent tests in annotation-system.test.ts
- Ensure no race conditions
- Add proper test isolation if needed

#### 3. Mock Results Access
**Before**:
```typescript
const result = mockFn.mock.results[0]
```

**After (for async)**:
```typescript
const result = mockFn.mock.settledResults[0]
// Or use new matchers:
expect(mockFn).toHaveResolvedWith(expectedValue)
```

**Impact**: LOW - Only if accessing mock results directly
**Action**: Search for `.mock.results` usage

#### 4. Snapshot Updates
**Action Required**:
```bash
npm run test:update-snapshots
# or
vitest --update-snapshots
```

**Impact**: MEDIUM - All snapshots will change format
**Review**: Manually review snapshot changes before committing
**Files Affected**: Any test using `toMatchSnapshot()` or `toMatchInlineSnapshot()`

#### 5. Coverage Threshold Adjustments
**Reason**:
- ignoreEmptyLines now true by default (more accurate)
- AST-based remapping (more accurate, fewer false positives)
- Coverage percentages will likely increase

**Action**:
1. Run coverage after upgrade
2. Review new coverage percentages
3. Adjust thresholds in configuration if needed:
   ```typescript
   coverage: {
     thresholds: {
       lines: 80, // Adjust based on new reports
       functions: 80,
       branches: 80,
       statements: 80
     }
   }
   ```

#### 6. Test Setup File Review
**File**: tests/setup.ts

**Current Setup**:
- @testing-library/jest-dom imports
- afterEach cleanup
- Logger mocks
- Supabase mocks
- Global object mocks

**Changes Needed**:
- Verify compatibility with Vitest 4.0
- No major changes expected
- Test that mocks still work properly

---

## Part 7: Performance Impact

### Expected Improvements

#### Build Performance (Vite 7 - Rolldown)
**Before (Vite 5)**:
- Cold build: ~10-30s (typical React app)
- Incremental build: ~2-5s
- Memory usage: ~500MB-1GB

**Expected After (Vite 7)**:
- Cold build: ~5-15s (30-50% faster)
- Incremental build: ~1-3s (40-60% faster)
- Memory usage: ~100-500MB (up to 100× reduction reported)
- HMR: Even faster (sub-second updates)

#### Test Execution (Vitest 4)
**Before (Vitest 1)**:
- Full test suite: Variable (baseline needed)
- Test isolation: Good
- Coverage generation: ~2-5s overhead

**Expected After (Vitest 4)**:
- Full test suite: Similar or slightly faster
- Test isolation: Better (forks pool)
- Coverage generation: Faster with AST-based remapping
- UI improvements: Better developer experience

### Performance Monitoring

#### Metrics to Track
1. **Build Metrics**:
   ```bash
   # Before upgrade
   time npm run build

   # After upgrade
   time npm run build
   ```
   - Track: Total time, memory usage (use `ps` or Activity Monitor)

2. **Test Metrics**:
   ```bash
   # Before
   time npm run test
   time npm run test:coverage

   # After
   time npm run test
   time npm run test:coverage
   ```
   - Track: Total time, individual test times, coverage time

3. **Dev Server Metrics**:
   - Cold start time
   - HMR update time
   - Memory usage over time

#### Performance Benchmarking Script

```bash
#!/bin/bash
# perf-benchmark.sh

echo "=== Performance Benchmark ==="
echo "Date: $(date)"
echo "Node: $(node --version)"
echo "Vite: $(npm list vite --depth=0)"
echo "Vitest: $(npm list vitest --depth=0)"
echo ""

echo "=== Build Performance ==="
time npm run build
echo ""

echo "=== Test Performance ==="
time npm run test:unit
echo ""

echo "=== Coverage Performance ==="
time npm run test:coverage
echo ""

echo "=== Build Size ==="
du -sh dist/
echo ""
```

**Usage**:
```bash
# Before upgrade
./perf-benchmark.sh > perf-before.txt

# After upgrade
./perf-benchmark.sh > perf-after.txt

# Compare
diff perf-before.txt perf-after.txt
```

---

## Part 8: CI/CD Impact

### GitHub Actions Updates

#### Node.js Version
**Required Change**: Update Node.js version in workflows

**Before**:
```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '18'
```

**After**:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.19'
    # Or use matrix for multiple versions:
    # node-version: ['20.19', '22.12']
```

#### Cache Strategy
**Update**: Cache keys should include new versions

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}-v7-vitest4
```

#### Test Workflow Updates
```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.19, 22.12]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Run coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

#### Build Workflow
```yaml
name: Build
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.19'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check build size
        run: du -sh dist/
```

### Other CI/CD Platforms

#### GitLab CI
```yaml
image: node:20.19

test:
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'

build:
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
```

#### CircleCI
```yaml
version: 2.1

orbs:
  node: circleci/node@5.0.0

jobs:
  test:
    executor:
      name: node/default
      tag: '20.19'
    steps:
      - checkout
      - node/install-packages
      - run: npm run test:coverage
      - store_artifacts:
          path: coverage

  build:
    executor:
      name: node/default
      tag: '20.19'
    steps:
      - checkout
      - node/install-packages
      - run: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist
```

---

## Part 9: Known Issues & Workarounds

### Issue 1: Node.js Version Compatibility
**Problem**: Node.js 18 no longer supported
**Workaround**: None - must upgrade to 20.19+/22.12+
**Solution**: Update all environments

### Issue 2: Test Options Syntax
**Problem**: Old test options syntax deprecated
**Workaround**: Can continue using old syntax temporarily (deprecated warning)
**Solution**: Update all test files to new syntax

### Issue 3: Snapshot Format Changes
**Problem**: All snapshots reformatted
**Workaround**: None - intended behavior
**Solution**: Review and commit updated snapshots carefully

### Issue 4: Coverage Percentage Changes
**Problem**: Coverage percentages increase
**Workaround**: Adjust thresholds temporarily
**Solution**: Accept new baselines as more accurate

### Issue 5: Rolldown Bundler Edge Cases
**Problem**: Some plugins may not work with Rolldown
**Workaround**: Report issues to Vite team
**Solution**: Wait for ecosystem updates or use Vite 6 temporarily

### Issue 6: Concurrent Test Race Conditions
**Problem**: Concurrent tests may fail after Vitest 2.0 changes
**Workaround**: Disable concurrency: Remove `.concurrent`
**Solution**: Fix test isolation and shared state issues

### Issue 7: Mock Results Breaking
**Problem**: Accessing `.mock.results` on async functions fails
**Workaround**: Use `.mock.settledResults` instead
**Solution**: Update all mock result accesses

### Issue 8: Custom Vite Plugins
**Problem**: Custom plugins may need updates for Vite 6/7
**Workaround**: Check plugin compatibility
**Solution**: Update plugins or find alternatives

---

## Part 10: Timeline & Resource Requirements

### Detailed Timeline (Option B - Direct Jump)

#### Week 1: Preparation & Upgrade

**Day 1 (Planning & Setup) - 6 hours**
- Morning (3h): Environment preparation
  - Install Node.js 20.19+ locally
  - Create feature branch
  - Review migration guides
  - Document current state
- Afternoon (3h): Testing baseline
  - Run and document current build times
  - Run and document current test times
  - Create performance baseline
  - Document current coverage percentages

**Day 2 (Package Updates) - 8 hours**
- Morning (4h): Package upgrades
  - Update all packages in package.json
  - Run npm install
  - Resolve any dependency conflicts
  - Test basic dev server
- Afternoon (4h): Configuration migration
  - Update vite.config.ts
  - Update package.json scripts
  - Update engines field
  - Commit changes

**Day 3 (Configuration Testing) - 8 hours**
- Morning (4h): Build validation
  - Test dev server
  - Test production build
  - Test preview mode
  - Check bundle outputs
- Afternoon (4h): Initial test runs
  - Run test suite
  - Document failures
  - Begin test fixes
  - Update configuration as needed

**Day 4 (Test Suite Updates) - 8 hours**
- Full day: Test file updates
  - Review all 24 test files
  - Update test options syntax
  - Fix test-specific issues
  - Run tests iteratively
  - Document issues

**Day 5 (Test Suite Completion) - 8 hours**
- Morning (4h): Snapshot updates
  - Run snapshot updates
  - Review all snapshot changes
  - Verify snapshot accuracy
  - Commit snapshot updates
- Afternoon (4h): Coverage review
  - Run coverage tests
  - Review coverage changes
  - Adjust thresholds
  - Document new baselines

#### Week 2: Validation & Deployment

**Day 6 (Integration Testing) - 8 hours**
- Morning (4h): Integration tests
  - Run integration test suite
  - Fix integration issues
  - Test all workflows end-to-end
- Afternoon (4h): E2E testing
  - Run Playwright tests
  - Fix E2E issues
  - Test in multiple browsers

**Day 7 (Performance Testing) - 8 hours**
- Full day: Performance validation
  - Measure build performance
  - Measure test performance
  - Measure dev server performance
  - Document improvements
  - Create comparison report

**Day 8 (CI/CD Updates) - 6 hours**
- Morning (3h): CI/CD configuration
  - Update GitHub Actions workflows
  - Update Node.js versions
  - Update cache strategies
- Afternoon (3h): CI/CD testing
  - Test workflows in feature branch
  - Verify all checks pass
  - Document any issues

**Day 9 (Documentation) - 6 hours**
- Morning (3h): Documentation updates
  - Update README
  - Document breaking changes
  - Update developer guides
  - Create migration notes
- Afternoon (3h): PR preparation
  - Write detailed PR description
  - Create checklist
  - Tag reviewers
  - Request reviews

**Day 10 (Review & Buffer) - 6 hours**
- Full day: Code review and adjustments
  - Address review comments
  - Make final adjustments
  - Re-run tests
  - Buffer for unexpected issues

**Day 11 (Rollback Testing) - 4 hours**
- Morning (2h): Rollback procedure
  - Test rollback steps
  - Document rollback process
  - Verify clean rollback
- Afternoon (2h): Final validation
  - Final test run
  - Final build validation
  - Green light for merge

**Day 12 (Deployment) - 4 hours**
- Morning (2h): Merge and monitor
  - Merge to main
  - Monitor CI/CD
  - Watch for issues
- Afternoon (2h): Post-deployment
  - Monitor production builds
  - Verify no regressions
  - Close tickets

**Total: 78 hours (~ 10 working days)**

### Resource Requirements

#### Human Resources
- **Primary Developer**: 1 full-time (10 days)
- **Code Reviewer**: 0.25 full-time (4-6 hours review time)
- **QA/Testing**: 0.5 full-time (if available, for parallel testing)
- **DevOps**: 0.25 full-time (CI/CD updates and monitoring)

#### Technical Requirements
- Node.js 20.19+ or 22.12+ installation
- Local development environment
- Access to CI/CD pipelines
- Git repository access
- Testing environments

#### Knowledge Requirements
- Understanding of Vite/Vitest architecture
- React and TypeScript proficiency
- Testing best practices
- Build tool configuration
- CI/CD workflows

---

## Part 11: Risk Assessment & Mitigation

### Risk Matrix

| Risk | Probability | Impact | Severity | Mitigation |
|------|------------|--------|----------|------------|
| Node.js upgrade issues | Low | High | MEDIUM | Test in development first, document upgrade steps |
| Test suite failures | Medium | Medium | MEDIUM | Comprehensive testing, backup current state |
| Build failures | Low | High | MEDIUM | Incremental testing, rollback plan ready |
| Coverage drops | Medium | Low | LOW | Accept as more accurate, adjust thresholds |
| Plugin incompatibilities | Low | Medium | LOW | Research plugins beforehand, have alternatives |
| Rolldown bundler issues | Low | Medium | LOW | Monitor outputs, report bugs, can downgrade |
| CI/CD pipeline breaks | Medium | High | MEDIUM | Test in feature branch first, staged rollout |
| Snapshot conflicts | High | Low | LOW | Careful review, team communication |
| Performance regressions | Very Low | Medium | LOW | Benchmark before/after, highly unlikely |
| Production deployment issues | Low | High | MEDIUM | Staging environment testing, quick rollback plan |

### Mitigation Strategies

#### Strategy 1: Comprehensive Testing
- Test in development environment first
- Run full test suite at each step
- Validate all test types (unit, integration, e2e)
- Performance benchmarking
- Browser testing

#### Strategy 2: Staged Rollout
1. Local development testing
2. Feature branch + CI/CD testing
3. Staging environment deployment (if available)
4. Production deployment
5. Monitoring period

#### Strategy 3: Quick Rollback Plan
- Git tags before merge
- Documented rollback procedure
- Package.json backup
- Configuration backups
- Ability to deploy previous version quickly

#### Strategy 4: Communication
- Team notification before upgrade
- Status updates during process
- Document all issues and resolutions
- Post-mortem if major issues occur

#### Strategy 5: Buffer Time
- 20% buffer added to timeline
- Flexibility for unexpected issues
- No deadline pressure during upgrade
- Ability to pause and investigate

---

## Part 12: Success Criteria

### Must-Have (Blocking)
- [ ] All packages upgraded to target versions
- [ ] All tests passing (24 test files)
- [ ] Build successful (dev, build, preview)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Coverage at or above previous levels (accounting for new accuracy)
- [ ] All snapshots reviewed and updated
- [ ] CI/CD pipeline passing
- [ ] Node.js version updated everywhere
- [ ] Configuration files updated

### Nice-to-Have (Non-Blocking)
- [ ] Performance improvements documented
- [ ] Build time reduction measured
- [ ] Test execution time maintained or improved
- [ ] Memory usage reduction observed
- [ ] Developer experience improvements noted
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Migration guide created for future reference

### Quality Gates
1. **Zero Test Failures**: All tests must pass
2. **Zero Build Errors**: Production build must succeed
3. **Coverage Maintained**: Coverage ≥ previous baseline (adjusted)
4. **Performance Check**: No significant regressions
5. **CI/CD Green**: All pipeline checks passing

---

## Part 13: Post-Upgrade Checklist

### Immediate (Day 1 After Merge)
- [ ] Monitor CI/CD builds
- [ ] Check for error reports
- [ ] Verify production builds
- [ ] Monitor performance metrics
- [ ] Watch for user-reported issues

### Short-term (Week 1)
- [ ] Gather team feedback
- [ ] Document any workarounds needed
- [ ] Address any minor issues
- [ ] Update documentation as needed
- [ ] Create knowledge base article

### Long-term (Month 1)
- [ ] Review performance improvements
- [ ] Analyze build time improvements
- [ ] Evaluate new Vite 7 features for adoption
- [ ] Consider enabling experimental features
- [ ] Plan for next upgrade cycle

---

## Part 14: References & Resources

### Official Documentation
- [Vite 7 Announcement](https://vite.dev/blog/announcing-vite7)
- [Vite Migration Guide (v5 → v6)](https://v6.vite.dev/guide/migration)
- [Vite Migration Guide (v6 → v7)](https://vite.dev/guide/migration)
- [Vite Breaking Changes](https://vite.dev/changes/)
- [Vitest 4 Announcement](https://vitest.dev/blog/vitest-4)
- [Vitest 3 Announcement](https://vitest.dev/blog/vitest-3)
- [Vitest Migration Guide](https://vitest.dev/guide/migration)
- [Vitest 2.0 Migration](https://v2.vitest.dev/guide/migration)
- [@vitejs/plugin-react Releases](https://github.com/vitejs/vite-plugin-react/releases)

### GitHub Releases
- [Vite Releases](https://github.com/vitejs/vite/releases)
- [Vitest Releases](https://github.com/vitest-dev/vitest/releases)
- [Vite 7 Discussion](https://github.com/vitejs/vite/discussions/15886)

### Community Resources
- [Vite Discord](https://chat.vitejs.dev/)
- [Vitest Discord](https://chat.vitest.dev/)
- [Stack Overflow - Vite](https://stackoverflow.com/questions/tagged/vite)
- [Stack Overflow - Vitest](https://stackoverflow.com/questions/tagged/vitest)

### Performance & Benchmarks
- [Rolldown Announcement](https://rolldown.rs/)
- [Vite 7 Performance Analysis](https://vite.dev/blog/announcing-vite7#performance)
- [AST-based Coverage in Vitest](https://vitest.dev/guide/coverage)

### Troubleshooting
- [Vite Troubleshooting](https://vitejs.dev/guide/troubleshooting)
- [Vitest Common Errors](https://vitest.dev/guide/common-errors)
- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)

---

## Part 15: Decision & Recommendation

### Recommended Approach: Option B (Direct Jump)

**Reasoning**:
1. **Mature Ecosystem**: Both Vite 7 and Vitest 4 are stable releases
2. **Good Test Coverage**: 24 test files provide safety net
3. **Clear Migration Guides**: Well-documented upgrade paths
4. **Significant Benefits**: Performance improvements worth the effort
5. **Manageable Scope**: 10-12 days is reasonable for 2+3 major versions
6. **Low Production Risk**: Can test thoroughly before production deployment

### Timeline: 10-12 Working Days

**Breakdown**:
- Days 1-2: Preparation and package updates
- Days 3-5: Configuration and test suite updates
- Days 6-7: Validation and performance testing
- Days 8-9: CI/CD and documentation
- Days 10-12: Review, rollback testing, deployment

### Go/No-Go Decision Points

**Go Ahead If**:
- Team has 10-12 days available
- Node.js 20.19+/22.12+ can be deployed everywhere
- Stakeholders approve timeline
- No production freeze/critical releases pending
- Test suite has good coverage

**Wait/Reconsider If**:
- Critical production releases imminent
- Cannot upgrade Node.js version
- Team bandwidth insufficient
- Major features in parallel development
- Unstable current test suite

### Expected Outcomes

**Positive**:
- 30-50% faster builds (Rolldown)
- Up to 100× memory reduction
- More accurate test coverage
- Latest features and security updates
- Better developer experience
- Future-proof for next 12-18 months

**Challenges**:
- Initial time investment
- Team learning curve
- Snapshot updates review
- Coverage threshold adjustments
- Potential minor issues to resolve

### Final Recommendation

**PROCEED with Option B (Direct Jump)** given:
- Clear migration paths exist
- Benefits significantly outweigh risks
- Project has good test coverage
- Timeline is reasonable
- Rollback plan is solid
- Team has capability

**Action**: Create feature branch and begin Phase 1 when ready.

---

## Appendix A: Command Reference

### Upgrade Commands
```bash
# Update Node.js (using nvm)
nvm install 20.19
nvm use 20.19

# Or install Node.js 22
nvm install 22.12
nvm use 22.12

# Update packages
npm install --save-dev \
  vite@^7.2.2 \
  vitest@^4.0.8 \
  @vitejs/plugin-react@^5.1.0 \
  @vitest/coverage-v8@^4.0.8 \
  @vitest/ui@^4.0.8 \
  happy-dom@^15.0.0

# Update testing libraries
npm install --save-dev \
  @testing-library/jest-dom@^6.5.0 \
  @testing-library/react@^16.0.0

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run coverage
npm run test:coverage

# Update snapshots
npm run test:update-snapshots
# or
vitest --update-snapshots
vitest -u

# Run specific test file
vitest tests/unit/annotation-system.test.ts

# Run tests in watch mode
npm run test:watch
```

### Build Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Debugging Commands
```bash
# Check package versions
npm list vite vitest

# Check for outdated packages
npm outdated

# View package info
npm info vite
npm info vitest

# Check Node.js version
node --version

# Check npm version
npm --version
```

### Performance Benchmarking
```bash
# Build time
time npm run build

# Test time
time npm run test

# Coverage time
time npm run test:coverage

# Build size
du -sh dist/
```

---

## Appendix B: Quick Reference Checklist

### Pre-Upgrade
- [ ] Review this document completely
- [ ] Get team/stakeholder approval
- [ ] Create feature branch
- [ ] Document current performance baseline
- [ ] Backup configuration files
- [ ] Update Node.js to 20.19+/22.12+
- [ ] Verify CI/CD can use new Node.js version

### Upgrade Process
- [ ] Update package.json dependencies
- [ ] Run npm install
- [ ] Update vite.config.ts
- [ ] Update package.json engines
- [ ] Update test files (if using options)
- [ ] Update snapshots
- [ ] Update CI/CD workflows
- [ ] Test dev server
- [ ] Test build
- [ ] Run all tests
- [ ] Run coverage
- [ ] Performance benchmarking

### Validation
- [ ] All 24 test files passing
- [ ] Build succeeds
- [ ] Coverage meets thresholds
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] CI/CD pipeline passing
- [ ] Performance improved or maintained
- [ ] Snapshots reviewed

### Post-Upgrade
- [ ] Update documentation
- [ ] Create PR with detailed description
- [ ] Code review completed
- [ ] Merge to main
- [ ] Monitor CI/CD
- [ ] Monitor production builds
- [ ] Team notification
- [ ] Knowledge sharing

---

## Document Version

**Version**: 1.0
**Date**: 2025-11-10
**Author**: Vite/Vitest Upgrade Planning Agent
**Status**: Ready for Implementation

**Change Log**:
- v1.0 (2025-11-10): Initial comprehensive upgrade plan

---

**END OF DOCUMENT**
