const fields = foundry.data.fields;

const ARCHETYPES = ["futurist", "ancient", "psionic"];
const ARCHETYPE_SLOTS = ["archetype", "subarchetype"];
// Primary bases: the three top-level stats that drive their own dice pools and defenses.
const PRIMARY_BASES = ["stamina", "psyche", "focus"];
// Stamina sub-stats: small modifiers added on top of Stamina when used as a roll base.
const STAMINA_SUBSTATS = ["strength", "dexterity"];
// All valid stat references (used by skill.base / weapon.base choices and stat bonuses).
// Stamina first, then its sub-stats nested under it, then psyche/focus.
const BASE_KEYS  = ["stamina", "strength", "dexterity", "psyche", "focus"];
const TRAINING_DIE = {
  untrained: 4, trained: 6, expert: 8, master: 10, grand: 12
};
const INVENTORY_KINDS = ["gear", "armor"];
const CONDITIONS = {
  bleeding: "Bleeding",
  blinded: "Blinded",
  burning: "Burning",
  dazed: "Dazed",
  frightened: "Frightened",
  grappled: "Grappled",
  prone: "Prone",
  stunned: "Stunned",
  poisoned: "Poisoned",
  wounded: "Wounded"
};
const SAMPLE_ARCHETYPES = [
  {
    name: "Void-Touched Savant",
    type: "archetype",
    system: {
      slot: "archetype",
      category: "psionic",
      healthBonus: 0,
      description: "A mind opened by the impossible geometry between stars. Void-Touched Savants read pressure changes in thought, carry a sliver of dead-space calm, and can overchannel psyche at real personal risk.",
      statBonuses: { strength: 0, dexterity: 0, stamina: 0, psyche: 1, focus: 1 },
      grantedFeatures: [
        {
          name: "Psionic Intuition",
          description: "Once per scene, ask the GM one yes/no question about a nearby psychic trace, hidden motive, or impossible phenomenon."
        },
        {
          name: "Void Resistance",
          description: "Gain +1 defense against psyche-based attacks and environmental effects tied to vacuum, deep space, or psychic dread."
        },
        {
          name: "Psychic Overchannel",
          description: "Before rolling a Psyche or Focus skill, take 1 Psyche Damage to increase the skill die one step for that roll."
        }
      ]
    }
  }
];

/* ------------------------------------------------------------------ */
/*  Actor: character                                                  */
/* ------------------------------------------------------------------ */

export class CharacterData extends foundry.abstract.TypeDataModel {
  /**
   * Migrate older characters whose Strength/Dexterity were stored as top-level
   * bases. Move those values into staminaSubstats and drop the obsolete
   * defenseBonus entries.
   */
  static migrateData(source) {
    const migrated = super.migrateData?.(source) ?? source;
    if (migrated.bases) {
      if (migrated.bases.strength !== undefined) {
        migrated.staminaSubstats = migrated.staminaSubstats ?? {};
        if (migrated.staminaSubstats.strength === undefined) {
          migrated.staminaSubstats.strength = migrated.bases.strength;
        }
        delete migrated.bases.strength;
      }
      if (migrated.bases.dexterity !== undefined) {
        migrated.staminaSubstats = migrated.staminaSubstats ?? {};
        if (migrated.staminaSubstats.dexterity === undefined) {
          migrated.staminaSubstats.dexterity = migrated.bases.dexterity;
        }
        delete migrated.bases.dexterity;
      }
    }
    if (migrated.defenseBonus) {
      delete migrated.defenseBonus.strength;
      delete migrated.defenseBonus.dexterity;
    }
    return migrated;
  }

