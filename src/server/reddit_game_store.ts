import { Card, Deck, Hand } from './core/basicUtils';
import { Character } from './core/StandardCharacter';
import { Opponent as VickiOpponent } from './core/opponents/Vicki';
import { GameManager, GameStage, Player, type GameSettings, type QueuedMessage } from './core/gameManager';

const GAME_STATE_VERSION = 1;

type SerializedCard = {
  name: string;
  face: string;
  value: number;
  suit: string;
  color: string;
};

type SerializedAIState = {
  module: string;
  name: string;
  money: number;
  totalBet: number;
  lastBet: number;
  owed: number;
  callOwed: number;
  onTry: number;
  folded: boolean;
  revealedIndices: number[];
  wardrobeItems: string[];
  stripStates: string[];
  brashness: number;
  baseBrashness: number;
  drinksTotal: number;
  consecutiveDrinks: number;
  drankThisRound: boolean;
  cards: SerializedCard[];
};

type SerializedPlayer = {
  maxTries: number;
  ai: SerializedAIState;
};

export type SerializedGame = {
  version: number;
  settings: GameSettings;
  currency: string;
  cardFolder: string;
  playerVar: number;
  isChar: boolean;
  rules: number;
  debug: boolean;
  state: {
    setMoney: number;
    setMax: number;
    ante: number;
    baseBetCap: number;
    pot: number;
    toPot: number;
    lastPot: number;
    betCap: number;
    numStayed: number;
    allStay: boolean;
    calls: string[];
    out: string[];
    lost: string[];
    dealer: number;
    currentlyOn: number;
    gameStage: GameStage | string;
    messageDisplay: QueuedMessage[];
    stripImages: Record<string, string | null>;
    stripIndices: Record<string, number>;
    debtNotified: Record<string, number>;
    lastRoundShowdown: boolean;
  };
  deck: SerializedCard[] | null;
  players: SerializedPlayer[];
};

function serializeCard(card: Card): SerializedCard {
  return {
    name: card.name,
    face: card.face,
    value: card.value,
    suit: card.suit,
    color: card.color,
  };
}

function deserializeCard(card: SerializedCard): Card {
  return new Card(card.name, card.face, card.value, card.suit, card.color);
}

function serializeHand(hand?: Hand | null): SerializedCard[] {
  if (!hand || !Array.isArray(hand.cards)) {
    return [];
  }
  return hand.cards.map(serializeCard);
}

function deserializeHand(cards?: SerializedCard[] | null): Hand {
  const hand = new Hand();
  hand.cards = Array.isArray(cards) ? cards.map(deserializeCard) : [];
  return hand;
}

function serializeDeck(deck?: Deck | null): SerializedCard[] | null {
  if (!deck || !Array.isArray(deck.deck)) {
    return null;
  }
  return deck.deck.map(serializeCard);
}

function deserializeDeck(cards?: SerializedCard[] | null): Deck | null {
  if (!Array.isArray(cards)) {
    return null;
  }
  const deck = new Deck();
  deck.deck = cards.map(deserializeCard);
  return deck;
}

function detectModule(ai: Character): string {
  if (ai instanceof VickiOpponent) {
    return 'Vicki';
  }
  return 'Standard';
}

function buildAI(moduleName: string): Character {
  if (moduleName === 'Vicki') {
    return new VickiOpponent();
  }
  return new Character();
}

export function serializeGame(manager: GameManager): SerializedGame {
  const settings: GameSettings = {
    startMoney: manager.setMoney,
    maxBet: manager.setMax,
    pokerType: manager.rules,
    ante: manager.ante,
    betCap: manager.baseBetCap,
  };
  return {
    version: GAME_STATE_VERSION,
    settings,
    currency: manager.currency,
    cardFolder: manager.cardFolder,
    playerVar: manager.playerVar,
    isChar: manager.isChar,
    rules: manager.rules,
    debug: manager.debug,
    state: {
      setMoney: manager.setMoney,
      setMax: manager.setMax,
      ante: manager.ante,
      baseBetCap: manager.baseBetCap,
      pot: manager.pot,
      toPot: manager.toPot,
      lastPot: manager.lastPot,
      betCap: manager.betCap,
      numStayed: manager.numStayed,
      allStay: manager.allStay,
      calls: [...manager.calls],
      out: [...manager.out],
      lost: [...manager.lost],
      dealer: manager.dealer,
      currentlyOn: manager.currentlyOn,
      gameStage: manager.gameStage,
      messageDisplay: [...manager.messageDisplay],
      stripImages: { ...manager.stripImages },
      stripIndices: { ...manager.stripIndices },
      debtNotified: { ...manager.debtNotified },
      lastRoundShowdown: manager.lastRoundShowdown,
    },
    deck: serializeDeck(manager.deck),
    players: manager.characters.map((player) => {
      const ai = player.AI;
      return {
        maxTries: player.maxTries,
        ai: {
          module: detectModule(ai),
          name: ai.name,
          money: ai.money ?? 0,
          totalBet: ai.totalBet ?? 0,
          lastBet: ai.lastBet ?? 0,
          owed: ai.owed ?? 0,
          callOwed: ai.callOwed ?? 0,
          onTry: ai.onTry ?? 0,
          folded: ai.folded ?? false,
          revealedIndices: Array.isArray(ai.revealedIndices) ? ai.revealedIndices : [],
          wardrobeItems: Array.isArray(ai.wardrobeItems) ? ai.wardrobeItems : [],
          stripStates: Array.isArray(ai.stripStates) ? ai.stripStates : [],
          brashness: ai.brashness ?? 0,
          baseBrashness: ai.baseBrashness ?? 0,
          drinksTotal: ai.drinksTotal ?? 0,
          consecutiveDrinks: ai.consecutiveDrinks ?? 0,
          drankThisRound: ai.drankThisRound ?? false,
          cards: serializeHand(ai.cards),
        },
      };
    }),
  };
}

