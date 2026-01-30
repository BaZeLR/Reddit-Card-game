import { Hand, Message, aan } from './basicUtils';

function randInt(min: number, max: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function pyRound(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const sign = Math.sign(value) || 1;
  const abs = Math.abs(value);
  const floor = Math.floor(abs);
  const frac = abs - floor;
  if (frac > 0.5) return sign * Math.ceil(abs);
  if (frac < 0.5) return sign * floor;
  const even = floor % 2 === 0 ? floor : floor + 1;
  return sign * even;
}

function formatString(template: string, ...args: Array<string | number>): string {
  return template.replace(/{(\d+)}/g, (match, idx) => {
    const value = args[Number(idx)];
    return value === undefined ? match : String(value);
  });
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function rankName(value: number, plural = false): string {
  const nameMap: Record<number, string> = {
    14: 'Ace',
    13: 'King',
    12: 'Queen',
    11: 'Jack',
    10: 'Ten',
    9: 'Nine',
    8: 'Eight',
    7: 'Seven',
    6: 'Six',
    5: 'Five',
    4: 'Four',
    3: 'Three',
    2: 'Two',
  };
  const base = nameMap[value] ?? String(value);
  if (!plural) return base;
  const pluralMap: Record<number, string> = {
    14: 'Aces',
    13: 'Kings',
    12: 'Queens',
    11: 'Jacks',
    10: 'Tens',
    9: 'Nines',
    8: 'Eights',
    7: 'Sevens',
    6: 'Sixes',
    5: 'Fives',
    4: 'Fours',
    3: 'Threes',
    2: 'Twos',
  };
  return pluralMap[value] ?? `${base}s`;
}

type HandValue = [string, number, number, string | number | number[] | undefined, number[]?];

export class Character {
  name = 'Standard Character';
  brashness = 0;
  images = '';
  portrait = '';
  wardrobeItems: string[] = ['boxers', 'socks', 'sleepers', 'tee', 'shorts', 'hoodie'];
  stripStates: string[] = [
    'shirtless',
    'pantless',
    'pantiless',
    'barefoot',
    'sockless',
    'hoodie-less',
  ];
  wardrobePrices: Record<string, number> = {};
  betMessages: string[] = [];
  callMessages: string[] = [];
  cardMessages: string[] = [];
  dealMessages: string[] = [
    "Here they come... my cards are being dealt. Please don't laugh if they're terrible.",
    "Cards dealt. Let's see how cruel or kind the deck is feeling tonight.",
    "Hehe... dealing while the room spins just a tiny bit. Don't tell.",
    'Dealing again... because apparently I love losing to you.',
    "Dealing while my pile grows. You're going to look so pretty stripped bare.",
    "Dealing cards while you stare. Eyes up here... or lower, your choice.",
    'Cards on the felt. In poker, as in passion: position is everything.',
  ];
  foldMessages: string[] = [];
  gameOverMessages: string[] = [];
  imageMessages: string[] = [];
  loseMessages: string[] = [];
  noCardsMessages: string[] = [];
  oppFoldMessages: string[] = [];
  oppLoseMessages: string[] = [];
  potMessages: string[] = [];
  raiseMessages: string[] = [];
  revealMessages: string[] = [];
  shuffleMessages: string[] = [];
  stayMessages: string[] = [];
  winMessages: string[] = [];
  tipsyMessages: string[] = [];
  cards: Hand = new Hand();
  lastBet = 0;
  money = 0;
  owed = 0;
  totalBet = 0;
  onTry = 0;
  folded = false;
  revealedIndices: number[] = [];
  baseBrashness = 0;
  drinksTotal = 0;
  consecutiveDrinks = 0;
  drankThisRound = false;

  getWardrobeMaxTries(tries: number): number {
    const safeTries = Number.isFinite(tries) ? Math.max(tries, 0) : 0;
    const wardrobeCount = Array.isArray(this.wardrobeItems) ? this.wardrobeItems.length : 0;
    if (wardrobeCount > 0) {
      return safeTries > 0 ? Math.min(safeTries, wardrobeCount) : wardrobeCount;
    }
    return safeTries;
  }

  getWardrobePrices(defaultAmount: number, tries: number): number[] {
    const baseAmount = Math.max(defaultAmount, 1);
    const maxTries = this.getWardrobeMaxTries(tries);
    if (maxTries <= 0) return [];
    const items = Array.isArray(this.wardrobeItems) ? this.wardrobeItems : [];
    const prices: number[] = [];
    for (let i = 0; i < maxTries; i += 1) {
      const item = items[i];
      const override = item ? this.wardrobePrices[item] : undefined;
      const amount = Number.isFinite(override) && override > 0 ? override : baseAmount;
      prices.push(amount);
    }
    return prices;
  }

  getWardrobeMaxDebt(defaultAmount: number, tries: number): number {
    const baseAmount = Math.max(defaultAmount, 1);
    const wardrobeCount = Array.isArray(this.wardrobeItems) ? this.wardrobeItems.length : 0;
    if (wardrobeCount > 0) {
      return wardrobeCount * baseAmount;
    }
    const maxTries = this.getWardrobeMaxTries(tries);
    return Math.max(maxTries, 0) * baseAmount;
  }

  getWardrobeRequiredTries(debt: number, defaultAmount: number, tries: number): number {
    if (debt <= 0) return 0;
    const baseAmount = Math.max(defaultAmount, 1);
    const maxTries = this.getWardrobeMaxTries(tries);
    const prices = this.getWardrobePrices(baseAmount, maxTries);
    if (!prices.length || maxTries <= 0) {
      return Math.min(maxTries, Math.max(Math.ceil(debt / baseAmount), 1));
    }
    let total = 0;
    for (let i = 0; i < prices.length; i += 1) {
      total += Math.max(prices[i] ?? baseAmount, 0);
      if (total >= debt) {
        return i + 1;
      }
    }
    return prices.length;
  }

  bet(betAmt: number, toPot: number): void {
    this.lastBet = betAmt;
    this.money -= betAmt + toPot;
    this.totalBet += betAmt + toPot;
    this.checkDebt();
  }

  checkDebt(): void {
    if (this.money < 0) {
      if (this.owed < 0) {
        // Already owes money, combine debts
      }
      this.owed = this.money;
      return;
    }
    if (this.owed < 0) {
      this.owed = 0;
    }
  }

  processCards(): number[] {
    const handValue = this.checkHand(this.cards.cards);
    const toFlip: number[] = [];
    const handRank = handValue[1];
    if (handRank === 1 || handRank === 2 || handRank === 5 || handRank === 6 || handRank === 4) {
      return toFlip;
    }
    if (handRank === 3) {
      const loc = Number(handValue[3]);
      for (let i = 0; i < 5; i += 1) {
        if (!(i === loc - 1 || i === loc - 2 || i === loc - 3 || i === loc - 4)) {
          toFlip.push(i);
        }
      }
    } else if (handRank === 7) {
      const loc = Number(handValue[3]);
      for (let i = 0; i < 5; i += 1) {
        if (!(i === loc - 1 || i === loc - 2 || i === loc - 3)) {
          toFlip.push(i);
        }
      }
    } else if (handRank === 8) {
      const locs = Array.isArray(handValue[3]) ? handValue[3] : [];
      for (let i = 0; i < 5; i += 1) {
        if (!(i === locs[0] - 1 || i === locs[0] - 2 || i === locs[1] - 1 || i === locs[1] - 2)) {
          toFlip.push(i);
        }
      }
    } else if (handRank === 9) {
      const loc = Number(handValue[3]);
      for (let i = 0; i < 5; i += 1) {
        if (!(i === loc - 1 || i === loc - 2)) {
          toFlip.push(i);
        }
      }
    } else {
      for (let i = 0; i < 5; i += 1) {
        if (this.cards.cards[i].value < 11) {
          toFlip.push(i);
        }
      }
    }
    return toFlip;
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
    _lastPot: number
  ): Message {
    const handValue = this.checkHand(this.cards.cards);
    const realHandValue = (11 - handValue[1]) * handValue[2];
    const brashnessBetNoise =
      this.brashness > 0 ? randInt(0, Math.abs(this.brashness * 5)) : 0;
    const betCheck =
      40 -
      realHandValue -
      pyRound(toPot / (setMax / 5)) +
      pyRound((pot / chars) / 100) -
      brashnessBetNoise +
      randInt(0, pyRound((numStayed / chars) * 10)) -
      (gameStage === 'bet_and_stay' ? 20 : 0) -
      (gameStage === 'bet_and_call' ? 10 : 0) -
      pyRound(this.owed / (setMax / 5));
    const brashnessFoldNoise =
      this.brashness > 0 ? randInt(0, Math.abs(this.brashness * 3)) : 0;
    let foldCheck =
      20 -
      realHandValue * 2 +
      pyRound(toPot / (setMax / 5)) -
      pyRound((pot / chars) / 50) -
      Math.max((14 - realHandValue) + this.brashness * 3, -15) -
      brashnessFoldNoise -
      (gameStage === 'bet_and_call' ? 5 : 0);
    if (toPot === 0 && foldCheck >= 0 && betCheck >= 0) {
      foldCheck = -1;
    }
    if (
      pot + toPot > this.money &&
      toPot !== 0 &&
      randInt(1, Math.max(3 + this.brashness * 2 + (20 - realHandValue), 1)) === 1 &&
      gameStage === 'bet_and_call' &&
      foldCheck < 1 &&
      betCheck >= 0
    ) {
      foldCheck = 1;
    }
    if (
      handValue[1] > 9 &&
      randInt(1, Math.max(3 + this.brashness * 2, 1)) === 1 &&
      gameStage === 'bet_and_call' &&
      foldCheck < 1 &&
      betCheck >= 0
    ) {
      foldCheck = 1;
    }
    if (this.owed < 0 && foldCheck >= 0 && betCheck >= 0) {
      foldCheck = -1;
    }
    if (betCheck < 0 && this.totalBet + toPot - this.lastBet + 5 <= betCap) {
      let betAmount = 0;
      if (this.brashness > 0) {
        betAmount =
          randInt(11 - handValue[1], 10 - handValue[1] + 5) * 10 +
          10 * randInt(0, this.brashness);
      } else {
        betAmount =
          randInt(11 - handValue[1], 10 - handValue[1] + 5) * 10 +
          10 * randInt(this.brashness, 0);
      }
      if (randInt(1, 15 - this.brashness) <= 11 - handValue[1]) {
        betAmount *= randInt(2, 4);
      }
      if (betAmount > setMax) betAmount = setMax;
      if (this.totalBet + betAmount + toPot - this.lastBet > betCap) {
        betAmount = betCap - this.totalBet - toPot + this.lastBet;
      }
      if (betAmount < 5) betAmount = 5;
      let betMsg = '';
      let betMsg2 = '';
      if (toPot === 0) {
        betMsg = this.raiseMessages[randInt(0, this.raiseMessages.length - 1)];
      } else {
        betMsg = this.betMessages[randInt(0, this.betMessages.length - 1)];
      }
      if (betMsg.startsWith('{1}')) {
        betMsg2 = formatString(betMsg, betAmount, currency);
        betMsg2 = capitalize(betMsg);
      } else {
        betMsg2 = formatString(betMsg, betAmount, currency);
      }
      return new Message(this.name, betMsg2, ['bet'], { betAmt: betAmount }, 'bet', ['bet']);
    }
    if (foldCheck < 0) {
      console.log(`${this.name} stayed/called`);
      if (gameStage === 'bet_and_stay') {
        return this.handleMsg('stay');
      }
      return this.handleMsg('call');
    }
    this.folded = true;
    return this.handleMsg('fold');
  }

  showdown(): Message {
    const revealMessage = this.revealMessages[randInt(0, this.revealMessages.length - 1)];
    let revealMessage2 = '';
    if (revealMessage.startsWith('{0}') || revealMessage.startsWith('{1}')) {
      revealMessage2 = formatString(
        revealMessage,
        aan(this.checkHand(this.cards.cards)[0]),
        this.checkHand(this.cards.cards)[0]
      );
      revealMessage2 = capitalize(revealMessage2);
    } else {
      revealMessage2 = formatString(
        revealMessage,
        aan(this.checkHand(this.cards.cards)[0]),
        this.checkHand(this.cards.cards)[0]
      );
    }
    return new Message(this.name, revealMessage2, [], {}, 'reveal', ['reveal']);
  }

  checkImage(
    isChar: boolean,
    tries: number,
    winner: number,
    playerName: string,
    loanAmount: number
  ): Array<Message | string> | 'player' | false {
    if (winner === -1 || this.owed >= 0) {
      return false;
    }
    const shouldStrip = isChar || this.name !== playerName;
    const debt = Math.abs(this.owed);
    const maxTries = this.getWardrobeMaxTries(tries);
    const requiredTries = this.getWardrobeRequiredTries(debt, loanAmount, maxTries);
    if (this.onTry >= requiredTries) {
      return false;
    }
    let msgs: Array<Message | string> | 'player' | false = shouldStrip ? [] : 'player';
    while (this.onTry < requiredTries) {
      this.onTry += 1;
      if (shouldStrip && Array.isArray(msgs)) {
        msgs.push(
          new Message(this.name, this.imageMessages[this.onTry]!, ['strip'], {}, 'strip', ['strip'])
        );
      }
    }
    if (this.onTry === maxTries && shouldStrip && Array.isArray(msgs)) {
      msgs.push(
        new Message(
          this.name,
          this.imageMessages[this.onTry]!,
          ['game_over'],
          {},
          'game_over',
          ['game_over']
        )
      );
    }
    return msgs;
  }

  handleDebt(
    isChar: boolean,
    tries: number,
    playerName: string,
    loanAmount: number
  ): Array<Message | string> | 'player' | false {
    if (this.owed >= 0) {
      return false;
    }
    const shouldStrip = isChar || this.name !== playerName;
    let msgs: Array<Message | string> | 'player' | false = shouldStrip ? [] : 'player';
    const debt = Math.abs(this.owed);
    const maxTries = this.getWardrobeMaxTries(tries);
    const requiredTries = this.getWardrobeRequiredTries(debt, loanAmount, maxTries);
    while (this.onTry < requiredTries) {
      this.onTry += 1;
      if (shouldStrip && Array.isArray(msgs)) {
        msgs.push(
          new Message(
            this.name,
            this.imageMessages[this.onTry]!,
            ['strip'],
            { stripIndex: this.onTry },
            'strip',
            ['strip']
          )
        );
      }
      if (this.onTry === maxTries && shouldStrip && Array.isArray(msgs)) {
        msgs.push(
          new Message(
            this.name,
            this.imageMessages[this.onTry]!,
            ['game_over'],
            {},
            'game_over',
            ['game_over']
          )
        );
        return msgs;
      }
    }
    return msgs;
  }

  respondToMsg(_name: string, tags: string[], lost: string[]): Message[] {
    const msgs: Message[] = [];
    for (const tag of tags) {
      if (!lost.includes(this.name)) {
        if (tag === 'fold') {
          msgs.push(this.handleMsg('oppFold'));
        }
        if (tag === 'strip') {
          msgs.push(this.handleMsg('gloat'));
        }
        if (tag === 'win' && !this.folded) {
          msgs.push(this.handleMsg('lose'));
        }
      }
    }
    return msgs;
  }

  handleMsg(
    type: string,
    format: Array<string | number> = [''],
    extraTags: string[] = [],
    s_vars: Record<string, unknown> = {}
  ): Message {
    let typeMsg = this.betMessages;
    const tags = [type, ...extraTags];
    const assoc_action: string[] = [];
    if (type === 'bet') {
      assoc_action.push('bet');
    } else if (type === 'stay') {
      typeMsg = this.stayMessages;
      assoc_action.push('stay');
    } else if (type === 'call') {
      typeMsg = this.callMessages;
      assoc_action.push('call');
    } else if (type === 'fold') {
      typeMsg = this.foldMessages;
      assoc_action.push('fold');
    } else if (type === 'oppFold') {
      typeMsg = this.oppFoldMessages;
    } else if (type === 'new_cards') {
      typeMsg = this.cardMessages;
    } else if (type === 'hold_cards') {
      typeMsg = this.noCardsMessages;
    } else if (type === 'pot_stays') {
      typeMsg = this.potMessages;
    } else if (type === 'gloat') {
      typeMsg = this.oppLoseMessages;
    } else if (type === 'triumph') {
      typeMsg = this.gameOverMessages;
    } else if (type === 'shuffle') {
      typeMsg = this.shuffleMessages;
      assoc_action.push('shuffle');
    } else if (type === 'stay') {
      typeMsg = this.stayMessages;
    } else if (type === 'lose') {
      typeMsg = this.loseMessages;
    } else if (type === 'win') {
      typeMsg = this.winMessages;
    } else if (type === 'bet') {
      typeMsg = this.betMessages;
    } else if (type === 'raise') {
      typeMsg = this.betMessages;
    } else if (type === 'tipsy') {
      typeMsg = this.tipsyMessages;
    } else {
      typeMsg = ['', ''];
    }
    if (
      this.drankThisRound &&
      this.tipsyMessages.length &&
      ['bet', 'call', 'stay', 'fold', 'raise'].includes(type)
    ) {
      typeMsg = this.tipsyMessages;
    }
    const template = typeMsg[randInt(0, typeMsg.length - 1)];
    return new Message(this.name, formatString(template, ...format), assoc_action, s_vars, type, tags);
  }

  cleanCards(): void {
    this.cards = new Hand();
  }

  checkHand(cards: Array<{ suit: string; value: number; face: string; name: string }>): HandValue {
    if (!cards || cards.length !== 5) {
      return ["cheater's hand", 11, 0, undefined, []];
    }
    const sorted = cards
      .slice()
      .sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit));
    const valuesAsc = sorted.map((card) => card.value);
    const valuesDesc = valuesAsc.slice().sort((a, b) => b - a);
    const suits = sorted.map((card) => card.suit);
    const isFlush = new Set(suits).size === 1;
    const uniqueValues = Array.from(new Set(valuesAsc));
    let isStraight = false;
    let straightHigh = 0;
    if (uniqueValues.length === 5) {
      const min = uniqueValues[0];
      const max = uniqueValues[uniqueValues.length - 1];
      if (max - min === 4) {
        isStraight = true;
        straightHigh = max;
      } else if (
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
    const groups: Array<{ value: number; count: number; endIndex: number }> = [];
    let currentVal = valuesAsc[0];
    let count = 0;
    for (let i = 0; i < valuesAsc.length; i += 1) {
      const value = valuesAsc[i];
      if (value === currentVal) {
        count += 1;
      } else {
        groups.push({ value: currentVal, count, endIndex: i });
        currentVal = value;
        count = 1;
      }
    }
    groups.push({ value: currentVal, count, endIndex: valuesAsc.length });
    const pairs = groups.filter((group) => group.count === 2);
    const trips = groups.filter((group) => group.count === 3);
    const fours = groups.filter((group) => group.count === 4);
    const countsList = groups.map((group) => group.count);
    const countSignature = countsList.slice().sort((a, b) => a - b).join(',');
    const straightCardName =
      straightHigh === 5
        ? sorted.find((card) => card.value === 5)?.name ?? sorted[3]?.name ?? ''
        : sorted[4]?.name ?? '';

    if (isStraight && isFlush) {
      if (straightHigh === 14 && uniqueValues[0] === 10) {
        return ['royal flush', 1, straightHigh, straightCardName, [straightHigh]];
      }
      return ['straight flush', 2, straightHigh, straightCardName, [straightHigh]];
    }
    if (countsList.includes(5)) {
      const value = groups[0]?.value ?? 0;
      return ["cheater's hand", 11, value, groups[0]?.endIndex, [value]];
    }
    if (fours.length) {
      const fourVal = fours[0].value;
      const kicker = valuesDesc.find((value) => value !== fourVal) ?? 0;
      return ['four of a kind', 3, fourVal, fours[0].endIndex, [fourVal, kicker]];
    }
    if (countSignature === '2,3') {
      const threeVal = trips[0]?.value ?? 0;
      const pairVal = pairs[0]?.value ?? 0;
      return ['full house', 4, threeVal + pairVal, undefined, [threeVal, pairVal]];
    }
    if (isFlush) {
      const highCard = sorted[4];
      return ['flush', 5, valuesDesc[0] ?? 0, highCard?.name, valuesDesc.slice()];
    }
    if (isStraight) {
      if (straightHigh === 5 && uniqueValues[0] === 2 && uniqueValues[4] === 14) {
        return ['wheel', 6, straightHigh, straightCardName, [straightHigh]];
      }
      return ['straight', 6, straightHigh, straightCardName, [straightHigh]];
    }
    if (trips.length) {
      const threeVal = trips[0].value;
      const remaining = valuesDesc.filter((value) => value !== threeVal);
      return ['three of a kind', 7, threeVal, trips[0].endIndex, [threeVal, ...remaining]];
    }
    if (pairs.length === 2) {
      const pairValuesAsc = pairs.map((pair) => pair.value);
      const pairValuesDesc = pairValuesAsc.slice().sort((a, b) => b - a);
      const kicker = valuesDesc.find((value) => !pairValuesAsc.includes(value)) ?? 0;
      const locs = pairs.map((pair) => pair.endIndex);
      const pairSum = pairValuesAsc.reduce((sum, value) => sum + value, 0);
      return ['two pair', 8, pairSum, locs, [pairValuesDesc[0] ?? 0, pairValuesDesc[1] ?? 0, kicker]];
    }
    if (pairs.length === 1) {
      const pairVal = pairs[0].value;
      const remaining = valuesDesc.filter((value) => value !== pairVal);
      return ['pair', 9, pairVal, pairs[0].endIndex, [pairVal, ...remaining]];
    }
    const highCard = sorted[4];
    const highFace = highCard?.face ?? String(valuesDesc[0] ?? '');
    return [`${highFace} high`, 10, valuesDesc[0] ?? 0, highCard?.name, valuesDesc.slice()];
  }

  describeHand(cards: Array<{ suit: string; value: number; face: string; name: string }>): string {
    if (!cards || cards.length !== 5) return '';
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
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0] - a[0];
    });
    const countsList = Array.from(counts.values());

    if (isStraight && isFlush) {
      if (straightHigh === 14 && uniqueValues[0] === 10) {
        return 'Royal Flush';
      }
      return `Straight Flush, ${rankName(straightHigh)} high`;
    }
    if (countsList.includes(4)) {
      const fourVal = countValues.find((entry) => entry[1] === 4)?.[0] ?? 0;
      return `Four of a Kind, ${rankName(fourVal, true)}`;
    }
    if (countsList.sort((a, b) => a - b).join(',') === '2,3') {
      const threeVal = countValues.find((entry) => entry[1] === 3)?.[0] ?? 0;
      const pairVal = countValues.find((entry) => entry[1] === 2)?.[0] ?? 0;
      return `Full House, ${rankName(threeVal, true)} over ${rankName(pairVal, true)}`;
    }
    if (isFlush) {
      const top = rankName(values[0]);
      const second = values.length > 1 ? rankName(values[1]) : '';
      return second ? `Flush, ${top} high (${second} kicker)` : `Flush, ${top} high`;
    }
    if (isStraight) {
      return `Straight, ${rankName(straightHigh)} high`;
    }
    if (countsList.includes(3)) {
      const threeVal = countValues.find((entry) => entry[1] === 3)?.[0] ?? 0;
      return `Three of a Kind, ${rankName(threeVal, true)}`;
    }
    if (countsList.filter((c) => c === 2).length === 2) {
      const pairVals = countValues.filter((entry) => entry[1] === 2).map((entry) => entry[0]);
      pairVals.sort((a, b) => b - a);
      return `Two Pair, ${rankName(pairVals[0] ?? 0, true)} and ${rankName(pairVals[1] ?? 0, true)}`;
    }
    if (countsList.includes(2)) {
      const pairVal = countValues.find((entry) => entry[1] === 2)?.[0] ?? 0;
      return `Pair of ${rankName(pairVal, true)}`;
    }
    if (countsList.includes(5)) {
      return "Cheater's Hand";
    }
    {
      const top = rankName(values[0]);
      const second = values.length > 1 ? rankName(values[1]) : '';
      return second ? `High Card, ${top} (${second} kicker)` : `High Card, ${top}`;
    }
  }
}
