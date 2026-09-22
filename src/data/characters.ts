import type { CharacterClass, Player } from '../game/types';

export interface CharacterDefinition {
  className: CharacterClass;
  name: string;
  role: string;
  blurb: string;
  maxHp: number;
  /** Base defense always applied, before armor cards */
  baseDefense: number;
  accent: string;
  abilities: { name: string; cost: number; effect: string }[];
  slot: number;
}

export const CHARACTERS: Record<CharacterClass, CharacterDefinition> = {
  melee: {
    className: 'melee',
    name: 'Melee',
    role: 'Tank / Frontline',
    blurb: 'Heavy armor, heavy blade. Holds the line so the village stands.',
    maxHp: 100,
    baseDefense: 5,
    accent: '#d8b06a',
    slot: 0,
    abilities: [
      { name: 'Iron Shield', cost: 2, effect: 'Increase your defense.' },
      { name: 'Taunt', cost: 2, effect: 'Force the boss to attack you.' },
    ],
  },
  mage: {
    className: 'mage',
    name: 'Mage',
    role: 'Magic / Support',
    blurb: 'Robes, staff, and a stubborn refusal to stop casting.',
    maxHp: 80,
    baseDefense: 0,
    accent: '#59a6ff',
    slot: 1,
    abilities: [
      { name: 'Mana Shield', cost: 2, effect: 'Increase ally defense.' },
      { name: 'Water Bolt', cost: 2, effect: 'Deal 15 damage to the boss.' },
    ],
  },
  summoner: {
    className: 'summoner',
    name: 'Summoner',
    role: 'Summoned Creature Specialist',
    blurb: 'Never fights alone. The minions do the honest work.',
    maxHp: 85,
    baseDefense: 0,
    accent: '#c084fc',
    slot: 1,
    abilities: [
      { name: 'Summon Minion', cost: 2, effect: 'Summon a creature that attacks the boss.' },
    ],
  },
  ranged: {
    className: 'ranged',
    name: 'Long-Range',
    role: 'Ranged Damage',
    blurb: 'Light armor, long sightlines, one arrow at a time.',
    maxHp: 90,
    baseDefense: 0,
    accent: '#7ee08a',
    slot: 1,
    abilities: [
      { name: 'Precision Shot', cost: 2, effect: 'Deal high single-target damage.' },
    ],
  },
};

export const CHARACTER_ORDER: CharacterClass[] = ['melee', 'mage', 'summoner', 'ranged'];

export function createPlayer(className: CharacterClass, hpOverride?: number): Player {
  const def = CHARACTERS[className];
  return {
    id: className,
    name: def.name,
    className,
    role: def.role,
    hp: hpOverride ?? def.maxHp,
    maxHp: def.maxHp,
    defense: def.baseDefense,
    baseDefense: def.baseDefense,
    armorBonus: 0,
    alive: true,
    taunting: false,
    slot: def.slot,
    animState: 'IDLE',
  };
}

/** The demo roster: one melee tank and one mage damage/support. */
export function createDemoRoster(): Player[] {
  return [createPlayer('melee', 100), createPlayer('mage', 80)];
}