export function deserializeGame(payload: SerializedGame): GameManager {
  const settings: GameSettings = payload.settings ?? {};
  const players = (payload.players ?? []).map((player) => {
    const aiState = player.ai;
    const ai = buildAI(aiState?.module ?? 'Standard');
    if (aiState?.name) {
      ai.name = aiState.name;
    }
    ai.money = aiState?.money ?? 0;
    ai.totalBet = aiState?.totalBet ?? 0;
    ai.lastBet = aiState?.lastBet ?? 0;
    ai.owed = aiState?.owed ?? 0;
    ai.callOwed = aiState?.callOwed ?? 0;
    ai.onTry = aiState?.onTry ?? 0;
    ai.folded = aiState?.folded ?? false;
    ai.revealedIndices = Array.isArray(aiState?.revealedIndices) ? aiState.revealedIndices : [];
    if (Array.isArray(aiState?.wardrobeItems) && aiState.wardrobeItems.length) {
      ai.wardrobeItems = aiState.wardrobeItems;
    }
    if (Array.isArray(aiState?.stripStates) && aiState.stripStates.length) {
      ai.stripStates = aiState.stripStates;
    }
    ai.brashness = aiState?.brashness ?? ai.brashness ?? 0;
    ai.baseBrashness = aiState?.baseBrashness ?? ai.baseBrashness ?? 0;
    ai.drinksTotal = aiState?.drinksTotal ?? 0;
    ai.consecutiveDrinks = aiState?.consecutiveDrinks ?? 0;
    ai.drankThisRound = aiState?.drankThisRound ?? false;
    ai.cards = deserializeHand(aiState?.cards ?? []);
    return new Player(ai, player.maxTries ?? 1);
  });
  const manager = new GameManager({
    characters: players,
    settings,
    currency: payload.currency ?? '$',
    cardFolder: payload.cardFolder ?? 'cards',
    playerVar: payload.playerVar ?? 0,
    isChar: payload.isChar ?? false,
    debug: payload.debug ?? false,
    rules: payload.rules ?? 0,
  });
  const state = payload.state ?? {};
  manager.setMoney = state.setMoney ?? manager.setMoney;
  manager.setMax = state.setMax ?? manager.setMax;
  manager.ante = state.ante ?? manager.ante;
  manager.baseBetCap = state.baseBetCap ?? manager.baseBetCap;
  manager.pot = state.pot ?? 0;
  manager.toPot = state.toPot ?? 0;
  manager.lastPot = state.lastPot ?? 0;
  manager.betCap = state.betCap ?? manager.betCap;
  manager.numStayed = state.numStayed ?? 0;
  manager.allStay = state.allStay ?? true;
  manager.calls = Array.isArray(state.calls) ? [...state.calls] : [];
  manager.out = Array.isArray(state.out) ? [...state.out] : [];
  manager.lost = Array.isArray(state.lost) ? [...state.lost] : [];
  manager.dealer = state.dealer ?? manager.dealer;
  manager.currentlyOn = state.currentlyOn ?? manager.currentlyOn;
  manager.gameStage = (state.gameStage as GameStage) ?? manager.gameStage;
  manager.messageDisplay = Array.isArray(state.messageDisplay) ? [...state.messageDisplay] : [];
  manager.stripImages = state.stripImages ? { ...state.stripImages } : {};
  manager.stripIndices = state.stripIndices ? { ...state.stripIndices } : {};
  manager.debtNotified = state.debtNotified ? { ...state.debtNotified } : {};
  manager.lastRoundShowdown = state.lastRoundShowdown ?? false;
  manager.deck = deserializeDeck(payload.deck ?? null);
  return manager;
}
