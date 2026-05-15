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
      // Optional per-stat defense bonus (from armor, augments, etc.).
      defenseBonus: new fields.SchemaField({
        strength:  new fields.NumberField({ initial: 0, integer: true, nullable: false }),
        dexterity: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
        stamina:   new fields.NumberField({ initial: 0, integer: true, nullable: false }),
        psyche:    new fields.NumberField({ initial: 0, integer: true, nullable: false }),
        focus:     new fields.NumberField({ initial: 0, integer: true, nullable: false })
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

    // Compute defenses (each = base + bonus). Used as target numbers.
    this.defenses = {};
    for (const key of Object.keys(this.bases)) {
      this.defenses[key] = (this.bases[key] ?? 0) + (this.defenseBonus?.[key] ?? 0);
    }
  }

  /** DC to roll AGAINST this actor on a given defense stat. */
  getDefenseDC(stat) {
    return 5 + (this.defenses?.[stat] ?? this.bases?.[stat] ?? 0);
  }

  getRollData() {
    return {
      ...this.bases,
      bases: { ...this.bases },
      defenses: { ...(this.defenses ?? {}) },
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
      // Which target defense this skill rolls against. Empty = static DC 5.
      defense:     new fields.StringField({ choices: ["", ...BASE_KEYS], initial: "", blank: true }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
  get dieSize() { return TRAINING_DIE[this.training] ?? 4; }
}

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      base:        new fields.StringField({ choices: BASE_KEYS, initial: "strength" }),
      training:    new fields.StringField({ choices: Object.keys(TRAINING_DIE), initial: "untrained" }),
      damageBonus: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
  get dieSize() { return TRAINING_DIE[this.training] ?? 4; }
}

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
