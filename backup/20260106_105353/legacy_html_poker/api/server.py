"""FastAPI server exposing a lightweight poker game manager and serving the UI."""
from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import importlib.util

from poker.game_manager import GameManager, GameStage, Player

app = FastAPI(title="Poker Game Manager API")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
CARDS_DIR = Path(__file__).resolve().parent.parent / "cards"
OPPONENTS_DIR = Path(__file__).resolve().parents[2] / "opponents"
PROJECT_ROOT = Path(__file__).resolve().parent.parent  # .../HTML poker
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(OPPONENTS_DIR.parent) not in sys.path:
    sys.path.insert(0, str(OPPONENTS_DIR.parent))
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
if CARDS_DIR.exists():
    app.mount("/cards", StaticFiles(directory=CARDS_DIR), name="cards")
if OPPONENTS_DIR.exists():
    app.mount("/opponents", StaticFiles(directory=OPPONENTS_DIR), name="opponents")


@app.get("/", response_class=HTMLResponse)
def load_frontend() -> HTMLResponse:
    """Serve the HTML5 control panel for the headless engine."""
    if not FRONTEND_DIR.exists():
        return HTMLResponse("<p>Frontend folder missing.</p>", status_code=404)

    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        return HTMLResponse("<p>index.html not found.</p>", status_code=404)

    return HTMLResponse(index_path.read_text(encoding="utf-8"))


GAMES: Dict[str, GameManager] = {}

def _load_opponent_class(folder_name: str):
    folder = OPPONENTS_DIR / folder_name
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(status_code=400, detail=f"Opponent folder not found: {folder_name}")

    # Prefer common filenames, otherwise pick the first non-init .py
    for candidate in ("main.py", f"{folder_name}.py", "V.py"):
        path = folder / candidate
        if path.exists():
            break
    else:
        py_files = [p for p in folder.glob("*.py") if p.name != "__init__.py"]
        path = py_files[0] if py_files else None

    if not path:
        raise HTTPException(status_code=400, detail=f"No opponent script found in {folder_name}")

    module_name = f"opponent_{folder_name.replace(' ', '_')}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    if not spec or not spec.loader:
        raise HTTPException(status_code=500, detail="Failed to load opponent module")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)  # type: ignore[attr-defined]

    if not hasattr(module, "Opponent"):
        raise HTTPException(status_code=400, detail="Opponent class not found in module")
    return module.Opponent


def build_player(cfg: PlayerConfig) -> Player:
    """Create a Player from config, loading opponent module when provided."""
    if cfg.module:
        OppClass = _load_opponent_class(cfg.module)
        ai = OppClass()
        # Ensure baseline numeric fields exist and align to requested money
        ai.money = getattr(ai, "money", 0) + cfg.money
        ai.totalBet = getattr(ai, "totalBet", 0)
        ai.lastBet = getattr(ai, "lastBet", 0)
        ai.owed = getattr(ai, "owed", 0)
        ai.onTry = getattr(ai, "onTry", 0)
        if not hasattr(ai, "cards"):
            ai.cards = []
    else:
        from opponents.StandardCharacter import Character

        ai = Character()
        ai.money = getattr(ai, "money", 0) + cfg.money
        ai.name = cfg.name or "Opponent"

    if cfg.name:
        ai.name = cfg.name
    elif not getattr(ai, "name", None):
        ai.name = cfg.module or "Opponent"

    return Player(AI=ai, maxTries=cfg.maxTries)


class PlayerConfig(BaseModel):
    name: str
    money: int = Field(default=200)
    maxTries: int = Field(default=3, ge=1)
    module: Optional[str] = None


class GameCreateRequest(BaseModel):
    players: List[PlayerConfig]
    settings: Dict[str, Any] = Field(default_factory=dict)
    currency: str = "$"
    rules: int = 0
    isChar: bool = False
    playerVar: int = 0


class ChangeModeRequest(BaseModel):
    mode: GameStage
    tie: bool = False


class ActionRequest(BaseModel):
    action: str
    amount: Optional[int] = None
    indices: Optional[List[int]] = None


class GameStateResponse(BaseModel):
    id: str
    state: Dict[str, Any]


class OpponentInfo(BaseModel):
    name: str  # folder/module identifier
    displayName: Optional[str] = None
    portrait: Optional[str] = None
    media: List[str] = Field(default_factory=list)


@app.post("/games", response_model=GameStateResponse)
def create_game(req: GameCreateRequest) -> GameStateResponse:
    characters = [build_player(p) for p in req.players]
    manager = GameManager(
        characters=characters,
        settings=req.settings,
        currency=req.currency,
        playerVar=req.playerVar,
        isChar=req.isChar,
        rules=req.rules,
    )
    game_id = str(uuid.uuid4())
    GAMES[game_id] = manager
    return GameStateResponse(id=game_id, state=manager.state())


@app.get("/games/{game_id}", response_model=GameStateResponse)
def get_state(game_id: str) -> GameStateResponse:
    manager = GAMES.get(game_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Game not found")
    return GameStateResponse(id=game_id, state=manager.state())


@app.post("/games/{game_id}/mode", response_model=GameStateResponse)
def change_mode(game_id: str, req: ChangeModeRequest) -> GameStateResponse:
    manager = GAMES.get(game_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Game not found")
    manager.change_mode(req.mode, tie=req.tie)
    return GameStateResponse(id=game_id, state=manager.state())


@app.post("/games/{game_id}/action", response_model=GameStateResponse)
def perform_action(game_id: str, req: ActionRequest) -> GameStateResponse:
    manager = GAMES.get(game_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Game not found")
    try:
        manager.poker_action(req.action, req.amount, req.indices)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return GameStateResponse(id=game_id, state=manager.state())


@app.post("/games/{game_id}/messages", response_model=List[Dict[str, Any]])
def drain_messages(game_id: str) -> List[Dict[str, Any]]:
    manager = GAMES.get(game_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Game not found")
    drained: List[Dict[str, Any]] = []
    msg = manager.next_message()
    while msg:
        drained.append(msg.__dict__)
        msg = manager.next_message()
    return drained


@app.get("/opponents", response_model=List[OpponentInfo])
def list_opponents() -> List[OpponentInfo]:
    if not OPPONENTS_DIR.exists():
        return []

    opponents: List[OpponentInfo] = []
    for item in OPPONENTS_DIR.iterdir():
        if not item.is_dir() or item.name.startswith("__"):
            continue
        portrait_path = None
        for candidate in ("portrait.png", "Vportrait.png"):
            path = item / candidate
            if path.exists():
                portrait_path = path
                break
        if not portrait_path:
            # Fallback to any png in the folder
            pngs = list(item.glob("*.png"))
            portrait_path = pngs[0] if pngs else None
        portrait_url = (
            f"/opponents/{quote(item.name)}/{portrait_path.name}" if portrait_path else None
        )
        display_name = None
        OppClass = _load_opponent_class(item.name)
        display_name = getattr(OppClass, "name", None) or getattr(OppClass(), "name", None)
        media_urls: List[str] = []
        for subdir in item.iterdir():
            if subdir.is_dir() and subdir.name.lower().endswith("_images"):
                pngs = sorted(subdir.glob("*.png"))
                for png in pngs:
                    media_urls.append(
                        f"/opponents/{quote(item.name)}/{quote(subdir.name)}/{quote(png.name)}"
                    )
        opponents.append(
            OpponentInfo(
                name=item.name, displayName=display_name, portrait=portrait_url, media=media_urls
            )
        )
    return sorted(opponents, key=lambda o: o.name.lower())
