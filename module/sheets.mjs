import { rollAstrolysisCheck } from "./roll.mjs";
import { ASTROLYSIS_CONST } from "./data-models.mjs";
import {
  getAstrolysisInitiativeFormula,
  rollActorInitiativeToCombat
} from "./combat.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;

const CHARACTER_TABS = [
  { id: "bases",      labelKey: "astrolysis.Bases",      icon: "fa-solid fa-dice-d20" },
  { id: "skills",     labelKey: "astrolysis.Skills",     icon: "fa-solid fa-brain" },
  { id: "weapons",    labelKey: "astrolysis.Weapons",    icon: "fa-solid fa-crosshairs" },
  { id: "inventory",  labelKey: "astrolysis.Inventory",  icon: "fa-solid fa-box-open" },
  { id: "archetypes", labelKey: "astrolysis.Archetypes", icon: "fa-solid fa-id-card" },
  { id: "biography",  labelKey: "astrolysis.Biography",  icon: "fa-solid fa-book-open" }
];

const NPC_TABS = [
  { id: "bases",     labelKey: "astrolysis.Bases",      icon: "fa-solid fa-dice-d20" },
  { id: "skills",    labelKey: "astrolysis.NPCActions", icon: "fa-solid fa-bolt" },
  { id: "weapons",   labelKey: "astrolysis.Weapons",    icon: "fa-solid fa-crosshairs" },
  { id: "inventory", labelKey: "astrolysis.Inventory",  icon: "fa-solid fa-box-open" },
  { id: "archetypes", labelKey: "astrolysis.Archetypes", icon: "fa-solid fa-id-card" },
  { id: "tactics",   labelKey: "astrolysis.Tactics",    icon: "fa-solid fa-route" },
  { id: "biography", labelKey: "astrolysis.Notes",      icon: "fa-solid fa-book-open" }
];

