# PF2e Fated Attack

For Foundry VTT 14.368 and PF2e 8.5.1. No dependencies or sheet items.

Right-click an eligible character attack and choose **Fated Attack**. Spend one Mythic Point and your daily use to reroll with mythic proficiency and 2d20 keeping the higher die. The new result replaces the original even when worse. The menu entry hides when spent. Weapon, unarmed, and spell attacks are supported.

## Install

In Foundry Setup, open Add-on Modules > Install Module and paste this Manifest URL:

https://github.com/tcabanski/pf2e-fated-attack/releases/latest/download/module.json

Install, then enable **PF2e Fated Attack** in the world's Manage Modules dialog. Refresh every connected browser to remove old macro wrappers. Stop running the installer macro. GitHub releases contain the standalone manifest and module ZIP; Foundry can check the public manifest for updates.

## Daily reset and migration

Existing `flags.world.fatedAttackSpent` state is retained. Reloading does not reset usage. PF2e's native `pf2e.restForTheNight` hook clears the flag on each character after that character's rest updates complete. Canceling the rest dialog does not emit the hook. This hook is client-local, so other connected clients do not each repeat the reset. An error writing the flag generates a visible warning. The reset is asynchronous; allow it to complete before activating again.

The old GM reset macro remains compatible. Use linked PC tokens. Unlinked token actors track separate uses.

## Limits

The ordinary mythic-point reroll remains separate and bypasses this custom restriction. Player-owned actors permit their owners to edit flags; this is table automation, not an anti-cheat boundary. An in-browser lock prevents double clicks, not simultaneous activation of one actor from multiple clients. Do not do that. A failed reroll after reserving the daily use leaves it spent; inspect chat and Mythic Points before manually resetting.

Native natural-1/20 rules apply to the kept die. Already rerolled or native non-rerollable checks are excluded.

## Verification

`npm test` runs dependency-free mocked integration checks, not a live Foundry simulation. Live acceptance: install with no preliminary right-click; test weapon and spell attacks, two dice keeping the higher, mythic proficiency, point spending, hidden spent entry, reload persistence, canceled rest, and completed rest on only the resting characters. Test again after major Foundry/PF2e updates because menu rendering and dice-formula internals are wrapped.

PF2e source: https://github.com/foundryvtt/pf2e/blob/pf2e-8.5.1/src/scripts/macros/rest-for-the-night.ts
