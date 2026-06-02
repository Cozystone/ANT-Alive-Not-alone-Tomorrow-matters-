const world = document.getElementById("world");
const player = document.getElementById("player");
const corpseLayer = document.getElementById("corpseLayer");
const bodyCountEl = document.getElementById("bodyCount");
const prompt = document.getElementById("prompt");
const flashbackOverlay = document.getElementById("flashbackOverlay");
const flashbackCaption = document.getElementById("flashbackCaption");
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

const fallbackCaptions = [
  "어떤 여름의 저녁",
  "멀리서 웃음소리가 들리던 식탁",
  "하와이의 빛이 눈꺼풀 안쪽에 남아 있다",
  "손을 놓치지 않던 밤",
  "이름을 부르면 돌아보던 순간",
  "그때는 당연했던 체온",
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
  flashbackNextChange: 0.82,
  flashbackStarted: false,
  promptShown: false,
};

const motion = {
  walkSpeed: 235,
  baseGravity: 500,
  lastTime: 0,
  frameId: 0,
};

function preloadFlashbacks() {
  const checks = flashbackSources.map((src) => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(src);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  });

  Promise.all(checks).then((results) => {
    state.availableFlashbacks = results.filter(Boolean);
    updateFlashbackBackground(0);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
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

function randomCaption() {
  return fallbackCaptions[Math.floor(Math.random() * fallbackCaptions.length)];
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
  state.flashbackStarted = false;
  state.flashbackTimer = 0;
  state.flashbackNextChange = 0.82;
  state.promptShown = false;
}

function updateFlashbackBackground(progress) {
  const sources = state.availableFlashbacks.length > 0 ? state.availableFlashbacks : flashbackSources;
  const lead = sources[state.flashbackIndex % sources.length];
  const trail = sources[(state.flashbackIndex + 1) % sources.length];
  const posLeadX = 28 + ((state.flashbackIndex * 13) % 42);
  const posTrailX = 52 + ((state.flashbackIndex * 7) % 26);
  const posLeadY = 22 + ((state.flashbackIndex * 9) % 34);
  const posTrailY = 30 + ((state.flashbackIndex * 5) % 28);
  const scale = lerp(1.06, 1, clamp(progress, 0, 1));

  flashbackWashes[0].style.backgroundImage = `linear-gradient(180deg, rgba(255, 239, 219, 0.14), rgba(255, 171, 121, 0.04)), url("${lead}")`;
  flashbackWashes[0].style.backgroundPosition = `${posLeadX}% ${posLeadY}%`;
  flashbackWashes[0].style.transform = `scale(${scale})`;

  flashbackWashes[1].style.backgroundImage = `linear-gradient(180deg, rgba(255, 239, 219, 0.12), rgba(255, 171, 121, 0.02)), url("${trail}")`;
  flashbackWashes[1].style.backgroundPosition = `${posTrailX}% ${posTrailY}%`;
  flashbackWashes[1].style.transform = `scale(${scale * 1.02})`;

  flashbackCaption.textContent = randomCaption();
}

function updateFlashbacks(deltaSeconds, progress) {
  if (progress < 0.08) {
    return;
  }

  const slowPhase = clamp((progress - 0.08) / 0.82, 0, 1);

  if (!state.flashbackStarted) {
    state.flashbackStarted = true;
    flashbackOverlay.classList.add("active");
    updateFlashbackBackground(progress);
    flashbackWashes[0].classList.add("visible");
  }

  flashbackOverlay.style.opacity = String(lerp(0.34, 1, slowPhase));
  state.flashbackTimer += deltaSeconds;

  if (state.flashbackTimer >= state.flashbackNextChange) {
    state.flashbackTimer = 0;
    state.flashbackIndex += 1;
    updateFlashbackBackground(progress);
    flashbackWashes.forEach((wash, index) => {
      const active = index === state.flashbackIndex % flashbackWashes.length;
      wash.classList.toggle("visible", active);
      wash.style.opacity = active ? String(lerp(0.72, 0.96, slowPhase)) : "0";
    });
    state.flashbackNextChange = lerp(0.9, 1.95, slowPhase) + Math.random() * 0.18;
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
  const flashbackBlend = state.flashbackStarted ? clamp(Number.parseFloat(flashbackOverlay.style.opacity || "0"), 0, 1) : 0;
  skylineFar.style.opacity = `${0.36 * (1 - flashbackBlend)}`;
  skylineNear.style.opacity = `${0.9 * (1 - flashbackBlend)}`;

  const playerScreenX = getRoofLeftX() + state.playerX;
  const playerScreenY = state.playerWorldY - state.cameraY;
  player.style.left = `${playerScreenX}px`;
  player.style.bottom = `${playerScreenY}px`;
  const progress = getProgress();
  const fallTilt = state.mode === "falling" || state.mode === "confirming" || state.mode === "chosen-yes"
    ? lerp(10, 78, clamp(progress, 0, 1))
    : 0;
  player.style.setProperty("--player-tilt", `${fallTilt}deg`);

  renderBodies();
}

function resetPlayer() {
  state.mode = "idle";
  state.playerX = Math.min(170, state.roofWidth * 0.55);
  state.playerWorldY = state.roofWorldY;
  state.fallVelocity = 0;
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
  setPromptVisible(true);
  renderWorld();
  promptButtons[0].focus();
}

function addCorpse() {
  const row = Math.floor(state.bodyCount / 6);
  const col = state.bodyCount % 6;
  const body = {
    x: state.towerLeft - 12 + col * 32 + Math.random() * 18,
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
  const progress = getProgress();
  const slowPhase = clamp((progress - 0.08) / 0.82, 0, 1);
  const isPromptFall = state.mode === "confirming";
  const isChosenYes = state.mode === "chosen-yes";
  const timeScale = isPromptFall
    ? lerp(0.16, 0.07, slowPhase)
    : isChosenYes
      ? lerp(0.24, 0.12, slowPhase)
      : lerp(0.36, 0.14, slowPhase);
  const gravity = isPromptFall
    ? lerp(motion.baseGravity * 0.16, motion.baseGravity * 0.06, slowPhase)
    : isChosenYes
      ? lerp(motion.baseGravity * 0.24, motion.baseGravity * 0.1, slowPhase)
      : lerp(motion.baseGravity * 0.4, motion.baseGravity * 0.14, slowPhase);
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
    player.classList.remove("falling");

    if (state.mode === "chosen-yes") {
      addCorpse();
      state.mode = "corpse-landed";
      renderWorld();
      window.setTimeout(() => {
        resetPlayer();
      }, 420);
      return;
    }

    if (state.mode === "falling") {
      showPrompt();
      return;
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
