import React from 'react';
// Note: Pixi.js integration requires correct setup; using placeholder for now
import { useGameStore } from '../../shared/stores/gameStore';

const GameCanvas: React.FC = () => {
  const { stripIndices, characters } = useGameStore();

  // From ui-dev.md: Media switching logic uses stripIndices
  const opponent = characters.find((char, index) => index !== 0);
  const stripIndex = opponent ? stripIndices[opponent.name] || 1 : 1;

  return (
    <div style={{ width: 400, height: 300, backgroundColor: '#1099bb' }}>
      {/* Placeholder for Pixi.js Stage/Sprite */}
      <img src={`/assets/strip-level-${stripIndex}.png`} alt="Strip visual" style={{ position: 'absolute', left: 150, top: 150 }} />
    </div>
  );
};

export default GameCanvas;
