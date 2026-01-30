# Poker Game Flow and Code Map

This document describes the current game logic as implemented in the codebase.
It is not a theoretical spec; it reflects what the code does today.

Files covered:
- `src/server/core/gameManager.ts`
- `src/server/core/StandardCharacter.ts`
- `src/server/core/basicUtils.ts`
- `src/server/core/opponents/Vicki/Opponent.ts`
- `src/server/index.ts`
- `src/server/local.ts`
- `src/client/public/static/app.js`
- `src/server/core/logger.ts`

## Core classes and data model

### GameStage enum (game state machine)
Defined in `src/server/core/gameManager.ts`:
- `NOT_STARTED`
- `START_ROUND`
- `BET_AND_STAY` (first betting round)
- `RAISE_AND_CALL` (first round variant when `rules === 1`)
- `BET_AND_CALL` (second betting round)
- `CHANGE_CARDS` (draw phase)
- `ROUND_TWO` (transitional stage to second round)
- `SHOWDOWN`
- `END_ROUND`
- `GAME_OVER`

### GameManager
Defined in `src/server/core/gameManager.ts`.
Holds all game state and executes game logic.

Key fields:
- `setMoney`: starting money per player (default 200).
- `setMax`: max bet allowed in a single action (defaults to `setMoney`).
- `currency`: currency string (default `$`).
- `rules`: poker rule variant (0 or 1).
- `ante`: ante per round (default 5).
- `characters`: array of `Player` objects.
- `playerVar`: index of the human player in `characters` (default 0).
- `isChar`: if the human is also a "character" (affects strip logic).
- `pot`: total pot for the current hand.
- `toPot`: current call amount for the active player.
- `lastPot`: previous pot amount (used in AI logic).
- `baseBetCap`: bet cap computed from settings.
- `betCap`: current bet cap (half at round start, doubled in round two).
- `numStayed`: count of players that have stayed/called/folded this round.
- `allStay`: tracks if all actions are stays/calls (no bets/raises).
- `calls`: list of players who called (tracks "call" actions).
- `out`: list of folded players in the current round.
- `lost`: list of eliminated players (game over).
- `dealer`: dealer index.
- `currentlyOn`: active player index.
- `gameStage`: current stage (`GameStage`).
- `messageDisplay`: message queue (system + AI dialog).
- `deck`: current `Deck` instance (or null).
- `stripImages`: map of player name -> message image text.
- `stripIndices`: map of player name -> 1-based strip step.
- `debtNotified`: map of player name -> last debt value announced.
- `cardFolder`, `debug`: misc flags.

### Player
Defined in `src/server/core/gameManager.ts`.
- `AI`: an instance of `Character` (or subclass).
- `maxTries`: max strip steps before game over.

### Character
Defined in `src/server/core/StandardCharacter.ts`.
This holds AI behavior, messages, and game decision logic.

Key fields:
- `name`, `portrait`, `images`, message arrays (bet/call/fold/etc).
- `cards`: `Hand`.
- `lastBet`, `money`, `owed`, `totalBet`, `onTry`, `folded`.

### Message
Defined in `src/server/core/basicUtils.ts`.
Used for AI dialog and system actions:
- `name`, `text`
- `assoc_action`: action list (e.g. `["bet"]`, `["stay"]`).
- `stored_vars`: additional data (e.g. `betAmt`, `stripIndex`).
- `type`, `tags` (used by `respondToMsg`).

### Deck / Hand / Card
Defined in `src/server/core/basicUtils.ts`.
- `Deck.pullCard()` draws a random card and removes it.
- `Hand.addCard()`, `Hand.flipCard()`, `Hand.organize()`.

## Game flow: step-by-step

### 1) Game creation
Code path:
- Local: `src/server/local.ts` -> `POST /games`
- Devvit: `src/server/index.ts` -> `POST /games`
- Builds AI players, resolves `maxTries`, and constructs `GameManager`.

Important:
- `maxTries` now resolves to the number of `imageMessages` for the AI
  (Vicki has 6), unless overridden by request config.

### 2) Start round
Entry points:
- `GameManager.change_mode("start_round")` -> `start_round()`

Key actions in `start_round()`:
- Reset pot and per-round counters (`pot`, `toPot`, `lastPot`, `calls`, `out`, `numStayed`, `allStay`).
- Determine dealer and starting player (`dealer`, `currentlyOn`).
- Reset each player for the round (`Player.reset_for_round()`).
- Shuffle deck: `_deal_new_deck()`.
- Deal 5 cards to each player: `_deal_cards()`.
- Post antes: `money -= ante`, `checkDebt()`, `_maybe_queue_debt_message()`, `_handle_debt_strip()`.
- Set stage to `BET_AND_STAY`.
- Queue message: "New round started".
- Auto-act AI if AI is first (`_auto_act_if_ai()`).

UI details:
- The UI uses `currentlyOn` to show turn indicator:
  `>` for the active player, `--` for inactive.

### 3) First betting round (BET_AND_STAY)
Actions:
- `bet`, `call`, `stay`, `fold`
Entry point: `GameManager.poker_action()`.

