const sections = {
  ageGate: document.getElementById("age-gate"),
  opponentSelect: document.getElementById("opponent-select"),
  game: document.getElementById("game-area"),
};
const statusChip = document.getElementById("status-chip");
const opponentGrid = document.getElementById("opponent-grid");
const startButton = document.getElementById("start-game");
const betInput = document.getElementById("bet-amount");
const betButton = document.querySelector('button[data-action="bet"]');
let messagesEl = document.getElementById("messages");
if (!messagesEl) {
  messagesEl = document.createElement("ul");
  messagesEl.id = "messages";
  messagesEl.style.display = "none";
  document.body.appendChild(messagesEl);
}
const mediaWindow = document.getElementById("media-window");
const bannerEl = document.getElementById("table-banner");
const messageLine = document.getElementById("message-line");

let selectedOpponent = null;
let gameId = null;
let portraitsByName = {};

async function api(path, options = {}) {
  const resp = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`API ${resp.status}: ${detail}`);
  }
  return resp.json();
}

function setStatus(text) {
  statusChip.textContent = text;
}

function showSection(sectionName) {
  Object.entries(sections).forEach(([key, el]) => {
    el.classList.toggle("hidden", key !== sectionName);
  });
}

function renderOpponents(list) {
  opponentGrid.innerHTML = "";
  list.forEach((opp) => {
    const display = opp.displayName || opp.name;
    const card = document.createElement("div");
    card.className = "opponent-card";
    const img = document.createElement("img");
    img.src = opp.portrait || "/cards/backred.png";
    img.alt = `${display} portrait`;
    const name = document.createElement("div");
    name.textContent = display;
    card.appendChild(img);
    card.appendChild(name);
    card.addEventListener("click", () => {
      selectedOpponent = { ...opp, display };
      document.querySelectorAll(".opponent-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      startButton.disabled = false;
      const mediaSrc = (opp.media && opp.media[0]) || opp.portrait;
      if (mediaSrc) {
        mediaWindow.style.backgroundImage = `url('${mediaSrc}')`;
      }
    });
    opponentGrid.appendChild(card);
  });
}

async function loadOpponents() {
  try {
    const data = await api("/opponents");
    if (data.length === 0) {
      renderOpponents([
        { name: "Unknown Challenger", displayName: "Unknown Challenger", portrait: null },
      ]);
    } else {
      portraitsByName = Object.fromEntries(data.map((o) => [o.name, o.portrait]));
      renderOpponents(data);
    }
  } catch (err) {
    setStatus("Could not load opponents");
    renderOpponents([{ name: "Fallback Opponent", displayName: "Fallback Opponent", portrait: null }]);
  }
}

function cardImagePath(card) {
  if (!card || !card.suit || !card.value) return null;
  const suit = String(card.suit).toLowerCase();
  const value = String(card.value);
  return `/cards/${suit}${value}.png`;
}

function renderCards(container, cards, reveal) {
  container.innerHTML = "";
  const padded = [...(cards && cards.length ? cards : []), {}, {}, {}, {}, {}].slice(0, 5);
  padded.forEach((cardData) => {
    const card = document.createElement("div");
    card.className = "poker-card";
    const img = document.createElement("div");
    img.className = "card-face";
    const backImg = "/cards/backred.png";
    const faceImg = cardImagePath(cardData);
    img.style.backgroundImage = reveal && faceImg ? `url('${faceImg}')` : `url('${backImg}')`;
    card.appendChild(img);
    container.appendChild(card);
  });
}

function lastMessageText(state) {
  const queue = state.messageQueue || [];
  if (!queue.length) return "";
  const lastAI = [...queue].reverse().find((m) => m.name);
  if (lastAI) {
    return `${lastAI.name}: ${lastAI.text || ""}`;
  }
  const lastSystem = queue[queue.length - 1];
  return lastSystem.text || "";
}

function showBanner(text) {
  if (!text) return;
  bannerEl.textContent = text;
  bannerEl.classList.remove("hidden");
  requestAnimationFrame(() => bannerEl.classList.add("show"));
  setTimeout(() => bannerEl.classList.remove("show"), 1200);
}

function renderMessages(messages) {
  if (!messagesEl) return;
  messagesEl.innerHTML = "";
  messages
    .filter((msg) => msg.name) // only AI dialog
    .forEach((msg) => {
      const li = document.createElement("li");
      if (msg.assoc_action === "error") li.classList.add("error");
      const prefix = msg.name ? `${msg.name}: ` : "";
      li.textContent = `${prefix}${msg.text}`;
      messagesEl.appendChild(li);
    });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderState(state) {
  document.getElementById("stage").textContent = state.gameStage;
  document.getElementById("pot").textContent = state.pot;

  const player = state.characters?.[0] || { name: "Player", money: 0, owed: 0, cards: [] };
  const opponent = state.characters?.[1] || { name: "Opponent", money: 0, cards: [] };
  const playerName = player.name || "Player";
  const opponentName = opponent.name || "Opponent";
  document.getElementById("player-name").textContent = playerName;
  document.getElementById("opponent-name").textContent = opponentName;
  document.getElementById("player-money").textContent = player.money;
  document.getElementById("opponent-money").textContent = opponent.money;

  // Show amount owed for the player whose turn it is
  const currentOwed = state.characters?.[state.currentlyOn]?.owed ?? 0;
  const callAmount = currentOwed;
  document.getElementById("call-amount").textContent = callAmount;

  const revealOpponentCards = state.gameStage === "showdown" || state.gameStage === "end_round";
  renderCards(document.getElementById("player-hand"), player.cards, true);
  renderCards(document.getElementById("opponent-hand"), opponent.cards, revealOpponentCards);

  const playerLabel = document.querySelector(".hand.player .hand-label");
  const opponentLabel = document.querySelector(".hand.opponent .hand-label");
  const isPlayerTurn = state.currentlyOn === 0;
  const isOpponentTurn = state.currentlyOn === 1;
  const labelTemplate = (name, money, turn) =>
    `<span class="turn ${turn ? "" : "off"}">${turn ? ">" : "--"}</span> <span class="name">${name}</span>: <span class="money${
      money < 0 ? " negative" : ""
    }">${money}</span>`;
  if (playerLabel) playerLabel.innerHTML = labelTemplate(playerName, player.money ?? 0, isPlayerTurn);
  if (opponentLabel)
    opponentLabel.innerHTML = labelTemplate(opponentName, opponent.money ?? 0, isOpponentTurn);

  const msgs = state.messageQueue || [];
  renderMessages(msgs);
  messageLine.textContent = lastMessageText(state) || "Waiting for action...";

  const lastSystem = [...msgs].reverse().find((m) => !m.name);
  document.getElementById("system-message").textContent = lastSystem?.text || "-";

  if (gameId) {
    setStatus(`Playing vs ${opponentName}`);
  }

  if (state.gameStage === "end_round") {
    const winnerMsg = msgs.find((m) => m.text && m.text.includes("wins the pot"));
    showBanner(winnerMsg ? winnerMsg.text : "Round Complete");
  } else if (state.gameStage === "game_over") {
    showBanner("Game Over");
  } else {
    bannerEl.classList.add("hidden");
  }

  const portrait = selectedOpponent?.portrait || (selectedOpponent && portraitsByName[selectedOpponent.name]);
  const oppMedia = opponent.media && opponent.media.length ? opponent.media : selectedOpponent?.media;
  const mediaSrc = (oppMedia && oppMedia[0]) || portrait;
  if (mediaSrc) {
    mediaWindow.style.backgroundImage = `url('${mediaSrc}')`;
  }

  // reuse turn info for input/bet pulse
  if (isPlayerTurn) {
    betInput.classList.add("pulse-border");
    if (betInput.value) {
      betButton.classList.add("pulse-border");
    } else {
      betButton.classList.remove("pulse-border");
    }
  } else {
    betInput.classList.remove("pulse-border");
    betButton.classList.remove("pulse-border");
  }
}

async function createAndStartGame() {
  if (!selectedOpponent) return;
  setStatus(`Loading game vs ${selectedOpponent.name}...`);
  const payload = {
    players: [
      { name: "Player" },
      {
        name: selectedOpponent.display || selectedOpponent.name,
        module: selectedOpponent.name,
      },
    ],
    settings: {},
  };
  try {
    const data = await api("/games", { method: "POST", body: JSON.stringify(payload) });
    gameId = data.id;
    document.getElementById("game-id").textContent = gameId;
    await changeMode("start_round");
    showSection("game");
    setStatus(`Playing vs ${selectedOpponent.name}`);
  } catch (err) {
    renderMessages([{ text: err.message, assoc_action: "error" }]);
    setStatus("Failed to start game");
  }
}

async function changeMode(mode, tie = false) {
  if (!gameId) return;
  const data = await api(`/games/${gameId}/mode`, {
    method: "POST",
    body: JSON.stringify({ mode, tie }),
  });
  renderState(data.state);
}

async function sendAction(action) {
  if (!gameId) return;
  const payload = { action };
  if (action === "bet" || action === "raise") {
    payload.amount = Number(betInput.value || 0);
  }
  const data = await api(`/games/${gameId}/action`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (action === "bet") {
    betButton.classList.remove("pulse-border");
  }
  renderState(data.state);
}

document.getElementById("age-yes").addEventListener("click", () => {
  showSection("opponentSelect");
  loadOpponents();
  setStatus("Pick an opponent");
});

document.getElementById("age-no").addEventListener("click", () => {
  const warning = document.getElementById("age-warning");
  warning.classList.remove("hidden");
  setStatus("Access blocked");
});

startButton.addEventListener("click", createAndStartGame);

document.querySelectorAll("button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => sendAction(btn.dataset.action));
});

document.querySelectorAll("button[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => changeMode(btn.dataset.mode, btn.dataset.tie === "true"));
});

// Quick ping to update status chip so "Not connected" only shows if the API is unreachable.
(async function checkConnection() {
  try {
    await api("/opponents");
    setStatus("Connected");
  } catch {
    setStatus("Not connected");
  }
})();
