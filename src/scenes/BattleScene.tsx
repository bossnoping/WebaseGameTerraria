import { useCallback, useEffect, useRef } from 'react';
import { useGame } from '../game/GameEngine';
import { useDemoRunner } from '../systems/demoScript';
import { BossHud, DamageFormula, EventLog, PhaseBanner, PlayerHud } from '../components/ui/Hud';
import PhaseControls from '../components/ui/PhaseControls';
import CardHand from '../components/cards/CardHand';
import { CHARACTER_ORDER, CHARACTERS } from '../data/characters';

function DemoOverlay() {
  const demoRunning = useGame((s) => s.demoRunning);
  const caption = useGame((s) => s.demoCaption);
  const sub = useGame((s) => s.demoSub);
  const demoStep = useGame((s) => s.demoStep);

  // Hand control back to the presenter rather than stranding them mid-script.
  const skipToPlay = useCallback(() => {
    const g = useGame.getState();
    g.endDemo();
    g.setDemoCaption('', '');
    g.nextTurn();
    g.drawPhase();
    g.beginPlayerAction();
    g.setCamera('OVERVIEW');
    g.addLog('Demo skipped — you now have control of TURN 02.', 'system');
  }, []);

  if (!demoRunning) return null;

  return (
    <>
      {caption && (
        <div className="demo-caption" key={caption}>
          <div className="demo-caption__main">
            {caption.split('\n').map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
          {sub && <div className="demo-caption__sub">{sub}</div>}
        </div>
      )}
      <div className="demo-progress">
        <span>DEMO · SCENE {demoStep} / 9</span>
        <button type="button" className="btn btn--ghost btn--tiny" onClick={skipToPlay}>
          SKIP DEMO → PLAY
        </button>
      </div>
    </>
  );
}

function ResultOverlay() {
  const victory = useGame((s) => s.victory);
  const defeat = useGame((s) => s.defeat);
  const boss = useGame((s) => s.boss);
  const turn = useGame((s) => s.turn);
  if (!victory && !defeat) return null;

  return (
    <div className={`overlay overlay--result ${victory ? 'overlay--victory' : 'overlay--defeat'}`}>
      <div className="result">
        <div className="result__eyebrow">{victory ? 'THE BLOOD MOON FADES' : 'THE BLOOD MOON ENDURES'}</div>
        <h2 className={`result__title ${victory ? 'result__title--victory' : 'result__title--defeat'}`}>
          {victory ? 'VICTORY' : 'DEFEAT'}
        </h2>
        <p className="result__body">
          {victory
            ? `${boss.name} dissolves into red mist. The village stands, and the guardians earn a night of rest.`
            : 'The guardians have fallen. The Eye of Cthulhu drifts back toward the village.'}
        </p>
        <div className="result__stats">
          <span>Turns: {turn}</span>
          <span>
            Boss HP: {boss.hp} / {boss.maxHp}
          </span>
        </div>
      </div>
    </div>
  );
}

function CharacterRoster() {
  const players = useGame((s) => s.players);
  return (
    <div className="roster-strip">
      {CHARACTER_ORDER.filter((c) => players.some((p) => p.className === c)).map((c) => (
        <span
          key={c}
          className="roster-strip__chip"
          style={{ borderColor: CHARACTERS[c].accent, color: CHARACTERS[c].accent }}
        >
          {CHARACTERS[c].name}
        </span>
      ))}
    </div>
  );
}

export default function BattleScene({ onExit }: { onExit: () => void }) {
  const phase = useGame((s) => s.phase);
  const demoRunning = useGame((s) => s.demoRunning);
  const runId = useGame((s) => s.runId);
  const started = useGame((s) => s.players.length > 0);

  useDemoRunner(demoRunning, runId);

  const introRanFor = useRef<number | null>(null);

  /** Cinematic framing, then deal the opening hand. */
  const beginTurn = useCallback(() => {
    const g = useGame.getState();
    if (g.victory || g.defeat || g.demoRunning) return;
    g.setCamera('BOSS');
    window.setTimeout(() => {
      const s = useGame.getState();
      if (s.victory || s.defeat || s.demoRunning) return;
      if (s.hand.length === 0) s.drawPhase();
      s.setCamera('OVERVIEW');
    }, 1500);
  }, []);

  useEffect(() => {
    if (!started || demoRunning || introRanFor.current === runId) return;
    introRanFor.current = runId;
    beginTurn();
  }, [started, demoRunning, runId, beginTurn]);

  return (
    <div className="battle">
      <BossHud />

      <div className="battle__mid">
        <PhaseBanner />
        <div className="battle__side">
          <EventLog />
        </div>
      </div>

      {started && <CharacterRoster />}

      <div className="battle__bottom">
        <DamageFormula />
        <PlayerHud />
        <CardHand />
        <PhaseControls onTurnStarted={beginTurn} />
      </div>

      <DemoOverlay />
      <ResultOverlay />

      <div className="battle__corner">
        <span className="phase-chip">{phase}</span>
        <button type="button" className="btn btn--ghost btn--tiny" onClick={onExit}>
          ⏏ MENU
        </button>
      </div>
    </div>
  );
}
