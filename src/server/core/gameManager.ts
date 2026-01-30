import { Deck, Hand, Message } from './basicUtils';
import { Character } from './StandardCharacter';
import { logEvent } from './logger';

const LOAN_AMOUNT = 100;
const DEFAULT_PLAYER_WARDROBE = [
  'shirtless',
  'pantless',
  'pantiless',
  'barefoot',
  'sockless',
  'hoodie-less',
];
const DRINK_PRICE = 50;

export enum GameStage {
  NOT_STARTED = 'not_started',
  START_ROUND = 'start_round',
  BET_AND_STAY = 'bet_and_stay',
  RAISE_AND_CALL = 'raise_and_call',
  BET_AND_CALL = 'bet_and_call',
  CHANGE_CARDS = 'change_cards',
  ROUND_TWO = 'round_two',
  SHOWDOWN = 'showdown',
  END_ROUND = 'end_round',
  GAME_OVER = 'game_over',
}

export interface GameSettings {
  startMoney?: number;
  maxBet?: number;
  pokerType?: number;
  ante?: number;
  betCap?: number;
}

export interface QueuedMessage {
  name: string;
  text: string;
  assoc_action: string;
  tags: string[];
}

export interface GameState {
  characters: Array<{
    name: string;
    money: number;
    totalBet: number;
    lastBet: number;
    owed: number;
    debt: number;
    cards: Array<{ face: string; suit: string; value: number; name: string }>;
    onTry: number;
    maxTries: number;
    wardrobeItems: string[];
    revealedIndices: number[];
    handName?: string;
  }>;
  pot: number;
  toPot: number;
  dealer: number;
  currentlyOn: number;
  gameStage: string;
  betCap: number;
  maxBet: number;
  ante: number;
  winnerName: string;
  messageQueue: QueuedMessage[];
  stripImages: Record<string, string | null>;
  stripIndices: Record<string, number>;
  debtNotified: Record<string, number>;
  revealHands: boolean;
}

type Opponent = Character & {
  callOwed?: number;
  respondToMsg?: (name: string, tags: string[], lost: string[]) => Message[];
  handleMsg?: (
    type: string,
    format?: Array<string | number>,
    extraTags?: string[],
    s_vars?: Record<string, unknown>
  ) => Message;
  processResponse?: (
    pot: number,
    gameStage: string,
    currency: string,
    setMax: number,
    betCap: number,
    toPot: number,
    chars: number,
    numStayed: number,
    lastPot: number
  ) => Message;
  processCards?: () => number[];
  checkImage?: (
    isChar: boolean,
    tries: number,
    winner: number,
    playerName: string,
    loanAmount: number
  ) => Array<Message | string> | 'player' | false;
  handleDebt?: (
    isChar: boolean,
    tries: number,
    playerName: string,
    loanAmount: number
  ) => Array<Message | string> | 'player' | false;
  showdown?: () => Message;
  checkDebt?: () => void;
};

export class Player {
  AI: Opponent;
  maxTries: number;

  constructor(ai: Opponent, maxTries: number) {
    this.AI = ai;
    this.maxTries = maxTries;
  }

  reset_for_round(): void {
    this.AI.totalBet = 0;
    this.AI.lastBet = 0;
    this.AI.callOwed = 0;
    this.AI.folded = false;
    if (typeof this.AI.cleanCards === 'function') {
      this.AI.cleanCards();
    } else {
      this.AI.cards = new Hand();
    }
  }
}

export class GameManager {
  setMoney: number;
  setMax: number;
  currency: string;
  rules: number;
  ante: number;
  characters: Player[];
  playerVar: number;
  isChar: boolean;
  pot: number;
  toPot: number;
  lastPot: number;
  baseBetCap: number;
  betCap: number;
  numStayed: number;
  allStay: boolean;
  calls: string[];
  out: string[];
  lost: string[];
  dealer: number;
  currentlyOn: number;
  gameStage: GameStage;
  messageDisplay: QueuedMessage[];
  deck: Deck | null;
  stripImages: Record<string, string | null>;
  stripIndices: Record<string, number>;
  debtNotified: Record<string, number>;
  drawOrder: number[];
  lastRoundShowdown: boolean;
  cardFolder: string;
  debug: boolean;

  constructor({
    characters,
    settings,
    currency = '$',
    cardFolder = 'cards',
    playerVar = 0,
    isChar = false,
    debug = false,
    rules = 0,
  }: {
    characters: Player[];
    settings: GameSettings;
    currency?: string;
    cardFolder?: string;
    playerVar?: number;
    isChar?: boolean;
    debug?: boolean;
    rules?: number;
  }) {
    this.setMoney = settings.startMoney ?? 200;
    this.setMax = settings.maxBet ?? this.setMoney;
    this.currency = currency;
    this.rules = rules || settings.pokerType || 0;
    this.ante = settings.ante ?? 5;
    this.characters = characters;
    this.playerVar = playerVar;
    this.isChar = isChar;
    this.pot = 0;
    this.toPot = 0;
    this.lastPot = 0;
    this.baseBetCap = Math.min(settings.betCap ?? this.setMax, this.setMoney * 2);
    this.betCap = this.baseBetCap;
    this.numStayed = 0;
    this.allStay = true;
    this.calls = [];
    this.out = [];
    this.lost = [];
    this.dealer = 0;
    this.currentlyOn = 0;
    this.gameStage = GameStage.NOT_STARTED;
    this.messageDisplay = [];
    this.deck = null;
    this.stripImages = {};
    this.stripIndices = {};
    this.debtNotified = {};
    this.drawOrder = [];
    this.lastRoundShowdown = false;
    this.cardFolder = cardFolder;
    this.debug = debug;
    this._log('game_init', {
      settings,
      currency: this.currency,
      rules: this.rules,
      playerVar: this.playerVar,
      isChar: this.isChar,
      characters: this.characters.map((p) => p.AI.name),
    });
  }

  _snapshot() {
    const dealerName = this.characters[this.dealer]?.AI.name ?? '';
    const currentName = this.characters[this.currentlyOn]?.AI.name ?? '';
    return {
      stage: this.gameStage,
      pot: this.pot,
      toPot: this.toPot,
      dealer: this.dealer,
      dealerName,
      currentlyOn: this.currentlyOn,
      currentName,
      betCap: this.betCap,
      numStayed: this.numStayed,
      allStay: this.allStay,
      out: [...this.out],
      lost: [...this.lost],
      players: this.characters.map((p) => ({
        name: p.AI.name,
        money: p.AI.money,
        totalBet: p.AI.totalBet,
        lastBet: p.AI.lastBet,
        callOwed: p.AI.callOwed ?? 0,
        debt: p.AI.owed ?? 0,
        folded: p.AI.folded,
        onTry: p.AI.onTry ?? 0,
        revealedIndices: p.AI.revealedIndices ?? [],
        maxTries: p.maxTries,
      })),
    };
  }

