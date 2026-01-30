import { GameManager, type GameSettings, Player } from './gameManager';
import { Character } from './StandardCharacter';

export type PlayerCharacter = string | false;

export interface InitConfig {
  playerCharacter: PlayerCharacter;
  currency: string;
  cards: string | null;
  lockScreen: boolean;
  maxTries: number;
}

export class Init {
  static playerCharacter: PlayerCharacter = false;
  static currency = 'Money';
  static cards: string | null = null;
  static lockScreen = false;
  static maxTries = 0;
}

export const initConfig: InitConfig = {
  playerCharacter: Init.playerCharacter,
  currency: Init.currency,
  cards: Init.cards,
  lockScreen: Init.lockScreen,
  maxTries: Init.maxTries,
};

export interface OpponentConfig {
  ai?: Character;
  name?: string;
  money?: number;
  maxTries?: number;
}

type BuiltAI = {
  config: OpponentConfig;
  ai: Character;
};

function resolveMaxTries(config: OpponentConfig, ai: Character, fallback: number): number {
  const imageCount = Array.isArray(ai.imageMessages) ? ai.imageMessages.length : 0;
  const wardrobeCount = Array.isArray(ai.wardrobeItems) ? ai.wardrobeItems.length : 0;
  const resolved =
    config.maxTries ?? (wardrobeCount > 0 ? wardrobeCount : imageCount > 0 ? imageCount : fallback);
  if (resolved > 0) {
    return resolved;
  }
  return fallback > 0 ? fallback : 1;
}

export function createGameManagerFromInit({
  opponents,
  settings,
  currency,
  rules = 0,
  playerVar = 0,
  isChar,
}: {
  opponents: OpponentConfig[];
  settings: GameSettings;
  currency?: string;
  rules?: number;
  playerVar?: number;
  isChar?: boolean;
}): GameManager {
  const resolvedCurrency = currency ?? initConfig.currency;
  const resolvedIsChar = typeof isChar === 'boolean' ? isChar : initConfig.playerCharacter !== false;
  const startMoney = settings.startMoney ?? 200;

  const built = opponents.map((opponent): BuiltAI => {
    const ai = opponent.ai ?? new Character();
    if (opponent.name) {
      ai.name = opponent.name;
    }
    const initialMoney = opponent.money ?? startMoney;
    ai.money = (ai.money ?? 0) + initialMoney;
    ai.totalBet = ai.totalBet ?? 0;
    ai.lastBet = ai.lastBet ?? 0;
    ai.owed = ai.owed ?? 0;
    ai.onTry = ai.onTry ?? 0;
    return { config: opponent, ai };
  });
  const maxImageCount = built.reduce((max, entry) => {
    const count = Array.isArray(entry.ai.imageMessages) ? entry.ai.imageMessages.length : 0;
    return Math.max(max, count);
  }, 0);
  const fallbackMaxTries = Math.max(initConfig.maxTries, maxImageCount, 1);
  const players = built.map(
    ({ config, ai }) => new Player(ai, resolveMaxTries(config, ai, fallbackMaxTries))
  );

  return new GameManager({
    characters: players,
    settings,
    currency: resolvedCurrency,
    playerVar,
    isChar: resolvedIsChar,
    rules,
  });
}
