# Devvit Web Migration

This repo now has a Devvit Web (React webview) client alongside the legacy local HTML version.

## Structure
- `src/web/` - Devvit Web React client (entrypoint `src/web/index.html`).
- `src/web/public/` - Static assets for Devvit Web (`/assets`, `/cards`, `/opponents`, `/static`).
- `src/server/index.ts` - Devvit Web server endpoints (`/api/*`).
- `src/client/` - Legacy local HTML UI (unchanged, still runnable with `npm run local`).

## State storage (source of truth)
Devvit Redis is used for persistence:
- Client mapping: `poker_state:{postId}:{userId}` (stores gameId, opponent, playerName).
- Game state: `poker_game:{gameId}` (serialized GameManager).

## Run / playtest
Build and deploy:
```bash
npm run build
devvit upload
devvit playtest r/<your_subreddit>
```

Local legacy (no Devvit):
```bash
npm run local
```

## Add assets
Place new assets in `src/web/public/assets` (or `cards`, `opponents`, `static`).
Keep the legacy copies in `src/client/public` if you want local to stay in sync.

## Debugging
- Check server logs for Redis state errors.
- If the UI fails to load, confirm `dist/client/index.html` exists after build.
- If state does not restore, clear Redis state via `/api/state/reset`.

## Smoke test checklist
1) Open the app in a test subreddit post.
2) Start a game; confirm actions update state.
3) Refresh the page; game state should restore.
4) Use the "Quit" flow; state should reset.
5) Start a new game and verify opponent selection persists.