  static defineSchema() {
    const base = (initial = 2) => new fields.NumberField({
      initial, min: 0, max: 10, integer: true, nullable: false
    });
    // Sub-stat modifiers: small +/- numbers stacked on top of Stamina.
    const subMod = () => new fields.NumberField({
      initial: 0, min: -5, max: 5, integer: true, nullable: false
    });

    return {
      bases: new fields.SchemaField({
        stamina: base(),
        psyche:  base(),
        focus:   base()
      }),
      // Strength and Dexterity are sub-stats under Stamina: when used as a
      // roll base, dice count = bases.stamina + staminaSubstats.<sub>.
      staminaSubstats: new fields.SchemaField({
        strength:  subMod(),
        dexterity: subMod()
      }),
      // Per-primary-base defense bonus (from armor, augments, etc.).
      defenseBonus: new fields.SchemaField({
        stamina: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
        psyche:  new fields.NumberField({ initial: 0, integer: true, nullable: false }),
        focus:   new fields.NumberField({ initial: 0, integer: true, nullable: false })
      }),
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 10, min: 0, integer: true, nullable: false }),
        max:   new fields.NumberField({ initial: 10, min: 0, integer: true, nullable: false })
      }),
      madness: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
        max:   new fields.NumberField({ initial: 10, min: 0, integer: true, nullable: false })
      }),
      conditions: new fields.ArrayField(
        new fields.StringField({ choices: Object.keys(CONDITIONS), blank: false, nullable: false }),
        { initial: [] }
      ),
      level:     new fields.NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
      biography: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    this.movement    = 5 * this.bases.stamina;
    this.madness.max = 10 + (2 * this.bases.psyche);
    if (this.madness.value > this.madness.max) this.madness.value = this.madness.max;
    this.maxBulk = 5 + (2 * this.bases.stamina);

    // Effective dice counts for every rollable stat (used by all dice-pool rolls).
    // Primary bases: their own value. Sub-stats: stamina + modifier.
    this.diceCounts = {
      stamina:   this.bases.stamina ?? 0,
      psyche:    this.bases.psyche  ?? 0,
      focus:     this.bases.focus   ?? 0,
      strength:  (this.bases.stamina ?? 0) + (this.staminaSubstats?.strength  ?? 0),
      dexterity: (this.bases.stamina ?? 0) + (this.staminaSubstats?.dexterity ?? 0)
    };

    // Defenses only exist for primary bases. Strength/Dexterity are not defenses.
    this.defenses = {};
    for (const key of PRIMARY_BASES) {
      this.defenses[key] = (this.bases[key] ?? 0) + (this.defenseBonus?.[key] ?? 0);
    }
  }

  /** Effective dice-pool count for any stat key (primary base or sub-stat). */
  getStatDiceCount(statKey) {
    return this.diceCounts?.[statKey] ?? 0;
  }

  /** DC to roll AGAINST this actor on a given defense stat. Only primary bases. */
  getDefenseDC(stat) {
    if (!PRIMARY_BASES.includes(stat)) return null;
    return 5 + (this.defenses?.[stat] ?? this.bases?.[stat] ?? 0);
  }

  getRollData() {
    // @strength / @dexterity are the EFFECTIVE dice counts (stamina + mod).
    // @strengthMod / @dexterityMod expose the raw modifiers if needed.
    return {
      ...this.bases,
      strength:    this.diceCounts?.strength  ?? 0,
      dexterity:   this.diceCounts?.dexterity ?? 0,
      strengthMod: this.staminaSubstats?.strength  ?? 0,
      dexterityMod:this.staminaSubstats?.dexterity ?? 0,
      bases: { ...this.bases },
      staminaSubstats: { ...(this.staminaSubstats ?? {}) },
      diceCounts: { ...(this.diceCounts ?? {}) },
      defenses: { ...(this.defenses ?? {}) },
      health: { ...this.health },
      madness: { ...this.madness },
      conditions: [...(this.conditions ?? [])],
      level: this.level,
      movement: this.movement,
      maxBulk: this.maxBulk
    };
  }
}

export class NPCData extends CharacterData {
  static migrateData(source) {
    const migrated = super.migrateData?.(source) ?? source;
    if (migrated.level === undefined && migrated.threat !== undefined) {
      migrated.level = migrated.threat;
    }
    return migrated;
  }

  static defineSchema() {
    return {
      ...super.defineSchema(),
      role:    new fields.StringField({ initial: "Combatant", blank: true }),
      morale:  new fields.NumberField({ initial: 5, min: 0, max: 10, integer: true, nullable: false }),
      tactics: new fields.HTMLField({ initial: "" })
    };
  }

