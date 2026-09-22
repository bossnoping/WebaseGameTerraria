import { useGame } from '../../game/GameEngine';
import { PHASE_INFO } from '../../game/phases/phaseConfig';
import { CHARACTERS } from '../../data/characters';

function Bar({
  value,
  max,
  color,
  className = '',
}: {
  value: number;
  max: number;
  color: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={`bar ${className}`}>
      <div className="bar__fill" style={{ width: `${pct * 100}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
      <div className="bar__notches" />
    </div>
  );
}

export function BossHud() {
  const boss = useGame((s) => s.boss);
  const setCamera = useGame((s) => s.setCamera);
  const phase = useGame((s) => s.phase);
  const intent = boss.intent;

  return (
    <div className="hud hud--top">
      <div className="hud__row">
        <span className="hud__label">BOSS</span>
        <span className="hud__subtitle">{boss.subtitle}</span>
        {boss.enraged && boss.hp > 0 && <span className="badge badge--enraged">⚡ ENRAGED</span>}
        {boss.hp <= 0 && <span className="badge badge--victory">☠ DEFEATED</span>}
      </div>
      <h2 className="hud__boss-name" onClick={() => setCamera('BOSS')} title="Focus the boss camera">
        {boss.name}
      </h2>
      <Bar value={boss.hp} max={boss.maxHp} color={boss.enraged ? '#ff2020' : '#c02020'} />
      <div className="hud__stats">
        <span>
          HP <b>{boss.hp}</b> / {boss.maxHp}
        </span>
        <span className="hud__sep">•</span>
        <span>
          PHASE <b>{PHASE_INFO[phase]?.title ?? phase}</b>
        </span>
      </div>
      {intent && (phase === 'BOSS_ACTION' || phase === 'RESOLUTION') && (
        <div className="intent-card">
          <div className="intent-card__tag">BOSS CARD</div>
          <div className="intent-card__name">{intent.name}</div>
          <div className="intent-card__dmg">Damage: {intent.damage}</div>
        </div>
      )}
    </div>
  );
}

export function PlayerHud() {
  const players = useGame((s) => s.players);
  const mana = useGame((s) => s.mana);
  const maxMana = useGame((s) => s.maxMana);
  const activePlayerId = useGame((s) => s.activePlayerId);
  const setCamera = useGame((s) => s.setCamera);

  return (
    <div className="hud hud--players">
      {players.map((p) => {
        const def = CHARACTERS[p.className];
        const armor = p.armorBonus;
        return (
          <div
            key={p.id}
            className={`player-card ${p.id === activePlayerId ? 'player-card--active' : ''} ${
              !p.alive ? 'player-card--down' : ''
            }`}
            onClick={() => {
              useGame.setState({ activePlayerId: p.id });
              setCamera('PLAYER');
            }}
          >
            <div className="player-card__head">
              <span className="player-card__dot" style={{ background: def.accent }} />
              <span className="player-card__name">{p.name}</span>
              <span className="player-card__role">{p.role}</span>
            </div>
            <Bar value={p.hp} max={p.maxHp} color={p.alive ? '#57c46a' : '#555'} />
            <div className="player-card__stats">
              <span>
                HP <b>{p.hp}</b>/{p.maxHp}
              </span>
              <span
                className="player-card__def"
                title={`Defense reduces incoming boss damage — ${p.baseDefense} base + ${armor} armor`}
              >
                🛡 {p.defense}
                {armor > 0 && <em> (+{armor})</em>}
              </span>
              {p.taunting && <span className="player-card__taunt">TAUNTING</span>}
              {!p.alive && <span className="player-card__down">DOWN</span>}
            </div>
          </div>
        );
      })}
      <div className="mana">
        <span className="mana__label">MANA</span>
        <div className="mana__pips">
          {Array.from({ length: maxMana }).map((_, i) => (
            <span key={i} className={`mana__pip ${i < mana ? 'mana__pip--on' : ''}`} />
          ))}
        </div>
        <span className="mana__value">
          {mana} / {maxMana}
        </span>
      </div>
    </div>
  );
}

export function PhaseBanner() {
  const phase = useGame((s) => s.phase);
  const turn = useGame((s) => s.turn);
  const info = PHASE_INFO[phase];
  if (!info) return null;

  return (
    <div className="phase-banner" key={`${phase}-${turn}`}>
      <div className="phase-banner__turn">TURN {String(turn).padStart(2, '0')}</div>
      <div className="phase-banner__main">
        <span className="phase-banner__arrow">▶</span>
        <span className="phase-banner__label" style={{ color: info.color }}>
          {info.title}
        </span>
      </div>
      <div className="phase-banner__hint">{info.hint}</div>
      <div className="phase-dots">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`phase-dot ${i === info.index ? 'phase-dot--on' : ''} ${i < info.index ? 'phase-dot--done' : ''}`} />
        ))}
      </div>
    </div>
  );
}

export function DamageFormula() {
  const breakdown = useGame((s) => s.damageBreakdown);
  if (!breakdown) return null;
  return (
    <div className="formula">
      <div className="formula__title">RESOLUTION — {breakdown.targetName}</div>
      <div className="formula__line">
        <span className="formula__num formula__num--dmg">{breakdown.raw} DAMAGE</span>
        <span className="formula__op">−</span>
        <span className="formula__num formula__num--def">{breakdown.defense} DEFENSE</span>
        <span className="formula__op">=</span>
        <span className="formula__num formula__num--final">{breakdown.final} DAMAGE</span>
      </div>
      <div className="formula__note">
        {breakdown.final === 0
          ? `${breakdown.targetName} blocks the attack completely.`
          : `${breakdown.targetName} takes ${breakdown.final} damage.`}
      </div>
    </div>
  );
}

export function EventLog() {
  const log = useGame((s) => s.log);
  return (
    <div className="event-log">
      {log.slice(-5).map((entry) => (
        <div key={entry.id} className={`event-log__line event-log__line--${entry.kind}`}>
          {entry.text}
        </div>
      ))}
    </div>
  );
}