  _log(event: string, data: Record<string, unknown> = {}): void {
    logEvent(event, { ...data, ...this._snapshot() });
  }

  getMaxPlayerMoney(player: Player): number {
    const baseMoney = Math.max(this.setMoney, 0);
    const wardrobeCount = Array.isArray(player.AI.wardrobeItems)
      ? player.AI.wardrobeItems.length
      : 0;
    const maxTries = wardrobeCount || player.maxTries || 0;
    const creditLine = Math.max(maxTries, 0) * LOAN_AMOUNT;
    return baseMoney + creditLine;
  }

  getMaxPotLimit(): number {
    return this.characters.reduce((sum, player) => sum + this.getMaxPlayerMoney(player), 0);
  }

  _trace_accounting(player: Player, reason: string, extra: Record<string, unknown> = {}): void {
    const ai = player.AI;
    const money = ai.money ?? 0;
    const debt = ai.owed ?? 0;
    const expectedDebt = money < 0 ? money : 0;
    const expectedOnTry =
      money < 0 ? ai.getWardrobeRequiredTries(Math.abs(money), LOAN_AMOUNT, player.maxTries) : 0;
    this._log('accounting', {
      reason,
      actor: ai.name,
      money,
      debt,
      expectedDebt,
      onTry: ai.onTry ?? 0,
      expectedOnTry,
      totalBet: ai.totalBet ?? 0,
      lastBet: ai.lastBet ?? 0,
      callOwed: ai.callOwed ?? 0,
      ...extra,
    });
  }

  queue_message(text: string, assoc_action = '', tags: string[] = [], name = ''): void {
    this.messageDisplay.push({ name, text, assoc_action, tags });
    this._log('message', { name, text, assoc_action, tags });
  }

  _queue_ai_message(msg: Message): void {
    const assoc = msg.assoc_action;
    this.messageDisplay.push({
      name: msg.name ?? '',
      text: msg.text,
      assoc_action: assoc.join(','),
      tags: msg.tags ?? [],
    });
    this._log('ai_message', {
      name: msg.name ?? '',
      text: msg.text,
      assoc_action: assoc,
      tags: msg.tags ?? [],
    });
  }

  _queue_responses(speaker: string, tags: string[]): void {
    if (!tags.length) return;
    for (const player of this.characters) {
      if (player.AI.name === speaker) {
        continue;
      }
      if (typeof player.AI.respondToMsg === 'function') {
        let responses: Message[] = [];
        try {
          responses = player.AI.respondToMsg(speaker, tags, this.lost) || [];
        } catch {
          responses = [];
        }
        for (const resp of responses) {
          if (resp instanceof Message) {
            this._queue_ai_message(resp);
            const respName = resp.name ?? player.AI.name;
            this._queue_responses(respName, resp.tags ?? []);
          }
        }
      }
    }
  }

  _record_strip_image(player: Player, stripIndex?: number): void {
    const stripList = player.AI.imageMessages || [];
    if (!stripList.length) return;
    const onTry = Math.max(player.AI.onTry ?? 1, 1);
    const targetIndex = stripIndex && stripIndex > 0 ? stripIndex : onTry;
    const idx = Math.min(Math.max(targetIndex, 1), stripList.length - 1);
    this.stripImages[player.AI.name] = stripList[idx] ?? null;
    this.stripIndices[player.AI.name] = idx;
  }

  _player_strip_status(player: Player, step: number): string {
    const name = player.AI.name || 'Player';
    const stripStates =
      Array.isArray(player.AI.stripStates) && player.AI.stripStates.length
        ? player.AI.stripStates
        : null;
    const wardrobeItems =
      Array.isArray(player.AI.wardrobeItems) && player.AI.wardrobeItems.length
        ? player.AI.wardrobeItems
        : null;
    const maxTries =
      player.maxTries ||
      stripStates?.length ||
      wardrobeItems?.length ||
      DEFAULT_PLAYER_WARDROBE.length;
    if (step >= maxTries) {
      return `${name} has nothing valuable left to offer.`;
    }
    if (stripStates) {
      const label = stripStates[step - 1];
      if (label) {
        return `${name} is now ${label}.`;
      }
    }
    if (wardrobeItems) {
      const item = wardrobeItems[step - 1];
      if (item) {
        return `${name} removed ${item}.`;
      }
    }
    const label = DEFAULT_PLAYER_WARDROBE[step - 1];
    if (label) {
      return `${name} is now ${label}.`;
    }
    return `${name} stripped an item (${step}/${maxTries}).`;
  }

  _apply_payout(player: Player, potAward: number): void {
    const potAmount = Math.max(0, Math.trunc(potAward));
    const ai = player.AI;
    if (potAmount > 0) {
      ai.money += potAmount;
    }
    if (ai.money < 0) {
      ai.owed = ai.money;
    } else if ((ai.owed ?? 0) < 0) {
      ai.owed = 0;
    }
    const debt = Math.max(-(ai.owed ?? 0), 0);
    const requiredTries =
      debt > 0 ? ai.getWardrobeRequiredTries(debt, LOAN_AMOUNT, player.maxTries) : 0;
    if (requiredTries <= 0) {
      if ((ai.onTry ?? 0) !== 0) {
        ai.onTry = 0;
        delete this.stripImages[ai.name];
        delete this.stripIndices[ai.name];
        this._log('strip_redeem', { actor: ai.name, onTry: 0, cleared: true });
      }
    } else if ((ai.onTry ?? 0) !== requiredTries) {
      ai.onTry = requiredTries;
      this._record_strip_image(player, requiredTries);
      this._log('strip_redeem', { actor: ai.name, onTry: requiredTries });
    }
    this._trace_accounting(player, 'payout', { potAward: potAmount });
  }

  _apply_game_over(player: Player): void {
    if (this.gameStage === GameStage.GAME_OVER) {
      return;
    }
    if (!this.lost.includes(player.AI.name)) {
      this.lost.push(player.AI.name);
    }
    player.AI.folded = true;
    if (!this.out.includes(player.AI.name)) {
      this.out.push(player.AI.name);
    }
    const remaining = this.characters.filter((p) => !this.lost.includes(p.AI.name));
    if (remaining.length <= 1) {
      const winnerPlayer = remaining.length === 1 ? remaining[0] : null;
      if (winnerPlayer && this.pot > 0) {
        const winner = winnerPlayer.AI;
        const netGain = Math.max(this.pot - (winner.totalBet ?? 0), 0);
        this._apply_payout(winnerPlayer, this.pot);
        this.queue_message(
          `${winner.name} wins the pot of ${this.pot}${this.currency} (net gain ${netGain}${this.currency})`,
          'end_round',
          ['win'],
          winner.name
        );
        this._log('win', { winner: winner.name, pot: this.pot, netGain });
        this._queue_responses(winner.name, ['win']);
        if (typeof winner.handleMsg === 'function') {
          try {
            this._queue_ai_message(winner.handleMsg('win'));
          } catch {
            // ignore response failures
          }
        }
      }
      this.lastPot = this.pot;
      this.pot = 0;
      this.toPot = 0;
      this._recalculate_call_owed();
      this.gameStage = GameStage.GAME_OVER;
      this.queue_message('Game over', 'game_over', ['game_over']);
      if (remaining.length === 1 && typeof remaining[0].AI.handleMsg === 'function') {
        try {
          this._queue_ai_message(remaining[0].AI.handleMsg('triumph'));
        } catch {
          // ignore response failures
        }
      }
      this._queue_responses('system', ['game_over']);
    }
  }

