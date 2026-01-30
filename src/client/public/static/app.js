const sections = {
  ageGate: document.getElementById("age-gate"),
  opponentSelect: document.getElementById("opponent-select"),
  game: document.getElementById("game-area"),
};
const statusChip = document.getElementById("status-chip");
const opponentGrid = document.getElementById("opponent-grid");
const startButton = document.getElementById("start-game");
const playerNameInput = document.getElementById("player-name-input");
const ageYesButton = document.getElementById("age-yes");
const ageNoButton = document.getElementById("age-no");
const ageExitModal = document.getElementById("age-exit-modal");
const betInput = document.getElementById("bet-amount");
const betButton = document.querySelector('button[data-action="bet"]');
const playerHandEl = document.getElementById("player-hand");
const opponentHandEl = document.getElementById("opponent-hand");
const playerWallet = document.getElementById("player-wallet");
const opponentWallet = document.getElementById("opponent-wallet");
const drawDoneButton = document.getElementById("draw-done");
const drawButton = document.querySelector('button[data-mode="change_cards"]');
const switchOpponentButton = document.getElementById("switch-opponent");
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
const betAlert = document.getElementById("bet-alert");
const betAlertMessage = betAlert ? betAlert.querySelector(".bet-alert__message") : null;
const showdownModal = document.getElementById("showdown-modal");
const showdownPlayerName = document.getElementById("showdown-player-name");
const showdownPlayerHand = document.getElementById("showdown-player-hand");
const showdownOpponentName = document.getElementById("showdown-opponent-name");
const showdownOpponentHand = document.getElementById("showdown-opponent-hand");
const showdownPlayerCards = document.getElementById("showdown-player-cards");
const showdownOpponentCards = document.getElementById("showdown-opponent-cards");
const showdownWinnerLine = document.getElementById("showdown-winner-line");
const showdownReasonLine = document.getElementById("showdown-reason-line");
const showdownProceed = document.getElementById("showdown-proceed");
const gameOverModal = document.getElementById("game-over-modal");
const gameOverWinner = document.getElementById("game-over-winner");
const gameOverNew = document.getElementById("game-over-new");
const gameOverQuit = document.getElementById("game-over-quit");
const handModal = document.getElementById("hand-modal");
const handModalTitle = document.getElementById("hand-modal-title");
const handModalMessage = document.getElementById("hand-modal-message");
const handModalCards = document.getElementById("hand-modal-cards");
const handModalProceed = document.getElementById("hand-modal-proceed");
const handModalDone = document.getElementById("hand-modal-done");
const rulesButton = document.getElementById("rules-button");
const mobileActionsButton = document.getElementById("mobile-actions-button");
const rulesModal = document.getElementById("rules-modal");
const rulesClose = document.getElementById("rules-close");
const settingsButton = document.getElementById("settings-button");
const settingsPanel = document.getElementById("settings-panel");
const soundToggle = document.getElementById("sound-toggle");
const settingsSave = document.getElementById("settings-save");
const settingsLoad = document.getElementById("settings-load");
const settingsQuit = document.getElementById("settings-quit");
const settingsInventory = document.getElementById("settings-inventory");
const inventoryModal = document.getElementById("inventory-modal");
const inventoryLine = document.getElementById("inventory-line");
const inventoryItems = document.getElementById("inventory-items");
const inventoryClose = document.getElementById("inventory-close");
const controlsScrim = document.getElementById("controls-scrim");
let betAlertTimer = null;

let selectedOpponent = null;
let gameId = null;
let portraitsByName = {};
let currentState = null;
let lastStage = null;
let autoAdvancePending = false;
let drawSelectionEnabled = false;
let selectedCardIndices = new Set();
let messageCursor = 0;
let messagePlaybackQueue = [];
let messagePlaybackTimer = null;
let messagePlaybackActive = false;
let anteVisualActive = false;
let anteVisualRemaining = 0;
let anteVisualPot = null;
let anteVisualMoney = null;
let handModalMode = null;
let audioEnabled = false;
let soundEnabled = true;
let stripSfxIndex = 0;
let dealInProgress = false;
let pendingDealAnimation = false;
let dealDisplayState = null;

document.addEventListener(
  "pointerdown",
  () => {
    audioEnabled = true;
  },
  { once: true }
);

const SFX = {
  shuffle: "assets/sfx/shuffle/riffle-card-shuffle-104313.mp3",
  deal: "assets/sfx/shuffle/playing-cards-being-delt-29099.mp3",
  flip: "assets/sfx/shuffle/flipcard-91468.mp3",
  money: "assets/sfx/money/handfull-of-poker-chips-95810.mp3",
  win: "assets/sfx/winning-82808.mp3",
  strip: [
    "assets/sfx/strip/throwing-clothes-on-the-floor-2-48133.mp3",
    "assets/sfx/strip/impact-clothes-308657.mp3",
    "assets/sfx/strip/clothing-impact-42290.mp3",
  ],
};

const NEW_ROUND_VIDEOS = [
  "assets/newRoundVids/next_round.mp4",
  "assets/newRoundVids/next_round_1.mp4",
  "assets/newRoundVids/next_round_3.mp4",
  "assets/newRoundVids/next_round_4.mp4",
  "assets/newRoundVids/next_round_5.mp4",
  "assets/newRoundVids/next_round_6.mp4",
  "assets/newRoundVids/next_round_7.mp4",
];

let newRoundVideoEl = null;
let newRoundVideoPlaying = false;

function playSfx(path, { volume = 0.6, rate = 1 } = {}) {
  if (!audioEnabled || !soundEnabled || !path) return;
  const audio = new Audio(path);
  audio.volume = volume;
  audio.playbackRate = rate;
  audio.play().catch(() => {});
}

