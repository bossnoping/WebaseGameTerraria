import type { GamePhase } from '../types';

export interface PhaseInfo {
  index: number;
  label: string;
  title: string;
  hint: string;
  color: string;
}

export const PHASE_ORDER: GamePhase[] = ['DRAW', 'PLAYER_ACTION', 'BOSS_ACTION', 'RESOLUTION'];

export const PHASE_INFO: Record<string, PhaseInfo> = {
  INTRO: {
    index: 0,
    label: 'INTRO',
    title: 'BLOOD MOON',
    hint: 'The bosses have escaped their dimensional prisons.',
    color: '#ff4d4d',
  },
  DRAW: {
    index: 1,
    label: 'PHASE 1',
    title: 'DRAW',
    hint: 'Draw cards and refill Mana.',
    color: '#59a6ff',
  },
  PLAYER_ACTION: {
    index: 2,
    label: 'PHASE 2',
    title: 'PLAYER ACTION',
    hint: 'Play weapons, armor, spells, and potions.',
    color: '#7ee08a',
  },
  BOSS_ACTION: {
    index: 3,
    label: 'PHASE 3',
    title: 'BOSS ACTION',
    hint: 'The boss attacks.',
    color: '#ff8a3d',
  },
  RESOLUTION: {
    index: 4,
    label: 'PHASE 4',
    title: 'RESOLUTION',
    hint: 'Calculate damage and apply effects.',
    color: '#ffd479',
  },
  VICTORY: {
    index: 5,
    label: 'COMPLETE',
    title: 'VICTORY',
    hint: 'The village is safe.',
    color: '#ffd479',
  },
  DEFEAT: {
    index: 5,
    label: 'COMPLETE',
    title: 'DEFEAT',
    hint: 'The Blood Moon endures.',
    color: '#ff4d4d',
  },
};

export const HOW_TO_PLAY = [
  {
    step: 1,
    title: 'DRAW',
    body: 'Draw up to 5 cards and refill Mana to 4 every turn.',
  },
  {
    step: 2,
    title: 'PLAYER ACTION',
    body: 'Play weapons, armor, spells, and potions. Watch your Mana cost.',
  },
  {
    step: 3,
    title: 'BOSS ACTION',
    body: 'The boss draws an attack card and lunges at a guardian.',
  },
  {
    step: 4,
    title: 'RESOLUTION',
    body: 'Damage minus Defense is applied, then used cards are discarded.',
  },
];
