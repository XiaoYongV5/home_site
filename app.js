const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, progress) => from + (to - from) * progress;
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};
const easeInOut = (value) => 0.5 - Math.cos(clamp(value) * Math.PI) / 2;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const state = {
  scrollY: window.scrollY,
  targetScrollY: window.scrollY,
  pointerX: 0,
  pointerY: 0,
  pointerClientX: null,
  pointerClientY: null,
  poolX: 0.5,
  poolY: 0.5,
  poolWaveTarget: 0,
  poolWave: 0,
  lastScrollY: window.scrollY,
  lastScrollAt: 0,
  heroHoverTarget: 0,
  heroHoverProgress: 0,
  heroMorphProgress: 0,
  heroMorphLastAt: 0,
  heroMorphLoopStartedAt: performance.now(),
  heroMorphLoopPaused: true,
  heroMorphLoopDirection: 1,
  videoResumeTimer: 0,
  figurePointerX: 0,
  figurePointerY: 0,
  figurePointerCurrentX: 0,
  figurePointerCurrentY: 0,
  audioOn: false,
  audioWanted: true,
  audioAutoplayBlocked: false,
  audioUnlockArmed: false,
  audioVolume: 0,
  audioCtx: null,
  masterGain: null,
  filter: null,
  oscillatorA: null,
  oscillatorB: null,
  noiseGain: null,
  toastTimer: null,
  badge: {
    hiddenY: -820,
    openY: 28,
    y: -820,
    velocity: 0,
    targetY: -820,
    dragStartY: 0,
    dragStartBadgeY: -820,
    dragDistance: 0,
    isDragging: false,
    dragSource: null,
    captureEl: null,
    isOpen: false,
    hasAutoDropped: false,
    showPullTab: false,
    pendingPullTabReveal: false,
  },
};

const elements = {
  badgeStage: document.querySelector(".badge-stage"),
  heroContent: document.querySelector(".hero-content"),
  heroFigureStage: document.querySelector(".hero-figure-stage"),
  hero: document.querySelector("[data-scene='hero']"),
  sports: document.querySelector("[data-scene='sports']"),
  portfolio: document.querySelector("[data-scene='portfolio']"),
  figure: document.querySelector(".figure-perspective"),
  figureFit: document.querySelector(".figure-fit"),
  morphMeter: document.querySelector("[data-morph-meter]"),
  soundToggle: document.querySelector(".sound-toggle"),
  bgmAudio: document.querySelector(".bgm-audio"),
  toast: document.querySelector(".audio-toast"),
  depthLayers: Array.from(document.querySelectorAll(".depth-layer")),
  videos: Array.from(document.querySelectorAll("video")),
  dressedFigure: document.querySelector(".figure-dressed"),
  fitFigure: document.querySelector(".figure-fit"),
  badgeCard: document.querySelector(".id-card"),
  badgePullTab: document.querySelector(".badge-pull-tab"),
  gateLink: document.querySelector(".gate-link"),
  poolScene: document.querySelector(".pool-scene"),
};

const styleCache = new WeakMap();

const setStyleValue = (element, property, value) => {
  if (!element) return;
  let cache = styleCache.get(element);
  if (!cache) {
    cache = new Map();
    styleCache.set(element, cache);
  }
  if (cache.get(property) === value) return;
  cache.set(property, value);
  element.style[property] = value;
};

const setStyleProperty = (element, property, value) => {
  if (!element) return;
  let cache = styleCache.get(element);
  if (!cache) {
    cache = new Map();
    styleCache.set(element, cache);
  }
  if (cache.get(property) === value) return;
  cache.set(property, value);
  element.style.setProperty(property, value);
};

const setRootProperty = (property, value) => {
  setStyleProperty(document.documentElement, property, value);
};

const toggleClass = (element, className, enabled) => {
  if (!element) return;
  if (element.classList.contains(className) === enabled) return;
  element.classList.toggle(className, enabled);
};

const sceneProgress = (el) => {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const scrollable = Math.max(1, rect.height - window.innerHeight);
  return clamp(-rect.top / scrollable);
};

const showToast = (message) => {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1800);
};