  next_message(): QueuedMessage | undefined {
    return this.messageDisplay.shift();
  }

  _advance_player(): void {
    const total = this.characters.length;
    if (!total) return;
    for (let i = 0; i < total; i += 1) {
      this.currentlyOn = (this.currentlyOn + 1) % total;
      const current = this.characters[this.currentlyOn];
      if (current && !current.AI.folded && !this.lost.includes(current.AI.name)) {
        break;
      }
    }
    this._recalculate_call_owed();
    this._log('advance_player');
  }

  _active_players(): Player[] {
    return this.characters.filter((p) => !p.AI.folded && !this.lost.includes(p.AI.name));
  }

  _recalculate_call_owed(): void {
    const active = this._active_players();
    const currentBet = active.reduce((max, p) => Math.max(max, p.AI.totalBet), 0);
    for (const p of this.characters) {
      const callOwed = !p.AI.folded ? Math.max(currentBet - p.AI.totalBet, 0) : 0;
      p.AI.callOwed = callOwed;
    }
    const currentPlayer = this.characters[this.currentlyOn];
    this.toPot = currentPlayer?.AI.callOwed ?? 0;
  }

  _deal_new_deck(): void {
    this.deck = new Deck();
    this._log('shuffle_deck');
  }

  _deal_cards(): void {
    if (!this.deck) {
      this._deal_new_deck();
    }
    if (!this.deck) return;
    for (const player of this.characters) {
      player.AI.cards = new Hand();
    }
    for (let i = 0; i < 5; i += 1) {
      for (const player of this.characters) {
        const card = this.deck.pullCard();
        player.AI.cards.addCard(card);
      }
    }
    for (const player of this.characters) {
      player.AI.cards.organize();
    }
    this._log('deal_cards');
  }

  state(): GameState {
    const cardPayload = (card: { face: string; suit: string; value: number; name: string }) => ({
      face: card.face ?? '',
      suit: card.suit ?? '',
      value: card.value ?? 0,
      name: card.name ?? '',
    });
    const revealHands =
      this.gameStage === GameStage.SHOWDOWN ||
      (this.gameStage === GameStage.END_ROUND && this.lastRoundShowdown);
    const winnerName =
      this.gameStage === GameStage.GAME_OVER
        ? this._active_players().map((p) => p.AI.name)[0] ?? ''
        : '';
    return {
      characters: this.characters.map((p) => ({
        name: p.AI.name,
        money: p.AI.money,
        totalBet: p.AI.totalBet,
        lastBet: p.AI.lastBet,
        owed: p.AI.callOwed ?? 0,
        debt: p.AI.owed ?? 0,
        cards: (p.AI.cards ?? new Hand()).cards.map(cardPayload),
        onTry: p.AI.onTry ?? 0,
        maxTries: p.maxTries,
        wardrobeItems: Array.isArray(p.AI.wardrobeItems) ? [...p.AI.wardrobeItems] : [],
        revealedIndices: Array.isArray(p.AI.revealedIndices) ? p.AI.revealedIndices : [],
        handName:
          revealHands && typeof p.AI.describeHand === 'function' && p.AI.cards?.cards?.length === 5
            ? String(p.AI.describeHand(p.AI.cards.cards) ?? '')
            : revealHands && typeof p.AI.checkHand === 'function' && p.AI.cards?.cards?.length === 5
              ? String(p.AI.checkHand(p.AI.cards.cards)[0] ?? '')
              : '',
      })),
      pot: this.pot,
      toPot: this.toPot,
      dealer: this.dealer,
      currentlyOn: this.currentlyOn,
      gameStage: this.gameStage,
      betCap: this.betCap,
      maxBet: this.setMax,
      ante: this.ante,
      winnerName,
      messageQueue: [...this.messageDisplay],
      stripImages: { ...this.stripImages },
      stripIndices: { ...this.stripIndices },
      debtNotified: { ...this.debtNotified },
      revealHands,
    };
  }

  start_round(): void {
    if (!this.characters.length) return;
    this.messageDisplay = [];
    this.lastRoundShowdown = false;
    this.pot = 0;
    this.toPot = 0;
    this.lastPot = 0;
    this.out = [...this.lost];
    this.numStayed = this.out.length;
    this.allStay = true;
    this.calls = [];
    this.dealer %= this.characters.length;
    this.currentlyOn = (this.dealer + 1) % this.characters.length;
    this.betCap = Math.max(1, Math.floor(this.baseBetCap / 2));
    this.drawOrder = [];
    for (const p of this.characters) {
      p.reset_for_round();
      const ai = p.AI;
      if (ai.baseBrashness === undefined || ai.baseBrashness === null) {
        ai.baseBrashness = ai.brashness ?? 0;
      }
      const drankLastRound = ai.drankThisRound === true;
      if (!drankLastRound) {
        ai.consecutiveDrinks = 0;
      }
      ai.drankThisRound = false;
      ai.revealedIndices = [];
      ai.brashness = ai.baseBrashness;
    }
    this._deal_new_deck();
    this._deal_cards();
    for (const player of this.characters) {
      this._update_debt_status(player);
      this._handle_debt_strip(player);
      if (this.gameStage === GameStage.GAME_OVER) {
        return;
      }
      const antePay = Math.max(this.ante, 0);
      player.AI.money -= antePay;
      player.AI.totalBet += antePay;
      this._update_debt_status(player);
      this.pot += antePay;
      this._handle_debt_strip(player);
      this._trace_accounting(player, 'ante', { amount: antePay });
      if (this.gameStage === GameStage.GAME_OVER) {
        return;
      }
    }
    this._log('post_ante');
    this._recalculate_call_owed();
    this.gameStage = GameStage.BET_AND_STAY;
    this.queue_message('New round started', 'start_round');
    const dealerName = this.characters[this.dealer]?.AI.name ?? 'Dealer';
    this.queue_message(`Dealer: ${dealerName}`, 'dealer');
    this.queue_message('Shuffling cards', 'shuffle', ['shuffle']);
    this.queue_message('Dealing cards', 'deal', ['deal']);
    if (this.dealer === this.playerVar) {
      const opponent = this.characters.find((_, idx) => idx !== this.playerVar);
      const dealLines = opponent?.AI.dealMessages ?? [];
      if (dealLines.length) {
        const line = dealLines[Math.floor(Math.random() * dealLines.length)];
        if (line) {
          this.queue_message(line, '', [], opponent?.AI.name ?? '');
        }
      }
    }
    for (let idx = 0; idx < this.characters.length; idx += 1) {
      const antePay = Math.max(this.ante, 0);
      const player = this.characters[idx];
      if (!player) continue;
      const name = player.AI.name || `Player ${idx + 1}`;
      this.queue_message(`${name} posts ante`, 'ante', [
        'ante',
        `ante_${idx}`,
        `actor_${idx}`,
        `pot_${antePay}`,
      ]);
    }
    this.queue_message('Place your bets', 'place_bets', ['place_bets']);
    this._log('start_round');
    this._auto_act_if_ai();
  }

