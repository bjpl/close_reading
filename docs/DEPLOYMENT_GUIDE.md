# Deployment Guide - Close Reading AI Research Platform

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Supabase Configuration](#supabase-configuration)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript compilation errors resolved (`npm run typecheck`)
- [ ] All linting errors fixed (`npm run lint`)
- [ ] All tests passing (`npm run test`)
- [ ] Test coverage >85% (`npm run test:coverage`)
- [ ] No high/critical security vulnerabilities (`npm run security:audit`)

### Build Verification
- [ ] Production build successful (`npm run build:production`)
- [ ] Bundle size <500KB gzipped
- [ ] No console errors in build output
- [ ] Source maps generated (for error tracking)

### Documentation
- [ ] README.md up to date
- [ ] CHANGELOG.md updated with new version
- [ ] API documentation current
- [ ] User guide reviewed

### Configuration
- [ ] Environment variables configured in Vercel
- [ ] Supabase connection tested
- [ ] CDN/static assets configured
- [ ] Security headers verified

## Environment Setup

### 1. Required Environment Variables

#### Vercel Dashboard Configuration

Navigate to **Project Settings > Environment Variables** and add:

```bash
# Production Environment
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Error Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io

# Feature Flags (set per environment)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PRIVACY_MODE=true
VITE_ENABLE_ML_FEATURES=true
```

**Important:** API keys for Claude/Ollama are **user-provided** in the application UI, not set in environment variables.

### 2. Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd close_reading

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local

# Start development server
npm run dev
```

## Vercel Deployment

### Method 1: Automated Deployment (Recommended)

**Prerequisites:**
```bash
npm install -g vercel
vercel login
```

**Deploy to Staging:**
```bash
npm run deploy:staging
```

**Deploy to Production:**
```bash
npm run deploy:production
```

### Method 2: Manual Deployment

**Step 1: Link Project**
```bash
vercel link
```

**Step 2: Deploy to Preview**
```bash
vercel
```

**Step 3: Promote to Production**
```bash
vercel --prod
```

### Method 3: GitHub Integration

1. **Connect Repository to Vercel**
   - Go to https://vercel.com/new
   - Import your Git repository
   - Vercel will auto-detect Vite configuration

2. **Configure Build Settings**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**
   - Add all required variables in Vercel dashboard
   - Set different values for Production/Preview/Development

4. **Deploy**
   - Push to `main` branch → Auto-deploys to production
   - Push to `develop` branch → Auto-deploys to preview
   - Open PR → Auto-creates preview deployment

## Supabase Configuration

### 1. Database Setup

**Create Tables:**
```sql
-- Run these migrations in Supabase SQL Editor

-- Users table (handled by Supabase Auth)
-- Projects table
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Documents table
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects on delete cascade,
  user_id uuid references auth.users not null,
  title text not null,
  content text,
  file_type text,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Annotations table
create table public.annotations (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents on delete cascade,
  user_id uuid references auth.users not null,
  content text not null,
  start_offset integer,
  end_offset integer,
  type text,
  tags text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Paragraph links table
create table public.paragraph_links (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents on delete cascade,
  source_paragraph_id uuid not null,
  target_paragraph_id uuid not null,
  created_at timestamp with time zone default now()
);

-- Performance metrics table (for monitoring)
create table public.web_vitals (
  id uuid primary key default uuid_generate_v4(),
  metric_name text not null,
  value numeric not null,
  rating text,
  user_id uuid references auth.users,
  timestamp timestamp with time zone default now()
);
```

### 2. Row Level Security (RLS)

**Enable RLS on all tables:**
```sql
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.annotations enable row level security;
alter table public.paragraph_links enable row level security;

-- Projects policies
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Similar policies for documents, annotations, paragraph_links
```

### 3. Storage Configuration

**Create storage bucket for document uploads:**
```sql
-- In Supabase Storage settings
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- Set storage policies
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 4. Get Supabase Credentials

1. Go to **Project Settings > API**
2. Copy **Project URL** → `VITE_SUPABASE_URL`
3. Copy **anon/public key** → `VITE_SUPABASE_ANON_KEY`
4. Add to Vercel environment variables

## Post-Deployment Verification

### 1. Smoke Tests

**Test Core Functionality:**
```bash
# Visit production URL
open https://your-app.vercel.app

# Manual checks:
✓ Homepage loads
✓ User can sign up/login
✓ Document upload works
✓ Annotations can be created
✓ AI features functional (with API key)
✓ Privacy mode toggle works
```

### 2. Automated E2E Tests

```bash
# Run E2E tests against production
PLAYWRIGHT_TEST_BASE_URL=https://your-app.vercel.app npm run test:e2e
```

### 3. Performance Checks

**Lighthouse Audit:**
```bash
npx lighthouse https://your-app.vercel.app --view
```

**Target Scores:**
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >80

**Web Vitals:**
- FCP (First Contentful Paint): <1.5s
- LCP (Largest Contentful Paint): <2.5s
- CLS (Cumulative Layout Shift): <0.1
- FID (First Input Delay): <100ms

### 4. Security Verification

**Check Security Headers:**
```bash
curl -I https://your-app.vercel.app

# Should see:
# Content-Security-Policy
# Strict-Transport-Security
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

**SSL Certificate:**
```bash
# Verify HTTPS is enforced
curl -I http://your-app.vercel.app
# Should redirect to HTTPS
```

## Rollback Procedures

### Emergency Rollback

**Quick rollback to previous deployment:**
```bash
npm run deploy:rollback
```

**Or manually via Vercel CLI:**
```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Rollback via Vercel Dashboard

1. Go to **Deployments** tab
2. Find previous stable deployment
3. Click **...** menu → **Promote to Production**

### Post-Rollback Steps

1. **Verify rollback successful**
   ```bash
   curl https://your-app.vercel.app | grep version
   ```

2. **Create incident report**
   - Document what went wrong
   - Timeline of events
   - Root cause analysis
   - Prevention measures

3. **Notify team**
   - Slack/Discord announcement
   - Update status page
   - Customer communication if needed

4. **Fix and redeploy**
   - Fix the issue in codebase
   - Test thoroughly
   - Deploy again following full checklist

## Monitoring & Alerts

### 1. Vercel Analytics

**Enable in Vercel Dashboard:**
- Project Settings > Analytics
- Enable Web Vitals tracking
- Set up Slack/email alerts for:
  - Build failures
  - Performance degradation
  - Error rate spikes

### 2. Sentry Error Tracking

**Setup:**
```bash
# Install Sentry
npm install @sentry/react @sentry/vite-plugin

# Configure in src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

**Configure Alerts:**
- New issue detected
- Error rate >1%
- Performance degradation

### 3. Supabase Monitoring

**Monitor via Supabase Dashboard:**
- Database > Logs → Check for slow queries
- Database > Performance → Optimize indexes
- Auth > Logs → Monitor auth failures
- Storage > Usage → Track storage quotas

### 4. Custom Monitoring

**Track custom metrics:**
```typescript
// src/services/monitoring/WebVitalsService.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

function sendToAnalytics(metric: Metric) {
  // Send to Supabase
  supabase.from('web_vitals').insert({
    metric_name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}
```

## Troubleshooting

### Common Issues

#### 1. Build Fails on Vercel

**Error:** `TypeScript compilation failed`
```bash
# Fix locally first
npm run typecheck
npm run lint
npm run build

# If successful, push to Git
git add .
git commit -m "fix: resolve build errors"
git push
```

#### 2. Environment Variables Not Working

**Symptoms:** Supabase connection fails, blank page

**Solution:**
1. Check Vercel dashboard → Project Settings → Environment Variables
2. Ensure variables are set for correct environment (Production/Preview)
3. Trigger new deployment to apply variables
4. Check browser console for actual error

#### 3. Bundle Size Too Large

**Error:** `Warning: Chunk exceeds 500KB`

**Solutions:**
```bash
# Analyze bundle
npm run build:analyze

# Solutions:
- Lazy load heavy components
- Code split by route
- Remove unused dependencies
- Use dynamic imports for ML models
```

#### 4. CORS Errors

**Symptoms:** API calls to Supabase fail

**Solution:**
```bash
# In Supabase dashboard:
# Project Settings > API > CORS
# Add your Vercel domain: https://your-app.vercel.app
```

#### 5. Slow Performance

**Symptoms:** High LCP, low Lighthouse scores

**Debugging:**
```bash
# Local performance profile
npm run dev
# Open DevTools → Performance → Record

# Check:
- Large bundle size
- Unoptimized images
- Blocking scripts
- Excessive re-renders
```

**Solutions:**
- Implement caching layer
- Lazy load components
- Optimize images (WebP format)
- Use React.memo() for expensive components

#### 6. Memory Leaks

**Symptoms:** Page becomes slow over time

**Debugging:**
```bash
# Chrome DevTools → Memory → Take heap snapshot
# Look for detached DOM nodes and large objects
```

**Common causes:**
- Event listeners not cleaned up
- Timers/intervals not cleared
- Large state objects not garbage collected

### Getting Help

**Internal Resources:**
- Architecture docs: `/docs/architecture/`
- API reference: `/docs/API_REFERENCE.md`
- User guide: `/docs/USER_GUIDE.md`

**External Support:**
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- Vite docs: https://vitejs.dev/guide/

**Contact:**
- DevOps Team: devops@your-company.com
- On-call engineer: see PagerDuty

## Deployment Checklist (Quick Reference)

### Pre-Deployment
- [ ] All tests passing
- [ ] TypeScript clean
- [ ] Bundle size acceptable
- [ ] Security audit passed
- [ ] Documentation updated

### Deployment
- [ ] Deploy to staging first
- [ ] Run E2E tests on staging
- [ ] Get stakeholder approval
- [ ] Deploy to production
- [ ] Verify deployment URL

### Post-Deployment
- [ ] Smoke test critical paths
- [ ] Check error rates in Sentry
- [ ] Monitor Web Vitals
- [ ] Update changelog
- [ ] Notify team of deployment

### If Issues Arise
- [ ] Quick rollback if critical
- [ ] Create incident report
- [ ] Fix issues
- [ ] Redeploy when stable

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0
**Maintained By:** DevOps Team
