# Reddit Poker Game 🃏

A complete 5-card draw poker game with strip poker mechanics, built for Reddit using Devvit.

## 🎮 Features

- **Full Poker Logic**: 5-card draw poker with betting rounds, drawing phase, and showdown
- **AI Opponent**: Play against Victoria with personality-driven dialogue and strategic decisions
- **Strip Poker Mechanics**: Lose clothes as you lose money (6 stages of undressing)
- **Multiple Interfaces**:
  - Legacy HTML interface with mobile action drawer
  - Modern React web interface
  - Reddit integration via Devvit
- **Rich Audio/Visual**: Sound effects, animations, and custom artwork
- **Local Testing**: Complete local development server

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start local server:**
   ```bash
   npm run local
   ```

3. **Open browser:**
   - Navigate to `http://localhost:3000`
   - Start a game against Victoria
   - Test mobile drawer and strip mechanics

### Reddit Deployment

1. **Install Devvit CLI:**
   ```bash
   npm install -g devvit
   ```

2. **Login to Reddit:**
   ```bash
   npx devvit login --copy-paste
   ```

3. **Build and deploy:**
   ```bash
   npm run deploy
   npm run dev:devvit  # Test on your subreddit
   ```

## 🎯 Game Features

### Poker Mechanics
- **Betting Rounds**: First round betting, draw phase, second round betting
- **Hand Evaluation**: Full poker hand ranking (Royal Flush → High Card)
- **AI Strategy**: Victoria makes intelligent bets and draw decisions
- **Debt System**: Go into debt and strip clothes to continue playing

### Strip Poker
- **6 Stages**: Progressive undressing as money decreases
- **Visual Feedback**: Custom artwork for each strip stage
- **Strategic Gameplay**: Risk losing clothes vs folding/calling

### UI/UX
- **Mobile Responsive**: Touch-friendly interface with action drawer
- **Audio Effects**: Sound feedback for actions and results
- **Smooth Animations**: Card dealing, betting, and transitions
- **Accessibility**: Screen reader support and keyboard navigation

## 🏗️ Architecture

```
src/
├── client/          # Legacy HTML interface
├── server/          # Game logic and API
│   ├── core/        # Poker engine, AI, cards
│   ├── local.ts     # Local development server
│   └── index.ts     # Devvit server
├── shared/          # TypeScript types and utilities
└── web/             # React web interface
```

### Key Components

- **GameManager**: Core poker logic and state management
- **StandardCharacter**: AI opponent behavior and dialogue
- **Victoria**: Custom AI with personality and strip messages
- **GameShell**: React UI with mobile layouts

## 📋 Game Flow

1. **Start Round**: Deal 5 cards, post antes
2. **First Betting**: Bet/raise/stay/call/fold
3. **Draw Phase**: Discard and draw new cards
4. **Second Betting**: Final betting round
5. **Showdown**: Reveal hands and determine winner
6. **Strip Check**: Lose clothes if out of money

## 🎨 Customization

### Adding New Opponents
1. Create new opponent in `src/server/core/opponents/`
2. Implement `Character` subclass with custom messages
3. Add strip images to `src/client/public/opponents/`
4. Update opponent registry

### Modifying Game Rules
- Edit betting limits in `GameManager`
- Adjust AI behavior in `StandardCharacter`
- Modify hand evaluation in `basicUtils.ts`

## 🐛 Troubleshooting

### Common Issues

**Mobile drawer doesn't close:**
- Check that `setControlsOpen(false)` is called in all action handlers
- Verify `src/client/public/static/app.js` has the latest changes

**Opponent doesn't strip completely:**
- Ensure `maxTries` uses `imageMessages.length` (should be 6 for Victoria)
- Check `resolveMaxTries` function in `local.ts`

**Devvit deployment fails:**
- Run `npm run build` first
- Ensure you're logged in with `npx devvit login`
- Check that your subreddit exists and you have permissions

### Development Commands

```bash
# Full rebuild
npm run build

# Type checking
npm run check

# Local testing
npm run local

# Reddit testing
npm run dev:devvit
```

## 📖 Documentation

- `docs/game-flow.md`: Complete game logic documentation
- `docs/ui-dev.md`: UI implementation details
- `MIGRATION.md`: Migration guide for different interfaces

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run local`
5. Submit a pull request

## 📄 License

BSD-3-Clause License

## 🎮 Play Now

Ready to lose your shirt? Start a game at `http://localhost:3000` or deploy to your Reddit community!
