# Chakra UI v3 Migration Plan

## Executive Summary

### Version Information
- **Current Version:** @chakra-ui/react 2.8.2
- **Target Version:** @chakra-ui/react 3.29.0 (latest as of November 2025)
- **Migration Type:** MAJOR version upgrade with breaking changes

### Impact Assessment: **HIGH**

This is a complete rewrite of Chakra UI with significant architectural changes:
- New theming system based on `createSystem` and `defaultConfig`
- Component API changes (prop renames, hook migrations)
- Dependency changes (removal of `@emotion/styled` and `framer-motion`)
- Migration from hook-based to snippet-based patterns for some components (e.g., Toast)
- Performance improvements (4x reconciliation, 1.6x re-render)
- 25+ new components added

### Risk Level: **MEDIUM-HIGH**

**Risks:**
- Breaking changes to component APIs across entire codebase
- Toast functionality requires complete refactoring (hook → snippet)
- Theme/provider setup requires rewrite
- Potential runtime errors if not thoroughly tested
- No automated migration tool (codemod) available

**Mitigations:**
- Comprehensive testing at each phase
- Feature flags for gradual rollout
- Rollback plan with version pinning
- Staged migration approach

### Estimated Timeline: **3-5 days**

- **Phase 1:** Research and Preparation (1 day)
- **Phase 2:** Core Updates (2-3 days)
- **Phase 3:** Testing and Validation (1 day)

---

## Breaking Changes Analysis

### 1. Dependencies

#### Packages to Remove
```bash
npm uninstall @emotion/styled framer-motion
```

**Reason:** Chakra UI v3 no longer depends on these packages:
- `@emotion/styled`: Removed in favor of internal styling system
- `framer-motion`: Removed - v3 uses CSS animations instead

#### Packages to Update
```bash
npm install @chakra-ui/react@latest @emotion/react@latest
```

**Current:**
- `@chakra-ui/react`: 2.8.2
- `@emotion/react`: 11.11.3

**Target:**
- `@chakra-ui/react`: 3.29.0
- `@emotion/react`: latest

#### Node Version Requirement
- **Minimum:** Node 20.x
- **Current Project:** Verify with `node --version`

### 2. Provider Setup Changes

#### Current (v2)
```tsx
// src/main.tsx
import { ChakraProvider } from '@chakra-ui/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)
```

#### Required (v3)
```tsx
// src/theme.ts (NEW FILE)
import { createSystem, defaultConfig } from "@chakra-ui/react"

export const system = createSystem(defaultConfig)

// src/main.tsx
import { ChakraProvider } from '@chakra-ui/react'
import { system } from './theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)
```

**Key Changes:**
- Rename `theme` prop to `value`
- Create system using `createSystem(defaultConfig)`
- Move theme configuration to separate file

### 3. Component API Changes

#### Prop Renames

| v2 Prop | v3 Prop | Component | Impact |
|---------|---------|-----------|--------|
| `noOfLines` | `lineClamp` | `Text` | HIGH - Used in ProjectDashboard.tsx (line 254) |
| `truncated` | `truncate` | `Text` | LOW - Not currently used |

**Search Pattern:** `noOfLines=\{`
**Files to Update:**
- `src/components/ProjectDashboard.tsx` (line 254)

### 4. Hook Changes

#### useToast: Hook → Snippet Pattern

**MAJOR CHANGE:** Toast is no longer a hook. It's now a snippet-based component.

**Current Usage (v2):**
```tsx
import { useToast } from '@chakra-ui/react';

const toast = useToast();

toast({
  title: 'Success',
  description: 'Action completed',
  status: 'success',
  duration: 3000,
  isClosable: true,
});
```

**Required (v3):**
```tsx
// Step 1: Run CLI to add toaster snippet
// npx @chakra-ui/cli snippet add toaster

// Step 2: Import toaster and Toaster component
import { Toaster, toaster } from '@/components/ui/toaster'

// Step 3: Add Toaster component to root layout
<ChakraProvider value={system}>
  <App />
  <Toaster />
</ChakraProvider>

// Step 4: Use toaster instead of toast hook
toaster.create({
  title: 'Success',
  description: 'Action completed',
  type: 'success',
  duration: 3000,
})
```