  change_mode(mode: GameStage | string, tie = false): void {
    const nextMode = mode as GameStage;
    if (nextMode === GameStage.CHANGE_CARDS) {
      if (this.gameStage === GameStage.CHANGE_CARDS) {
        return;
      }
      if (!this._can_enter_change_cards()) {
        return;
      }
    }
    this.gameStage = nextMode;
    if (this.gameStage === GameStage.START_ROUND) {
      this.start_round();
    } else if (this.gameStage === GameStage.CHANGE_CARDS) {
      this._log('change_mode', { mode: this.gameStage });
      this._handle_draw_phase();
    } else if (this.gameStage === GameStage.ROUND_TWO) {
      this.gameStage = GameStage.BET_AND_CALL;
      this.numStayed = this.out.length;
      this.allStay = true;
      this.calls = [];
      this.betCap = Math.min(this.baseBetCap, Math.max(1, this.betCap * 2));
      this._recalculate_call_owed();
      this.queue_message('Second betting round', 'round_two');
      this._log('round_two');
    } else if (this.gameStage === GameStage.SHOWDOWN) {
      this._log('showdown');
      this._handle_showdown();
    } else if (this.gameStage === GameStage.END_ROUND) {
      this._log('end_round', { tie });
      this._handle_showdown(tie);
    } else if (this.gameStage === GameStage.GAME_OVER) {
      this.queue_message('Game over', 'game_over', ['game_over']);
      this._log('game_over');
      this._queue_responses('system', ['game_over']);
    }
  }

  poker_action(action: string, amount?: number, indices?: number[]): void {
    const actionLower = action.toLowerCase();
    if (actionLower === 'next_player') {
      this._advance_player();
      this._recalculate_call_owed();
      return;
    }
    const player = this.characters[this.currentlyOn];
    if (!player) return;
    if (actionLower === 'bet' || actionLower === 'raise') {
      const advanced = this._action_bet(player, amount ?? 0);
      if (!advanced) {
        this._advance_player();
        this._auto_act_if_ai();
      }
      return;
    }
    if (actionLower === 'call') {
      const advanced = this._action_call(player);
      if (!advanced) {
        this._advance_player();
        this._auto_act_if_ai();
      }
      return;
    }
    if (actionLower === 'stay') {
      const advanced = this._action_stay(player);
      if (!advanced) {
        this._advance_player();
        this._auto_act_if_ai();
      }
      return;
    }
    if (actionLower === 'fold') {
      const advanced = this._action_fold(player);
      if (!advanced) {
        this._advance_player();
        this._auto_act_if_ai();
      }
      return;
    }
    if (actionLower === 'change_cards') {
      this._action_change_cards(player, indices ?? []);
      return;
    }
    if (actionLower === 'drink') {
      this._action_drink(player);
      return;
    }
    if (actionLower === 'flip_cards') {
      this._handle_showdown();
      return;
    }
    throw new Error(`Unsupported action: ${action}`);
  }

  _action_bet(player: Player, amount: number): boolean {
    let betAmount = Math.trunc(amount);
    if (betAmount <= 0) {
      throw new Error('Bet amount must be positive');
    }
    betAmount = Math.min(betAmount, this.setMax);
    const callOwed = player.AI.callOwed ?? 0;
    if (this.betCap && player.AI.totalBet + betAmount + callOwed - player.AI.lastBet > this.betCap) {
      betAmount = Math.max(
        0,
        this.betCap - player.AI.totalBet - callOwed + player.AI.lastBet
      );
    }
    if (betAmount <= 0) {
      throw new Error('Bet amount must be positive');
    }
    this._update_debt_status(player);
    this._handle_debt_strip(player);
    if (this.gameStage === GameStage.GAME_OVER) {
      return true;
    }
    if (typeof player.AI.bet === 'function') {
      player.AI.bet(betAmount, callOwed);
    } else {
      player.AI.money -= betAmount + callOwed;
      player.AI.totalBet += betAmount + callOwed;
      player.AI.lastBet = betAmount;
    }
    this._update_debt_status(player);
    this.pot += betAmount + callOwed;
    this._handle_debt_strip(player);
    this.numStayed = this.out.length;
    this.allStay = false;
    this.calls = [];
    if (this.rules === 1 && this.gameStage === GameStage.BET_AND_STAY) {
      this.gameStage = GameStage.RAISE_AND_CALL;
    }
    this._recalculate_call_owed();
    this._trace_accounting(player, 'bet', { amount: betAmount, callOwed });
    const playerIdx = this.characters.indexOf(player);
    const potDelta = betAmount + callOwed;
    this.queue_message(
      `${player.AI.name} bets ${this.currency}${betAmount}`,
      'bet',
      ['bet', `actor_${playerIdx}`, `pot_${potDelta}`],
      player.AI.name
    );
    this._log('bet', { actor: player.AI.name, amount: betAmount, callOwed });
    this._queue_responses(player.AI.name, ['bet']);
    return this.gameStage === GameStage.GAME_OVER;
  }

  _action_call(player: Player): boolean {
    const pay = Math.trunc(player.AI.callOwed ?? 0);
    this._update_debt_status(player);
    this._handle_debt_strip(player);
    if (this.gameStage === GameStage.GAME_OVER) {
      return true;
    }
    if (pay <= 0) {
      return this._action_stay(player);
    }
    player.AI.money -= pay;
    player.AI.totalBet += pay;
    player.AI.lastBet = pay;
    this._update_debt_status(player);
    this.pot += pay;
    this._handle_debt_strip(player);
    if (this.gameStage === GameStage.GAME_OVER) {
      return true;
    }
    this.calls.push(player.AI.name);
    this.numStayed += 1;
    this._recalculate_call_owed();
    this._trace_accounting(player, 'call', { amount: pay });
    const playerIdx = this.characters.indexOf(player);
    this.queue_message(
      `${player.AI.name} calls ${this.currency}${pay}`,
      'call',
      ['call', `actor_${playerIdx}`, `pot_${pay}`],
      player.AI.name
    );
    this._log('call', { actor: player.AI.name, amount: pay });
    this._queue_responses(player.AI.name, ['call']);
    return this._maybe_advance_after_resolution();
  }

