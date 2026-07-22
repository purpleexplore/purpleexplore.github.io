const itemLibrary = Array.isArray(window.SOMO_ITEMS) ? window.SOMO_ITEMS : [];
let currentItems = [];

const options = document.querySelector("#options");
const loadingScreen = document.querySelector("#loadingScreen");
const questionFlight = document.querySelector("#questionFlight");
const confirmButton = document.querySelector("#confirmButton");
const selectScreen = document.querySelector("#selectScreen");
const resultScreen = document.querySelector("#resultScreen");
const resultTitle = document.querySelector("#resultTitle");
const resultImage = document.querySelector("#resultImage");
const resultCopy = document.querySelector("#resultCopy");
const backButton = document.querySelector("#backButton");
const shareButton = document.querySelector("#shareButton");
const toast = document.querySelector("#toast");
const waterRippleCanvas = document.querySelector("#waterRippleCanvas");
const selectQuestion = document.querySelector("#selectQuestion");
const questionLibrary = Array.isArray(window.SOMO_QUESTIONS) ? window.SOMO_QUESTIONS : [];
const questionSuffixes = Array.isArray(window.SOMO_QUESTION_SUFFIXES) ? window.SOMO_QUESTION_SUFFIXES : [];
const heroImageEls = document.querySelectorAll(".hero, .result-hero");
const heroLoader = document.querySelector(".screen-select .hero-loader");
const questionMeasureCtx = document.createElement("canvas").getContext("2d");
const LAST_QUESTION_KEY = "somo_last_question_id";
let currentQuestion = null;

let selected = null;
let toastTimer = null;
let selectIntroTimer = null;
let selectContentTimer = null;
let resultIntroTimer = null;
let questionFlightTimer = null;
let sceneRevealTimer = null;
let initialLoadingTimer = null;
let stopWaterRipples = null;
let ripplePeriodMs = 10500; // 默认与原版一致；holdIntro/splice 会设 4000 做 4s 循环
let rippleBright = 1.34;    // 水波峰值亮度：默认 1.34=原版；holdIntro/splice 调柔到 0.6 防爆绿

// Results now live only for the current page visit. Remove data left by the
// previous daily-result implementation so reopening always starts a new round.
try {
  localStorage.removeItem("somo_daily_v1");
} catch (error) {
  /* private mode / storage disabled */
}

function fitPhone() {
  const scale = Math.min(window.innerWidth / 402, window.innerHeight / 874);
  document.documentElement.style.setProperty("--scale", String(scale));
}

