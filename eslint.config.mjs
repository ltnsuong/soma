// Quality gate. Thresholds come from the "AI-кодинг, не вайб-кодинг" talk:
// cyclomatic ≤ 10, cognitive ≤ 15, no dead code, no circular deps.
//
// These are deliberately set to WARN, not error, while App.tsx is still one
// 18k-line file — erroring on day one would report thousands of failures and the
// gate would just get switched off. The ratchet is `npm run lint:ratchet`, which
// fails only when the count goes UP. Flip these to "error" per-rule as the real
// count reaches zero.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'

export default tseslint.config(
  {
    // Build output and vendored code only. Everything we actually author is linted —
    // ignoring source to make the number look better would defeat the ratchet.
    ignores: [
      '**/dist/**', '**/build/**', '**/node_modules/**',
      'expo-web/**', '.vercel/**', 'logo-exports/**',
      '*.config.js', '*.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { sonarjs },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        localStorage: 'readonly', fetch: 'readonly', console: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        alert: 'readonly', confirm: 'readonly', Blob: 'readonly',
        FormData: 'readonly', URL: 'readonly', AbortController: 'readonly',
        MediaRecorder: 'readonly', SpeechSynthesisUtterance: 'readonly',
        speechSynthesis: 'readonly', requestAnimationFrame: 'readonly',
        performance: 'readonly', devicePixelRatio: 'readonly',
        matchMedia: 'readonly', atob: 'readonly', btoa: 'readonly',
        process: 'readonly', require: 'readonly', __dirname: 'readonly',
      },
    },
    rules: {
      // ── the talk's numbers ──────────────────────────────────
      complexity: ['warn', 10],                       // cyclomatic
      'sonarjs/cognitive-complexity': ['warn', 15],
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],

      // ── DRY / KISS / YAGNI ──────────────────────────────────
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // ── real bugs, not style ────────────────────────────────
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',    // too noisy to be useful here yet
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    // Node scripts and the standalone bot — plain Node, not TypeScript, not a browser.
    files: ['backend/**/*.js', 'bot/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        process: 'readonly', console: 'readonly', fetch: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        Blob: 'readonly', FormData: 'readonly', URLSearchParams: 'readonly',
        URL: 'readonly', Buffer: 'readonly', __dirname: 'readonly',
        require: 'readonly', module: 'writable', exports: 'writable',
        window: 'readonly', document: 'readonly', localStorage: 'readonly',
      },
    },
    rules: {
      complexity: ['warn', 10],
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
)
