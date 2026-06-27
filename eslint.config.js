import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

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
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Magic-string union types: use a const object + derived type instead (see CLAUDE.md).
      'no-restricted-syntax': [
        'error',
        {
          selector: `TSTypeAliasDeclaration > TSUnionType:has(TSLiteralType > Literal[raw=/^['"]/])`,
          message:
            'Magic-string union type. Define a `const` object and derive the type from it so the ' +
            'values are also runtime identifiers (see CLAUDE.md "No magic-string union types").',
        },
      ],
    },
  },
  {
    // Game engine must stay deterministic: no wall-clock / unseeded randomness. Use the seeded rng
    // and thread time through state (the engine contract is pure (state, dt) -> state).
    files: ['**/projects/NullSpace/engine/**/*.{ts,tsx}'],
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