const configureAmbientVideo = (video) => {
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = "auto";
  video.playbackRate = 1;
  video.controls = false;
  video.disableRemotePlayback = true;
  video.setAttribute("autoplay", "");
  video.setAttribute("loop", "");
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("preload", "auto");
};

const playAmbientVideo = (video) => {
  configureAmbientVideo(video);
  if (document.hidden) return;

  if (video.ended && Number.isFinite(video.duration)) {
    video.currentTime = 0;
  }

  if (video.paused) {
    const attempt = video.play();
    if (attempt?.catch) attempt.catch(() => {});
  }
};

const ensureVideoPlayback = () => {
  elements.videos.forEach(playAmbientVideo);
};

const scheduleVideoResume = (delay = 120) => {
  clearTimeout(state.videoResumeTimer);
  state.videoResumeTimer = window.setTimeout(ensureVideoPlayback, delay);
};

const setupVideos = () => {
  elements.videos.forEach((video) => {
    configureAmbientVideo(video);

    ["pause", "ended", "stalled", "emptied"].forEach((eventName) => {
      video.addEventListener(eventName, () => {
        if (document.hidden) return;
        window.setTimeout(() => playAmbientVideo(video), eventName === "pause" ? 0 : 180);
      });
    });
  });

  ensureVideoPlayback();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) ensureVideoPlayback();
  });
  window.addEventListener("pageshow", () => scheduleVideoResume(0));
  window.addEventListener("focus", () => scheduleVideoResume(0));
  window.addEventListener("scroll", () => scheduleVideoResume(160), { passive: true });
  document.addEventListener("pointerdown", () => scheduleVideoResume(0), {
    capture: true,
    passive: true,
  });
  document.addEventListener("click", () => scheduleVideoResume(0), {
    capture: true,
    passive: true,
  });
};

const preferTransparentFigure = (img, candidates) => {
  if (!img) return;

  const tryNext = (index) => {
    if (index >= candidates.length) return;
    const probe = new Image();
    probe.onload = () => {
      img.src = candidates[index];
      document.body.classList.add("has-cutout-figure");
    };
    probe.onerror = () => tryNext(index + 1);
    probe.src = candidates[index];
  };

  tryNext(0);
};

const setupFigureSources = () => {
  preferTransparentFigure(elements.dressedFigure, [
    "./image/人物穿衣-透明.png",
    "./image/人物穿衣-抠图.png",
    "./image/人物穿衣.webp",
    "./image/人物穿衣.png",
  ]);

  preferTransparentFigure(elements.fitFigure, [
    "./image/人物写真-透明.png",
    "./image/人物写真-抠图.png",
    "./image/人物写真.webp",
    "./image/人物写真.png",
  ]);
};

const createNoise = (ctx) => {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    output[i] = (Math.random() * 2 - 1) * 0.22;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  return noise;
};

const initAudio = async () => {
  if (state.audioCtx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    showToast("当前浏览器不支持音频上下文");
    return;
  }

  const ctx = new AudioContextClass();
  const masterGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const oscillatorA = ctx.createOscillator();
  const oscillatorB = ctx.createOscillator();
  const noise = createNoise(ctx);
  const noiseGain = ctx.createGain();

  oscillatorA.type = "sine";
  oscillatorA.frequency.value = 72;
  oscillatorB.type = "triangle";
  oscillatorB.frequency.value = 144;
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  masterGain.gain.value = 0;
  noiseGain.gain.value = 0.018;

  oscillatorA.connect(filter);
  oscillatorB.connect(filter);
  noise.connect(noiseGain);
  noiseGain.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  oscillatorA.start();
  oscillatorB.start();
  noise.start();

  state.audioCtx = ctx;
  state.masterGain = masterGain;
  state.filter = filter;
  state.oscillatorA = oscillatorA;
  state.oscillatorB = oscillatorB;
  state.noiseGain = noiseGain;
};

const configureBackgroundMusic = () => {
  const audio = elements.bgmAudio;
  if (!audio) return;
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = clamp(state.audioVolume, 0, 0.32);
  audio.setAttribute("loop", "");
  audio.setAttribute("preload", "auto");
};

const isBackgroundMusicPlaying = () => {
  const audio = elements.bgmAudio;
  return Boolean(audio && !audio.paused && !audio.ended && audio.readyState > 0);
};

