const scene = document.getElementById("scene");
const world = document.getElementById("world");
const player = document.getElementById("player");
const corpseLayer = document.getElementById("corpseLayer");
const bodyCountEl = document.getElementById("bodyCount");
const prompt = document.getElementById("prompt");
const flashbackOverlay = document.getElementById("flashbackOverlay");
const whiteout = document.getElementById("whiteout");
const bgm = document.getElementById("bgm");
const startOverlay = document.getElementById("startOverlay");
const promptButtons = [...prompt.querySelectorAll("button")];
const flashbackWashes = [...flashbackOverlay.querySelectorAll(".flashback-wash")];
const towerWrap = document.getElementById("towerWrap");
const rooftop = document.getElementById("rooftop");
const ground = document.getElementById("ground");
const skylineFar = document.getElementById("skylineFar");
const skylineNear = document.getElementById("skylineNear");

const flashbackSources = [
  "assets/flashbacks/photo-1.jpg",
  "assets/flashbacks/photo-2.jpg",
  "assets/flashbacks/photo-3.jpg",
  "assets/flashbacks/photo-4.jpg",
];

const state = {
  mode: "idle",
  keys: {
    ArrowLeft: false,
    ArrowRight: false,
  },
  startedAudio: false,
  playerX: 150,
  playerWorldY: 0,
  fallVelocity: 0,
  fallElapsed: 0,
  bodyCount: 0,
  bodies: [],
  roofWidth: 320,
  towerWidth: 240,
  towerLeft: 0,
  roofWorldY: 0,
  groundWorldY: 44,
  towerHeight: 0,
  cameraY: 0,
  baseCameraY: 0,
  sceneHeight: 0,
  sceneWidth: 0,
  availableFlashbacks: [],
  flashbackIndex: 0,
  flashbackTimer: 0,
  flashbackNextChange: 1.15,
  flashbackStarted: false,
  promptShown: false,
  activeWashIndex: 0,
  washTimeout: 0,
  impactX: 0,
};

const motion = {
  walkSpeed: 235,
  baseGravity: 500,
  lastTime: 0,
  frameId: 0,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function preloadFlashbacks() {
  const checks = flashbackSources.map((src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => resolve(null);
    image.src = src;
  }));

  Promise.all(checks).then((results) => {
    state.availableFlashbacks = results.filter(Boolean);
    paintFlashbackPair();
  });
}

function getRoofLeftX() {
  return state.towerLeft - state.roofWidth * 0.09;
}

function getRoofRightLimit() {
  return state.roofWidth - 26;
}

function getProgress() {
  const totalDistance = state.roofWorldY - state.groundWorldY;
  return clamp((state.roofWorldY - state.playerWorldY) / totalDistance, 0, 1);
}

function startAudioIfNeeded() {
  if (state.startedAudio) {
    return;
  }

  state.startedAudio = true;
  bgm.volume = 0.64;
  bgm.play().catch(() => {
    state.startedAudio = false;
  });
  startOverlay.classList.add("hidden");
}

function setPromptVisible(visible) {
  prompt.classList.toggle("hidden", !visible);
  promptButtons.forEach((button) => {
    button.disabled = !visible;
  });
}

function updateWorldMetrics() {
  state.sceneHeight = world.clientHeight;
  state.sceneWidth = world.clientWidth;
  state.towerWidth = Math.min(state.sceneWidth * 0.18, 245);
  state.roofWidth = Math.min(state.sceneWidth * 0.24, 320);
  state.towerLeft = state.sceneWidth * 0.6;
  state.roofWorldY = Math.max(state.sceneHeight * 3.15, 2700);
  state.groundWorldY = 48;
  state.towerHeight = state.roofWorldY + 300;
  state.baseCameraY = state.roofWorldY - state.sceneHeight * 0.78;

  towerWrap.style.left = `${state.towerLeft}px`;
  towerWrap.style.width = `${state.towerWidth}px`;
  towerWrap.style.height = `${state.towerHeight}px`;
  rooftop.style.width = `${state.roofWidth}px`;
  ground.style.height = `${Math.max(152, state.sceneHeight * 0.17)}px`;

  if (state.mode === "idle" || state.mode === "walking") {
    state.cameraY = state.baseCameraY;
    state.playerWorldY = state.roofWorldY;
  }
}

function resetFlashbacks() {
  flashbackOverlay.classList.remove("active");
  flashbackOverlay.style.opacity = "";
  flashbackWashes.forEach((wash) => {
    wash.classList.remove("visible");
    wash.style.opacity = "";
  });
  if (state.washTimeout) {
    window.clearTimeout(state.washTimeout);
    state.washTimeout = 0;
  }
  scene.classList.remove("flashback-mode");
  state.flashbackStarted = false;
  state.flashbackTimer = 0;
  state.flashbackNextChange = 1.15;
  state.promptShown = false;
  state.activeWashIndex = 0;
}

