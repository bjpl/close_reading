# Deployment Guide

This guide covers how to deploy the Close Reading Platform to Vercel with Supabase backend.

## Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- Supabase account
- Vercel account
- GitHub account (for CI/CD)

## Supabase Setup

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - Name: `close-reading-platform`
   - Database Password: Generate a secure password
   - Region: Choose closest to your users
4. Wait for project to be provisioned (2-3 minutes)

### 2. Configure Database Schema

Run the following SQL in the Supabase SQL Editor:

```sql
-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create annotations table
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  annotation_text TEXT,
  tags TEXT[],
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis_results table
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  analysis_type TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for annotations
CREATE POLICY "Users can view their own annotations"
  ON annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own annotations"
  ON annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations"
  ON annotations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
  ON annotations FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for analysis_results
CREATE POLICY "Users can view their own analysis results"
  ON analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis results"
  ON analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_annotations_document_id ON annotations(document_id);
CREATE INDEX idx_annotations_user_id ON annotations(user_id);
CREATE INDEX idx_analysis_results_document_id ON analysis_results(document_id);
CREATE INDEX idx_analysis_results_user_id ON analysis_results(user_id);
```

### 3. Configure Authentication

1. Go to Authentication > Providers in Supabase dashboard
2. Enable Email authentication
3. Configure email templates (optional)
4. Set up OAuth providers (optional):
   - Google
   - GitHub
   - etc.

### 4. Configure Storage (Optional)

If you want to store document files:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Create storage policies
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 5. Get API Credentials

1. Go to Settings > API in Supabase dashboard
2. Copy the following values:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public API Key

## Vercel Setup

### 1. Create a New Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 2. Configure Environment Variables

In Vercel project settings, add the following environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Found in Supabase Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Found in Supabase Settings > API |

### 3. Get Vercel Credentials for CI/CD

1. Go to Account Settings > Tokens
2. Create a new token with appropriate scope
3. Save the token securely (you'll need it for GitHub Actions)

4. Get your Vercel Organization and Project IDs:
   ```bash
   vercel link
   # This creates .vercel/project.json with orgId and projectId
   ```

## GitHub Actions Setup

### 1. Configure GitHub Secrets

In your GitHub repository, go to Settings > Secrets and Variables > Actions, and add:

| Secret | Value | Description |
|--------|-------|-------------|
| `VERCEL_TOKEN` | Your Vercel API token | Created in Vercel account settings |
| `VERCEL_ORG_ID` | Your Vercel organization ID | Found in `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Found in `.vercel/project.json` |
| `VITE_SUPABASE_URL` | Your Supabase project URL | For testing in CI |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | For testing in CI |

### 2. Test the CI/CD Pipeline

1. Push a commit to a feature branch
2. Create a pull request to main
3. Verify that:
   - Tests run successfully
   - Build completes without errors
   - Preview deployment is created (if configured)

4. Merge to main branch
5. Verify that:
   - Production deployment completes
   - E2E tests run against production
   - Site is accessible at your Vercel URL

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd close_reading
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Post-Deployment Verification

### 1. Verify Application Functionality

1. Visit your Vercel deployment URL
2. Test user registration and login
3. Upload a test document
4. Create annotations
5. Run text analysis
6. Verify search functionality

### 2. Check Performance

1. Run Lighthouse audit in Chrome DevTools
2. Verify Core Web Vitals:
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1

### 3. Monitor Errors

1. Set up error tracking (optional):
   - Sentry
   - LogRocket
   - etc.

2. Monitor Vercel Analytics:
   - Real User Monitoring
   - Web Vitals
   - Audience insights

### 4. Database Health

1. Check Supabase dashboard:
   - Database size
   - Active connections
   - Query performance
   - Table statistics

## Troubleshooting

### Build Failures

**Issue**: Build fails with "out of memory" error

**Solution**: Update Vercel build settings to use more memory:
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ]
}
```

### Environment Variables Not Loading

**Issue**: Environment variables are undefined in production

**Solution**:
1. Verify variables are prefixed with `VITE_`
2. Redeploy after adding variables
3. Check Vercel deployment logs

### Database Connection Issues

**Issue**: Can't connect to Supabase

**Solution**:
1. Verify API URL and key are correct
2. Check Supabase project is active
3. Verify RLS policies are configured
4. Check CORS settings in Supabase

### Authentication Problems

**Issue**: Users can't sign up or log in

**Solution**:
1. Verify email templates are configured
2. Check authentication providers are enabled
3. Verify redirect URLs in Supabase settings
4. Check browser console for errors

## Scaling Considerations

### Database Optimization

1. Add appropriate indexes for frequently queried columns
2. Enable database connection pooling
3. Consider read replicas for high traffic
4. Monitor slow queries

### CDN and Caching

1. Leverage Vercel Edge Network
2. Configure appropriate cache headers
3. Use static asset optimization
4. Consider edge functions for dynamic content

### Performance Monitoring

1. Set up continuous monitoring
2. Create alerts for performance degradation
3. Regular performance audits
4. Load testing for high traffic scenarios

## Security Best Practices

1. **Never commit secrets**: Use environment variables
2. **Enable RLS**: Always use Row Level Security in Supabase
3. **Validate input**: Sanitize user input on both client and server
4. **Use HTTPS**: Ensure all connections are encrypted
5. **Regular updates**: Keep dependencies up to date
6. **Security headers**: Configure CSP, HSTS, etc.
7. **Rate limiting**: Implement rate limiting for API endpoints
8. **Audit logs**: Monitor and log security-relevant events

## Backup and Recovery

### Database Backups

1. Enable automatic daily backups in Supabase
2. Test backup restoration regularly
3. Export critical data periodically
4. Document recovery procedures

### Code Backups

1. Use Git for version control
2. Tag releases appropriately
3. Maintain deployment history
4. Document rollback procedures

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- Project Repository: [GitHub URL]
- Issue Tracker: [GitHub Issues URL]

## Maintenance Schedule

- **Daily**: Monitor error logs and performance metrics
- **Weekly**: Review and triage issues
- **Monthly**: Update dependencies and run security audits
- **Quarterly**: Performance review and optimization
- **Annually**: Architecture review and technology updates
