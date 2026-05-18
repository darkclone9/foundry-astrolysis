const SYSTEM_ID = "astrolysis";

const rollingMissingInitiative = new WeakSet();
const suppressCreateCombatantInitiative = new WeakSet();
let combatHooksRegistered = false;

function clampDicePool(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

export function getAstrolysisInitiativeFormula(actor) {
  const focus = clampDicePool(actor?.system?.bases?.focus ?? actor?.system?.focus ?? 1);
  return `${focus}d4`;
}

export function getActiveCombat() {
  return game.combat ?? game.combats?.active ?? null;
}

function getCombatantIds(combat, ids) {
  if (typeof ids === "string") return [ids];
  if (ids instanceof Set) return [...ids];
  if (Array.isArray(ids)) return ids;
  return combat?.combatants?.map(c => c.id) ?? [];
}

function getUnrolledCombatantIds(combat, predicate = () => true) {
  return combat?.combatants
    ?.filter(c => c.initiative == null && predicate(c))
    .map(c => c.id) ?? [];
}

function tokenDocumentSceneId(tokenDocument) {
  return tokenDocument?.parent?.id
    ?? tokenDocument?.scene?.id
    ?? tokenDocument?.object?.scene?.id
    ?? null;
}

function normalizeToken(token) {
  return token?.document ?? token ?? null;
}

function tokenMatchesActor(token, actor) {
  if (!token || !actor) return false;
  const tokenDocument = normalizeToken(token);
  const tokenActor = token.actor ?? tokenDocument.actor;
  const actorToken = actor.token;

  return tokenActor?.id === actor.id
    || tokenActor?.uuid === actor.uuid
    || tokenDocument.actorId === actor.id
    || tokenDocument.actor?.id === actor.id
    || tokenDocument.actor?.uuid === actor.uuid
    || (actorToken?.id && tokenDocument.id === actorToken.id)
    || (actorToken?.uuid && tokenDocument.uuid === actorToken.uuid);
}

function combatantMatchesActor(combatant, actor) {
  if (!combatant || !actor) return false;
  return combatant.actor?.id === actor.id
    || combatant.actor?.uuid === actor.uuid
    || combatant.actorId === actor.id
    || tokenMatchesActor(combatant.token, actor)
    || tokenMatchesActor(combatant.token?.object, actor);
}

export function findCombatantForActor(combat, actor) {
  return combat?.combatants?.find(c => combatantMatchesActor(c, actor)) ?? null;
}

export function getTokenForActor(actor, combat = getActiveCombat()) {
  if (!actor || !canvas?.ready) return null;
  const combatSceneId = combat?.scene?.id ?? canvas.scene?.id;

  const actorToken = actor.token?.object ?? (actor.token?.id ? canvas.tokens?.get(actor.token.id) : null) ?? actor.token;
  if (actorToken && tokenMatchesActor(actorToken, actor)) return actorToken;

  const controlled = canvas.tokens?.controlled?.find(token => tokenMatchesActor(token, actor));
  if (controlled) return controlled;

  const activeTokens = actor.getActiveTokens?.(false, true) ?? [];
  const sceneToken = activeTokens.find(token => {
    const tokenSceneId = tokenDocumentSceneId(normalizeToken(token));
    return !combatSceneId || tokenSceneId === combatSceneId;
  });
  if (sceneToken) return sceneToken;
  if (activeTokens[0]) return activeTokens[0];

  return canvas.tokens?.placeables?.find(token => tokenMatchesActor(token, actor)) ?? null;
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null));
}

async function getOrCreateCombat() {
  let combat = getActiveCombat();
  if (!combat && canvas?.ready && canvas.scene) {
    combat = await Combat.create({ scene: canvas.scene.id, active: true });
  }
  return combat ?? null;
}

function getCombatantCreateData(actor, token, combat) {
  const tokenDocument = normalizeToken(token);
  const sceneId = tokenDocumentSceneId(tokenDocument) ?? combat?.scene?.id ?? canvas.scene?.id;

  if (tokenDocument?.id) {
    return compactObject({
      actorId: tokenDocument.actorId ?? actor.id,
      tokenId: tokenDocument.id,
      sceneId,
      hidden: tokenDocument.hidden ?? false
    });
  }

  return compactObject({
    actorId: actor.id,
    sceneId
  });
}

export async function getOrCreateCombatantForActor(actor) {
  const combat = await getOrCreateCombat();
  if (!combat || !actor) return null;

  const existing = findCombatantForActor(combat, actor);
  if (existing) return existing;

  const token = getTokenForActor(actor, combat);
  const combatantData = getCombatantCreateData(actor, token, combat);
  suppressCreateCombatantInitiative.add(combat);
  try {
    const [created] = await combat.createEmbeddedDocuments("Combatant", [combatantData]);
    return created ?? findCombatantForActor(combat, actor);
  } catch (error) {
    console.warn("Astrolysis | Could not create combatant for initiative roll.", { actor, combatantData, error });
    return null;
  } finally {
    suppressCreateCombatantInitiative.delete(combat);
  }
}

