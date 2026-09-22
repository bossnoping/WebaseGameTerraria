import { useEffect, useRef } from 'react';
import { useGame } from '../game/GameEngine';
import { playSound } from './audio';

export interface DemoApi {
  /** Read the live engine state. */
  game: () => ReturnType<typeof useGame.getState>;
}

export interface DemoBeat {
  /** Seconds to wait before this beat fires. */
  delay: number;
  /** Main caption. `\n` splits lines. Omit to leave the current caption alone. */
  caption?: string;
  sub?: string;
  run?: (api: DemoApi) => void;
}

export interface DemoSceneGroup {
  id: number;
  title: string;
  beats: DemoBeat[];
}

/** Cards the scripted turn depends on, in the order the scenes play them. */
const SCRIPTED_HAND = ['Mana Shield', 'Water Bolt', 'Iron Shield', 'Taunt', 'Healing Potion'];

function playCardByName(name: string) {
  const game = useGame.getState();
  const idx = game.hand.findIndex((c) => c.name === name);
  if (idx === -1) {
    game.addLog(`Demo skipped ${name} — it was not in hand.`, 'system');
    return;
  }
  game.playCard(game.hand[idx].id, idx);
}

/**
 * Deterministically deals the scripted hand for the demo. Runs at the very start
 * of the demo, before the Draw phase, so the scripted scenes always have their
 * cards no matter how the deck was shuffled.
 */
export function prepareDemoHand() {
  const game = useGame.getState();
  const wanted = new Set(SCRIPTED_HAND);
  const hand = game.hand.filter((c) => wanted.has(c.name));
  const deck = [...game.deck];
  for (const name of SCRIPTED_HAND) {
    if (hand.some((c) => c.name === name)) continue;
    const i = deck.findIndex((c) => c.name === name);
    if (i !== -1) hand.push(deck.splice(i, 1)[0]);
  }
  // Scripted order reads better on screen: shield, bolt, shield, taunt, potion.
  hand.sort((a, b) => SCRIPTED_HAND.indexOf(a.name) - SCRIPTED_HAND.indexOf(b.name));
  useGame.setState({ hand, deck });
}

function handControlToPresenter(turnLabel: string) {
  const game = useGame.getState();
  game.endDemo();
  game.setDemoCaption('', '');
  game.nextTurn();
  game.drawPhase();
  game.beginPlayerAction();
  game.setCamera('OVERVIEW');
  game.addLog(`Demo complete — you now have control of ${turnLabel}.`, 'system');
  playSound('PHASE_CHANGE');
}

/**
 * The scripted presentation: nine scenes matching the classroom timeline, ending
 * by handing control back to the presenter at TURN 02.
 */