**Files Using useToast (14 total):**
1. `src/hooks/useParagraphAnnotations.ts`
2. `src/hooks/useAnnotationExport.ts`
3. `src/hooks/useAnnotationActions.ts`
4. `src/components/Paragraph.tsx`
5. `src/components/DocumentUpload.tsx`
6. `src/components/AnnotationToolbar.tsx`
7. `src/components/AnnotationReviewPanel.tsx`
8. `src/components/ProjectDashboard.tsx`
9. `src/components/AnnotationListItem.tsx`
10. `src/components/DocumentMetadataEditor.tsx`
11. `src/components/ShareLinkModal.tsx`
12. `src/components/ParagraphLinkingPanel.tsx`
13. `src/components/CitationExportModal.tsx`
14. `src/pages/LoginPage.tsx`

**API Differences:**
- `toast()` → `toaster.create()`
- `status` prop → `type` prop
- `isClosable` → May need different approach (check documentation)

#### useDisclosure: No Changes

**Status:** `useDisclosure` hook is still available in v3 with same API.

**Files Using useDisclosure (12 total):**
- `src/components/Paragraph.tsx`
- `src/components/AnnotationReviewPanel.tsx`
- `src/components/ProjectDashboard.tsx`
- `src/components/AnnotationListItem.tsx`
- `src/components/DocumentMetadataEditor.tsx`
- `src/components/ShareLinkModal.tsx`
- `src/components/ParagraphLinkingPanel.tsx`
- `src/components/CitationExportModal.tsx`
- And others

**Action:** No changes required

### 5. Other Removed Hooks

According to documentation, only these hooks are shipped in v3:
- `useBreakpointValue`
- `useCallbackRef`
- `useDisclosure` ✅ (we use this)
- `useControllableState`
- `useMediaQuery`

**Risk:** If project uses other Chakra hooks, they need replacement.

**Action Required:** Verify no other Chakra hooks are used beyond `useToast` and `useDisclosure`

### 6. Import Path Changes

**Status:** No import path changes detected. All imports remain from `@chakra-ui/react`.

### 7. Component Removals/Renames

Based on codebase analysis, no removed components detected. All used components exist in v3:
- `Box`, `VStack`, `HStack`, `Text`, `Button`, `Input`
- `Modal`, `ModalOverlay`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalCloseButton`
- `Card`, `CardBody`
- `Badge`, `Spinner`, `IconButton`, `Tooltip`
- `AlertDialog` + variants
- `Select`, `Textarea`
- `Grid`, `Divider`, `Collapse`
- `Menu`, `MenuButton`, `MenuList`, `MenuItem`
- `Stat`, `StatLabel`, `StatNumber`, `StatGroup`
- `Tabs`, `TabList`, `TabPanels`, `Tab`, `TabPanel`
- `FormControl`, `FormLabel`, `FormErrorMessage`
- `Container`, `Heading`, `Progress`, `Icon`

---

## Component Inventory

### Complete List of Chakra Components Used

Based on codebase scan:

#### Layout Components
- `Box` - Universal container (used extensively)
- `VStack` - Vertical stack (used extensively)
- `HStack` - Horizontal stack (used extensively)
- `Grid` - Grid layout
- `Container` - Responsive container
- `Divider` - Visual separator

#### Typography
- `Text` - Text component (REQUIRES UPDATE: `noOfLines` → `lineClamp`)
- `Heading` - Heading component

#### Form Components
- `Input` - Text input
- `Textarea` - Multi-line text input
- `Select` - Dropdown select
- `FormControl` - Form field wrapper
- `FormLabel` - Form field label
- `FormErrorMessage` - Error message display

#### Buttons
- `Button` - Standard button
- `IconButton` - Icon-only button

#### Feedback
- `Spinner` - Loading spinner
- `Progress` - Progress bar
- `Badge` - Status badge
- `Tooltip` - Hover tooltip
- **`useToast`** - Toast notifications (REQUIRES MIGRATION TO SNIPPET)

#### Overlay
- `Modal` + variants (Overlay, Content, Header, Body, Footer, CloseButton)
- `AlertDialog` + variants (Overlay, Content, Header, Body, Footer)
- `Menu` + variants (Button, List, Item)

#### Disclosure
- `Collapse` - Collapsible content
- **`useDisclosure`** - Disclosure state hook (NO CHANGES)

#### Data Display
- `Card`, `CardBody` - Card component
- `Stat`, `StatLabel`, `StatNumber`, `StatGroup` - Statistics
- `Tabs`, `TabList`, `TabPanels`, `Tab`, `TabPanel` - Tab navigation

#### Other
- `Icon` - Icon wrapper

### Components Requiring Updates

| Component | File(s) | Change Required | Priority |
|-----------|---------|-----------------|----------|
| `Text` with `noOfLines` | `ProjectDashboard.tsx` | `noOfLines={2}` → `lineClamp={2}` | HIGH |
| All `useToast` usages | 14 files | Migrate to `toaster` snippet | CRITICAL |
| `ChakraProvider` | `main.tsx`, `App.tsx` | Add `value={system}` prop | CRITICAL |

---

## Migration Strategy

### Phase 1: Preparation (1 day)

#### Step 1.1: Backup and Branch
```bash
git checkout -b feat/chakra-ui-v3-migration
git add .
git commit -m "chore: Checkpoint before Chakra UI v3 migration"
```

#### Step 1.2: Verify Node Version
```bash
node --version  # Must be 20.x or higher
nvm use 20      # If using nvm
```

#### Step 1.3: Update Dependencies
```bash
# Remove deprecated packages
npm uninstall @emotion/styled framer-motion

