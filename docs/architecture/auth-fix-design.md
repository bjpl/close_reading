# Authentication Architecture Fix Design

**Document:** SPARC Architecture Decision Record
**Version:** 1.0.0
**Date:** November 22, 2025
**Status:** APPROVED FOR IMPLEMENTATION
**Author:** Security Architect Agent

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Specification (S)](#specification-s)
3. [Pseudocode (P)](#pseudocode-p)
4. [Architecture (A)](#architecture-a)
5. [Refinement (R)](#refinement-r)
6. [Completion (C)](#completion-c)

---

## Executive Summary

### Current State Assessment

The close_reading platform has a functional authentication system built on Supabase Auth with the following characteristics:

**Strengths:**
- Industry-standard Supabase Auth integration
- Proper session management via JWT tokens
- Real-time auth state synchronization
- 34 comprehensive Row Level Security (RLS) policies
- Mock client for local development

**Identified Issues (from Security Audit):**
1. HIGH RISK: XSS vulnerability via `dangerouslySetInnerHTML` (SharedDocumentPage.tsx:154)
2. MEDIUM RISK: No password strength enforcement
3. MEDIUM RISK: Missing server-side file validation
4. LOW RISK: Console.error information disclosure
5. LOW RISK: No CSRF token rotation strategy
6. MISSING: Rate limiting on authentication endpoints
7. MISSING: Account lockout after failed attempts
8. MISSING: Session timeout configuration
9. MISSING: Multi-factor authentication support

### Proposed Architecture

This document defines a comprehensive authentication fix strategy that addresses all identified vulnerabilities while maintaining backward compatibility and the existing dual-mode (mock/production) architecture.

---

## Specification (S)

### S.1 Functional Requirements

#### S.1.1 Authentication Operations

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AUTH-001 | Users must authenticate with email and password | Critical | Implemented |
| FR-AUTH-002 | Users must be able to register new accounts | Critical | Implemented |
| FR-AUTH-003 | Users must be able to reset forgotten passwords | High | Implemented |
| FR-AUTH-004 | System must maintain persistent sessions | High | Implemented |
| FR-AUTH-005 | Users must be able to sign out and invalidate sessions | High | Implemented |
| FR-AUTH-006 | System must enforce password complexity requirements | High | **NEW** |
| FR-AUTH-007 | System must support session timeout and refresh | Medium | **NEW** |
| FR-AUTH-008 | System must provide MFA enrollment option | Low | **FUTURE** |

#### S.1.2 Authorization Operations

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AUTHZ-001 | Users can only access their own resources | Critical | Implemented (RLS) |
| FR-AUTHZ-002 | Share links provide read-only access to specific documents | High | Implemented |
| FR-AUTHZ-003 | Anonymous users cannot access protected routes | High | Implemented |
| FR-AUTHZ-004 | API operations must validate authorization server-side | Critical | Implemented (RLS) |

#### S.1.3 Security Operations

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-SEC-001 | All user input must be sanitized before rendering | Critical | **FIX NEEDED** |
| FR-SEC-002 | Rate limiting on authentication endpoints | High | **NEW** |
| FR-SEC-003 | Account lockout after failed login attempts | High | **NEW** |
| FR-SEC-004 | Secure token generation (256-bit entropy) | Critical | Implemented |
| FR-SEC-005 | HTTPS enforced for all communications | Critical | Implemented (Supabase) |

### S.2 Non-Functional Requirements

#### S.2.1 Performance

- Authentication operations must complete within 500ms
- Session validation must complete within 100ms
- Token refresh must be transparent to user

#### S.2.2 Security

- Passwords must be hashed with bcrypt (cost factor 12)
- JWT tokens must expire after 1 hour
- Refresh tokens must expire after 7 days
- Session data must not be exposed in URLs
- All auth errors must be logged without sensitive data

#### S.2.3 Availability

- Authentication service must have 99.9% uptime
- Graceful degradation when Supabase is unavailable (mock mode)

### S.3 Constraints

1. **Technology Stack:** Must use Supabase Auth SDK
2. **Backward Compatibility:** Must support existing mock mode
3. **Client-Side Focus:** No custom backend server (serverless only)
4. **TypeScript:** All code must be fully typed
5. **React Patterns:** Must follow existing hook-based architecture

### S.4 Dependencies

```
@supabase/supabase-js: ^2.39.0  (auth provider)
dompurify: ^3.3.0               (XSS sanitization)
idb: ^8.0.0                     (IndexedDB for mock)
react: ^19.2.0                  (UI framework)
react-router-dom: ^7.9.5        (routing/guards)
```

---

## Pseudocode (P)

### P.1 Password Validation Service

```pseudocode
MODULE PasswordValidation

  CONSTANT MIN_LENGTH = 8
  CONSTANT MAX_LENGTH = 128
  CONSTANT REQUIRED_PATTERNS = [
    /[a-z]/,         // lowercase letter
    /[A-Z]/,         // uppercase letter
    /[0-9]/,         // digit
    /[!@#$%^&*]/     // special character
  ]

  FUNCTION validatePassword(password: string) -> ValidationResult
    errors = []

    IF length(password) < MIN_LENGTH THEN
      ADD "Password must be at least 8 characters" TO errors
    END IF

    IF length(password) > MAX_LENGTH THEN
      ADD "Password cannot exceed 128 characters" TO errors
    END IF

    FOR EACH pattern IN REQUIRED_PATTERNS DO
      IF NOT pattern.test(password) THEN
        ADD appropriate_error_message TO errors
      END IF
    END FOR

    // Check for common weak passwords
    IF password IN COMMON_PASSWORDS_LIST THEN
      ADD "This password is too common" TO errors
    END IF

    RETURN {
      isValid: length(errors) == 0,
      errors: errors,
      strength: calculateStrength(password)
    }
  END FUNCTION

  FUNCTION calculateStrength(password: string) -> StrengthLevel
    score = 0

    // Length bonus
    score += min(length(password) / 4, 3)

    // Pattern bonuses
    FOR EACH pattern IN REQUIRED_PATTERNS DO
      IF pattern.test(password) THEN
        score += 1
      END IF
    END FOR

    // Additional complexity
    IF hasUniqueCharacters(password, threshold=6) THEN
      score += 1
    END IF

    RETURN mapScoreToLevel(score) // weak | fair | good | strong
  END FUNCTION

END MODULE
```

### P.2 Rate Limiting Service

```pseudocode
MODULE RateLimiting

  CONSTANT WINDOWS = {
    login: { maxAttempts: 5, windowMs: 900000 },      // 5 attempts per 15 minutes
    signup: { maxAttempts: 3, windowMs: 3600000 },   // 3 attempts per hour
    passwordReset: { maxAttempts: 3, windowMs: 3600000 }
  }

  STATE attemptCache: Map<string, AttemptRecord>

  FUNCTION checkRateLimit(action: string, identifier: string) -> RateLimitResult
    key = generateKey(action, identifier)
    config = WINDOWS[action]
    record = attemptCache.get(key)

    IF record IS NULL THEN
      record = { attempts: 0, windowStart: NOW }
    END IF

    // Check if window has expired
    IF NOW - record.windowStart > config.windowMs THEN
      record = { attempts: 0, windowStart: NOW }
    END IF

    IF record.attempts >= config.maxAttempts THEN
      remainingTime = (record.windowStart + config.windowMs) - NOW
      RETURN {
        allowed: false,
        remainingTime: remainingTime,
        message: "Too many attempts. Try again in ${formatTime(remainingTime)}"
      }
    END IF

    RETURN { allowed: true }
  END FUNCTION

  FUNCTION recordAttempt(action: string, identifier: string, success: boolean) -> void
    key = generateKey(action, identifier)
    record = attemptCache.get(key) OR { attempts: 0, windowStart: NOW }

    IF NOT success THEN
      record.attempts += 1
    ELSE
      // Reset on successful authentication
      record.attempts = 0
    END IF

    attemptCache.set(key, record)

    // Persist to localStorage for cross-tab consistency
    persistToStorage(attemptCache)
  END FUNCTION

  FUNCTION generateKey(action: string, identifier: string) -> string
    // Use hashed identifier for privacy
    RETURN hash(action + ":" + identifier)
  END FUNCTION

END MODULE
```

### P.3 Account Lockout Service

```pseudocode
MODULE AccountLockout

  CONSTANT LOCKOUT_THRESHOLD = 5
  CONSTANT LOCKOUT_DURATION = 1800000  // 30 minutes
  CONSTANT PROGRESSIVE_MULTIPLIER = 2  // Double each subsequent lockout

  STATE lockoutRecords: Map<string, LockoutRecord>

  FUNCTION checkLockout(email: string) -> LockoutStatus
    record = lockoutRecords.get(hash(email))

    IF record IS NULL THEN
      RETURN { isLocked: false }
    END IF

    // Check if lockout has expired
    lockoutEnd = record.lockoutStart + (record.duration * record.lockoutCount)

    IF NOW > lockoutEnd THEN
      RETURN { isLocked: false, previousLockouts: record.lockoutCount }
    END IF

    RETURN {
      isLocked: true,
      remainingTime: lockoutEnd - NOW,
      message: "Account temporarily locked. Try again later."
    }
  END FUNCTION

  FUNCTION recordFailedLogin(email: string) -> void
    key = hash(email)
    record = lockoutRecords.get(key) OR {
      failedAttempts: 0,
      lockoutCount: 0,
      lockoutStart: null,
      duration: LOCKOUT_DURATION
    }

    record.failedAttempts += 1

    IF record.failedAttempts >= LOCKOUT_THRESHOLD THEN
      record.lockoutCount += 1
      record.lockoutStart = NOW
      record.duration = LOCKOUT_DURATION * (PROGRESSIVE_MULTIPLIER ^ (record.lockoutCount - 1))
      record.failedAttempts = 0

      // Log security event
      logSecurityEvent("ACCOUNT_LOCKED", { email: hash(email) })
    END IF

    lockoutRecords.set(key, record)
  END FUNCTION

  FUNCTION resetLockout(email: string) -> void
    lockoutRecords.delete(hash(email))
  END FUNCTION

END MODULE
```

### P.4 Enhanced Authentication Hook

```pseudocode
MODULE useAuth

  IMPORT PasswordValidation, RateLimiting, AccountLockout, Sanitization

  FUNCTION useAuth() -> AuthState
    STATE user = null
    STATE session = null
    STATE loading = true
    STATE error = null

    // Initialize auth state from Supabase
    EFFECT ON_MOUNT DO
      session = await supabase.auth.getSession()
      user = session?.user
      loading = false

      // Subscribe to auth state changes
      subscription = supabase.auth.onAuthStateChange((event, session) => {
        user = session?.user

        IF event == "SIGNED_IN" THEN
          AccountLockout.resetLockout(user.email)
        END IF
      })

      RETURN () => subscription.unsubscribe()
    END EFFECT

    ASYNC FUNCTION signIn(email: string, password: string) -> void
      // Check rate limit
      rateLimitResult = RateLimiting.checkRateLimit("login", email)
      IF NOT rateLimitResult.allowed THEN
        THROW RateLimitError(rateLimitResult.message)
      END IF

      // Check account lockout
      lockoutResult = AccountLockout.checkLockout(email)
      IF lockoutResult.isLocked THEN
        THROW AccountLockedError(lockoutResult.message)
      END IF

      TRY
        loading = true
        error = null

        result = await supabase.auth.signInWithPassword({
          email: Sanitization.sanitizeEmail(email),
          password: password
        })

        IF result.error THEN
          RateLimiting.recordAttempt("login", email, false)
          AccountLockout.recordFailedLogin(email)
          THROW AuthError(result.error.message)
        END IF

        RateLimiting.recordAttempt("login", email, true)

      FINALLY
        loading = false
      END TRY
    END FUNCTION

    ASYNC FUNCTION signUp(email: string, password: string) -> void
      // Validate password strength
      passwordResult = PasswordValidation.validatePassword(password)
      IF NOT passwordResult.isValid THEN
        THROW ValidationError(passwordResult.errors)
      END IF

      // Check rate limit
      rateLimitResult = RateLimiting.checkRateLimit("signup", email)
      IF NOT rateLimitResult.allowed THEN
        THROW RateLimitError(rateLimitResult.message)
      END IF

      TRY
        loading = true
        error = null

        result = await supabase.auth.signUp({
          email: Sanitization.sanitizeEmail(email),
          password: password
        })

        IF result.error THEN
          RateLimiting.recordAttempt("signup", email, false)
          THROW AuthError(result.error.message)
        END IF

        RateLimiting.recordAttempt("signup", email, true)

      FINALLY
        loading = false
      END TRY
    END FUNCTION

    ASYNC FUNCTION signOut() -> void
      await supabase.auth.signOut()
    END FUNCTION

    ASYNC FUNCTION resetPassword(email: string) -> void
      // Check rate limit
      rateLimitResult = RateLimiting.checkRateLimit("passwordReset", email)
      IF NOT rateLimitResult.allowed THEN
        THROW RateLimitError(rateLimitResult.message)
      END IF

      result = await supabase.auth.resetPasswordForEmail(email)
      RateLimiting.recordAttempt("passwordReset", email, !result.error)
    END FUNCTION

    RETURN { user, session, loading, error, signIn, signUp, signOut, resetPassword }
  END FUNCTION

END MODULE
```

### P.5 Input Sanitization Service

```pseudocode
MODULE Sanitization

  IMPORT DOMPurify

  CONSTANT HTML_CONFIG = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                   'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false
  }

  CONSTANT TEXT_CONFIG = {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true
  }

  FUNCTION sanitizeHTML(html: string) -> string
    IF html IS NULL OR html IS EMPTY THEN
      RETURN ''
    END IF

    RETURN DOMPurify.sanitize(html, HTML_CONFIG)
  END FUNCTION

  FUNCTION sanitizeText(text: string) -> string
    IF text IS NULL OR text IS EMPTY THEN
      RETURN ''
    END IF

    RETURN DOMPurify.sanitize(text, TEXT_CONFIG)
  END FUNCTION

  FUNCTION sanitizeEmail(email: string) -> string
    // Normalize email: lowercase, trim whitespace
    normalized = email.toLowerCase().trim()

    // Validate format
    IF NOT EMAIL_REGEX.test(normalized) THEN
      THROW ValidationError("Invalid email format")
    END IF

    RETURN normalized
  END FUNCTION

  FUNCTION sanitizeDocumentContent(content: string) -> string
    // For document content displayed via dangerouslySetInnerHTML
    RETURN DOMPurify.sanitize(content, {
      ...HTML_CONFIG,
      // Additional document-specific tags
      ALLOWED_TAGS: [...HTML_CONFIG.ALLOWED_TAGS, 'span', 'div', 'a', 'table', 'tr', 'td', 'th'],
      ALLOWED_ATTR: ['class', 'id', 'data-paragraph-id', 'href'],
      ALLOW_DATA_ATTR: true
    })
  END FUNCTION

END MODULE
```

### P.6 Session Management Service

```pseudocode
MODULE SessionManagement

  CONSTANT SESSION_TIMEOUT = 3600000        // 1 hour
  CONSTANT REFRESH_THRESHOLD = 300000       // 5 minutes before expiry
  CONSTANT ACTIVITY_CHECK_INTERVAL = 60000  // Check every minute

  STATE lastActivity = NOW
  STATE sessionTimer = null

  FUNCTION initSessionMonitoring(onSessionExpired: Function) -> Cleanup
    // Track user activity
    activityHandler = () => {
      lastActivity = NOW
    }

    document.addEventListener('mousemove', activityHandler)
    document.addEventListener('keypress', activityHandler)
    document.addEventListener('click', activityHandler)

    // Periodic session check
    sessionTimer = setInterval(async () => {
      session = await supabase.auth.getSession()

      IF session IS NULL THEN
        onSessionExpired()
        RETURN
      END IF

      // Check if session needs refresh
      expiresAt = session.expires_at * 1000
      timeUntilExpiry = expiresAt - NOW

      IF timeUntilExpiry < REFRESH_THRESHOLD THEN
        await refreshSession()
      END IF

      // Check for inactivity timeout
      timeSinceActivity = NOW - lastActivity
      IF timeSinceActivity > SESSION_TIMEOUT THEN
        await supabase.auth.signOut()
        onSessionExpired()
      END IF

    }, ACTIVITY_CHECK_INTERVAL)

    // Return cleanup function
    RETURN () => {
      document.removeEventListener('mousemove', activityHandler)
      document.removeEventListener('keypress', activityHandler)
      document.removeEventListener('click', activityHandler)
      clearInterval(sessionTimer)
    }
  END FUNCTION

  ASYNC FUNCTION refreshSession() -> void
    TRY
      result = await supabase.auth.refreshSession()
      IF result.error THEN
        logSecurityEvent("SESSION_REFRESH_FAILED", { error: result.error.message })
      END IF
    CATCH error
      logSecurityEvent("SESSION_REFRESH_ERROR", { error: error.message })
    END TRY
  END FUNCTION

END MODULE
```

---

## Architecture (A)

### A.1 System Architecture Diagram

```
+------------------------------------------------------------------+
|                     CLOSE READING PLATFORM                        |
|                   Authentication Architecture                      |
+------------------------------------------------------------------+

                              +-------------------+
                              |    React App      |
                              |   (Client-Side)   |
                              +--------+----------+
                                       |
         +-----------------------------+-----------------------------+
         |                             |                             |
         v                             v                             v
+----------------+          +------------------+          +------------------+
|   LoginPage    |          |  AuthContext     |          | Protected Routes |
|   Component    |          |  Provider        |          | (Dashboard, etc) |
+-------+--------+          +--------+---------+          +--------+---------+
        |                            |                             |
        +------------+---------------+-------------+---------------+
                     |                             |
                     v                             v
            +-----------------+           +------------------+
            |    useAuth      |<--------->|  AuthGuard HOC   |
            |      Hook       |           | withAuth / etc   |
            +--------+--------+           +------------------+
                     |
    +----------------+----------------+----------------+
    |                |                |                |
    v                v                v                v
+----------+  +------------+  +-------------+  +--------------+
| Password |  |   Rate     |  |  Account    |  |   Session    |
| Validate |  |  Limiting  |  |  Lockout    |  | Management   |
+----------+  +------------+  +-------------+  +--------------+
    |                |                |                |
    +----------------+----------------+----------------+
                     |
                     v
           +------------------+
           | Supabase Client  |
           | (supabase.ts)    |
           +--------+---------+
                    |
        +-----------+-----------+
        |                       |
        v                       v
+---------------+      +----------------+
| PRODUCTION    |      |  MOCK MODE     |
| Supabase Auth |      | MockAuthService|
| (Cloud)       |      | (IndexedDB)    |
+-------+-------+      +--------+-------+
        |                       |
        v                       v
+------------------+   +------------------+
| Supabase Backend |   | IndexedDB        |
| - PostgreSQL RLS |   | - Users table    |
| - JWT tokens     |   | - localStorage   |
| - Email service  |   | - Mock tokens    |
+------------------+   +------------------+
```

### A.2 Module Structure and Interfaces

```
src/
├── lib/
│   ├── auth/
│   │   ├── index.ts                 # Auth module exports
│   │   ├── passwordValidation.ts    # Password strength validation
│   │   ├── rateLimiting.ts          # Rate limiting service
│   │   ├── accountLockout.ts        # Account lockout service
│   │   ├── sessionManagement.ts     # Session timeout/refresh
│   │   └── types.ts                 # Auth-specific types
│   │
│   ├── security/
│   │   ├── index.ts                 # Security module exports
│   │   ├── sanitization.ts          # Enhanced XSS sanitization
│   │   ├── csp.ts                   # CSP header utilities
│   │   └── securityLogger.ts        # Security event logging
│   │
│   ├── mock/
│   │   ├── auth.ts                  # MockAuthService (existing)
│   │   └── ...                      # Other mock services
│   │
│   └── supabase.ts                  # Supabase client factory
│
├── hooks/
│   ├── useAuth.ts                   # Enhanced auth hook
│   └── useSessionMonitor.ts         # Session monitoring hook
│
├── contexts/
│   └── AuthContext.tsx              # Auth context provider
│
├── components/
│   ├── auth/
│   │   ├── PasswordStrengthMeter.tsx
│   │   ├── LoginForm.tsx
│   │   ├── SignUpForm.tsx
│   │   └── SessionTimeoutWarning.tsx
│   │
│   └── guards/
│       ├── AuthGuard.tsx
│       └── RoleGuard.tsx
│
└── pages/
    └── LoginPage.tsx                # Updated with new components
```

### A.3 Interface Definitions

```typescript
// src/lib/auth/types.ts

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  remainingTime?: number;
  message?: string;
}

/**
 * Account lockout status
 */
export interface LockoutStatus {
  isLocked: boolean;
  remainingTime?: number;
  lockoutCount?: number;
  message?: string;
}

/**
 * Auth operation result
 */
export interface AuthOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

/**
 * Auth error with categorization
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Auth error codes for client handling
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Enhanced auth hook return type
 */
export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;

  // Auth operations
  signIn: (email: string, password: string) => Promise<AuthOperationResult>;
  signUp: (email: string, password: string) => Promise<AuthOperationResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthOperationResult>;

  // Password validation
  validatePassword: (password: string) => PasswordValidationResult;

  // Status checks
  isAuthenticated: boolean;
  isSessionValid: boolean;
}

/**
 * Security event for logging
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  identifier?: string;  // Hashed for privacy
  metadata?: Record<string, unknown>;
}

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REFRESH'
  | 'PASSWORD_RESET_REQUESTED'
  | 'SIGNUP_SUCCESS'
  | 'SIGNUP_FAILURE';
```

### A.4 Database Schema Requirements

No database schema changes required. The existing Supabase schema with RLS policies remains unchanged. The authentication enhancements are purely client-side with local storage for rate limiting and lockout tracking.

**Local Storage Schema:**

```typescript
// Rate limiting storage
interface RateLimitStorage {
  [key: string]: {
    attempts: number;
    windowStart: number;
  };
}

// Account lockout storage
interface LockoutStorage {
  [hashedEmail: string]: {
    failedAttempts: number;
    lockoutCount: number;
    lockoutStart: number | null;
    duration: number;
  };
}

// Keys
const RATE_LIMIT_KEY = 'close_reading_rate_limits';
const LOCKOUT_KEY = 'close_reading_lockouts';
```

### A.5 API Contracts

The authentication system uses Supabase Auth SDK. No custom API endpoints are introduced.

**Supabase Auth API (existing):**

| Operation | Method | Endpoint | Request | Response |
|-----------|--------|----------|---------|----------|
| Sign In | POST | /auth/v1/token | `{email, password}` | `{session, user}` |
| Sign Up | POST | /auth/v1/signup | `{email, password}` | `{user}` |
| Sign Out | POST | /auth/v1/logout | - | `{success}` |
| Reset Password | POST | /auth/v1/recover | `{email}` | `{success}` |
| Refresh Token | POST | /auth/v1/token | `{refresh_token}` | `{session}` |
| Get Session | GET | /auth/v1/session | - | `{session}` |

### A.6 Component Interaction Diagram

```
User Action Flow: Sign In
========================

[User]                [LoginPage]          [useAuth]           [RateLimiter]       [Lockout]         [Supabase]
   |                      |                    |                    |                  |                  |
   |---(1) Enter creds--->|                    |                    |                  |                  |
   |                      |                    |                    |                  |                  |
   |                      |---(2) signIn()---->|                    |                  |                  |
   |                      |                    |                    |                  |                  |
   |                      |                    |---(3) checkRate--->|                  |                  |
   |                      |                    |<---(4) allowed-----|                  |                  |
   |                      |                    |                    |                  |                  |
   |                      |                    |---(5) checkLock---->----------------->|                  |
   |                      |                    |<---(6) notLocked---<------------------|                  |
   |                      |                    |                    |                  |                  |
   |                      |                    |---(7) signInWithPassword------------->----------------->|
   |                      |                    |                    |                  |                  |
   |                      |                    |<---(8) success/error-<----------------|------------------|
   |                      |                    |                    |                  |                  |
   |                      |                    |---(9) recordAttempt>|                  |                  |
   |                      |                    |                    |                  |                  |
   |                      |<-(10) result-------|                    |                  |                  |
   |                      |                    |                    |                  |                  |
   |<-(11) navigate/error-|                    |                    |                  |                  |
```

### A.7 Testing Strategy

#### A.7.1 Unit Tests

```typescript
// tests/unit/auth/passwordValidation.test.ts
describe('PasswordValidation', () => {
  describe('validatePassword', () => {
    test('rejects passwords shorter than 8 characters');
    test('rejects passwords without uppercase letters');
    test('rejects passwords without lowercase letters');
    test('rejects passwords without numbers');
    test('rejects passwords without special characters');
    test('rejects common passwords');
    test('accepts strong passwords');
  });

  describe('calculateStrength', () => {
    test('returns weak for short passwords');
    test('returns fair for medium complexity');
    test('returns good for standard complexity');
    test('returns strong for high complexity');
  });
});

// tests/unit/auth/rateLimiting.test.ts
describe('RateLimiting', () => {
  test('allows requests within limit');
  test('blocks requests exceeding limit');
  test('resets after window expires');
  test('tracks separate windows for different actions');
});

// tests/unit/auth/accountLockout.test.ts
describe('AccountLockout', () => {
  test('allows login before threshold');
  test('locks account after threshold failures');
  test('progressive lockout increases duration');
  test('resets on successful login');
  test('unlocks after duration expires');
});
```

#### A.7.2 Integration Tests

```typescript
// tests/integration/auth.test.ts
describe('Authentication Flow', () => {
  test('successful sign in updates auth state');
  test('failed sign in shows error and records attempt');
  test('locked account prevents further attempts');
  test('sign out clears session');
  test('session refresh maintains authentication');
});
```

#### A.7.3 Security Tests

```typescript
// tests/security/auth.test.ts
describe('Authentication Security', () => {
  test('XSS payload in email is sanitized');
  test('rate limiter prevents brute force');
  test('lockout prevents enumeration attacks');
  test('session timeout logs out inactive users');
});
```

---

## Refinement (R)

### R.1 Implementation Priority

| Priority | Component | Estimated Effort | Risk Mitigation |
|----------|-----------|------------------|-----------------|
| P0 | XSS Sanitization | 2 hours | Critical security fix |
| P1 | Password Validation | 4 hours | High security impact |
| P1 | Rate Limiting | 4 hours | High security impact |
| P2 | Account Lockout | 3 hours | Medium security impact |
| P2 | Session Management | 3 hours | Medium user impact |
| P3 | Security Logging | 2 hours | Low - observability |
| P3 | UI Components | 4 hours | User experience |

### R.2 Migration Path

**Phase 1: Critical Fix (Day 1)**
1. Add DOMPurify sanitization to SharedDocumentPage.tsx
2. Add sanitization utility functions
3. Deploy fix immediately

**Phase 2: Core Security (Days 2-3)**
1. Implement password validation service
2. Implement rate limiting service
3. Update useAuth hook with new validations
4. Add password strength meter to sign up

**Phase 3: Enhanced Security (Days 4-5)**
1. Implement account lockout service
2. Implement session management
3. Add session timeout warning component

**Phase 4: Polish (Days 6-7)**
1. Security event logging
2. Updated UI components
3. Comprehensive testing
4. Documentation

### R.3 Backward Compatibility

All changes maintain backward compatibility:

1. **Mock mode continues to work** - Rate limiting and lockout services are mode-agnostic
2. **Existing API unchanged** - useAuth hook maintains same interface with enhanced internals
3. **Progressive enhancement** - New features degrade gracefully if localStorage unavailable
4. **No database changes** - All state stored client-side

### R.4 Performance Considerations

1. **Rate limiting**: O(1) lookup from Map
2. **Password validation**: Runs synchronously, ~1ms
3. **Session monitoring**: Uses passive event listeners
4. **Sanitization**: DOMPurify is highly optimized

---

## Completion (C)

### C.1 Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-001 | XSS payload in document content is neutralized | Security test |
| AC-002 | Weak passwords are rejected with helpful message | Unit test |
| AC-003 | Login attempts are rate limited (5/15min) | Integration test |
| AC-004 | Account locks after 5 failed attempts | Integration test |
| AC-005 | Locked account shows clear message | Manual test |
| AC-006 | Session times out after inactivity | Integration test |
| AC-007 | User warned before session timeout | Manual test |
| AC-008 | Mock mode maintains full functionality | Unit test |
| AC-009 | All security events are logged | Integration test |
| AC-010 | No TypeScript errors introduced | Build test |

### C.2 Deployment Checklist

- [ ] DOMPurify added to dependencies
- [ ] All new files created in correct locations
- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Mock mode verified working
- [ ] Production mode verified working
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated

### C.3 Rollback Plan

If issues are discovered post-deployment:

1. **Immediate rollback**: Revert to previous deployment
2. **Feature flag**: Disable new auth features via env var `VITE_ENHANCED_AUTH=false`
3. **Selective rollback**: Individual service can be bypassed

### C.4 Monitoring

Post-deployment monitoring points:

1. **Error rate**: Track auth error frequency
2. **Lockout rate**: Monitor lockout triggers
3. **Rate limit hits**: Track rate limiting frequency
4. **Session timeouts**: Monitor timeout occurrences

---

## Appendix

### A. Security Event Log Format

```json
{
  "timestamp": "2025-11-22T15:30:00.000Z",
  "type": "LOGIN_FAILURE",
  "identifier": "a94a8fe5...",
  "metadata": {
    "reason": "INVALID_CREDENTIALS",
    "attemptCount": 3,
    "userAgent": "Mozilla/5.0..."
  }
}
```

### B. Common Password List (Sample)

```
password
123456
password1
qwerty
abc123
letmein
admin
welcome
monkey
dragon
```

### C. Environment Variables

```bash
# Existing
VITE_SUPABASE_URL=your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENABLE_MOCK_MODE=false

# New (optional)
VITE_SESSION_TIMEOUT_MS=3600000      # 1 hour
VITE_RATE_LIMIT_LOGIN_MAX=5          # attempts
VITE_RATE_LIMIT_LOGIN_WINDOW=900000  # 15 minutes
VITE_LOCKOUT_THRESHOLD=5             # attempts
VITE_LOCKOUT_DURATION=1800000        # 30 minutes
VITE_ENHANCED_AUTH=true              # feature flag
```

---

**Document Status:** APPROVED FOR IMPLEMENTATION
**Review Date:** November 22, 2025
**Next Review:** Post-implementation security audit
