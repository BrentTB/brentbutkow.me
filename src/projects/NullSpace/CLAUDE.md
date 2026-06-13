# NullSpace/CLAUDE.md

Null Space game changelog rule. See [root CLAUDE.md](../../../CLAUDE.md) for global rules.

When changing the Null Space game, update `CHANGELOG` and `GAME_VERSION` in [data.ts](data.ts). Semver:

- **Major (x.0.0)**: breaking (save-format incompatibility, removed features)
- **Minor (0.x.0)**: new features (enemies, abilities, upgrades, UI)
- **Patch (0.0.x)**: bug fixes, balance tweaks, visual polish

Each entry has `version`, `date`, `changes` with optional `breaking`, `features`, `balance`, `fixes` arrays.
Use `balance` for pure data-value changes (damage, costs, speeds) with no code change. Changelog shows collapsed below the game canvas on desktop.
