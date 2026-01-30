import type { Context } from '@devvit/public-api';

export type RedditStats = {
  wins: number;
  losses: number;
  handWins: number;
  handLosses: number;
  gameWins: number;
  gameLosses: number;
  trophies: string[];
};

const STATS_PREFIX = 'poker:stats:';

function statsKey(context: Context): string {
  const identity = context.userId ?? context.username ?? 'anonymous';
  return `${STATS_PREFIX}${identity}`;
}

export async function reddit_load_stats(context: Context): Promise<RedditStats> {
  const key = statsKey(context);
  const stored = await context.kvStore.get<RedditStats>(key);
  if (stored && typeof stored.wins === 'number' && typeof stored.losses === 'number') {
    return {
      wins: stored.wins,
      losses: stored.losses,
      handWins: stored.handWins ?? 0,
      handLosses: stored.handLosses ?? 0,
      gameWins: stored.gameWins ?? stored.wins ?? 0,
      gameLosses: stored.gameLosses ?? stored.losses ?? 0,
      trophies: Array.isArray(stored.trophies) ? stored.trophies : [],
    };
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

export async function reddit_record_result(
  context: Context,
  result: 'win' | 'loss'
): Promise<RedditStats> {
  const current = await reddit_load_stats(context);
  const next: RedditStats = {
    wins: current.wins + (result === 'win' ? 1 : 0),
    losses: current.losses + (result === 'loss' ? 1 : 0),
    handWins: current.handWins,
    handLosses: current.handLosses,
    gameWins: current.gameWins + (result === 'win' ? 1 : 0),
    gameLosses: current.gameLosses + (result === 'loss' ? 1 : 0),
    trophies: current.trophies,
  };
  await context.kvStore.put(statsKey(context), next);
  return next;
}