const LABEL_FALLBACKS = {
  "astrolysis.Name": "Name",
  "astrolysis.CharacterName": "Character Name",
  "astrolysis.NPCName": "NPC Name",
  "astrolysis.NPCRole": "Role",
  "astrolysis.Morale": "Morale",
  "astrolysis.Tactics": "Tactics",
  "astrolysis.Notes": "Notes",
  "astrolysis.NPCActions": "Actions",
  "astrolysis.AddAction": "Add Action",
  "astrolysis.EmptyActions": "No actions configured.",
  "astrolysis.Level": "Level",
  "astrolysis.LevelAbbr": "LVL",
  "astrolysis.Health": "Health",
  "astrolysis.Madness": "Madness",
  "astrolysis.PsycheDamage": "Psyche Damage",
  "astrolysis.Conditions": "Conditions",
  "astrolysis.ActiveConditions": "Active Conditions",
  "astrolysis.NoConditions": "No Conditions",
  "astrolysis.SelectCondition": "Select Condition",
  "astrolysis.AddCondition": "Add Condition",
  "astrolysis.RemoveCondition": "Remove Condition",
  "astrolysis.AddPsycheDamage": "Add Psyche Damage",
  "astrolysis.ReducePsycheDamage": "Reduce Psyche Damage",
  "astrolysis.ClearCondition": "Clear",
  "astrolysis.Movement": "Movement",
  "astrolysis.Biography": "Biography",
  "astrolysis.Bases": "Bases",
  "astrolysis.Base": "Base",
  "astrolysis.Skills": "Skills",
  "astrolysis.Weapons": "Weapons",
  "astrolysis.Weapon": "Weapon",
  "astrolysis.Armor": "Armor",
  "astrolysis.EquippedArmor": "Equipped Armor",
  "astrolysis.NoArmorEquipped": "No Armor Equipped",
  "astrolysis.Archetypes": "Archetypes",
  "astrolysis.Inventory": "Inventory",
  "astrolysis.Roll": "Roll",
  "astrolysis.Check": "Check",
  "astrolysis.Attack": "Attack",
  "astrolysis.Defense": "Defense",
  "astrolysis.Defenses": "Defenses",
  "astrolysis.TargetsDefense": "Targets Defense",
  "astrolysis.Damage": "Damage",
  "astrolysis.ArmorDefense": "Defense Bonus",
  "astrolysis.MaxDexBonus": "Max Dex Bonus",
  "astrolysis.ArmorPenalty": "Armor Penalty",
  "astrolysis.Bulk": "Bulk",
  "astrolysis.TotalBulk": "Total Bulk",
  "astrolysis.MaxBulk": "Max Bulk",
  "astrolysis.Category": "Category",
  "astrolysis.ArchetypeSlot": "Slot",
  "astrolysis.PrimaryArchetype": "Archetype",
  "astrolysis.SubArchetypeClass": "Sub-Archetype / Class",
  "astrolysis.SubArchetype": "Sub-Archetype",
  "astrolysis.NewSubArchetype": "New Sub-Archetype",
  "astrolysis.AddSubArchetype": "Add Sub-Archetype",
  "astrolysis.SubArchetypeBuilder": "Sub-Archetype Builder",
  "astrolysis.ParentArchetype": "Parent Archetype",
  "astrolysis.EmptyArchetypeSlot": "Empty Slot",
  "astrolysis.HealthBonus": "Health Bonus",
  "astrolysis.Training": "Training",
  "astrolysis.CustomModifier": "Custom Modifier",
  "astrolysis.Specialization": "Specialization",
  "astrolysis.RollProfile": "Roll Profile",
  "astrolysis.FeatureDetails": "Feature Details",
  "astrolysis.RollFormula": "Roll Formula",
  "astrolysis.SkillBuilder": "Skill / Feature Builder",
  "astrolysis.ArchetypeBuilder": "Archetype Builder",
  "astrolysis.FeatureName": "Feature Name",
  "astrolysis.FeatureText": "Feature Text",
  "astrolysis.AddFeature": "Add Feature",
  "astrolysis.RemoveFeature": "Remove Feature",
  "astrolysis.EmptyFeatures": "No features yet.",
  "astrolysis.MechanicalSummary": "Mechanical Summary",
  "astrolysis.Description": "Description",
  "astrolysis.DamageBonus": "Damage Bonus",
  "astrolysis.Quantity": "Quantity",
  "astrolysis.Weight": "Weight",
  "astrolysis.Equipped": "Equipped",
  "astrolysis.Unequipped": "Unequipped",
  "astrolysis.Initiative": "Initiative",
  "astrolysis.StatusRail": "Character Status",
  "astrolysis.ChangeImage": "Change Image",
  "astrolysis.ToggleTheme": "Toggle Theme",
  "astrolysis.RollInitiative": "Roll Initiative",
  "astrolysis.LastRoll": "Last Roll",
  "astrolysis.Current": "Current",
  "astrolysis.Maximum": "Maximum",
  "astrolysis.Edit": "Edit",
  "astrolysis.Delete": "Delete",
  "astrolysis.DeleteItem": "Delete Item",
  "astrolysis.ToggleEquipped": "Toggle Equipped",
  "astrolysis.ItemDetails": "Item Details",
  "astrolysis.StaticDC": "Static DC 5",
  "astrolysis.BiographyPlaceholder": "Backstory, motives, contacts, scars...",
  "astrolysis.EmptySkills": "No skills logged.",
  "astrolysis.EmptyWeapons": "No weapons armed.",
  "astrolysis.EmptyInventory": "No inventory cargo.",
  "astrolysis.EmptyArmor": "No armor available.",
  "astrolysis.EmptyArchetypes": "No archetypes assigned.",
  "astrolysis.NewSkill": "New Skill",
  "astrolysis.NewWeapon": "New Weapon",
  "astrolysis.NewArmor": "New Armor",
  "astrolysis.NewArchetype": "New Archetype",
  "astrolysis.NewInventory": "New Inventory Item",
  "astrolysis.AddSkill": "Add Skill",
  "astrolysis.AddWeapon": "Add Weapon",
  "astrolysis.AddArmor": "Add Armor",
  "astrolysis.AddArchetype": "Add Archetype",
  "astrolysis.AddInventory": "Add Inventory",
  "astrolysis.AddSampleArchetype": "Add Sample Archetype",
  "astrolysis.GrantedFeatures": "Granted Features",
  "astrolysis.StatBonuses": "Stat Bonuses",
  "astrolysis.BaseBoosts": "Base Boosts",
  "astrolysis.NoBaseBoosts": "No Base Boosts",
  "astrolysis.BulkSources": "Bulk Sources",
  "astrolysis.ItemKind": "Item Kind",
  "astrolysis.Gear": "Gear",
  "astrolysis.InventoryItem": "Inventory Item",
  "astrolysis.Condition.bleeding": "Bleeding",
  "astrolysis.Condition.blinded": "Blinded",
  "astrolysis.Condition.burning": "Burning",
  "astrolysis.Condition.dazed": "Dazed",
  "astrolysis.Condition.frightened": "Frightened",
  "astrolysis.Condition.grappled": "Grappled",
  "astrolysis.Condition.prone": "Prone",
  "astrolysis.Condition.stunned": "Stunned",
  "astrolysis.Condition.poisoned": "Poisoned",
  "astrolysis.Condition.wounded": "Wounded",
  "astrolysis.Base.strength": "Strength",
  "astrolysis.Base.dexterity": "Dexterity",
  "astrolysis.Base.stamina": "Stamina",
  "astrolysis.Base.psyche": "Psyche",
  "astrolysis.Base.focus": "Focus",
  "astrolysis.Training.untrained": "Untrained",
  "astrolysis.Training.trained": "Trained",
  "astrolysis.Training.expert": "Expert",
  "astrolysis.Training.master": "Master",
  "astrolysis.Training.grand": "Grand",
  "astrolysis.Archetype.futurist": "Futurist",
  "astrolysis.Archetype.ancient": "Ancient",
  "astrolysis.Archetype.psionic": "Psionic",
  "astrolysis.ArchetypeSlot.archetype": "Archetype",
  "astrolysis.ArchetypeSlot.subarchetype": "Sub-Archetype / Class",
  "astrolysis.InventoryKind.gear": "Gear",
  "astrolysis.InventoryKind.armor": "Armor",
  "TYPES.Actor.character": "Character",
  "TYPES.Actor.npc": "NPC",
  "TYPES.Item.archetype": "Archetype",
  "TYPES.Item.subarchetype": "Sub-Archetype",
  "TYPES.Item.skill": "Skill",
  "TYPES.Item.weapon": "Weapon",
  "TYPES.Item.armor": "Armor",
  "TYPES.Item.inventory": "Inventory Item"
};

