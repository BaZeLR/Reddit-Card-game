import React, { useEffect } from 'react';

declare global {
  interface Window {
    __pokerLegacyLoaded?: boolean;
  }
}

export function GameShell(): JSX.Element {
  useEffect(() => {
    if (window.__pokerLegacyLoaded) {
      return;
    }
    window.__pokerLegacyLoaded = true;
    const script = document.createElement('script');
    script.src = 'static/app.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <main>
      <noscript>
        <style>{`
          body {
            font-family: Arial, sans-serif;
            color: red;
          }
          .noscript-warning {
            display: block;
            text-align: center;
            margin: 20px;
          }
        `}</style>
        <div className="noscript-warning">JavaScript is required to use this application.</div>
      </noscript>

      <section id="age-gate" className="panel gate">
        <div className="landing-hero">
          <img src="assets/game_logo.png" alt="Poker Lounge logo" />
          <div className="landing-overlay">
            <div className="landing-warning">
              <h2>
                <span className="warning-attention">Attention</span>
                <br />
                <span className="warning-attention">ATTENTION!</span>
              </h2>
              <p className="warning-body">
                This experience is strictly NSFW and intended exclusively for adult audiences.
                What follows contains explicit nudity, depictions of alcohol consumption, deliberately
                profane and non-normative language, as well as various forms of unrestrained, hedonistic
                degeneracy -- all delivered with impeccable grammar and unapologetic theatrical flair.
              </p>
              <p className="warning-body">
                Consider yourself formally warned, you magnificent, consenting degenerate. Proceed only
                if your soul is already comfortably seated in the velvet pit of debauchery.
              </p>
              <div className="cta-row">
                <button id="age-yes" className="age-yes">18+</button>
                <button id="age-no" className="age-no">No</button>
              </div>
              <div id="age-warning" className="notice hidden">You must be 18+ to continue.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="disclaimer" className="panel gate hidden">
        <div className="landing-hero">
          <img src="assets/bg.png" alt="Poker lounge backdrop" />
          <div className="landing-overlay">
            <div className="landing-warning">
              <h2>Disclaimer</h2>
              <p className="warning-body">
                This is a fictional, adult-only experience. All characters are 18+ and any resemblance
                to real persons is coincidental. By continuing, you agree to view mature content and
                consent to this fictional narrative.
              </p>
              <p className="warning-body">
                If this content is illegal in your region or you do not consent, please close the app now.
              </p>
              <div className="cta-row">
                <button id="disclaimer-continue" className="age-yes">Continue</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="intro-word" className="panel gate hidden">
        <div className="landing-hero">
          <img src="assets/rpg_message_bg.jpg" alt="Intro scene" />
          <div className="landing-overlay">
            <div className="landing-warning">
              <h2>Intro</h2>
              <p className="warning-body">
                Welcome to Poker Lounge. Tonight, the lights are low, the stakes are high, and
                Victoria is already waiting at the table.
              </p>
              <p className="warning-body">
                Take a breath. The prologue begins in the next screen.
              </p>
              <div className="cta-row">
                <button id="intro-word-continue" className="age-yes">Enter</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="age-exit-modal" className="showdown-modal hidden" role="dialog" aria-modal="true">
        <div className="showdown-card game-over-card">
          <h3>So long</h3>
          <p className="game-over-line">Access blocked. Please close this tab to exit.</p>
        </div>
      </div>

      <div id="resume-modal" className="resume-modal hidden" role="dialog" aria-modal="true">
        <div className="resume-card">
          <h3>Welcome back</h3>
          <p className="resume-line">We found a saved game. Resume or start fresh?</p>
          <div className="resume-actions">
            <button id="resume-game" className="resume-button resume-button--resume" type="button">
              Resume game
            </button>
            <button id="new-game" className="resume-button resume-button--new" type="button">
              Start new game
            </button>
          </div>
        </div>
      </div>

      <div id="inventory-modal" className="resume-modal hidden" role="dialog" aria-modal="true">
        <div className="resume-card inventory-card">
          <h3>Inventory</h3>
          <p id="inventory-line" className="resume-line">Items remaining: -</p>
          <div id="inventory-items" className="inventory-items"></div>
          <div className="resume-actions">
            <button id="inventory-close" className="resume-button resume-button--resume" type="button">
              Close
            </button>
          </div>
        </div>
      </div>

      <section id="opponent-select" className="panel hidden">
        <div className="panel-heading">
          <div>
            <h2 className="opponent-title">Select Your Opponent</h2>
            <p>Pick a challenger to load their portrait and behaviour.</p>
            <label className="player-name-field">
              <span>Player name</span>
              <input id="player-name-input" type="text" placeholder="Player" maxLength={24} />
            </label>
          </div>
          <button id="start-game" className="primary" disabled>Start</button>
        </div>
        <div id="opponent-grid" className="opponent-grid"></div>
      </section>

      <section id="game-area" className="panel hidden">
        <div className="topbar">
          <div>Stage: <span id="stage">not_started</span></div>
          <div>System: <span id="system-message">-</span></div>
          <div id="status-chip" className="status-chip">Not connected</div>
          <span id="game-id" style={{ display: 'none' }}>-</span>
          <div style={{ display: 'none' }}>
            <span id="player-name"></span>
            <span id="player-money"></span>
            <span id="opponent-name"></span>
            <span id="opponent-money"></span>
          </div>
        </div>

        <div className="layout">
          <div className="table-wrapper">
            <div id="table" aria-live="polite">
              <div id="media-window"></div>
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
              <div id="table-banner" className="banner hidden"></div>
              <div id="message-line" className="message-line"></div>
              <div id="intro-sequence" className="intro-sequence hidden" aria-live="polite">
                <div id="intro-sequence-text" className="intro-sequence__text"></div>
                <button id="intro-sequence-continue" className="primary" type="button">
                  Continue
                </button>
              </div>
              <div className="wallet-bar" aria-live="polite">
                <div id="player-wallet" className="wallet player"></div>
                <div className="wallet-actions">
                  <button
                    id="rules-button"
                    className="icon-button rules-button"
                    type="button"
                    aria-label="Show rules"
                  ></button>
                  <button
                    id="settings-button"
                    className="icon-button settings-button"
                    type="button"
                    aria-label="Settings"
                  ></button>
                  <button
                    id="mobile-actions-button"
                    className="icon-button mobile-actions-button"
                    type="button"
                    aria-label="Show actions"
                  ></button>
                </div>
                <div id="opponent-wallet" className="wallet opponent"></div>
              </div>
              <div id="settings-panel" className="settings-panel hidden" role="dialog" aria-label="Settings">
                <div className="settings-title">Settings</div>
                <button id="sound-toggle" className="settings-toggle sound-toggle" type="button">
                  <span className="btn-icon btn-icon--sound" aria-hidden="true"></span>
                  <span className="sound-label">Sound: On</span>
                </button>
                <button id="settings-save" className="settings-toggle settings-action" type="button">
                  <span className="btn-icon btn-icon--save" aria-hidden="true"></span>
                  Save game
                </button>
                <button id="settings-load" className="settings-toggle settings-action" type="button">
                  <span className="btn-icon btn-icon--load" aria-hidden="true"></span>
                  Load game
                </button>
                <button id="settings-inventory" className="settings-toggle settings-action" type="button">
                  <span className="btn-icon btn-icon--inventory" aria-hidden="true"></span>
                  Player inventory
                </button>
                <button id="settings-quit" className="settings-toggle settings-action" type="button">
                  Quit game
                </button>
              </div>
            </div>
          </div>

          <div className="controls">
            <div className="buttons">
              <div className="bet-row">
                <button data-action="bet">Bet</button>
                <input id="bet-amount" type="number" min={1} placeholder="Amount" />
              </div>
              <button data-action="raise">Raise</button>
              <button data-action="stay">Stay</button>
              <button data-action="call">Call</button>
              <button data-action="fold">Fold</button>
              <button data-action="drink">Buy Lady a Drink (50)</button>
            </div>
            <div className="buttons secondary">
              <div className="button-row">
                <button data-mode="change_cards">Draw Cards</button>
                <button id="draw-done" className="ghost hidden">Done</button>
              </div>
              <button data-mode="showdown">Showdown</button>
              <button id="switch-opponent" className="ghost">Play vs Victoria</button>
            </div>
          </div>
        </div>

        <div id="bet-alert" className="bet-alert hidden" role="alert">
          <div className="bet-alert__message"></div>
        </div>
        <div id="controls-scrim" className="controls-scrim hidden" aria-hidden="true"></div>

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
            <button id="showdown-proceed" className="ghost">Proceed</button>
          </div>
        </div>

        <div id="game-over-modal" className="showdown-modal hidden" role="dialog" aria-modal="true">
          <div className="showdown-card game-over-card">
            <h3>Game Over</h3>
            <p className="game-over-line">
              Winner: <span id="game-over-winner">-</span>
            </p>
            <div className="game-over-actions">
              <button id="game-over-new" className="primary">Choose New Opponent</button>
              <button id="game-over-quit" className="ghost">Quit</button>
            </div>
          </div>
        </div>

        <div id="hand-modal" className="showdown-modal hand-modal hidden" role="dialog" aria-modal="true">
          <div className="showdown-card hand-modal-card">
            <h3 id="hand-modal-title">Your Hand</h3>
            <p id="hand-modal-message" className="hand-modal-message hidden">Select cards to draw.</p>
            <div id="hand-modal-cards" className="hand-modal-cards"></div>
            <div className="hand-modal-actions">
              <button id="hand-modal-proceed" className="ghost">Proceed</button>
              <button id="hand-modal-done" className="primary hidden">Done</button>
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
            <button id="rules-close" className="ghost rules-close" type="button">Close</button>
            <img src="assets/rules.jpg" alt="Game rules" />
          </div>
        </div>
      </section>
    </main>
  );
}
