/**
 * Astrolysis core resolution: roll a dice pool of {statValue}d{dieSize} against a DC.
 *
 * Degrees of success (relative to targetNumber):
 *   total >  DC + 2   => "critical-success"
 *   total >= DC       => "success"
 *   total >= DC - 2   => "minor-failure"
 *   total <  DC - 2   => "complete-failure"
 *
 * @param {number} statValue       Base Stat (e.g. attributes.strength). Becomes the dice count.
 * @param {number} dieSize         Skill training die size (4, 6, 8, 10, 12). Becomes the die.
 * @param {number} targetNumber    DC (typically 5 + target's relevant stat).
 * @param {object} [options]
 * @param {Actor}  [options.actor]   Speaker actor (for chat output).
 * @param {string} [options.flavor]  Chat flavor text.
 * @param {boolean}[options.toChat=true] Post the result to chat.
 * @returns {Promise<{roll: Roll, total: number, degree: string, targetNumber: number, formula: string}>}
 */
export async function rollAstrolysisCheck(statValue, dieSize, targetNumber, options = {}) {
  const { actor = null, flavor = "", toChat = true } = options;

  // Guard against degenerate inputs (a pool needs at least one die).
  const dice = Math.max(1, Number(statValue) | 0);
  const size = Math.max(2, Number(dieSize)  | 0);
  const dc   = Number(targetNumber) | 0;

  // 1. Build the roll formula.
  const formula = `${dice}d${size}`;

  // 2. Evaluate.
  const roll = await new Roll(formula).evaluate();
  const total = roll.total;

  // 3. Classify degree of success.
  let degree;
  if      (total >  dc + 2) degree = "critical-success";
  else if (total >= dc)     degree = "success";
  else if (total >= dc - 2) degree = "minor-failure";
  else                      degree = "complete-failure";

  // 4. Optional chat output.
  if (toChat) {
    const label = degree.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase());
    const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();
    await roll.toMessage({
      speaker,
      flavor: `${flavor || "Astrolysis Check"} — DC ${dc} — <strong>${label}</strong>`
    });
  }

  return { roll, total, degree, targetNumber: dc, formula };
}
