import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

// Shared no-restricted-syntax entries — the rule's options are monolithic, so file-scope
// overrides re-list the entries that still apply.
const magicStringUnion = {
  selector: `TSTypeAliasDeclaration > TSUnionType:has(TSLiteralType > Literal[raw=/^['"]/])`,
  message:
    'Magic-string union type. Define a `const` object and derive the type from it so the ' +
    'values are also runtime identifiers (see CLAUDE.md "No magic-string union types").',
}
const noDefaultExport = {
  selector: 'ExportDefaultDeclaration',
  message: 'Named exports only — no `default` (see CLAUDE.md "Named exports only").',
}
// Raw <a> in JSX — same-page hash anchors (href="#...") are fine; everything else goes through
// SafeLink (external, auto target=_blank + rel) or Router <Link> (internal).
const rawAnchor = {
  selector:
    `JSXOpeningElement[name.name='a']` +
    `:not(:has(JSXAttribute[name.name='href'] Literal[value=/^#/]))` +
    `:not(:has(JSXAttribute[name.name='href'] TemplateLiteral[quasis.0.value.raw=/^#/]))`,
  message:
    'Raw <a> in JSX. External links use SafeLink; internal links use Router <Link> ' +
    '(see CLAUDE.md "External links via SafeLink").',
}

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // autoFocus is deliberate UX on single-purpose screens (admin login) — not a blanket a11y win.
      'jsx-a11y/no-autofocus': 'off',
      'no-restricted-syntax': ['error', magicStringUnion, noDefaultExport, rawAnchor],
    },
  },
  {
    // SafeLink is the one place a raw non-hash anchor is rendered.
    files: ['**/components/utils/SafeLink.tsx'],
    rules: {
      'no-restricted-syntax': ['error', magicStringUnion, noDefaultExport],
    },
  },
  {
    // Tooling configs (Vite, etc.) — the tool API requires a default export.
    files: ['*.config.{js,ts}'],
    rules: {
      'no-restricted-syntax': ['error', magicStringUnion],
    },
  },
  {
    // Game engines must stay deterministic: no wall-clock / unseeded randomness. Use the seeded rng
    // and thread time through state (the engine contract is pure (state, dt) -> state). Grain's
    // engine is seeded from the page layer, so its rng module needs no exemption.
    files: [
      '**/projects/NullSpace/engine/**/*.{ts,tsx}',
      '**/projects/PixelWorldSimulator/engine/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Non-deterministic in the engine — use the seeded rng instead.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Wall-clock breaks determinism in the engine — thread time through state/dt.',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'Wall-clock breaks determinism in the engine — thread time through state/dt.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        magicStringUnion,
        noDefaultExport,
        {
          selector: `NewExpression[callee.name='Date']`,
          message: 'Wall-clock breaks determinism in the engine — thread time through state/dt.',
        },
      ],
    },
  },
  {
    // The rng module is the one seam where wall-clock entropy legitimately enters — it seeds the
    // generator at session start (tests pin it via setSessionSeed). Everything downstream is seeded.
    files: ['**/projects/NullSpace/engine/math/random.ts'],
    rules: { 'no-restricted-properties': 'off' },
  }
)
