import type { BossActionCard, Difficulty } from '../game/types';

export interface BossDefinition {
  id: string;
  name: string;
  subtitle: string;
  maxHp: number;
  /** Fraction of max HP at which the boss enrages. */
  enrageThreshold: number;
  /** Flat armor the boss carries from the first turn of the enraged phase. */
  enragedDefense: number;
  /** Bonus damage added to every attack once enraged. */
  enrageDamageBonus: number;
  attacks: BossActionCard[];
}

/**
 * The classroom fight, tuned to actually push back. At 200 HP a single guardian
 * dealing 15–25 a turn cleared the eye in about five turns; 300 HP plus party
 * scaling, boss armor, enrage damage and a heal means a win now takes real
 * resource management.
 */
export const EYE_OF_CTHULHU: BossDefinition = {
  id: 'eye_of_cthulhu',
  name: 'Eye of Cthulhu',
  subtitle: 'Servant of the Blood Moon',
  maxHp: 300,
  enrageThreshold: 0.4,
  enragedDefense: 4,
  enrageDamageBonus: 6,
  attacks: [
    {
      id: 'savage_dash',
      name: 'Savage Dash',
      damage: 20,
      description: 'The eye hurls itself forward in a single savage lunge.',
    },
    {
      id: 'blood_shot',
      name: 'Blood Shot',
      damage: 14,
      description: 'A spray of cursed ichor.',
    },
    {
      id: 'servant_swarm',
      name: 'Servant Swarm',
      damage: 17,
      description: 'Lesser eyes detach and dive at the guardians.',
    },
    {
      id: 'crimson_sweep',
      name: 'Crimson Sweep',
      damage: 23,
      description: 'A wide, enraged sweep of red energy.',
    },
    {
      id: 'blood_nova',
      name: 'Blood Nova',
      damage: 13,
      aoe: true,
      description: 'A ring of blood detonates, striking every guardian at once.',
    },
    {
      id: 'blood_drain',
      name: 'Blood Drain',
      damage: 16,
      lifesteal: 14,
      description: 'Drains the guardians\u2019 life and heals itself for 14.',
    },
  ],
};

export interface DifficultyModifier {
  label: string;
  blurb: string;
  hpMultiplier: number;
  damageMultiplier: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyModifier> = {
  normal: {
    label: 'NORMAL',
    blurb: 'The Blood Moon as the village remembers it.',
    hpMultiplier: 1,
    damageMultiplier: 1,
  },
  hard: {
    label: 'HARD',
    blurb: 'Thicker shell, sharper claws. +35% HP and +18% damage.',
    hpMultiplier: 1.35,
    damageMultiplier: 1.18,
  },
  nightmare: {
    label: 'NIGHTMARE',
    blurb: 'A grind you are meant to lose. +75% HP and +40% damage.',
    hpMultiplier: 1.75,
    damageMultiplier: 1.4,
  },
};

/**
 * A party of three would trivially out-damage a boss scaled for one, so each
 * extra guardian adds 1.3× the boss's base HP and 1.1× its damage.
 */
export function scaleBossForParty(
  partySize: number,
  difficulty: Difficulty,
): { hp: number; damageMultiplier: number } {
  const extra = Math.max(0, partySize - 1);
  const partyHp = Math.pow(1.3, extra);
  const partyDamage = Math.pow(1.1, extra);
  const diff = DIFFICULTIES[difficulty];
  return {
    hp: Math.round(EYE_OF_CTHULHU.maxHp * partyHp * diff.hpMultiplier),
    damageMultiplier: partyDamage * diff.damageMultiplier,
  };
}

export const DLC_BOSSES = [
  { id: 'the_twins', name: 'The Twins', expansion: 'Hardmode Expansion' },
  { id: 'skeletron_prime', name: 'Skeletron Prime', expansion: 'Hardmode Expansion' },
  { id: 'moon_lord', name: 'Moon Lord', expansion: 'Lunar Awakening' },
];

export const BOSSES = [EYE_OF_CTHULHU];