# Update Chakra and emotion
npm install @chakra-ui/react@latest @emotion/react@latest

# Verify versions
npm list @chakra-ui/react @emotion/react
```

#### Step 1.4: Install Chakra CLI (for snippets)
```bash
npx @chakra-ui/cli@latest
```

### Phase 2: Core Updates (2-3 days)

#### Step 2.1: Create Theme System (30 min)

**File:** `src/theme.ts` (NEW)
```tsx
import { createSystem, defaultConfig } from "@chakra-ui/react"

// Start with default config
// Can be extended later with custom config
export const system = createSystem(defaultConfig)
```

#### Step 2.2: Update Provider Setup (15 min)

**File:** `src/main.tsx`
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { system } from './theme'  // ADD
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={system}>  {/* UPDATE */}
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)
```

**File:** `src/App.tsx` (if ChakraProvider exists there)
- Remove duplicate `ChakraProvider` if present
- Keep only one provider at root level

#### Step 2.3: Add Toaster Snippet (30 min)

**Generate snippet:**
```bash
npx @chakra-ui/cli snippet add toaster
```

This will create:
- `src/components/ui/toaster.tsx`

**Update root layout:**
```tsx
// src/main.tsx
import { Toaster } from './components/ui/toaster'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <App />
      <Toaster />  {/* ADD */}
    </ChakraProvider>
  </React.StrictMode>,
)
```

#### Step 2.4: Migrate useToast to toaster (4-6 hours)

**For each of the 14 files:**

1. Replace import:
```tsx
// REMOVE
import { useToast } from '@chakra-ui/react';

// ADD
import { toaster } from '@/components/ui/toaster'
```

2. Remove hook call:
```tsx
// REMOVE
const toast = useToast();
```

3. Replace toast calls:
```tsx
// BEFORE
toast({
  title: 'Success',
  description: 'Action completed',
  status: 'success',
  duration: 3000,
  isClosable: true,
});

// AFTER
toaster.create({
  title: 'Success',
  description: 'Action completed',
  type: 'success',
  duration: 3000,
})
```

**Files to update (in order of complexity):**

**Simple files (1-2 toast calls each):**
1. `src/pages/LoginPage.tsx`
2. `src/components/ShareLinkModal.tsx`
3. `src/components/CitationExportModal.tsx`
4. `src/components/DocumentMetadataEditor.tsx`

**Medium files (3-5 toast calls):**
5. `src/components/DocumentUpload.tsx`
6. `src/components/ParagraphLinkingPanel.tsx`
7. `src/components/AnnotationToolbar.tsx`
8. `src/components/ProjectDashboard.tsx`