const syncAudioState = () => {
  const playing = isBackgroundMusicPlaying();
  state.audioOn = playing;
  document.body.classList.toggle("audio-on", playing);
  elements.soundToggle?.setAttribute("aria-pressed", String(playing));
  elements.soundToggle?.setAttribute("aria-label", playing ? "关闭背景音乐" : "开启背景音乐");
};

const disarmAudioUnlock = () => {
  if (!state.audioUnlockArmed) return;
  state.audioUnlockArmed = false;
  ["pointerdown", "click", "keydown", "touchstart", "wheel"].forEach((eventName) => {
    window.removeEventListener(eventName, handleAudioUnlock, true);
  });
};

const playBackgroundMusic = async ({ silent = false } = {}) => {
  const audio = elements.bgmAudio;
  if (!audio) return false;
  configureBackgroundMusic();
  state.audioWanted = true;

  try {
    const attempt = audio.play();
    if (attempt?.then) await attempt;
    state.audioAutoplayBlocked = false;
    disarmAudioUnlock();
    syncAudioState();
    if (!silent) showToast("背景音乐已开启");
    return true;
  } catch (error) {
    state.audioAutoplayBlocked = true;
    syncAudioState();
    armAudioUnlock();
    if (!silent) showToast("点击或滚动页面后将开启背景音乐");
    return false;
  }
};

const pauseBackgroundMusic = ({ silent = false } = {}) => {
  const audio = elements.bgmAudio;
  state.audioWanted = false;
  state.audioAutoplayBlocked = false;
  disarmAudioUnlock();
  if (audio) audio.pause();
  syncAudioState();
  if (!silent) showToast("背景音乐已关闭");
};

function handleAudioUnlock(event) {
  if (!state.audioWanted || isBackgroundMusicPlaying()) {
    disarmAudioUnlock();
    return;
  }
  if (event.target?.closest?.(".sound-toggle")) return;
  playBackgroundMusic({ silent: true });
}

function armAudioUnlock() {
  if (state.audioUnlockArmed) return;
  state.audioUnlockArmed = true;
  ["pointerdown", "click", "keydown", "touchstart", "wheel"].forEach((eventName) => {
    window.addEventListener(eventName, handleAudioUnlock, { capture: true, passive: true });
  });
}

const setAudio = (enabled) => {
  if (enabled) {
    playBackgroundMusic();
  } else {
    pauseBackgroundMusic();
  }
};

const setupBackgroundMusic = () => {
  const audio = elements.bgmAudio;
  if (!audio) return;
  configureBackgroundMusic();
  audio.addEventListener("playing", syncAudioState);
  audio.addEventListener("pause", syncAudioState);
  audio.addEventListener("ended", syncAudioState);
  audio.addEventListener("error", () => {
    state.audioWanted = false;
    syncAudioState();
    showToast("背景音乐加载失败");
  });
  playBackgroundMusic({ silent: true });
};

const updateAudio = (heroMorphProgress, sportsProgress) => {
  const audio = elements.bgmAudio;
  if (!audio) return;

  const sceneEnergy = clamp(heroMorphProgress * 0.42 + smoothstep(0.08, 0.82, sportsProgress) * 0.5);
  const targetVolume = isBackgroundMusicPlaying() ? lerp(0.18, 0.28, sceneEnergy) : 0;
  state.audioVolume = lerp(state.audioVolume, targetVolume, 0.045);
  audio.volume = clamp(state.audioVolume, 0, 0.32);
};

const updateHero = () => {
  const heroProgress = clamp(window.scrollY / Math.max(1, window.innerHeight));

  if (elements.heroContent) {
    setStyleValue(elements.heroContent, "transform", `translate3d(0, ${lerp(0, -46, heroProgress).toFixed(2)}px, 0)`);
    setStyleValue(elements.heroContent, "opacity", clamp(1 - heroProgress * 0.52, 0.32, 1).toFixed(4));
  }
};

const setBadgeOpen = (open) => {
  state.badge.isOpen = open;
  if (open) {
    state.badge.hasAutoDropped = true;
    state.badge.showPullTab = false;
    state.badge.pendingPullTabReveal = false;
  }
  state.badge.targetY = open ? state.badge.openY : state.badge.hiddenY;
  state.badge.velocity += open ? 22 : -18;
};

