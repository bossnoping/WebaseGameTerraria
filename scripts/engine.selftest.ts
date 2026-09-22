/**
 * Headless sanity checks for the deterministic game logic.
 *
 * The engine only depends on zustand plus the pure data modules, so it can be
 * exercised under Node without a DOM. Run with:
 *
 *   npx tsx src/game/engine.selftest.ts
 *
 * These assertions cover the acceptance criteria a classroom demo depends on:
 * boss damage, mana spend, defense subtraction, the four phases, enrage, and victory.
 */
import { useGame } from '../src/game/GameEngine';
import { CARDS } from '../src/data/cards';

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail = '') {
  checks++;
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const g = () => useGame.getState();
const findInHand = (name: string) => g().hand.findIndex((c) => c.name === name);

console.log('\nEGG — engine self test\n');

// ---------------------------------------------------------------- setup
g().newGame(['melee', 'mage']);
check('new game spawns two guardians', g().players.length === 2);
check('boss starts at 200 HP', g().boss.hp === 200, `got ${g().boss.hp}`);
check('boss is not enraged at full HP', !g().boss.enraged);
check('phase starts at INTRO', g().phase === 'INTRO');

// ---------------------------------------------------------------- draw
g().drawPhase();
check('draw phase gives a full hand of 5', g().hand.length === 5, `got ${g().hand.length}`);
check('mana refills to 4', g().mana === 4, `got ${g().mana}`);
check('phase is DRAW', g().phase === 'DRAW');

// ---------------------------------------------------------------- player action
g().beginPlayerAction();
check('phase is PLAYER_ACTION', g().phase === 'PLAYER_ACTION');

// force a known hand so the checks are deterministic
useGame.setState({
  hand: [{ ...CARDS.water_bolt }, { ...CARDS.iron_shield }, { ...CARDS.taunt }],
  mana: 4,
});
g().beginPlayerAction();

// Water Bolt: 15 damage, 2 mana
g().playCard('water_bolt', findInHand('Water Bolt'));
check('boss HP drops by 15 after Water Bolt', g().boss.hp === 185, `got ${g().boss.hp}`);
check('mana drops by 2 after Water Bolt', g().mana === 2, `got ${g().mana}`);
check('played card moved to discard', g().discard.some((c) => c.name === 'Water Bolt'));

// Iron Shield on Melee: +10 armor -> 5 base + 10 = 15 defense
const meleeBefore = g().players.find((p) => p.id === 'melee')!;
check('melee base defense is 5', meleeBefore.baseDefense === 5, `got ${meleeBefore.baseDefense}`);
useGame.setState({ activePlayerId: 'melee' });
g().playCard('iron_shield', findInHand('Iron Shield'));
const meleeAfter = g().players.find((p) => p.id === 'melee')!;
check('Iron Shield raises melee defense to 15', meleeAfter.defense === 15, `got ${meleeAfter.defense}`);
check('armor bonus tracked as +10', meleeAfter.armorBonus === 10, `got ${meleeAfter.armorBonus}`);

// Mana Shield is weaker and must not stack on top of Iron Shield
g().beginPlayerAction();
useGame.setState({ mana: 4, hand: [{ ...CARDS.mana_shield }] });
useGame.setState({ activePlayerId: 'mage' });
g().playCard('mana_shield', 0);
const meleeAfterManaShield = g().players.find((p) => p.id === 'melee')!;
check(
  'weaker Mana Shield does not stack over Iron Shield',
  meleeAfterManaShield.defense === 15,
  `got ${meleeAfterManaShield.defense}`,
);
const mageAfterManaShield = g().players.find((p) => p.id === 'mage')!;
check('Mana Shield gives mage +5 defense', mageAfterManaShield.defense === 5, `got ${mageAfterManaShield.defense}`);

// ---------------------------------------------------------------- taunt
g().beginPlayerAction();
useGame.setState({ mana: 4, hand: [{ ...CARDS.taunt }] });
g().playCard('taunt', 0);
check('taunt marks melee as the boss target', g().players.find((p) => p.id === 'melee')!.taunting);

// ---------------------------------------------------------------- boss action
g().beginBossAction('savage_dash');
check('phase is BOSS_ACTION', g().phase === 'BOSS_ACTION');
check('boss revealed Savage Dash', g().boss.intent?.name === 'Savage Dash');
check('boss uses the ATTACK animation', g().boss.animState === 'ATTACK');

// ---------------------------------------------------------------- resolution
const meleeHpBefore = g().players.find((p) => p.id === 'melee')!.hp;
g().resolvePhase();
check('phase is RESOLUTION', g().phase === 'RESOLUTION');
const bd = g().damageBreakdown;
check('damage breakdown exists', Boolean(bd));
check('breakdown raw damage is 20', bd?.raw === 20, `got ${bd?.raw}`);
check('breakdown defense is 15', bd?.defense === 15, `got ${bd?.defense}`);
check('breakdown final damage is 5', bd?.final === 5, `got ${bd?.final}`);
const meleeHpAfter = g().players.find((p) => p.id === 'melee')!.hp;
check('melee HP went from 100 to 95', meleeHpAfter === 95, `got ${meleeHpAfter} (before ${meleeHpBefore})`);
// Armor stays until removed by a card, but Taunt is a one-turn effect.
check('armor persists after resolution', g().players.find((p) => p.id === 'melee')!.defense === 15);
check('taunt clears after resolution', !g().players.find((p) => p.id === 'melee')!.taunting);

// ---------------------------------------------------------------- next turn
g().nextTurn();
check('turn advances to 2', g().turn === 2, `got ${g().turn}`);

// ---------------------------------------------------------------- enrage
g().damageBoss(115);
check('boss enrages under 40% HP', g().boss.enraged, `hp=${g().boss.hp}/${g().boss.maxHp}`);
check('enrage triggers the hit reaction first', g().boss.animState === 'HIT', g().boss.animState);
await new Promise((r) => setTimeout(r, 700));
check('hit reaction settles into ENRAGED', g().boss.animState === 'ENRAGED', g().boss.animState);

// ---------------------------------------------------------------- victory
g().damageBoss(1000);
check('boss HP floors at 0', g().boss.hp === 0, `got ${g().boss.hp}`);
check('boss enters DEFEATED', g().boss.animState === 'DEFEATED');

// victory state is applied on a short timer
await new Promise((r) => setTimeout(r, 1100));
check('victory flag set', g().victory, `victory=${g().victory} phase=${g().phase}`);
check('phase is VICTORY', g().phase === 'VICTORY', g().phase);

// ---------------------------------------------------------------- defeat
// A lone guardian taking a lethal hit is the party-wipe condition.
g().newGame(['melee']);
g().drawPhase();
g().beginPlayerAction();
g().beginBossAction('crimson_sweep');
useGame.setState({
  players: g().players.map((p) => ({ ...p, defense: 0, baseDefense: 0, armorBonus: 0, hp: 5 })),
});
g().resolvePhase();
await new Promise((r) => setTimeout(r, 1100));
check('defeat flag set when all guardians fall', g().defeat, `defeat=${g().defeat} phase=${g().phase}`);
check('phase is DEFEAT', g().phase === 'DEFEAT', g().phase);

// ---------------------------------------------------------------- guards
g().newGame(['melee', 'mage']);
g().drawPhase();
useGame.setState({ hand: [{ ...CARDS.iron_sword }], mana: 0 });
const played = g().playCard('iron_sword', 0);
check('cannot play a card without enough mana', played === false);
check('boss untouched by unaffordable card', g().boss.hp === 200, `got ${g().boss.hp}`);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} CHECK(S) FAILED`);
  process.exit(1);
}
console.log('All engine checks passed.\n');
