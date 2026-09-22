export default function DlcScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="overlay overlay--panel">
      <div className="panel">
        <h2 className="panel__title">FUTURE EXPANSIONS</h2>
        <p className="panel__lead">
          Presentation content — these expansions are not playable in this prototype.
        </p>

        <div className="dlc-grid">
          <article className="dlc-card dlc-card--hardmode">
            <header>
              <span className="dlc-card__tag">DLC 1</span>
              <h3>The Hardmode Expansion</h3>
            </header>
            <ul className="plain-list">
              <li>New Weapons</li>
              <li>New Armor</li>
              <li>Mechanical Bosses</li>
            </ul>
            <div className="dlc-card__bosses">
              <span>The Twins</span>
              <span>Skeletron Prime</span>
            </div>
          </article>

          <article className="dlc-card dlc-card--lunar">
            <header>
              <span className="dlc-card__tag">DLC 2</span>
              <h3>Lunar Awakening</h3>
            </header>
            <ul className="plain-list">
              <li>Final Campaign</li>
              <li>Celestial Fragments</li>
              <li>Endgame Deck Building</li>
            </ul>
            <div className="dlc-card__bosses dlc-card__bosses--final">
              <span>MOON LORD</span>
            </div>
          </article>
        </div>

        <div className="panel__platforms">
          <span>WEB</span>
          <span>PC</span>
          <span>MOBILE</span>
          <span>PHYSICAL TABLETOP</span>
        </div>

        <button type="button" className="btn btn--primary" onClick={onBack}>
          ← BACK
        </button>
      </div>
    </div>
  );
}
