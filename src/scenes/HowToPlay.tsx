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
        <p className="panel__muted">
          Bring 1–3 guardians and pick each role. The party shares one hand and one Mana pool, so both
          grow with the party — 5 cards and 4 Mana solo, up to 9 cards and 6 Mana for three. The Eye
          scales too: every extra guardian adds HP, and HARD/NIGHTMARE add more HP and damage.
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
                <b>Armor</b> — raises Defense. Only the strongest armor bonus applies.
              </li>
              <li>
                <b>Potion</b> — heals the most wounded ally, or restores Mana.
              </li>
              <li>
                <b>Spell</b> — utility: shields, taunts, summons, burn, lifesteal.
              </li>
            </ul>
            <p className="panel__muted">
              Boss armor blunts every hit, but a card always chips for at least 1. Shield Shatter strips
              armor before it lands.
            </p>
          </section>
          <section>
            <h3 className="panel__subtitle">GUARDIANS</h3>
            <ul className="plain-list">
              {CHARACTER_ORDER.map((c) => (
                <li key={c}>
                  <b style={{ color: CHARACTERS[c].accent }}>
                    {CHARACTERS[c].icon} {CHARACTERS[c].name}
                  </b>{' '}
                  — {CHARACTERS[c].role}. <em>{CHARACTERS[c].maxHp} HP</em>
                  <br />
                  <span className="panel__muted">{CHARACTERS[c].abilities.map((a) => a.name).join(' · ')}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="panel__grid">
          <section>
            <h3 className="panel__subtitle">READ THE BOSS</h3>
            <p className="panel__muted">
              From the Draw phase the boss card shows its incoming attack. Taunt it onto your tank, or
              stack Defense before it lands. Watch for <b>AOE</b> sweeps that hit everyone, and Blood
              Drain, which heals the boss.
            </p>
          </section>
          <section>
            <h3 className="panel__subtitle">ENRAGE</h3>
            <p className="panel__muted">
              Below 40% HP the Eye enrages: it gains permanent armor and every attack hits harder. Save
              Shield Shatter and burst damage for the finish.
            </p>
          </section>
        </div>

        <div className="panel__formula">
          <h3 className="panel__subtitle">DAMAGE RULES</h3>
          <p>
            <code>Boss Damage − Player Defense = Final Damage</code>
          </p>
          <p>
            <code>Card Damage − Boss Armor = Damage Dealt (minimum 1)</code>
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