function paintFlashbackPair() {
  const sources = state.availableFlashbacks.length > 0 ? state.availableFlashbacks : flashbackSources;
  const lead = sources[state.flashbackIndex % sources.length];
  const leadX = 26 + ((state.flashbackIndex * 11) % 44);
  const leadY = 24 + ((state.flashbackIndex * 7) % 28);
  const targetWash = flashbackWashes[state.activeWashIndex];
  targetWash.style.backgroundImage = `url("${lead}")`;
  targetWash.style.backgroundPosition = `${leadX}% ${leadY}%`;
}

function updateFlashbacks(deltaSeconds, progress) {
  if (progress < 0.08) {
    return;
  }

  const slowPhase = clamp((progress - 0.08) / 0.82, 0, 1);

  if (!state.flashbackStarted) {
    state.flashbackStarted = true;
    scene.classList.add("flashback-mode");
    flashbackOverlay.classList.add("active");
    state.activeWashIndex = 0;
    paintFlashbackPair();
    flashbackWashes[0].classList.add("visible");
  }

  flashbackOverlay.style.opacity = String(lerp(0.6, 1, slowPhase));
  state.flashbackTimer += deltaSeconds;

  if (state.flashbackTimer >= state.flashbackNextChange) {
    state.flashbackTimer = 0;
    state.flashbackIndex += 1;
    const previousWash = state.activeWashIndex;
    state.activeWashIndex = (state.activeWashIndex + 1) % flashbackWashes.length;
    paintFlashbackPair();
    flashbackWashes[state.activeWashIndex].classList.add("visible");
    flashbackWashes[state.activeWashIndex].style.opacity = "1";
    if (state.washTimeout) {
      window.clearTimeout(state.washTimeout);
    }
    state.washTimeout = window.setTimeout(() => {
      flashbackWashes[previousWash].classList.remove("visible");
      flashbackWashes[previousWash].style.opacity = "0";
      state.washTimeout = 0;
    }, 180);
    state.flashbackNextChange = lerp(1.3, 2.7, slowPhase) + Math.random() * 0.2;
  }
}

function renderBodies() {
  bodyCountEl.textContent = String(state.bodyCount);
  corpseLayer.innerHTML = "";

  state.bodies.forEach((body) => {
    const corpse = document.createElement("div");
    corpse.className = "corpse";
    corpse.style.left = `${body.x}px`;
    corpse.style.bottom = `${body.y - state.cameraY}px`;
    corpse.style.transform = `rotate(${body.angle}deg) scale(${body.scale})`;
    corpseLayer.appendChild(corpse);
  });
}

function renderWorld() {
  towerWrap.style.bottom = `${-state.cameraY}px`;
  ground.style.bottom = `${-state.cameraY - 110}px`;
  skylineFar.style.bottom = `${28 - state.cameraY * 0.18}px`;
  skylineNear.style.bottom = `${-14 - state.cameraY * 0.36}px`;

  const flashbackBlend = state.flashbackStarted
    ? clamp(Number.parseFloat(flashbackOverlay.style.opacity || "0"), 0, 1)
    : 0;
  skylineFar.style.opacity = `${0.36 * (1 - flashbackBlend)}`;
  skylineNear.style.opacity = `${0.9 * (1 - flashbackBlend)}`;

  const playerScreenX = getRoofLeftX() + state.playerX;
  const playerScreenY = state.playerWorldY - state.cameraY;
  player.style.left = `${playerScreenX}px`;
  player.style.bottom = `${playerScreenY}px`;

  const progress = getProgress();
  const fallTilt = state.mode === "falling"
    || state.mode === "confirming"
    || state.mode === "chosen-yes"
    || state.mode === "corpse-landed"
    || state.mode === "fade-reset"
    ? lerp(-10, -78, progress)
    : 0;
  player.style.setProperty("--player-tilt", `${fallTilt}deg`);

  renderBodies();
}

function resetPlayer() {
  state.mode = "idle";
  state.playerX = Math.min(170, state.roofWidth * 0.55);
  state.playerWorldY = state.roofWorldY;
  state.fallVelocity = 0;
  state.fallElapsed = 0;
  state.impactX = getRoofLeftX() + state.playerX;
  state.cameraY = state.baseCameraY;
  player.classList.remove("falling");
  player.classList.remove("walking");
  resetFlashbacks();
  renderWorld();
}

function beginFall() {
  if (state.mode === "falling" || state.mode === "confirming" || state.mode === "chosen-yes") {
    return;
  }

  state.mode = "falling";
  state.fallVelocity = 8;
  state.fallElapsed = 0;
  player.classList.add("falling");
  player.classList.remove("walking");
  resetFlashbacks();
}

function showPrompt() {
  if (state.promptShown) {
    return;
  }

  state.mode = "confirming";
  state.promptShown = true;
  scene.classList.remove("flashback-mode");
  setPromptVisible(true);
  renderWorld();
  promptButtons[0].focus();
}

function addCorpse() {
  const row = Math.floor(state.bodyCount / 6);
  const body = {
    x: clamp(state.impactX - 56 + (Math.random() * 10 - 5), 12, state.sceneWidth - 124),
    y: 16 + row * 11,
    angle: -10 + Math.random() * 24,
    scale: 0.88 + Math.random() * 0.16,
  };

  state.bodies.push(body);
  state.bodyCount += 1;
}