const LABELS = {
  Name: "astrolysis.Name",
  CharacterName: "astrolysis.CharacterName",
  NPCName: "astrolysis.NPCName",
  NPCRole: "astrolysis.NPCRole",
  Morale: "astrolysis.Morale",
  Tactics: "astrolysis.Tactics",
  Notes: "astrolysis.Notes",
  NPCActions: "astrolysis.NPCActions",
  AddAction: "astrolysis.AddAction",
  EmptyActions: "astrolysis.EmptyActions",
  Level: "astrolysis.Level",
  LevelAbbr: "astrolysis.LevelAbbr",
  Health: "astrolysis.Health",
  Madness: "astrolysis.Madness",
  PsycheDamage: "astrolysis.PsycheDamage",
  Conditions: "astrolysis.Conditions",
  ActiveConditions: "astrolysis.ActiveConditions",
  NoConditions: "astrolysis.NoConditions",
  SelectCondition: "astrolysis.SelectCondition",
  AddCondition: "astrolysis.AddCondition",
  RemoveCondition: "astrolysis.RemoveCondition",
  AddPsycheDamage: "astrolysis.AddPsycheDamage",
  ReducePsycheDamage: "astrolysis.ReducePsycheDamage",
  ClearCondition: "astrolysis.ClearCondition",
  Movement: "astrolysis.Movement",
  Biography: "astrolysis.Biography",
  Bases: "astrolysis.Bases",
  Base: "astrolysis.Base",
  Skills: "astrolysis.Skills",
  Weapons: "astrolysis.Weapons",
  Weapon: "astrolysis.Weapon",
  Armor: "astrolysis.Armor",
  EquippedArmor: "astrolysis.EquippedArmor",
  NoArmorEquipped: "astrolysis.NoArmorEquipped",
  Archetypes: "astrolysis.Archetypes",
  Inventory: "astrolysis.Inventory",
  Roll: "astrolysis.Roll",
  Attack: "astrolysis.Attack",
  Defense: "astrolysis.Defense",
  Defenses: "astrolysis.Defenses",
  TargetsDefense: "astrolysis.TargetsDefense",
  Damage: "astrolysis.Damage",
  ArmorDefense: "astrolysis.ArmorDefense",
  MaxDexBonus: "astrolysis.MaxDexBonus",
  ArmorPenalty: "astrolysis.ArmorPenalty",
  Bulk: "astrolysis.Bulk",
  TotalBulk: "astrolysis.TotalBulk",
  MaxBulk: "astrolysis.MaxBulk",
  Category: "astrolysis.Category",
  ArchetypeSlot: "astrolysis.ArchetypeSlot",
  PrimaryArchetype: "astrolysis.PrimaryArchetype",
  SubArchetypeClass: "astrolysis.SubArchetypeClass",
  SubArchetype: "astrolysis.SubArchetype",
  NewSubArchetype: "astrolysis.NewSubArchetype",
  AddSubArchetype: "astrolysis.AddSubArchetype",
  SubArchetypeBuilder: "astrolysis.SubArchetypeBuilder",
  ParentArchetype: "astrolysis.ParentArchetype",
  EmptyArchetypeSlot: "astrolysis.EmptyArchetypeSlot",
  HealthBonus: "astrolysis.HealthBonus",
  Training: "astrolysis.Training",
  CustomModifier: "astrolysis.CustomModifier",
  Specialization: "astrolysis.Specialization",
  RollProfile: "astrolysis.RollProfile",
  FeatureDetails: "astrolysis.FeatureDetails",
  RollFormula: "astrolysis.RollFormula",
  SkillBuilder: "astrolysis.SkillBuilder",
  ArchetypeBuilder: "astrolysis.ArchetypeBuilder",
  FeatureName: "astrolysis.FeatureName",
  FeatureText: "astrolysis.FeatureText",
  AddFeature: "astrolysis.AddFeature",
  RemoveFeature: "astrolysis.RemoveFeature",
  EmptyFeatures: "astrolysis.EmptyFeatures",
  MechanicalSummary: "astrolysis.MechanicalSummary",
  Description: "astrolysis.Description",
  DamageBonus: "astrolysis.DamageBonus",
  Quantity: "astrolysis.Quantity",
  Weight: "astrolysis.Weight",
  Equipped: "astrolysis.Equipped",
  Unequipped: "astrolysis.Unequipped",
  Initiative: "astrolysis.Initiative",
  StatusRail: "astrolysis.StatusRail",
  ChangeImage: "astrolysis.ChangeImage",
  ToggleTheme: "astrolysis.ToggleTheme",
  RollInitiative: "astrolysis.RollInitiative",
  LastRoll: "astrolysis.LastRoll",
  DieSize: "astrolysis.DieSize",
  SelectDieSize: "astrolysis.SelectDieSize",
  StaminaSubstats: "astrolysis.StaminaSubstats",
  SubstatModifierTooltip: "astrolysis.SubstatModifierTooltip",
  SubstatDiceTooltip: "astrolysis.SubstatDiceTooltip",
  Current: "astrolysis.Current",
  Maximum: "astrolysis.Maximum",
  Edit: "astrolysis.Edit",
  Delete: "astrolysis.Delete",
  ToggleEquipped: "astrolysis.ToggleEquipped",
  ItemDetails: "astrolysis.ItemDetails",
  StaticDC: "astrolysis.StaticDC",
  BiographyPlaceholder: "astrolysis.BiographyPlaceholder",
  EmptySkills: "astrolysis.EmptySkills",
  EmptyWeapons: "astrolysis.EmptyWeapons",
  EmptyInventory: "astrolysis.EmptyInventory",
  EmptyArmor: "astrolysis.EmptyArmor",
  EmptyArchetypes: "astrolysis.EmptyArchetypes",
  AddSkill: "astrolysis.AddSkill",
  AddWeapon: "astrolysis.AddWeapon",
  AddArmor: "astrolysis.AddArmor",
  AddArchetype: "astrolysis.AddArchetype",
  AddInventory: "astrolysis.AddInventory",
  AddSampleArchetype: "astrolysis.AddSampleArchetype",
  GrantedFeatures: "astrolysis.GrantedFeatures",
  StatBonuses: "astrolysis.StatBonuses",
  BaseBoosts: "astrolysis.BaseBoosts",
  NoBaseBoosts: "astrolysis.NoBaseBoosts",
  BulkSources: "astrolysis.BulkSources",
  ItemKind: "astrolysis.ItemKind",
  Gear: "astrolysis.Gear",
  InventoryItem: "astrolysis.InventoryItem"
};

/** Return the first currently-targeted Token (Ctrl+click on a token), or null. */
function getSelectedTarget() {
  return [...(game.user.targets ?? [])][0] ?? null;
}

function localize(key) {
  const value = game.i18n?.localize?.(key) ?? key;
  if (value && value !== key && !value.includes(".")) return value;
  return LABEL_FALLBACKS[key] ?? humanizeKey(key);
}

