import express from 'express';
import { randomUUID } from 'crypto';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, createServer, context } from '@devvit/web/server';
import { createPost } from './core/post';
import { GameManager, GameStage, Player, type GameSettings } from './core/gameManager';
import { Character } from './core/StandardCharacter';
import { Opponent as VickiOpponent } from './core/opponents/Vicki';
import { deserializeGame, serializeGame, type SerializedGame } from './reddit_game_store';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

type PlayerConfig = {
  name?: string;
  money?: number;
  maxTries?: number;
  module?: string;
};

type GameCreateRequest = {
  players: PlayerConfig[];
  settings?: GameSettings;
  currency?: string;
  rules?: number;
  isChar?: boolean;
  playerVar?: number;
};

type ChangeModeRequest = {
  mode: GameStage | string;
  tie?: boolean;
};

type ActionRequest = {
  action: string;
  amount?: number;
  indices?: number[];
};

type OpponentInfo = {
  name: string;
  displayName?: string;
  portrait?: string | null;
  media: string[];
};

type StoredClientState = {
  version: number;
  gameId?: string | null;
  selectedOpponent?: string | null;
  playerName?: string | null;
  ageGateAccepted?: boolean;
  disclaimerAccepted?: boolean;
  introWordAccepted?: boolean;
  introSequenceSeen?: boolean;
};

type StoredStats = {
  wins: number;
  losses: number;
  handWins: number;
  handLosses: number;
  gameWins: number;
  gameLosses: number;
  trophies: string[];
};

const STATS_PREFIX = 'poker:stats:';

const gameCache = new Map<string, GameManager>();

function gameKey(gameId: string): string {
  return `poker_game:${gameId}`;
}

function clientStateKey(postId: string, userId: string): string {
  return `poker_state:${postId}:${userId}`;
}

function saveSlotKey(postId: string, userId: string): string {
  return `poker_save:${postId}:${userId}`;
}

function statsKey(): string {
  const identity = context.userId ?? context.username ?? 'anonymous';
  return `${STATS_PREFIX}${identity}`;
}

async function loadStats(): Promise<StoredStats> {
  try {
    const raw = await redis.get(statsKey());
    if (raw) {
      const stored = JSON.parse(raw) as Partial<StoredStats>;
      return {
        wins: stored.wins ?? 0,
        losses: stored.losses ?? 0,
        handWins: stored.handWins ?? 0,
        handLosses: stored.handLosses ?? 0,
        gameWins: stored.gameWins ?? stored.wins ?? 0,
        gameLosses: stored.gameLosses ?? stored.losses ?? 0,
        trophies: Array.isArray(stored.trophies) ? stored.trophies : [],
      };
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
  return {
    wins: 0,
    losses: 0,
    handWins: 0,
    handLosses: 0,
    gameWins: 0,
    gameLosses: 0,
    trophies: [],
  };
}

async function saveStats(stats: StoredStats): Promise<void> {
  try {
    await redis.set(statsKey(), JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save stats:', error);
  }
}

function mergeTrophies(existing: string[], additions: string[]): string[] {
  const next = new Set(existing);
  for (const item of additions) {
    if (typeof item === 'string' && item.trim()) {
      next.add(item);
    }
  }
  return Array.from(next);
}

async function recordHandResult(isWin: boolean): Promise<void> {
  const stats = await loadStats();
  if (isWin) {
    stats.handWins += 1;
  } else {
    stats.handLosses += 1;
  }
  await saveStats(stats);
}

async function recordGameResult(isWin: boolean, trophies: string[] = []): Promise<void> {
  const stats = await loadStats();
  if (isWin) {
    stats.gameWins += 1;
    stats.wins += 1;
    if (trophies.length) {
      stats.trophies = mergeTrophies(stats.trophies, trophies);
    }
  } else {
    stats.gameLosses += 1;
    stats.losses += 1;
  }
  await saveStats(stats);
}

async function saveGame(gameId: string, manager: GameManager): Promise<void> {
  gameCache.set(gameId, manager);
  try {
    const payload = serializeGame(manager);
    await redis.set(gameKey(gameId), JSON.stringify(payload));
  } catch (error) {
    console.error(`Failed to persist game ${gameId}:`, error);
  }
}

async function loadGame(gameId: string): Promise<GameManager | null> {
  const cached = gameCache.get(gameId);
  if (cached) {
    return cached;
  }
  try {
    const raw = await redis.get(gameKey(gameId));
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw);
    const manager = deserializeGame(payload);
    gameCache.set(gameId, manager);
    return manager;
  } catch (error) {
    console.error(`Failed to load game ${gameId}:`, error);
    return null;
  }
}

type BuiltAI = {
  config: PlayerConfig;
  ai: Character;
};

function buildAI(config: PlayerConfig, defaultMoney: number): BuiltAI {
  const money = config.money ?? defaultMoney;
  let ai: Character;
  if (config.module === 'Vicki') {
    ai = new VickiOpponent();
  } else {
    ai = new Character();
  }
  if (config.name) {
    ai.name = config.name;
  }
  ai.money = (ai.money ?? 0) + money;
  ai.totalBet = ai.totalBet ?? 0;
  ai.lastBet = ai.lastBet ?? 0;
  ai.owed = ai.owed ?? 0;
  ai.onTry = ai.onTry ?? 0;
  return { config, ai };
}

function resolveMaxTries(config: PlayerConfig, ai: Character, fallback: number): number {
  const imageCount = Array.isArray(ai.imageMessages) ? ai.imageMessages.length : 0;
  const stripCount = imageCount > 1 ? imageCount - 1 : 0;
  const wardrobeCount = Array.isArray(ai.wardrobeItems) ? ai.wardrobeItems.length : 0;
  const resolved =
    config.maxTries ?? (wardrobeCount > 0 ? wardrobeCount : stripCount > 0 ? stripCount : fallback);
  if (resolved > 0) {
    return resolved;
  }
  return fallback > 0 ? fallback : 1;
}

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.get('/state', async (_req, res): Promise<void> => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    res.status(400).json({ status: 'error', message: 'postId and userId are required' });
    return;
  }
  try {
    const raw = await redis.get(clientStateKey(postId, userId));
    if (!raw) {
      res.json({ status: 'empty' });
      return;
    }
    const stored = JSON.parse(raw) as StoredClientState;
    const gameId = stored?.gameId ?? null;
    let gameState: { id: string; state: ReturnType<GameManager['state']> } | null = null;
    if (gameId) {
      const manager = await loadGame(gameId);
      if (manager) {
        gameState = { id: gameId, state: manager.state() };
      }
    }
    res.json({ status: 'ok', client: stored, game: gameState });
  } catch (error) {
    console.error('Failed to load client state:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load state' });
  }
});

