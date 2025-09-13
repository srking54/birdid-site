// =============================
// BirdID Quiz — script.js (clean)
// =============================

// ---------- DOM ----------
const startButton       = document.getElementById("start-button");
const startTimedButton  = document.getElementById("start-timed-button");
const nextButton        = document.getElementById("next-btn");

const questionEl        = document.getElementById("question");
const choicesEl         = document.getElementById("choices");
const birdImage         = document.getElementById("quiz-image");
const feedbackEl        = document.getElementById("feedback");

const startSection      = document.getElementById("start-section");
const quizSection       = document.getElementById("quiz-section");
const resultsSection    = document.getElementById("results-section");

const quizHeader        = document.getElementById("quiz-header");
const timerText         = document.getElementById("timer-text");
const progressFill      = document.getElementById("progressFill");

const homeBtn           = document.getElementById("go-home");

// Optional
const resultsSummaryEl  = document.getElementById("results-summary");
const finalScoreEl      = document.getElementById("final-score");
const finalMessageEl    = document.getElementById("final-message");
const viewAnswersBtn    = document.getElementById("view-answers");
const answerReviewEl    = document.getElementById("answer-review");
const reviewContentEl   = document.getElementById("review-content");
const menuToggleBtn     = document.getElementById("menu-toggle");
const menuEl            = document.getElementById("menu");

// ---------- State (scoped) ----------
let appConfig = {};
let questions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;
let isTimedMode = false;
let timerInterval = null;

// ---------- Data loaders ----------
async function loadJsonAt(path) {
  const url = `/${path.replace(/^\/+/, "")}?v=${Date.now()}`;
  console.log("[fetch]", url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    const sample = (await res.text()).slice(0, 120);
    throw new Error(`Expected JSON from ${url}, got: ${sample}`);
  }
  return res.json();
}
const loadConfig    = (file = "config.json")    => loadJsonAt(file);
const loadQuestions = (file = "questions.json") => loadJsonAt(file);

// ---------- Images ----------
function resolveImageUrl(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;   // absolute
  if (p.startsWith("/")) return p;         // site-root

  const name = p
    .replace(/^backend\/static\/images\//, "")
    .replace(/^static\/images\//, "")
    .replace(/^images\//, "");
  const base = (appConfig.imagesBase || "/images/").replace(/\/+$/, "");
  return `${base}/${name}`;
}

function showQuestionImage(q) {
  if (!birdImage) return;
  const url = resolveImageUrl(q?.image);
  if (url) {
    birdImage.src = url;
    birdImage.alt = q.title || "Bird image";
    birdImage.style.display = "block";
  } else {
    birdImage.removeAttribute("src");
    birdImage.style.display = "none";
  }
}

// ---------- Quiz flow ----------
async function initQuiz() {
  // Only run on page with quiz UI
  if (!quizSection || !questionEl || !choicesEl) return;

  try {
    appConfig = await loadConfig().catch(() => ({}));
    const questionsFile = appConfig.questionsFile || "questions.json";
    appConfig.imagesBase = appConfig.imagesBase || "/images/";

    // Mode override via URL ?mode=timed|leisure
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "timed")   isTimedMode = true;
    if (mode === "leisure") isTimedMode = false;

    // Wire buttons
    startButton?.addEventListener("click", () => startQuiz(false, questionsFile));
    startTimedButton?.addEventListener("click", () => startQuiz(true, questionsFile));
    nextButton?.addEventListener("click", nextQuestion);
    homeBtn?.addEventListener("click", () => (window.location.href = "index.html"));

    if (menuToggleBtn && menuEl) {
      menuToggleBtn.onclick = () => menuEl.classList.toggle("show");
    }
    if (viewAnswersBtn) {
      viewAnswersBtn.addEventListener("click", () => {
        resultsSummaryEl?.classList.add("hidden");
        answerReviewEl?.classList.remove("hidden");
        renderAnswerReview();
      });
    }

    // If there is no explicit start UI, auto-start
    if (!startSection) {
      await startQuiz(isTimedMode, questionsFile);
    }
  } catch (err) {
    console.error("initQuiz failed:", err);
    questionEl.textContent = "⚠️ Failed to initialize quiz.";
  }
}

async function startQuiz(timed, questionsFile) {
  document.body.classList.remove("results-mode");
  isTimedMode = !!timed;

  // Reset
  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];
  clearInterval(timerInterval);
  feedbackEl && (feedbackEl.innerHTML = "");
  birdImage && (birdImage.style.display = "none");

  startSection  && (startSection.style.display = "none");
  resultsSection&& (resultsSection.style.display = "none");
  quizSection   && (quizSection.style.display = "block");
  quizHeader    && (quizHeader.style.display = isTimedMode ? "flex" : "none");

  try {
    const data = await loadQuestions(questionsFile || "questions.json");
    if (!Array.isArray(data) || data.length === 0) throw new Error("No questions loaded");
    questions = data;
    showQuestion();
  } catch (e) {
    console.error("startQuiz error:", e);
    questionEl.textContent = "⚠️ Failed to load quiz questions.";
  }
}

function showQuestion() {
  clearInterval(timerInterval);

  const q = questions[currentQuestionIndex];
  if (!q) return;

  questionEl.textContent = q.question || "Question";
  showQuestionImage(q);

  choicesEl.innerHTML = "";
  (q.choices || []).forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.onclick = () => handleAnswer(choice, q.answer, q.info);
    choicesEl.appendChild(btn);
  });

  feedbackEl.innerHTML = "";
  nextButton.style.display = "none";

  updateProgressBar();
  if (isTimedMode) startTimer(30);
}