Behavior:
- `bet`: increases `totalBet` and pot, adjusts `betCap`, resets `allStay`.
- `call`: pays `callOwed` and increments `numStayed`.
- `stay`: if `callOwed > 0` it will call; otherwise it increments `numStayed`.
- `fold`: marks player folded and ends the round if only one remains.

Round completion:
- When `numStayed >= out.length + activePlayers`, `_maybe_advance_after_resolution()`
  moves to `CHANGE_CARDS`, or to `SHOWDOWN` if `allStay` is true.

Notes:
- There is no explicit "max 3 bets per player" limit in current code.

### 4) Draw phase (CHANGE_CARDS)
Entry point:
- `change_mode("change_cards")` -> `_handle_draw_phase()`.

AI behavior:
- AI calls `processCards()` to pick indices to swap.
- Cards are flipped via `Hand.flipCard()`.
- AI message emitted via `handleMsg("new_cards")` or `handleMsg("hold_cards")`.

Player behavior:
- UI enables selection of cards and sends `action: "change_cards"`.
- Server handles via `_action_change_cards()`.

After player draws:
- Stage changes to `ROUND_TWO`, then immediately to `BET_AND_CALL`.
- Message queued: "Second betting round".

### 5) Second betting round (BET_AND_CALL)
Similar to the first round, but:
- `betCap` is doubled in `change_mode("round_two")`.
- `stay` resolves to `call` if a call is owed.

### 6) Showdown / End of round
Entry points:
- `change_mode("showdown")`
- `change_mode("end_round")`
- Fold-win path in `_action_fold()` now also sets `END_ROUND` (no auto-start).

Showdown flow (`_handle_showdown()`):
- Each active player sends `showdown()` message (AI reveal message).
- Winner(s) chosen via `_pick_winners()` (kicker-aware logic).
- Winner messages include both pot size and net gain (opponent total bets).
- Winners receive only the net gain (opponent total bets), not their own bets.
- Post-round strip checks via `_handle_post_round_images()`.
- Stage set to `END_ROUND` (not to `START_ROUND` automatically).
- Standard ties split the pot evenly; any odd chip goes to the first tied
  player after the dealer. Tie rounds do not trigger strip checks.

UI:
- A showdown modal appears at `END_ROUND` showing both hands and hand names.
- "Proceed" in the modal triggers `change_mode("start_round")`.
  - Hand names now come from `Character.describeHand()` for specificity
    (e.g., "Pair of Kings", "Two Pair, Kings and Sevens", "Royal Flush").

### 7) Debt and strip logic
Key variables:
- `money` goes negative if bets exceed cash.
- `owed` accumulates negative debt.
- `onTry` counts how many strip steps have happened.
- `maxTries` ends the match when reached.

Debt flow:
- `Character.checkDebt()` moves negative `money` into `owed`, then sets `money = 0`.
- `GameManager._handle_debt_strip()` is called after ante/bet/call.
  It triggers `Character.handleDebt()` with `loanAmount = 100`.

Immediate strip/loan logic in `handleDebt()`:
- While `onTry` is below the required strip count for the current debt:
  - Increment `onTry`.
  - Emit a `strip` message for that step.
  - If `onTry == maxTries`, emit a `game_over` message.
- After resolution, `money = (onTry * loanAmount) + owed`.
  Example: if debt was -5 and onTry=1, money becomes 95.

Post-round strip logic:
- `_handle_post_round_images()` uses `Character.checkImage()`
  when money <= 0 and the player lost the hand.
- Winning net gain reduces `owed`. Every full 100 of debt cleared
  reduces `onTry` by one and updates the strip image.

### 8) Game over
- `GameStage.GAME_OVER` is set when a player reaches `maxTries`
  (or `checkImage()` returns `game_over`).
- UI displays the "Choose Opponent" button.

## UI behavior (client)
File: `src/client/public/static/app.js`

Key functions:
- `createAndStartGame()`: POST `/games`, then `changeMode("start_round")`.
- `renderState(state)`: updates UI, hands, labels, media, and messages.
- `sendAction(action)`: POST `/games/:id/action`.
- `sendChangeCards()`: POST `/games/:id/action` with `change_cards`.
- `changeMode(mode)`: POST `/games/:id/mode`.
- `playNewRoundVideo()`: plays a random `newRoundVids` MP4 during `start_round`.
- `setControlsOpen(open)`: toggles the mobile action drawer and scrim.
- `openRulesModal()` / `closeRulesModal()`: show or hide the rules image overlay.

Turn indicators:
- `>` shows on the active player name (`currentlyOn`).
- `--` shows on inactive players.

Draw phase UI:
- "Draw" button moves to `CHANGE_CARDS`.
- Cards can be clicked to toggle selection (shift right).
- "Done" sends `change_cards`.

Rules UI:
- A red "rules" button opens a modal with `/assets/rules.jpg`.
- Click close or outside the modal to dismiss.

