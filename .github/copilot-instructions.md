# Enhanced AI Coding Agent Guidelines for Optimized Reddit App Development

## Overview
This repository is designed to build a professional, high-performance Reddit app using Devvit. The app emphasizes:
- **TypeScript Best Practices**: Strict typing, modular architecture, and separation of concerns.
- **Interactive Graphics**: Leveraging Pixi.js for animations and game visuals.
- **State Management**: Zustand for simplicity and performance.
- **Responsive UI**: Optimized for both desktop and mobile using React and Devvit Blocks.
- **NSFW Handling**: Open implementation of adult themes (e.g., strip poker visuals).

## Optimized Project Setup
### Initial Setup
1. **Create Project**: Run `devvit new my-reddit-app --template react`.
2. **TypeScript Configuration**: Update `tsconfig.json`:
   ```json
   {
     "strict": true,
     "noImplicitAny": true,
     "esModuleInterop": true
   }
   ```
3. **Install Dependencies**:
   ```bash
   npm install pixi.js zustand @pixi/react @media-query/react
   npm install eslint @typescript-eslint/parser --save-dev
   ```

### Folder Structure
- `src/components`: React components (UI logic).
- `src/stores`: Zustand stores (state management).
- `src/logic`: Business/game logic (pure TypeScript).
- `src/assets`: Images, Pixi.js sprites.
- `src/utils`: Helper functions.

## Integration with MCP and Best Practices
### VS Code Configuration
- Enable Copilot auto-complete for TypeScript in `.vscode/settings.json`.

### Devvit and Pixi.js Integration
- Query MCP for best practices: `/devvit_search best practices for Devvit + Pixi.js performance`.
- Offload heavy rendering to WebGL via Pixi.js.

### TypeScript and ESLint Rules
- Use interfaces and types consistently:
  ```typescript
  interface GameState {
    onTry: number;
    debt: number;
  }
  ```
- Enforce ESLint rules for no `any` and immutable data.

## Building Optimized Code
### State Management
Create Zustand store in `src/stores/gameStore.ts`:
```typescript
import { create } from 'zustand';

interface State {
  debt: number;
  onTry: number;
  actions: {
    updateDebt: (val: number) => void;
  };
}

export const useGameStore = create<State>((set) => ({
  debt: 0,
  onTry: 0,
  actions: {
    updateDebt: (val) => set({ debt: val, onTry: Math.ceil(val / 100) })
  }
}));
```

### Interactive Graphics with Pixi.js
Create `src/components/GameCanvas.tsx`:
```tsx
import * as PIXI from 'pixi.js';
import { Application, Sprite } from '@pixi/react';
import { useGameStore } from '../stores/gameStore';

const GameCanvas = () => {
  const { onTry } = useGameStore();

  return (
    <Application width={window.innerWidth} height={300} backgroundColor={0x1099bb}>
      <Sprite image={`/assets/strip-level-${onTry}.png`} x={150} y={150} />
    </Application>
  );
};

export default GameCanvas;
```

### Responsive UI
Use Devvit Blocks with media queries:
```tsx
import { useMediaQuery } from '@media-query/react';
import GameCanvas from './GameCanvas';

const ResponsiveLayout = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <blocks>
      <vstack width={isMobile ? '100%' : '50%'}>
        <GameCanvas />
      </vstack>
    </blocks>
  );
};

export default ResponsiveLayout;
```

## Performance and UX Optimization
### Performance
- Profile with Chrome DevTools.
- Use `React.memo` for memoization.
- Lazy load Pixi assets.
- Optimize images (e.g., WebP).

### User Experience
- Implement responsive breakpoints.
- Add dark mode using Devvit themes.
- Smooth transitions for NSFW visuals (e.g., image fades).

## Deployment
1. Build the app: `npm run build`.
2. Deploy to Reddit: `devvit upload`.
3. Use MCP for performance logs and debugging.

## Success Criteria
- Modular TypeScript code.
- Smooth performance on web and mobile.
- Interactive Pixi.js graphics.
- Zustand for efficient state management.
- Open handling of NSFW themes (e.g., explicit image swaps).