function handleAnswer(selected, correct, info) {
  clearInterval(timerInterval);

  const isCorrect = selected === correct;
  if (isCorrect) score++;

  feedbackEl.innerHTML = isCorrect
    ? `<p>✅ Correct!</p>${info ? `<p>${info}</p>` : ""}`
    : `<p>❌ Incorrect. The correct answer was <strong>${correct}</strong>.</p>${info ? `<p>${info}</p>` : ""}`;

  const q = questions[currentQuestionIndex];

  // 🔸 Save a resolved image URL for the review page
  const entry = {
    question: q.question,
    image: resolveImageUrl(q.image) || "",  // <— add this
    selected,
    correct,
    isCorrect,
    info: info || ""
  };

  const idx = userAnswers.findIndex(x => x.question === q.question);
  if (idx >= 0) userAnswers[idx] = entry; else userAnswers.push(entry);

  nextButton.style.display = "block";
}


function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
  } else {
    clearInterval(timerInterval);
    showResults();
  }
}

function showResults() {
  quizSection.style.display = "none";
  quizHeader.style.display  = "none";
  resultsSection.style.display = "block";
  document.body.classList.add("results-mode");

  const correctCount = userAnswers.filter(x => x.isCorrect).length;
  const total = questions.length;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;

  finalScoreEl && (finalScoreEl.textContent = `${correctCount} / ${total} (${percent}%)`);
  let message =
    percent === 100 ? "You're a master birder! 🦅🏆" :
    percent >= 80   ? "Fantastic job! You really know your birds 🐦👏" :
    percent >= 50   ? "Nice work! There’s a birder in you yet 🌿" :
                      "Keep exploring — birding is a journey 🐣";
  finalMessageEl && (finalMessageEl.textContent = message);
  resultsSummaryEl && resultsSummaryEl.classList.remove("hidden");
  
}

function renderAnswerReview() {
  if (!reviewContentEl) return;
  reviewContentEl.innerHTML = "";

  userAnswers.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = `result-item ${e.isCorrect ? "correct" : "incorrect"}`;
    div.innerHTML = `
      <h3>Question ${i + 1}</h3>
      ${e.image ? `<img src="${e.image}" alt="Bird image" class="question-image" />` : ""}
      <p><strong>Question:</strong> ${e.question}</p>
      <p><strong>Your Answer:</strong> ${e.selected || "(none)"}</p>
      <p><strong>Correct Answer:</strong> ${e.correct}</p>
      ${e.info ? `<a href="${e.info}" target="_blank" rel="noopener">🔗 More Information</a>` : ""}
    `;
    reviewContentEl.appendChild(div);
  });
}

// ---------- Timer / Progress ----------
function startTimer(duration = 30) {
  quizHeader.style.display = "flex";
  let timeLeft = duration;

  timerText.textContent = `Time left: ${timeLeft}s`;
  timerText.style.color = "black";
  timerText.style.fontWeight = "normal";
  progressFill.style.width = `100%`;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerText.textContent = `Time left: ${timeLeft}s`;
    const pct = Math.max(0, (timeLeft / duration) * 100);
    progressFill.style.width = `${pct}%`;

    if (timeLeft === 10) timerText.style.color = "orange";
    if (timeLeft <= 5) { timerText.style.color = "red"; timerText.style.fontWeight = "bold"; }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      const q = questions[currentQuestionIndex];
      handleAnswer("", q?.answer, q?.info);
    }
  }, 1000);
}

function updateProgressBar() {
  const pct = questions.length ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  progressFill.style.width = `${pct}%`;
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  // only init on pages that have quiz UI
  if (quizSection || document.getElementById("quiz-image")) {
    initQuiz().catch(console.error);
  }
});
