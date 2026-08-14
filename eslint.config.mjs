// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import jupyterPlugin from '@jupyter/eslint-plugin';

export default defineConfig([
  {
    ignores: [
      '**/node_modules',
      '**/*.js',
      '**/*.mjs',
      '**/*.d.ts',
      '**/venv',
      '**/.venv',
      'lib',
      'dist',
      'coverage',
      'lite',
      'style',
      'jupyterlite_pdf_exporter',
      'ui-tests/pdf-output',
      'ui-tests/playwright-report',
      'ui-tests/test-results'
    ]
  },
  {
    plugins: {
      jupyter: jupyterPlugin
    }
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  jupyterPlugin.configs.recommended,
  prettierRecommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2015,
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        sourceType: 'module'
      }
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: true
          }
        }
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'prefer-arrow-callback': 'error'
    }
  }
]);
