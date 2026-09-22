import { useGame } from '../game/GameEngine';
import { unlockAudio } from '../systems/audio';

interface Props {
  onStart: () => void;
  onDemo: () => void;
  onHowToPlay: () => void;
  onDlc: () => void;
}

/**
 * Cinematic title screen. Shares the 3D canvas with the battle scene (rendered
 * behind this overlay) so the Blood Moon, village, and boss are always visible.
 */
export default function MainMenu({ onStart, onDemo, onHowToPlay, onDlc }: Props) {
  const startCameraMove = () => {
    const g = useGame.getState();
    g.setCamera('BOSS');
    window.setTimeout(() => g.setCamera('OVERVIEW'), 2600);
  };

  return (
    <div className="overlay overlay--menu">
      <div className="title-block">
        <div className="title-block__eyebrow">FAN-MADE EDUCATIONAL PROTOTYPE · INSPIRED BY TERRARIA</div>
        <h1 className="title-block__title">
          <span>TERRARIA</span>
          <em>BOSS RUSH</em>
        </h1>
        <p className="title-block__sub">A Fan-Made Strategic Card Battle</p>
        <p className="title-block__blurb">
          During an endless Blood Moon, the legendary bosses tear free of their dimensional prisons.
          Build a deck. Hold the line. Defend the village.
        </p>
      </div>

      <div className="menu-actions">
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={() => {
            unlockAudio();
            startCameraMove();
            onStart();
          }}
        >
          ▶ START GAME
        </button>
        <button
          type="button"
          className="btn btn--demo btn--large"
          onClick={() => {
            unlockAudio();
            startCameraMove();
            onDemo();
          }}
        >
          ▶ DEMO MODE
        </button>
        <div className="menu-actions__row">
          <button type="button" className="btn btn--ghost" onClick={onHowToPlay}>
            ❔ HOW TO PLAY
          </button>
          <button type="button" className="btn btn--ghost" onClick={onDlc}>
            📦 FUTURE EXPANSIONS
          </button>
        </div>
      </div>

      <div className="menu-footer">
        <span>WEB · PC · MOBILE · PHYSICAL TABLETOP</span>
        <span className="menu-footer__hint">Tip: press START GAME to play, DEMO MODE for the 2-minute scripted turn.</span>
      </div>
    </div>
  );
}
