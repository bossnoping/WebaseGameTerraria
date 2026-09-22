import { create } from 'zustand';
import { CARDS, HAND_SIZE, STARTING_DECK } from '../data/cards';
import { createDemoRoster, createPlayer } from '../data/characters';
import { EYE_OF_CTHULHU } from '../data/bosses';
import { playSound } from '../systems/audio';
import type {
  BossActionCard,
  Card,
  CameraMode,
  CharacterClass,
  DamageBreakdown,
  FloatingNumber,
  GameEffectEvent,
  GamePhase,
  GameState,
  LogEntry,
  Player,
} from './types';

let uid = 1;
const nextId = () => uid++;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export interface EngineState extends GameState {
  effects: GameEffectEvent[];
  floats: FloatingNumber[];
  shake: number;
  /** set when the demo drives the game so the UI can disable manual input */
  demoRunning: boolean;
  demoStep: number;
  demoCaption: string;
  demoSub: string;
  /** Incremented on every newGame/startDemo so scenes can re-run their intro. */
  runId: number;
  lastDrawn: string[];
  victory: boolean;
  defeat: boolean;
}

interface EngineActions {
  newGame: (classes?: CharacterClass[], bossHp?: number) => void;
  startDemo: () => void;
  endDemo: () => void;
  setDemoStep: (step: number) => void;
  setDemoCaption: (caption: string, sub: string) => void;
  drawPhase: () => void;
  beginPlayerAction: () => void;
  playCard: (cardId: string, handIndex: number) => boolean;
  beginBossAction: (forceCardId?: string) => void;
  resolvePhase: (overrideTargetId?: string) => void;
  nextTurn: () => void;
  setCamera: (mode: CameraMode) => void;
  setPhase: (phase: GamePhase) => void;
  pruneTransients: () => void;
  addShake: (amount: number) => void;
  addLog: (text: string, kind?: LogEntry['kind']) => void;
  damageBoss: (amount: number, label?: string) => void;
  minionAttack: () => void;
}

const initialBoss = (hp?: number): GameState['boss'] => ({
  name: EYE_OF_CTHULHU.name,
  subtitle: EYE_OF_CTHULHU.subtitle,
  hp: hp ?? EYE_OF_CTHULHU.maxHp,
  maxHp: EYE_OF_CTHULHU.maxHp,
  defense: 0,
  enraged: false,
  animState: 'IDLE',
  intent: null,
});

