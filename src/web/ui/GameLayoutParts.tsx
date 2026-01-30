import React, { JSX, useEffect } from 'react';
import styles from './layouts.module.css';
import GameCanvas from './GameCanvas';
import { useGameStore } from '../../shared/stores/gameStore';

const API_BASE = window.location.hostname.includes('devvit.net') ? '/api' : '';

type MediaLayer = {
  src: string;
  alt?: string;
  kind?: 'image' | 'video';
};

type GameTopbarProps = {
  showExitButton?: boolean;
  onExitFullscreen?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export function GameTopbar({ showExitButton, onExitFullscreen }: GameTopbarProps): JSX.Element {
  const { characters, pot, toPot, gameStage, messageQueue, status, currentlyOn } = useGameStore();

  useEffect(() => {
    const stageEl = document.getElementById('stage');
    const potEl = document.getElementById('pot');
    const callAmountEl = document.getElementById('call-amount');
    const systemMessageEl = document.getElementById('system-message');
    const playerNameEl = document.getElementById('player-name');
    const playerMoneyEl = document.getElementById('player-money');
    const opponentNameEl = document.getElementById('opponent-name');
    const opponentMoneyEl = document.getElementById('opponent-money');

    if (stageEl) stageEl.textContent = gameStage || 'not_started';
    if (potEl) potEl.textContent = pot?.toString() || '0';

    // Calculate to call amount for the current player
    let callAmount = 0;
    if (currentlyOn >= 0 && characters[currentlyOn]) {
      callAmount = Math.max(0, toPot - characters[currentlyOn].totalBet);
    }
    if (callAmountEl) callAmountEl.textContent = callAmount.toString();

    if (systemMessageEl) systemMessageEl.textContent = status || messageQueue[0]?.text || '-';
    if (playerNameEl && characters[0]) playerNameEl.textContent = characters[0].name;
    if (playerMoneyEl && characters[0]) playerMoneyEl.textContent = characters[0].money.toString();
    if (opponentNameEl && characters[1]) opponentNameEl.textContent = characters[1].name;
    if (opponentMoneyEl && characters[1]) opponentMoneyEl.textContent = characters[1].money.toString();
  }, [characters, pot, toPot, gameStage, messageQueue, status, currentlyOn]);

  return (
    <div className="topbar">
      <div>
        Stage: <span id="stage"></span>
      </div>
      <div>
        Pot: <span id="pot"></span>
      </div>
      <div>
        To Call: <span id="call-amount"></span>
      </div>
      <div>
        System: <span id="system-message"></span>
      </div>
      {showExitButton && (
        <button
          id="exit-expanded"
          className="exit-expanded"
          type="button"
          aria-label="Exit fullscreen"
          onClick={onExitFullscreen}
        >
          X
        </button>
      )}
      <span id="game-id" style={{ display: 'none' }}>
      </span>
      <div style={{ display: 'none' }}>
        <span id="player-name"></span>
        <span id="player-money"></span>
        <span id="opponent-name"></span>
        <span id="opponent-money"></span>
      </div>
    </div>
  );
}

type GameTableProps = {
  includeHands?: boolean;
  mediaLayers?: MediaLayer[];
};

export function GameHands(): JSX.Element {
  const { characters } = useGameStore();

  useEffect(() => {
    const playerHandEl = document.getElementById('player-hand');
    const opponentHandEl = document.getElementById('opponent-hand');

    if (playerHandEl && characters[0]) {
      playerHandEl.innerHTML = characters[0].cards.map(card => `<img src="/cards/${card.suit}${card.face}.png" alt="${card.face} of ${card.suit}" />`).join('');
    }
    if (opponentHandEl && characters[1]) {
      opponentHandEl.innerHTML = characters[1].cards.map(card => `<img src="/cards/${card.suit}${card.face}.png" alt="${card.face} of ${card.suit}" />`).join('');
    }
  }, [characters]);

  return (
    <div className="hands">
      <div className="hand player">
        <div className="hand-label">Player</div>
        <div id="player-hand" className="cards-row"></div>
      </div>
      <div className="hand opponent">
        <div className="hand-label">Opponent</div>
        <div id="opponent-hand" className="cards-row"></div>
      </div>
    </div>
  );
}

export function GameTable({ includeHands = true, mediaLayers = [] }: GameTableProps): JSX.Element {
  const { characters, pot, toPot, messageQueue, currentlyOn } = useGameStore();

  useEffect(() => {
    const potEl = document.getElementById('pot');
    const callEl = document.getElementById('call-amount');
    const messageLine = document.getElementById('message-line');
    const playerWallet = document.getElementById('player-wallet');
    const opponentWallet = document.getElementById('opponent-wallet');

    if (potEl) potEl.textContent = pot?.toString() || '0';

    // Calculate to call amount for the current player
    let callAmount = 0;
    if (currentlyOn >= 0 && characters[currentlyOn]) {
      callAmount = Math.max(0, toPot - characters[currentlyOn].totalBet);
    }
    if (callEl) callEl.textContent = callAmount.toString();

    if (messageLine) messageLine.textContent = messageQueue[0]?.text || '';
    if (playerWallet && characters[0]) playerWallet.textContent = `$${characters[0].money}`;
    if (opponentWallet && characters[1]) opponentWallet.textContent = `$${characters[1].money}`;
  }, [characters, pot, toPot, messageQueue, currentlyOn]);

  return (
    <div id="table" aria-live="polite">
      <GameCanvas />
      <div id="table-overlay" aria-hidden="true"></div>
      <div className="table-metric table-metric--call" aria-live="polite">
        <span className="label">To Call</span>
        <span id="call-amount">0</span>
      </div>
      <div className="table-metric table-metric--pot" aria-live="polite">
        <span className="money-icon" aria-hidden="true"></span>
        <span className="label">Pot</span>
        <span id="pot">0</span>
      </div>
      {includeHands ? <GameHands /> : null}
      <div id="table-banner" className="banner hidden"></div>
      <div id="message-line" className="message-line"></div>
      <div className="wallet-bar" aria-live="polite">
        <div id="player-wallet" className="wallet player"></div>
        <div className="wallet-actions">
          <button id="rules-button" className="icon-button rules-button" type="button" aria-label="Show rules"></button>
          <button id="settings-button" className="icon-button settings-button" type="button" aria-label="Settings"></button>
        </div>
        <div id="opponent-wallet" className="wallet opponent"></div>
      </div>
    </div>
  );
}

export function GameControls(): JSX.Element {
  const { gameId, updateState } = useGameStore();

  const sendAction = async (action: string) => {
    if (!gameId) return;
    const payload: any = { action };
    if (action === 'bet' || action === 'raise') {
      const betInput = document.getElementById('bet-amount') as HTMLInputElement;
      payload.amount = Number(betInput?.value || 0);
    }
    try {
      const resp = await fetch(`${API_BASE}/games/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      updateState(data.state);
    } catch (err) {
      console.error(err);
    }
  };

  const changeMode = async (mode: string, tie = false) => {
    if (!gameId) return;
    try {
      const resp = await fetch(`${API_BASE}/games/${gameId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, tie }),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      updateState(data.state);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="controls">
      <div className="buttons">
        <div className="bet-row">
          <button data-action="bet" onClick={() => sendAction('bet')}>Bet</button>
          <input id="bet-amount" type="number" min={1} placeholder="Amount" />
        </div>
        <button data-action="raise" onClick={() => sendAction('raise')}>Raise</button>
        <button data-action="stay" onClick={() => sendAction('stay')}>Stay</button>
        <button data-action="call" onClick={() => sendAction('call')}>Call</button>
        <button data-action="fold" onClick={() => sendAction('fold')}>Fold</button>
        <button data-action="drink" onClick={() => sendAction('drink')}>Buy Lady a Drink (50)</button>
      </div>
      <div className="buttons secondary">
        <div className="button-row">
          <button data-mode="change_cards" onClick={() => changeMode('change_cards')}>Draw Cards</button>
          <button id="draw-done" className="ghost hidden" onClick={() => changeMode('draw_done')}>
            Done
          </button>
        </div>
        <button data-mode="showdown" onClick={() => changeMode('showdown')}>Showdown</button>
        <button id="switch-opponent" className="ghost" onClick={() => changeMode('switch_opponent')}>
          Play vs Victoria
        </button>
        <button id="rules-button" className="icon-button rules-button" type="button" aria-label="Show rules"></button>
        <button id="settings-button" className="icon-button settings-button" type="button" aria-label="Settings"></button>
      </div>
    </div>
  );
}

export function GameModals(): JSX.Element {
  return (
    <>
      <div id="resume-modal" className="resume-modal hidden" role="dialog" aria-modal="true">
        <div className="resume-card">
          <h3>Continue game?</h3>
          <p id="resume-line" className="resume-line">
            We found a saved game.
          </p>
          <div className="resume-actions">
            <button id="resume-continue" className="resume-button resume-button--resume" type="button">
              Continue
            </button>
            <button id="resume-new" className="resume-button resume-button--new" type="button">
              Start new
            </button>
          </div>
        </div>
      </div>

      <div id="bet-alert" className="bet-alert hidden" role="alert">
        <div className="bet-alert__message"></div>
      </div>
      <div id="controls-scrim" className="controls-scrim hidden" aria-hidden="true"></div>

      <div id="inventory-modal" className="resume-modal hidden" role="dialog" aria-modal="true">
        <div className="resume-card inventory-card">
          <h3>Inventory</h3>
          <p id="inventory-line" className="resume-line">
            Items remaining: -
          </p>
          <div id="inventory-items" className="inventory-items"></div>
          <div className="resume-actions">
            <button id="inventory-close" className="resume-button resume-button--resume" type="button">
              Close
            </button>
          </div>
        </div>
      </div>

      <div id="showdown-modal" className="showdown-modal hidden" role="dialog" aria-modal="true">
        <div className="showdown-card">
          <h3>Showdown</h3>
          <div className="showdown-hand">
            <div className="showdown-hand__label">
              <span id="showdown-player-name">Player</span>
              <span id="showdown-player-hand" className="showdown-hand__value"></span>
            </div>
            <div id="showdown-player-cards" className="showdown-cards"></div>
          </div>
          <div className="showdown-hand">
            <div className="showdown-hand__label">
              <span id="showdown-opponent-name">Opponent</span>
              <span id="showdown-opponent-hand" className="showdown-hand__value"></span>
            </div>
            <div id="showdown-opponent-cards" className="showdown-cards"></div>
          </div>
          <div className="showdown-summary">
            <div id="showdown-winner-line" className="showdown-summary__winner"></div>
            <div id="showdown-reason-line" className="showdown-summary__reason"></div>
          </div>
          <button id="showdown-proceed" className="ghost">
            Proceed
          </button>
        </div>
      </div>

      <div id="game-over-modal" className="showdown-modal hidden" role="dialog" aria-modal="true">
        <div className="showdown-card game-over-card">
          <h3>Game Over</h3>
          <p className="game-over-line">
            Winner: <span id="game-over-winner">-</span>
          </p>
          <div className="game-over-actions">
            <button id="game-over-new" className="primary">
              Choose New Opponent
            </button>
            <button id="game-over-quit" className="ghost">
              Quit
            </button>
          </div>
        </div>
      </div>

      <div id="hand-modal" className="showdown-modal hand-modal hidden" role="dialog" aria-modal="true">
        <div className="showdown-card hand-modal-card">
          <h3 id="hand-modal-title">Your Hand</h3>
          <p id="hand-modal-message" className="hand-modal-message hidden">
            Select cards to draw.
          </p>
          <div id="hand-modal-cards" className="hand-modal-cards"></div>
          <div className="hand-modal-actions">
            <button id="hand-modal-proceed" className="ghost">
              Proceed
            </button>
            <button id="hand-modal-done" className="primary hidden">
              Done
            </button>
          </div>
        </div>
      </div>

      <div
        id="rules-modal"
        className="rules-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Game rules"
      >
        <div className="rules-card">
          <button id="rules-close" className="ghost rules-close" type="button">
            Close
          </button>
          <img src="assets/rules.jpg" alt="Game rules" />
        </div>
      </div>
    </>
  );
}
