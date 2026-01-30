import { Character } from '../../StandardCharacter';
import type { Message } from '../../basicUtils';

export class Opponent extends Character {
  name = 'Victoria';
  brashness = -1;
  images = 'V.dat';
  portrait = 'Vportrait.png';
  wardrobeItems = ['pink panties', 'pink bra', 'tee', 'yoga pants'];
  betMessages = [
    '${0}.',
    "I'll raise by ${0}.",
    '${0} more, sound good?',
    '${0}, just to add a bit of spice.',
    '${0}.',
  ];
  callMessages = ['Call.', 'Call, I guess.', 'Calling.', 'Call.', 'Call!'];
  cardMessages = ['Dealer? Can I get {0}?'];
  foldMessages = ['Well this hand is quickly going nowhere. Fold.'];
  gameOverMessages = ["Oh.. well! I'm better at this then I thought! Cool!"];
  imageMessages = [
    "Uhm, I guess I'll buy back in with my shirt then.",
    'Pants too? Well, I can still win this thing, right?',
    "I'm starting to regret not wearing more. I could have at least brought socks..",
    "Hah... okay, well. Uhm, I'm still getting a bit more money for this, right? I can still win this.",
    "...Honestly, between being almost burnt to death, frozen to death, having a goddess put a bounty on me and forced to make friends with murderers and crazy people, this isn't the worst thing that's happened to me this week. Not by a long shot.",
    "So... I've got nothing else to sell. Which means I'm out. Unless you've got any /other/ ideas...",
  ];
  loseMessages = [
    'Damn it! I thought I had you, too.',
    "Don't be so smug. I'm totally gonna get you, next hand.",
    'Can I get a do-over?',
    'What is with my luck lately? My god!',
    "... You're not reading my mind over there, are you? Victor does that sometimes. ...I don't play cards with him any more.",
    "I just can't win at this, can I?",
    'Ugh. Next time is my time.',
    "Fine! Fine! You don't have to gloat about it.",
    "Yeah yeah, you're the big winner, I know I know.",
    "Okay, you got me there. Totally wasn't expecting that hand.",
    "Man, I can't catch a break, huh?",
  ];
  noCardsMessages = ["I'm good, dealer."];
  oppFoldMessages = [
    'Awesome! Keep doing that!',
    "There's no shame in folding! Good choice.",
    'So I get the pot? Cool!',
    "Don't worry, I'd probably have folded too.",
    'Great choice! Do more of that!',
    "Hee! That's what I like to hear.",
    "Aw! All for me? You shouldn't have.",
  ];
  oppLoseMessages = [
    "So I get your money, /and/ I get to see you naked. Isn't this game awesome?",
    "C'mon! If I gotta strip, you gotta strip too. Buy back in with something, would you?",
    'Are you gonna buy back in? Give me a little something to look at.',
    "That's right. C'mon, you've got a nice body. Show it off a little, huh?",
    "This is getting a bit... perverted, isn't it? Not that I'm saying we should stop!",
  ];
  potMessages = [
    'Cool, the pot keeps growing.',
    'Dealer! Next hand, please.',
    "I'm gonna get the whole pot, just you wait and see.",
    "I like the build up. Don't you?",
  ];
  raiseMessages = [
    '${0}.',
    "I'll raise ${0}.",
    '${0}. You can match that, right?',
    "Let's go with ${0} more.",
    '${0}!',
    "I'll raise ${0}.",
    "I'll raise ${0}.",
    'Just a little more for the pot. ${0}.',
    "I don't want to go crazy, but ${0}.",
    "I swear I'm not trying to bait you or anything, but I am gonna put ${0} more on the pile.",
  ];
  revealMessages = [
    "Alright, I've got {0}. What about you?",
    "Let's see how this turned out, huh? I've got {0}.",
    "I've got {0}. Your turn.",
    "I've got {0}.",
    "Uhm, let's see. I've got {0}, and you?",
    "I'm putting {0} against yours.",
  ];
  shuffleMessages = ['Dealer, could you shuffle the deck?'];
  stayMessages = [
    "I'll stay.",
    'Stay.',
    'Check.',
    'Check it.',
    'Staying here.',
    'Checking.',
    'Stay.',
  ];
  winMessages = [
    'You totally fell for it, huh?',
    "Don't feel bad, I'm sure you'll get it next time! If I go and drop dead first, I mean.",
    "Hah! I'm not so bad at this, huh?",
    'Ooh! That must have stung.',
    'God, this is a lot of cash. I almost feel kinda bad for taking it from you.',
    "Honestly? I used to play this a bit when I was in highschool. I'm not totally amateur after all, huh?",
    "C'mon, you didn't lose yet. You can still win it back, right?",
    "Ooh... I love that little rush you get from winning.",
    'Sweet! Your money is totally mine.',
  ];
  tipsyMessages = [
    "Whew... okay, you are kind of distracting right now.",
    "If you keep buying drinks, I'm not sure I'll stay focused on the cards.",
    "Mmm. You're making this game feel a little warmer than it should.",
    "Careful... I'm getting bold, and not just with my bets.",
    "Alright, I am officially tipsy. Try not to stare too much.",
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