const updateBadge = () => {
  if (!elements.badgeStage) return;

  if (!state.badge.isDragging) {
    const shouldDrop = window.scrollY > Math.max(36, window.innerHeight * 0.08);
    const wasOpen = state.badge.isOpen;
    if (shouldDrop && !state.badge.hasAutoDropped) {
      state.badge.isOpen = true;
      state.badge.hasAutoDropped = true;
    }
    if (state.badge.isOpen !== wasOpen) {
      if (state.badge.isOpen) {
        state.badge.showPullTab = false;
        state.badge.pendingPullTabReveal = false;
        state.badge.y = Math.max(state.badge.y, lerp(state.badge.hiddenY, state.badge.openY, 0.78));
        state.badge.velocity += 82;
      } else {
        state.badge.velocity += -72;
      }
    }
    state.badge.targetY = state.badge.isOpen ? state.badge.openY : state.badge.hiddenY;
  }

  const tension = state.badge.isDragging ? 0.32 : 0.18;
  const friction = state.badge.isDragging ? 0.55 : 0.74;
  const force = (state.badge.targetY - state.badge.y) * tension;
  state.badge.velocity = (state.badge.velocity + force) * friction;
  state.badge.y += state.badge.velocity;

  if (Math.abs(state.badge.targetY - state.badge.y) < 0.08 && Math.abs(state.badge.velocity) < 0.08) {
    state.badge.y = state.badge.targetY;
    state.badge.velocity = 0;
  }

  const visibleRatio = clamp((state.badge.y - state.badge.hiddenY) / (state.badge.openY - state.badge.hiddenY));
  if (!state.badge.isOpen && state.badge.pendingPullTabReveal && visibleRatio < 0.02) {
    state.badge.showPullTab = true;
    state.badge.pendingPullTabReveal = false;
  }
  const stretch = Math.max(0, state.badge.y) + visibleRatio * 38 + Math.abs(state.badge.velocity) * 0.28;
  const scrollNudge = clamp((window.scrollY - state.lastScrollY) * 0.02, -2, 2);
  const swing = clamp(state.badge.velocity * 0.038 + scrollNudge, -10, 10);
  const pointerLiftX = state.pointerX * 7 * visibleRatio;
  const pointerLiftY = state.pointerY * 5 * visibleRatio;

  toggleClass(elements.badgeStage, "is-open", visibleRatio > 0.42);
  toggleClass(elements.badgeStage, "is-hidden", visibleRatio < 0.04);
  toggleClass(elements.badgeStage, "is-dragging", state.badge.isDragging);
  toggleClass(elements.badgeStage, "has-dropped", state.badge.hasAutoDropped);
  toggleClass(elements.badgeStage, "can-pull", state.badge.showPullTab);
  setStyleProperty(elements.badgeStage, "--badge-y", `${state.badge.y.toFixed(2)}px`);
  setStyleProperty(elements.badgeStage, "--badge-open", visibleRatio.toFixed(3));
  setStyleProperty(elements.badgeStage, "--badge-rotate-x", `${(-pointerLiftY + swing * 0.25).toFixed(2)}deg`);
  setStyleProperty(elements.badgeStage, "--badge-rotate-y", `${(pointerLiftX).toFixed(2)}deg`);
  setStyleProperty(elements.badgeStage, "--badge-rotate-z", `${swing.toFixed(2)}deg`);
  setStyleProperty(elements.badgeStage, "--lanyard-stretch", `${stretch.toFixed(2)}px`);
  setStyleProperty(elements.badgeStage, "--lanyard-rotate", `${(4 + swing * 0.18).toFixed(2)}deg`);
  setStyleProperty(elements.badgeStage, "--card-light-x", `${(18 + state.pointerX * 44).toFixed(2)}%`);
  setStyleProperty(elements.badgeStage, "--card-light-y", `${(14 + state.pointerY * 34).toFixed(2)}%`);
  setStyleProperty(elements.badgeStage, "--card-glare-shift", `${(state.pointerX * 54 + swing * 2).toFixed(2)}px`);
};