Mobile controls drawer:
- On small screens (`max-width: 720px`), the action buttons drawer is hidden.
- A turquoise button appears between wallets; it pulses until pressed.
- Pressing it slides the action buttons panel in from the right and shows a scrim.

End-of-round pacing:
- On fold or showdown, the game pauses at `END_ROUND`.
- The modal shows both hands and hand names; player must click "Proceed".
- The next round then shows system messages in order:
  "New round started" -> "Dealer: <name>" -> "Shuffling cards" -> "Dealing cards" -> "Place your bets".

Media updates:
- Background image uses `stripIndices` to select the correct media image.
- Index is 1-based in state; UI clamps to array length.
- `newRoundVids` MP4s render in the media window during the start-round message.

## Logging
File: `src/server/core/logger.ts`
- Logs JSON lines to `logs/game.log`.
- `GameManager._log()` adds full snapshot context.
- Logged events include: `game_init`, `start_round`, `bet`, `call`, `stay`,
  `fold`, `win`, `debt`, `strip_*`, `shuffle_deck`, `deal_cards`,
  `round_two`, `showdown`, `end_round`, `game_over`, `ai_decision`.

## Function map (game logic)

### `src/server/core/gameManager.ts`
- `constructor(...)`: initializes settings and state.
- `_snapshot()`: returns current state snapshot for logging.
- `_log(event, data)`: writes to log with snapshot data.
- `queue_message(text, assoc_action, tags, name)`: queue system message.
- `_queue_ai_message(msg)`: queue AI message.
- `_queue_responses(speaker, tags)`: ask other AI to respond to tags.
- `_record_strip_image(player, stripIndex)`: store strip message/index.
- `_apply_game_over(player)`: mark player lost and game over if needed.
- `next_message()`: pop next queued message.
- `_advance_player()`: rotate `currentlyOn`.
- `_active_players()`: active (not folded or lost).
- `_recalculate_call_owed()`: updates `callOwed` for all players.
- `_deal_new_deck()`: new deck.
- `_deal_cards()`: 5-card deal.
- `state()`: returns `GameState` payload for UI/API.
- `start_round()`: resets round and deals.
- `change_mode(mode, tie)`: stage transitions.
- `poker_action(action, amount, indices)`: handles actions.
- `_action_bet(player, amount)`: bet logic.
- `_action_call(player)`: call logic.
- `_action_stay(player)`: stay/call logic.
- `_action_fold(player)`: fold logic and immediate win if only one remains.
- `_handle_debt_strip(player)`: immediate strip/loan logic.
- `_maybe_queue_debt_message(player)`: debt message.
- `_maybe_advance_after_resolution()`: stage transitions after actions.
- `_handle_draw_phase()`: AI draw phase.
- `_action_change_cards(player, indices)`: player draw phase.
- `_handle_showdown(tie)`: reveal + winner + payout.
- `_handle_post_round_images(winnerIdx)`: strip logic after round.
- `_hand_score(cards)`: score with kickers.
- `_compare_scores(a, b)`: compare hand scores.
- `_pick_winners()`: return all winners (ties included).
- `_odd_chip_winner(winners)`: choose who gets odd chip in a split pot.
- `_apply_net_gain(player, netGain)`: apply opponent-net winnings and reduce debt/strip.
- `_pick_winner()`: choose best active player.
- `_auto_act_if_ai()`: run AI move when AI turn.

### `src/server/core/StandardCharacter.ts`
- `bet(betAmt, toPot)`: apply bet and debt check.
- `checkDebt()`: convert negative money into `owed`.
- `processCards()`: AI draw strategy.
- `processResponse(...)`: AI decision logic (bet/stay/call/fold).
- `showdown()`: AI reveal message.
- `checkImage(isChar, tries, winner, playerName, setMoney)`: post-round strip logic.
- `handleDebt(isChar, tries, playerName, loanAmount)`: immediate strip/loan logic.
- `respondToMsg(name, tags, lost)`: AI reactions to tags.
- `handleMsg(type, format, extraTags, s_vars)`: build `Message`.
- `cleanCards()`: reset hand.
- `checkHand(cards)`: evaluate hand rank (used in AI decision logic).
- `describeHand(cards)`: human-readable hand label used in the showdown UI.

### `src/server/core/basicUtils.ts`
- `Message`: AI/system message object.
- `debug(log, reason)`: debug logger.
- `aan(word)`: "a/an" helper.
- `Card`, `Deck`, `Hand`: card model and helpers.

### `src/server/local.ts` and `src/server/index.ts`
Endpoints:
- `GET /opponents`
- `POST /games`
- `GET /games/:id`
- `POST /games/:id/mode`
- `POST /games/:id/action`
- `POST /games/:id/messages`

### `src/server/core/opponents/Vicki/Opponent.ts`
Overrides `Character` to set name, messages, and image list.

## Spec notes (current gaps)
- No explicit "max 3 bets per player per round" limit exists.
- AI `stay` decisions may resolve to `call` if a call is owed.
- `END_ROUND` waits for a UI action to start the next round.

- Debt and strip logic is intertwined; immediate strip occurs on debt,
  while post-round strip occurs on money <= 0 after round end.
