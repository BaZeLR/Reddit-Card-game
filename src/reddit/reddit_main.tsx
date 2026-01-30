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

function CardFan({ cards, isOpponent = false, width, height }: {
  cards: string[];
  isOpponent?: boolean;
  width: number;
  height: number;
}): JSX.Element {
  const overlapOffset = -25;
  const totalWidth = Math.min(180, cards.length * (width + overlapOffset) + width);

  return (
    <hstack
      position="absolute"
      width={totalWidth}
      height={height}
      style={{
        top: isOpponent ? `${15 + Math.random() * 10}%` : `${65 + Math.random() * 5}%`,
        right: isOpponent ? `${5 + Math.random() * 5}%` : undefined,
        left: isOpponent ? undefined : '50%',
        transform: isOpponent ? undefined : 'translateX(-50%)',
      }}
    >
      {cards.map((cardCode, index) => {
        const imageUrl = isOpponent
          ? 'https://deckofcardsapi.com/static/img/back.png'
          : `https://deckofcardsapi.com/static/img/${cardCode}.png`;

        return (
          <image
            key={index}
            url={imageUrl}
            imageWidth={width}
            imageHeight={height}
            width={width}
            height={height}
            style={{
              position: 'absolute',
              left: `${index * (width + overlapOffset)}px`,
              zIndex: index + 1,
            }}
          />
        );
      })}
    </hstack>
  );
}

Devvit.addCustomPostType({
  name: 'Poker Nights',
  description: 'Poker lounge (Devvit mode).',
  render: (context: Context) => {
    const playerLabel = getStatsKeyLabel(context);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [gameStage, setGameStage] = useState('bet_and_stay');
    const [playerChips, setPlayerChips] = useState(195);
    const [pot, setPot] = useState(10);
    const [toCall, setToCall] = useState(0);
    const [opponentMessage, setOpponentMessage] = useState('Victoria stays');

    const { dimensions } = context;
    const cardWidth = Math.min(45, dimensions?.width * 0.12 || 45);
    const cardHeight = cardWidth * 1.5;
    const fontSize = Math.max(12, Math.min(16, dimensions?.width * 0.04 || 14));

    const opponentCards = ['back', 'back', 'back', 'back', 'back'];
    const playerCards = ['AH', 'KH', 'QH', 'JH', '10H'];

    const handleAction = (action: string, amount?: number) => {
      setOpponentMessage(`Victoria ${action === 'call' ? 'calls' : action === 'stay' ? 'stays' : 'folds'}`);
      setPlayerChips(prev => prev - (amount || 0));
      setPot(prev => prev + (amount || 0));
      setToCall(0);
      setGameStage('bet_and_call');
      setDrawerOpen(false);
      context.ui.showToast(`Player ${action}${amount ? ` ${amount}` : ''}`);
    };

    return (
      <vstack width="100%" height="100vh" backgroundColor="#0f1e2d">
        {/* Top Header */}
        <hstack padding="small" alignment="center middle">
          <text size={fontSize} color="#f6e6bd">Stage: {gameStage}</text>
          <spacer />
          <text size={fontSize} color="#f6e6bd">System: Place your bets</text>
          <spacer />
          <button
            text="PLAYING VS VICTORIA"
            appearance="primary"
            textColor="#f6e6bd"
            backgroundColor="#2b83f6"
            size="small"
          />
        </hstack>

        <spacer grow />

        {/* Opponent Section */}
        <vstack height="25%" alignment="center">
          {/* Opponent Message */}
          <hstack
            padding="small"
            backgroundColor="rgba(16, 28, 43, 0.8)"
            border="thick"
            borderColor="#2b83f6"
            cornerRadius="medium"
            margin="small"
          >
            <text size={fontSize} color="#e9f0f6">{opponentMessage}</text>
          </hstack>

          {/* Victoria Image */}
          <image
            url="/opponents/Vicki/V_images/V1.png"
            imageWidth={120}
            imageHeight={180}
            width={120}
            height={180}
            style={{ marginTop: '10px' }}
          />
        </vstack>

        <spacer grow />

        {/* Middle Game Area */}
        <vstack height="25%" alignment="center middle">
          {/* Pot and To Call */}
          <hstack gap="large" alignment="center">
            <vstack alignment="center">
              <text size={fontSize} color="#d4af37">$</text>
              <text size={fontSize * 1.2} color="#f6e6bd" weight="bold">Pot: {pot}</text>
            </vstack>
            <vstack alignment="center">
              <text size={fontSize} color="#e9f0f6">To Call</text>
              <text size={fontSize * 1.2} color="#4ade80">{toCall}</text>
            </vstack>
          </hstack>
        </vstack>

        <spacer grow />

        {/* Bottom Player Section */}
        <vstack height="35%" alignment="bottom">
          {/* Player Chips */}
          <hstack padding="small" alignment="start">
            <text size={fontSize} color="#4ade80">
              &gt; {playerLabel}: {playerChips}
            </text>
            <spacer />
            <icon name="settings" color="#e9f0f6" />
          </hstack>
        </vstack>

        {/* Card Fans */}
        <CardFan cards={opponentCards} isOpponent={true} width={cardWidth} height={cardHeight} />
        <CardFan cards={playerCards} isOpponent={false} width={cardWidth} height={cardHeight} />

        {/* Drawer Toggle Button */}
        <button
          icon="menu"
          appearance="primary"
          backgroundColor="#2b83f6"
          size="large"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
          }}
          onPress={() => setDrawerOpen(!drawerOpen)}
        />

        {/* Action Drawer */}
        {drawerOpen && (
          <vstack
            position="absolute"
            top="0"
            right="0"
            width="80%"
            height="100%"
            backgroundColor="rgba(15, 30, 61, 0.95)"
            border="left"
            borderColor="#2b83f6"
            padding="large"
            gap="medium"
          >
            <button
              text="Bet 50"
              appearance="primary"
              backgroundColor="#f6e6bd"
              textColor="#000"
              onPress={() => handleAction('bet', 50)}
            />
            <button
              text="Raise"
              appearance="secondary"
              backgroundColor="#8b6a3d"
              onPress={() => handleAction('raise')}
            />
            <button
              text="Stay"
              appearance="secondary"
              backgroundColor="#8b6a3d"
              onPress={() => handleAction('stay')}
            />
            <button
              text="Call"
              appearance="primary"
              backgroundColor="#06b6d4"
              onPress={() => handleAction('call')}
            />
            <button
              text="Fold"
              appearance="primary"
              backgroundColor="#06b6d4"
              onPress={() => handleAction('fold')}
            />
            <button
              text="Buy Lady a Drink (50)"
              appearance="primary"
              backgroundColor="#a855f7"
              onPress={() => handleAction('drink', 50)}
            />
            <button
              text="Draw Cards"
              appearance="secondary"
              backgroundColor="#8b6a3d"
              onPress={() => handleAction('draw')}
            />
            <button
              text="Showdown"
              appearance="primary"
              backgroundColor="#2b83f6"
              onPress={() => handleAction('showdown')}
            />
          </vstack>
        )}
      </vstack>
    );
  },
});

export default Devvit;