router.post('/state', async (req, res): Promise<void> => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    res.status(400).json({ status: 'error', message: 'postId and userId are required' });
    return;
  }
  const body = req.body as StoredClientState;
  const payload: StoredClientState = {
    version: Number(body?.version ?? 1),
    gameId: body?.gameId ?? null,
    selectedOpponent: body?.selectedOpponent ?? null,
    playerName: body?.playerName ?? null,
    ageGateAccepted: Boolean(body?.ageGateAccepted),
    disclaimerAccepted: Boolean(body?.disclaimerAccepted),
    introWordAccepted: Boolean(body?.introWordAccepted),
    introSequenceSeen: Boolean(body?.introSequenceSeen),
  };
  try {
    await redis.set(clientStateKey(postId, userId), JSON.stringify(payload));
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to save client state:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save state' });
  }
});

router.post('/state/reset', async (_req, res): Promise<void> => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    res.status(400).json({ status: 'error', message: 'postId and userId are required' });
    return;
  }
  try {
    await redis.del(clientStateKey(postId, userId));
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to reset client state:', error);
    res.status(500).json({ status: 'error', message: 'Failed to reset state' });
  }
});

router.post('/save', async (req, res): Promise<void> => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    res.status(400).json({ status: 'error', message: 'postId and userId are required' });
    return;
  }
  const body = req.body as { gameId?: string };
  const gameId = body?.gameId ?? '';
  if (!gameId) {
    res.status(400).json({ status: 'error', message: 'gameId is required' });
    return;
  }
  const manager = await loadGame(gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  try {
    const payload = serializeGame(manager);
    const record = { id: gameId, payload, savedAt: new Date().toISOString() };
    await redis.set(saveSlotKey(postId, userId), JSON.stringify(record));
    res.json({ status: 'ok', id: gameId });
  } catch (error) {
    console.error('Failed to save game snapshot:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save game' });
  }
});

