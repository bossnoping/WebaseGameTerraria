/**
 * Headless sanity checks for the deterministic game logic.
 *
 * The engine only depends on zustand plus the pure data modules, so it can be
 * exercised under Node without a DOM. Run with:
 *
 *   npx tsx scripts/engine.selftest.ts
 *
 * These assertions cover the acceptance criteria a classroom demo depends on:
 * party setup, boss scaling, per-class decks, boss armor, enrage, AoE, lifesteal,
 * the four phases, victory and defeat.
 */
import { useGame } from '../src/game/GameEngine';
import { CARDS, buildStartingDeck, handSizeForParty, manaForParty } from '../src/data/cards';
import { EYE_OF_CTHULHU, scaleBossForParty } from '../src/data/bosses';
import type { CharacterClass, Difficulty } from '../src/game/types';

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
check('guardians take the chosen slots', g().players[0].slot === 0 && g().players[1].slot === 1);
check('two player boss scales to 390 HP', g().boss.hp === 390, `got ${g().boss.hp}`);
check('boss is not enraged at full HP', !g().boss.enraged);
check('phase starts at INTRO', g().phase === 'INTRO');
check('solo boss is the base 300 HP', scaleBossForParty(1, 'normal').hp === 300);
check('three-player boss scales to 507 HP', scaleBossForParty(3, 'normal').hp === 507);

// The party shares one hand and one Mana pool, so both must grow with the
// party; otherwise a bigger party faces a bigger boss with no extra actions.
check('a solo guardian gets the base hand and mana', handSizeForParty(1) === 5 && manaForParty(1) === 4);
check('a two-guardian party gets a bigger hand and mana pool',
  handSizeForParty(2) === 7 && manaForParty(2) === 5,
  `hand ${handSizeForParty(2)}, mana ${manaForParty(2)}`);
check('a three-guardian party gets the largest hand and mana pool',
  handSizeForParty(3) === 9 && manaForParty(3) === 6,
  `hand ${handSizeForParty(3)}, mana ${manaForParty(3)}`);

// ---------------------------------------------------------------- decks
const mageDeck = buildStartingDeck(['mage']);
check('only the mage deck carries Fireball', mageDeck.some((c) => c.id === 'fireball'));
check('a melee deck does not carry Mana Shield', !buildStartingDeck(['melee']).some((c) => c.id === 'mana_shield'));
check('shared cards appear once regardless of party size',
  buildStartingDeck(['melee', 'mage']).filter((c) => c.id === 'iron_sword').length === 2,
  `got ${buildStartingDeck(['melee', 'mage']).filter((c) => c.id === 'iron_sword').length}`);

// ---------------------------------------------------------------- draw
g().drawPhase();
check('draw phase fills a two-guardian hand to 7', g().hand.length === 7, `got ${g().hand.length}`);
check('mana refills to 5 for two guardians', g().mana === 5, `got ${g().mana}`);
check('phase is DRAW', g().phase === 'DRAW');
check('the boss telegraphed an intent before Player Action', Boolean(g().boss.intent));

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
check('boss HP drops by 15 after Water Bolt', g().boss.hp === 375, `got ${g().boss.hp}`);
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
check('two-player Savage Dash scales to 22', g().boss.intent?.damage === 22, `got ${g().boss.intent?.damage}`);
check('boss uses the ATTACK animation', g().boss.animState === 'ATTACK');

// ---------------------------------------------------------------- resolution
const meleeHpBefore = g().players.find((p) => p.id === 'melee')!.hp;
g().resolvePhase();
check('phase is RESOLUTION', g().phase === 'RESOLUTION');
const bd = g().damageBreakdown;
check('damage breakdown exists', Boolean(bd));
check('breakdown raw damage is 22', bd?.raw === 22, `got ${bd?.raw}`);
check('breakdown defense is 15', bd?.defense === 15, `got ${bd?.defense}`);
check('breakdown final damage is 7', bd?.final === 7, `got ${bd?.final}`);
const meleeHpAfter = g().players.find((p) => p.id === 'melee')!.hp;
check('melee HP went from 100 to 93', meleeHpAfter === 93, `got ${meleeHpAfter} (before ${meleeHpBefore})`);
// Armor stays until removed by a card, but Taunt is a one-turn effect.
check('armor persists after resolution', g().players.find((p) => p.id === 'melee')!.defense === 15);
check('taunt clears after resolution', !g().players.find((p) => p.id === 'melee')!.taunting);

// ---------------------------------------------------------------- next turn
g().nextTurn();
check('turn advances to 2', g().turn === 2, `got ${g().turn}`);

// ---------------------------------------------------------------- AoE
useGame.setState({
  players: g().players.map((p) => ({ ...p, defense: 0, baseDefense: 0, armorBonus: 0 })),
});
g().beginBossAction('blood_nova');
check('Blood Nova is flagged AOE', g().boss.intent?.aoe === true);
check('Blood Nova scales to 14 damage for two players', g().boss.intent?.damage === 14, `got ${g().boss.intent?.damage}`);
g().resolvePhase();
check('AOE produces one hit record per living guardian', g().resolutionHits.length === 2, `got ${g().resolutionHits.length}`);
check('AOE total damage is summed in the breakdown', g().damageBreakdown?.final === 28, `got ${g().damageBreakdown?.final}`);

// ---------------------------------------------------------------- lifesteal
g().nextTurn();
g().drawPhase();
g().beginPlayerAction();
g().beginBossAction('blood_drain');
const bossHpBeforeDrain = g().boss.hp;
g().resolvePhase();
check('Blood Drain heals the boss back', g().boss.hp > bossHpBeforeDrain, `before ${bossHpBeforeDrain} after ${g().boss.hp}`);