const updatePointerVars = () => {
  state.poolWave = lerp(state.poolWave, state.poolWaveTarget, 0.12);
  setRootProperty("--pointer-x", state.pointerX.toFixed(4));
  setRootProperty("--pointer-y", state.pointerY.toFixed(4));
  setRootProperty("--pool-x", `${(state.poolX * 100).toFixed(2)}%`);
  setRootProperty("--pool-y", `${(state.poolY * 100).toFixed(2)}%`);
  setRootProperty("--pool-wave", state.poolWave.toFixed(4));
};

const updateDepthLayers = (heroMorphProgress, sportsProgress) => {
  elements.depthLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth || 0);
    const sceneName = layer.closest("[data-scene]")?.dataset.scene;
    const progress = sceneName === "sports" ? sportsProgress : heroMorphProgress;
    const x = state.pointerX * depth * 38;
    const y = (state.pointerY * depth * 30) + lerp(28, -34, progress) * depth;
    setStyleValue(layer, "transform", `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`);
  });
};

const updateFigurePointerFromClient = (clientX, clientY) => {
  if (!elements.heroFigureStage) return;
  const figureRect = elements.heroFigureStage.getBoundingClientRect();
  const insideFigure =
    clientX >= figureRect.left &&
    clientX <= figureRect.right &&
    clientY >= figureRect.top &&
    clientY <= figureRect.bottom;
  if (insideFigure) {
    state.heroHoverTarget = 1;
    state.figurePointerX = clamp((clientX - figureRect.left) / figureRect.width - 0.5, -0.5, 0.5);
    state.figurePointerY = clamp((clientY - figureRect.top) / figureRect.height - 0.5, -0.5, 0.5);
  } else {
    state.heroHoverTarget = 0;
    state.figurePointerX = 0;
    state.figurePointerY = 0;
  }
};