  _action_stay(player: Player): boolean {
    if ((player.AI.callOwed ?? 0) > 0) {
      return this._action_call(player);
    }
    this._update_debt_status(player);
    this._handle_debt_strip(player);
    if (this.gameStage === GameStage.GAME_OVER) {
      return true;
    }
    this.numStayed += 1;
    this._recalculate_call_owed();
    this.queue_message(`${player.AI.name} stays`, 'stay', ['stay'], player.AI.name);
    this._log('stay', { actor: player.AI.name });
    this._queue_responses(player.AI.name, ['stay']);
    return this._maybe_advance_after_resolution();
  }

  _action_fold(player: Player): boolean {
    player.AI.folded = true;
    if (!this.out.includes(player.AI.name)) {
      this.out.push(player.AI.name);
    }
    this.numStayed += 1;
    this._recalculate_call_owed();
    this.queue_message(`${player.AI.name} folds`, 'fold', ['fold'], player.AI.name);
    this._log('fold', { actor: player.AI.name });
    this._queue_responses(player.AI.name, ['fold']);
    const remaining = this._active_players();
    if (remaining.length === 1) {
      this.lastRoundShowdown = false;
      const winnerPlayer = remaining[0];
      const winner = winnerPlayer.AI;
      const netGain = Math.max(this.pot - (winner.totalBet ?? 0), 0);
      this._apply_payout(winnerPlayer, this.pot);
      this.queue_message(
        `${winner.name} wins the pot of ${this.pot}${this.currency} (net gain ${netGain}${this.currency})`,
        'end_round',
        ['win'],
        winner.name
      );
      this._log('win', { winner: winner.name, pot: this.pot, netGain });
      this._queue_responses(winner.name, ['win']);
      if (typeof winner.handleMsg === 'function') {
        try {
          this._queue_ai_message(winner.handleMsg('win'));
        } catch {
          // ignore response failures
        }
      }
      this.lastPot = this.pot;
      this.pot = 0;
      this.toPot = 0;
      this._recalculate_call_owed();
      const winnerIdx = this.characters.indexOf(remaining[0]);
      this._handle_post_round_images(winnerIdx);
      if (this.gameStage === GameStage.GAME_OVER) {
        return true;
      }
      this.dealer = (this.dealer + 1) % this.characters.length;
      this.currentlyOn = (this.dealer + 1) % this.characters.length;
      this.gameStage = GameStage.END_ROUND;
      return true;
    }
    return this._maybe_advance_after_resolution();
  }

  _handle_debt_strip(player: Player): void {
    const owed = player.AI.owed ?? 0;
    if (owed >= 0) {
      return;
    }
    const maxTries = player.AI.getWardrobeMaxTries(player.maxTries);
    const requiredTries = player.AI.getWardrobeRequiredTries(Math.abs(owed), LOAN_AMOUNT, maxTries);
    const prevOnTry = player.AI.onTry ?? 0;
    if (requiredTries <= prevOnTry) {
      if (prevOnTry >= maxTries) {
        this._apply_game_over(player);
      }
      const maxDebt = player.AI.getWardrobeMaxDebt(LOAN_AMOUNT, player.maxTries);
      if (owed <= -maxDebt) {
        this._apply_game_over(player);
      }
      return;
    }
    const idx = this.characters.indexOf(player);
    const playerName =
      this.characters.length && this.playerVar < this.characters.length
        ? this.characters[this.playerVar].AI.name
        : '';
    const isChar = idx === this.playerVar ? this.isChar : true;
    let msgs: Array<Message | string> | 'player' | false = false;
    const loanAmount = LOAN_AMOUNT;
    if (typeof player.AI.handleDebt === 'function') {
      msgs = player.AI.handleDebt(isChar, player.maxTries, playerName, loanAmount);
    }
    if (!msgs) {
      return;
    }
    if (msgs === 'player') {
      this._record_strip_image(player);
      const currentOnTry = player.AI.onTry ?? 0;
      if (currentOnTry > prevOnTry) {
        for (let step = prevOnTry + 1; step <= currentOnTry; step += 1) {
          const status = this._player_strip_status(player, step);
          const extra = step === 1 ? ` ${player.AI.name} has a boner.` : '';
          this.queue_message(`${player.AI.name} must strip. ${status}${extra}`, 'strip', ['strip']);
        }
      } else {
        this.queue_message(`${player.AI.name} must strip.`, 'strip', ['strip']);
      }
      this._queue_responses(player.AI.name, ['strip']);
      if ((player.AI.onTry ?? 0) >= maxTries) {
        this._apply_game_over(player);
      }
      const maxDebt = player.AI.getWardrobeMaxDebt(LOAN_AMOUNT, player.maxTries);
      if ((player.AI.owed ?? 0) <= -maxDebt) {
        this._apply_game_over(player);
      }
      return;
    }
    for (const msg of msgs) {
      if (msg instanceof Message) {
        this._queue_ai_message(msg);
        this._queue_responses(msg.name ?? player.AI.name, msg.tags ?? ['strip']);
        if ((msg.tags ?? []).includes('strip')) {
          const stripIndex =
            typeof msg.stored_vars?.stripIndex === 'number' ? msg.stored_vars.stripIndex : undefined;
          this._record_strip_image(player, stripIndex);
        }
        if ((msg.tags ?? []).includes('game_over')) {
          this._apply_game_over(player);
        }
      } else if (typeof msg === 'string') {
        this.queue_message(msg, '', ['strip'], player.AI.name);
        this._queue_responses(player.AI.name, ['strip']);
        this._record_strip_image(player);
      }
    }
    if ((player.AI.onTry ?? 0) >= maxTries) {
      this._apply_game_over(player);
    }
    const maxDebt = player.AI.getWardrobeMaxDebt(LOAN_AMOUNT, player.maxTries);
    if ((player.AI.owed ?? 0) <= -maxDebt) {
      this._apply_game_over(player);
    }
  }

  _maybe_queue_debt_message(player: Player): void {
    const owed = player.AI.owed ?? 0;
    if (owed >= 0) {
      return;
    }
    const last = this.debtNotified[player.AI.name];
    if (last === owed) {
      return;
    }
    this.debtNotified[player.AI.name] = owed;
    const amount = Math.abs(owed);
    this.queue_message(`${player.AI.name} is in debt (${this.currency}${amount}).`, '', ['debt']);
    this._log('debt', { actor: player.AI.name, amount });
  }

  _update_debt_status(player: Player): void {
    const ai = player.AI;
    if (typeof ai.checkDebt === 'function') {
      const money = ai.money ?? 0;
      const owed = ai.owed ?? 0;
      const needsUpdate = (money < 0 && owed !== money) || (money >= 0 && owed < 0);
      if (needsUpdate) {
        ai.checkDebt();
      }
    }
    this._maybe_queue_debt_message(player);
  }

  _can_enter_change_cards(): boolean {
    if (this.gameStage !== GameStage.BET_AND_STAY && this.gameStage !== GameStage.RAISE_AND_CALL) {
      return false;
    }
    const activeTotal = this._active_players().length;
    if (activeTotal <= 1) {
      return false;
    }
    return this.numStayed >= this.out.length + activeTotal;
  }