export const DEMO_SCENES: DemoSceneGroup[] = [
  {
    id: 1,
    title: 'Introduction',
    beats: [
      {
        delay: 0,
        caption: 'TERRARIA:\nBOSS RUSH',
        sub: 'A Strategic Cooperative Card Battle',
        run: ({ game }) => game().setDemoStep(1),
      },
      {
        delay: 3.6,
        caption: 'THE BLOOD MOON HAS AWAKENED.',
        sub: 'The bosses have escaped their dimensional prisons. DEFEND THE VILLAGE.',
        run: ({ game }) => game().setDemoStep(1),
      },
      { delay: 3.4, run: ({ game }) => game().setCamera('BOSS') },
    ],
  },
  {
    id: 2,
    title: 'Boss Introduction',
    beats: [
      {
        delay: 1.6,
        caption: 'BOSS DETECTED\nEYE OF CTHULHU',
        sub: '200 HP · Servant of the Blood Moon',
        run: ({ game }) => {
          game().setDemoStep(2);
          game().addShake(0.5);
        },
      },
      { delay: 3.4, run: ({ game }) => game().setCamera('PLAYER') },
    ],
  },
  {
    id: 3,
    title: 'Players',
    beats: [
      {
        delay: 1.2,
        caption: 'MELEE — Tank',
        sub: 'Frontline. Sword, shield, heavy armor.',
        run: ({ game }) => game().setDemoStep(3),
      },
      { delay: 3.0, caption: 'MAGE — Magic / Support', sub: 'Shields the party, burns the boss.' },
      { delay: 3.0, run: ({ game }) => game().setCamera('OVERVIEW') },
    ],
  },
  {
    id: 4,
    title: 'Draw Phase',
    beats: [
      {
        delay: 0.9,
        caption: 'PHASE 1 — DRAW',
        sub: 'Cards fly from the deck into hand. Mana 0 → 4.',
        run: ({ game }) => {
          game().setDemoStep(4);
          game().drawPhase();
        },
      },
      {
        delay: 3.2,
        run: ({ game }) => {
          game().beginPlayerAction();
          game().setCamera('PLAYER');
        },
      },
    ],
  },
  {
    id: 5,
    title: 'Mage Action',
    beats: [
      {
        delay: 1.1,
        caption: 'MAGE PLAYS\nMANA SHIELD',
        sub: 'Cost 2 Mana — +5 Defense to all allies.',
        run: () => {
          useGame.setState({ activePlayerId: 'mage' });
          playCardByName('Mana Shield');
        },
      },
      {
        delay: 3.0,
        caption: 'MAGE PLAYS\nWATER BOLT',
        sub: 'Cost 2 Mana → 15 damage to the boss.',
        run: ({ game }) => {
          game().setCamera('ATTACK');
          playCardByName('Water Bolt');
        },
      },
      { delay: 3.0, run: ({ game }) => game().setCamera('PLAYER') },
    ],
  },
  {
    id: 6,
    title: 'Melee Action',
    beats: [
      {
        // The Mage spent the shared pool in scene 5; the Melee guardian brings
        // their own 4 Mana so the scripted turn can show both shields and the dash.
        delay: 1.0,
        caption: 'MELEE ACTION — MANA 0 → 4',
        sub: 'The Melee guardian draws on their own reserves.',
        run: () => useGame.setState({ mana: 4, activePlayerId: 'melee' }),
      },
      {
        delay: 1.2,
        caption: 'MELEE EQUIPS\nIRON SHIELD',
        sub: 'Cost 2 Mana — +10 Defense.',
        run: () => {
          useGame.setState({ activePlayerId: 'melee' });
          playCardByName('Iron Shield');
        },
      },
      {
        delay: 2.9,
        caption: 'MELEE USES TAUNT',
        sub: 'BOSS TARGET: MELEE',
        run: () => playCardByName('Taunt'),
      },
      { delay: 2.8, run: ({ game }) => game().setCamera('OVERVIEW') },
    ],
  },
  {
    id: 7,
    title: 'Boss Action',
    beats: [
      {
        delay: 1.0,
        caption: 'PHASE 3 — BOSS ACTION\nSAVAGE DASH · 20 DAMAGE',
        sub: 'The Eye hurls itself at the taunting guardian.',
        run: ({ game }) => {
          game().setDemoStep(7);
          game().beginBossAction('savage_dash');
        },
      },
      { delay: 3.4, run: ({ game }) => game().setCamera('PLAYER') },
    ],
  },
  {
    id: 8,
    title: 'Resolution',
    beats: [
      {
        delay: 1.0,
        caption: 'PHASE 4 — RESOLUTION\n20 DAMAGE − 15 DEFENSE = 5 DAMAGE',
        sub: 'Iron Shield +10 over Mana Shield +5 → 5 base + 10 = 15 Defense.',
        run: ({ game }) => {
          game().setDemoStep(8);
          game().resolvePhase('melee');
        },
      },
      { delay: 3.4, run: ({ game }) => game().setCamera('OVERVIEW') },
    ],
  },
  {
    id: 9,
    title: 'Continue Battle',
    beats: [
      { delay: 1.2, caption: 'TURN 02', sub: 'Continue playing manually.', run: ({ game }) => game().setDemoStep(9) },
      { delay: 2.4, run: () => handControlToPresenter('TURN 02') },
    ],
  },
];

const SCENE_OFFSET_MS = 900;

/** Sequentially runs the demo script; every timer is cancelled on unmount. */
export function useDemoRunner(active: boolean, runId: number) {
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!active) return;

    const api: DemoApi = { game: () => useGame.getState() };
    // Guarantee the scripted five cards before the Draw phase resolves.
    timers.current.push(
      window.setTimeout(() => {
        try {
          prepareDemoHand();
        } catch {
          /* the demo must never break the presentation */
        }
      }, 400),
    );

    let offset = SCENE_OFFSET_MS;
    for (const scene of DEMO_SCENES) {
      for (const beat of scene.beats) {
        offset += beat.delay * 1000;
        const at = offset;

        if (beat.caption !== undefined) {
          const caption = beat.caption;
          const sub = beat.sub ?? '';
          timers.current.push(
            window.setTimeout(() => useGame.getState().setDemoCaption(caption, sub), at),
          );
        }
        if (beat.run) {
          const run = beat.run;
          timers.current.push(
            window.setTimeout(() => {
              try {
                run(api);
              } catch {
                /* skip failing beats rather than halting the script */
              }
            }, at),
          );
        }
      }
    }

    const allTimers = timers.current;
    return () => {
      allTimers.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [active, runId]);
}
