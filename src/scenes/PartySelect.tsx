import { useMemo, useState } from 'react';
import { CHARACTER_ORDER, CHARACTERS } from '../data/characters';
import { DIFFICULTIES, scaleBossForParty } from '../data/bosses';
import { buildStartingDeck, handSizeForParty, manaForParty } from '../data/cards';
import type { CharacterClass, Difficulty } from '../game/types';

interface Props {
  onStart: (classes: CharacterClass[], difficulty: Difficulty) => void;
  onBack: () => void;
}

const COUNTS = [1, 2, 3] as const;

/**
 * Party setup: choose how many guardians answer the Blood Moon, pick one unique
 * role per slot, then pick a difficulty. The boss scales with every choice, so
 * the screen previews the resulting fight before the player commits.
 */
export default function PartySelect({ onStart, onBack }: Props) {
  const [count, setCount] = useState(2);
  const [picked, setPicked] = useState<CharacterClass[]>(['melee']);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const chooseCount = (n: number) => {
    setCount(n);
    setPicked((prev) => prev.slice(0, n));
  };

  const toggleClass = (c: CharacterClass) => {
    setPicked((prev) => {
      if (prev.includes(c)) return prev.filter((p) => p !== c);
      if (prev.length >= count) {
        // Replace the oldest choice so a single click always lands.
        return [...prev.slice(1), c];
      }
      return [...prev, c];
    });
  };

  const ready = picked.length === count;

  const preview = useMemo(() => {
    if (!ready) return null;
    const scaled = scaleBossForParty(picked.length, difficulty);
    return {
      hp: scaled.hp,
      dmg: Math.round(scaled.damageMultiplier * 100),
      deck: buildStartingDeck(picked).length,
      hand: handSizeForParty(picked.length),
      mana: manaForParty(picked.length),
    };
  }, [picked, difficulty, ready]);

  return (
    <div className="overlay overlay--panel overlay--party">
      <div className="panel panel--party">
        <div className="party__head">
          <div>
            <h2 className="panel__title">CHOOSE YOUR PARTY</h2>
            <p className="panel__lead">
              How many guardians answer the Blood Moon, and who are they? The Eye of Cthulhu scales to
              match — more heroes mean a longer, more dangerous fight.
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--tiny" onClick={onBack}>
            ← MENU
          </button>
        </div>

        <section className="party__section">
          <h3 className="panel__subtitle">1 · PLAYER COUNT</h3>
          <div className="count-picker">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                className={`count-picker__opt ${count === n ? 'count-picker__opt--on' : ''}`}
                onClick={() => chooseCount(n)}
              >
                <b>{n}</b>
                <span>{n === 1 ? 'solo' : 'guardians'}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="party__section">
          <h3 className="panel__subtitle">
            2 · SELECT ROLES <em className="party__hint">({picked.length} / {count})</em>
          </h3>
          <div className="role-grid">
            {CHARACTER_ORDER.map((c) => {
              const def = CHARACTERS[c];
              const order = picked.indexOf(c);
              const on = order !== -1;
              return (
                <button
                  key={c}
                  type="button"
                  className={`role-card ${on ? 'role-card--on' : ''}`}
                  style={{ '--accent': def.accent } as React.CSSProperties}
                  onClick={() => toggleClass(c)}
                >
                  {on && <span className="role-card__order">{order + 1}</span>}
                  <span className="role-card__icon">{def.icon}</span>
                  <span className="role-card__name">{def.name}</span>
                  <span className="role-card__role">{def.role}</span>
                  <span className="role-card__blurb">{def.blurb}</span>
                  <span className="role-card__abilities">
                    {def.abilities.map((a) => (
                      <em key={a.name}>{a.name}</em>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="party__section">
          <h3 className="panel__subtitle">3 · DIFFICULTY</h3>
          <div className="difficulty-picker">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`difficulty-picker__opt ${difficulty === d ? 'difficulty-picker__opt--on' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                <b>{DIFFICULTIES[d].label}</b>
                <span>{DIFFICULTIES[d].blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="party__footer">
          <div className="party__preview">
            {preview ? (
              <>
                <span>
                  BOSS HP <b>{preview.hp}</b>
                </span>
                <span>
                  BOSS DAMAGE <b>{preview.dmg}%</b>
                </span>
                <span>
                  DECK <b>{preview.deck} cards</b>
                </span>
                <span>
                  HAND <b>{preview.hand}</b> · MANA <b>{preview.mana}</b>
                </span>
              </>
            ) : (
              <span className="party__preview-hint">
                Pick {count - picked.length} more role{count - picked.length === 1 ? '' : 's'} to begin.
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn--primary btn--large"
            disabled={!ready}
            onClick={() => ready && onStart(picked, difficulty)}
          >
            ▶ ENTER THE ARENA
          </button>
        </div>
      </div>
    </div>
  );
}
