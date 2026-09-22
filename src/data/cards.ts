import type { Card } from '../game/types';

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
  },
  taunt: {
    id: 'taunt',
    name: 'Taunt',
    type: 'spell',
    cost: 2,
    description: 'Force the boss to attack the Melee guardian this turn.',
    effect: 'taunt',
    copies: 1,
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
  },
};

export const STARTING_DECK: Card[] = Object.values(CARDS).flatMap((card) =>
  Array.from({ length: card.copies ?? 1 }, () => ({ ...card })),
);

export const HAND_SIZE = 5;

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
