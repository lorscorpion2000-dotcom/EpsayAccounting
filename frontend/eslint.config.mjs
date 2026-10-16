// Flat config for Epsay Frontend (v3)
import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default ts.config(
  {
    ignores: [
      'dist', 'build', 'coverage', 'node_modules', 'public',
      '_*.mjs',       // temp scripts
      '*.config.js',  // tool configs
      'scripts/**',   // tool scripts
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-constant-binary-expression': 'warn',
      'prefer-const': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // exhaustive-deps: intentionally off — many loaders are stable closures;
      // enabling triggers ~104 false-positives requiring useCallback refactor.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
);
