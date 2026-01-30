import { Character } from '../../StandardCharacter';
import type { Message } from '../../basicUtils';

export class Opponent extends Character {
  name = 'Becky';
  brashness = 2;
  images = 'B.dat';
  portrait = 'becky_portrate.png';
  wardrobeItems = ['heels', 'skirt', 'blouse', 'bra'];
  betMessages = [
    '${0}.',
    "Mmm, I'll tease the pot with ${0}.",
    '${0}. You gonna chase me, or just stare?',
    '${0}. Wink if you think I\'m bluffing.',
    '${0}.',
  ];
  callMessages = [
    'Call.',
    'Call. I want the reveal.',
    'Calling. Don\'t keep me waiting.',
    'Call.',
  ];
  cardMessages = [
    'Dealer, swap me {0}.',
    'New card, please: {0}.',
    'I want {0}. Don\'t judge my taste.',
    'Dealer, trade me for {0}.',
  ];
  foldMessages = ['Fine. I fold. Don\'t look so smug.'];
  gameOverMessages = ["That’s it, I’m out. Keep the memories."];
  imageMessages = [
    "Ugh. Blouse off. That buys me one more hand.",
    "Skirt goes. The pot better be worth it.",
    "Bra too? You better not blink.",
    "Heels off. Don’t act like you weren’t hoping.",
    "No more. I’m out of clothes and patience.",
  ];
  loseMessages = [
    "Don’t gloat. I was *definitely* bluffing.",
    "Okay, you got me. Next hand’s mine.",
    "I wanted to see if you'd bite. And you did.",
    "Ugh. The cards hate me, but you don't have to.",
  ];
  noCardsMessages = ["I'm good. I like this hand and the view."];
  oppFoldMessages = [
    'Nice fold. I was totally bluffing. Maybe.',
    'Smart. I was pushing it.',
    'You read me? Rude.',
  ];
  oppLoseMessages = [
    'Buy back in. I\'m not done watching.',
    'Don\'t stop now. Keep it interesting.',
  ];
  potMessages = [
    'Pot is getting spicy.',
    'Keep it growing. I like the suspense.',
  ];
  raiseMessages = [
    '${0}.',
    "Raise ${0}. Let’s see if you flinch.",
    '${0}. I dare you to call.',
    '${0}.',
  ];
  revealMessages = [
    "I've got {0}. Show me yours.",
    "I've got {0}.",
    "Your turn. I've got {0}.",
  ];
  shuffleMessages = ['Shuffle up. I like the drama.'];
  stayMessages = ['Check.', 'Stay.', 'Check it.'];
  winMessages = [
    'Told you. I was bluffing. Or was I?',
    'Easy money.',
    'I knew you would call. You always do.',
  ];
  tipsyMessages = [
    "You're making me bolder than usual.",
    "Careful... I bluff better when I'm buzzed.",
  ];

  bet(betAmt: number, toPot: number): void {
    return super.bet(betAmt, toPot);
  }

  checkDebt(): void {
    return super.checkDebt();
  }

  processCards(): number[] {
    return super.processCards();
  }

  processResponse(
    pot: number,
    gameStage: string,
    currency: string,
    setMax: number,
    betCap: number,
    toPot: number,
    chars: number,
    numStayed: number,
    lastPot: number
  ): Message {
    return super.processResponse(pot, gameStage, currency, setMax, betCap, toPot, chars, numStayed, lastPot);
  }

  showdown(): Message {
    return super.showdown();
  }

  checkImage(
    isChar: boolean,
    tries: number,
    winner: number,
    playerName: string,
    setMoney: number
  ): Array<Message | string> | 'player' | false {
    return super.checkImage(isChar, tries, winner, playerName, setMoney);
  }

  cleanCards(): void {
    return super.cleanCards();
  }

  checkHand(
    cards: Array<{ suit: string; value: number; face: string; name: string }>
  ): [string, number, number, string | number | number[] | undefined, number[]?] {
    return super.checkHand(cards);
  }

  respondToMsg(name: string, tags: string[], lost: string[]): Message[] {
    return super.respondToMsg(name, tags, lost);
  }

  handleMsg(
    type: string,
    format: Array<string | number> = [''],
    extraTags: string[] = [],
    s_vars: Record<string, unknown> = {}
  ): Message {
    return super.handleMsg(type, format, extraTags, s_vars);
  }
}
