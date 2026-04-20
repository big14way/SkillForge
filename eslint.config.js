import tseslint from 'typescript-eslint';

// Flat config for ESLint 9, shared across every TS package in the workspace.
// Each package's `pnpm lint` runs eslint over its src/ tree and walks up to
// find this file — no per-package duplication.
//
// Contracts (Solidity), scripts (plain .mjs), the web app (uses `next lint`),
// and the OpenClaw skill (Python, ruff) are all excluded below.

export default tseslint.config(
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/.next/',
      '**/out/',
      '**/coverage/',
      'contracts/',
      'scripts/',
      'packages/web/',
      'packages/openclaw-skill/',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // CLI + indexer legitimately write to stdout/stderr.
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