function playMoney(count) {
  if (!audioEnabled || !soundEnabled) return;
  const pulses = Math.max(1, count);
  for (let i = 0; i < pulses; i += 1) {
    setTimeout(() => playSfx(SFX.money, { volume: 0.55 }), i * 120);
  }
}

function playStrip() {
  const list = SFX.strip || [];
  if (!list.length) return;
  const path = list[stripSfxIndex % list.length];
  stripSfxIndex += 1;
  playSfx(path, { volume: 0.7 });
}

function ensureNewRoundVideoEl() {
  if (!mediaWindow) return null;
  if (newRoundVideoEl) return newRoundVideoEl;
  const video = document.createElement("video");
  video.className = "new-round-video";
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.preload = "auto";
  video.tabIndex = -1;
  video.setAttribute("aria-hidden", "true");
  mediaWindow.appendChild(video);
  newRoundVideoEl = video;
  return video;
}

function pickNewRoundVideo() {
  if (!NEW_ROUND_VIDEOS.length) return null;
  const index = Math.floor(Math.random() * NEW_ROUND_VIDEOS.length);
  return NEW_ROUND_VIDEOS[index];
}

function playNewRoundVideo() {
  if (!mediaWindow || !NEW_ROUND_VIDEOS.length || newRoundVideoPlaying) {
    return Promise.resolve(false);
  }
  const video = ensureNewRoundVideoEl();
  const src = pickNewRoundVideo();
  if (!video || !src) {
    return Promise.resolve(false);
  }
  newRoundVideoPlaying = true;
  video.classList.add("is-visible");
  video.src = src;
  video.currentTime = 0;
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      newRoundVideoPlaying = false;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.classList.remove("is-visible");
      video.onended = null;
      video.onerror = null;
      resolve(true);
    };
    const maxTimer = setTimeout(finish, 8000);
    video.onended = () => {
      clearTimeout(maxTimer);
      finish();
    };
    video.onerror = () => {
      clearTimeout(maxTimer);
      finish();
    };
    const promise = video.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        clearTimeout(maxTimer);
        finish();
      });
    }
  });
}

function parseAmount(text) {
  if (!text) return null;
  const match = text.match(/\$(\d+)/);
  return match ? Number(match[1]) : null;
}

function isBigBet(amount, state) {
  if (!Number.isFinite(amount)) return false;
  const maxBet = Number.isFinite(state?.maxBet) ? Number(state.maxBet) : null;
  const betCap = Number.isFinite(state?.betCap) ? Number(state.betCap) : null;
  const threshold = Math.max(maxBet || 0, betCap || 0, 100);
  return amount >= threshold;
}

function getAnteIndexFromTags(tags) {
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (typeof tag === "string" && tag.startsWith("ante_")) {
      const idx = Number(tag.slice(5));
      return Number.isFinite(idx) ? idx : null;
    }
  }
  return null;
}

function setupAnteVisual(state, messages) {
  if (anteVisualActive) return;
  const ante = Number(state?.ante ?? 0);
  if (!Number.isFinite(ante) || ante <= 0) return;
  const counts = new Map();
  let total = 0;
  for (const msg of messages) {
    if (!Array.isArray(msg.tags) || !msg.tags.includes("ante")) continue;
    total += 1;
    const idx = getAnteIndexFromTags(msg.tags);
    if (Number.isFinite(idx)) {
      counts.set(idx, (counts.get(idx) || 0) + 1);
    }
  }
  if (total === 0) return;
  if (!counts.size) {
    for (let i = 0; i < state.characters.length; i += 1) {
      counts.set(i, 1);
    }
  }
  anteVisualActive = true;
  anteVisualRemaining = total;
  const basePot = Number(state.pot ?? 0);
  anteVisualPot = Math.max(0, basePot - ante * total);
  anteVisualMoney = state.characters.map((player, idx) => {
    const base = Number(player?.money ?? 0);
    const add = counts.get(idx) || 0;
    return base + ante * add;
  });
}

function applyAnteVisualStep(msg, state) {
  if (!anteVisualActive) return;
  if (!Array.isArray(msg.tags) || !msg.tags.includes("ante")) return;
  const ante = Number(state?.ante ?? 0);
  if (!Number.isFinite(ante) || ante <= 0) return;
  if (!Array.isArray(anteVisualMoney)) return;
  const idx = getAnteIndexFromTags(msg.tags);
  if (Number.isFinite(idx) && anteVisualMoney[idx] !== undefined) {
    anteVisualMoney[idx] -= ante;
  }
  if (Number.isFinite(anteVisualPot)) {
    anteVisualPot += ante;
  }
  anteVisualRemaining = Math.max(anteVisualRemaining - 1, 0);
  if (anteVisualRemaining === 0) {
    anteVisualActive = false;
    anteVisualPot = null;
    anteVisualMoney = null;
  }
  if (currentState) {
    renderState(currentState);
  }
}

