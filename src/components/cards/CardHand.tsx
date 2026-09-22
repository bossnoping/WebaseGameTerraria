import { useCallback, useRef, useState } from 'react';
import { useGame } from '../../game/GameEngine';
import { playSound } from '../../systems/audio';
import type { Card } from '../../game/types';

const TYPE_META: Record<Card['type'], { label: string; icon: string; color: string }> = {
  weapon: { label: 'WEAPON', icon: '⚔', color: '#e0a24a' },
  armor: { label: 'ARMOR', icon: '🛡', color: '#7fa8d8' },
  potion: { label: 'POTION', icon: '🧪', color: '#6ec46e' },
  spell: { label: 'SPELL', icon: '✨', color: '#b47ce0' },
};

function CardFace({ card }: { card: Card }) {
  const meta = TYPE_META[card.type];
  const stats: string[] = [];
  if (card.damage) stats.push(`DMG ${card.damage}`);
  if (card.defense) stats.push(`DEF +${card.defense}`);
  if (card.healing) stats.push(`HEAL +${card.healing}`);

  return (
    <>
      <div className="card__glow" style={{ background: meta.color }} />
      <div className="card__frame" style={{ borderColor: meta.color }}>
        <div className="card__header">
          <span className="card__type" style={{ color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          <span className="card__cost">{card.cost}</span>
        </div>
        <div className="card__art" style={{ background: `radial-gradient(circle at 50% 40%, ${meta.color}55, transparent 68%)` }}>
          <span className="card__art-icon">{meta.icon}</span>
        </div>
        <div className="card__name">{card.name}</div>
        {stats.length > 0 && <div className="card__stats">{stats.join(' · ')}</div>}
        <div className="card__desc">{card.description}</div>
        <div className="card__ribbon" style={{ background: meta.color }} />
      </div>
    </>
  );
}

function CardView({
  card,
  index,
  disabled,
  onPlay,
}: {
  card: Card;
  index: number;
  disabled: boolean;
  onPlay: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const mana = useGame((s) => s.mana);
  const affordable = mana >= card.cost;

  const handleMove = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--rx', `${-py * 18}deg`);
    el.style.setProperty('--ry', `${px * 22}deg`);
  }, []);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className={`card ${hovered ? 'card--hover' : ''} ${!affordable || disabled ? 'card--dim' : ''}`}
      style={{ '--i': index } as React.CSSProperties}
      onMouseEnter={() => {
        setHovered(true);
        playSound('CARD_SELECT');
      }}
      onMouseLeave={() => {
        setHovered(false);
        reset();
      }}
      onMouseMove={handleMove}
      onPointerMove={handleMove}
      onBlur={reset}
      onClick={() => {
        if (disabled) return;
        onPlay();
      }}
      disabled={disabled}
      aria-label={`${card.name}, ${card.cost} mana. ${card.description}`}
    >
      <CardFace card={card} />
      {(hovered || !affordable) && (
        <div className="card__tooltip">
          <b>{card.name}</b>
          <span>
            Cost {card.cost} Mana{!affordable ? ' — not enough Mana' : ''}
          </span>
          <span>{card.description}</span>
        </div>
      )}
    </button>
  );
}

export default function CardHand() {
  const hand = useGame((s) => s.hand);
  const phase = useGame((s) => s.phase);
  const playCard = useGame((s) => s.playCard);
  const demoRunning = useGame((s) => s.demoRunning);
  const victory = useGame((s) => s.victory);
  const defeat = useGame((s) => s.defeat);

  const locked = phase !== 'PLAYER_ACTION' || demoRunning || victory || defeat;

  return (
    <div className="hand" role="group" aria-label="Card hand">
      <div className="hand__row">
        {hand.length === 0 && <div className="hand__empty">No cards in hand — the Draw phase will deal them.</div>}
        {hand.map((card, i) => (
          <CardView
            key={`${card.id}-${i}`}
            card={card}
            index={i}
            disabled={locked}
            onPlay={() => {
              playSound('CARD_PLAY');
              playCard(card.id, i);
            }}
          />
        ))}
      </div>
      {locked && hand.length > 0 && (
        <div className="hand__locked">
          {demoRunning ? 'Demo is running — sit back and watch.' : `Cards unlock during PLAYER ACTION (now: ${phase}).`}
        </div>
      )}
    </div>
  );
}
