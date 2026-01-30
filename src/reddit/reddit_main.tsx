import { Devvit, useEffect, useState } from '@devvit/public-api';
import type { Context } from '@devvit/public-api';
import { reddit_load_stats, reddit_record_result, type RedditStats } from './reddit_stats';

Devvit.configure({
  redditAPI: true,
  kvStore: true,
});

function getStatsKeyLabel(context: Context): string {
  return context.username ?? context.userId ?? 'Player';
}

Devvit.addCustomPostType({
  name: 'Poker Nights',
  description: 'Poker lounge (Devvit mode).',
  render: (context: Context) => {
    const playerLabel = getStatsKeyLabel(context);
    const [stats, setStats] = useState<RedditStats>({ wins: 0, losses: 0 });

    useEffect(() => {
      void reddit_load_stats(context).then(setStats).catch(() => {
        setStats({ wins: 0, losses: 0 });
      });
    }, []);

    const recordWin = () => {
      void reddit_record_result(context, 'win').then(setStats);
    };

    const recordLoss = () => {
      void reddit_record_result(context, 'loss').then(setStats);
    };

    return (
      <vstack gap="small" padding="small">
        <text size="xlarge">Poker Nights</text>
        <text>
          Player: {playerLabel} | Wins: {stats.wins} | Losses: {stats.losses}
        </text>
        <hstack gap="small">
          <button onPress={recordWin}>Add Win</button>
          <button onPress={recordLoss}>Add Loss</button>
        </hstack>
        <text size="small">Devvit UI scaffold. Local web UI remains the source of truth.</text>
      </vstack>
    );
  },
});

export default Devvit;
