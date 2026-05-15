import { CharacterData, ArchetypeData, SkillData, WeaponData, InventoryData, ASTROLYSIS_CONST } from "./module/data-models.mjs";
import { CharacterSheet, ItemSheetAstrolysis } from "./module/sheets.mjs";
import { rollAstrolysisCheck } from "./module/roll.mjs";

Hooks.once("init", () => {
  console.log("Astrolysis | Initializing system");

  // --- Client setting: theme ---
  game.settings.register("astrolysis", "theme", {
    name: "Astrolysis Theme",
    hint: "Visual theme for Astrolysis sheets.",
    scope: "client",
    config: false,
    type: String,
    default: "dark",
    onChange: (value) => {
      for (const app of foundry.applications.instances?.values?.() ?? []) {
        if (app?.element?.classList?.contains("astrolysis")) {
          app.element.dataset.theme = value;
        }
      }
    }
  });

  // --- DataModels ---
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Item.dataModels.archetype  = ArchetypeData;
  CONFIG.Item.dataModels.skill      = SkillData;
  CONFIG.Item.dataModels.weapon     = WeaponData;
  CONFIG.Item.dataModels.inventory  = InventoryData;

  // --- Sheets ---
  const sheetsApi = foundry.applications.apps.DocumentSheetConfig;

  sheetsApi.unregisterSheet(Actor, "core", foundry.applications.sheets.ActorSheetV2);
  sheetsApi.registerSheet(Actor, "astrolysis", CharacterSheet, {
    types: ["character"], makeDefault: true, label: "Astrolysis Character Sheet"
  });

  sheetsApi.unregisterSheet(Item, "core", foundry.applications.sheets.ItemSheetV2);
  sheetsApi.registerSheet(Item, "astrolysis", ItemSheetAstrolysis, {
    types: ["archetype", "skill", "weapon", "inventory"],
    makeDefault: true,
    label: "Astrolysis Item Sheet"
  });

  globalThis.astrolysis = {
    rollAstrolysisCheck,
    const: ASTROLYSIS_CONST,
    models: { CharacterData, ArchetypeData, SkillData, WeaponData, InventoryData }
  };
});

/* ------------------------------------------------------------------ */
/*  Combat: clear lastRolls on every actor when a new ROUND begins.   */
/*  (Per-stat memory now persists across turns within the round.)     */
/* ------------------------------------------------------------------ */

Hooks.on("combatRound", async (combat, updateData, options) => {
  if (!game.user.isGM) return;
  for (const c of combat.combatants) {
    const actor = c.actor;
    if (!actor) continue;
    if (actor.getFlag("astrolysis", "lastRolls")) {
      await actor.unsetFlag("astrolysis", "lastRolls");
    }
  }
});

/* ------------------------------------------------------------------ */
/*  Diagnostic: warn if localization didn't load                      */
/* ------------------------------------------------------------------ */

Hooks.once("ready", () => {
  console.log("Astrolysis | Ready");
  if (game.i18n.localize("astrolysis.Health") === "astrolysis.Health") {
    console.warn(
      "Astrolysis | Localization keys are NOT resolving. " +
      "Foundry has cached a stale lang state. Fix: 'Return to Setup' and re-enter the world, " +
      "or do a hard reload (Ctrl+F5)."
    );
    ui.notifications?.warn(
      "Astrolysis: labels not loading. Return to Setup and re-enter the world to refresh lang/en.json."
    );
  }
});