  _maybe_advance_after_resolution(): boolean {
    const activeTotal = this._active_players().length;
    if (this.numStayed < this.out.length + activeTotal) {
      return false;
    }
    if (this.gameStage === GameStage.BET_AND_STAY || this.gameStage === GameStage.RAISE_AND_CALL) {
      this.change_mode(GameStage.CHANGE_CARDS);
      return true;
    }
    if (this.gameStage === GameStage.BET_AND_CALL) {
      this.change_mode(GameStage.SHOWDOWN);
      return true;
    }
    return false;
  }

  _handle_draw_phase(): void {
    if (!this.deck) {
      this._deal_new_deck();
    }
    if (!this.deck) return;
    this.drawOrder = [];
    const total = this.characters.length;
    if (!total) {
      this._complete_draw_phase();
      return;
    }
    for (let i = 0; i < total; i += 1) {
      const idx = (this.currentlyOn + i) % total;
      const player = this.characters[idx];
      if (player && !player.AI.folded && !this.lost.includes(player.AI.name)) {
        this.drawOrder.push(idx);
      }
    }
    if (!this.drawOrder.length) {
      this._complete_draw_phase();
      return;
    }
    this.currentlyOn = this.drawOrder[0] ?? this.currentlyOn;
    const orderNames = this.drawOrder
      .map((idx) => this.characters[idx]?.AI.name)
      .filter((name): name is string => Boolean(name));
    this._log('draw_phase_start', { order: orderNames });
    this._auto_draw_if_ai();
  }

  _auto_draw_if_ai(): void {
    if (this.gameStage !== GameStage.CHANGE_CARDS) {
      return;
    }
    while (this.drawOrder.length) {
      const idx = this.drawOrder[0];
      if (idx === this.playerVar) {
        return;
      }
      const player = this.characters[idx];
      if (player) {
        this._perform_ai_draw(player);
      }
      this.drawOrder.shift();
      if (this.drawOrder.length) {
        this.currentlyOn = this.drawOrder[0] ?? this.currentlyOn;
      }
    }
    this._complete_draw_phase();
  }

  _complete_draw_phase(): void {
    this.drawOrder = [];
    this.queue_message('Draw phase completed', 'change_cards');
    this._log('draw_phase_completed');
    this.change_mode(GameStage.ROUND_TWO);
    this._auto_act_if_ai();
  }

  _perform_ai_draw(player: Player): void {
    if (!this.deck) {
      this._deal_new_deck();
    }
    if (!this.deck) return;
    if (typeof player.AI.processCards !== 'function') {
      return;
    }
    const toFlip = player.AI.processCards();
    const drawTags = toFlip.length ? ['change_cards', 'new_cards'] : ['change_cards', 'hold_cards'];
    const drawCount = toFlip.length;
    for (const flipIdx of toFlip) {
      if (flipIdx < player.AI.cards.cards.length) {
        player.AI.cards.flipCard(flipIdx, this.deck.pullCard());
      }
    }
    player.AI.cards.organize();
    let queuedDrawMessage = false;
    if (typeof player.AI.handleMsg === 'function') {
      const msgType = toFlip.length ? 'new_cards' : 'hold_cards';
      try {
        const msg = player.AI.handleMsg(msgType, toFlip.length ? [toFlip.length] : ['']);
        this._queue_ai_message(msg);
        this._queue_responses(player.AI.name, msg.tags ?? [msgType]);
        this._log('ai_draw', { actor: player.AI.name, cardsChanged: toFlip.length });
        queuedDrawMessage = Boolean(msg?.text && String(msg.text).trim());
      } catch {
        // ignore response failures
      }
    }
    if (!queuedDrawMessage) {
      const drawLine = drawCount
        ? `${player.AI.name} asks for ${drawCount} card${drawCount === 1 ? '' : 's'}.`
        : `${player.AI.name} holds.`;
      this.queue_message(drawLine, 'change_cards', drawTags, player.AI.name);
      this._log('ai_draw', { actor: player.AI.name, cardsChanged: drawCount, fallback: true });
    }
  }

  _action_change_cards(player: Player, indices: number[]): void {
    if (this.gameStage !== GameStage.CHANGE_CARDS) {
      throw new Error('Draw phase has not started.');
    }
    const playerIdx = this.characters.indexOf(player);
    if (playerIdx !== this.playerVar) {
      throw new Error('AI draws automatically.');
    }
    if (this.drawOrder.length && this.drawOrder[0] !== playerIdx) {
      throw new Error('Not your turn to draw.');
    }
    if (!this.deck) {
      this._deal_new_deck();
    }
    if (!this.deck) return;
    if (!player.AI.cards) {
      player.AI.cards = new Hand();
    }
    const hand = player.AI.cards;
    for (const idx of [...new Set(indices)].sort((a, b) => a - b)) {
      if (idx >= 0 && idx < hand.cards.length) {
        hand.flipCard(idx, this.deck.pullCard());
      }
    }
    hand.organize();
    if (typeof player.AI.handleMsg === 'function') {
      const msgType = indices.length ? 'new_cards' : 'hold_cards';
      try {
        const msg = player.AI.handleMsg(msgType, indices.length ? [indices.length] : ['']);
        this._queue_ai_message(msg);
        this._queue_responses(player.AI.name, msg.tags ?? [msgType]);
      } catch {
        // ignore response failures
      }
    }
    const drawTags = indices.length ? ['change_cards', 'new_cards'] : ['change_cards', 'hold_cards'];
    this.queue_message(`${player.AI.name} draws cards`, 'change_cards', drawTags);
    this._log('player_draw', { actor: player.AI.name, cardsChanged: indices.length });
    if (this.drawOrder.length) {
      this.drawOrder.shift();
    }
    if (this.drawOrder.length) {
      this.currentlyOn = this.drawOrder[0] ?? this.currentlyOn;
      this._auto_draw_if_ai();
      return;
    }
    this._complete_draw_phase();
  }

  _action_drink(player: Player): boolean {
    const opponent = this.characters.find(
      (p) => p.AI.name !== player.AI.name && !this.lost.includes(p.AI.name)
    );
    if (!opponent) {
      throw new Error('No opponent available for drink.');
    }
    const target = opponent.AI;
    player.AI.money -= DRINK_PRICE;
    if (typeof player.AI.checkDebt === 'function') {
      player.AI.checkDebt();
    }
    this._maybe_queue_debt_message(player);
    this._handle_debt_strip(player);
    if (target.drankThisRound) {
      throw new Error('Only one drink per round.');
    }
    if (target.drinksTotal >= 3) {
      throw new Error('No more drinks this session.');
    }
    target.drankThisRound = true;
    target.drinksTotal += 1;
    target.consecutiveDrinks += 1;
    target.brashness = (target.baseBrashness ?? target.brashness ?? 0) + 2;
    if (Array.isArray(target.cards?.cards) && target.cards.cards.length) {
      const idx = Math.floor(Math.random() * target.cards.cards.length);
      target.revealedIndices = [idx];
    } else {
      target.revealedIndices = [];
    }
    this.queue_message(
      `${player.AI.name} buys ${target.name} a drink (${this.currency}${DRINK_PRICE}).`,
      'drink',
      ['drink'],
      player.AI.name
    );
    if (typeof target.handleMsg === 'function' && target.tipsyMessages?.length) {
      try {
        this._queue_ai_message(target.handleMsg('tipsy'));
      } catch {
        // ignore response failures
      }
    }
    this._log('drink', { buyer: player.AI.name, target: target.name, total: target.drinksTotal });
    if (target.consecutiveDrinks >= 3) {
      this.queue_message(
        `${target.name} passes out after too many drinks.`,
        'game_over',
        ['game_over']
      );
      this._apply_game_over(opponent);
      return true;
    }
    return false;
  }

