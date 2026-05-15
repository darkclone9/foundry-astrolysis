import { rollAstrolysisCheck } from "./roll.mjs";
import { ASTROLYSIS_CONST } from "./data-models.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;

/** Return the first currently-targeted Token (Ctrl+click on a token), or null. */
function getSelectedTarget() {
  return [...(game.user.targets ?? [])][0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Character Sheet                                                   */
/* ------------------------------------------------------------------ */

export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["astrolysis", "sheet", "actor", "character"],
    position: { width: 680, height: 760 },
    window: { resizable: true },
    actions: {
      rollBase:     CharacterSheet.#onRollBase,
      rollSkill:    CharacterSheet.#onRollSkill,
      attackWeapon: CharacterSheet.#onAttackWeapon,
      toggleTheme:  CharacterSheet.#onToggleTheme,
      editImage:    CharacterSheet.#onEditImage,
      setTab:       CharacterSheet.#onSetTab,
      addItem:      CharacterSheet.#onAddItem,
      editItem:     CharacterSheet.#onEditItem,
      deleteItem:   CharacterSheet.#onDeleteItem,
      toggleEquip:  CharacterSheet.#onToggleEquip
    },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    main: { template: "systems/astrolysis/templates/actor-character-sheet.hbs" }
  };

  tabGroups = { primary: "inventory" };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.actor      = this.document;
    ctx.system     = this.document.system;
    ctx.baseKeys   = ASTROLYSIS_CONST.BASE_KEYS;
    ctx.lastRolls  = this.document.getFlag("astrolysis", "lastRolls") ?? {};
    ctx.theme      = game.settings.get("astrolysis", "theme");
    ctx.activeTab  = this.tabGroups.primary;

    ctx.inventory  = this.document.items.filter(i => i.type === "inventory");
    ctx.skills     = this.document.items.filter(i => i.type === "skill");
    ctx.weapons    = this.document.items.filter(i => i.type === "weapon");
    ctx.archetypes = this.document.items.filter(i => i.type === "archetype");

    return ctx;
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
    this.tabGroups.primary = target.dataset.tab;
    this.render({ parts: ["main"] });
  }

  /* ----- Item CRUD ----- */

  static async #onAddItem(event, target) {
    const type = target.dataset.itemType;
    const labelMap = {
      skill: "New Skill", weapon: "New Weapon",
      archetype: "New Archetype", inventory: "New Inventory Item"
    };
    const [created] = await this.document.createEmbeddedDocuments("Item", [{
      name: labelMap[type] ?? `New ${type}`,
      type
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
      window: { title: "Delete Item" },
      content: `<p>Delete <strong>${item.name}</strong>?</p>`,
      rejectClose: false
    });
    if (confirmed) await item.delete();
  }

  static async #onToggleEquip(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    if (!item || item.type !== "inventory") return;
    await item.update({ "system.equipped": !item.system.equipped });
  }

  /* ----- Rolls ----- */

  // Raw Base check (no skill). Pool = base, die = d4 (untrained).
  // If a target is selected, DC = 5 + target's same-stat defense.
  static async #onRollBase(event, target) {
    const baseKey = target.dataset.base;
    const dice = this.document.system.bases[baseKey] ?? 1;

    let dc = 5;
    let flavor = `${baseKey[0].toUpperCase()}${baseKey.slice(1)} check`;
    const tgt = getSelectedTarget();
    if (tgt?.actor?.system?.getDefenseDC) {
      dc = tgt.actor.system.getDefenseDC(baseKey);
      flavor += ` vs ${tgt.name}`;
    }

    const result = await rollAstrolysisCheck(dice, 4, dc, {
      actor: this.document, flavor
    });
    await this.document.setFlag("astrolysis", `lastRolls.${baseKey}`, {
      total: result.total, degree: result.degree, formula: result.formula
    });
  }

  // Skill check. If skill.defense is set + a target is selected, use target's defense for DC.
  static async #onRollSkill(event, target) {
    const skill = this.document.items.get(target.dataset.itemId);
    if (!skill) return;
    const baseKey = skill.system.base;
    const dice = this.document.system.bases[baseKey] ?? 1;
    const die  = skill.system.dieSize;

    let dc = 5;
    let flavor = `${skill.name} (${skill.system.training})`;
    const defenseStat = skill.system.defense;
    const tgt = getSelectedTarget();
    if (defenseStat && tgt?.actor?.system?.getDefenseDC) {
      dc = tgt.actor.system.getDefenseDC(defenseStat);
      flavor += ` vs ${tgt.name}'s ${defenseStat}`;
    } else if (defenseStat) {
      flavor += ` [no target — DC ${dc}]`;
    }

    const result = await rollAstrolysisCheck(dice, die, dc, {
      actor: this.document, flavor
    });
    await this.document.setFlag("astrolysis", `lastRolls.${baseKey}`, {
      total: result.total, degree: result.degree, formula: result.formula, via: skill.name
    });
  }

  // Attack with a weapon. Damage = {actor.base}d{weapon.die} + bonus.
  // No defense roll per rules — attacks always deal damage.
  // Auto-apply to selected target if user has owner permission.
  static async #onAttackWeapon(event, target) {
    const weapon = this.document.items.get(target.dataset.itemId);
    if (!weapon) return;
    const baseKey = weapon.system.base;
    const dice = this.document.system.bases[baseKey] ?? 1;
    const die  = weapon.system.dieSize;
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
      flavor: `<strong>${weapon.name}</strong>${targetLabel} &mdash; Damage: <strong>${damage}</strong>${applyNote}`
    });
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
      editImage:   ItemSheetAstrolysis.#onEditImage
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
    return ctx;
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
}
