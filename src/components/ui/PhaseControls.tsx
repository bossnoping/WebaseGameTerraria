import { useCallback } from 'react';
import { useGame } from '../../game/GameEngine';

/**
 * Turn controls — the only place that advances the four phases, so the
 * presenter always has exactly one obvious next click.
 */
export default function PhaseControls({ onTurnStarted }: { onTurnStarted: () => void }) {
  const phase = useGame((s) => s.phase);
  const hand = useGame((s) => s.hand);
  const mana = useGame((s) => s.mana);
  const victory = useGame((s) => s.victory);
  const defeat = useGame((s) => s.defeat);
  const drawPhase = useGame((s) => s.drawPhase);
  const beginPlayerAction = useGame((s) => s.beginPlayerAction);
  const beginBossAction = useGame((s) => s.beginBossAction);
  const resolvePhase = useGame((s) => s.resolvePhase);
  const nextTurn = useGame((s) => s.nextTurn);
  const setCamera = useGame((s) => s.setCamera);

  const startNextTurn = useCallback(() => {
    setCamera('BOSS');
    window.setTimeout(() => {
      drawPhase();
      setCamera('OVERVIEW');
    }, 1100);
  }, [drawPhase, setCamera]);

  const restart = useCallback(() => {
    useGame.getState().restartGame();
    onTurnStarted();
  }, [onTurnStarted]);

  const playable = hand.some((c) => c.cost <= mana);

  let label = '';
  let action: (() => void) | null = null;

  if (victory) {
    label = '↻ PLAY AGAIN';
    action = restart;
  } else if (defeat) {
    label = '↻ TRY AGAIN';
    action = restart;
  } else if (phase === 'INTRO') {
    label = '▶ BEGIN TURN 01';
    action = onTurnStarted;
  } else if (phase === 'DRAW') {
    label = `▶ PLAYER ACTION  (${hand.length} cards, ${mana} Mana)`;
    action = () => {
      beginPlayerAction();
      setCamera('PLAYER');
    };
  } else if (phase === 'PLAYER_ACTION') {
    label = '▶ BOSS ACTION';
    action = () => beginBossAction();
  } else if (phase === 'BOSS_ACTION') {
    label = '▶ RESOLUTION';
    action = () => resolvePhase();
  } else if (phase === 'RESOLUTION') {
    label = '▶ NEXT TURN';
    action = () => {
      nextTurn();
      startNextTurn();
    };
  }

  return (
    <div className="phase-controls">
      {phase === 'PLAYER_ACTION' && !playable && (
        <div className="phase-controls__warn">Not enough Mana for any card — continue to the Boss Action.</div>
      )}
      {action && (
        <button type="button" className="btn btn--primary btn--phase" onClick={action}>
          {label}
        </button>
      )}
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => setCamera(phase === 'BOSS_ACTION' || phase === 'RESOLUTION' ? 'ATTACK' : 'BOSS')}
      >
        🎥 Camera
      </button>
    </div>
  );
}
