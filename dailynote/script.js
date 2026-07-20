const itemLibrary = Array.isArray(window.SOMO_ITEMS) ? window.SOMO_ITEMS : [];
let currentItems = [];

const options = document.querySelector("#options");
const questionFlight = document.querySelector("#questionFlight");
const confirmButton = document.querySelector("#confirmButton");
const selectScreen = document.querySelector("#selectScreen");
const resultScreen = document.querySelector("#resultScreen");
const resultTitle = document.querySelector("#resultTitle");
const resultImage = document.querySelector("#resultImage");
const resultCopy = document.querySelector("#resultCopy");
const backButton = document.querySelector("#backButton");
const resultTopBackButton = document.querySelector("#resultTopBackButton");
const shareButton = document.querySelector("#shareButton");
const soundButtons = document.querySelectorAll(".glass-button[aria-label='声音']");
const toast = document.querySelector("#toast");
const selectQuestion = document.querySelector("#selectQuestion");
const questionLibrary = Array.isArray(window.SOMO_QUESTIONS) ? window.SOMO_QUESTIONS : [];
const questionSuffixes = Array.isArray(window.SOMO_QUESTION_SUFFIXES) ? window.SOMO_QUESTION_SUFFIXES : [];
const heroImageEls = document.querySelectorAll(".hero, .result-hero");
const heroLoader = document.querySelector(".screen-select .hero-loader");
const questionMeasureCtx = document.createElement("canvas").getContext("2d");
let currentQuestion = null;

let selected = null;
let toastTimer = null;
let selectIntroTimer = null;
let selectContentTimer = null;
let resultIntroTimer = null;
let questionFlightTimer = null;
let sceneRevealTimer = null;

/* -------------------------------------------------------------------------
 * Daily state (persisted in localStorage, no user ID required).
 *
 * Rules:
 *  - A question stays assigned until it is answered. It carries over past
 *    midnight if the user never answered it.
 *  - Once answered on a given day, re-entering that same day shows the stored
 *    result. After midnight a fresh (unseen) question is assigned.
 *  - While unanswered, the 4 options are re-randomised on every entry.
 *  - Answered questions and chosen options are de-duplicated so they don't
 *    reappear (per-browser, which is the best we can do without a user ID).
 * ---------------------------------------------------------------------- */
const STORAGE_KEY = "somo_daily_v1";

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultState() {
  return { currentQuestionId: null, result: null, answeredQuestionIds: [], usedItemIds: [] };
}

let dailyState = defaultState();
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) dailyState = Object.assign(defaultState(), JSON.parse(raw));
} catch (error) {
  /* private mode / storage disabled -> falls back to in-memory state */
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyState));
  } catch (error) {
    /* ignore write failures */
  }
}

function questionById(id) {
  return questionLibrary.find((q) => q.id === id) || null;
}

function isAnsweredToday() {
  return !!(dailyState.result && dailyState.result.date === todayStr());
}

// The active (unanswered) question. Reuses the stored one if present, otherwise
// picks a fresh question the user hasn't answered before and remembers it.
function getActiveQuestion() {
  let question = questionById(dailyState.currentQuestionId);
  if (question) return question;

  let pool = questionLibrary.filter((q) => !dailyState.answeredQuestionIds.includes(q.id));
  if (!pool.length) {
    dailyState.answeredQuestionIds = [];
    pool = questionLibrary.slice();
  }
  question = pickRandom(pool);
  dailyState.currentQuestionId = question ? question.id : null;
  saveState();
  return question;
}

