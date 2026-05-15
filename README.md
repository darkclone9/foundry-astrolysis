# Astrolysis

A custom tabletop RPG game system for [Foundry Virtual Tabletop](https://foundryvtt.com) v14.

Astrolysis is a sci-fi/psionic dice-pool RPG. Checks roll **`{Base}d{Skill die}`** against a target number, where the **Base** stat determines how many dice you roll and your **Skill training** determines the die size.

## Status

Early development — pre-release. Rules are still being designed; expect the data model to change as mechanics evolve.

## Install

1. Open Foundry → **Game Systems** → **Install System**.
2. Paste the manifest URL: `https://github.com/darkclone9/foundry-astrolysis/raw/main/system.json`
3. Click **Install**.

Or clone directly into your Foundry data dir:

```bash
git clone https://github.com/darkclone9/foundry-astrolysis.git "%localappdata%/FoundryVTT/Data/systems/astrolysis"
```

## Core mechanics

- **Dice pool** — Roll `{Base}d{Skill die}`. Sum vs. DC.
- **DC** — `5 + target's relevant stat`.
- **Degrees of success**:
  - **Critical Success**: `total > DC + 2`
  - **Success**: `DC ≤ total ≤ DC + 2`
  - **Minor Failure**: `DC - 2 ≤ total < DC`
  - **Complete Failure**: `total < DC - 2`
- **Bases**: Strength, Dexterity, Stamina, Psyche, Focus.
- **Resources**: Health (Class + Race derived), Madness (linked to Psyche), Movement (linked to Stamina).
- **Archetypes**: Futurist, Ancient, Psionic.

## Project structure

```
astrolysis/
├── system.json                       # Foundry manifest — id, version, document types
├── astrolysis.mjs                    # Entry point — runs on Foundry startup
├── module/
│   ├── data-models.mjs               # Schemas for actors + items (v14 TypeDataModel)
│   ├── sheets.mjs                    # ApplicationV2 sheets for actors + items
│   └── roll.mjs                      # rollAstrolysisCheck — dice-pool resolver
├── templates/
│   ├── actor-character-sheet.hbs     # Character sheet HTML
│   ├── item-archetype-sheet.hbs
│   ├── item-skill-sheet.hbs
│   ├── item-weapon-sheet.hbs
│   └── item-inventory-sheet.hbs
├── styles/
│   └── system.css                    # Brutalist styling, dark/light themes
└── lang/
    └── en.json                       # Localization
```

## Development

The system folder lives directly inside Foundry's data directory at `%localappdata%/FoundryVTT/Data/systems/astrolysis/`. Edit files in place; reload Foundry (`F5` in a world, or **Return to Setup** for manifest changes) to pick up changes.

To pick up changes to:
- `.mjs` / `.css` / `.hbs` files → `F5` in the world.
- `system.json` → restart Foundry from Setup.
- `lang/en.json` → **Return to Setup** and re-enter the world (Foundry caches lang aggressively).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
