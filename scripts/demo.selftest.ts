/**
 * Runs the real demo script's beats (the same functions the browser runner
 * schedules) in order, with no delays, to prove the scripted turn produces the
 * numbers the presentation promises:
 *
 *   Boss 200 → 185 (Water Bolt 15)
 *   Melee Defense 5 → 15 (Iron Shield +10, Mana Shield does not stack over it)
 *   Damage 20 − 15 = 5, so Melee 100 → 95
 *   Control handed back to the presenter on TURN 02
 *
 * Run with: npx tsx scripts/demo.selftest.ts
 */
import { useGame } from '../src/game/GameEngine';
import { DEMO_SCENES, prepareDemoHand } from '../src/systems/demoScript';

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail = '') {
  checks++;
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const g = () => useGame.getState();
const api = { game: () => useGame.getState() };

console.log('\nDEMO — scripted turn self test\n');

g().startDemo();
check('demo starts with two guardians', g().players.length === 2, `${g().players.length}`);
check('demo boss has 200 HP', g().boss.hp === 200);
check('demo is in this demo run', g().demoRunning);

// Mirror what useDemoRunner does on mount.
prepareDemoHand();

// Capture the state the moment the resolution scene finishes, because the
// TURN 02 handoff intentionally clears armor and the damage breakdown.
let atResolution: ReturnType<typeof g> | null = null;

for (const scene of DEMO_SCENES) {
  for (const beat of scene.beats) {
    if (beat.run) {
      // Any exception here is exactly what the browser runner would swallow.
      beat.run(api);
    }
    if (beat.caption !== undefined) g().setDemoCaption(beat.caption, beat.sub ?? '');
  }
  if (scene.id === 8) atResolution = g();
}

check('every scripted beat ran without throwing', true);

// ------------------------------------------------------------------ outcomes
check('boss took exactly 15 from Water Bolt', atResolution!.boss.hp === 185, `got ${atResolution!.boss.hp}`);

const meleeAtResolution = atResolution!.players.find((p) => p.id === 'melee')!;
const mageAtResolution = atResolution!.players.find((p) => p.id === 'mage')!;
check('melee reached 15 defense (5 base + 10 shield)', meleeAtResolution.defense === 15,
  `got ${meleeAtResolution.defense}`);
check('mage kept the weaker +5 shield rather than stacking', mageAtResolution.defense === 5,
  `got ${mageAtResolution.defense}`);

const bd = atResolution!.damageBreakdown;
check('resolution produced a damage breakdown', Boolean(bd));
check('the on-screen formula is 20 − 15 = 5', bd?.raw === 20 && bd?.defense === 15 && bd?.final === 5,
  `got ${bd?.raw} − ${bd?.defense} = ${bd?.final}`);
check('the attack was aimed at the taunting melee guardian', bd?.targetId === 'melee', `got ${bd?.targetId}`);
check('melee HP went 100 → 95', meleeAtResolution.hp === 95, `got ${meleeAtResolution.hp}`);

// ------------------------------------------------------------------ handoff
check('demo handed control back to the presenter', !g().demoRunning);
check('control resumes on TURN 02', g().turn === 2, `got ${g().turn}`);
check('phase is back to PLAYER_ACTION', g().phase === 'PLAYER_ACTION', g().phase);
check('the player has a hand to act with', g().hand.length === 5, `got ${g().hand.length}`);
check('mana is refilled for the player', g().mana === 4, `got ${g().mana}`);
check('boss is still alive to continue the fight', g().boss.hp > 0, `got ${g().boss.hp}`);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} CHECK(S) FAILED`);
  process.exit(1);
}
console.log('Demo script verified.\n');