// Persist a completed answer + update the de-dup history. Only the first
// answer of the day is recorded so "today's result" stays fixed.
function recordAnswer(item) {
  if (!item || isAnsweredToday()) return;
  const questionId =
    dailyState.currentQuestionId != null
      ? dailyState.currentQuestionId
      : currentQuestion
      ? currentQuestion.id
      : null;
  dailyState.result = { date: todayStr(), questionId, itemId: item.id };
  if (questionId != null && !dailyState.answeredQuestionIds.includes(questionId)) {
    dailyState.answeredQuestionIds.push(questionId);
  }
  if (!dailyState.usedItemIds.includes(item.id)) {
    dailyState.usedItemIds.push(item.id);
  }
  dailyState.currentQuestionId = null;
  saveState();
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

// Apply the day's active question (stable until answered) plus a random
// decorative suffix, and swap the scene image behind it.
function applyActiveQuestion() {
  if (!questionLibrary.length) return;
  currentQuestion = getActiveQuestion();
  if (!currentQuestion) return;
  const suffix = questionSuffixes.length ? pickRandom(questionSuffixes) : "";
  const label = `${currentQuestion.text}${suffix}`;
  const fontSize = `${fitQuestionFontSize(label)}px`;
  [selectQuestion, questionFlight].forEach((el) => {
    if (!el) return;
    el.textContent = label;
    el.style.fontSize = fontSize;
  });
  setHeroImage(currentQuestion.image);
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

  const minDwell = 3000;
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
  // Prefer options the user hasn't chosen before (de-dup); top up with used
  // ones only when there aren't 4 fresh options left.
  let pool = itemLibrary.filter((item) => !dailyState.usedItemIds.includes(item.id));
  if (pool.length < 4) {
    const used = itemLibrary.filter((item) => dailyState.usedItemIds.includes(item.id));
    pool = pool.concat(used);
  }
  currentItems = pickRandomItems(pool, 4);
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
  selected = currentItems.find((item) => String(item.id) === String(id));
  document.querySelectorAll(".option-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.id === String(id));
  });
  confirmButton.classList.add("is-visible");
}

function fillResult(item) {
  resultTitle.textContent = item.name;
  resultImage.src = assetPath(item.image);
  resultImage.alt = item.name;
  resultCopy.textContent = item.result;
}

function showResult() {
  if (!selected) return;
  recordAnswer(selected);
  // Today's result is locked once answered: always render the stored item.
  if (isAnsweredToday() && dailyState.result) {
    const stored = itemLibrary.find((it) => it.id === dailyState.result.itemId);
    if (stored) selected = stored;
  }
  clearTimeout(resultIntroTimer);
  clearTimeout(questionFlightTimer);
  fillResult(selected);
  selectScreen.classList.remove("is-active");
  resultScreen.classList.add("is-active", "is-entering");
  resultScreen.classList.remove("is-result-visible");
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

function showSelectWithIntro() {
  clearTimeout(selectIntroTimer);
  clearTimeout(selectContentTimer);
  prepareRandomOptions();
  applyActiveQuestion();
  revealHeroWhenReady(currentQuestion ? currentQuestion.image : null);
  resultScreen.classList.remove("is-active");
  selectScreen.classList.add("is-active", "is-entering", "is-intro");
  selectScreen.classList.remove("is-panel-visible", "is-content-visible", "is-intro-out");
  window.scrollTo({ top: 0, behavior: "instant" });
  selectIntroTimer = setTimeout(() => {
    selectScreen.classList.add("is-intro-out", "is-panel-visible");
  }, 3000);
  selectContentTimer = setTimeout(() => {
    selectScreen.classList.add("is-content-visible");
    selectScreen.classList.remove("is-intro", "is-intro-out");
  }, 3620);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1600);
}

fitPhone();
showSelectWithIntro();

options.addEventListener("click", (event) => {
  const card = event.target.closest(".option-card");
  if (!card) return;
  selectItem(card.dataset.id);
});

window.addEventListener("resize", fitPhone);
confirmButton.addEventListener("click", showResult);
backButton.addEventListener("click", showSelectWithIntro);
resultTopBackButton.addEventListener("click", showSelectWithIntro);
document.querySelector(".screen-select .glass-button[aria-label='返回']").addEventListener("click", () => {
  showSelectWithIntro();
});
soundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const isMuted = button.classList.toggle("is-muted");
    showToast(isMuted ? "已关闭声音" : "已开启声音");
  });
});
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
