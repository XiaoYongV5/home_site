const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, progress) => from + (to - from) * progress;
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};

const state = {
  scrollY: window.scrollY,
  targetScrollY: window.scrollY,
  pointerX: 0,
  pointerY: 0,
  lastScrollY: window.scrollY,
  lastScrollAt: 0,
  audioOn: false,
  audioCtx: null,
  masterGain: null,
  filter: null,
  oscillatorA: null,
  oscillatorB: null,
  noiseGain: null,
  toastTimer: null,
  badge: {
    hiddenY: -680,
    openY: 0,
    y: -680,
    velocity: 0,
    targetY: -680,
    dragStartY: 0,
    dragStartBadgeY: -680,
    dragDistance: 0,
    isDragging: false,
    dragSource: null,
    captureEl: null,
    isOpen: false,
  },
};

const elements = {
  badgeStage: document.querySelector(".badge-stage"),
  heroContent: document.querySelector(".hero-content"),
  identity: document.querySelector("[data-scene='identity']"),
  figure: document.querySelector(".figure-perspective"),
  figureFit: document.querySelector(".figure-fit"),
  morphMeter: document.querySelector("[data-morph-meter]"),
  soundToggle: document.querySelector(".sound-toggle"),
  toast: document.querySelector(".audio-toast"),
  depthLayers: Array.from(document.querySelectorAll(".depth-layer")),
  videos: Array.from(document.querySelectorAll("video")),
  dressedFigure: document.querySelector(".figure-dressed"),
  fitFigure: document.querySelector(".figure-fit"),
  badgeCard: document.querySelector(".id-card"),
  badgePullTab: document.querySelector(".badge-pull-tab"),
  gateLink: document.querySelector(".gate-link"),
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

const setupVideos = () => {
  elements.videos.forEach((video) => {
    video.muted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
  });

  const playAmbientVideos = () => {
    elements.videos.forEach((video) => {
      const attempt = video.play();
      if (attempt?.catch) attempt.catch(() => {});
    });
  };

  playAmbientVideos();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) playAmbientVideos();
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
    "./image/人物穿衣.png",
    "./image/人物穿衣.webp",
  ]);

  preferTransparentFigure(elements.fitFigure, [
    "./image/人物写真-透明.png",
    "./image/人物写真-抠图.png",
    "./image/人物写真.png",
    "./image/人物写真.webp",
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

const setAudio = async (enabled) => {
  await initAudio();
  if (!state.audioCtx) return;
  if (state.audioCtx.state === "suspended") {
    await state.audioCtx.resume();
  }

  state.audioOn = enabled;
  document.body.classList.toggle("audio-on", enabled);
  elements.soundToggle?.setAttribute("aria-pressed", String(enabled));
  elements.soundToggle?.setAttribute("aria-label", enabled ? "关闭声音" : "开启声音");
  showToast(enabled ? "占位环境声已开启" : "声音已关闭");
};

const updateAudio = (identityProgress) => {
  if (!state.audioCtx || !state.masterGain || !state.filter) return;

  const active = state.audioOn ? 1 : 0;
  const sceneEnergy = smoothstep(0.12, 0.82, identityProgress);
  const targetGain = active * lerp(0.025, 0.12, sceneEnergy);
  const targetFreq = lerp(560, 5200, 1 - sceneEnergy);
  const now = state.audioCtx.currentTime;

  state.masterGain.gain.setTargetAtTime(targetGain, now, 0.08);
  state.filter.frequency.setTargetAtTime(targetFreq, now, 0.1);
  state.oscillatorA?.frequency.setTargetAtTime(lerp(58, 92, sceneEnergy), now, 0.08);
  state.oscillatorB?.frequency.setTargetAtTime(lerp(118, 172, sceneEnergy), now, 0.08);
};

const updateHero = () => {
  const heroProgress = clamp(window.scrollY / Math.max(1, window.innerHeight));

  if (elements.heroContent) {
    elements.heroContent.style.transform = `translate3d(0, ${lerp(0, -80, heroProgress)}px, 0)`;
    elements.heroContent.style.opacity = String(clamp(1 - heroProgress * 0.8, 0.16, 1));
  }
};

const setBadgeOpen = (open) => {
  state.badge.isOpen = open;
  state.badge.targetY = open ? state.badge.openY : state.badge.hiddenY;
  state.badge.velocity += open ? 22 : -18;
};

const updateBadge = () => {
  if (!elements.badgeStage) return;

  if (!state.badge.isDragging) {
    state.badge.targetY = state.badge.isOpen ? state.badge.openY : state.badge.hiddenY;
  }

  const tension = state.badge.isDragging ? 0.32 : 0.105;
  const friction = state.badge.isDragging ? 0.55 : 0.76;
  const force = (state.badge.targetY - state.badge.y) * tension;
  state.badge.velocity = (state.badge.velocity + force) * friction;
  state.badge.y += state.badge.velocity;

  if (Math.abs(state.badge.targetY - state.badge.y) < 0.08 && Math.abs(state.badge.velocity) < 0.08) {
    state.badge.y = state.badge.targetY;
    state.badge.velocity = 0;
  }

  const visibleRatio = clamp((state.badge.y - state.badge.hiddenY) / (state.badge.openY - state.badge.hiddenY));
  const stretch = Math.max(0, state.badge.y) + visibleRatio * 52;
  const swing = clamp(state.badge.velocity * 0.045, -9, 9);
  const pointerLiftX = state.pointerX * 10 * visibleRatio;
  const pointerLiftY = state.pointerY * 7 * visibleRatio;

  elements.badgeStage.classList.toggle("is-open", visibleRatio > 0.42);
  elements.badgeStage.classList.toggle("is-hidden", visibleRatio < 0.04);
  elements.badgeStage.classList.toggle("is-dragging", state.badge.isDragging);
  elements.badgeStage.style.setProperty("--badge-y", `${state.badge.y.toFixed(2)}px`);
  elements.badgeStage.style.setProperty("--badge-open", visibleRatio.toFixed(3));
  elements.badgeStage.style.setProperty("--badge-rotate-x", `${(-pointerLiftY + swing * 0.25).toFixed(2)}deg`);
  elements.badgeStage.style.setProperty("--badge-rotate-y", `${(pointerLiftX).toFixed(2)}deg`);
  elements.badgeStage.style.setProperty("--badge-rotate-z", `${swing.toFixed(2)}deg`);
  elements.badgeStage.style.setProperty("--lanyard-stretch", `${stretch.toFixed(2)}px`);
  elements.badgeStage.style.setProperty("--lanyard-rotate", `${(4 + swing * 0.18).toFixed(2)}deg`);
  elements.badgeStage.style.setProperty("--card-light-x", `${(18 + state.pointerX * 44).toFixed(2)}%`);
  elements.badgeStage.style.setProperty("--card-light-y", `${(14 + state.pointerY * 34).toFixed(2)}%`);
  elements.badgeStage.style.setProperty("--card-glare-shift", `${(state.pointerX * 54 + swing * 2).toFixed(2)}px`);
};

const updatePointerVars = () => {
  document.documentElement.style.setProperty("--pointer-x", state.pointerX.toFixed(4));
  document.documentElement.style.setProperty("--pointer-y", state.pointerY.toFixed(4));
};

const updateDepthLayers = (identityProgress) => {
  elements.depthLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth || 0);
    const x = state.pointerX * depth * 38;
    const y = (state.pointerY * depth * 30) + lerp(40, -44, identityProgress) * depth;
    layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
};

const updateIdentity = (progress) => {
  const reveal = smoothstep(0.12, 0.86, progress);
  const revealFine = smoothstep(0.22, 0.72, progress);
  const early = smoothstep(0.02, 0.22, progress);
  const rotate = lerp(-7, 5, reveal);
  const tilt = lerp(4, -2, reveal);
  const scale = lerp(1.1, 1.24, reveal);
  const x = lerp(16, -18, reveal);
  const y = lerp(22, -18, early);
  const maskLine = lerp(112, -8, reveal);
  const skinLine = lerp(92, 0, revealFine);
  const edgeEnergy = Math.sin(reveal * Math.PI);

  document.documentElement.style.setProperty("--undress-progress", reveal.toFixed(3));
  document.documentElement.style.setProperty("--fit-opacity", lerp(0.12, 1, reveal).toFixed(3));
  document.documentElement.style.setProperty("--daily-opacity", lerp(1, 0.12, reveal).toFixed(3));
  document.documentElement.style.setProperty("--dress-mask-solid", `${(maskLine - 13).toFixed(2)}%`);
  document.documentElement.style.setProperty("--dress-mask-soft", `${(maskLine - 2).toFixed(2)}%`);
  document.documentElement.style.setProperty("--dress-mask-clear", `${(maskLine + 12).toFixed(2)}%`);
  document.documentElement.style.setProperty("--skin-mask-soft", `${(skinLine - 8).toFixed(2)}%`);
  document.documentElement.style.setProperty("--skin-mask-solid", `${(skinLine + 8).toFixed(2)}%`);
  document.documentElement.style.setProperty("--morph-line", `${clamp(maskLine, 2, 96).toFixed(2)}%`);
  document.documentElement.style.setProperty("--morph-edge-opacity", edgeEnergy.toFixed(3));
  document.documentElement.style.setProperty("--morph-blur", `${lerp(1.6, 0, Math.max(reveal, 0.35)).toFixed(2)}px`);
  document.documentElement.style.setProperty("--fabric-shift", `${lerp(0, -34, reveal).toFixed(2)}px`);
  document.documentElement.style.setProperty("--fit-scale", lerp(1.045, 1.01, reveal).toFixed(3));
  document.documentElement.style.setProperty("--figure-rotate", `${rotate.toFixed(2)}deg`);
  document.documentElement.style.setProperty("--figure-tilt", `${tilt.toFixed(2)}deg`);
  document.documentElement.style.setProperty("--figure-scale", scale.toFixed(3));
  document.documentElement.style.setProperty("--figure-x", `${x.toFixed(2)}px`);
  document.documentElement.style.setProperty("--figure-y", `${y.toFixed(2)}px`);
  document.documentElement.style.setProperty("--morph-progress", `${(reveal * 100).toFixed(2)}%`);
};

const update = () => {
  state.targetScrollY = window.scrollY;
  state.scrollY = lerp(state.scrollY, state.targetScrollY, 0.18);

  const identityProgress = sceneProgress(elements.identity);

  document.documentElement.style.setProperty("--identity-progress", identityProgress.toFixed(4));

  updateHero();
  updateBadge();
  updatePointerVars();
  updateDepthLayers(identityProgress);
  updateIdentity(identityProgress);
  updateAudio(identityProgress);

  requestAnimationFrame(update);
};

window.addEventListener("pointermove", (event) => {
  state.pointerX = clamp(event.clientX / window.innerWidth - 0.5, -0.5, 0.5);
  state.pointerY = clamp(event.clientY / window.innerHeight - 0.5, -0.5, 0.5);
  updatePointerVars();
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
      setBadgeOpen(false);
    }
    state.badge.dragSource = null;
    state.badge.captureEl = null;
    return;
  }

  if (state.badge.targetY > -260) {
    setBadgeOpen(true);
  } else {
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
  setupFigureSources();
  setupVideos();
  update();
});