function playSfxForMessage(msg, state) {
  if (!msg) return;
  const text = msg.text || "";
  const tags = Array.isArray(msg.tags) ? msg.tags : [];
  const assoc = msg.assoc_action || "";

  if (tags.includes("shuffle")) {
    playSfx(SFX.shuffle, { volume: 0.65 });
    return;
  }
  if (tags.includes("deal")) {
    playSfx(SFX.deal, { volume: 0.65, rate: 3 });
    return;
  }
  if (tags.includes("ante")) {
    playMoney(2);
    return;
  }
  if (tags.includes("reveal")) {
    playSfx(SFX.flip, { volume: 0.6 });
    return;
  }
  if (tags.includes("new_cards")) {
    playSfx(SFX.flip, { volume: 0.6 });
    return;
  }
  if (tags.includes("strip")) {
    playStrip();
    return;
  }
  if (tags.includes("win") && text.includes("wins the pot")) {
    playSfx(SFX.win, { volume: 0.7 });
    return;
  }
  if (tags.includes("fold") && text.includes("folds")) {
    playSfx(SFX.flip, { volume: 0.6 });
    return;
  }
  if ((tags.includes("bet") || tags.includes("call") || tags.includes("raise")) && text.includes("$")) {
    const amount = parseAmount(text);
    playMoney(isBigBet(amount, state) ? 5 : 3);
    return;
  }
  if (tags.includes("drink")) {
    playMoney(2);
  }
}

const API_BASE = window.location.hostname.includes('devvit.net') ? '/api' : '';

async function api(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
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
  if (sectionName !== "game") {
    setControlsOpen(false);
    if (settingsPanel) {
      settingsPanel.classList.add("hidden");
    }
  }
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function setControlsOpen(open) {
  document.body.classList.toggle("controls-open", open);
  if (controlsScrim) {
    controlsScrim.classList.toggle("hidden", !open);
  }
}

function updateSoundToggle() {
  if (!soundToggle) return;
  const label = soundToggle.querySelector(".sound-label");
  if (label) {
    label.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  } else {
    soundToggle.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  }
  soundToggle.classList.toggle("is-off", !soundEnabled);
}

function toggleSettingsPanel(force) {
  if (!settingsPanel) return;
  const shouldOpen =
    typeof force === "boolean" ? force : settingsPanel.classList.contains("hidden");
  settingsPanel.classList.toggle("hidden", !shouldOpen);
}

function closeInventoryModal() {
  if (inventoryModal) {
    inventoryModal.classList.add("hidden");
  }
}

function openInventoryModal() {
  if (!inventoryModal) return;
  const player = currentState?.characters?.[0];
  if (inventoryLine) {
    if (!player) {
      inventoryLine.textContent = "No inventory data available.";
    } else {
      const items = Array.isArray(player.wardrobeItems) ? player.wardrobeItems : [];
      const maxTries = items.length || (Number.isFinite(player.maxTries) ? player.maxTries : 0);
      const onTry = Number.isFinite(player.onTry) ? player.onTry : 0;
      const remainingCount = Math.max(maxTries - onTry, 0);
      inventoryLine.textContent = `Items remaining: ${remainingCount} of ${maxTries}`;
    }
  }
  if (inventoryItems) {
    inventoryItems.innerHTML = "";
    if (!player) {
      const empty = document.createElement("div");
      empty.className = "inventory-empty";
      empty.textContent = "No inventory data available.";
      inventoryItems.appendChild(empty);
    } else {
      const items = Array.isArray(player.wardrobeItems) ? player.wardrobeItems : [];
      const onTry = Number.isFinite(player.onTry) ? player.onTry : 0;
      const remainingItems = items.length ? items.slice(Math.min(onTry, items.length)) : [];
      if (!remainingItems.length) {
        const empty = document.createElement("div");
        empty.className = "inventory-empty";
        empty.textContent = "No items remaining.";
        inventoryItems.appendChild(empty);
      } else {
        remainingItems.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "inventory-item";
          const icon = document.createElement("span");
          icon.className = "btn-icon btn-icon--inventory";
          icon.setAttribute("aria-hidden", "true");
          btn.appendChild(icon);
          btn.appendChild(document.createTextNode(item));
          inventoryItems.appendChild(btn);
        });
      }
    }
  }
  inventoryModal.classList.remove("hidden");
}

function openRulesModal() {
  if (rulesModal) {
    rulesModal.classList.remove("hidden");
  }
}

function closeRulesModal() {
  if (rulesModal) {
    rulesModal.classList.add("hidden");
  }
}