export const useGame = create<EngineState & EngineActions>((set, get) => ({
  turn: 1,
  phase: 'INTRO',
  boss: initialBoss(),
  players: [],
  deck: [],
  hand: [],
  discard: [],
  mana: 0,
  maxMana: 4,
  activePlayerId: 'melee',
  cameraMode: 'OVERVIEW',
  log: [],
  damageBreakdown: null,
  playedThisTurn: [],
  effects: [],
  floats: [],
  shake: 0,
  demoRunning: false,
  demoStep: 0,
  demoCaption: '',
  demoSub: '',
  runId: 0,
  lastDrawn: [],
  victory: false,
  defeat: false,

  newGame: (classes = ['melee', 'mage'], bossHp) => {
    const players = classes.length ? classes.map((c) => createPlayer(c)) : createDemoRoster();
    set({
      turn: 1,
      phase: 'INTRO',
      boss: initialBoss(bossHp),
      players,
      deck: shuffle(STARTING_DECK),
      hand: [],
      discard: [],
      mana: 0,
      maxMana: 4,
      activePlayerId: players[0]?.id ?? 'melee',
      cameraMode: 'OVERVIEW',
      log: [],
      damageBreakdown: null,
          playedThisTurn: [],
      effects: [],
      floats: [],
      shake: 0,
      demoRunning: false,
      demoStep: 0,
      demoCaption: '',
      demoSub: '',
      runId: get().runId + 1,
      lastDrawn: [],
      victory: false,
      defeat: false,
    });
    get().addLog('The Blood Moon rises over the village.', 'system');
  },

  startDemo: () => {
    const players = createDemoRoster();
    // The scripted cards stay in the deck: prepareDemoHand() pulls them into the
    // hand at the start of the demo so the scenes always have what they need.
    const demoDeck = shuffle(STARTING_DECK);
    set({
      turn: 1,
      phase: 'INTRO',
      boss: initialBoss(200),
      players,
      deck: demoDeck,
      hand: [],
      discard: [],
      mana: 0,
      maxMana: 4,
      activePlayerId: 'melee',
      cameraMode: 'OVERVIEW',
      log: [],
      damageBreakdown: null,
          playedThisTurn: [],
      effects: [],
      floats: [],
      shake: 0,
      demoRunning: true,
      demoStep: 0,
      demoCaption: '',
      demoSub: '',
      runId: get().runId + 1,
      lastDrawn: [],
      victory: false,
      defeat: false,
    });
    get().addLog('PRESENTATION DEMO — scripted demonstration of one full turn.', 'system');
    playSound('PHASE_CHANGE');
  },

  endDemo: () => set({ demoRunning: false }),

  setDemoStep: (step) => set({ demoStep: step }),

  setDemoCaption: (demoCaption, demoSub) => set({ demoCaption, demoSub }),

  setPhase: (phase) => {
    set({ phase });
    playSound('PHASE_CHANGE');
  },

  setCamera: (cameraMode) => set({ cameraMode }),

  drawPhase: () => {
    const s = get();
    const needed = HAND_SIZE - s.hand.length;
    const deck = [...s.deck];
    const drawn: Card[] = [];
    for (let i = 0; i < needed; i++) {
      if (deck.length === 0) {
        if (s.discard.length === 0) break;
        deck.push(...shuffle(s.discard));
        set({ discard: [] });
      }
      const card = deck.shift();
      if (card) drawn.push(card);
    }
    set({
      deck,
      hand: [...s.hand, ...drawn],
      mana: s.maxMana,
      phase: 'DRAW',
      lastDrawn: drawn.map((c) => c.id),
      damageBreakdown: null,
    });
    if (drawn.length) playSound('CARD_DRAW');
    get().addLog(`DRAW PHASE — drew ${drawn.length} card(s), Mana restored to ${s.maxMana}.`, 'phase');
  },

  beginPlayerAction: () => {
    set({ phase: 'PLAYER_ACTION' });
    get().addLog('PLAYER ACTION — play your cards.', 'phase');
  },

  playCard: (cardId, handIndex) => {
    const s = get();
    if (s.phase !== 'PLAYER_ACTION' || s.victory || s.defeat) return false;
    const card = CARDS[cardId];
    if (!card) return false;
    if (s.mana < card.cost) {
      get().addLog(`Not enough Mana for ${card.name} (needs ${card.cost}).`, 'system');
      return false;
    }

    const players = s.players.map((p) => ({ ...p }));
    const hand = [...s.hand];
    hand.splice(handIndex, 1);

    let boss = { ...s.boss };
    let damageBossAmount = 0;
    const effects = [...s.effects];
    const newFloats: FloatingNumber[] = [];

    const melee = players.find((p) => p.className === 'melee');
    const caster = melee && card.id === 'taunt' ? melee : players.find((p) => p.id === s.activePlayerId) ?? players[0];

    const bossWorldPos: [number, number, number] = [0, 6, -6];
    const casterPos: [number, number, number] = caster?.slot === 0 ? [-4.5, 1.4, 6] : [4.5, 1.4, 6];

    switch (card.effect) {
      case 'slash':
      case 'precision_shot':
      case 'water_bolt':
        damageBossAmount = card.damage ?? 0;
        if (caster) caster.animState = 'ATTACK';
        effects.push({
          id: nextId(),
          kind: card.effect === 'slash' ? 'slash' : 'projectile',
          from: casterPos,
          to: bossWorldPos,
          color: card.effect === 'water_bolt' ? '#59a6ff' : card.effect === 'slash' ? '#ffd479' : '#bfe8a0',
          duration: 0.85,
        });
        playSound(card.effect === 'slash' ? 'SWORD_ATTACK' : 'MAGIC_CAST');
        newFloats.push({
          id: nextId(),
          text: `-${damageBossAmount}`,
          position: [bossWorldPos[0], bossWorldPos[1] + 3, bossWorldPos[2]],
          color: '#ff5f5f',
          kind: 'damage',
          born: performance.now(),
        });
        break;
      case 'shield': {
        const bonus = card.defense ?? 0;
        players.forEach((p) => {
          if (p.id !== caster?.id) return;
          p.armorBonus = Math.max(p.armorBonus, bonus);
          p.defense = p.baseDefense + p.armorBonus;
        });
        if (caster) caster.animState = 'CAST';
        effects.push({
          id: nextId(),
          kind: 'shield',
          from: casterPos,
          to: casterPos,
          color: '#d8b06a',
          duration: 1.4,
        });
        newFloats.push({
          id: nextId(),
          text: `+${card.defense} DEF`,
          position: [casterPos[0], casterPos[1] + 2.2, casterPos[2]],
          color: '#ffd479',
          kind: 'block',
          born: performance.now(),
        });
        playSound('CARD_PLAY');
        break;
      }
      case 'mana_shield': {
        const bonus = card.defense ?? 0;
        players.forEach((p) => {
          p.armorBonus = Math.max(p.armorBonus, bonus);
          p.defense = p.baseDefense + p.armorBonus;
        });
        if (caster) caster.animState = 'CAST';
        players.forEach((p) => {
          effects.push({
            id: nextId(),
            kind: 'shield',
            from: [p.slot === 0 ? -4.5 : 4.5, 1.4, 6],
            to: [p.slot === 0 ? -4.5 : 4.5, 1.4, 6],
            color: '#59a6ff',
            duration: 1.3,
          });
        });
        playSound('MAGIC_CAST');
        break;
      }
      case 'taunt':
        players.forEach((p) => (p.taunting = false));
        if (melee) melee.taunting = true;
        effects.push({
          id: nextId(),
          kind: 'taunt',
          from: [melee?.slot === 0 ? -4.5 : 4.5, 1.6, 6],
          to: bossWorldPos,
          color: '#ff4d4d',
          duration: 1.2,
        });
        playSound('CARD_PLAY');
        break;
      case 'summon':
        damageBossAmount = card.damage ?? 0;
        if (caster) caster.animState = 'CAST';
        effects.push({
          id: nextId(),
          kind: 'summon',
          from: [casterPos[0], casterPos[1], casterPos[2]],
          to: [casterPos[0] + 1.6, 0.6, casterPos[2] - 0.6],
          color: '#c084fc',
          duration: 1.6,
        });
        newFloats.push({
          id: nextId(),
          text: `-${damageBossAmount}`,
          position: [bossWorldPos[0], bossWorldPos[1] + 2.4, bossWorldPos[2]],
          color: '#c084fc',
          kind: 'damage',
          born: performance.now(),
        });
        playSound('CARD_PLAY');
        break;
      case 'heal': {
        const wounded = [...players].filter((p) => p.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (wounded) {
          const before = wounded.hp;
          wounded.hp = Math.min(wounded.maxHp, wounded.hp + (card.healing ?? 0));
          newFloats.push({
            id: nextId(),
            text: `+${wounded.hp - before} HP`,
            position: [wounded.slot === 0 ? -4.5 : 4.5, 2.6, 6],
            color: '#7ee08a',
            kind: 'heal',
            born: performance.now(),
          });
        }
        if (caster) caster.animState = 'CAST';
        effects.push({
          id: nextId(),
          kind: 'heal',
          from: casterPos,
          to: casterPos,
          color: '#7ee08a',
          duration: 1.1,
        });
        playSound('CARD_PLAY');
        break;
      }
    }

    let floats = [...s.floats, ...newFloats];

    if (damageBossAmount > 0) {
      boss.hp = Math.max(0, boss.hp - damageBossAmount);
      boss.animState = boss.hp <= 0 ? 'DEFEATED' : 'HIT';
    }

    const defeated = boss.hp <= 0;
    const enraged = !defeated && boss.hp / boss.maxHp <= EYE_OF_CTHULHU.enrageThreshold;
    if (enraged && !boss.enraged) {
      boss.enraged = true;
      boss.animState = 'ENRAGED';
      get().addLog('The Eye of Cthulhu is ENRAGED! Its movements quicken with bloodlust.', 'boss');
    }

    set({
      players,
      hand,
      boss,
      discard: [...s.discard, card],
      mana: s.mana - card.cost,
      effects,
      floats,
      playedThisTurn: [...s.playedThisTurn, card.name],
    });

    get().addLog(`Plays ${card.name}. (${card.cost} Mana)`, 'player');

    setTimeout(() => {
      const st = get();
      if (st.boss.hp > 0 && st.boss.animState === 'HIT') {
        set({ boss: { ...st.boss, animState: st.boss.enraged ? 'ENRAGED' : 'IDLE' } });
      }
      set({
        players: get().players.map((p) =>
          p.animState === 'ATTACK' || p.animState === 'CAST' ? { ...p, animState: 'IDLE' } : p,
        ),
      });
    }, 700);

    if (defeated) {
      setTimeout(() => {
        playSound('VICTORY');
        set({
          phase: 'VICTORY',
          victory: true,
          cameraMode: 'BOSS',
          shake: 1.4,
          effects: [
            ...get().effects,
            {
              id: nextId(),
              kind: 'explosion',
              from: [0, 6, -6],
              to: [0, 6, -6],
              color: '#ff4d4d',
              duration: 2,
            },
          ],
        });
        get().addLog('VICTORY! The Eye of Cthulhu dissolves into red mist. The village is safe.', 'system');
      }, 900);
    }

    return true;
  },

  beginBossAction: (forceCardId) => {
    const s = get();
    if (s.victory || s.defeat) return;

    // A summoned minion strikes on its own before the boss responds.
    if (s.playedThisTurn.includes('Summon Minion') && s.boss.hp > 0) {
      get().addLog('The summoned minion strikes on its own.', 'player');
      get().minionAttack();
      if (get().victory) return;
    }

    const pool = EYE_OF_CTHULHU.attacks;
    const forced = forceCardId ? pool.find((a) => a.id === forceCardId) : undefined;
    const card: BossActionCard = forced ?? pool[Math.floor(Math.random() * pool.length)];
    const targeted = s.players.find((p) => p.taunting && p.alive) ?? [...s.players].filter((p) => p.alive)[0];

    set({
      phase: 'BOSS_ACTION',
      boss: { ...s.boss, intent: card, animState: 'ATTACK' },
      cameraMode: 'ATTACK',
      shake: 0.9,
      players: s.players.map((p) => (p.id === targeted?.id ? { ...p, animState: 'HIT' } : p)),
      effects: [
        ...s.effects,
        {
          id: nextId(),
          kind: 'impact',
          from: [0, 6, -6],
          to: [targeted?.slot === 0 ? -4.5 : 4.5, 1.5, 6],
          color: '#ff4d4d',
          duration: 1.1,
        },
      ],
    });
    playSound('BOSS_ATTACK');
    get().addLog(`BOSS ACTION — ${card.name} (${card.damage} damage) targeting ${targeted?.name ?? 'the party'}.`, 'boss');
    setTimeout(() => {
      const st = get();
      if (st.phase === 'BOSS_ACTION') set({ boss: { ...st.boss, animState: st.boss.enraged ? 'ENRAGED' : 'IDLE' } });
    }, 900);
  },

  resolvePhase: (overrideTargetId) => {
    const s = get();
    if (s.victory || s.defeat) return;
    const raw = s.boss.intent?.damage ?? 0;
    const target =
      s.players.find((p) => p.id === overrideTargetId) ??
      s.players.find((p) => p.taunting && p.alive) ??
      [...s.players].filter((p) => p.alive).sort((a, b) => b.defense - a.defense)[0] ??
      s.players[0];

    if (!target) {
      set({ phase: 'RESOLUTION' });
      return;
    }

    const defense = target.defense;
    const final = Math.max(0, raw - defense);
    // Armor persists until removed (per card rules); Taunt only lasts its turn.
    const players: Player[] = s.players.map((p) => {
      if (p.id !== target.id) {
        return { ...p, taunting: false, animState: 'IDLE' as Player['animState'] };
      }
      const hp = Math.max(0, p.hp - final);
      return {
        ...p,
        hp,
        alive: hp > 0,
        taunting: false,
        animState: (final > 0 ? 'HIT' : 'IDLE') as Player['animState'],
      };
    });

    const breakdown: DamageBreakdown = {
      raw,
      defense,
      final,
      targetId: target.id,
      targetName: target.name,
    };

    set({
      phase: 'RESOLUTION',
      players,
      damageBreakdown: breakdown,
      cameraMode: 'ATTACK',
      shake: 0.7,
      floats:
        final > 0
          ? [
              ...s.floats,
              {
                id: nextId(),
                text: `-${final}`,
                position: [target.slot === 0 ? -4.5 : 4.5, 2.8, 6],
                color: '#ff7a7a',
                kind: 'damage',
                born: performance.now(),
              },
            ]
          : [
              ...s.floats,
              {
                id: nextId(),
                text: 'BLOCKED',
                position: [target.slot === 0 ? -4.5 : 4.5, 2.8, 6],
                color: '#8ad7ff',
                kind: 'block',
                born: performance.now(),
              },
            ],
    });

    if (final > 0) playSound('PLAYER_HIT');
    get().addLog(`${raw} DAMAGE − ${defense} DEFENSE = ${final} DAMAGE to ${target.name}.`, 'damage');

    const allDead = players.every((p) => !p.alive);
    if (allDead) {
      setTimeout(() => {
        set({ phase: 'DEFEAT', defeat: true, cameraMode: 'OVERVIEW' });
        get().addLog('DEFEAT — the guardians have fallen. The village is lost... for now.', 'system');
      }, 800);
    }

    setTimeout(() => {
      set({ players: get().players.map((p) => (p.animState === 'HIT' ? { ...p, animState: 'IDLE' } : p)) });
    }, 700);
  },

  nextTurn: () => {
    const s = get();
    if (s.victory || s.defeat) return;
    set({
      turn: s.turn + 1,
      phase: 'DRAW',
          damageBreakdown: null,
      playedThisTurn: [],
      cameraMode: 'OVERVIEW',
      boss: { ...s.boss, intent: null, animState: s.boss.enraged ? 'ENRAGED' : 'IDLE' },
      players: s.players.map((p) => ({
        ...p,
        defense: p.baseDefense,
        armorBonus: 0,
        taunting: false,
      })),
    });
    get().addLog(`TURN ${String(s.turn + 1).padStart(2, '0')} begins.`, 'phase');
  },

  damageBoss: (amount, label) => {
    const s = get();
    if (s.boss.hp <= 0) return;
    const hp = Math.max(0, s.boss.hp - amount);
    const enraged = hp / s.boss.maxHp <= EYE_OF_CTHULHU.enrageThreshold;
    set({
      boss: {
        ...s.boss,
        hp,
        enraged: enraged || s.boss.enraged,
        animState: hp <= 0 ? 'DEFEATED' : 'HIT',
      },
      floats: [
        ...s.floats,
        {
          id: nextId(),
          text: `-${amount}`,
          position: [0, 9, -6],
          color: '#ff5f5f',
          kind: 'damage',
          born: performance.now(),
        },
      ],
    });
    if (label) get().addLog(label, 'damage');
    playSound('BOSS_HIT');
    setTimeout(() => {
      const st = get();
      if (st.boss.hp > 0 && st.boss.animState === 'HIT') {
        set({ boss: { ...st.boss, animState: st.boss.enraged ? 'ENRAGED' : 'IDLE' } });
      }
    }, 600);
    if (hp <= 0) {
      setTimeout(() => {
        playSound('VICTORY');
        set({
          phase: 'VICTORY',
          victory: true,
          cameraMode: 'BOSS',
          shake: 1.4,
          effects: [
            ...get().effects,
            { id: nextId(), kind: 'explosion', from: [0, 6, -6], to: [0, 6, -6], color: '#ff4d4d', duration: 2 },
          ],
        });
        get().addLog('VICTORY! The Eye of Cthulhu dissolves into red mist. The village is safe.', 'system');
      }, 900);
    }
  },

  minionAttack: () => {
    const s = get();
    if (s.boss.hp <= 0 || s.victory || s.defeat) return;
    playSound('MAGIC_CAST');
    get().damageBoss(6, 'The summoned minion strikes the boss for 6.');
  },

  pruneTransients: () => {
    const s = get();
    const now = performance.now();
    const floats = s.floats.filter((f) => now - f.born < 1600);
    const effects = s.effects.length > 24 ? s.effects.slice(s.effects.length - 24) : s.effects;
    if (floats.length !== s.floats.length || effects !== s.effects) set({ floats, effects });
    if (s.shake > 0) set({ shake: Math.max(0, s.shake - 0.06) });
  },

  addShake: (amount) => set((s) => ({ shake: Math.min(2, s.shake + amount) })),

  addLog: (text, kind = 'system') =>
    set((s) => ({ log: [...s.log.slice(-40), { id: nextId(), text, kind }] })),
}));

export function bossIntentFor(id: string): BossActionCard | undefined {
  return EYE_OF_CTHULHU.attacks.find((a) => a.id === id);
}