const updateHeroMorph = (progress) => {
  const now = performance.now();
  const dt = state.heroMorphLastAt ? clamp((now - state.heroMorphLastAt) / 1000, 0, 0.08) : 0.016;
  state.heroMorphLastAt = now;

  const hoverEase = state.heroHoverTarget > state.heroHoverProgress ? 0.038 : 0.034;
  state.heroHoverProgress = lerp(state.heroHoverProgress, state.heroHoverTarget, hoverEase);

  const scrollReveal = smoothstep(0.08, 0.78, progress);
  const hoverReveal = smoothstep(0.02, 0.86, state.heroHoverProgress);
  const autoLoopEnabled = false;
  const halfDuration = 3800;
  const loopElapsed = Math.max(0, now - state.heroMorphLoopStartedAt);
  const halfIndex = Math.floor(loopElapsed / halfDuration);
  const halfT = (loopElapsed % halfDuration) / halfDuration;
  const stagedT = halfT < 0.15 ? 0 : halfT > 0.8 ? 1 : easeInOut((halfT - 0.15) / 0.65);
  const forward = (halfIndex % 2 === 0) === (state.heroMorphLoopDirection > 0);
  const loopReveal = forward ? stagedT : 1 - stagedT;
  const revealTarget = Math.max(scrollReveal, hoverReveal);
  if (autoLoopEnabled && scrollReveal < 0.02 && hoverReveal < 0.02) {
    state.heroMorphProgress = loopReveal;
  } else {
    const diff = revealTarget - state.heroMorphProgress;
    const maxStep = (dt / 3.8) * (0.82 + Math.abs(diff) * 0.58);
    state.heroMorphProgress = clamp(
      state.heroMorphProgress + Math.sign(diff) * Math.min(Math.abs(diff), maxStep)
    );
  }

  const reveal = state.heroMorphProgress;
  const morphing = reveal > 0.006 || state.heroHoverTarget > 0.02 || Math.abs(revealTarget - reveal) > 0.006;

  if (!morphing) {
    state.heroMorphProgress = 0;
    toggleClass(document.body, "is-morphing", false);
    setRootProperty("--undress-progress", "0.000");
    setRootProperty("--morph-progress", "0.00%");
    setRootProperty("--morph-edge-opacity", "0.000");
    setRootProperty("--cloth-edge-opacity", "0.000");
    setRootProperty("--cloth-veil-opacity", "0.000");
    setRootProperty("--fit-opacity", "0");
    setRootProperty("--daily-opacity", "1");
    return;
  }

  const transitionEnergy = Math.sin(clamp(reveal) * Math.PI);
  const edge = lerp(128, -20, reveal);
  const solid = edge - 7;
  const soft = edge + 3;
  const clear = edge + 14;
  const fitSolid = clamp(solid, 0, 100);
  const fitSoft = clamp(soft, 0, 100);
  const fitClear = clamp(clear, 0, 100);
  const fitFull = clamp(clear + 5, 0, 100);
  const glowTop = clamp(edge - 7, -12, 112);
  const glowOpacity = transitionEnergy * 0.28;

  toggleClass(document.body, "is-morphing", morphing);
  setRootProperty("--undress-progress", reveal.toFixed(3));
  setRootProperty("--fit-opacity", "1");
  setRootProperty("--daily-opacity", "1");
  setRootProperty("--cloth-solid", `${solid.toFixed(2)}%`);
  setRootProperty("--cloth-soft", `${soft.toFixed(2)}%`);
  setRootProperty("--cloth-clear", `${clear.toFixed(2)}%`);
  setRootProperty("--fit-solid", `${fitSolid.toFixed(2)}%`);
  setRootProperty("--fit-soft", `${fitSoft.toFixed(2)}%`);
  setRootProperty("--fit-clear", `${fitClear.toFixed(2)}%`);
  setRootProperty("--fit-full", `${fitFull.toFixed(2)}%`);
  setRootProperty("--cloth-edge", `${glowTop.toFixed(2)}%`);
  setRootProperty("--cloth-edge-opacity", glowOpacity.toFixed(3));
  setRootProperty("--cloth-edge-blur", `${lerp(16, 26, transitionEnergy).toFixed(2)}px`);
  setRootProperty("--cloth-veil-opacity", `${(transitionEnergy * 0.22).toFixed(3)}`);
  setRootProperty("--morph-line", `${clamp(edge, 2, 96).toFixed(2)}%`);
  setRootProperty("--morph-edge-opacity", glowOpacity.toFixed(3));
  setRootProperty("--morph-blur", "0px");
  setRootProperty("--fabric-shift", "0px");
  setRootProperty("--fit-scale", "1");
  setRootProperty("--figure-rotate", "0deg");
  setRootProperty("--figure-tilt", "0deg");
  setRootProperty("--figure-scale", "1");
  setRootProperty("--figure-x", "0px");
  setRootProperty("--figure-y", "0px");
  setRootProperty("--figure-pointer-x", "0");
  setRootProperty("--figure-pointer-y", "0");
  setRootProperty("--figure-light-x", "50%");
  setRootProperty("--figure-light-y", "38%");
  setRootProperty("--figure-depth-light", "0");
  setRootProperty("--figure-shadow-opacity", "0.4");
  setRootProperty("--morph-progress", `${(reveal * 100).toFixed(2)}%`);
};

window.heroFigureReveal = {
  pause() {
    state.heroMorphLoopPaused = true;
  },
  play() {
    state.heroMorphLoopPaused = false;
    state.heroMorphLoopStartedAt = performance.now() - state.heroMorphProgress * 3800;
  },
  reverse() {
    state.heroMorphLoopDirection *= -1;
    state.heroMorphLoopStartedAt = performance.now() - (1 - state.heroMorphProgress) * 3800;
  },
  setProgress(value) {
    state.heroMorphLoopPaused = true;
    state.heroMorphProgress = clamp(value);
  },
};

