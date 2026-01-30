export class Init {
  static playerCharacter: string | false = false;
  static currency = '$';
  static cards: string | null = null;
  static lockScreen = false;
  static maxTries = 0;
}

export const initConfig = {
  playerCharacter: Init.playerCharacter,
  currency: Init.currency,
  cards: Init.cards,
  lockScreen: Init.lockScreen,
  maxTries: Init.maxTries,
};
