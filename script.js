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

// Optional (used only if present)
const resultsSummaryEl  = document.getElementById("results-summary");
const finalScoreEl      = document.getElementById("final-score");
const finalMessageEl    = document.getElementById("final-message");
const viewAnswersBtn    = document.getElementById("view-answers");
const answerReviewEl    = document.getElementById("answer-review");
const reviewContentEl   = document.getElementById("review-content");
const menuToggleBtn     = document.getElementById("menu-toggle");
const menuEl            = document.getElementById("menu");

// ---------- State ----------
let appConfig = {};
let questions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;
let isTimedMode = false;
let timerInterval = null;

// ---------- Data loaders (Cloudflare Pages: static files at repo root) ----------
async function loadConfig(file = "config.json") {
  const url = `/${file}?v=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Config HTTP ${res.status} for ${url}`);
  return res.json();
}

async function loadQuestions(file = "questions.json") {
  const url = `/${file}?v=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Questions HTTP ${res.status} for ${url}`);

  // sanity: ensure JSON, not an HTML 404
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    const sample = (await res.text()).slice(0, 120);
    throw new Error(`Expected JSON from ${url}, got: ${sample}`);
  }
  return res.json();
}

// ---------- Image path resolver ----------
function resolveImageUrl(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;          // already absolute URL
  if (p.startsWith("/")) return p;                // site-root
  // strip legacy prefixes
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
  // Only run on pages that actually have quiz UI
  if (!questionEl || !choicesEl) return;

  try {
    // Load config first (decide which questions file / images base)
    appConfig = await loadConfig().catch(() => ({}));
    const questionsFile = appConfig.questionsFile || "questions.json";
    appConfig.imagesBase = appConfig.imagesBase || "/images/";

    // URL mode override: ?mode=timed or ?mode=leisure
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "timed") isTimedMode = true;
    if (mode === "leisure") isTimedMode = false;

    // If there are explicit start buttons, we wait for user click.
    // Otherwise, auto-start when no start UI exists.
    const hasStartUI = !!startSection;
    if (!hasStartUI) {
      await startQuiz(isTimedMode, questionsFile);
    } else {
      // Wire start buttons
      if (startButton) {
        startButton.addEventListener("click", () => startQuiz(false, questionsFile));
      }
      if (startTimedButton) {
        startTimedButton.addEventListener("click", () => startQuiz(true, questionsFile));
      }
    }

    // Next / Home
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
          showQuestion();
        } else {
          clearInterval(timerInterval);
          showResults();
        }
      });
    }

    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }

    // Optional toggles
    if (menuToggleBtn && menuEl) {
      menuToggleBtn.onclick = () => menuEl.classList.toggle("show");
    }

    if (viewAnswersBtn && resultsSummaryEl && answerReviewEl && reviewContentEl) {
      viewAnswersBtn.addEventListener("click", () => {
        resultsSummaryEl.classList.add("hidden");
        answerReviewEl.classList.remove("hidden");
        renderAnswerReview();
      });
    }

  } catch (err) {
    console.error("initQuiz failed:", err);
    if (questionEl) questionEl.textContent = "⚠️ Failed to initialize quiz.";
  }
}

async function startQuiz(timed, questionsFile) {
  isTimedMode = !!timed;

  // Reset state/UI
  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];
  clearInterval(timerInterval);

  if (feedbackEl) feedbackEl.innerHTML = "";
  if (birdImage) birdImage.style.display = "none";

  if (startSection)  startSection.style.display = "none";
  if (resultsSection) resultsSection.style.display = "none";
  if (quizSection)   quizSection.style.display = "block";
  if (quizHeader)    quizHeader.style.display = isTimedMode ? "flex" : "none";

  try {
    const data = await loadQuestions(questionsFile || "questions.json");
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No questions loaded");
    }
    questions = data;
    showQuestion();
  } catch (e) {
    console.error(e);
    if (questionEl) questionEl.textContent = "⚠️ Failed to load quiz questions.";
  }
}