const update = () => {
  state.targetScrollY = window.scrollY;
  state.scrollY = lerp(state.scrollY, state.targetScrollY, 0.18);

  const heroMorphProgress = clamp(state.scrollY / Math.max(1, window.innerHeight * 0.92));
  const sportsProgress = sceneProgress(elements.sports);
  const portfolioRect = elements.portfolio?.getBoundingClientRect();
  const portfolioProgress = portfolioRect
    ? smoothstep(0.18, 0.82, (window.innerHeight - portfolioRect.top) / Math.max(1, window.innerHeight))
    : 0;
  const sportsRect = elements.sports?.getBoundingClientRect();
  const visibilityBuffer = window.innerHeight * 0.05;
  const sportsVisible = sportsRect
    ? sportsRect.bottom > -visibilityBuffer && sportsRect.top < window.innerHeight + visibilityBuffer
    : false;
  const portfolioVisible = portfolioRect
    ? portfolioRect.bottom > -visibilityBuffer && portfolioRect.top < window.innerHeight + visibilityBuffer
    : false;
  const sportsOffset = elements.sports?.offsetTop || window.innerHeight;
  const narrativeProgress = clamp((window.scrollY - sportsOffset) / Math.max(1, window.innerHeight * 1.32));
  const narrativeOpacity = window.scrollY < sportsOffset
    ? 1
    : clamp(1 - smoothstep(0.52, 0.92, narrativeProgress));
  const narrativeEnd = sportsOffset + window.innerHeight * 1.42;
  const figureNarrativeActive = window.scrollY > 24 && window.scrollY < narrativeEnd && narrativeOpacity > 0.015;

  setRootProperty("--hero-morph-progress", heroMorphProgress.toFixed(4));
  setRootProperty("--sports-progress", sportsProgress.toFixed(4));
  setRootProperty("--portfolio-progress", portfolioProgress.toFixed(4));
  setRootProperty("--portfolio-title-y", `${lerp(42, 0, portfolioProgress).toFixed(2)}px`);
  setRootProperty("--portfolio-title-scale", lerp(0.92, 1, portfolioProgress).toFixed(4));
  setRootProperty("--portfolio-title-opacity", lerp(0.18, 1, portfolioProgress).toFixed(4));
  setRootProperty("--portfolio-title-blur", `${lerp(10, 0, portfolioProgress).toFixed(2)}px`);
  setRootProperty("--portfolio-title-depth", `${lerp(-72, 0, portfolioProgress).toFixed(2)}px`);
  setRootProperty("--portfolio-title-tilt", `${lerp(18, 0, portfolioProgress).toFixed(2)}deg`);
  setRootProperty("--portfolio-title-sheen", `${lerp(6, 92, portfolioProgress).toFixed(2)}%`);
  setRootProperty("--narrative-figure-opacity", narrativeOpacity.toFixed(4));
  toggleClass(document.body, "narrative-figure-fixed", figureNarrativeActive);
  toggleClass(document.body, "sports-visible", sportsVisible);
  toggleClass(document.body, "portfolio-visible", portfolioVisible);

  updateHero();
  updateBadge();
  updatePointerVars();
  if (state.pointerClientX !== null && state.pointerClientY !== null) {
    updateFigurePointerFromClient(state.pointerClientX, state.pointerClientY);
  }
  updateDepthLayers(heroMorphProgress, sportsProgress);
  updateHeroMorph(heroMorphProgress);
  updateAudio(heroMorphProgress, sportsProgress);

  requestAnimationFrame(update);
};

const handlePointerMove = (event) => {
  state.pointerClientX = event.clientX;
  state.pointerClientY = event.clientY;
  state.pointerX = clamp(event.clientX / window.innerWidth - 0.5, -0.5, 0.5);
  state.pointerY = clamp(event.clientY / window.innerHeight - 0.5, -0.5, 0.5);
  updateFigurePointerFromClient(event.clientX, event.clientY);
  if (elements.poolScene) {
    const rect = elements.poolScene.getBoundingClientRect();
    const insidePool =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (insidePool) {
      state.poolX = clamp((event.clientX - rect.left) / rect.width);
      state.poolY = clamp((event.clientY - rect.top) / rect.height);
      state.poolWaveTarget = 1;
    } else {
      state.poolWaveTarget = 0;
    }
  }
  updatePointerVars();
};

window.addEventListener("pointermove", handlePointerMove, { passive: true });
window.addEventListener("mousemove", handlePointerMove, { passive: true });

elements.poolScene?.addEventListener("pointerenter", () => {
  state.poolWaveTarget = 1;
});

elements.poolScene?.addEventListener("pointerleave", () => {
  state.poolWaveTarget = 0;
});

elements.poolScene?.addEventListener("pointermove", (event) => {
  const rect = elements.poolScene.getBoundingClientRect();
  state.poolX = clamp((event.clientX - rect.left) / rect.width);
  state.poolY = clamp((event.clientY - rect.top) / rect.height);
  state.poolWaveTarget = 1;
});

