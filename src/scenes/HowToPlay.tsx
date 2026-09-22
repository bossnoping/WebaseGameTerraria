import { HOW_TO_PLAY } from '../game/phases/phaseConfig';
import { CHARACTER_ORDER, CHARACTERS } from '../data/characters';
import { CARDS } from '../data/cards';

export default function HowToPlay({ onBack }: { onBack: () => void }) {
  return (
    <div className="overlay overlay--panel">
      <div className="panel">
        <h2 className="panel__title">HOW TO PLAY</h2>
        <p className="panel__lead">
          Terraria: Boss Rush is a cooperative card battle. Every turn runs through the same four phases.
        </p>

        <ol className="phase-list">
          {HOW_TO_PLAY.map((p) => (
            <li key={p.step} className="phase-list__item">
              <span className="phase-list__num">{p.step}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="panel__grid">
          <section>
            <h3 className="panel__subtitle">CARD TYPES</h3>
            <ul className="plain-list">
              <li>
                <b>Weapon</b> — deals damage. <em>{CARDS.iron_sword.name}: {CARDS.iron_sword.damage} damage, {CARDS.iron_sword.cost} Mana.</em>
              </li>
              <li>
                <b>Armor</b> — raises Defense until the end of the turn. Only the strongest armor bonus applies.
              </li>
              <li>
                <b>Potion</b> — heals the most wounded ally.
              </li>
              <li>
                <b>Spell</b> — utility: shields, taunts, summons, damage.
              </li>
            </ul>
          </section>
          <section>
            <h3 className="panel__subtitle">GUARDIANS</h3>
            <ul className="plain-list">
              {CHARACTER_ORDER.map((c) => (
                <li key={c}>
                  <b style={{ color: CHARACTERS[c].accent }}>{CHARACTERS[c].name}</b> — {CHARACTERS[c].role}.{' '}
                  <em>{CHARACTERS[c].maxHp} HP</em>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="panel__formula">
          <h3 className="panel__subtitle">DAMAGE RULE</h3>
          <p>
            <code>Boss Damage − Player Defense = Final Damage</code>
          </p>
          <p className="panel__muted">
            Example: 20 Savage Dash − 15 Defense (5 base + 10 Iron Shield) = 5 damage.
          </p>
        </div>

        <button type="button" className="btn btn--primary" onClick={onBack}>
          ← BACK
        </button>
      </div>
    </div>
  );
}
