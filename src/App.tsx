import { useCallback, useEffect, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './scenes/MainMenu';
import HowToPlay from './scenes/HowToPlay';
import DlcScreen from './scenes/DlcScreen';
import PartySelect from './scenes/PartySelect';
import BattleScene from './scenes/BattleScene';
import { useGame } from './game/GameEngine';
import { isMuted, playSound, setMuted, unlockAudio } from './systems/audio';
import type { CharacterClass, Difficulty } from './game/types';

type Screen = 'MENU' | 'HOW_TO_PLAY' | 'DLC' | 'PARTY' | 'BATTLE';

export default function App() {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [muted, setMutedState] = useState(isMuted());
  const phase = useGame((s) => s.phase);

  // Keep the framing sensible while the presenter browses the menus.
  useEffect(() => {
    if (screen !== 'BATTLE') {
      useGame.getState().setCamera('OVERVIEW');
      useGame.getState().endDemo();
    }
  }, [screen]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const startGame = useCallback((classes: CharacterClass[], difficulty: Difficulty) => {
    const g = useGame.getState();
    g.newGame(classes, difficulty);
    g.setPhase('INTRO');
    setScreen('BATTLE');
    playSound('PHASE_CHANGE');
  }, []);

  const startDemo = useCallback(() => {
    useGame.getState().startDemo();
    setScreen('BATTLE');
  }, []);

  const exitToMenu = useCallback(() => {
    const g = useGame.getState();
    g.endDemo();
    g.setPhase('INTRO');
    setScreen('MENU');
  }, []);

  return (
    <div className={`app app--${screen.toLowerCase()}`}>
      <GameCanvas />

      {screen !== 'BATTLE' && (
        <>
          <div className="vignette" />
          <div className="scanlines" />
        </>
      )}

      {screen === 'MENU' && (
        <MainMenu
          onStart={() => setScreen('PARTY')}
          onDemo={startDemo}
          onHowToPlay={() => setScreen('HOW_TO_PLAY')}
          onDlc={() => setScreen('DLC')}
        />
      )}

      {screen === 'PARTY' && <PartySelect onStart={startGame} onBack={() => setScreen('MENU')} />}
      {screen === 'HOW_TO_PLAY' && <HowToPlay onBack={() => setScreen('MENU')} />}
      {screen === 'DLC' && <DlcScreen onBack={() => setScreen('MENU')} />}
      {screen === 'BATTLE' && <BattleScene onExit={exitToMenu} />}

      <div className="topbar">
        <button
          type="button"
          className="btn btn--ghost btn--tiny"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
          }}
          title="Toggle sound"
        >
          {muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}
        </button>
        <span className="topbar__phase">{phase}</span>
      </div>
    </div>
  );
}
