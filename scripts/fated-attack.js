Hooks.once("ready", () => {
// Run once per browser session. PF2e 8.5.1 / Foundry 14.
if (globalThis.fatedAttackMenuInstalled) {
  return ui.notifications.info("Fated Attack already installed.");
}
const prototype = foundry.applications.ux.ContextMenu.implementation.prototype;
const originalRender = prototype.render;
if (typeof originalRender !== "function") throw Error("Unsupported context menu API.");
const busy = new Set();
const resolve = element => game.messages.get(element.dataset.messageId);
const eligible = message => message?.actor?.isOfType("character") &&
  message.actor.isOwner && (message.isAuthor || game.user.isGM) &&
  message.isRerollable &&
  ["attack-roll", "spell-attack-roll"].includes(message.flags.pf2e?.context?.type);

async function activate(message) {
  const actor = message?.actor;
  if (!eligible(message)) return ui.notifications.warn("Attack is no longer eligible.");
  if (busy.has(actor.uuid)) return;
  busy.add(actor.uuid);
  let reserved = false;
  try {
    const validate = () => {
      if (!eligible(message) || !game.messages.has(message.id)) throw Error("Attack is no longer eligible.");
      if (actor.getFlag("world", "fatedAttackSpent")) throw Error("Fated Attack already used today.");
      if (!(actor.system.resources.mythicPoints.value > 0)) throw Error("No Mythic Points remaining.");
    };
    validate();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Fated Attack" },
      content: "<p>Spend 1 Mythic Point and your daily use? Reroll this attack with mythic proficiency, rolling two d20s and keeping the higher. The new result replaces the original.</p>",
      rejectClose: false
    });
    if (!confirmed) return;
    validate();
    if (!message.flags.pf2e.modifiers?.some(m => m.type === "proficiency" && m.enabled)) {
      throw Error("Attack lacks the proficiency modifier required by native mythic rerolls.");
    }
    // ponytail: browser-local lock; do not activate one actor from two clients simultaneously.
    await actor.setFlag("world", "fatedAttackSpent", true);
    reserved = true;
    const prior = JSON.stringify(message.rolls[0].toJSON());
    let changed = false;
    const hook = Hooks.on("pf2e.preReroll", (oldRoll, newRoll, resource) => {
      if (changed || resource?.slug !== "mythic-points" || JSON.stringify(oldRoll.toJSON()) !== prior) return;
      const die = newRoll.dice.find(d => d.faces === 20);
      if (!die) return;
      die.number = 2;
      die.modifiers = ["kh"];
      // ponytail: Foundry 14 cached formula; verify after major upgrades.
      newRoll._formula = Roll.getFormula(newRoll.terms);
      newRoll.options.dice = "2d20kh";
      changed = true;
    });
    try {
      await game.pf2e.Check.rerollFromMessage(message, { resource: "mythic-points", keep: "new" });
    } finally {
      Hooks.off("pf2e.preReroll", hook);
    }
    if (!changed || game.messages.has(message.id)) throw Error("Reroll did not finish as expected.");
    ui.notifications.info("Fated Attack: Mythic Point and daily use spent.");
  } catch (error) {
    console.error("Fated Attack", error);
    ui.notifications.error(error.message + (reserved
      ? " Daily use remains spent. GM: inspect chat and Mythic Points before resetting or retrying."
      : ""));
  } finally {
    busy.delete(actor.uuid);
  }
}

// Add the entry immediately before a chat menu renders, including cached menus.
// ponytail: session-local wrapper; reload removes it. Recheck after major upgrades.
prototype.render = function (target, options) {
  if (target?.matches?.("[data-message-id]") &&
      game.messages.has(target.dataset.messageId) &&
      Array.isArray(this.menuItems) &&
      !this.menuItems.some(entry => entry.label === "Fated Attack")) {
    this.menuItems.push({
      label: "Fated Attack",
      icon: "fa-solid fa-dice",
      visible: element => { const message = resolve(element); return eligible(message) && !message.actor.getFlag("world", "fatedAttackSpent"); },
      onClick: (_event, element) => activate(resolve(element))
    });
  }
  return originalRender.call(this, target, options);
};
globalThis.fatedAttackMenuInstalled = true;


});

Hooks.on("pf2e.restForTheNight", actor => {
  if (!actor.isOwner || !actor.getFlag("world", "fatedAttackSpent")) return;
  // PF2e emits this hook locally after applying this character's rest updates.
  actor.setFlag("world", "fatedAttackSpent", false).catch(error => {
    console.error("Fated Attack rest reset", error);
    ui.notifications.error("Fated Attack daily reset failed. GM: use the manual reset macro.");
  });
});
