"""Legacy-style poker game manager wired to the original opponent AI classes."""
from __future__ import annotations

import random
import sys
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from opponents.basicutils import Deck, Hand, Message as OppMessage
from opponents.StandardCharacter import Character


class GameStage(str, Enum):
    NOT_STARTED = "not_started"
    START_ROUND = "start_round"
    BET_AND_STAY = "bet_and_stay"
    RAISE_AND_CALL = "raise_and_call"
    BET_AND_CALL = "bet_and_call"
    CHANGE_CARDS = "change_cards"
    ROUND_TWO = "round_two"
    SHOWDOWN = "showdown"
    END_ROUND = "end_round"
    GAME_OVER = "game_over"


@dataclass
class Player:
    AI: Character
    maxTries: int

    def reset_for_round(self) -> None:
        self.AI.totalBet = 0
        self.AI.lastBet = 0
        self.AI.owed = 0
        self.AI.folded = False
        if hasattr(self.AI, "cleanCards"):
            self.AI.cleanCards()
        else:
            self.AI.cards = Hand()


class GameManager:
    def __init__(
        self,
        *,
        characters: List[Player],
        settings: Dict[str, Any],
        currency: str = "$",
        cardFolder: str = "cards",
        playerVar: int = 0,
        isChar: bool = False,
        debug: bool = False,
        rules: int = 0,
    ) -> None:
        self.setMoney: int = settings.get("startMoney", 200)
        self.setMax: int = settings.get("maxBet", self.setMoney)
        self.currency: str = currency
        self.rules: int = rules or settings.get("pokerType", 0)
        self.ante: int = settings.get("ante", 5)
        self.characters: List[Player] = characters
        self.pot: int = 0
        self.toPot: int = 0
        self.lastPot: int = 0
        self.betCap: int = self.setMax
        self.numStayed: int = 0
        self.allStay: bool = True
        self.out: List[str] = []
        self.lost: List[str] = []
        self.dealer: int = 0
        self.currentlyOn: int = 0
        self.gameStage: GameStage = GameStage.NOT_STARTED
        self.messageDisplay: List[Dict[str, Any]] = []
        self.deck: Optional[Deck] = None

    # ---------- Helpers ----------
    def queue_message(
        self, text: str, assoc_action: Optional[str] = None, tags: Optional[List[str]] = None, name: str = ""
    ) -> None:
        msg = {
            "name": name,
            "text": text,
            "assoc_action": assoc_action or "",
            "tags": tags or [],
        }
        self.messageDisplay.append(msg)

    def _queue_ai_message(self, msg: OppMessage) -> None:
        # OppMessage fields: name, text, assoc_action(list), stored_vars(dict), type, tags(list)
        text = msg.text
        assoc = msg.assoc_action if isinstance(msg.assoc_action, list) else [msg.assoc_action]
        tags = msg.tags if hasattr(msg, "tags") else []
        self.messageDisplay.append(
            {"name": getattr(msg, "name", ""), "text": text, "assoc_action": ",".join(assoc or []), "tags": tags}
        )

    def next_message(self) -> Optional[Dict[str, Any]]:
        return self.messageDisplay.pop(0) if self.messageDisplay else None

    def _advance_player(self) -> None:
        total = len(self.characters)
        for _ in range(total):
            self.currentlyOn = (self.currentlyOn + 1) % total
            if not self.characters[self.currentlyOn].AI.folded:
                return

    def _recalculate_owed(self) -> None:
        self.toPot = 0
        current_bet = max(p.AI.totalBet for p in self.characters)
        for p in self.characters:
            p.AI.owed = max(current_bet - p.AI.totalBet, 0)
            self.toPot += p.AI.owed

    def _deal_new_deck(self) -> None:
        self.deck = Deck()

    def _deal_cards(self) -> None:
        assert self.deck is not None
        for player in self.characters:
            player.AI.cards = Hand()
        # Simple alternating deal 5 cards each
        for _ in range(5):
            for player in self.characters:
                card = self.deck.pullCard()
                player.AI.cards.addCard(card)
            # keep hands sorted for evaluation
        for player in self.characters:
            player.AI.cards.organize()

    # ---------- State ----------
    def state(self) -> Dict[str, Any]:
        def card_payload(card: Any) -> Dict[str, Any]:
            if hasattr(card, "face") and hasattr(card, "suit"):
                return {
                    "face": getattr(card, "face", ""),
                    "suit": getattr(card, "suit", ""),
                    "value": getattr(card, "value", 0),
                    "name": getattr(card, "name", ""),
                }
            return {"face": "", "suit": "", "value": 0, "name": str(card)}

        return {
            "characters": [
                {
                    "name": p.AI.name,
                    "money": p.AI.money,
                    "totalBet": p.AI.totalBet,
                    "lastBet": p.AI.lastBet,
                    "owed": p.AI.owed,
                    "cards": [card_payload(c) for c in getattr(p.AI, "cards", Hand()).cards],
                    "onTry": getattr(p.AI, "onTry", 0),
                    "maxTries": p.maxTries,
                }
                for p in self.characters
            ],
            "pot": self.pot,
            "toPot": self.toPot,
            "dealer": self.dealer,
            "currentlyOn": self.currentlyOn,
            "gameStage": self.gameStage.value,
            "messageQueue": list(self.messageDisplay),
        }

    # ---------- Modes ----------
    def start_round(self) -> None:
        self.pot = 0
        self.toPot = 0
        self.lastPot = 0
        self.numStayed = 0
        self.allStay = True
        self.dealer %= len(self.characters)
        # Non-dealer acts first
        self.currentlyOn = (self.dealer + 1) % len(self.characters)
        for p in self.characters:
            p.reset_for_round()
        self._deal_new_deck()
        self._deal_cards()
        # Post antes
        for player in self.characters:
            ante_pay = max(self.ante, 0)
            player.AI.money -= ante_pay
            self.pot += ante_pay
        self.gameStage = GameStage.BET_AND_STAY
        self.queue_message("New round started", "start_round")
        # If it's an AI's turn to open, let it act immediately.
        self._auto_act_if_ai()

    def change_mode(self, mode: GameStage | str, tie: bool = False) -> None:
        mode = GameStage(mode)
        self.gameStage = mode
        if mode == GameStage.START_ROUND:
            self.start_round()
        elif mode == GameStage.CHANGE_CARDS:
            self._handle_draw_phase()
        elif mode == GameStage.ROUND_TWO:
            self.gameStage = GameStage.BET_AND_CALL
            self.numStayed = 0
            self.allStay = True
            self.queue_message("Second betting round", "round_two")
        elif mode == GameStage.SHOWDOWN:
            self._handle_showdown()
        elif mode == GameStage.END_ROUND:
            self._handle_showdown(tie=tie)
        elif mode == GameStage.GAME_OVER:
            self.queue_message("Game over", "game_over")

    # ---------- Actions ----------
    def poker_action(self, action: str, amount: Optional[int] = None, indices: Optional[List[int]] = None) -> None:
        action = action.lower()
        if action == "next_player":
            self._advance_player()
            return
        player = self.characters[self.currentlyOn]
        if action in ("bet", "raise"):
            self._action_bet(player, amount or 0)
            self._advance_player()
            self._auto_act_if_ai()
            return
        if action == "call":
            self._action_call(player)
            self._advance_player()
            self._auto_act_if_ai()
            return
        if action == "stay":
            self._action_stay(player)
            self._advance_player()
            self._auto_act_if_ai()
            return
        if action == "fold":
            self._action_fold(player)
            self._advance_player()
            self._auto_act_if_ai()
            return
        if action == "change_cards":
            self._action_change_cards(player, indices or [])
            return
        if action == "flip_cards":
            self._handle_showdown()
            return
        raise ValueError(f"Unsupported action: {action}")

    # ---------- Internal action handlers ----------
    def _action_bet(self, player: Player, amount: int) -> None:
        amount = int(amount)
        if amount <= 0:
            raise ValueError("Bet amount must be positive")
        amount = min(amount, self.setMax, player.AI.money)
        player.AI.money -= amount
        player.AI.lastBet = amount
        player.AI.totalBet += amount
        self.pot += amount
        self._recalculate_owed()
        self.queue_message(f"{player.AI.name} bets {self.currency}{amount}", "bet")

    def _action_call(self, player: Player) -> None:
        pay = min(player.AI.owed, player.AI.money)
        player.AI.money -= pay
        player.AI.totalBet += pay
        player.AI.lastBet = pay
        self.pot += pay
        self._recalculate_owed()
        self.queue_message(f"{player.AI.name} calls {self.currency}{pay}", "call")

    def _action_stay(self, player: Player) -> None:
        player.AI.owed = 0
        self._recalculate_owed()
        self.queue_message(f"{player.AI.name} stays", "stay")

    def _action_fold(self, player: Player) -> None:
        player.AI.folded = True
        self.queue_message(f"{player.AI.name} folds", "fold")

    def _handle_draw_phase(self) -> None:
        if not self.deck:
            self._deal_new_deck()
        # Only AI opponents auto-draw; player draw is not specified in UI so keep hand.
        for player in self.characters:
            if player == self.characters[0]:  # assume first is human
                continue
            if hasattr(player.AI, "processCards"):
                to_flip = player.AI.processCards()
                for idx in to_flip:
                    if idx < len(player.AI.cards.cards):
                        player.AI.cards.flipCard(idx, self.deck.pullCard())
                player.AI.cards.organize()
        self.queue_message("Draw phase completed", "change_cards")

    def _action_change_cards(self, player: Player, indices: List[int]) -> None:
        """Replace selected player cards from the deck."""
        if not self.deck:
            self._deal_new_deck()
        if not hasattr(player.AI, "cards"):
            player.AI.cards = Hand()
        hand = player.AI.cards
        # keep indices unique and in range
        for idx in sorted(set(indices)):
            if 0 <= idx < len(hand.cards):
                hand.flipCard(idx, self.deck.pullCard())
        hand.organize()
        self.queue_message(f"{player.AI.name} draws cards", "change_cards")

    def _handle_showdown(self, tie: bool = False) -> None:
        if tie:
            self.queue_message("Round ended in a tie", "end_round")
        else:
            winner_idx = self._pick_winner()
            if winner_idx is None:
                self.queue_message("No winner determined", "end_round")
            else:
                winner = self.characters[winner_idx].AI
                winner.money += self.pot
                self.queue_message(f"{winner.name} wins the pot of {self.pot}{self.currency}", "end_round")
        self.lastPot = self.pot
        self.pot = 0
        self.toPot = 0
        self._recalculate_owed()
        self.dealer = (self.dealer + 1) % len(self.characters)
        # Next hand starts with non-dealer acting first
        self.currentlyOn = (self.dealer + 1) % len(self.characters)
        self.gameStage = GameStage.START_ROUND

    def _pick_winner(self) -> Optional[int]:
        best_idx = None
        best_val = None
        for idx, player in enumerate(self.characters):
            if player.AI.folded:
                continue
            if not hasattr(player.AI, "checkHand"):
                continue
            val = player.AI.checkHand(player.AI.cards.cards)
            score = (val[1], val[2])  # lower is better on first element
            if best_val is None or score < best_val:
                best_val = score
                best_idx = idx
        return best_idx

    def _auto_act_if_ai(self) -> None:
        # If it's the AI opponent's turn, let it decide via processResponse.
        if self.currentlyOn >= len(self.characters):
            return
        if self.currentlyOn == 0:
            return  # assume player index 0
        player = self.characters[self.currentlyOn]
        if not hasattr(player.AI, "processResponse"):
            return
        msg = player.AI.processResponse(
            self.pot,
            self.gameStage.value,
            self.currency,
            self.setMax,
            self.betCap,
            self.toPot,
            len(self.characters),
            self.numStayed,
            self.lastPot,
        )
        self._queue_ai_message(msg)
        actions = msg.assoc_action if isinstance(msg.assoc_action, list) else [msg.assoc_action]
        for act in actions:
            if act == "bet":
                bet_amt = msg.stored_vars.get("betAmt", 0) if hasattr(msg, "stored_vars") else 0
                self._action_bet(player, bet_amt)
            elif act == "stay":
                self._action_stay(player)
            elif act == "call":
                self._action_call(player)
            elif act == "fold":
                self._action_fold(player)
        self._advance_player()