async function postInitiativeMessage(combatant, actor, formula, roll, options = {}) {
  if (options.messageOptions === false) return;
  const rollMode = options.rollMode ?? game.settings.get("core", "rollMode");
  const localizedInitiative = game.i18n?.localize?.("astrolysis.Initiative") ?? "Initiative";
  const initiativeLabel = localizedInitiative.includes(".") ? "Initiative" : localizedInitiative;
  await roll.toMessage({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    flavor: `${combatant.name ?? actor?.name ?? "Combatant"} - ${initiativeLabel} (${formula})`,
    ...(options.messageOptions ?? {})
  }, { rollMode });
}

export async function rollAstrolysisInitiative(combat, ids, options = {}) {
  if (!combat) return combat;

  const idSet = new Set(getCombatantIds(combat, ids));
  const combatants = combat.combatants.filter(c => idSet.has(c.id));

  for (const combatant of combatants) {
    const actor = combatant.actor;
    const formula = getAstrolysisInitiativeFormula(actor);
    const roll = await new Roll(formula, actor?.getRollData?.() ?? {}).evaluate();

    if (typeof combat.setInitiative === "function") {
      await combat.setInitiative(combatant.id, roll.total);
    } else {
      await combat.updateEmbeddedDocuments("Combatant", [{ _id: combatant.id, initiative: roll.total }]);
    }

    await postInitiativeMessage(combatant, actor, formula, roll, options);
  }

  ui.combat?.render?.(true);
  return combat;
}

export async function rollMissingInitiative(combat, options = {}) {
  if (!combat || rollingMissingInitiative.has(combat)) return combat;
  rollingMissingInitiative.add(combat);
  try {
    const ids = getUnrolledCombatantIds(combat);
    if (ids.length) await rollAstrolysisInitiative(combat, ids, options);
    return combat;
  } finally {
    rollingMissingInitiative.delete(combat);
  }
}

export async function rollActorInitiativeToCombat(actor, options = {}) {
  const combatant = await getOrCreateCombatantForActor(actor);
  if (!combatant) return false;

  const combat = combatant.combat ?? combatant.parent ?? getActiveCombat();
  if (!combat) return false;
  await rollAstrolysisInitiative(combat, [combatant.id], options);
  return true;
}

async function clearLastRollsForAll(combat) {
  for (const combatant of combat?.combatants ?? []) {
    const actor = combatant.actor;
    if (!actor) continue;
    if (actor.getFlag("astrolysis", "lastRolls")) {
      await actor.unsetFlag("astrolysis", "lastRolls");
    }
  }
}

export function patchAstrolysisCombat() {
  const prototype = Combat.prototype;
  if (prototype._astrolysisCombatPatched) return;

  const originalRollInitiative = prototype.rollInitiative;
  const originalRollAll = prototype.rollAll;
  const originalRollNPC = prototype.rollNPC;
  const originalStartCombat = prototype.startCombat;
  prototype._astrolysisCombatPatched = true;

  prototype.rollInitiative = async function(ids, options = {}) {
    if (game.system?.id === SYSTEM_ID) {
      return rollAstrolysisInitiative(this, ids, options);
    }
    return originalRollInitiative.call(this, ids, options);
  };

  prototype.rollAll = async function(options = {}) {
    if (game.system?.id === SYSTEM_ID) {
      return rollAstrolysisInitiative(this, getCombatantIds(this), options);
    }
    return originalRollAll.call(this, options);
  };

  if (originalRollNPC) {
    prototype.rollNPC = async function(options = {}) {
      if (game.system?.id === SYSTEM_ID) {
        const ids = this.combatants.filter(c => c.actor?.type === "npc").map(c => c.id);
        return rollAstrolysisInitiative(this, ids, options);
      }
      return originalRollNPC.call(this, options);
    };
  }

  if (originalStartCombat) {
    prototype.startCombat = async function(options = {}) {
      const result = await originalStartCombat.call(this, options);
      if (game.system?.id === SYSTEM_ID && game.user?.isGM) {
        await rollMissingInitiative(this, options);
      }
      return result;
    };
  }
}

export function registerAstrolysisCombatHooks() {
  if (combatHooksRegistered) return;
  combatHooksRegistered = true;

  Hooks.on("combatStart", async (combat) => {
    if (!game.user?.isGM) return;
    await rollMissingInitiative(combat);
  });

  Hooks.on("createCombatant", async (combatant) => {
    if (!game.user?.isGM) return;
    const combat = combatant.combat;
    if (combat && suppressCreateCombatantInitiative.has(combat)) return;
    if (!combat || combat.round <= 0 || combatant.initiative != null) return;
    await rollAstrolysisInitiative(combat, [combatant.id]);
  });

  Hooks.on("combatRound", async (combat) => {
    if (!game.user?.isGM) return;
    await clearLastRollsForAll(combat);
    await rollMissingInitiative(combat, { messageOptions: false });
  });
}
