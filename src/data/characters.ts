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
  icon: string;
  abilities: { name: string; cost: number; effect: string }[];
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
    icon: '⚔️',
    abilities: [
      { name: 'Iron Shield', cost: 2, effect: 'Increase your defense by 10.' },
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
    icon: '🔮',
    abilities: [
      { name: 'Mana Shield', cost: 2, effect: 'Grant +5 Defense to all allies.' },
      { name: 'Water Bolt', cost: 2, effect: 'Deal 15 damage to the boss.' },
      { name: 'Fireball', cost: 3, effect: 'Deal 24 damage to the boss.' },
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
    icon: '👁️',
    abilities: [
      { name: 'Summon Minion', cost: 2, effect: 'Summon a creature that attacks the boss.' },
      { name: 'Dark Bolt', cost: 3, effect: 'Deal 22 damage to the boss.' },
    ],
  },
  ranged: {
    className: 'ranged',
    name: 'Ranger',
    role: 'Ranged Damage',
    blurb: 'Light armor, long sightlines, one arrow at a time.',
    maxHp: 90,
    baseDefense: 0,
    accent: '#7ee08a',
    icon: '🏹',
    abilities: [
      { name: 'Precision Shot', cost: 2, effect: 'Deal 25 damage to the boss.' },
      { name: 'Arrow Volley', cost: 3, effect: 'Deal 3 × 9 damage to the boss.' },
    ],
  },
};

export const CHARACTER_ORDER: CharacterClass[] = ['melee', 'mage', 'summoner', 'ranged'];

/** Slot i in the party decides where a guardian stands in the arena. */
export function slotPosition(slot: number): [number, number, number] {
  if (slot === 0) return [-7.2, 1.4, 6];
  if (slot === 1) return [0, 1.4, 7.6];
  return [7.2, 1.4, 6];
}

export function createPlayer(className: CharacterClass, slot: number, hpOverride?: number): Player {
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
    slot,
    animState: 'IDLE',
  };
}

/** Builds a party in the order the player chose their roles. */
export function createParty(classes: CharacterClass[]): Player[] {
  return classes.map((c, i) => createPlayer(c, i));
}

/** The demo roster: one melee tank and one mage damage/support. */
export function createDemoRoster(): Player[] {
  return [createPlayer('melee', 0, 100), createPlayer('mage', 1, 80)];
}