function handleChoice(choice) {
  if (state.mode !== "confirming") {
    return;
  }

  if (choice === "yes") {
    setPromptVisible(false);
    state.mode = "chosen-yes";
    return;
  }

  setPromptVisible(false);
  state.mode = "fade-reset";
  whiteout.classList.add("active");
  window.setTimeout(() => {
    resetPlayer();
  }, 760);
  window.setTimeout(() => {
    whiteout.classList.remove("active");
  }, 1480);
}

function updateWalking(deltaSeconds) {
  let direction = 0;
  if (state.keys.ArrowLeft) {
    direction -= 1;
  }
  if (state.keys.ArrowRight) {
    direction += 1;
  }

  if (direction === 0) {
    if (state.mode === "walking") {
      state.mode = "idle";
      player.classList.remove("walking");
    }
    return;
  }

  if (state.mode === "idle") {
    state.mode = "walking";
    player.classList.add("walking");
  }

  state.playerX += direction * motion.walkSpeed * deltaSeconds;

  if (state.playerX > getRoofRightLimit()) {
    state.playerX = getRoofRightLimit();
  }

  if (state.playerX < -24) {
    beginFall();
  }
}

function updateFalling(deltaSeconds) {
  state.fallElapsed += deltaSeconds;
  const progress = getProgress();
  const slowPhase = clamp((progress - 0.08) / 0.82, 0, 1);
  const isPromptFall = state.mode === "confirming";
  const isChosenYes = state.mode === "chosen-yes";
  const introBoost = state.fallElapsed < 0.5 ? 1 - state.fallElapsed / 0.5 : 0;

  const timeScale = isPromptFall
    ? lerp(0.16, 0.07, slowPhase)
    : isChosenYes
      ? lerp(0.24, 0.12, slowPhase)
      : lerp(0.36, 0.14, slowPhase) + introBoost * 0.42;

  const gravity = isPromptFall
    ? lerp(motion.baseGravity * 0.16, motion.baseGravity * 0.06, slowPhase)
    : isChosenYes
      ? lerp(motion.baseGravity * 0.24, motion.baseGravity * 0.1, slowPhase)
      : lerp(motion.baseGravity * 0.4, motion.baseGravity * 0.14, slowPhase) + introBoost * motion.baseGravity * 0.42;

  const effectiveDelta = deltaSeconds * timeScale;

  state.fallVelocity += gravity * effectiveDelta;
  state.playerWorldY -= state.fallVelocity * effectiveDelta;
  state.playerX -= lerp(4.5, 1.6, slowPhase) * deltaSeconds;

  const cameraTarget = Math.max(0, state.playerWorldY - state.sceneHeight * lerp(0.57, 0.46, slowPhase));
  state.cameraY = lerp(state.cameraY, cameraTarget, isPromptFall ? 0.028 : 0.042 + slowPhase * 0.03);

  updateFlashbacks(deltaSeconds, progress);

  if (!state.promptShown && progress >= 0.8) {
    showPrompt();
  }

  if (state.playerWorldY <= state.groundWorldY) {
    state.playerWorldY = state.groundWorldY;
    state.cameraY = 0;
    state.impactX = getRoofLeftX() + state.playerX;
    player.classList.remove("falling");

    if (state.mode === "chosen-yes" || state.mode === "confirming") {
      scene.classList.remove("flashback-mode");
      setPromptVisible(false);
      addCorpse();
      state.mode = "corpse-landed";
      renderWorld();
      window.setTimeout(() => {
        resetPlayer();
      }, 3000);
      return;
    }

    if (state.mode === "falling") {
      showPrompt();
    }
  }
}

function animate(timestamp) {
  if (!motion.lastTime) {
    motion.lastTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - motion.lastTime) / 1000, 0.032);
  motion.lastTime = timestamp;

  if (state.mode === "idle" || state.mode === "walking") {
    updateWalking(deltaSeconds);
  } else if (state.mode === "falling" || state.mode === "confirming" || state.mode === "chosen-yes") {
    updateFalling(deltaSeconds);
  }

  renderWorld();
  motion.frameId = window.requestAnimationFrame(animate);
}

function onKeyChange(event, pressed) {
  if (!(event.key in state.keys)) {
    return;
  }

  event.preventDefault();
  state.keys[event.key] = pressed;
  startAudioIfNeeded();
}

function bindEvents() {
  window.addEventListener("keydown", (event) => onKeyChange(event, true));
  window.addEventListener("keyup", (event) => onKeyChange(event, false));
  window.addEventListener("resize", () => {
    updateWorldMetrics();
    renderWorld();
  });
  prompt.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-choice]");
    if (!button) {
      return;
    }
    handleChoice(button.dataset.choice);
  });
}

function init() {
  preloadFlashbacks();
  updateWorldMetrics();
  resetPlayer();
  bindEvents();
  motion.frameId = window.requestAnimationFrame(animate);
}

init();
