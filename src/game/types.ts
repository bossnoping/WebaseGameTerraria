export type GamePhase =
  | 'INTRO'
  | 'DRAW'
  | 'PLAYER_ACTION'
  | 'BOSS_ACTION'
  | 'RESOLUTION'
  | 'VICTORY'
  | 'DEFEAT';

export type CardType = 'weapon' | 'armor' | 'potion' | 'spell';

export type CharacterClass = 'melee' | 'mage' | 'summoner' | 'ranged';

export type Difficulty = 'normal' | 'hard' | 'nightmare';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  damage?: number;
  defense?: number;
  healing?: number;
  /** How many times the card hits its target. Defaults to 1. */
  hits?: number;
  /** Restores this much Mana to the pool when played. */
  manaRestore?: number;
  /** Strips this much armor from the boss when played. */
  armorBreak?: number;
  /** Restores this much HP to every living ally when played. */
  teamHealing?: number;
  /** Human readable effect, shown on hover */
  description: string;
  /** Which 3D / audio effect to play when this card resolves */
  effect: CardEffect;
  /** Optional max copies of this card in a starting deck */
  copies?: number;
  /** Which guardian classes carry this card; omitted means every deck. */
  classes?: CharacterClass[];
}

export type CardEffect =
  | 'slash'
  | 'water_bolt'
  | 'fireball'
  | 'dark_bolt'
  | 'volley'
  | 'shield'
  | 'taunt'
  | 'mana_shield'
  | 'summon'
  | 'precision_shot'
  | 'heal'
  | 'life_steal'
  | 'mana_potion'
  | 'armor_break';

export interface Player {
  id: string;
  name: string;
  className: CharacterClass;
  role: string;
  hp: number;
  maxHp: number;
  /** Effective defense for the current turn: baseDefense + armorBonus */
  defense: number;
  /** Class base defense, always applied */
  baseDefense: number;
  /**
   * Highest armor-card bonus active this turn. Bonuses do not stack — the
   * strongest shield wins, which is what keeps the scripted resolution
   * (Iron Shield +10 over Mana Shield +5 = 15 total) correct and readable.
   */
  armorBonus: number;
  alive: boolean;
  /** Boss is forced to target this player while taunted */
  taunting: boolean;
  /** Which player slot in the arena (0, 1 or 2) */
  slot: number;
  animState: PlayerAnimState;
}

export type PlayerAnimState =
  | 'IDLE'
  | 'ATTACK'
  | 'CAST'
  | 'HIT'
  | 'VICTORY'
  | 'DEFEAT';

export type BossAnimState =
  | 'IDLE'
  | 'ATTACK'
  | 'HIT'
  | 'ENRAGED'
  | 'DEFEATED';

export interface BossActionCard {
  id: string;
  name: string;
  damage: number;
  description: string;
  /** Strikes every living guardian instead of a single target. */
  aoe?: boolean;
  /** The boss heals for this much when the attack lands. */
  lifesteal?: number;
}

export interface BossState {
  name: string;
  subtitle: string;
  hp: number;
  maxHp: number;
  defense: number;
  enraged: boolean;
  animState: BossAnimState;
  /** The attack the boss has drawn for the current turn */
  intent: BossActionCard | null;
}

export type CameraMode = 'OVERVIEW' | 'BOSS' | 'PLAYER' | 'ATTACK';

export interface DamageBreakdown {
  raw: number;
  defense: number;
  final: number;
  targetId: string;
  targetName: string;
}

/** One guardian's slice of a boss attack; Resolution may apply several. */
export interface ResolutionHit {
  targetId: string;
  targetName: string;
  raw: number;
  defense: number;
  final: number;
  hpAfter: number;
  down: boolean;
}

export interface LogEntry {
  id: number;
  text: string;
  kind: 'system' | 'player' | 'boss' | 'damage' | 'heal' | 'phase';
}

export interface GameState {
  turn: number;
  phase: GamePhase;

  boss: BossState;
  players: Player[];

  deck: Card[];
  hand: Card[];
  discard: Card[];

  mana: number;
  maxMana: number;
  /** Hand size for the current party; grows with the number of guardians. */
  handSize: number;

  /** id of the player currently acting (Player Action phase is shared in this prototype) */
  activePlayerId: string;

  cameraMode: CameraMode;

  log: LogEntry[];
  damageBreakdown: DamageBreakdown | null;
  /** Every guardian struck by the current resolution, in order. */
  resolutionHits: ResolutionHit[];

  /** Difficulty chosen on the party screen; scales the boss. */
  difficulty: Difficulty;

  /** Cards played this turn, for the resolution summary */
  playedThisTurn: string[];
}

export interface GameEffectEvent {
  id: number;
  kind: 'projectile' | 'slash' | 'shield' | 'taunt' | 'summon' | 'impact' | 'explosion' | 'heal';
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  /** Seconds; renderers use this to self-expire */
  duration: number;
}

export interface FloatingNumber {
  id: number;
  text: string;
  position: [number, number, number];
  color: string;
  kind: 'damage' | 'heal' | 'block' | 'crit';
  born: number;
}