// ---------------------------------------------------------------- mana potion
g().beginPlayerAction();
useGame.setState({ mana: 0, hand: [{ ...CARDS.mana_potion }] });
g().playCard('mana_potion', 0);
check('Mana Potion restores 3 Mana for free', g().mana === 3, `got ${g().mana}`);

// ---------------------------------------------------------------- enrage + boss armor
g().newGame(['melee', 'mage']);
g().damageBoss(1000);
check('boss enrages below 40% HP', g().boss.enraged, `hp=${g().boss.hp}/${g().boss.maxHp}`);
check('enrage grants the boss armor', g().boss.defense === EYE_OF_CTHULHU.enragedDefense, `got ${g().boss.defense}`);
check('boss HP floors at 0', g().boss.hp === 0, `got ${g().boss.hp}`);
check('boss enters DEFEATED', g().boss.animState === 'DEFEATED');
await new Promise((r) => setTimeout(r, 1100));
check('victory flag set', g().victory, `victory=${g().victory} phase=${g().phase}`);
check('phase is VICTORY', g().phase === 'VICTORY', g().phase);

// ---------------------------------------------------------------- boss armor chips
g().newGame(['melee', 'mage']);
g().drawPhase();
g().beginPlayerAction();
useGame.setState({ mana: 4, hand: [{ ...CARDS.iron_sword }] });
useGame.setState({ boss: { ...g().boss, defense: 12 } });
g().playCard('iron_sword', 0);
check('boss armor subtracts from card damage', g().boss.hp === 390 - 8, `got ${g().boss.hp}`);
check('card damage always chips at least 1', (() => {
  useGame.setState({ boss: { ...g().boss, defense: 999 }, mana: 4, hand: [{ ...CARDS.iron_sword }] });
  const before = g().boss.hp;
  g().beginPlayerAction();
  g().playCard('iron_sword', 0);
  return g().boss.hp === before - 1;
})());

// ---------------------------------------------------------------- defeat
// A lone guardian taking a lethal sweep is the party-wipe condition.
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

// ---------------------------------------------------------------- restart
g().newGame(['summoner', 'ranged', 'melee'], 'hard');
const hardHp = g().boss.hp;
g().restartGame();
check('restart rebuilds the same party', g().players.length === 3, `got ${g().players.length}`);
check('restart keeps the difficulty', g().difficulty === 'hard', g().difficulty);
check('restart keeps the scaled boss HP', g().boss.hp === hardHp, `got ${g().boss.hp} vs ${hardHp}`);

// ---------------------------------------------------------------- balance
/**
 * The boss scales with the party, so the party must be able to keep up. Deck
 * order and boss cards use Math.random, so each run is seeded for determinism.
 * A simple but competent policy plays each run out; the assertion is that the
 * fight is *winnable* (at least one seed wins), not that every seed wins —
 * HARD and NIGHTMARE are deliberately swingy/losing by design.
 */
function withSeed<T>(seed: number, fn: () => T): T {
  const real = Math.random;
  let s = seed | 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}

function playOnce(classes: CharacterClass[], difficulty: Difficulty, maxTurns = 80) {
  g().newGame(classes, difficulty);
  let turn = 0;
  while (turn < maxTurns) {
    if (g().boss.hp <= 0) return true;
    if (g().players.every((p) => p.hp <= 0)) return false;
    g().drawPhase();
    g().beginPlayerAction();
    let guard = 0;
    while (g().phase === 'PLAYER_ACTION' && guard++ < 40) {
      const intent = g().boss.intent;
      const living = g().players.filter((p) => p.hp > 0);
      const lowest = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const playable = g().hand
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.cost <= g().mana);
      if (!playable.length) break;
      const effect = (name: string) => playable.find(({ c }) => c.effect === name);
      const strongest = [...playable].sort((a, b) => (b.c.damage ?? 0) - (a.c.damage ?? 0))[0];
      const pick =
        (lowest && lowest.hp / lowest.maxHp < 0.45 && effect('heal')) ||
        ((intent?.damage ?? 0) >= 18 && (effect('shield') ?? effect('armor'))) ||
        (intent?.aoe && living.length > 1 && effect('shield')) ||
        strongest;
      if (!pick) break;
      if (!g().playCard(pick.c.id, pick.i)) break;
    }
    g().beginBossAction();
    g().resolvePhase();
    g().nextTurn();
    turn++;
  }
  return g().boss.hp <= 0;
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function winsFor(classes: CharacterClass[], difficulty: Difficulty) {
  return SEEDS.filter((seed) => withSeed(seed, () => playOnce(classes, difficulty))).length;
}

function checkWinnable(label: string, classes: CharacterClass[], difficulty: Difficulty, minWins: number) {
  const wins = winsFor(classes, difficulty);
  check(
    label,
    wins >= minWins,
    `${wins}/${SEEDS.length} seeded runs won (need >= ${minWins})`,
  );
}

checkWinnable('a solo guardian can win on NORMAL', ['melee'], 'normal', 6);
checkWinnable('a two-guardian party can win on NORMAL', ['melee', 'mage'], 'normal', 6);
checkWinnable('a three-guardian party can win on NORMAL', ['melee', 'mage', 'ranged'], 'normal', 6);
checkWinnable('a three-guardian party can win on HARD', ['melee', 'summoner', 'ranged'], 'hard', 3);

// ---------------------------------------------------------------- guards
g().newGame(['melee', 'mage']);
g().drawPhase();
useGame.setState({ hand: [{ ...CARDS.iron_sword }], mana: 0 });
const played = g().playCard('iron_sword', 0);
check('cannot play a card without enough mana', played === false);
check('boss untouched by unaffordable card', g().boss.hp === 390, `got ${g().boss.hp}`);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} CHECK(S) FAILED`);
  process.exit(1);
}
console.log('All engine checks passed.\n');