  _handle_showdown(_tie = false): void {
    this.lastRoundShowdown = true;
    for (const player of this._active_players()) {
      if (typeof player.AI.showdown === 'function') {
        try {
          const msg = player.AI.showdown();
          this._queue_ai_message(msg);
          this._queue_responses(player.AI.name, msg.tags ?? ['reveal']);
        } catch {
          // ignore response failures
        }
      }
    }
    let winnerIdx: number | null = null;
    const winners = this._pick_winners();
    if (!winners.length) {
      this.queue_message('No winner determined', 'end_round');
    } else {
      winnerIdx = winners[0] ?? null;
      if (winnerIdx === null) {
        this.queue_message('No winner determined', 'end_round');
      } else {
        const winner = this.characters[winnerIdx]?.AI;
        if (winner) {
          const netGain = Math.max(this.pot - (winner.totalBet ?? 0), 0);
          this._apply_payout(this.characters[winnerIdx]!, this.pot);
          this.queue_message(
            `${winner.name} wins the pot of ${this.pot}${this.currency} (net gain ${netGain}${this.currency})`,
            'end_round',
            ['win'],
            winner.name
          );
          this._log('win', { winner: winner.name, pot: this.pot, netGain });
          this._queue_responses(winner.name, ['win']);
          if (typeof winner.handleMsg === 'function') {
            try {
              this._queue_ai_message(winner.handleMsg('win'));
            } catch {
              // ignore response failures
            }
          }
          for (let idx = 0; idx < this.characters.length; idx += 1) {
            if (idx === winnerIdx) continue;
            const player = this.characters[idx];
            if (!player || player.AI.folded) continue;
            if (typeof player.AI.handleMsg === 'function') {
              try {
                this._queue_ai_message(player.AI.handleMsg('lose'));
              } catch {
                // ignore response failures
              }
            }
            this._queue_responses(player.AI.name, ['lose']);
          }
        }
      }
    }
    this.lastPot = this.pot;
    this.pot = 0;
    this.toPot = 0;
    this._recalculate_call_owed();
    this._handle_post_round_images(winnerIdx);
    if (this.gameStage === GameStage.GAME_OVER) {
      return;
    }
    this.dealer = (this.dealer + 1) % this.characters.length;
    this.currentlyOn = (this.dealer + 1) % this.characters.length;
    this.gameStage = GameStage.END_ROUND;
  }

  _handle_post_round_images(winnerIdx: number | null): void {
    const winnerVal = winnerIdx === null ? -1 : winnerIdx;
    const playerName =
      this.characters.length && this.playerVar < this.characters.length
        ? this.characters[this.playerVar].AI.name
        : '';
    for (let idx = 0; idx < this.characters.length; idx += 1) {
      const player = this.characters[idx];
      if (typeof player.AI.checkImage !== 'function') {
        continue;
      }
      const maxTries = player.AI.getWardrobeMaxTries(player.maxTries);
      const isChar = idx === this.playerVar ? this.isChar : true;
      let msgs: Array<Message | string> | 'player' | false | null = null;
      try {
        msgs = player.AI.checkImage(isChar, player.maxTries, winnerVal, playerName, LOAN_AMOUNT);
      } catch {
        msgs = null;
      }
      if (msgs === 'player') {
        this._record_strip_image(player);
        this.queue_message('Player must strip', 'strip', ['strip'], player.AI.name);
        this._log('strip_player', { actor: player.AI.name, onTry: player.AI.onTry ?? 0 });
        this._queue_responses(player.AI.name, ['strip']);
        if ((player.AI.onTry ?? 0) >= maxTries) {
          this._apply_game_over(player);
        }
        continue;
      }
      if (Array.isArray(msgs)) {
        for (const msg of msgs) {
          if (msg instanceof Message) {
            this._queue_ai_message(msg);
            this._queue_responses(msg.name ?? player.AI.name, msg.tags ?? ['strip']);
            if ((msg.tags ?? []).includes('strip')) {
              const stripIndex =
                typeof msg.stored_vars?.stripIndex === 'number' ? msg.stored_vars.stripIndex : undefined;
              this._record_strip_image(player, stripIndex);
              this._log('strip_ai', { actor: player.AI.name, onTry: player.AI.onTry ?? 0 });
            }
            if ((msg.tags ?? []).includes('game_over')) {
              this._apply_game_over(player);
            }
          } else if (typeof msg === 'string') {
            this.queue_message(msg, '', ['strip'], player.AI.name);
            this._log('strip_text', { actor: player.AI.name, text: msg });
            this._queue_responses(player.AI.name, ['strip']);
            this._record_strip_image(player);
          }
        }
      }
    if ((player.AI.onTry ?? 0) >= maxTries) {
      this._apply_game_over(player);
    }
    const maxDebt = player.AI.getWardrobeMaxDebt(LOAN_AMOUNT, player.maxTries);
    if ((player.AI.owed ?? 0) <= -maxDebt) {
      this._apply_game_over(player);
    }
  }
  }

