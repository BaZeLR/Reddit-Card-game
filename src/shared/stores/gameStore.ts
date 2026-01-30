import { create } from 'zustand';

interface GameCharacter {
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
}

interface GameState {
  characters: GameCharacter[];
  pot: number;
  toPot: number;
  dealer: number;
  currentlyOn: number;
  gameStage: string;
  betCap: number;
  maxBet: number;
  ante: number;
  winnerName: string;
  messageQueue: Array<{ name: string; text: string; assoc_action: string; tags: string[] }>;
  stripImages: Record<string, string | null>;
  stripIndices: Record<string, number>;
  debtNotified: Record<string, number>;
  revealHands: boolean;
  status: string;
  gameId: string | null;
}

interface GameActions {
  updateState: (newState: Partial<GameState>) => void;
  addMessage: (message: { name: string; text: string; assoc_action: string; tags: string[] }) => void;
  nextMessage: () => { name: string; text: string; assoc_action: string; tags: string[] } | null;
  // Add other actions as needed
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  // Initial state
  characters: [],
  pot: 0,
  toPot: 0,
  dealer: 0,
  currentlyOn: 0,
  gameStage: 'not_started',
  betCap: 0,
  maxBet: 0,
  ante: 5,
  winnerName: '',
  messageQueue: [],
  stripImages: {},
  stripIndices: {},
  debtNotified: {},
  revealHands: false,
  status: '',
  gameId: null,

  // Actions
  updateState: (newState) => set((state) => ({ ...state, ...newState })),
  addMessage: (message) => set((state) => ({ ...state, messageQueue: [...state.messageQueue, message] })),
  nextMessage: () => {
    const state = get();
    if (state.messageQueue.length === 0) return null;
    const [next, ...rest] = state.messageQueue;
    set({ messageQueue: rest });
    return next;
  },
}));