function renderOpponents(list) {
  opponentGrid.innerHTML = "";
  list.forEach((opp) => {
    const display = opp.displayName || opp.name;
    const card = document.createElement("div");
    card.className = "opponent-card";
    card.dataset.name = opp.name;
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

function selectOpponentByName(name) {
  if (!name || !opponentGrid) return false;
  const card = opponentGrid.querySelector(`.opponent-card[data-name="${name}"]`);
  if (!card) return false;
  card.click();
  return true;
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

function renderCards(container, cards, reveal, options = {}) {
  const {
    selectable = false,
    selectedIndices = new Set(),
    onToggle,
    revealIndices = null,
    padToFive = true,
  } = options;
  const revealSet = Array.isArray(revealIndices) ? new Set(revealIndices) : null;
  container.innerHTML = "";
  const base = cards && cards.length ? cards : [];
  const list = padToFive ? [...base, {}, {}, {}, {}, {}].slice(0, 5) : base;
  list.forEach((cardData, index) => {
    const card = document.createElement("div");
    card.className = "poker-card";
    const img = document.createElement("div");
    img.className = "card-face";
    const backImg = "/cards/backred.png";
    const faceImg = cardImagePath(cardData);
    const showFace = reveal || (revealSet && revealSet.has(index));
    img.style.backgroundImage = showFace && faceImg ? `url('${faceImg}')` : `url('${backImg}')`;
    card.appendChild(img);
    const canSelect =
      selectable && typeof onToggle === "function" && cardData && cardData.suit && cardData.value;
    if (canSelect) {
      card.classList.add("selectable");
      if (selectedIndices.has(index)) {
        card.classList.add("selected");
      }
      card.addEventListener("click", (event) => {
        event.stopPropagation();
        onToggle(index);
      });
    }
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

function setControlsDisabled(disabled) {
  if (!sections.game || sections.game.classList.contains("hidden")) {
    return;
  }
  document.querySelectorAll('button[data-action], button[data-mode]').forEach((btn) => {
    btn.disabled = disabled;
  });
  if (drawDoneButton) {
    drawDoneButton.disabled = disabled || !drawSelectionEnabled;
  }
  if (betInput) {
    betInput.disabled = disabled;
  }
}

function enqueueMessages(queue) {
  if (!Array.isArray(queue) || queue.length === 0) {
    messageCursor = 0;
    messagePlaybackQueue = [];
    messagePlaybackActive = false;
    anteVisualActive = false;
    anteVisualRemaining = 0;
    anteVisualPot = null;
    anteVisualMoney = null;
    if (messagePlaybackTimer) {
      clearTimeout(messagePlaybackTimer);
    }
    return;
  }
  if (messageCursor > queue.length) {
    messageCursor = 0;
    messagePlaybackQueue = [];
    messagePlaybackActive = false;
    anteVisualActive = false;
    anteVisualRemaining = 0;
    anteVisualPot = null;
    anteVisualMoney = null;
    if (messagePlaybackTimer) {
      clearTimeout(messagePlaybackTimer);
    }
  }
  const fresh = queue.slice(messageCursor);
  messageCursor = queue.length;
  if (!fresh.length) return;
  if (currentState) {
    const anteMessages = fresh.filter(
      (msg) => Array.isArray(msg.tags) && msg.tags.includes("ante")
    );
    if (anteMessages.length) {
      setupAnteVisual(currentState, anteMessages);
    }
  }
  if (fresh.some((msg) => Array.isArray(msg.tags) && msg.tags.includes("deal"))) {
    pendingDealAnimation = true;
  }
  messagePlaybackQueue.push(...fresh);
  if (!messagePlaybackActive) {
    playNextMessage();
  }
}

function renderHands(player, opponent, revealOpponentCards, override = null) {
  const display = override || {};
  const playerCards = display.playerCards ?? player.cards;
  const opponentCards = display.opponentCards ?? opponent.cards;
  const revealPlayer = display.revealPlayer ?? true;
  const revealOpponent = display.revealOpponent ?? revealOpponentCards;
  const padToFive = display.padToFive !== undefined ? display.padToFive : true;
  if (playerHandEl) {
    renderCards(playerHandEl, playerCards, revealPlayer, {
      selectable: drawSelectionEnabled && !dealInProgress,
      selectedIndices: selectedCardIndices,
      onToggle: (idx) => toggleCardSelection(idx, playerCards),
      padToFive,
    });
  }
  if (opponentHandEl) {
    renderCards(opponentHandEl, opponentCards, revealOpponent, {
      revealIndices: opponent.revealedIndices || [],
      padToFive,
    });
  }
}

async function playDealAnimation(state) {
  if (dealInProgress) return false;
  const playerCards = state?.characters?.[0]?.cards || [];
  const opponentCards = state?.characters?.[1]?.cards || [];
  if (playerCards.length < 5 || opponentCards.length < 5) {
    pendingDealAnimation = false;
    return false;
  }
  dealInProgress = true;
  pendingDealAnimation = false;
  dealDisplayState = {
    playerCards: [],
    opponentCards: [],
    revealPlayer: false,
    revealOpponent: false,
    padToFive: false,
  };
  renderHands(state.characters[0], state.characters[1], false, dealDisplayState);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const firstIdx = Number.isFinite(state.currentlyOn) ? state.currentlyOn : 0;
  const dealerIdx = Number.isFinite(state.dealer) ? state.dealer : (firstIdx === 0 ? 1 : 0);
  const order = [firstIdx, dealerIdx].filter((idx, pos, arr) => idx >= 0 && idx < 2 && arr.indexOf(idx) === pos);
  if (order.length < 2) {
    order.push(firstIdx === 0 ? 1 : 0);
  }
  for (let i = 0; i < 5; i += 1) {
    for (const idx of order) {
      if (idx === 0) {
        dealDisplayState.playerCards.push(playerCards[i]);
      } else {
        dealDisplayState.opponentCards.push(opponentCards[i]);
      }
      renderHands(state.characters[0], state.characters[1], false, dealDisplayState);
      await delay(180);
    }
  }
  dealDisplayState.revealPlayer = true;
  renderHands(state.characters[0], state.characters[1], false, dealDisplayState);
  playSfx(SFX.flip, { volume: 0.6 });
  await delay(200);
  playSfx(SFX.flip, { volume: 0.6 });
  await delay(200);
  dealInProgress = false;
  dealDisplayState = null;
  renderHands(state.characters[0], state.characters[1], state.revealHands === true, null);
  return true;
}

function getMessageHoldMs(msg) {
  const text = (msg && msg.text) ? String(msg.text) : "";
  const isAi = Boolean(msg && msg.name);
  const base = isAi ? 900 : 1100;
  const perChar = isAi ? 18 : 14;
  const cap = isAi ? 2600 : 2200;
  return Math.min(cap, base + text.length * perChar);
}

function playNextMessage() {
  if (!messagePlaybackQueue.length) {
    messagePlaybackActive = false;
    setControlsDisabled(false);
    if (messageLine && (!currentState || !lastMessageText(currentState))) {
      messageLine.textContent = "Waiting for action...";
    }
    return;
  }
  messagePlaybackActive = true;
  setControlsDisabled(true);
  const msg = messagePlaybackQueue.shift();
  const line = msg.name ? `${msg.name}: ${msg.text || ""}` : msg.text || "";
  const holdMs = getMessageHoldMs(msg);
  const waitForVideo =
    msg.assoc_action === "start_round" ? playNewRoundVideo() : Promise.resolve(false);
  if (messagePlaybackTimer) {
    clearTimeout(messagePlaybackTimer);
  }
  waitForVideo.then((played) => {
    if (messageLine) {
      messageLine.textContent = line;
    }
    playSfxForMessage(msg, currentState);
    applyAnteVisualStep(msg, currentState);
    const waitForDeal =
      msg.tags && msg.tags.includes("deal") ? playDealAnimation(currentState) : Promise.resolve(false);
    waitForDeal.then((dealt) => {
      const delay = msg.assoc_action === "start_round" ? 200 : played || dealt ? 200 : holdMs;
      messagePlaybackTimer = setTimeout(playNextMessage, delay);
    });
  });
}

function waitForRoundAdvance(minDelay = 1500) {
  const start = Date.now();
  const maxDelay = minDelay + 6000;
  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = Date.now() - start;
      if (!messagePlaybackActive && elapsed >= minDelay) {
        resolve();
        return;
      }
      if (elapsed >= maxDelay) {
        resolve();
        return;
      }
      setTimeout(tick, 100);
    };
    setTimeout(tick, 100);
  });
}

function showBetAlert(text) {
  if (!betAlert || !betAlertMessage) return;
  betAlertMessage.textContent = text;
  betAlert.classList.remove("hidden");
  if (betAlertTimer) {
    clearTimeout(betAlertTimer);
  }
  betAlertTimer = setTimeout(() => {
    betAlert.classList.add("hidden");
  }, 1600);
}

function maxAllowedBet(state) {
  if (!state || !state.characters || state.characters.length === 0) return null;
  const player = state.characters[0];
  if (!player) return null;
  const setMax = Number.isFinite(state.maxBet) ? state.maxBet : null;
  const betCap = Number.isFinite(state.betCap) ? state.betCap : null;
  const totalBet = Number.isFinite(player.totalBet) ? player.totalBet : 0;
  const lastBet = Number.isFinite(player.lastBet) ? player.lastBet : 0;
  const callOwed = Number.isFinite(player.owed) ? player.owed : 0;
  const capRemaining =
    betCap === null ? null : betCap - totalBet - callOwed + lastBet;
  let allowed = null;
  if (setMax !== null && capRemaining !== null) {
    allowed = Math.min(setMax, capRemaining);
  } else if (setMax !== null) {
    allowed = setMax;
  } else if (capRemaining !== null) {
    allowed = capRemaining;
  }
  if (allowed === null) return null;
  return Math.max(0, Math.floor(allowed));
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
  currentState = state;
  const queueLength = Array.isArray(state.messageQueue) ? state.messageQueue.length : 0;
  const safeCursor = messageCursor > queueLength ? 0 : messageCursor;
  const pendingMessages = Array.isArray(state.messageQueue)
    ? state.messageQueue.slice(safeCursor)
    : [];
  if (!anteVisualActive && pendingMessages.length) {
    const anteMessages = pendingMessages.filter(
      (msg) => Array.isArray(msg.tags) && msg.tags.includes("ante")
    );
    if (anteMessages.length) {
      setupAnteVisual(state, anteMessages);
    }
  }
  document.getElementById("stage").textContent = state.gameStage;
  const displayPot =
    anteVisualActive && Number.isFinite(anteVisualPot) ? anteVisualPot : state.pot;
  document.getElementById("pot").textContent = displayPot;

  const player = state.characters?.[0] || { name: "Player", money: 0, owed: 0, debt: 0, cards: [] };
  const opponent = state.characters?.[1] || { name: "Opponent", money: 0, debt: 0, cards: [] };
  const displayMoney = (idx, fallback) =>
    anteVisualActive &&
    Array.isArray(anteVisualMoney) &&
    Number.isFinite(anteVisualMoney[idx])
      ? anteVisualMoney[idx]
      : fallback;
  const playerDebt = player.debt ?? 0;
  const opponentDebt = opponent.debt ?? 0;
  const playerName = player.name || "Player";
  const opponentName = opponent.name || "Opponent";
  const playerMoneyDisplay = displayMoney(0, player.money ?? 0);
  const opponentMoneyDisplay = displayMoney(1, opponent.money ?? 0);
  document.getElementById("player-name").textContent = playerName;
  document.getElementById("opponent-name").textContent = opponentName;
  document.getElementById("player-money").textContent = playerMoneyDisplay;
  document.getElementById("opponent-money").textContent = opponentMoneyDisplay;

  // Show amount owed for the player whose turn it is
  const currentOwed = state.characters?.[state.currentlyOn]?.owed ?? 0;
  const callAmount = Number.isFinite(state.toPot) ? state.toPot : currentOwed;
  document.getElementById("call-amount").textContent = callAmount;

  const enableDrawSelection = state.gameStage === "change_cards";
  if (!enableDrawSelection) {
    selectedCardIndices.clear();
  }
  drawSelectionEnabled = enableDrawSelection;
  if (drawDoneButton) {
    drawDoneButton.classList.toggle("hidden", !enableDrawSelection);
    drawDoneButton.disabled = !enableDrawSelection;
  }
  if (drawButton) {
    const canStartDraw = state.gameStage === "change_cards";
    drawButton.disabled = !canStartDraw;
  }

  const revealOpponentCards =
    state.revealHands === true || state.gameStage === "showdown";
  const hasPendingDeal = (state.messageQueue || []).some(
    (msg, idx) => Array.isArray(msg.tags) && msg.tags.includes("deal") && idx >= messageCursor
  );
  if (hasPendingDeal && !dealInProgress) {
    pendingDealAnimation = true;
  }
  const dealOverride = dealDisplayState ||
    (pendingDealAnimation && !dealInProgress
      ? { playerCards: [], opponentCards: [], revealPlayer: false, revealOpponent: false, padToFive: false }
      : null);
  renderHands(player, opponent, revealOpponentCards, dealOverride);

  const playerLabel = document.querySelector(".hand.player .hand-label");
  const opponentLabel = document.querySelector(".hand.opponent .hand-label");
  const isPlayerTurn = state.currentlyOn === 0;
  const isOpponentTurn = state.currentlyOn === 1;
  const isPlayerDealer = state.dealer === 0;
  const isOpponentDealer = state.dealer === 1;
  const labelTemplate = (name, money, turn, isDealer, isDebt) =>
    `<span class="turn ${turn ? "" : "off"}">${turn ? ">" : "--"}</span> <span class="dealer ${
      isDealer ? "" : "off"
    }">${isDealer ? "D" : "-"}</span> <span class="name">${name}</span>: <span class="money${
      money < 0 || isDebt ? " negative" : ""
    }">${money}</span>`;
  if (playerLabel)
    playerLabel.innerHTML = labelTemplate(
      playerName,
      playerMoneyDisplay,
      isPlayerTurn,
      isPlayerDealer,
      playerDebt < 0
    );
  if (opponentLabel)
    opponentLabel.innerHTML = labelTemplate(
      opponentName,
      opponentMoneyDisplay,
      isOpponentTurn,
      isOpponentDealer,
      opponentDebt < 0
    );
  if (playerWallet) {
    playerWallet.innerHTML = labelTemplate(
      playerName,
      playerMoneyDisplay,
      isPlayerTurn,
      isPlayerDealer,
      playerDebt < 0
    );
  }
  if (opponentWallet) {
    opponentWallet.innerHTML = labelTemplate(
      opponentName,
      opponentMoneyDisplay,
      isOpponentTurn,
      isOpponentDealer,
      opponentDebt < 0
    );
  }

  const msgs = state.messageQueue || [];
  renderMessages(msgs);
  enqueueMessages(msgs);
  if (!messagePlaybackActive) {
    messageLine.textContent = lastMessageText(state) || "Waiting for action...";
  }

  const shouldShowShowdown =
    state.revealHands === true || (state.revealHands === undefined && state.gameStage === "end_round");
  if (showdownModal) {
    showdownModal.classList.toggle("hidden", !shouldShowShowdown);
  }
  if (shouldShowShowdown) {
    if (showdownPlayerName) showdownPlayerName.textContent = playerName;
    if (showdownOpponentName) showdownOpponentName.textContent = opponentName;
    if (showdownPlayerHand) showdownPlayerHand.textContent = player.handName || "";
    if (showdownOpponentHand) showdownOpponentHand.textContent = opponent.handName || "";
    if (showdownPlayerCards) {
      renderCards(showdownPlayerCards, player.cards, true);
    }
    if (showdownOpponentCards) {
      renderCards(showdownOpponentCards, opponent.cards, true);
    }
    const winnerMsg = [...msgs].reverse().find((m) => m.text && m.text.includes("wins the pot"));
    let winnerName = null;
    if (winnerMsg && typeof winnerMsg.text === "string") {
      const match = winnerMsg.text.match(/^(.+?) wins the pot/);
      if (match) {
        winnerName = match[1].trim();
      }
    }
    if (showdownWinnerLine) {
      if (winnerMsg) {
        showdownWinnerLine.textContent = winnerMsg.text;
      } else if (winnerName) {
        showdownWinnerLine.textContent = `Winner: ${winnerName}`;
      } else {
        showdownWinnerLine.textContent = "Round complete.";
      }
    }
    if (showdownReasonLine) {
      let reason = "";
      if (winnerName) {
        const winnerHand =
          winnerName === playerName ? player.handName : winnerName === opponentName ? opponent.handName : "";
        const loserHand =
          winnerName === playerName ? opponent.handName : winnerName === opponentName ? player.handName : "";
        if (winnerHand && loserHand) {
          reason = `${winnerHand} beats ${loserHand}.`;
        } else if (winnerHand) {
          reason = `Winning hand: ${winnerHand}.`;
        }
      }
      showdownReasonLine.textContent = reason;
    }
  }

  const isGameOver = state.gameStage === "game_over";
  if (gameOverModal) {
    gameOverModal.classList.toggle("hidden", !isGameOver);
  }
  if (isGameOver) {
    const winner = state.winnerName || "Unknown";
    if (gameOverWinner) {
      gameOverWinner.textContent = winner;
    }
    setControlsDisabled(true);
  }

  if (handModal && (isGameOver || shouldShowShowdown)) {
    closeHandModal();
  }

  if (state.gameStage === "change_cards") {
    openHandModal("draw");
  } else if (handModalMode === "draw") {
    closeHandModal();
  }

  if (handModal && !handModal.classList.contains("hidden") && handModalCards) {
    const selectable = handModalMode === "draw";
    renderCards(handModalCards, player.cards, true, {
      selectable,
      selectedIndices: selectedCardIndices,
      onToggle: (idx) => toggleCardSelection(idx, player.cards),
    });
  }

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

  if (state.gameStage === "end_round" && state.revealHands !== true) {
    setControlsDisabled(true);
    if (lastStage !== "end_round" && !autoAdvancePending) {
      autoAdvancePending = true;
      waitForRoundAdvance().then(async () => {
        await changeMode("start_round");
        autoAdvancePending = false;
      });
    }
  } else if (autoAdvancePending) {
    autoAdvancePending = false;
  }

  if (switchOpponentButton) {
    switchOpponentButton.classList.toggle("hidden", state.gameStage !== "game_over");
  }

  lastStage = state.gameStage;

  const portrait = selectedOpponent?.portrait || (selectedOpponent && portraitsByName[selectedOpponent.name]);
  const oppMedia = opponent.media && opponent.media.length ? opponent.media : selectedOpponent?.media;
  const stripImages = state.stripImages || {};
  const stripIndices = state.stripIndices || {};
  const stripImage =
    stripImages[opponentName] || (selectedOpponent && stripImages[selectedOpponent.name]);
  const stripIndex =
    stripIndices[opponentName] || (selectedOpponent && stripIndices[selectedOpponent.name]);
  const indexedMedia =
    oppMedia && typeof stripIndex === "number"
      ? oppMedia[Math.min(stripIndex, oppMedia.length - 1)]
      : null;
  const mediaSrc = indexedMedia || stripImage || (oppMedia && oppMedia[0]) || portrait;
  if (mediaSrc) {
    // Ensure media path starts with / if not already
    const fullMediaSrc = mediaSrc.startsWith('/') ? mediaSrc : `/${mediaSrc}`;
    mediaWindow.style.backgroundImage = `url('${fullMediaSrc}')`;
  } else {
    mediaWindow.style.backgroundImage = 'none';
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

function toggleCardSelection(index, cards) {
  if (!drawSelectionEnabled) return;
  if (selectedCardIndices.has(index)) {
    selectedCardIndices.delete(index);
  } else {
    selectedCardIndices.add(index);
  }
  if (playerHandEl) {
    renderCards(playerHandEl, cards, true, {
      selectable: drawSelectionEnabled,
      selectedIndices: selectedCardIndices,
      onToggle: (idx) => toggleCardSelection(idx, cards),
    });
  }
  if (handModal && !handModal.classList.contains("hidden") && handModalCards) {
    renderCards(handModalCards, cards, true, {
      selectable: drawSelectionEnabled,
      selectedIndices: selectedCardIndices,
      onToggle: (idx) => toggleCardSelection(idx, cards),
    });
  }
}

function openHandModal(mode) {
  if (!handModal) return;
  if (!currentState) return;
  const nextMode = mode || "view";
  const inDrawStage = currentState.gameStage === "change_cards";
  if (nextMode === "draw" && !inDrawStage) {
    return;
  }
  handModalMode = nextMode;
  if (handModalTitle) {
    handModalTitle.textContent = nextMode === "draw" ? "Select Cards" : "Your Hand";
  }
  if (handModalMessage) {
    const showMessage = nextMode === "draw";
    handModalMessage.classList.toggle("hidden", !showMessage);
  }
  if (handModalProceed) {
    handModalProceed.classList.toggle("hidden", nextMode === "draw");
  }
  if (handModalDone) {
    handModalDone.classList.toggle("hidden", nextMode !== "draw");
  }
  handModal.classList.remove("hidden");
  if (handModalCards && currentState?.characters?.[0]) {
    const player = currentState.characters[0];
    const selectable = nextMode === "draw";
    renderCards(handModalCards, player.cards, true, {
      selectable,
      selectedIndices: selectedCardIndices,
      onToggle: (idx) => toggleCardSelection(idx, player.cards),
    });
  }
}

function closeHandModal() {
  if (!handModal) return;
  handModal.classList.add("hidden");
  handModalMode = null;
}

async function createAndStartGame() {
  if (!selectedOpponent) return;
  setStatus(`Loading game vs ${selectedOpponent.name}...`);
  const rawName = playerNameInput ? playerNameInput.value.trim() : "";
  const playerName = rawName || "Player";
  const payload = {
    players: [
      { name: playerName },
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

async function changeMode(mode) {
  if (!gameId) return;
  const data = await api(`/games/${gameId}/mode`, {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
  renderState(data.state);
}

async function sendAction(action) {
  if (!gameId) return;
  const payload = { action };
  if (action === "bet" || action === "raise") {
    payload.amount = Number(betInput.value || 0);
    const allowed = maxAllowedBet(currentState);
    if (allowed !== null && payload.amount > allowed) {
      showBetAlert(`Only ${allowed} is max allowed bet at this game round!`);
      return;
    }
  }
  const data = await api(`/games/${gameId}/action`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (action === "bet") {
    betButton.classList.remove("pulse-border");
  }
  renderState(data.state);
  // Close mobile action drawer after any action
  setControlsOpen(false);
}

async function sendChangeCards() {
  if (!gameId) return;
  const indices = Array.from(selectedCardIndices.values());
  const payload = { action: "change_cards", indices };
  const data = await api(`/games/${gameId}/action`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  selectedCardIndices.clear();
  renderState(data.state);
}

if (ageYesButton) {
  ageYesButton.addEventListener("click", () => {
    showSection("opponentSelect");
    loadOpponents();
    setStatus("Pick an opponent");
  });
}

if (ageNoButton) {
  ageNoButton.addEventListener("click", () => {
    const warning = document.getElementById("age-warning");
    warning.classList.remove("hidden");
    setStatus("Session ended");
    if (ageExitModal) {
      ageExitModal.classList.remove("hidden");
    }
    if (ageYesButton) {
      ageYesButton.disabled = true;
    }
    ageNoButton.disabled = true;
  });
}

startButton.addEventListener("click", createAndStartGame);

document.querySelectorAll("button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => sendAction(btn.dataset.action));
});

document.querySelectorAll("button[data-mode]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const mode = btn.dataset.mode;
    if (mode === "end_round") {
      if (currentState?.gameStage === "end_round") {
        await waitForRoundAdvance();
        await changeMode("start_round");
      } else {
        await changeMode(mode);
      }
      setControlsOpen(false);
      return;
    }
    if (mode === "change_cards") {
      if (currentState?.gameStage === "change_cards") {
        openHandModal("draw");
      }
      setControlsOpen(false);
      return;
    }
    await changeMode(mode);
    setControlsOpen(false);
  });
});

if (drawDoneButton) {
  drawDoneButton.addEventListener("click", () => {
    sendChangeCards();
    setControlsOpen(false);
  });
}

if (showdownProceed) {
  showdownProceed.addEventListener("click", async () => {
    if (showdownModal) {
      showdownModal.classList.add("hidden");
    }
    await waitForRoundAdvance();
    await changeMode("start_round");
    setControlsOpen(false);
  });
}

if (switchOpponentButton) {
  switchOpponentButton.addEventListener("click", () => {
    resetToOpponentSelect();
  });
}

if (playerHandEl) {
  playerHandEl.addEventListener("click", () => {
    if (!currentState) return;
    if (currentState.gameStage === "game_over") return;
    const mode = currentState.gameStage === "change_cards" ? "draw" : "view";
    openHandModal(mode);
  });
}

if (handModalProceed) {
  handModalProceed.addEventListener("click", () => closeHandModal());
}

if (handModalDone) {
  handModalDone.addEventListener("click", async () => {
    await sendChangeCards();
    closeHandModal();
  });
}

if (rulesButton) {
  rulesButton.addEventListener("click", () => openRulesModal());
}

if (rulesClose) {
  rulesClose.addEventListener("click", () => closeRulesModal());
}

if (rulesModal) {
  rulesModal.addEventListener("click", (event) => {
    if (event.target === rulesModal) {
      closeRulesModal();
    }
  });
}

if (settingsButton) {
  settingsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSettingsPanel();
  });
}

if (soundToggle) {
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    updateSoundToggle();
  });
}

if (settingsSave) {
  settingsSave.addEventListener("click", async (event) => {
    event.stopPropagation();
    toggleSettingsPanel(false);
    await saveGameSnapshot();
  });
}

if (settingsLoad) {
  settingsLoad.addEventListener("click", async (event) => {
    event.stopPropagation();
    toggleSettingsPanel(false);
    await loadGameSnapshot();
  });
}

if (settingsInventory) {
  settingsInventory.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSettingsPanel(false);
    openInventoryModal();
  });
}

if (settingsQuit) {
  settingsQuit.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSettingsPanel(false);
    quitToAgeGate();
  });
}

if (inventoryClose) {
  inventoryClose.addEventListener("click", () => closeInventoryModal());
}

if (inventoryModal) {
  inventoryModal.addEventListener("click", (event) => {
    if (event.target === inventoryModal) {
      closeInventoryModal();
    }
  });
}

if (mobileActionsButton) {
  mobileActionsButton.addEventListener("click", () => {
    if (!isMobileLayout()) return;
    const isOpen = document.body.classList.contains("controls-open");
    setControlsOpen(!isOpen);
  });
}

if (controlsScrim) {
  controlsScrim.addEventListener("click", () => setControlsOpen(false));
}

window.addEventListener("resize", () => {
  if (!isMobileLayout()) {
    setControlsOpen(false);
  }
});

function resetToOpponentSelect() {
  gameId = null;
  selectedOpponent = null;
  selectedCardIndices.clear();
  messageCursor = 0;
  messagePlaybackQueue = [];
  messagePlaybackActive = false;
  if (messagePlaybackTimer) {
    clearTimeout(messagePlaybackTimer);
  }
  showSection("opponentSelect");
  loadOpponents();
  setStatus("Pick an opponent");
}

function quitToAgeGate() {
  gameId = null;
  selectedOpponent = null;
  selectedCardIndices.clear();
  messageCursor = 0;
  messagePlaybackQueue = [];
  messagePlaybackActive = false;
  if (messagePlaybackTimer) {
    clearTimeout(messagePlaybackTimer);
  }
  showSection("ageGate");
  setStatus("Session ended");
}

async function saveGameSnapshot() {
  if (!gameId) {
    showBetAlert("No active game to save.");
    return;
  }
  try {
    await api("/save", { method: "POST", body: JSON.stringify({ gameId }) });
    setStatus("Game saved");
    showBetAlert("Game saved.");
  } catch (err) {
    showBetAlert(`Save failed: ${err.message}`);
  }
}

async function loadGameSnapshot() {
  try {
    const data = await api("/load", { method: "POST" });
    if (!data || !data.state) {
      showBetAlert("No saved game found.");
      return;
    }
    gameId = data.id;
    document.getElementById("game-id").textContent = gameId;
    const opponentName = data.state.characters?.[1]?.name;
    if (opponentName) {
      selectOpponentByName(opponentName);
    }
    renderState(data.state);
    showSection("game");
    setStatus("Loaded saved game");
  } catch (err) {
    showBetAlert(`Load failed: ${err.message}`);
  }
}

if (gameOverNew) {
  gameOverNew.addEventListener("click", () => {
    if (gameOverModal) {
      gameOverModal.classList.add("hidden");
    }
    resetToOpponentSelect();
  });
}

if (gameOverQuit) {
  gameOverQuit.addEventListener("click", () => {
    if (gameOverModal) {
      gameOverModal.classList.add("hidden");
    }
    quitToAgeGate();
  });
}

updateSoundToggle();

// Quick ping to update status chip so "Not connected" only shows if the API is unreachable.
(async function checkConnection() {
  try {
    await api("/opponents");
    setStatus("Connected");
  } catch {
    setStatus("Not connected");
  }
})();
