# UI Dev Documentation (Animations, Visuals, Notifiers, Screens)

This document describes the current UI implementation as it exists today.
It maps visual behavior and UI flow to the concrete files in the repo.

Primary files:
- `src/client/game.html` (screen structure)
- `src/client/public/static/styles.css` (visual design + animations)
- `src/client/public/static/app.js` (UI state and event wiring)

## Screens and layout

### 1) Age Gate
File: `src/client/game.html`
- Section id: `#age-gate`
- Purpose: age confirmation before entering the game flow.
- Actions:
  - `#age-yes`: shows opponent selection (`showSection("opponentSelect")`).
  - `#age-no`: shows warning text (`#age-warning`).
- Notifier:
  - `#age-warning` uses `.notice` styling.

### 2) Opponent Select
File: `src/client/game.html`
- Section id: `#opponent-select`
- Opponent list container: `#opponent-grid`
- Start button: `#start-game` (disabled until a card is selected).
- Selection:
  - Card class: `.opponent-card`
  - Active selection state: `.opponent-card.active`
- Visual preview:
  - On selection, media window is updated with the opponent’s first media item.

### 3) Game Screen
File: `src/client/game.html`
- Section id: `#game-area`
- Top bar: `.topbar`
  - Stage: `#stage`
  - Pot: `#pot`
  - To Call: `#call-amount`
  - System message: `#system-message`
  - Switch opponent: `#switch-opponent` (shown on game over)
- Table: `#table`
  - Media window: `#media-window`
  - Hands: `.hand.player` and `.hand.opponent`
  - Banner: `#table-banner`
  - Message strip: `#message-line`
- Controls:
  - Betting actions: `data-action="bet|raise|stay|call|fold"`
  - Draw controls: `data-mode="change_cards"` and `#draw-done`
  - Stage overrides: `data-mode="round_two|showdown|end_round"`

## Visual design system (current CSS)
File: `src/client/public/static/styles.css`

### Base styling
- Root font: `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif`.
- Global background: radial gradient at `20% 20%`, dark blue palette.
- Main panel style: rounded cards with `#0f2234` background and `#1f3a57` border.

### Key color roles
- Primary accent: `#2b83f6` (buttons, borders, highlight)
- Secondary highlight: `#ffc947` (pulse highlight)
- Success/turn: `#4ade80`
- Warning/negative money: `#f87171`
- Table background: layered radial + linear gradient (`#0b1f32` / `#08121f`)

### Layout sizing
- Table area is fixed: `384px x 384px`.
- Controls panel width: `160px`.
- Top bar width: `384px + 160px + 2px` (matches table + controls).
- Hands are positioned absolute within the table.

## Animations and interaction effects

### 1) Pulse border (active input / bet button)
File: `styles.css`
- Class: `.pulse-border`
- Keyframes: `@keyframes pulse-border`
- Triggered in `app.js` when it is the player’s turn.

### 2) Banner pulse
File: `styles.css`
- Selector: `#table-banner.show`
- Keyframes: `@keyframes pulse`
- Triggered by `showBanner(text)` in `app.js`.

### 3) Card selection shift
File: `styles.css`
- Selector: `.poker-card.selected`
- Behavior: `transform: translateX(10px)`
- Triggered by click-to-select during draw phase.

### 4) Button hover elevation
File: `styles.css`
- `button:hover:not(:disabled)` uses a subtle lift and shadow.

## UI notifiers and messaging

### Status chip
File: `game.html` + `app.js`
- `#status-chip` shows connection state:
  - "Not connected" on load
  - "Connected" if `/opponents` is reachable
  - "Playing vs X" once game starts

### System message
- `#system-message` shows the most recent system message from the queue.

### Message line (table overlay)
- `#message-line` shows the most recent AI or system message.
- Prioritizes AI messages when available.

### Banner
- `#table-banner` overlays the table on win / end round / game over:
  - Shows last win message or "Round Complete"
  - Shows "Game Over" on `game_over`

### Hidden log list
File: `app.js`
- `#messages` list is created but hidden; it collects AI dialogue lines.
  This is for debugging and can be surfaced later if needed.

## Data binding: UI state update
File: `src/client/public/static/app.js`
- `renderState(state)` drives all UI updates:
  - Stage, pot, call amount
  - Player/opponent names and money
  - Turn indicator (`>` for active, `--` for inactive)
  - Debt coloring via `.money.negative`
  - Draw selection enable/disable
  - Show/Hide "Done" and "Choose Opponent"
  - Media window updates from `stripIndices` / `stripImages`

### Media switching logic
- Uses `state.stripIndices` to pick opponent media image.
- Falls back to `stripImages` (message-based).
- Falls back to first media item or portrait.

## UI action mapping to API
File: `src/client/public/static/app.js`

### Actions (`data-action`)
- `bet`: POST `/games/:id/action` with `{ action: "bet", amount }`
- `raise`: POST `/games/:id/action` with `{ action: "raise", amount }`
- `stay`: POST `/games/:id/action`
- `call`: POST `/games/:id/action`
- `fold`: POST `/games/:id/action`

### Mode changes (`data-mode`)
- `change_cards`: POST `/games/:id/mode` with `{ mode: "change_cards" }`
- `round_two`: POST `/games/:id/mode` with `{ mode: "round_two" }`
- `showdown`: POST `/games/:id/mode` with `{ mode: "showdown" }`
- `end_round`: POST `/games/:id/mode` with `{ mode: "end_round" }`

### Draw selection ("Done")
- POST `/games/:id/action` with `{ action: "change_cards", indices }`

## Assets used by UI

### Cards
- `src/client/public/cards/*.png`
- Card back image: `/cards/backred.png`

### Opponent media
- `src/client/public/opponents/Vicki/`
  - `Vportrait.png`
  - `V_images/V1.png` through `V6.png`

## Known UI constraints
- Layout is fixed to 384px table width and 160px controls width.
- `#messages` list is hidden by default (debug only).
- No React; UI is a static HTML + JS controller.

## Extension points
- Add a visible log panel: reuse `#messages` or create a new `#log-panel`.
- Add an animation timeline: hook into `showBanner()` and `renderState()`.
- Add per-stage UI overlays: use `state.gameStage` in `renderState()`.
