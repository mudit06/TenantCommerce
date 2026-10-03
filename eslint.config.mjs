import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'docs/**',
    'research/**',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/app/(payload)/admin/importMap.js',
  ]),
  {
    rules: {
      // docs/16: no `any` (use unknown + zod), no console.log, no deep relative imports
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../../*'],
              message: 'Use the @/ alias instead of climbing more than two folders (docs/16).',
            },
          ],
        },
      ],
    },
  },
  {
    // Scripts print progress for the person running them
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
])