function assetPath(path) {
  if (!path) return "";
  if (path.startsWith("./") || path.startsWith("/") || path.startsWith("http")) return path;
  return `./${path}`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Keep the question on one line: shrink the font a touch only when a long
// question + suffix would overflow the fixed box (content width ~326px).
function fitQuestionFontSize(label) {
  const family =
    '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  const maxWidth = 326;
  let size = 14;
  questionMeasureCtx.font = `${size}px ${family}`;
  while (size > 11 && questionMeasureCtx.measureText(label).width > maxWidth) {
    size -= 0.5;
    questionMeasureCtx.font = `${size}px ${family}`;
  }
  return size;
}

function applyQuestion(question, savedLabel = "") {
  if (!question) return;
  currentQuestion = question;
  const suffix = questionSuffixes.length ? pickRandom(questionSuffixes) : "";
  const label = savedLabel || `${question.text}${suffix}`;
  const fontSize = `${fitQuestionFontSize(label)}px`;
  [selectQuestion, questionFlight].forEach((el) => {
    if (!el) return;
    el.textContent = label;
    el.style.fontSize = fontSize;
  });
  setHeroImage(question.image);
}

// Avoid repeating the immediately previous question across refreshes in the
// same tab. Only the question ID is kept; answers and results are never stored.
function applyRandomQuestion() {
  if (!questionLibrary.length) return;
  let lastQuestionId = null;
  try {
    lastQuestionId = Number(sessionStorage.getItem(LAST_QUESTION_KEY));
  } catch (error) {
    /* private mode / storage disabled */
  }

  const freshQuestions = questionLibrary.filter((question) => question.id !== lastQuestionId);
  const question = pickRandom(freshQuestions.length ? freshQuestions : questionLibrary);
  applyQuestion(question);

  try {
    sessionStorage.setItem(LAST_QUESTION_KEY, String(question.id));
  } catch (error) {
    /* private mode / storage disabled */
  }
}

function setHeroImage(image) {
  const url = `url("${assetPath(image)}")`;
  heroImageEls.forEach((el) => {
    el.style.backgroundImage = url;
  });
}

// Keep the green placeholder up until the scene image is decoded AND a minimum
// dwell (~2s) has passed, then fade it out for a soft blur->clear reveal. A
// safety cap makes sure a slow/failed load never leaves the screen green.
function revealHeroWhenReady(image) {
  if (!heroLoader) return;
  clearTimeout(sceneRevealTimer);
  heroLoader.classList.remove("is-hidden");
  selectScreen.classList.add("is-scene-loading");

  const minDwell = 2000;
  const safetyCap = 6000;
  const startedAt = Date.now();
  let done = false;
  const reveal = () => {
    if (done) return;
    done = true;
    clearTimeout(sceneRevealTimer);
    const wait = Math.max(0, minDwell - (Date.now() - startedAt));
    sceneRevealTimer = setTimeout(() => {
      heroLoader.classList.add("is-hidden");
      selectScreen.classList.remove("is-scene-loading");
    }, wait);
  };

  sceneRevealTimer = setTimeout(reveal, safetyCap);
  const probe = new Image();
  probe.onload = reveal;
  probe.onerror = reveal;
  probe.src = assetPath(image);
}

function pickRandomItems(source, count = 4) {
  const pool = [...source];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function prepareRandomOptions() {
  currentItems = pickRandomItems(itemLibrary, 4);
  selected = null;
  confirmButton.classList.remove("is-visible");
  renderOptions();
}

function renderOptions() {
  options.innerHTML = currentItems
    .map(
      (item) => `
        <button class="option-card" type="button" data-id="${item.id}" aria-label="选择${item.name}">
          <img src="${assetPath(item.image)}" alt="" />
          <span>${item.name}</span>
          <img class="check" src="./assets/icon-selected.svg" alt="" aria-hidden="true" />
        </button>
      `
    )
    .join("");
}

function selectItem(id) {
  if (selected && String(selected.id) === String(id)) {
    selected = null;
    document.querySelectorAll(".option-card").forEach((card) => {
      card.classList.remove("is-selected");
    });
    confirmButton.classList.remove("is-visible");
    return;
  }

  selected = currentItems.find((item) => String(item.id) === String(id));
  document.querySelectorAll(".option-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.id === String(id));
  });
  confirmButton.classList.add("is-visible");
}

function setupWaterRipples(canvas) {
  if (!canvas) return () => {};

  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let frameId = 0;
  let running = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    if (!running) return;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height * 0.55;
    const maxRadius = Math.min(width, height) * 0.78;
    const minRadius = maxRadius * 0.18;

    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < 3; i += 1) {
      const progress = ((time / ripplePeriodMs) + i / 3) % 1;
      const fadeIn = Math.min(1, progress / 0.16);
      const fadeOut = Math.min(1, (1 - progress) / 0.42);
      const visibility = Math.max(0, Math.min(fadeIn, fadeOut));

      if (visibility <= 0.02) continue;

      const radius = minRadius + (maxRadius - minRadius) * progress;
      const life = radius / maxRadius;
      const alpha = visibility * (rippleBright - life * 0.12);
      const bandWidth = 64 + life * 76;
      const stableCx = Math.round(cx);
      const stableCy = Math.round(cy);
      const stableRadius = Math.round(radius);
      const inner = Math.max(0, stableRadius - bandWidth * 0.58);
      const outer = Math.min(maxRadius * 1.1, stableRadius + bandWidth * 0.62);

      const ring = ctx.createRadialGradient(stableCx, stableCy, inner, stableCx, stableCy, outer);
      ring.addColorStop(0, "rgba(47, 143, 134, 0)");
      ring.addColorStop(0.2, `rgba(47, 143, 134, ${alpha * 0.38})`);
      ring.addColorStop(0.36, `rgba(91, 207, 190, ${alpha * 0.78})`);
      ring.addColorStop(0.47, `rgba(255, 255, 255, ${alpha})`);
      ring.addColorStop(0.53, `rgba(255, 255, 255, ${alpha})`);
      ring.addColorStop(0.66, `rgba(91, 207, 190, ${alpha * 0.72})`);
      ring.addColorStop(0.82, `rgba(47, 143, 134, ${alpha * 0.32})`);
      ring.addColorStop(1, "rgba(47, 143, 134, 0)");

      ctx.filter = "blur(3px)";
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(stableCx, stableCy, outer, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    frameId = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    frameId = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
    ctx.clearRect(0, 0, width, height);
  }

  window.addEventListener("resize", resize);

  return { start, stop };
}

function fillResult(item) {
  resultTitle.textContent = item.name;
  resultImage.src = assetPath(item.image);
  resultImage.alt = item.name;
  resultCopy.textContent = item.result;
}

function showResult() {
  if (!selected) return;
  stopWaterRipples?.stop();
  clearTimeout(resultIntroTimer);
  clearTimeout(questionFlightTimer);
  fillResult(selected);
  selectScreen.classList.remove("is-active");
  resultScreen.classList.add("is-active", "is-entering");
  resultScreen.classList.remove("is-result-visible");
  questionFlight.classList.remove("is-settled");
  questionFlight.classList.add("is-active");
  questionFlight.classList.remove("is-moving");
  window.scrollTo({ top: 0, behavior: "instant" });
  questionFlightTimer = setTimeout(() => {
    questionFlight.classList.add("is-moving");
  }, 40);
  resultIntroTimer = setTimeout(() => {
    resultScreen.classList.add("is-result-visible");
  }, 360);
}

function showSelect() {
  stopWaterRipples?.stop();
  clearTimeout(selectIntroTimer);
  clearTimeout(selectContentTimer);
  clearTimeout(resultIntroTimer);
  clearTimeout(questionFlightTimer);
  selectScreen.classList.remove("is-entering", "is-panel-visible", "is-content-visible", "is-intro", "is-intro-out");
  resultScreen.classList.remove("is-entering", "is-result-visible");
  questionFlight.classList.remove("is-active", "is-moving", "is-settled");
  resultScreen.classList.remove("is-active");
  selectScreen.classList.add("is-active");
  selectScreen.classList.remove("is-scene-loading");
  heroLoader?.classList.add("is-hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showSelectWithIntro() {
  clearTimeout(selectIntroTimer);
  clearTimeout(selectContentTimer);
  stopWaterRipples?.stop();
  stopWaterRipples?.start();
  prepareRandomOptions();
  applyRandomQuestion();
  revealHeroWhenReady(currentQuestion ? currentQuestion.image : null);
  resultScreen.classList.remove("is-active");
  selectScreen.classList.add("is-active", "is-entering", "is-intro");
  selectScreen.classList.remove("is-panel-visible", "is-content-visible", "is-intro-out");
  window.scrollTo({ top: 0, behavior: "instant" });
  selectIntroTimer = setTimeout(() => {
    selectScreen.classList.add("is-intro-out", "is-panel-visible");
  }, 2300);
  selectContentTimer = setTimeout(() => {
    selectScreen.classList.add("is-content-visible");
    selectScreen.classList.remove("is-intro", "is-intro-out");
    stopWaterRipples?.stop();
  }, 2920);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1600);
}

fitPhone();
stopWaterRipples = setupWaterRipples(waterRippleCanvas);

options.addEventListener("click", (event) => {
  const card = event.target.closest(".option-card");
  if (!card) return;
  selectItem(card.dataset.id);
});

window.addEventListener("resize", fitPhone);
confirmButton.addEventListener("click", showResult);
backButton.addEventListener("click", startFreshRound);
shareButton.addEventListener("click", async () => {
  const shareData = {
    title: "somo with you",
    text: selected ? `我的上车物品是：${selected.name}` : "我的上车物品测试结果"
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  showToast("已准备分享结果");
});


/* ===================================================================
 * 加载拆分开关（追加；仅 URL 带参时生效，不改默认流程）
 *  ?holdIntro=1  绿色 loading 无缝循环(4s) + 隐藏状态栏，供录制序列帧
 *  ?splice=1     拼接预览：绿层整层淡出 + H5 淡入
 *  数值：--loop=4s（序列帧一个周期）；--splice-fade=700ms（视频淡出=H5淡入）
 * =================================================================== */
function _splitEnterSelectBase() {
  clearTimeout(selectIntroTimer);
  clearTimeout(selectContentTimer);
  resultScreen.classList.remove("is-active");
  selectScreen.classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showSelectHoldIntro() {
  ripplePeriodMs = 4000;                       // canvas 水波循环 4s（可用 ?loop=毫秒 覆盖）
  rippleBright = 0.9;                           // 水波亮度（可用 ?bright=数值 现场调，越大越亮）
  try {
    const _sp = new URLSearchParams(location.search);
    if (_sp.get("bright")) rippleBright = parseFloat(_sp.get("bright"));
    if (_sp.get("loop"))   ripplePeriodMs = parseFloat(_sp.get("loop"));
  } catch (e) {}
  prepareFreshRound();
  _splitEnterSelectBase();
  stopWaterRipples?.start();                   // 水波向外扩散(原版效果，柔化亮度后循环)
  heroLoader?.classList.remove("is-hidden");
  selectScreen.classList.add("is-entering", "is-intro", "is-capture", "is-scene-loading");
  // 不推进 timer → 绿色 loading 无缝循环
}

function showSelectAfterLoading() {
  // 独立 loading 已经播放完成，这里直接呈现「场景逐渐清晰 + 脉冲上抬」。
  stopWaterRipples?.stop();
  _splitEnterSelectBase();
  heroLoader?.classList.add("is-hidden");       // loading 已完成，直接露出场景
  selectScreen.classList.remove("is-scene-loading");
  selectScreen.classList.add("is-entering");
  selectIntroTimer = setTimeout(() => {
    selectScreen.classList.add("is-intro-out", "is-panel-visible"); // washRise 脉冲上抬
  }, 200);
  selectContentTimer = setTimeout(() => {
    selectScreen.classList.add("is-content-visible");
    selectScreen.classList.remove("is-intro-out");
  }, 820);
}

const SPLICE_DWELL_MS = 2400;
function showSelectSplice() {
  showSelectHoldIntro();
  setTimeout(() => {
    selectScreen.classList.remove("is-capture");
    heroLoader?.classList.add("is-hidden");
    selectScreen.classList.remove("is-scene-loading");
    // 只加 is-splice-out(纯 opacity 淡出) + is-panel-visible(脉冲上抬/面板)；
    // 不加 is-intro-out，避免它给 loading 层加 blur/位移导致「停住飘走」。
    selectScreen.classList.add("is-panel-visible", "is-splice-out");
    // is-intro 保留 → loading 在淡出全程继续动；淡出结束后再收尾
    setTimeout(() => {
      stopWaterRipples?.stop();
      selectScreen.classList.add("is-content-visible");
      selectScreen.classList.remove("is-intro", "is-splice-out");
    }, 760); // > --splice-fade(700ms)
  }, SPLICE_DWELL_MS);
}

function showInitialDestination() {
  try {
    const sp = new URLSearchParams(location.search);
    if (sp.get("holdIntro") === "1") showSelectHoldIntro();
    else if (sp.get("splice") === "1") showSelectSplice();
    else startFreshRound();
  } catch (e) {
    startFreshRound();
  }
}

function prepareFreshRound() {
  prepareRandomOptions();
  applyRandomQuestion();
}

function startFreshRound() {
  prepareFreshRound();
  playEntryLoading(showSelectAfterLoading);
}

function playEntryLoading(destination) {
  if (!loadingScreen) {
    destination();
    return;
  }

  const loadingDwellMs = 3000;
  const loadingFadeMs = 500;
  clearTimeout(initialLoadingTimer);
  loadingScreen.classList.remove("is-leaving");
  loadingScreen.setAttribute("aria-hidden", "false");
  loadingScreen.classList.add("is-active");
  initialLoadingTimer = setTimeout(() => {
    destination();
    loadingScreen.classList.add("is-leaving");
    initialLoadingTimer = setTimeout(() => {
      loadingScreen.classList.remove("is-active", "is-leaving");
      loadingScreen.setAttribute("aria-hidden", "true");
    }, loadingFadeMs);
  }, loadingDwellMs);
}

showInitialDestination();
