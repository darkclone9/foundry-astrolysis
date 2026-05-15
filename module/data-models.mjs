const fields = foundry.data.fields;

/* ------------------------------------------------------------------ */
/*  Actor: character                                                  */
/* ------------------------------------------------------------------ */

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const base = (initial = 2) => new fields.NumberField({
      initial, min: 0, max: 10, integer: true, nullable: false
    });

    return {
      bases: new fields.SchemaField({
        strength:  base(),
        dexterity: base(),
        stamina:   base(),
        psyche:    base(),
        focus:     base()
      }),
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
        max:   new fields.NumberField({ initial: 10, min: 0, integer: true, nullable: false })
      }),
      madness: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
        max:   new fields.NumberField({ initial: 10, min: 0, integer: true, nullable: false })
      }),
      level:     new fields.NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
      biography: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    this.movement    = 5 * this.bases.stamina;
    this.madness.max = 10 + (2 * this.bases.psyche);
    if (this.madness.value > this.madness.max) this.madness.value = this.madness.max;
  }

  getRollData() {
    return {
      ...this.bases,
      bases: { ...this.bases },
      health: { ...this.health },
      madness: { ...this.madness },
      level: this.level,
      movement: this.movement
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Items                                                             */
/* ------------------------------------------------------------------ */

const ARCHETYPES = ["futurist", "ancient", "psionic"];
const BASE_KEYS  = ["strength", "dexterity", "stamina", "psyche", "focus"];
const TRAINING_DIE = {
  untrained: 4, trained: 6, expert: 8, master: 10, grand: 12
};

export class ArchetypeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category:    new fields.StringField({ choices: ARCHETYPES, initial: "futurist" }),
      healthBonus: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

export class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      base:        new fields.StringField({ choices: BASE_KEYS, initial: "strength" }),
      training:    new fields.StringField({ choices: Object.keys(TRAINING_DIE), initial: "untrained" }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
  get dieSize() { return TRAINING_DIE[this.training] ?? 4; }
}

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      base:        new fields.StringField({ choices: BASE_KEYS, initial: "strength" }),
      damageDice:  new fields.StringField({ initial: "1d6" }),
      damageBonus: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

/** Generic loot / gear / consumables — the catch-all bag item. */
export class InventoryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      quantity:    new fields.NumberField({ initial: 1, min: 0, integer: true, nullable: false }),
      weight:      new fields.NumberField({ initial: 0, min: 0, nullable: false }),
      equipped:    new fields.BooleanField({ initial: false }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

export const ASTROLYSIS_CONST = { ARCHETYPES, BASE_KEYS, TRAINING_DIE };