function humanizeKey(key) {
  return String(key)
    .replace(/^astrolysis\./, "")
    .replace(/^TYPES\.(Actor|Item)\./, "")
    .split(".")
    .at(-1)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getLabels() {
  return Object.fromEntries(Object.entries(LABELS).map(([name, key]) => [name, localize(key)]));
}

function getBaseLabel(key) {
  return localize(`astrolysis.Base.${key}`);
}

function getBaseOptions(selected) {
  return ASTROLYSIS_CONST.BASE_KEYS.map(key => ({
    key,
    label: getBaseLabel(key),
    selected: key === selected
  }));
}

function getTrainingOptions(selected) {
  return Object.entries(ASTROLYSIS_CONST.TRAINING_DIE).map(([key, size]) => ({
    key,
    size,
    label: localize(`astrolysis.Training.${key}`),
    selected: key === selected
  }));
}

function getDieSizeForTraining(training) {
  return ASTROLYSIS_CONST.TRAINING_DIE[training] ?? ASTROLYSIS_CONST.TRAINING_DIE.untrained ?? 4;
}

function getArchetypeOptions(selected) {
  return ASTROLYSIS_CONST.ARCHETYPES.map(key => ({
    key,
    label: localize(`astrolysis.Archetype.${key}`),
    selected: key === selected
  }));
}

function getArchetypeSlotOptions(selected) {
  return ASTROLYSIS_CONST.ARCHETYPE_SLOTS.map(key => ({
    key,
    label: getArchetypeSlotLabel(key),
    selected: key === selected
  }));
}

function getInventoryKindOptions(selected) {
  return ASTROLYSIS_CONST.INVENTORY_KINDS.map(key => ({
    key,
    label: getInventoryKindLabel(key),
    selected: key === selected
  }));
}

function getArchetypeSlotLabel(key) {
  return localize(`astrolysis.ArchetypeSlot.${key}`);
}

function getInventoryKindLabel(key) {
  return localize(`astrolysis.InventoryKind.${key}`);
}

function isArmorItem(item) {
  return item?.type === "armor" || (item?.type === "inventory" && item.system?.kind === "armor");
}

function isPrimaryArchetypeItem(item) {
  return item?.type === "archetype" && (item.system?.slot ?? "archetype") === "archetype";
}

function isSubArchetypeItem(item) {
  return item?.type === "subarchetype" || (item?.type === "archetype" && item.system?.slot === "subarchetype");
}

function enrichSkillLikeItem(item) {
  const base = item.system.base;
  const training = item.system.training;
  const bulk = getItemBulk(item);
  const preview = getSkillRollPreview(item);
  return {
    id: item.id,
    name: item.name,
    system: item.system,
    baseLabel: base ? getBaseLabel(base) : "",
    trainingLabel: training ? localize(`astrolysis.Training.${training}`) : "",
    rollFormula: preview.formula,
    dieSize: preview.dieSize,
    bulk
  };
}

function getItemActor(item) {
  if (item?.actor) return item.actor;
  if (item?.parent?.documentName === "Actor") return item.parent;
  return null;
}

function getSkillRollPreview(item) {
  const base = item.system.base ?? "strength";
  const dieSize = getDieSizeForTraining(item.system.training);
  const modifier = Number(item.system.modifier ?? 0) || 0;
  const actor = getItemActor(item);
  const dice = Number(actor?.system?.bases?.[base]);
  const pool = Number.isFinite(dice) ? `${Math.max(1, dice)}d${dieSize}` : `{${getBaseLabel(base)}}d${dieSize}`;
  const modifierLabel = modifier ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : "";

  return {
    base,
    dieSize,
    dice: Number.isFinite(dice) ? Math.max(1, dice) : null,
    formula: `${pool}${modifierLabel}`
  };
}

function getWeaponRollPreview(item) {
  const preview = getSkillRollPreview(item);
  const bonus = Number(item.system.damageBonus ?? 0) || 0;
  const bonusLabel = bonus ? ` ${bonus > 0 ? "+" : "-"} ${Math.abs(bonus)}` : "";
  return {
    ...preview,
    formula: `${preview.dice ?? `{${getBaseLabel(preview.base)}}`}d${preview.dieSize}${bonusLabel}`
  };
}

function getConditionLabel(id) {
  if (!ASTROLYSIS_CONST.CONDITIONS[id]) return humanizeKey(id);
  return localize(`astrolysis.Condition.${id}`);
}

function getFeatureSlots(features = []) {
  return [...features].map((feature, index) => ({
    index,
    name: feature?.name ?? "",
    description: feature?.description ?? ""
  }));
}

function getManualConditionIds(actor) {
  const valid = new Set(Object.keys(ASTROLYSIS_CONST.CONDITIONS));
  return [...new Set(actor.system.conditions ?? [])].filter(id => valid.has(id));
}

function getConditionContext(actor) {
  const manualIds = getManualConditionIds(actor);
  const manual = manualIds.map(id => ({
    id,
    label: getConditionLabel(id),
    automatic: false
  }));
  const madnessActive = (actor.system.madness?.value ?? 0) > 0;
  const active = madnessActive
    ? [{ id: "madness", label: localize("astrolysis.Madness"), automatic: true }, ...manual]
    : manual;
  const options = Object.keys(ASTROLYSIS_CONST.CONDITIONS).map(id => ({
    id,
    label: getConditionLabel(id),
    active: manualIds.includes(id)
  }));

  return { active, options };
}

function getItemBulk(item) {
  const bulk = Number(item.system.bulk ?? 0) || 0;
  if (item.type !== "inventory") return bulk;

  const sourceBulk = item._source?.system?.bulk;
  const bulkMissing = sourceBulk === undefined || sourceBulk === null || sourceBulk === "";
  if (bulkMissing) return Number(item.system.weight ?? 0) || 0;
  return bulk;
}

function getItemBulkTotal(item) {
  const bulk = getItemBulk(item);
  if (item.type === "inventory" && !isArmorItem(item)) return bulk * (Number(item.system.quantity ?? 1) || 0);
  return bulk;
}

function getBulkContext(actor) {
  const items = actor.items.filter(i => ["inventory", "weapon", "armor"].includes(i.type));
  const total = items.reduce((sum, item) => sum + getItemBulkTotal(item), 0);
  const max = Number(actor.system.maxBulk ?? 0) || 0;
  const percent = max ? Math.min(100, Math.round((total / max) * 100)) : 0;
  const state = max && total > max ? "over" : max && total >= max * 0.8 ? "near" : "ok";
  const sources = items
    .map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      typeLabel: getBulkSourceTypeLabel(item),
      bulk: getItemBulk(item),
      totalBulk: getItemBulkTotal(item),
      quantity: item.type === "inventory" && !isArmorItem(item) ? Number(item.system.quantity ?? 1) || 0 : 1
    }))
    .filter(source => source.totalBulk > 0);

  return {
    total,
    max,
    percent,
    state,
    label: `${formatBulk(total)} / ${formatBulk(max)}`,
    sources
  };
}