router.post('/load', async (_req, res): Promise<void> => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    res.status(400).json({ status: 'error', message: 'postId and userId are required' });
    return;
  }
  try {
    const raw = await redis.get(saveSlotKey(postId, userId));
    if (!raw) {
      res.status(404).json({ status: 'error', message: 'No saved game found' });
      return;
    }
    const parsed = JSON.parse(raw) as { id?: string; payload?: unknown };
    if (!parsed?.payload) {
      res.status(400).json({ status: 'error', message: 'Saved game is invalid' });
      return;
    }
    const manager = deserializeGame(parsed.payload as SerializedGame);
    const gameId = parsed.id ?? randomUUID();
    await saveGame(gameId, manager);
    res.json({ status: 'ok', id: gameId, state: manager.state() });
  } catch (error) {
    console.error('Failed to load game snapshot:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load game' });
  }
});

router.get('/opponents', async (_req, res): Promise<void> => {
  const opponents: OpponentInfo[] = [
    {
      name: 'Vicki',
      displayName: new VickiOpponent().name,
      portrait: '/opponents/Vicki/Vportrait.png',
      media: [
        '/opponents/Vicki/V_images/V1.png',
        '/opponents/Vicki/V_images/V2.png',
        '/opponents/Vicki/V_images/V3.png',
        '/opponents/Vicki/V_images/V4.png',
        '/opponents/Vicki/V_images/V5.png',
        '/opponents/Vicki/V_images/V6.png',
      ],
    },
  ];
  res.json(opponents);
});

router.post('/games', async (req, res): Promise<void> => {
  const body = req.body as GameCreateRequest;
  const settings: GameSettings = body.settings ?? {};
  const defaultMoney = settings.startMoney ?? 200;
  const built = (body.players ?? []).map((player) => buildAI(player, defaultMoney));
  const maxImageCount = built.reduce((max, entry) => {
    const count = Array.isArray(entry.ai.imageMessages) ? entry.ai.imageMessages.length : 0;
    return Math.max(max, count);
  }, 0);
  const fallbackMaxTries = Math.max(maxImageCount - 1, 1);
  const players = built.map(
    ({ config, ai }) => new Player(ai, resolveMaxTries(config, ai, fallbackMaxTries))
  );
  const manager = new GameManager({
    characters: players,
    settings,
    currency: body.currency ?? '$',
    playerVar: body.playerVar ?? 0,
    isChar: body.isChar ?? false,
    rules: body.rules ?? 0,
  });
  const gameId = randomUUID();
  await saveGame(gameId, manager);
  res.json({ id: gameId, state: manager.state() });
});

router.get('/games/:gameId', async (req, res): Promise<void> => {
  const manager = await loadGame(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  res.json({ id: req.params.gameId, state: manager.state() });
});

router.post('/games/:gameId/mode', async (req, res): Promise<void> => {
  const manager = await loadGame(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  const body = req.body as ChangeModeRequest;
  manager.change_mode(body.mode, body.tie ?? false);
  await saveGame(req.params.gameId, manager);
  res.json({ id: req.params.gameId, state: manager.state() });
});

router.post('/games/:gameId/action', async (req, res): Promise<void> => {
  const manager = await loadGame(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  const body = req.body as ActionRequest;
  try {
    manager.poker_action(body.action, body.amount, body.indices);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown action error';
    res.status(400).json({ status: 'error', message });
    return;
  }
  await saveGame(req.params.gameId, manager);
  res.json({ id: req.params.gameId, state: manager.state() });
});

router.post('/games/:gameId/messages', async (req, res): Promise<void> => {
  const manager = await loadGame(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  const drained = [];
  let msg = manager.next_message();
  while (msg) {
    drained.push(msg);
    msg = manager.next_message();
  }
  const playerName = manager.characters[manager.playerVar]?.AI.name ?? '';
  let sawGameOver = false;
  for (const entry of drained) {
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    if (tags.includes('game_over')) {
      sawGameOver = true;
    }
    if (
      entry.assoc_action === 'end_round' &&
      tags.includes('win') &&
      typeof entry.text === 'string' &&
      entry.text.includes('wins the pot')
    ) {
      const winnerName = entry.name || entry.text.split(' wins the pot')[0];
      const isWin = winnerName === playerName;
      await recordHandResult(isWin);
    }
  }
  if (sawGameOver && manager.gameStage === GameStage.GAME_OVER) {
    const winnerName = manager.state().winnerName ?? '';
    const isWin = winnerName === playerName && Boolean(playerName);
    const opponent =
      manager.characters.find((_player, idx) => idx !== manager.playerVar)?.AI ?? null;
    const trophies = isWin && opponent ? opponent.wardrobeItems ?? [] : [];
    await recordGameResult(isWin, trophies);
  }
  await saveGame(req.params.gameId, manager);
  res.json(drained);
});

// Use router middleware
app.use(router);
// Devvit webview expects API routes under /api
app.use('/api', router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
