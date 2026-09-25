import { create } from 'zustand';
import { CARDS, HAND_SIZE, buildStartingDeck, handSizeForParty, manaForParty } from '../data/cards';
import { createDemoRoster, createParty, slotPosition } from '../data/characters';
import { EYE_OF_CTHULHU, scaleBossForParty } from '../data/bosses';
import { playSound } from '../systems/audio';
import type {
  BossActionCard,
  Card,
  CameraMode,
  CharacterClass,
  DamageBreakdown,
  Difficulty,
  FloatingNumber,
  GameEffectEvent,
  GamePhase,
  GameState,
  LogEntry,
  Player,
  ResolutionHit,
} from './types';

let uid = 1;
const nextId = () => uid++;

const BOSS_WORLD_POS: [number, number, number] = [0, 6, -6];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** The boss armour it gains once it enrages. */
const ENRAGED_DEFENSE = EYE_OF_CTHULHU.enragedDefense;

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
  /** Boss attack damage is scaled once at game start for party size + difficulty. */
  bossDamageMultiplier: number;
  /** Remembered so "play again" can rebuild the same fight. */
  lastRun: { classes: CharacterClass[]; difficulty: Difficulty } | null;
}

interface EngineActions {
  newGame: (classes?: CharacterClass[], difficulty?: Difficulty) => void;
  restartGame: () => void;
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

const initialBoss = (hp?: number, subtitle?: string): GameState['boss'] => ({
  name: EYE_OF_CTHULHU.name,
  subtitle: subtitle ?? EYE_OF_CTHULHU.subtitle,
  hp: hp ?? EYE_OF_CTHULHU.maxHp,
  maxHp: hp ?? EYE_OF_CTHULHU.maxHp,
  defense: 0,
  enraged: false,
  animState: 'IDLE',
  intent: null,
});

/** Scales a base attack for the current boss multiplier and enrage surcharge. */
function resolveAttackDamage(
  attack: BossActionCard,
  multiplier: number,
  enraged: boolean,
): BossActionCard {
  const bonus = enraged ? EYE_OF_CTHULHU.enrageDamageBonus : 0;
  return { ...attack, damage: Math.round(attack.damage * multiplier + bonus) };
}

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
  handSize: HAND_SIZE,
  activePlayerId: 'melee',
  cameraMode: 'OVERVIEW',
  log: [],
  damageBreakdown: null,
  resolutionHits: [],
  difficulty: 'normal',
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
  bossDamageMultiplier: 1,
  lastRun: null,

  newGame: (classes = ['melee', 'mage'], difficulty = 'normal') => {
    const party = classes.length ? classes : (['melee', 'mage'] as CharacterClass[]);
    const players = createParty(party);
    const scaled = scaleBossForParty(players.length, difficulty);
    const subtitle = `${EYE_OF_CTHULHU.subtitle} · ${players.length} GUARDIAN${players.length > 1 ? 'S' : ''}`;
    set({
      turn: 1,
      phase: 'INTRO',
      boss: initialBoss(scaled.hp, subtitle),
      players,
      deck: shuffle(buildStartingDeck(party)),
      hand: [],
      discard: [],
      mana: 0,
      maxMana: manaForParty(players.length),
      handSize: handSizeForParty(players.length),
      activePlayerId: players[0]?.id ?? 'melee',
      cameraMode: 'OVERVIEW',
      log: [],
      damageBreakdown: null,
      resolutionHits: [],
      difficulty,
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
      bossDamageMultiplier: scaled.damageMultiplier,
      lastRun: { classes: party, difficulty },
    });
    get().addLog(`The Blood Moon rises. ${players.length} guardian(s) answer the call.`, 'system');
  },

  restartGame: () => {
    const run = get().lastRun ?? { classes: ['melee', 'mage'] as CharacterClass[], difficulty: 'normal' as Difficulty };
    get().newGame(run.classes, run.difficulty);
  },

