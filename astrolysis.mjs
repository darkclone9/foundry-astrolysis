import { CharacterData, NPCData, ArchetypeData, SubArchetypeData, SkillData, WeaponData, ArmorData, InventoryData, ASTROLYSIS_CONST } from "./module/data-models.mjs";
import { CharacterSheet, NPCSheet, ItemSheetAstrolysis } from "./module/sheets.mjs";
import { rollAstrolysisCheck } from "./module/roll.mjs";
import {
  getAstrolysisInitiativeFormula,
  patchAstrolysisCombat,
  registerAstrolysisCombatHooks,
  rollActorInitiativeToCombat,
  rollAstrolysisInitiative
} from "./module/combat.mjs";

Hooks.once("init", () => {
  console.log("Astrolysis | Initializing system");

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

  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc       = NPCData;
  CONFIG.Item.dataModels.archetype  = ArchetypeData;
  CONFIG.Item.dataModels.subarchetype = SubArchetypeData;
  CONFIG.Item.dataModels.skill      = SkillData;
  CONFIG.Item.dataModels.weapon     = WeaponData;
  CONFIG.Item.dataModels.armor      = ArmorData;
  CONFIG.Item.dataModels.inventory  = InventoryData;

  patchAstrolysisCombat();
  registerAstrolysisCombatHooks();

  const sheetsApi = foundry.applications.apps.DocumentSheetConfig;

  sheetsApi.unregisterSheet(Actor, "core", foundry.applications.sheets.ActorSheetV2);
  sheetsApi.registerSheet(Actor, "astrolysis", CharacterSheet, {
    types: ["character"], makeDefault: true, label: "Astrolysis Character Sheet"
  });
  sheetsApi.registerSheet(Actor, "astrolysis", NPCSheet, {
    types: ["npc"], makeDefault: true, label: "Astrolysis NPC Sheet"
  });

  sheetsApi.unregisterSheet(Item, "core", foundry.applications.sheets.ItemSheetV2);
  sheetsApi.registerSheet(Item, "astrolysis", ItemSheetAstrolysis, {
    types: ["archetype", "subarchetype", "skill", "weapon", "armor", "inventory"],
    makeDefault: true,
    label: "Astrolysis Item Sheet"
  });

  globalThis.astrolysis = {
    rollAstrolysisCheck,
    rollAstrolysisInitiative,
    rollActorInitiativeToCombat,
    getAstrolysisInitiativeFormula,
    const: ASTROLYSIS_CONST,
    models: { CharacterData, NPCData, ArchetypeData, SubArchetypeData, SkillData, WeaponData, ArmorData, InventoryData }
  };
});

/* ------------------------------------------------------------------ */
/*  Diagnostic: warn if localization didn't load                      */
/* ------------------------------------------------------------------ */

Hooks.once("ready", () => {
  console.log("Astrolysis | Ready");
  if (game.i18n.localize("astrolysis.Health") === "astrolysis.Health") {
    console.warn(
      "Astrolysis | Localization keys are NOT resolving. " +
      "Return to Setup and re-enter the world, or hard-reload (Ctrl+F5)."
    );
    ui.notifications?.warn(
      "Astrolysis: labels not loading. Return to Setup and re-enter the world."
    );
  }
});
