import type { BossActionCard } from '../game/types';

export interface BossDefinition {
  id: string;
  name: string;
  subtitle: string;
  maxHp: number;
  enrageThreshold: number;
  attacks: BossActionCard[];
}

export const EYE_OF_CTHULHU: BossDefinition = {
  id: 'eye_of_cthulhu',
  name: 'Eye of Cthulhu',
  subtitle: 'Servant of the Blood Moon',
  maxHp: 200,
  enrageThreshold: 0.4,
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
  ],
};

export const DLC_BOSSES = [
  { id: 'the_twins', name: 'The Twins', expansion: 'Hardmode Expansion' },
  { id: 'skeletron_prime', name: 'Skeletron Prime', expansion: 'Hardmode Expansion' },
  { id: 'moon_lord', name: 'Moon Lord', expansion: 'Lunar Awakening' },
];

export const BOSSES = [EYE_OF_CTHULHU];
