export let speechLength = 0;

export class Message {
  name: string | null;
  text: string;
  assoc_action: string[];
  stored_vars: Record<string, unknown>;
  type: string;
  tags: string[];

  constructor(
    name: string | null,
    text: string,
    action: string[],
    vars: Record<string, unknown> = {},
    type: string,
    tags: string[] = []
  ) {
    this.name = name;
    this.text = text;
    this.assoc_action = action;
    this.stored_vars = vars;
    this.type = type;
    this.tags = tags;
  }
}

export function debug(log: string, reason: string): void {
  console.log(`Logging '${log}' queueing. Reason for queue: ${reason}`);
}

export function aan(word: string): string {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  if (word.length > 0 && vowels.includes(word[0].toLowerCase())) {
    return `an ${word}`;
  }
  return `a ${word}`;
}

export class Card {
  name: string;
  face: string;
  value: number;
  suit: string;
  color: string;

  constructor(name: string, face: string, value: number, suit: string, color: string) {
    this.name = name;
    this.face = face;
    this.value = value;
    this.suit = suit;
    this.color = color;
  }
}

export class Deck {
  deck: Card[];

  constructor() {
    this.deck = [
      new Card('two of hearts', 'two', 2, 'hearts', 'red'),
      new Card('two of diamonds', 'two', 2, 'diamonds', 'red'),
      new Card('two of clubs', 'two', 2, 'clubs', 'black'),
      new Card('two of spades', 'two', 2, 'spades', 'black'),
      new Card('three of hearts', 'three', 3, 'hearts', 'red'),
      new Card('three of diamonds', 'three', 3, 'diamonds', 'red'),
      new Card('three of clubs', 'three', 3, 'clubs', 'black'),
      new Card('three of spades', 'three', 3, 'spades', 'black'),
      new Card('four of hearts', 'four', 4, 'hearts', 'red'),
      new Card('four of diamonds', 'four', 4, 'diamonds', 'red'),
      new Card('four of clubs', 'four', 4, 'clubs', 'black'),
      new Card('four of spades', 'four', 4, 'spades', 'black'),
      new Card('five of hearts', 'five', 5, 'hearts', 'red'),
      new Card('five of diamonds', 'five', 5, 'diamonds', 'red'),
      new Card('five of clubs', 'five', 5, 'clubs', 'black'),
      new Card('five of spades', 'five', 5, 'spades', 'black'),
      new Card('six of hearts', 'six', 6, 'hearts', 'red'),
      new Card('six of diamonds', 'six', 6, 'diamonds', 'red'),
      new Card('six of clubs', 'six', 6, 'clubs', 'black'),
      new Card('six of spades', 'six', 6, 'spades', 'black'),
      new Card('seven of hearts', 'seven', 7, 'hearts', 'red'),
      new Card('seven of diamonds', 'seven', 7, 'diamonds', 'red'),
      new Card('seven of clubs', 'seven', 7, 'clubs', 'black'),
      new Card('seven of spades', 'seven', 7, 'spades', 'black'),
      new Card('eight of hearts', 'eight', 8, 'hearts', 'red'),
      new Card('eight of diamonds', 'eight', 8, 'diamonds', 'red'),
      new Card('eight of clubs', 'eight', 8, 'clubs', 'black'),
      new Card('eight of spades', 'eight', 8, 'spades', 'black'),
      new Card('nine of hearts', 'nine', 9, 'hearts', 'red'),
      new Card('nine of diamonds', 'nine', 9, 'diamonds', 'red'),
      new Card('nine of clubs', 'nine', 9, 'clubs', 'black'),
      new Card('nine of spades', 'nine', 9, 'spades', 'black'),
      new Card('ten of hearts', 'ten', 10, 'hearts', 'red'),
      new Card('ten of diamonds', 'ten', 10, 'diamonds', 'red'),
      new Card('ten of clubs', 'ten', 10, 'clubs', 'black'),
      new Card('ten of spades', 'ten', 10, 'spades', 'black'),
      new Card('jack of hearts', 'jack', 11, 'hearts', 'red'),
      new Card('jack of diamonds', 'jack', 11, 'diamonds', 'red'),
      new Card('jack of clubs', 'jack', 11, 'clubs', 'black'),
      new Card('jack of spades', 'jack', 11, 'spades', 'black'),
      new Card('queen of hearts', 'queen', 12, 'hearts', 'red'),
      new Card('queen of diamonds', 'queen', 12, 'diamonds', 'red'),
      new Card('queen of clubs', 'queen', 12, 'clubs', 'black'),
      new Card('queen of spades', 'queen', 12, 'spades', 'black'),
      new Card('king of hearts', 'king', 13, 'hearts', 'red'),
      new Card('king of diamonds', 'king', 13, 'diamonds', 'red'),
      new Card('king of clubs', 'king', 13, 'clubs', 'black'),
      new Card('king of spades', 'king', 13, 'spades', 'black'),
      new Card('ace of hearts', 'ace', 14, 'hearts', 'red'),
      new Card('ace of diamonds', 'ace', 14, 'diamonds', 'red'),
      new Card('ace of clubs', 'ace', 14, 'clubs', 'black'),
      new Card('ace of spades', 'ace', 14, 'spades', 'black'),
    ];
  }

  pullCard(): Card {
    if (this.deck.length === 0) {
      throw new Error('Cannot pull from an empty deck.');
    }
    const randCardNum = Math.floor(Math.random() * this.deck.length);
    const randCard = this.deck[randCardNum];
    this.deck.splice(randCardNum, 1);
    return randCard;
  }
}

export class Hand {
  cards: Card[];

  constructor() {
    this.cards = [];
  }

  organize(): void {
    this.cards = this.cards
      .slice()
      .sort((a, b) => a.value - b.value || a.suit.localeCompare(b.suit));
  }

  addCard(card: Card): void {
    this.cards.push(card);
  }

  flipCard(num: number, card: Card): void {
    this.cards[num] = card;
  }
}