**Complex files (hooks/utilities):**
9. `src/hooks/useAnnotationActions.ts`
10. `src/hooks/useAnnotationExport.ts`
11. `src/hooks/useParagraphAnnotations.ts`
12. `src/components/AnnotationListItem.tsx`
13. `src/components/AnnotationReviewPanel.tsx`
14. `src/components/Paragraph.tsx`

**Toast API Mapping:**

| v2 Property | v3 Property | Notes |
|-------------|-------------|-------|
| `status` | `type` | Values: 'success', 'error', 'info', 'warning' |
| `title` | `title` | No change |
| `description` | `description` | No change |
| `duration` | `duration` | No change |
| `isClosable` | - | Check v3 docs for equivalent |
| `position` | `placement` | May have different values |

#### Step 2.5: Update Text Component Props (15 min)

**File:** `src/components/ProjectDashboard.tsx`

**Line 254-256:**
```tsx
// BEFORE
<Text fontSize="sm" color="gray.600" noOfLines={2}>
  {project.description}
</Text>

// AFTER
<Text fontSize="sm" color="gray.600" lineClamp={2}>
  {project.description}
</Text>
```

**Search for other instances:**
```bash
grep -rn "noOfLines" src/
grep -rn "truncated" src/
```

#### Step 2.6: Verify No Other Breaking Changes (1 hour)