  _hand_score(cards: Array<{ value: number; suit: string }>): number[] {
    const values = cards.map((c) => c.value).sort((a, b) => b - a);
    const suits = cards.map((c) => c.suit);
    const isFlush = new Set(suits).size === 1;
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
    let isStraight = false;
    let straightHigh = 0;
    if (uniqueValues.length === 5) {
      const min = uniqueValues[0];
      const max = uniqueValues[uniqueValues.length - 1];
      if (max - min === 4) {
        isStraight = true;
        straightHigh = max;
      } else if (
        uniqueValues.length === 5 &&
        uniqueValues[0] === 2 &&
        uniqueValues[1] === 3 &&
        uniqueValues[2] === 4 &&
        uniqueValues[3] === 5 &&
        uniqueValues[4] === 14
      ) {
        isStraight = true;
        straightHigh = 5;
      }
    }
    const counts = new Map<number, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const countValues = Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return b[0] - a[0];
    });
    const countsList = Array.from(counts.values());
    let rank = 10;
    let kickers: number[] = [];
    if (isStraight && isFlush) {
      rank = straightHigh === 14 ? 1 : 2;
      kickers = [straightHigh];
    } else if (countsList.includes(4)) {
      const fourVal = countValues.find((entry) => entry[1] === 4)?.[0] ?? 0;
      const kicker = Math.max(...values.filter((v) => v !== fourVal));
      rank = 3;
      kickers = [fourVal, kicker];
    } else if (countsList.sort((a, b) => a - b).join(',') === '2,3') {
      const threeVal = countValues.find((entry) => entry[1] === 3)?.[0] ?? 0;
      const pairVal = countValues.find((entry) => entry[1] === 2)?.[0] ?? 0;
      rank = 4;
      kickers = [threeVal, pairVal];
    } else if (isFlush) {
      rank = 5;
      kickers = values;
    } else if (isStraight) {
      rank = 6;
      kickers = [straightHigh];
    } else if (countsList.includes(3)) {
      const threeVal = countValues.find((entry) => entry[1] === 3)?.[0] ?? 0;
      const remaining = values.filter((v) => v !== threeVal);
      rank = 7;
      kickers = [threeVal, ...remaining];
    } else if (countsList.filter((c) => c === 2).length === 2) {
      const pairVals = countValues.filter((entry) => entry[1] === 2).map((entry) => entry[0]);
      pairVals.sort((a, b) => b - a);
      const kicker = Math.max(...values.filter((v) => !pairVals.includes(v)));
      rank = 8;
      kickers = [pairVals[0] ?? 0, pairVals[1] ?? 0, kicker];
    } else if (countsList.includes(2)) {
      const pairVal = countValues.find((entry) => entry[1] === 2)?.[0] ?? 0;
      const remaining = values.filter((v) => v !== pairVal);
      rank = 9;
      kickers = [pairVal, ...remaining];
    } else if (countsList.includes(5)) {
      rank = 11;
      kickers = [countValues[0]?.[0] ?? 0];
    } else {
      rank = 10;
      kickers = values;
    }
    return [rank, ...kickers.map((k) => -k)];
  }

  _hand_score_from_checkhand(
    handValue: [unknown, number, unknown, unknown, number[]?],
    cards?: Array<{ suit: string; value: number }>
  ): number[] {
    const rank = Number(handValue?.[1] ?? 11);
    const kickers = Array.isArray(handValue?.[4]) ? (handValue?.[4] as number[]) : [];
    const score = [rank, ...kickers.map((k) => -k)];
    if (!cards || !kickers.length) {
      return score;
    }
    const suitRanks = this._suit_tiebreakers(cards, kickers);
    if (!suitRanks.length) {
      return score;
    }
    return [...score, ...suitRanks.map((s) => -s)];
  }

  _suit_rank(suit: string): number {
    switch (suit) {
      case 'hearts':
        return 4;
      case 'diamonds':
        return 3;
      case 'clubs':
        return 2;
      case 'spades':
        return 1;
      default:
        return 0;
    }
  }

  _suit_tiebreakers(cards: Array<{ suit: string; value: number }>, kickerValues: number[]): number[] {
    if (!cards.length || !kickerValues.length) {
      return [];
    }
    const ranks: number[] = [];
    for (const value of kickerValues) {
      const candidates = cards.filter((card) => card.value === value);
      if (!candidates.length) {
        ranks.push(0);
        continue;
      }
      const bestSuit = candidates.reduce(
        (best, card) => Math.max(best, this._suit_rank(card.suit)),
        0
      );
      ranks.push(bestSuit);
    }
    return ranks;
  }

  _compare_scores(a: number[], b: number[]): number {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i += 1) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      if (av !== bv) {
        return av - bv;
      }
    }
    return 0;
  }

  _pick_winners(): number[] {
    let bestVal: number[] | null = null;
    const winners: number[] = [];
    for (let idx = 0; idx < this.characters.length; idx += 1) {
      const player = this.characters[idx];
      if (!player || player.AI.folded) {
        continue;
      }
      if (typeof player.AI.checkHand !== 'function') {
        continue;
      }
      if (!player.AI.cards) {
        continue;
      }
      const handValue = player.AI.checkHand(player.AI.cards.cards);
      const score = this._hand_score_from_checkhand(handValue, player.AI.cards.cards);
      if (!bestVal || this._compare_scores(score, bestVal) < 0) {
        bestVal = score;
        winners.length = 0;
        winners.push(idx);
      }
    }
    return winners;
  }

  _odd_chip_winner(winners: number[]): number | null {
    if (!winners.length) return null;
    const winnerSet = new Set(winners);
    const total = this.characters.length;
    for (let offset = 1; offset <= total; offset += 1) {
      const idx = (this.dealer + offset) % total;
      if (winnerSet.has(idx)) {
        return idx;
      }
    }
    return winners[0] ?? null;
  }

  _pick_winner(): number | null {
    let bestIdx: number | null = null;
    let bestVal: number[] | null = null;
    for (let idx = 0; idx < this.characters.length; idx += 1) {
      const player = this.characters[idx];
      if (!player || player.AI.folded) {
        continue;
      }
      if (typeof player.AI.checkHand !== 'function') {
        continue;
      }
      if (!player.AI.cards) {
        continue;
      }
      const handValue = player.AI.checkHand(player.AI.cards.cards);
      const score = this._hand_score_from_checkhand(handValue, player.AI.cards.cards);
      if (!bestVal || this._compare_scores(score, bestVal) < 0) {
        bestVal = score;
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  _auto_act_if_ai(): void {
    if (this.currentlyOn >= this.characters.length) {
      return;
    }
    if (this.currentlyOn === this.playerVar) {
      return;
    }
    const player = this.characters[this.currentlyOn];
    if (!player || typeof player.AI.processResponse !== 'function') {
      return;
    }
    this._recalculate_call_owed();
    const callOwed = player.AI.callOwed ?? 0;
    const activeCount = this._active_players().length;
    const msg = player.AI.processResponse(
      this.pot,
      this.gameStage,
      this.currency,
      this.setMax,
      this.betCap,
      callOwed,
      activeCount,
      this.numStayed,
      this.lastPot
    );
    this._queue_ai_message(msg);
    this._log('ai_decision', { actor: player.AI.name, tags: msg.tags ?? [], actions: msg.assoc_action });
    this._queue_responses(player.AI.name, msg.tags ?? []);
    const actions = msg.assoc_action;
    let shouldAdvance = true;
    for (const act of actions) {
      if (act === 'bet') {
        const betAmt = (msg.stored_vars?.betAmt as number | undefined) ?? 0;
        shouldAdvance = !this._action_bet(player, betAmt);
      } else if (act === 'stay') {
        shouldAdvance = !this._action_stay(player);
      } else if (act === 'call') {
        shouldAdvance = !this._action_call(player);
      } else if (act === 'fold') {
        shouldAdvance = !this._action_fold(player);
      }
      if (!shouldAdvance) {
        break;
      }
    }
    if (shouldAdvance) {
      this._advance_player();
    }
  }
}