function getBulkSourceTypeLabel(item) {
  if (isArmorItem(item)) return localize("astrolysis.Armor");
  if (item.type === "weapon") return localize("astrolysis.Weapon");
  return localize("astrolysis.InventoryItem");
}

function formatBulk(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatSignedNumber(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${number}`;
}

function getStatBonusEntries(statBonuses = {}) {
  return ASTROLYSIS_CONST.BASE_KEYS
    .map(key => ({
      key,
      label: getBaseLabel(key),
      value: Number(statBonuses?.[key] ?? 0),
      signed: formatSignedNumber(statBonuses?.[key] ?? 0)
    }))
    .filter(stat => stat.value !== 0);
}

function enrichInventoryItem(item) {
  const bulk = getItemBulk(item);
  return {
    id: item.id,
    name: item.name,
    system: item.system,
    bulk,
    totalBulk: getItemBulkTotal(item)
  };
}

function enrichArmorItem(item) {
  return {
    id: item.id,
    name: item.name,
    system: item.system,
    bulk: getItemBulk(item)
  };
}

function enrichArchetypeItem(item) {
  const statBonuses = getStatBonusEntries(item.system.statBonuses);

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    system: item.system,
    slot: isSubArchetypeItem(item) ? "subarchetype" : "archetype",
    slotLabel: isSubArchetypeItem(item) ? localize("astrolysis.SubArchetype") : localize("astrolysis.PrimaryArchetype"),
    categoryLabel: localize(`astrolysis.Archetype.${item.system.category}`),
    statBonuses,
    boostLabel: statBonuses.length
      ? statBonuses.map(stat => `${stat.label} ${stat.signed}`).join(", ")
      : localize("astrolysis.NoBaseBoosts"),
    grantedFeatures: (item.system.grantedFeatures ?? []).filter(feature =>
      feature?.name || feature?.description
    )
  };
}

/* ------------------------------------------------------------------ */
/*  Character Sheet                                                   */
/* ------------------------------------------------------------------ */

export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static TABS = CHARACTER_TABS;

  static DEFAULT_OPTIONS = {
    classes: ["astrolysis", "sheet", "actor", "character"],
    position: { width: 880, height: 760 },
    window: { resizable: true },
    actions: {
      rollBase:       CharacterSheet.#onRollBase,
      rollSkill:      CharacterSheet.#onRollSkill,
      attackWeapon:   CharacterSheet.#onAttackWeapon,
      rollInitiative: CharacterSheet.#onRollInitiative,
      toggleTheme:    CharacterSheet.#onToggleTheme,
      editImage:      CharacterSheet.#onEditImage,
      setTab:         CharacterSheet.#onSetTab,
      addItem:        CharacterSheet.#onAddItem,
      editItem:       CharacterSheet.#onEditItem,
      deleteItem:     CharacterSheet.#onDeleteItem,
      toggleEquip:    CharacterSheet.#onToggleEquip,
      psycheDamage:   CharacterSheet.#onPsycheDamage,
      clearPsycheDamage: CharacterSheet.#onClearPsycheDamage,
      addCondition:   CharacterSheet.#onAddCondition,
      removeCondition: CharacterSheet.#onRemoveCondition,
      toggleArmorEquip: CharacterSheet.#onToggleArmorEquip,
      addSampleArchetype: CharacterSheet.#onAddSampleArchetype
    },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    main: { template: "systems/astrolysis/templates/actor-character-sheet.hbs" }
  };

  tabGroups = { primary: "bases" };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const lastRolls = this.document.getFlag("astrolysis", "lastRolls") ?? {};
    const sheetTabs = this.constructor.TABS ?? CHARACTER_TABS;
    const activeTab = sheetTabs.some(t => t.id === this.tabGroups.primary)
      ? this.tabGroups.primary
      : sheetTabs[0]?.id ?? "bases";

    ctx.actor      = this.document;
    ctx.system     = this.document.system;
    ctx.labels     = getLabels();
    ctx.baseKeys   = ASTROLYSIS_CONST.BASE_KEYS;
    const baseDieFlags = this.document.getFlag("astrolysis", "baseDieSizes") ?? {};
    // Unique, ascending list of available die sizes (from TRAINING_DIE values).
    const dieSizes = [...new Set(Object.values(ASTROLYSIS_CONST.TRAINING_DIE))].sort((a, b) => a - b);
    const buildDieOptions = (selected) => dieSizes.map(size => ({ size, selected: size === selected }));

    // Sub-stat entries under Stamina (strength, dexterity). Each is a small
    // modifier; dice count = stamina + modifier.
    const staminaValue = this.document.system.bases?.stamina ?? 0;
    const substatEntries = ASTROLYSIS_CONST.STAMINA_SUBSTATS.map(key => {
      const modifier = this.document.system.staminaSubstats?.[key] ?? 0;
      const diceCount = this.document.system.getStatDiceCount?.(key) ?? (staminaValue + modifier);
      const dieSize = Number(baseDieFlags[key]) || 4;
      return {
        key,
        label: getBaseLabel(key),
        modifier,
        diceCount,
        lastRoll: lastRolls[key],
        dieSize,
        dieOptions: buildDieOptions(dieSize)
      };
    });

    // Primary bases (stamina, psyche, focus). Only Stamina nests sub-stats.
    ctx.baseEntries = ASTROLYSIS_CONST.PRIMARY_BASES.map(key => {
      const value = this.document.system.bases?.[key] ?? 0;
      const dieSize = Number(baseDieFlags[key]) || 4;
      return {
        key,
        label: getBaseLabel(key),
        value,
        diceCount: value,
        defense: this.document.system.defenses?.[key] ?? 0,
        lastRoll: lastRolls[key],
        dieSize,
        dieOptions: buildDieOptions(dieSize),
        substats: key === "stamina" ? substatEntries : []
      };
    });
    ctx.lastRolls  = lastRolls;
    ctx.theme      = game.settings.get("astrolysis", "theme");
    ctx.activeTab  = activeTab;
    ctx.conditions = getConditionContext(this.document);
    ctx.bulk       = getBulkContext(this.document);
    ctx.psycheDamage = {
      value: this.document.system.madness?.value ?? 0,
      max: this.document.system.madness?.max ?? 0,
      active: (this.document.system.madness?.value ?? 0) > 0
    };
    ctx.tabs       = sheetTabs.map(tab => ({
      ...tab,
      label: localize(tab.labelKey),
      active: tab.id === activeTab
    }));

    ctx.inventory  = this.document.items
      .filter(i => i.type === "inventory" && !isArmorItem(i))
      .map(enrichInventoryItem);
    ctx.skills     = this.document.items.filter(i => i.type === "skill").map(enrichSkillLikeItem);
    ctx.weapons    = this.document.items.filter(i => i.type === "weapon").map(enrichSkillLikeItem);
    ctx.armors     = this.document.items.filter(isArmorItem).map(enrichArmorItem);
    ctx.equippedArmor = ctx.armors.find(a => a.system.equipped) ?? null;
    ctx.archetypes = this.document.items
      .filter(i => i.type === "archetype" || i.type === "subarchetype")
      .map(enrichArchetypeItem);
    ctx.archetypeSlots = [
      {
        key: "archetype",
        label: localize("astrolysis.PrimaryArchetype"),
        item: ctx.archetypes.find(a => a.slot === "archetype") ?? null,
        itemType: "archetype",
        sample: true
      },
      {
        key: "subarchetype",
        label: localize("astrolysis.SubArchetypeClass"),
        item: ctx.archetypes.find(a => a.slot === "subarchetype") ?? null,
        itemType: "subarchetype",
        sample: false
      }
    ];

    return ctx;
  }

  get title() {
    return `${localize("TYPES.Actor.character")}: ${this.document.name}`;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const theme = game.settings.get("astrolysis", "theme");
    if (this.element) this.element.dataset.theme = theme;
  }

  /* ----- Theme + image ----- */

  static async #onToggleTheme(event, target) {
    const current = game.settings.get("astrolysis", "theme");
    const next = current === "dark" ? "light" : "dark";
    await game.settings.set("astrolysis", "theme", next);
    for (const app of foundry.applications.instances?.values?.() ?? []) {
      if (app?.element?.classList?.contains("astrolysis")) app.element.dataset.theme = next;
    }
    this.render({ parts: ["main"] });
  }

  static async #onEditImage(event, target) {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current: this.document.img,
      type: "image",
      callback: (path) => this.document.update({ img: path })
    });
    return fp.browse();
  }

  /* ----- Tabs ----- */

  static #onSetTab(event, target) {
    const next = target.dataset.tab;
    const sheetTabs = this.constructor.TABS ?? CHARACTER_TABS;
    if (!sheetTabs.some(t => t.id === next)) return;
    this.tabGroups.primary = next;
    this.render({ parts: ["main"] });
  }

  /* ----- Item CRUD ----- */

  static async #onAddItem(event, target) {
    const type = target.dataset.itemType;
    const archetypeSlot = target.dataset.archetypeSlot ?? "archetype";
    const labelMap = {
      skill: localize("astrolysis.NewSkill"),
      weapon: localize("astrolysis.NewWeapon"),
      armor: localize("astrolysis.NewArmor"),
      archetype: localize("astrolysis.NewArchetype"),
      subarchetype: localize("astrolysis.NewSubArchetype"),
      inventory: localize("astrolysis.NewInventory")
    };

    if (type === "archetype" || type === "subarchetype") {
      const filled = type === "subarchetype"
        ? this.document.items.some(isSubArchetypeItem)
        : this.document.items.some(isPrimaryArchetypeItem);
      if (filled) {
        ui.notifications?.warn(`${getArchetypeSlotLabel(archetypeSlot)} ${localize("astrolysis.Equipped").toLowerCase()}.`);
        return;
      }
    }

    const data = type === "armor"
      ? {
          name: labelMap.armor,
          type: "inventory",
          system: {
            kind: "armor",
            quantity: 1,
            equipped: false,
            bulk: 1,
            defenseBonus: 1,
            maxDexBonus: 2,
            armorPenalty: 0
          }
        }
      : {
          name: labelMap[type] ?? `New ${type}`,
          type,
          system: type === "archetype" || type === "subarchetype" ? { slot: archetypeSlot } : {}
        };

    const [created] = await this.document.createEmbeddedDocuments("Item", [{
      ...data
    }]);
    if (created) created.sheet?.render(true);
  }

  static #onEditItem(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    item?.sheet?.render(true);
  }

  static async #onDeleteItem(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: localize("astrolysis.DeleteItem") },
      content: `<p>${localize("astrolysis.Delete")} <strong>${item.name}</strong>?</p>`,
      rejectClose: false
    });
    if (confirmed) await item.delete();
  }

  static async #onToggleEquip(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (!item || item.type !== "inventory") return;
    await item.update({ "system.equipped": !item.system.equipped });
  }

  static async #onPsycheDamage(event, target) {
    const delta = Number(target.dataset.delta) || 0;
    const current = this.document.system.madness?.value ?? 0;
    const max = this.document.system.madness?.max ?? 0;
    const next = Math.min(Math.max(current + delta, 0), max);
    await this.document.update({ "system.madness.value": next });
  }

  static async #onClearPsycheDamage(event, target) {
    await this.document.update({ "system.madness.value": 0 });
  }

  static async #onAddCondition(event, target) {
    const id = target.dataset.conditionId;
    if (!ASTROLYSIS_CONST.CONDITIONS[id]) return;
    const current = getManualConditionIds(this.document);
    if (current.includes(id)) return;
    await this.document.update({ "system.conditions": [...current, id] });
  }

  static async #onRemoveCondition(event, target) {
    const id = target.dataset.conditionId;
    if (!id) return;
    const next = getManualConditionIds(this.document).filter(condition => condition !== id);
    await this.document.update({ "system.conditions": next });
  }

  static async #onToggleArmorEquip(event, target) {
    const armor = this.document.items.get(target.dataset.itemId);
    if (!armor || !isArmorItem(armor)) return;
    const next = !armor.system.equipped;
    const updates = this.document.items
      .filter(isArmorItem)
      .map(i => ({ _id: i.id, "system.equipped": i.id === armor.id ? next : false }));
    await this.document.updateEmbeddedDocuments("Item", updates);
  }

  static async #onAddSampleArchetype(event, target) {
    const slot = target.dataset.archetypeSlot ?? "archetype";
    if (this.document.items.some(isPrimaryArchetypeItem)) {
      ui.notifications?.warn(`${getArchetypeSlotLabel(slot)} ${localize("astrolysis.Equipped").toLowerCase()}.`);
      return;
    }
    const [sample] = ASTROLYSIS_CONST.SAMPLE_ARCHETYPES;
    if (!sample) return;
    const exists = this.document.items.some(i => i.type === "archetype" && i.name === sample.name);
    if (exists) return;
    const data = foundry.utils.deepClone(sample);
    data.system ??= {};
    data.system.slot = slot;
    const [created] = await this.document.createEmbeddedDocuments("Item", [data]);
    created?.sheet?.render(true);
  }

  /* ----- Initiative ----- */

  // Rolls initiative into combat, creating a combatant from the actor's token when needed.
  static async #onRollInitiative(event, target) {
    const usedCombat = await rollActorInitiativeToCombat(this.document);
    if (usedCombat) return;

    const formula = getAstrolysisInitiativeFormula(this.document);
    const roll = await new Roll(formula, this.document.getRollData()).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      flavor: `${this.document.name} &mdash; ${localize("astrolysis.Initiative")} (${formula})`
    });
    ui.notifications?.warn("Select or place this actor's token to add initiative to combat.");
  }

  /* ----- Rolls ----- */

  // Raw Base roll. Pool = effective dice count for the stat (handles sub-stats),
  // die = player-chosen via per-base selector (flags.astrolysis.baseDieSizes).
  static async #onRollBase(event, target) {
    const baseKey = target.dataset.base;
    const dice = this.document.system.getStatDiceCount?.(baseKey)
      ?? this.document.system.bases?.[baseKey] ?? 1;
    const baseDieFlags = this.document.getFlag("astrolysis", "baseDieSizes") ?? {};
    const die = Number(baseDieFlags[baseKey]) || 4;
    const flavor = `${getBaseLabel(baseKey)} ${localize("astrolysis.Roll")} (${dice}d${die})`;

    const result = await rollAstrolysisCheck(dice, die, null, {
      actor: this.document, flavor
    });
    await this.document.setFlag("astrolysis", `lastRolls.${baseKey}`, {
      total: result.total, degree: result.degree, formula: result.formula
    });
  }

  // Skill roll. Dice count = effective dice for skill.base (sub-stats: stamina + mod).
  static async #onRollSkill(event, target) {
    const skill = this.document.items.get(target.dataset.itemId);
    if (!skill) return;
    const baseKey = skill.system.base;
    const dice = this.document.system.getStatDiceCount?.(baseKey)
      ?? this.document.system.bases?.[baseKey] ?? 1;
    const die  = getDieSizeForTraining(skill.system.training);
    const modifier = skill.system.modifier ?? 0;

    const flavor = `${skill.name} (${getBaseLabel(baseKey)} ${dice}d${die})`;

    const result = await rollAstrolysisCheck(dice, die, null, {
      actor: this.document, flavor, modifier
    });
    await this.document.setFlag("astrolysis", `lastRolls.${baseKey}`, {
      total: result.total, degree: result.degree, formula: result.formula, via: skill.name
    });
  }

  // Attack with a weapon. Damage = {effective base dice}d{weapon.die} + bonus.
  // No defense roll per rules - attacks always deal damage.
  // Auto-apply to selected target if user has owner permission.
  static async #onAttackWeapon(event, target) {
    const weapon = this.document.items.get(target.dataset.itemId);
    if (!weapon) return;
    const baseKey = weapon.system.base;
    const dice = this.document.system.getStatDiceCount?.(baseKey)
      ?? this.document.system.bases?.[baseKey] ?? 1;
    const die  = getDieSizeForTraining(weapon.system.training);
    const bonus = weapon.system.damageBonus || 0;
    const formula = `${dice}d${die}${bonus ? ` + ${bonus}` : ""}`;

    const tgt = getSelectedTarget();
    const targetLabel = tgt ? ` &rarr; ${tgt.name}` : "";

    const roll = await new Roll(formula).evaluate();
    const damage = roll.total;

    let applyNote = "";
    if (tgt?.actor) {
      const canModify = game.user.isGM || tgt.actor.isOwner;
      if (canModify) {
        const oldHp = tgt.actor.system.health?.value ?? 0;
        const newHp = Math.max(0, oldHp - damage);
        try {
          await tgt.actor.update({ "system.health.value": newHp });
          applyNote = `<br/><em>${tgt.name}: ${oldHp} &rarr; ${newHp} HP</em>`;
        } catch (e) {
          applyNote = `<br/><em>(could not apply damage: ${e.message})</em>`;
        }
      } else {
        applyNote = `<br/><em>(GM must apply damage manually)</em>`;
      }
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      flavor: `<strong>${weapon.name}</strong>${targetLabel} &mdash; ${localize("astrolysis.Damage")}: <strong>${damage}</strong>${applyNote}`
    });
  }
}

/* ------------------------------------------------------------------ */
/*  NPC Sheet                                                         */
/* ------------------------------------------------------------------ */

export class NPCSheet extends CharacterSheet {
  static TABS = NPC_TABS;

  static DEFAULT_OPTIONS = {
    ...CharacterSheet.DEFAULT_OPTIONS,
    classes: ["astrolysis", "sheet", "actor", "npc"],
    position: { width: 860, height: 720 }
  };

  static PARTS = {
    main: { template: "systems/astrolysis/templates/actor-npc-sheet.hbs" }
  };

  tabGroups = { primary: "bases" };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.isNPC = true;
    ctx.npcSummary = [
      { label: localize("astrolysis.NPCRole"), value: this.document.system.role || "Combatant" },
      { label: localize("astrolysis.Level"), value: this.document.system.level ?? 1 },
      { label: localize("astrolysis.Morale"), value: this.document.system.morale ?? 0 }
    ];
    return ctx;
  }

  get title() {
    return `${localize("TYPES.Actor.npc")}: ${this.document.name}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Item Sheet                                                        */
/* ------------------------------------------------------------------ */

export class ItemSheetAstrolysis extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["astrolysis", "sheet", "item"],
    position: { width: 480, height: 460 },
    window: { resizable: true },
    actions: {
      toggleTheme: ItemSheetAstrolysis.#onToggleTheme,
      editImage:   ItemSheetAstrolysis.#onEditImage,
      addFeature:  ItemSheetAstrolysis.#onAddFeature,
      removeFeature: ItemSheetAstrolysis.#onRemoveFeature
    },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    main: { template: "systems/astrolysis/templates/item-archetype-sheet.hbs" }
  };

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.main = { template: `systems/astrolysis/templates/item-${this.document.type}-sheet.hbs` };
    return parts;
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.item   = this.document;
    ctx.system = this.document.system;
    ctx.const  = ASTROLYSIS_CONST;
    ctx.theme  = game.settings.get("astrolysis", "theme");
    ctx.labels = getLabels();
    ctx.itemTypeLabel = localize(`TYPES.Item.${this.document.type}`);
    ctx.baseOptions = getBaseOptions(this.document.system.base);
    ctx.trainingOptions = getTrainingOptions(this.document.system.training);
    ctx.archetypeOptions = getArchetypeOptions(this.document.system.category);
    ctx.archetypeSlotOptions = getArchetypeSlotOptions(this.document.system.slot ?? "archetype");
    ctx.inventoryKindOptions = getInventoryKindOptions(this.document.system.kind ?? "gear");
    ctx.featureSlots = getFeatureSlots(this.document.system.grantedFeatures);
    ctx.isSubArchetype = this.document.type === "subarchetype";
    ctx.bulkValue = getItemBulk(this.document);
    ctx.isArmor = isArmorItem(this.document);
    ctx.skillPreview = this.document.type === "skill" ? getSkillRollPreview(this.document) : null;
    ctx.weaponPreview = this.document.type === "weapon" ? getWeaponRollPreview(this.document) : null;
    ctx.statBoosts = getStatBonusEntries(this.document.system.statBonuses);
    ctx.statBoostLabel = ctx.statBoosts.length
      ? ctx.statBoosts.map(stat => `${stat.label} ${stat.signed}`).join(", ")
      : localize("astrolysis.NoBaseBoosts");
    return ctx;
  }

  get title() {
    return `${localize(`TYPES.Item.${this.document.type}`)}: ${this.document.name}`;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const theme = game.settings.get("astrolysis", "theme");
    if (this.element) this.element.dataset.theme = theme;
  }

  static async #onToggleTheme(event, target) {
    const current = game.settings.get("astrolysis", "theme");
    const next = current === "dark" ? "light" : "dark";
    await game.settings.set("astrolysis", "theme", next);
    for (const app of foundry.applications.instances?.values?.() ?? []) {
      if (app?.element?.classList?.contains("astrolysis")) app.element.dataset.theme = next;
    }
    this.render({ parts: ["main"] });
  }

  static async #onEditImage(event, target) {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current: this.document.img,
      type: "image",
      callback: (path) => this.document.update({ img: path })
    });
    return fp.browse();
  }

  static async #onAddFeature(event, target) {
    if (!["archetype", "subarchetype"].includes(this.document.type)) return;
    const features = [...(this.document.system.grantedFeatures ?? [])].map(feature => ({
      name: feature?.name ?? "",
      description: feature?.description ?? ""
    }));
    features.push({ name: "", description: "" });
    await this.document.update({ "system.grantedFeatures": features });
  }

  static async #onRemoveFeature(event, target) {
    if (!["archetype", "subarchetype"].includes(this.document.type)) return;
    const index = Number(target.dataset.featureIndex);
    if (!Number.isInteger(index)) return;
    const features = [...(this.document.system.grantedFeatures ?? [])].map(feature => ({
      name: feature?.name ?? "",
      description: feature?.description ?? ""
    }));
    features.splice(index, 1);
    await this.document.update({ "system.grantedFeatures": features });
  }
}