function showQuestion() {
  clearInterval(timerInterval);

  const q = questions[currentQuestionIndex];
  if (!q) return;

  if (questionEl) {
    questionEl.textContent = q.question || "Question";
  }

  // Image
  showQuestionImage(q);

  // Choices
  if (choicesEl) {
    choicesEl.innerHTML = "";
    (q.choices || []).forEach(choice => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choice;
      btn.onclick = () => handleAnswer(choice, q.answer, q.info);
      choicesEl.appendChild(btn);
    });
  }

  if (feedbackEl) feedbackEl.innerHTML = "";
  if (nextButton) nextButton.style.display = "none";

  updateProgressBar();
  if (isTimedMode) startTimer(30);
}

function handleAnswer(selected, correct, info) {
  clearInterval(timerInterval);

  const isCorrect = selected === correct;
  if (isCorrect) score++;

  if (feedbackEl) {
    feedbackEl.innerHTML = isCorrect
      ? `<p>✅ Correct!</p>${info ? `<p>${info}</p>` : ""}`
      : `<p>❌ Incorrect. The correct answer was <strong>${correct}</strong>.</p>${info ? `<p>${info}</p>` : ""}`;
  }

  const q = questions[currentQuestionIndex];
  const entry = {
    question: q.question,
    selected,
    correct,
    isCorrect,
    info: info || ""
  };

  const idx = userAnswers.findIndex(x => x.question === q.question);
  if (idx >= 0) userAnswers[idx] = entry; else userAnswers.push(entry);

  if (nextButton) nextButton.style.display = "block";
}

function showResults() {
  if (quizSection) quizSection.style.display = "none";
  if (quizHeader)  quizHeader.style.display = "none";
  if (resultsSection) resultsSection.style.display = "block";

  const correctCount = userAnswers.filter(x => x.isCorrect).length;
  const total = questions.length;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;

  if (finalScoreEl) finalScoreEl.textContent = `${correctCount} / ${total} (${percent}%)`;

  let message;
  if (percent === 100) message = "You're a master birder! 🦅🏆";
  else if (percent >= 80) message = "Fantastic job! You really know your birds 🐦👏";
  else if (percent >= 50) message = "Nice work! There’s a birder in you yet 🌿";
  else message = "Keep exploring — birding is a journey 🐣";
  if (finalMessageEl) finalMessageEl.textContent = message;

  // If you have a compact summary box:
  if (resultsSummaryEl) resultsSummaryEl.classList.remove("hidden");
}

function renderAnswerReview() {
  if (!reviewContentEl) return;
  reviewContentEl.innerHTML = "";
  userAnswers.forEach((entry, i) => {
    const div = document.createElement("div");
    div.className = `result-item ${entry.isCorrect ? "correct" : "incorrect"}`;
    div.innerHTML = `
      <h3>Question ${i + 1}</h3>
      <p><strong>Question:</strong> ${entry.question}</p>
      <p><strong>Your Answer:</strong> ${entry.selected || "(none)"}</p>
      <p><strong>Correct Answer:</strong> ${entry.correct}</p>
      ${entry.info ? `<a href="${entry.info}" target="_blank" rel="noopener">🔗 More Information</a>` : ""}
    `;
    reviewContentEl.appendChild(div);
  });
}

// ---------- Timer / Progress ----------
function startTimer(duration = 30) {
  if (!quizHeader || !timerText || !progressFill) return;

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
    if (timeLeft <= 5) {
      timerText.style.color = "red";
      timerText.style.fontWeight = "bold";
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      const q = questions[currentQuestionIndex];
      handleAnswer("", q?.answer, q?.info);
    }
  }, 1000);
}

function updateProgressBar() {
  if (!progressFill) return;
  const pct = questions.length ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  progressFill.style.width = `${pct}%`;
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize quiz logic if the quiz UI exists on this page
  if (document.getElementById("quiz-section") || document.getElementById("quiz-image")) {
    initQuiz().catch(console.error);
  }
});
