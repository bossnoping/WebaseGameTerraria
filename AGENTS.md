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

- `src/game/types.ts` — `GameState`, `GamePhase`, `Card`, `Player`, `Boss`,
  `CharacterClass`, `Difficulty`.
- `src/game/GameEngine.ts` — the single Zustand store and all game actions
  (`newGame`, `startDemo`, `drawPhase`, `playCard`, `beginBossAction`,
  `resolvePhase`, `nextTurn`, `damageBoss`, `setCamera`).
- `src/game/phases/phaseConfig.ts` — per-phase copy/labels for the HUD.
- `src/data/` — static `cards`, `characters`, `bosses` definitions plus the
  class-deck builder (`buildStartingDeck`) and boss scaling (`scaleBossForParty`).
- `src/systems/demoScript.ts` — the 9-scene scripted presentation and
  `useDemoRunner`, the hook that schedules its beats.
- `src/systems/textures.ts` — procedurally generated canvas textures.
- `src/scenes/` — `MainMenu`, `PartySelect`, `HowToPlay`, `DlcScreen`, `BattleScene`.
- `src/components/` — `arena/`, `boss/`, `players/`, `cards/`, `effects/`, `ui/`.

## Party setup

`PartySelect` runs before the battle and takes three decisions:

1. **Player count** — 1, 2, or 3 guardians.
2. **Roles** — one unique class per slot (`melee`, `mage`, `summoner`, `ranger`).
   The 2-player case still shows the role screen so both slots are chosen explicitly.
3. **Difficulty** — `normal`, `hard`, `nightmare`.

Each class brings its own deck via `buildStartingDeck(classes)`; shared cards appear
once regardless of party size, so a larger party is not simply a bigger hand.

Because the party shares one hand and one Mana pool, both grow with the party
(`handSizeForParty`, `manaForParty`): 5 cards / 4 Mana solo, 7 / 5 for two, 9 / 6
for three. Without this, the 1.3× boss HP scaling per extra guardian made
multi-guardian runs unwinnable.

The boss scales with the party and difficulty through `scaleBossForParty(count,
difficulty)`: more guardians mean more HP, and each difficulty raises HP and damage.


## Turn structure

Exactly four phases per turn, driven by `phase` in the store:

1. `DRAW` — `drawPhase()` refills the hand to `handSize` (5 + 2 per extra
   guardian) and Mana to `maxMana` (4 + 1 per extra guardian), and telegraphs the
   boss's next attack.
2. `PLAYER_ACTION` — `playCard(cardId, handIndex)`; costs Mana, applies damage /
   defense / healing / summon, then moves the card to `discard`.
3. `BOSS_ACTION` — `beginBossAction()` draws the boss card and sets `boss.intent`.
4. `RESOLUTION` — `resolvePhase()` computes `max(0, intent.damage - target.defense)`,
   applies it, records `damageBreakdown`, then waits for `nextTurn()`.

Terminal states: `VICTORY` (boss HP 0) and `DEFEAT` (every guardian at 0 HP).

## Rules worth remembering

- **Boss armor** blunts incoming damage (`damage − boss.defense`, floored at 1 chip
  damage) and is permanent once the boss enrages. `armor_break` cards strip it.
- **Enrage** triggers when boss HP falls to or below `enrageThreshold` (25%): the boss
  gains `enragedDefense` armor and `enrageDamageBonus` on every attack, permanently.
- **AOE attacks** hit every living guardian for the same per-guardian defense math;
  single-target attacks pick a target (respecting **Taunt**).
- **Lifesteal** attacks heal the boss for the damage actually dealt after defense.
- **Player armor persists** across turns until removed; it is not a one-turn buff.
- **Taunt lasts only the current turn** and is cleared in `resolvePhase`/`nextTurn`.
- Shields **do not stack downward**: a weaker shield never lowers an existing higher
  defense bonus.
- A **summoned minion applies its damage once** per turn (`minionAttack`), not on play.
- All gameplay is deterministic apart from deck shuffling, so the demo can rely on
  `prepareDemoHand()` to place a known hand.

## Testing

Two headless self-tests run against the real store (no mocks, no browser):

- `scripts/engine.selftest.ts` — turn flow, damage/defense math, card costs,
  party scaling (boss HP plus party hand/Mana), class decks, armor, enrage, AoE,
  lifesteal, victory/defeat, and a winnability regression for 1–3 guardians.
- `scripts/demo.selftest.ts` — runs the real demo beats in order and asserts the
  presentation numbers: boss 200 → 185, melee defense 5 → 15, formula
  `20 − 15 = 5`, melee 100 → 95, handoff on TURN 02.

`scripts/` is intentionally outside `src/` so these Node scripts stay out of the
app's `tsc` project (they use `process`). Update both tests when game math changes.

`playToKill()` in the engine test plays a full fight with a competent policy, so
party/boss scaling can never drift back into "mathematically unwinnable".

## Notes for future work

- Everything 3D is procedural (no external model/audio assets); missing assets must
  fall back to generated geometry or canvas textures, never empty placeholders.
- Audio degrades gracefully — `playSound` is a no-op when a sound is unavailable.
