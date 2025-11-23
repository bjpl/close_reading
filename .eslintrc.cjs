module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'docs/**/*.tsx', 'examples/**/*.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Allow @ts-ignore with explanation, prefer @ts-expect-error
    '@typescript-eslint/ban-ts-comment': ['error', {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': 'allow-with-description',
      'ts-nocheck': 'allow-with-description',
      'ts-check': false,
      minimumDescriptionLength: 3,
    }],
    // Prefix unused vars with underscore
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
  },
  overrides: [
    // Test files: relaxed rules for mocking
    {
      files: ['tests/**/*.ts', 'tests/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        }],
        'no-regex-spaces': 'warn',
      },
    },
    // Mock files: need flexibility for dynamic typing
    {
      files: ['src/mocks/**/*.ts', 'src/lib/mock/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        }],
        '@typescript-eslint/no-this-alias': 'off',
      },
    },
    // Context files: allow multiple exports
    {
      files: ['src/contexts/**/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
    // Test utilities
    {
      files: ['tests/utils/**/*.tsx', 'tests/setup.ts'],
      rules: {
        'react-refresh/only-export-components': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    // Test files with dynamic requires for mocking
    {
      files: ['tests/unit/components/HighlightingReliability.test.tsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    // Hooks with database transformations - allow any for Supabase query results
    {
      files: ['src/hooks/useDocuments.ts', 'src/hooks/useParagraphAnnotations.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    // Services with external API integrations
    {
      files: [
        'src/services/ai/*.ts',
        'src/services/AnnotationService.ts',
        'src/services/BibliographyService.ts',
        'src/services/sharing.ts',
        'src/lib/supabaseClient.ts',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    // Pages with complex state transformations
    {
      files: ['src/pages/DocumentPage.tsx', 'src/pages/SharedDocumentPage.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
}
