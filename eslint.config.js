import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { console: 'readonly', process: 'readonly', self: 'readonly', globalThis: 'readonly', performance: 'readonly', document: 'readonly', window: 'readonly', WebSocket: 'readonly', setTimeout: 'readonly', URL: 'readonly' } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: { fetch: 'readonly', Buffer: 'readonly' } } },
);