  getRollData() {
    return {
      ...super.getRollData(),
      role: this.role,
      morale: this.morale,
      tactics: this.tactics
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Items                                                             */
/* ------------------------------------------------------------------ */

export class ArchetypeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const feature = () => new fields.SchemaField({
      name:        new fields.StringField({ initial: "", blank: true }),
      description: new fields.HTMLField({ initial: "" })
    });
    const statBonus = () => new fields.NumberField({
      initial: 0, integer: true, nullable: false
    });

    return {
      slot:            new fields.StringField({ choices: ARCHETYPE_SLOTS, initial: "archetype" }),
      category:        new fields.StringField({ choices: ARCHETYPES, initial: "futurist" }),
      healthBonus:     new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      statBonuses:     new fields.SchemaField({
        strength:  statBonus(),
        dexterity: statBonus(),
        stamina:   statBonus(),
        psyche:    statBonus(),
        focus:     statBonus()
      }),
      grantedFeatures: new fields.ArrayField(feature(), { initial: [] }),
      description:     new fields.HTMLField({ initial: "" })
    };
  }
}

export class SubArchetypeData extends ArchetypeData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      slot: new fields.StringField({ choices: ["subarchetype"], initial: "subarchetype" }),
      parentArchetype: new fields.StringField({ initial: "", blank: true })
    };
  }
}

export class SkillData extends foundry.abstract.TypeDataModel {
  /**
   * Strength and Dexterity are no longer valid defense targets — only primary
   * bases (Stamina/Psyche/Focus) are. Migrate any "strength"/"dexterity"
   * defense to "stamina" so existing skills keep a working defense reference.
   */
  static migrateData(source) {
    const migrated = super.migrateData?.(source) ?? source;
    if (migrated.defense === "strength" || migrated.defense === "dexterity") {
      migrated.defense = "stamina";
    }
    return migrated;
  }

  static defineSchema() {
    return {
      base:        new fields.StringField({ choices: BASE_KEYS, initial: "stamina" }),
      training:    new fields.StringField({ choices: Object.keys(TRAINING_DIE), initial: "untrained" }),
      // Defense targets are limited to primary bases.
      defense:     new fields.StringField({ choices: ["", ...PRIMARY_BASES], initial: "", blank: true }),
      modifier:    new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      specialization: new fields.StringField({ initial: "", blank: true }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
  get dieSize() { return TRAINING_DIE[this.training] ?? 4; }
}

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      base:        new fields.StringField({ choices: BASE_KEYS, initial: "stamina" }),
      training:    new fields.StringField({ choices: Object.keys(TRAINING_DIE), initial: "untrained" }),
      damageBonus: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      bulk:        new fields.NumberField({ initial: 1, min: 0, nullable: false }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
  get dieSize() { return TRAINING_DIE[this.training] ?? 4; }
}

export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      equipped:     new fields.BooleanField({ initial: false }),
      defenseBonus: new fields.NumberField({ initial: 1, integer: true, nullable: false }),
      maxDexBonus:  new fields.NumberField({ initial: 2, integer: true, nullable: false }),
      armorPenalty: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      bulk:         new fields.NumberField({ initial: 1, min: 0, nullable: false }),
      description:  new fields.HTMLField({ initial: "" })
    };
  }
}

export class InventoryData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    const migrated = super.migrateData?.(source) ?? source;
    if (migrated.bulk === undefined && migrated.weight !== undefined) {
      migrated.bulk = migrated.weight;
    }
    return migrated;
  }

  static defineSchema() {
    return {
      kind:        new fields.StringField({ choices: INVENTORY_KINDS, initial: "gear" }),
      quantity:    new fields.NumberField({ initial: 1, min: 0, integer: true, nullable: false }),
      weight:      new fields.NumberField({ initial: 0, min: 0, nullable: false }),
      bulk:        new fields.NumberField({ initial: 0, min: 0, nullable: false }),
      equipped:    new fields.BooleanField({ initial: false }),
      defenseBonus: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      maxDexBonus:  new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      armorPenalty: new fields.NumberField({ initial: 0, integer: true, nullable: false }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

export const ASTROLYSIS_CONST = {
  ARCHETYPES,
  ARCHETYPE_SLOTS,
  BASE_KEYS,
  PRIMARY_BASES,
  STAMINA_SUBSTATS,
  TRAINING_DIE,
  INVENTORY_KINDS,
  CONDITIONS,
  SAMPLE_ARCHETYPES
};
