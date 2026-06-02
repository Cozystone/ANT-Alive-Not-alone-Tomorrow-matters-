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
const flashbackFrames = [...flashbackOverlay.querySelectorAll(".flashback-frame")];

const flashbackSources = [
  "assets/flashbacks/photo-1.jpg",
  "assets/flashbacks/photo-2.jpg",
  "assets/flashbacks/photo-3.jpg",
  "assets/flashbacks/photo-4.jpg",
  "assets/flashbacks/photo-5.jpg",
];

const fallbackCaptions = [
  "어떤 여름의 저녁",
  "멀리서 웃음소리가 들리던 식탁",
  "하와이의 노을을 닮은 사진 한 장",
  "손을 놓치지 않던 밤",
  "이름을 부르면 돌아보던 순간",
  "그때는 당연했던 체온",
];

const state = {
  mode: "idle",
  playerX: 150,
  playerY: 0,
  fallVelocity: 0,
  bodies: [],
  bodyCount: 0,
  keys: {
    ArrowLeft: false,
    ArrowRight: false,
  },
  startedAudio: false,
  flashbackIndex: 0,
  flashbackTimer: null,
  availableFlashbacks: [],
  rooftopWidth: 260,
  groundHeight: 0,
};

const motion = {
  speed: 220,
  gravity: 1600,
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
    randomizeFlashbackFrames();
  });
}

function updateWorldMetrics() {
  const styles = getComputedStyle(document.documentElement);
  const rooftopWidth = Math.min(window.innerWidth * 0.21, 260);
  state.rooftopWidth = rooftopWidth;
  state.groundHeight = world.clientHeight * 0.12;
  if (state.mode === "idle" || state.mode === "walking") {
    state.playerY = getRooflineY();
  }
  void styles;
}

function getRooflineY() {
  return world.clientHeight * 0.664 + 16;
}

function getRoofLeftX() {
  return world.clientWidth * 0.188;
}

function getRoofRightLimit() {
  return state.rooftopWidth - 20;
}

function getGroundY() {
  return state.groundHeight - 8;
}

function startAudioIfNeeded() {
  if (state.startedAudio) {
    return;
  }

  state.startedAudio = true;
  bgm.volume = 0.6;
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

function randomizeFlashbackFrames() {
  flashbackFrames.forEach((frame, index) => {
    frame.classList.remove("visible");
    if (state.availableFlashbacks.length > 0) {
      const source = state.availableFlashbacks[(state.flashbackIndex + index) % state.availableFlashbacks.length];
      frame.style.backgroundImage = `linear-gradient(135deg, rgba(255, 243, 219, 0.2), rgba(255, 175, 124, 0.12)), url("${source}")`;
    } else {
      const angle = 125 + index * 28;
      const tone = 18 + index * 12;
      frame.style.backgroundImage = `linear-gradient(${angle}deg, rgba(255, 243, 219, 0.68), rgba(255, 176, 126, 0.34)), radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.65), transparent 20%), linear-gradient(180deg, rgba(${120 + tone}, ${76 + tone}, ${89 + tone}, 0.88), rgba(${30 + index * 8}, ${18 + index * 6}, ${42 + index * 6}, 0.76))`;
    }
  });
  flashbackCaption.textContent = randomCaption();
}

function startFlashbacks() {
  flashbackOverlay.classList.add("active");
  randomizeFlashbackFrames();
  flashbackFrames.forEach((frame, index) => {
    frame.classList.toggle("visible", index < 2);
  });

  state.flashbackTimer = window.setInterval(() => {
    state.flashbackIndex += 1;
    flashbackFrames.forEach((frame) => {
      frame.classList.remove("visible");
    });
    randomizeFlashbackFrames();
    const visibleCount = 1 + Math.floor(Math.random() * flashbackFrames.length);
    for (let i = 0; i < visibleCount; i += 1) {
      flashbackFrames[(state.flashbackIndex + i) % flashbackFrames.length].classList.add("visible");
    }
  }, 140);
}

function stopFlashbacks() {
  flashbackOverlay.classList.remove("active");
  flashbackFrames.forEach((frame) => frame.classList.remove("visible"));
  if (state.flashbackTimer) {
    window.clearInterval(state.flashbackTimer);
    state.flashbackTimer = null;
  }
}

function updatePlayerPosition() {
  const x = getRoofLeftX() + state.playerX;
  player.style.left = `${x}px`;
  player.style.bottom = `${state.playerY}px`;
}

function updateBodies() {
  bodyCountEl.textContent = String(state.bodyCount);
  corpseLayer.innerHTML = "";

  state.bodies.forEach((body, index) => {
    const corpse = document.createElement("div");
    corpse.className = "corpse";
    corpse.style.left = `${body.x}px`;
    corpse.style.bottom = `${body.y}px`;
    corpse.style.transform = `rotate(${body.angle}deg)`;
    corpse.style.opacity = `${Math.max(0.5, 1 - index * 0.02)}`;
    corpseLayer.appendChild(corpse);
  });
}

function resetPlayer() {
  state.mode = "idle";
  state.playerX = 150;
  state.playerY = getRooflineY();
  state.fallVelocity = 0;
  player.classList.remove("falling");
  player.classList.remove("walking");
  updatePlayerPosition();
}

function beginFall() {
  if (state.mode === "falling" || state.mode === "confirming") {
    return;
  }

  state.mode = "falling";
  state.fallVelocity = 90;
  player.classList.add("falling");
  player.classList.remove("walking");
  startFlashbacks();
}

function showPrompt() {
  state.mode = "confirming";
  stopFlashbacks();
  setPromptVisible(true);
  promptButtons[0].focus();
}

function addCorpse() {
  const baseX = world.clientWidth * 0.21 + (state.bodyCount % 7) * 18;
  const layer = Math.floor(state.bodyCount / 7);
  const body = {
    x: baseX + Math.random() * 26,
    y: 18 + layer * 10,
    angle: -18 + Math.random() * 36,
  };
  state.bodies.push(body);
  state.bodyCount += 1;
  updateBodies();
}

function handleChoice(choice) {
  if (state.mode !== "confirming") {
    return;
  }

  setPromptVisible(false);

  if (choice === "yes") {
    addCorpse();
    state.mode = "corpse-landed";
    player.style.bottom = `${getGroundY()}px`;
    window.setTimeout(() => {
      resetPlayer();
    }, 320);
    return;
  }

  state.mode = "fade-reset";
  whiteout.classList.add("active");
  window.setTimeout(() => {
    resetPlayer();
  }, 700);
  window.setTimeout(() => {
    whiteout.classList.remove("active");
  }, 1500);
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

  state.playerX += direction * motion.speed * deltaSeconds;

  if (state.playerX > getRoofRightLimit()) {
    state.playerX = getRoofRightLimit();
  }

  if (state.playerX < -24) {
    beginFall();
  }
}

function updateFalling(deltaSeconds) {
  state.fallVelocity += motion.gravity * deltaSeconds;
  state.playerY -= state.fallVelocity * deltaSeconds;
  state.playerX -= 20 * deltaSeconds;
  if (state.playerY <= getGroundY()) {
    state.playerY = getGroundY();
    showPrompt();
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
  } else if (state.mode === "falling") {
    updateFalling(deltaSeconds);
  }

  updatePlayerPosition();
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
    updatePlayerPosition();
    updateBodies();
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
  updateBodies();
  bindEvents();
  motion.frameId = window.requestAnimationFrame(animate);
}

init();