  startDemo: () => {
    const players = createDemoRoster();
    // The scripted cards stay in the deck: prepareDemoHand() pulls them into the
    // hand at the start of the demo so the scenes always have what they need.
    const demoDeck = shuffle(buildStartingDeck(['melee', 'mage']));
    set({
      turn: 1,
      phase: 'INTRO',
      // The demo keeps a flat 200 HP and 1× damage so the scripted maths
      // (20 − 15 = 5) stays exact and readable on screen.
      boss: initialBoss(200),
      players,
      deck: demoDeck,
      hand: [],
      discard: [],
      mana: 0,
      maxMana: 4,
      handSize: HAND_SIZE,
      activePlayerId: 'melee',
      cameraMode: 'OVERVIEW',
      log: [],
      damageBreakdown: null,
      resolutionHits: [],
      difficulty: 'normal',
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
      bossDamageMultiplier: 1,
      lastRun: null,
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
    const needed = s.handSize - s.hand.length;
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
    // Preview the boss's next move so the party can plan around it.
    const pool = EYE_OF_CTHULHU.attacks;
    const preview = resolveAttackDamage(
      pool[Math.floor(Math.random() * pool.length)],
      s.bossDamageMultiplier,
      s.boss.enraged,
    );
    set({
      deck,
      hand: [...s.hand, ...drawn],
      mana: s.maxMana,
      phase: 'DRAW',
      lastDrawn: drawn.map((c) => c.id),
      damageBreakdown: null,
      resolutionHits: [],
      boss: { ...s.boss, intent: preview },
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

    const boss = { ...s.boss };
    let bossDamageRaw = 0;
    const effects = [...s.effects];
    const newFloats: FloatingNumber[] = [];

    const melee = players.find((p) => p.className === 'melee');
    const caster =
      card.effect === 'taunt' && melee
        ? melee
        : players.find((p) => p.id === s.activePlayerId) ?? players[0];

    const casterPos: [number, number, number] = caster ? slotPosition(caster.slot) : [0, 1.4, 7.6];
    const bossPos = BOSS_WORLD_POS;

    const offenseColor = (effect: Card['effect']) => {
      switch (effect) {
        case 'fireball':
          return '#ff9a3d';
        case 'dark_bolt':
          return '#c084fc';
        case 'life_steal':
          return '#ff4d6d';
        case 'water_bolt':
          return '#59a6ff';
        case 'slash':
          return '#ffd479';
        case 'armor_break':
          return '#ff7a3d';
        default:
          return '#bfe8a0';
      }
    };

    const offenseEffects = [
      'slash',
      'precision_shot',
      'water_bolt',
      'fireball',
      'dark_bolt',
      'volley',
      'life_steal',
      'armor_break',
    ] as const;

    if ((offenseEffects as readonly string[]).includes(card.effect)) {
      const hits = card.hits ?? 1;
      bossDamageRaw = (card.damage ?? 0) * hits;
      if (card.armorBreak) {
        boss.defense = Math.max(0, boss.defense - card.armorBreak);
      }
      if (caster) caster.animState = 'ATTACK';
      const color = offenseColor(card.effect);
      for (let h = 0; h < hits; h++) {
        effects.push({
          id: nextId(),
          kind: card.effect === 'slash' ? 'slash' : 'projectile',
          from: casterPos,
          to: bossPos,
          color,
          duration: 0.85 + h * 0.12,
        });
      }
      playSound(card.effect === 'slash' || card.effect === 'precision_shot' ? 'SWORD_ATTACK' : 'MAGIC_CAST');
      for (let h = 0; h < hits; h++) {
        newFloats.push({
          id: nextId(),
          text: `-${card.damage ?? 0}`,
          position: [bossPos[0], bossPos[1] + 2.6 + h * 0.9, bossPos[2]],
          color: '#ff5f5f',
          kind: 'damage',
          born: performance.now(),
        });
      }
      if (card.armorBreak) {
        newFloats.push({
          id: nextId(),
          text: `ARMOR −${card.armorBreak}`,
          position: [bossPos[0], bossPos[1] + 1.6, bossPos[2]],
          color: '#ffb060',
          kind: 'block',
          born: performance.now(),
        });
      }
    } else {
      switch (card.effect) {
        case 'shield': {
          const bonus = card.defense ?? 0;
          players.forEach((p) => {
            if (p.id !== caster?.id) return;
            p.armorBonus = Math.max(p.armorBonus, bonus);
            p.defense = p.baseDefense + p.armorBonus;
          });
          if (caster) caster.animState = 'CAST';
          effects.push({ id: nextId(), kind: 'shield', from: casterPos, to: casterPos, color: '#d8b06a', duration: 1.4 });
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
            const pos = slotPosition(p.slot);
            effects.push({ id: nextId(), kind: 'shield', from: pos, to: pos, color: '#59a6ff', duration: 1.3 });
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
            from: melee ? slotPosition(melee.slot) : casterPos,
            to: bossPos,
            color: '#ff4d4d',
            duration: 1.2,
          });
          playSound('CARD_PLAY');
          break;
        case 'summon':
          bossDamageRaw = card.damage ?? 0;
          if (caster) caster.animState = 'CAST';
          effects.push({
            id: nextId(),
            kind: 'summon',
            from: casterPos,
            to: [casterPos[0] + 1.6, 0.6, casterPos[2] - 0.6],
            color: '#c084fc',
            duration: 1.6,
          });
          newFloats.push({
            id: nextId(),
            text: `-${bossDamageRaw}`,
            position: [bossPos[0], bossPos[1] + 2.4, bossPos[2]],
            color: '#c084fc',
            kind: 'damage',
            born: performance.now(),
          });
          playSound('CARD_PLAY');
          break;
        case 'heal': {
          const amount = card.teamHealing ?? card.healing ?? 0;
          const targets = card.teamHealing
            ? players.filter((p) => p.alive)
            : [players.filter((p) => p.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(
                (p): p is Player => Boolean(p),
              );
          targets.forEach((p) => {
            const before = p.hp;
            p.hp = Math.min(p.maxHp, p.hp + amount);
            if (p.hp !== before) {
              newFloats.push({
                id: nextId(),
                text: `+${p.hp - before} HP`,
                position: [slotPosition(p.slot)[0], 2.6, slotPosition(p.slot)[2]],
                color: '#7ee08a',
                kind: 'heal',
                born: performance.now(),
              });
            }
          });
          if (caster) caster.animState = 'CAST';
          effects.push({ id: nextId(), kind: 'heal', from: casterPos, to: casterPos, color: '#7ee08a', duration: 1.1 });
          playSound('CARD_PLAY');
          break;
        }
        case 'mana_potion':
          newFloats.push({
            id: nextId(),
            text: `+${card.manaRestore} MANA`,
            position: [casterPos[0], casterPos[1] + 2.2, casterPos[2]],
            color: '#59a6ff',
            kind: 'block',
            born: performance.now(),
          });
          playSound('MAGIC_CAST');
          break;
      }
    }

    // Boss armor blunts the hit, but never below a single point of chip damage.
    let bossDealt = 0;
    if (bossDamageRaw > 0) {
      bossDealt = Math.max(1, bossDamageRaw - boss.defense);
    }

    const floats = [...s.floats, ...newFloats];

    if (bossDealt > 0) {
      boss.hp = Math.max(0, boss.hp - bossDealt);
      boss.animState = boss.hp <= 0 ? 'DEFEATED' : 'HIT';
    }

    // Life steal heals the caster for a slice of the damage dealt.
    if (card.effect === 'life_steal' && caster && bossDealt > 0) {
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + (card.healing ?? 0));
      if (caster.hp !== before) {
        floats.push({
          id: nextId(),
          text: `+${caster.hp - before} HP`,
          position: [casterPos[0], casterPos[1] + 2.2, casterPos[2]],
          color: '#7ee08a',
          kind: 'heal',
          born: performance.now(),
        });
      }
    }

    const defeated = boss.hp <= 0;
    const enraged = !defeated && boss.hp / boss.maxHp <= EYE_OF_CTHULHU.enrageThreshold;
    if (enraged && !boss.enraged) {
      boss.enraged = true;
      boss.animState = 'ENRAGED';
      boss.defense = Math.max(boss.defense, ENRAGED_DEFENSE);
      get().addLog(
        `The Eye of Cthulhu is ENRAGED! It gains ${ENRAGED_DEFENSE} armor and hits harder.`,
        'boss',
      );
    }

    set({
      players,
      hand,
      boss,
      discard: [...s.discard, card],
      mana: Math.max(0, s.mana - card.cost + (card.manaRestore ?? 0)),
      effects,
      floats,
      playedThisTurn: [...s.playedThisTurn, card.name],
    });

    get().addLog(`Plays ${card.name}. (${card.cost} Mana)`, 'player');
    if (bossDamageRaw > 0) {
      get().addLog(`${card.name} hits for ${bossDealt}${boss.defense > 0 ? ` (${bossDamageRaw} − ${boss.defense} boss armor)` : ''}.`, 'damage');
    }

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
            { id: nextId(), kind: 'explosion', from: BOSS_WORLD_POS, to: BOSS_WORLD_POS, color: '#ff4d4d', duration: 2 },
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
    const base = (forceCardId ? pool.find((a) => a.id === forceCardId) : undefined) ?? pool[Math.floor(Math.random() * pool.length)];
    const card: BossActionCard = resolveAttackDamage(base, s.bossDamageMultiplier, s.boss.enraged);
    const alive = s.players.filter((p) => p.alive);
    const target = s.players.find((p) => p.taunting && p.alive) ?? alive[0];

    const struck = card.aoe ? alive : target ? [target] : [];
    const effects = [...s.effects];
    struck.forEach((t) => {
      effects.push({
        id: nextId(),
        kind: 'impact',
        from: BOSS_WORLD_POS,
        to: [slotPosition(t.slot)[0], 1.5, slotPosition(t.slot)[2]],
        color: '#ff4d4d',
        duration: 1.1,
      });
    });

    set({
      phase: 'BOSS_ACTION',
      boss: { ...s.boss, intent: card, animState: 'ATTACK' },
      cameraMode: 'ATTACK',
      shake: card.aoe ? 1.2 : 0.9,
      players: s.players.map((p) => (struck.some((t) => t.id === p.id) ? { ...p, animState: 'HIT' } : p)),
      effects,
    });
    playSound('BOSS_ATTACK');
    const who = card.aoe ? 'the whole party' : target?.name ?? 'the party';
    get().addLog(`BOSS ACTION — ${card.name} (${card.damage} damage) targeting ${who}.`, 'boss');
    setTimeout(() => {
      const st = get();
      if (st.phase === 'BOSS_ACTION') set({ boss: { ...st.boss, animState: st.boss.enraged ? 'ENRAGED' : 'IDLE' } });
    }, 900);
  },

  resolvePhase: (overrideTargetId) => {
    const s = get();
    if (s.victory || s.defeat) return;
    const raw = s.boss.intent?.damage ?? 0;
    const aoe = s.boss.intent?.aoe ?? false;

    let targets: Player[];
    if (aoe) {
      targets = s.players.filter((p) => p.alive);
    } else {
      const single =
        s.players.find((p) => p.id === overrideTargetId) ??
        s.players.find((p) => p.taunting && p.alive) ??
        [...s.players].filter((p) => p.alive).sort((a, b) => b.defense - a.defense)[0] ??
        s.players[0];
      targets = single ? [single] : [];
    }

    if (targets.length === 0) {
      set({ phase: 'RESOLUTION', resolutionHits: [] });
      return;
    }

    const hitIds = new Set(targets.map((t) => t.id));
    const hits: ResolutionHit[] = [];
    const newFloats: FloatingNumber[] = [];

    const players: Player[] = s.players.map((p) => {
      if (!hitIds.has(p.id)) {
        return { ...p, taunting: false, animState: 'IDLE' as Player['animState'] };
      }
      const defense = p.defense;
      const final = Math.max(0, raw - defense);
      const hp = Math.max(0, p.hp - final);
      const pos = slotPosition(p.slot);
      hits.push({
        targetId: p.id,
        targetName: p.name,
        raw,
        defense,
        final,
        hpAfter: hp,
        down: hp <= 0,
      });
      newFloats.push(
        final > 0
          ? {
              id: nextId(),
              text: `-${final}`,
              position: [pos[0], 2.8, pos[2]],
              color: '#ff7a7a',
              kind: 'damage',
              born: performance.now(),
            }
          : {
              id: nextId(),
              text: 'BLOCKED',
              position: [pos[0], 2.8, pos[2]],
              color: '#8ad7ff',
              kind: 'block',
              born: performance.now(),
            },
      );
      return {
        ...p,
        hp,
        alive: hp > 0,
        taunting: false,
        animState: (final > 0 ? 'HIT' : 'IDLE') as Player['animState'],
      };
    });

    const primary = hits[0];
    const breakdown: DamageBreakdown = {
      raw,
      defense: primary?.defense ?? 0,
      final: hits.reduce((sum, h) => sum + h.final, 0),
      targetId: primary?.targetId ?? '',
      targetName: aoe ? 'the party' : primary?.targetName ?? 'the party',
    };

    // Blood Drain: the boss heals from the damage it lands.
    let boss = { ...s.boss };
    let bossHealed = 0;
    if (s.boss.intent?.lifesteal && breakdown.final > 0 && boss.hp > 0) {
      const before = boss.hp;
      boss.hp = Math.min(boss.maxHp, boss.hp + s.boss.intent.lifesteal);
      bossHealed = boss.hp - before;
    }

    set({
      phase: 'RESOLUTION',
      players,
      boss,
      damageBreakdown: breakdown,
      resolutionHits: hits,
      cameraMode: 'ATTACK',
      shake: aoe ? 1 : 0.7,
      floats: [...s.floats, ...newFloats],
    });

    if (breakdown.final > 0) playSound('PLAYER_HIT');
    if (aoe) {
      get().addLog(`${raw} DAMAGE swept the party — ${breakdown.final} total after Defense.`, 'damage');
    } else {
      get().addLog(`${raw} DAMAGE − ${breakdown.defense} DEFENSE = ${breakdown.final} DAMAGE to ${breakdown.targetName}.`, 'damage');
    }
    if (bossHealed > 0) {
      get().addLog(`The Eye drinks deep, healing ${bossHealed} HP.`, 'boss');
    }

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
    const stillEnraged = s.boss.enraged && s.boss.hp > 0;
    set({
      turn: s.turn + 1,
      phase: 'DRAW',
      damageBreakdown: null,
      resolutionHits: [],
      playedThisTurn: [],
      cameraMode: 'OVERVIEW',
      boss: {
        ...s.boss,
        intent: null,
        animState: stillEnraged ? 'ENRAGED' : 'IDLE',
        // Boss armor is permanent once it enrages, and clears otherwise.
        defense: stillEnraged ? Math.max(s.boss.defense, ENRAGED_DEFENSE) : 0,
      },
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
    const dealt = Math.max(1, amount - s.boss.defense);
    const hp = Math.max(0, s.boss.hp - dealt);
    const enraged = hp / s.boss.maxHp <= EYE_OF_CTHULHU.enrageThreshold;
    set({
      boss: {
        ...s.boss,
        hp,
        enraged: enraged || s.boss.enraged,
        defense: enraged && !s.boss.enraged ? Math.max(s.boss.defense, ENRAGED_DEFENSE) : s.boss.defense,
        animState: hp <= 0 ? 'DEFEATED' : 'HIT',
      },
      floats: [
        ...s.floats,
        {
          id: nextId(),
          text: `-${dealt}`,
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
            { id: nextId(), kind: 'explosion', from: BOSS_WORLD_POS, to: BOSS_WORLD_POS, color: '#ff4d4d', duration: 2 },
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
    get().damageBoss(6, 'The summoned minion strikes the boss.');
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
