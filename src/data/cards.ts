import type { Card, CharacterClass } from '../game/types';

export const CARDS: Record<string, Card> = {
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: 'weapon',
    cost: 2,
    damage: 20,
    description: 'A reliable blade. Deals 20 damage to the boss.',
    effect: 'slash',
    copies: 2,
  },
  water_bolt: {
    id: 'water_bolt',
    name: 'Water Bolt',
    type: 'spell',
    cost: 2,
    damage: 15,
    description: 'Hurl a bouncing bolt of water. Deals 15 damage.',
    effect: 'water_bolt',
    copies: 2,
  },
  iron_shield: {
    id: 'iron_shield',
    name: 'Iron Shield',
    type: 'armor',
    cost: 2,
    defense: 10,
    description: 'Gain +10 Defense until the end of the turn.',
    effect: 'shield',
    copies: 1,
    classes: ['melee'],
  },
  healing_potion: {
    id: 'healing_potion',
    name: 'Healing Potion',
    type: 'potion',
    cost: 1,
    healing: 20,
    description: 'Restore 20 HP to the most wounded ally.',
    effect: 'heal',
    copies: 1,
  },
  mana_shield: {
    id: 'mana_shield',
    name: 'Mana Shield',
    type: 'spell',
    cost: 2,
    defense: 5,
    description: 'Arcane barrier. Grant +5 Defense to all allies.',
    effect: 'mana_shield',
    copies: 1,
    classes: ['mage'],
  },
  taunt: {
    id: 'taunt',
    name: 'Taunt',
    type: 'spell',
    cost: 2,
    description: 'Force the boss to attack the Melee guardian this turn.',
    effect: 'taunt',
    copies: 1,
    classes: ['melee'],
  },
  summon_minion: {
    id: 'summon_minion',
    name: 'Summon Minion',
    type: 'spell',
    cost: 2,
    damage: 6,
    description: 'Summon a minion that strikes the boss for 6 each turn.',
    effect: 'summon',
    copies: 1,
    classes: ['summoner'],
  },
  precision_shot: {
    id: 'precision_shot',
    name: 'Precision Shot',
    type: 'weapon',
    cost: 2,
    damage: 25,
    description: 'A perfectly aimed arrow. Deals 25 damage.',
    effect: 'precision_shot',
    copies: 2,
    classes: ['ranged'],
  },
  // ---- spellbook additions: more decisions, more Mana pressure ----------
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    type: 'spell',
    cost: 3,
    damage: 24,
    description: 'A roaring blast. Deals 24 damage to the boss.',
    effect: 'fireball',
    copies: 1,
    classes: ['mage'],
  },
  dark_bolt: {
    id: 'dark_bolt',
    name: 'Dark Bolt',
    type: 'spell',
    cost: 3,
    damage: 22,
    description: 'Cursed shadow. Deals 22 damage to the boss.',
    effect: 'dark_bolt',
    copies: 1,
    classes: ['summoner'],
  },
  volley: {
    id: 'volley',
    name: 'Arrow Volley',
    type: 'weapon',
    cost: 3,
    damage: 9,
    hits: 3,
    description: 'Three arrows in quick succession: 3 × 9 damage.',
    effect: 'volley',
    copies: 1,
    classes: ['ranged'],
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Mana Potion',
    type: 'potion',
    cost: 0,
    manaRestore: 3,
    description: 'Restore 3 Mana. Chain it into a bigger turn.',
    effect: 'mana_potion',
    copies: 1,
  },
  armor_break: {
    id: 'armor_break',
    name: 'Shield Shatter',
    type: 'weapon',
    cost: 2,
    armorBreak: 8,
    damage: 8,
    description: 'Deal 8 damage and strip 8 boss armor.',
    effect: 'armor_break',
    copies: 1,
  },
};

export const STARTING_DECK: Card[] = Object.values(CARDS)
  .filter((card) => !card.classes)
  .flatMap((card) => Array.from({ length: card.copies ?? 1 }, () => ({ ...card })));

/**
 * Builds a deck from the chosen guardians. Shared cards go in once, then each
 * class folds in its signature cards so every role plays differently.
 */
export function buildStartingDeck(classes: CharacterClass[]): Card[] {
  const deck = STARTING_DECK.map((card) => ({ ...card }));
  for (const card of Object.values(CARDS)) {
    if (!card.classes || !card.classes.some((c) => classes.includes(c))) continue;
    deck.push(...Array.from({ length: card.copies ?? 1 }, () => ({ ...card })));
  }
  return deck;
}

export const HAND_SIZE = 5;
export const MANA_PER_TURN = 4;

/**
 * The party shares one hand and one Mana pool, so both have to grow with the
 * party. Scaling only the boss (as an earlier pass did) made two- and
 * three-guardian runs mathematically unwinnable: the boss gained 1.3× HP per
 * extra guardian while the party gained no extra actions.
 */
export function handSizeForParty(partySize: number): number {
  return HAND_SIZE + Math.max(0, partySize - 1) * 2;
}

export function manaForParty(partySize: number): number {
  return MANA_PER_TURN + Math.max(0, partySize - 1);
}

/** Default hand crafted for the scripted demo: exactly matches the scripted script. */
export const DEMO_HAND_ORDER = [
  'mana_shield',
  'water_bolt',
  'iron_shield',
  'taunt',
  'healing_potion',
];

export function findCard(id: string): Card | undefined {
  return CARDS[id];
}
