# AGENTS.md

## Project

**Terraria: Boss Rush** — a fan-made classroom prototype: a 3D browser card battler
(React + TypeScript + Three.js/React Three Fiber + Vite) built around one cooperative
boss fight against the Eye of Cthulhu.

No backend. All state is local and deterministic.

## Commands

```bash
npm install
npm run dev        # vite on 0.0.0.0:12000
npm run typecheck  # tsc --noEmit
npm test           # engine + demo self tests (tsx)
npm run build      # typecheck + production build
```

## Architecture

- `src/game/types.ts` — `GameState`, `GamePhase`, `Card`, `Player`, `Boss`.
- `src/game/GameEngine.ts` — the single Zustand store and all game actions
  (`newGame`, `startDemo`, `drawPhase`, `playCard`, `beginBossAction`,
  `resolvePhase`, `nextTurn`, `damageBoss`, `setCamera`).
- `src/game/phases/phaseConfig.ts` — per-phase copy/labels for the HUD.
- `src/data/` — static `cards`, `characters`, `bosses` definitions.
- `src/systems/demoScript.ts` — the 9-scene scripted presentation and
  `useDemoRunner`, the hook that schedules its beats.
- `src/systems/textures.ts` — procedurally generated canvas textures.
- `src/scenes/` — `MainMenu`, `HowToPlay`, `DlcScreen`, `BattleScene`.
- `src/components/` — `arena/`, `boss/`, `players/`, `cards/`, `effects/`, `ui/`.

## Turn structure

Exactly four phases per turn, driven by `phase` in the store:

1. `DRAW` — `drawPhase()` refills the hand to `HAND_SIZE` (5) and Mana to `maxMana` (4).
2. `PLAYER_ACTION` — `playCard(cardId, handIndex)`; costs Mana, applies damage /
   defense / healing / summon, then moves the card to `discard`.
3. `BOSS_ACTION` — `beginBossAction()` draws the boss card and sets `boss.intent`.
4. `RESOLUTION` — `resolvePhase()` computes `max(0, intent.damage - target.defense)`,
   applies it, records `damageBreakdown`, then waits for `nextTurn()`.

Terminal states: `VICTORY` (boss HP 0) and `DEFEAT` (every guardian at 0 HP).

## Rules worth remembering

- **Armor persists** across turns until removed; it is not a one-turn buff.
- **Taunt lasts only the current turn** and is cleared in `resolvePhase`/`nextTurn`.
- Shields **do not stack downward**: a weaker shield never lowers an existing higher
  defense bonus.
- A **summoned minion applies its damage once** per turn (`minionAttack`), not on play.
- All gameplay is deterministic apart from deck shuffling, so the demo can rely on
  `prepareDemoHand()` to place a known hand.

## Testing

Two headless self-tests run against the real store (no mocks, no browser):

- `scripts/engine.selftest.ts` — turn flow, damage/defense math, card costs,
  enrage/hit reactions, victory and defeat.
- `scripts/demo.selftest.ts` — runs the real demo beats in order and asserts the
  presentation numbers: boss 200 → 185, melee defense 5 → 15, formula
  `20 − 15 = 5`, melee 100 → 95, handoff on TURN 02.

`scripts/` is intentionally outside `src/` so these Node scripts stay out of the
app's `tsc` project (they use `process`). Update both tests when game math changes.

## Notes for future work

- Everything 3D is procedural (no external model/audio assets); missing assets must
  fall back to generated geometry or canvas textures, never empty placeholders.
- Audio degrades gracefully — `playSound` is a no-op when a sound is unavailable.