elements.heroFigureStage?.addEventListener("pointerenter", () => {
  state.heroHoverTarget = 1;
});

elements.heroFigureStage?.addEventListener("pointerleave", () => {
  state.heroHoverTarget = 0;
  state.figurePointerX = 0;
  state.figurePointerY = 0;
});

elements.heroFigureStage?.addEventListener("pointermove", (event) => {
  const rect = elements.heroFigureStage.getBoundingClientRect();
  state.figurePointerX = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
  state.figurePointerY = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
});

elements.gateLink?.addEventListener("pointermove", (event) => {
  const rect = elements.gateLink.getBoundingClientRect();
  const localX = clamp((event.clientX - rect.left) / rect.width);
  const localY = clamp((event.clientY - rect.top) / rect.height);
  elements.gateLink.style.setProperty("--link-x", `${(localX * 100).toFixed(2)}%`);
  elements.gateLink.style.setProperty("--link-y", `${(localY * 100).toFixed(2)}%`);
  elements.gateLink.style.setProperty("--link-tilt-x", `${((0.5 - localY) * 10).toFixed(2)}deg`);
  elements.gateLink.style.setProperty("--link-tilt-y", `${((localX - 0.5) * 12).toFixed(2)}deg`);
});

elements.gateLink?.addEventListener("pointerleave", () => {
  elements.gateLink.style.removeProperty("--link-x");
  elements.gateLink.style.removeProperty("--link-y");
  elements.gateLink.style.removeProperty("--link-tilt-x");
  elements.gateLink.style.removeProperty("--link-tilt-y");
});

window.addEventListener(
  "scroll",
  () => {
    if (Math.abs(window.scrollY - state.lastScrollY) > 0.5) {
      state.lastScrollY = window.scrollY;
      state.lastScrollAt = performance.now();
    }
  },
  { passive: true },
);

const startBadgeDrag = (event) => {
  if (!elements.badgeStage) return;
  state.badge.isDragging = true;
  state.badge.dragSource = event.currentTarget?.classList?.contains("badge-pull-tab") ? "tab" : "card";
  state.badge.captureEl = event.currentTarget;
  state.badge.dragStartY = event.clientY;
  state.badge.dragStartBadgeY = state.badge.y;
  state.badge.dragDistance = 0;
  state.badge.velocity = 0;
  state.badge.captureEl?.setPointerCapture?.(event.pointerId);
  event.preventDefault();
};

const moveBadgeDrag = (event) => {
  if (!state.badge.isDragging) return;
  const deltaY = event.clientY - state.badge.dragStartY;
  state.badge.dragDistance = Math.max(state.badge.dragDistance, Math.abs(deltaY));
  state.badge.targetY = clamp(state.badge.dragStartBadgeY + deltaY, state.badge.hiddenY, 280);
};

const endBadgeDrag = (event) => {
  if (!state.badge.isDragging) return;
  state.badge.isDragging = false;
  state.badge.captureEl?.releasePointerCapture?.(event.pointerId);

  if (state.badge.dragDistance < 6) {
    if (state.badge.dragSource === "tab") {
      setBadgeOpen(!state.badge.isOpen);
    } else {
      state.badge.pendingPullTabReveal = true;
      setBadgeOpen(false);
    }
    state.badge.dragSource = null;
    state.badge.captureEl = null;
    return;
  }

  if (state.badge.targetY > -260) {
    setBadgeOpen(true);
  } else {
    if (state.badge.dragSource === "card") state.badge.pendingPullTabReveal = true;
    setBadgeOpen(false);
  }
  state.badge.dragSource = null;
  state.badge.captureEl = null;
};

elements.badgePullTab?.addEventListener("pointerdown", startBadgeDrag);
elements.badgeCard?.addEventListener("pointerdown", startBadgeDrag);
window.addEventListener("pointermove", moveBadgeDrag);
window.addEventListener("pointerup", endBadgeDrag);

elements.soundToggle?.addEventListener("click", () => {
  setAudio(!state.audioOn);
});

window.addEventListener("load", () => {
  if (window.scrollY < 8) {
    setBadgeOpen(false);
    state.badge.y = state.badge.hiddenY;
    state.badge.velocity = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  setupFigureSources();
  setupVideos();
  setupBackgroundMusic();
  update();
});