**Check for:**
1. Custom theme files (we don't have any currently)
2. Other deprecated props
3. Removed hooks usage
4. Style prop changes

```bash
# Search for potential issues
grep -rn "apply=" src/                # apply prop removed
grep -rn "styleConfig" src/           # styleConfig removed
grep -rn "multiStyleConfig" src/      # multiStyleConfig removed
grep -rn "extendTheme" src/           # extendTheme changed to createSystem
```

### Phase 3: Testing and Validation (1 day)

#### Step 3.1: Type Checking (15 min)
```bash
npm run typecheck
```

**Fix any TypeScript errors related to:**
- Toast API changes
- Provider prop changes
- Component prop changes

#### Step 3.2: Build Testing (15 min)
```bash
npm run build
```

**Verify:**
- No build errors
- No warnings about deprecated APIs
- Bundle size (should be smaller due to framer-motion removal)

#### Step 3.3: Unit Tests (2 hours)

```bash
npm run test
```

**Update tests that:**
- Mock `useToast` → Mock `toaster`
- Test toast notifications
- Test ChakraProvider setup

**Example test updates:**
```tsx
// BEFORE
import { useToast } from '@chakra-ui/react';
jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: jest.fn(),
}));

// AFTER
import { toaster } from '@/components/ui/toaster';
jest.mock('@/components/ui/toaster', () => ({
  toaster: {
    create: jest.fn(),
  },
}));
```

#### Step 3.4: Manual Testing (3-4 hours)

**Test Checklist:**

**Authentication Flow:**
- [ ] Login page renders correctly
- [ ] Toast notifications appear on login success/failure
- [ ] Sign up flow works
- [ ] Toast notifications for sign up

**Dashboard:**
- [ ] Project dashboard loads
- [ ] Create new project modal works
- [ ] Toast notifications for create/update/delete
- [ ] Project cards render correctly
- [ ] Project description truncation (lineClamp test)

**Document Management:**
- [ ] Upload document
- [ ] Toast notifications for upload progress
- [ ] Document metadata editor
- [ ] Toast for metadata updates

**Annotations:**
- [ ] Create annotations (all types)
- [ ] Edit annotations
- [ ] Delete annotations (AlertDialog)
- [ ] Toast notifications for all annotation actions
- [ ] Annotation review panel
- [ ] Filter panel (Collapse, Select)
- [ ] Statistics panel (Stat components)
- [ ] Export annotations (Menu, MenuList)
- [ ] Toast for export

**Paragraph Linking:**
- [ ] Linking panel renders
- [ ] Create links
- [ ] Toast notifications

**Sharing:**
- [ ] Share link modal
- [ ] Toast for share link created
- [ ] Shared document page

**UI Components:**
- [ ] Modals (all variants)
- [ ] Alert dialogs
- [ ] Tooltips
- [ ] Badges
- [ ] Spinners
- [ ] Progress bars
- [ ] Tabs
- [ ] Forms and validation
- [ ] Collapsible panels

#### Step 3.5: Visual Regression Testing (1 hour)

**Manual visual checks:**
- Layout consistency
- Spacing and alignment
- Colors and themes
- Responsive behavior
- Animations (CSS instead of framer-motion)

**Compare screenshots:**
- Take screenshots before migration
- Take screenshots after migration
- Compare for unintended changes

#### Step 3.6: Performance Testing (30 min)

**Metrics to check:**
- Initial load time
- Component render time
- Bundle size comparison
- Memory usage

**Tools:**
```bash
npm run build
# Check dist/ folder size

# Use browser DevTools:
# - Lighthouse performance score
# - React DevTools Profiler
# - Network tab for bundle analysis
```

---

## Code Changes Required

### File-by-File Change Summary

#### Critical Changes (Must Complete)

**1. src/main.tsx**
- Create and import `system`
- Update `ChakraProvider` to use `value={system}`
- Add `<Toaster />` component

**2. src/theme.ts (NEW)**
- Create system with `createSystem(defaultConfig)`

**3. src/components/ui/toaster.tsx (GENERATED)**
- Run CLI to generate toaster snippet

**4. All files using useToast (14 files) - REFACTOR**

| File Path | Toast Calls | Complexity |
|-----------|-------------|------------|
| `src/pages/LoginPage.tsx` | 2 | Low |
| `src/components/ProjectDashboard.tsx` | 3 | Low |
| `src/components/DocumentUpload.tsx` | ~5 | Medium |
| `src/components/ShareLinkModal.tsx` | 1 | Low |
| `src/components/CitationExportModal.tsx` | 1 | Low |
| `src/components/DocumentMetadataEditor.tsx` | 2 | Low |
| `src/components/ParagraphLinkingPanel.tsx` | 3 | Low |
| `src/components/AnnotationToolbar.tsx` | 2 | Low |
| `src/hooks/useAnnotationActions.ts` | 2 | Medium |
| `src/hooks/useAnnotationExport.ts` | 1 | Medium |
| `src/hooks/useParagraphAnnotations.ts` | 2 | Medium |
| `src/components/AnnotationListItem.tsx` | 1 | Low |
| `src/components/AnnotationReviewPanel.tsx` | 0 | N/A |
| `src/components/Paragraph.tsx` | 0 | N/A |

**5. src/components/ProjectDashboard.tsx**
- Line 254: `noOfLines={2}` → `lineClamp={2}`

#### Optional/Future Changes

**Custom Theming (if needed later):**
```tsx
// src/theme.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const customConfig = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: "Inter, sans-serif" },
        body: { value: "Inter, sans-serif" },
      },
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
```

---

## Testing Plan

### Unit Tests

#### Tests to Add/Update

**1. Toast Migration Tests**

Create: `src/components/ui/__tests__/toaster.test.tsx`
```tsx
import { toaster } from '../toaster'

describe('Toaster', () => {
  it('should create toast notifications', () => {
    const result = toaster.create({
      title: 'Test',
      type: 'success',
    })
    expect(result).toBeDefined()
  })
})
```

**2. Provider Tests**

Update: `src/__tests__/App.test.tsx`
```tsx
import { system } from '../theme'

describe('App', () => {
  it('should render with ChakraProvider', () => {
    render(
      <ChakraProvider value={system}>
        <App />
      </ChakraProvider>
    )
    // assertions
  })
})
```

**3. Component Tests with Toast**

For each component using toaster, update test mocks:
```tsx
jest.mock('@/components/ui/toaster', () => ({
  toaster: {
    create: jest.fn(),
  },
}))
```

#### Test Commands
```bash
npm run test:unit           # Run all unit tests
npm run test:coverage       # Check coverage
npm run test:watch          # Watch mode during development
```

### Integration Tests

**Key User Flows:**

1. **Authentication Flow**
   - Login → Toast success → Dashboard redirect
   - Failed login → Toast error

2. **Project Management**
   - Create project → Toast success
   - Update project → Toast success
   - Delete project → Toast confirmation

3. **Document Upload**
   - Upload → Progress → Toast success
   - Upload error → Toast error

4. **Annotation Workflow**
   - Create → Toast success
   - Edit → Toast success
   - Delete → AlertDialog → Toast success

### Manual Testing Checklist

#### Visual Components
- [ ] All modals open/close correctly
- [ ] AlertDialogs display properly
- [ ] Toast notifications appear in correct position
- [ ] Toast notifications auto-dismiss
- [ ] Toast notifications can be manually closed
- [ ] Tooltips show on hover
- [ ] Badges display correct colors
- [ ] Cards render with proper styling
- [ ] Forms validate correctly
- [ ] Form errors display properly

#### Interactions
- [ ] Buttons respond to clicks
- [ ] Inputs accept text
- [ ] Selects show options
- [ ] Tabs switch content
- [ ] Collapse animations work
- [ ] Menu dropdowns work
- [ ] Drag and drop (document upload)

#### Responsive Design
- [ ] Mobile view (< 768px)
- [ ] Tablet view (768px - 1024px)
- [ ] Desktop view (> 1024px)
- [ ] All modals work on mobile
- [ ] Navigation works on mobile

#### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader compatibility
- [ ] Color contrast adequate

### Automated Testing Strategy

**1. Set up visual regression testing (optional):**
```bash
npm install --save-dev @percy/cli @percy/playwright
```

**2. Add e2e tests for critical paths:**
```typescript
// tests/e2e/toast-notifications.spec.ts
test('should show success toast on login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[type="email"]', 'test@example.com')
  await page.fill('[type="password"]', 'password')
  await page.click('button[type="submit"]')

  // Check for toast
  await expect(page.locator('[role="status"]')).toContainText('Logged in successfully')
})
```

---

## Rollback Plan

### Quick Rollback (if critical issues found)

#### Step 1: Revert Commits
```bash
git revert HEAD  # Or specific commit hash
git push origin main
```

#### Step 2: Reinstall v2
```bash
npm install @chakra-ui/react@2.8.2 @emotion/styled@11.11.0 framer-motion@10.16.16
```

#### Step 3: Restore Dependencies
```bash
npm install
```

### Gradual Rollback (if partial migration)

#### Option A: Use Version Pinning
```json
// package.json
{
  "dependencies": {
    "@chakra-ui/react": "2.8.2",  // Pin to v2
    "@emotion/react": "11.11.3",
    "@emotion/styled": "11.11.0",
    "framer-motion": "10.16.16"
  }
}
```

#### Option B: Use Git Branches

**Keep v2 branch:**
```bash
git checkout -b backup/chakra-v2
git push origin backup/chakra-v2
```

**Work on v3:**
```bash
git checkout main
# Proceed with v3 migration
```

**Rollback if needed:**
```bash
git checkout backup/chakra-v2
git checkout -b main-v2-restore
git push origin main-v2-restore --force
```

### Monitoring for Issues Post-Migration

**Set up error tracking:**
- Monitor console errors in production
- Track user-reported issues
- Monitor performance metrics
- Check for layout shifts

**Rollback triggers:**
- Critical functionality broken
- Major performance regression (> 20% slower)
- Widespread user complaints
- Accessibility issues
- Build failures in production

---

## Feature Flags Strategy (Optional)

If gradual rollout is desired:

### Setup Feature Flag

```tsx
// src/config/features.ts
export const FEATURES = {
  CHAKRA_V3: import.meta.env.VITE_CHAKRA_V3 === 'true',
}

// .env.development
VITE_CHAKRA_V3=true

// .env.production
VITE_CHAKRA_V3=false  # Start with false, flip when ready
```

### Conditional Provider

```tsx
// src/main.tsx
import { FEATURES } from './config/features'

const ProviderWrapper = FEATURES.CHAKRA_V3
  ? ({ children }) => <ChakraProvider value={system}>{children}</ChakraProvider>
  : ChakraProvider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProviderWrapper>
      <App />
      {FEATURES.CHAKRA_V3 && <Toaster />}
    </ProviderWrapper>
  </React.StrictMode>,
)
```

**Pros:**
- Safe gradual rollout
- Easy rollback
- Can test in production with subset of users

**Cons:**
- Maintains two code paths
- More complex codebase
- Requires cleanup after full rollout

**Recommendation:** Only use if rollout to production will be staged. For internal/staging environments, direct migration is simpler.

---

## Timeline & Effort Estimation

### Phase 1: Research and Preparation - **1 day**

| Task | Estimated Time |
|------|---------------|
| Review migration documentation | 2 hours |
| Analyze codebase for usage patterns | 2 hours |
| Create migration plan document | 2 hours |
| Setup migration branch and tooling | 1 hour |
| Team review and approval | 1 hour |
| **Total Phase 1** | **8 hours (1 day)** |

### Phase 2: Core Updates - **2-3 days**

| Task | Estimated Time |
|------|---------------|
| Update dependencies | 30 min |
| Create theme system | 30 min |
| Update provider setup | 15 min |
| Generate and setup toaster snippet | 30 min |
| Migrate useToast in simple files (4 files) | 2 hours |
| Migrate useToast in medium files (4 files) | 3 hours |
| Migrate useToast in complex files (6 files) | 4 hours |
| Update Text component props | 15 min |
| Search and fix other deprecations | 1 hour |
| Code review and refinement | 2 hours |
| **Total Phase 2** | **13.5 hours (2 days)** |

### Phase 3: Testing and Validation - **1 day**

| Task | Estimated Time |
|------|---------------|
| Type checking and build fixes | 30 min |
| Update unit tests | 2 hours |
| Write new tests for toaster | 1 hour |
| Manual testing - critical paths | 2 hours |
| Manual testing - edge cases | 1 hour |
| Visual regression checks | 30 min |
| Performance testing | 30 min |
| Bug fixes from testing | 1 hour |
| **Total Phase 3** | **8.5 hours (1 day)** |

### Total Estimated Effort

**Base Estimate:** 30 hours (3.75 days)
**With Buffer (20%):** 36 hours (4.5 days)

**Recommendation:** Allocate **5 days** for comfortable completion with contingency.

### Milestone Schedule

**Day 1: Preparation**
- Complete Phase 1
- Get sign-off to proceed

**Day 2-3: Implementation**
- Complete dependency updates
- Complete provider migration
- Complete 50% of toast migrations

**Day 4: Implementation**
- Complete remaining toast migrations
- Complete prop updates
- Initial testing pass

**Day 5: Testing & Polish**
- Complete all testing
- Fix bugs
- Code review
- Documentation updates
- Merge to main

---

## Success Criteria

### Technical Criteria
- ✅ All dependencies updated to v3
- ✅ No v2 dependencies remaining
- ✅ All TypeScript errors resolved
- ✅ All tests passing
- ✅ Build succeeds with no warnings
- ✅ No console errors in browser
- ✅ Code review approved

### Functional Criteria
- ✅ All toast notifications working
- ✅ All modals and dialogs working
- ✅ All forms and inputs working
- ✅ All navigation working
- ✅ No visual regressions
- ✅ No accessibility regressions

### Performance Criteria
- ✅ Bundle size maintained or reduced
- ✅ Initial load time maintained or improved
- ✅ No performance regressions
- ✅ Lighthouse score maintained (> 90)

### User Experience Criteria
- ✅ All user flows work as before
- ✅ No broken functionality
- ✅ Visual design consistent
- ✅ Responsive design intact
- ✅ Accessibility maintained

---

## Risks and Mitigation

### Risk 1: Toast Migration Complexity
**Likelihood:** HIGH
**Impact:** MEDIUM

**Description:** Migrating 14 files from `useToast` hook to `toaster` snippet is the largest code change.

**Mitigation:**
- Start with simple files to establish pattern
- Create reusable migration template
- Test each file individually
- Pair programming for complex hooks

### Risk 2: Undocumented Breaking Changes
**Likelihood:** MEDIUM
**Impact:** HIGH

**Description:** Some changes not well documented in official migration guide (e.g., toast → toaster).

**Mitigation:**
- Thorough testing of all components
- Check GitHub issues/discussions
- Community resources and blog posts
- Plan buffer time for unexpected issues

### Risk 3: Type Errors
**Likelihood:** MEDIUM
**Impact:** MEDIUM

**Description:** TypeScript types may have changed between versions.

**Mitigation:**
- Run typecheck frequently
- Fix types incrementally
- Leverage TypeScript errors as checklist
- May need to use `@ts-expect-error` temporarily

### Risk 4: Testing Coverage Gaps
**Likelihood:** MEDIUM
**Impact:** MEDIUM

**Description:** Not all component combinations may be covered by tests.

**Mitigation:**
- Comprehensive manual testing checklist
- Test in staging environment first
- Gradual rollout with monitoring
- Quick rollback plan ready

### Risk 5: Performance Regression
**Likelihood:** LOW
**Impact:** MEDIUM

**Description:** Unexpected performance issues with new version.

**Mitigation:**
- Benchmark before migration
- Performance testing in Phase 3
- Monitor production metrics
- V3 is actually faster (4x reconciliation improvement)

---

## Resources

### Official Documentation
- [Chakra UI v3 Migration Guide](https://www.chakra-ui.com/docs/get-started/migration)
- [Chakra UI v3 Announcement](https://chakra-ui.com/blog/announcing-v3)
- [Chakra UI v3 Documentation](https://www.chakra-ui.com/)
- [Chakra UI GitHub Releases](https://github.com/chakra-ui/chakra-ui/releases)

### Community Resources
- [Chakra v2 to v3 Easy Migration Guide - Codygo](https://codygo.com/blog/chakra-ui-v2-to-v3-easy-migration-guide/)
- [Sprint 5 - Chakra UI v3 Migration - DEV Community](https://dev.to/theoforger/sprint-5-chakra-ui-v3-migration-4pfi)
- [Migrate from Chakra UI v2 to v3 - Medium](https://kingchun1991.medium.com/migrate-from-chakra-ui-v2-to-chakra-ui-v3-part-1-1701dc3cd6ea)
- [GitHub Discussions - Gradual Upgrade](https://github.com/chakra-ui/chakra-ui/discussions/9853)

### Tools
- [Chakra UI CLI](https://www.npmjs.com/package/@chakra-ui/cli) - For snippets
- [Chakra UI Snippets](https://www.chakra-ui.com/docs/components) - Pre-built components

---

## Next Steps

1. **Review this plan** with team
2. **Get approval** to proceed
3. **Schedule migration window** (5 days)
4. **Create migration branch**
5. **Begin Phase 1**

---

## Appendix A: Quick Reference

### Common Migration Patterns

#### Pattern 1: Toast Notification
```tsx
// BEFORE
import { useToast } from '@chakra-ui/react';
const toast = useToast();
toast({ title: 'Success', status: 'success' });

// AFTER
import { toaster } from '@/components/ui/toaster';
toaster.create({ title: 'Success', type: 'success' });
```

#### Pattern 2: Text Truncation
```tsx
// BEFORE
<Text noOfLines={2}>Long text</Text>

// AFTER
<Text lineClamp={2}>Long text</Text>
```

#### Pattern 3: Provider Setup
```tsx
// BEFORE
<ChakraProvider>
  <App />
</ChakraProvider>

// AFTER
import { system } from './theme';
<ChakraProvider value={system}>
  <App />
  <Toaster />
</ChakraProvider>
```

---

## Appendix B: Search Commands

### Find All useToast Usages
```bash
grep -rn "useToast" src/
```

### Find All noOfLines/truncated Props
```bash
grep -rn "noOfLines" src/
grep -rn "truncated" src/
```

### Find All ChakraProvider Instances
```bash
grep -rn "ChakraProvider" src/
```

### Find Potential Breaking Changes
```bash
grep -rn "apply=" src/
grep -rn "extendTheme" src/
grep -rn "styleConfig" src/
```

---

## Document Metadata

- **Created:** November 10, 2025
- **Author:** Claude (Chakra UI Migration Planning Agent)
- **Version:** 1.0
- **Status:** Ready for Review
- **Next Review:** Before Phase 1 execution

---

**END OF MIGRATION PLAN**
