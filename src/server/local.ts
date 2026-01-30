import express from 'express';
import { randomUUID } from 'crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { GameManager, type GameSettings, Player } from './core/gameManager';
import { Character } from './core/StandardCharacter';
import { Opponent as VickiOpponent } from './core/opponents/Vicki';
import { deserializeGame, serializeGame, type SerializedGame } from './reddit_game_store';

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
  mode: string;
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

const games = new Map<string, GameManager>();
const saveDir = path.resolve(process.cwd(), 'local_saves');
const saveFile = path.join(saveDir, 'poker_save.json');

type LocalSaveFile = {
  id: string;
  payload: SerializedGame;
  savedAt: string;
};

async function writeSaveFile(gameId: string, manager: GameManager): Promise<void> {
  const payload = serializeGame(manager);
  const record: LocalSaveFile = {
    id: gameId,
    payload,
    savedAt: new Date().toISOString(),
  };
  await fs.mkdir(saveDir, { recursive: true });
  await fs.writeFile(saveFile, JSON.stringify(record, null, 2), 'utf8');
}

async function readSaveFile(): Promise<LocalSaveFile | null> {
  try {
    const raw = await fs.readFile(saveFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalSaveFile>;
    if (!parsed || !parsed.payload) {
      return null;
    }
    return {
      id: parsed.id ?? randomUUID(),
      payload: parsed.payload,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
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
  const resolved = config.maxTries ?? (imageCount > 1 ? imageCount - 1 : fallback);
  if (resolved > 0) {
    return resolved;
  }
  return fallback > 0 ? fallback : 1;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

app.get('/opponents', (_req, res) => {
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

// Mirror API under /api for parity with Devvit webview
app.get('/api/opponents', (_req, res) => {
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

app.post('/games', (req, res) => {
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
  games.set(gameId, manager);
  res.json({ id: gameId, state: manager.state() });
});

app.post('/api/games', (req, res) => {
  const body = req.body as GameCreateRequest;
  const settings: GameSettings = body.settings ?? {};
  const defaultMoney = settings.startMoney ?? 200;
  const built = (body.players ?? []).map((player) => buildAI(player, defaultMoney));
  const maxImageCount = built.reduce((max, entry) => {
    const count = Array.isArray(entry.ai.imageMessages) ? entry.ai.imageMessages.length : 0;
    return Math.max(max, count);
  }, 0);
  const fallbackMaxTries = Math.max(maxImageCount, 1);
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
  games.set(gameId, manager);
  res.json({ id: gameId, state: manager.state() });
});

app.post('/save', async (req, res) => {
  const body = req.body as { gameId?: string };
  const gameId = body?.gameId ?? '';
  if (!gameId) {
    res.status(400).json({ status: 'error', message: 'gameId is required' });
    return;
  }
  const manager = games.get(gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  await writeSaveFile(gameId, manager);
  res.json({ status: 'ok', id: gameId });
});

app.post('/load', async (_req, res) => {
  const saved = await readSaveFile();
  if (!saved) {
    res.status(404).json({ status: 'error', message: 'No saved game found' });
    return;
  }
  const manager = deserializeGame(saved.payload);
  const gameId = saved.id ?? randomUUID();
  games.set(gameId, manager);
  res.json({ status: 'ok', id: gameId, state: manager.state() });
});

app.get('/games/:gameId', (req, res) => {
  const manager = games.get(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  res.json({ id: req.params.gameId, state: manager.state() });
});

app.get('/api/games/:gameId', (req, res) => {
  const manager = games.get(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  res.json({ id: req.params.gameId, state: manager.state() });
});

app.post('/games/:gameId/mode', (req, res) => {
  const manager = games.get(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  const body = req.body as ChangeModeRequest;
  manager.change_mode(body.mode, body.tie ?? false);
  res.json({ id: req.params.gameId, state: manager.state() });
});

app.post('/api/games/:gameId/mode', (req, res) => {
  const manager = games.get(req.params.gameId);
  if (!manager) {
    res.status(404).json({ status: 'error', message: 'Game not found' });
    return;
  }
  const body = req.body as ChangeModeRequest;
  manager.change_mode(body.mode, body.tie ?? false);
  res.json({ id: req.params.gameId, state: manager.state() });
});

app.post('/games/:gameId/action', (req, res) => {
  const manager = games.get(req.params.gameId);
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
  res.json({ id: req.params.gameId, state: manager.state() });
});

app.post('/api/games/:gameId/action', (req, res) => {
  const manager = games.get(req.params.gameId);
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
  res.json({ id: req.params.gameId, state: manager.state() });
});

app.post('/games/:gameId/messages', (req, res) => {
  const manager = games.get(req.params.gameId);
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
  res.json(drained);
});

app.post('/api/games/:gameId/messages', (req, res) => {
  const manager = games.get(req.params.gameId);
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
  res.json(drained);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '..', 'client');
const publicDir = path.resolve(clientDir, 'public');
const gameHtml = path.resolve(clientDir, 'game.html');

app.get('/', (_req, res) => {
  res.sendFile(gameHtml);
});

app.use(
  express.static(publicDir, {
    fallthrough: true,
    etag: false,
    maxAge: 0,
  })
);

const port = Number(process.env.LOCAL_PORT ?? 3000);
app.listen(port, () => {
  console.log(`Local poker server running at http://localhost:${port}`);
});
