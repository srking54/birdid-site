// ======= DOM Elements =======
const startButton = document.getElementById("start-button");
const startTimedButton = document.getElementById("start-timed-button");
const nextButton = document.getElementById("next-btn");
const questionEl = document.getElementById("question");
const choicesEl = document.getElementById("choices");
const birdImage = document.getElementById("bird-img");
const feedbackEl = document.getElementById("feedback");
const progressBar = document.getElementById("progressBar");
const timerText = document.getElementById("timer-text");
const startSection = document.getElementById("start-section");
const quizSection = document.getElementById("quiz-section");
const resultsSection = document.getElementById("results-section");
const quizHeader = document.getElementById("quiz-header");
const progressFill = document.getElementById("progressFill");
const homeBtn = document.getElementById("go-home");
const button = document.getElementById('info-button');
// ======= Global Variables =======
let userAnswers = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let isTimedMode = false;
let timerInterval = null;

// ======= Load Questions =======
async function loadQuestions() {
  try {
    const res = await fetch(`/api/questions?file=${encodeURIComponent(filename)}&v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to load questions:", error);
    return null;
  }
}

// ======= Start Quiz =======
async function startQuiz(timed = false) {
  isTimedMode = timed;
  console.log("▶️ startQuiz triggered");

  currentQuestionIndex = 0;
  score = 0;
  birdImage.style.display = "none";
  feedbackEl.innerHTML = "";
  userAnswers = [];

  startSection.style.display = "none";
  resultsSection.style.display = "none";
  quizSection.style.display = "block";
  quizHeader.style.display = timed ? "flex" : "none";

  const data = await loadQuestions();
  if (!data) {
    questionEl.textContent = "⚠️ Failed to load quiz questions.";
    return;
  }

  questions = data;
  showQuestion();
}

// Safely generate image path
function getImagePath(filename) {
  if (!filename) return "";
  return filename.includes("/") ? filename : `images/${filename}`;
}

function normalizePath(p) {
  if (!p) return p;
  // If it starts with http(s), leave it; otherwise ensure a leading slash
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return p.startsWith('/') ? p : '/' + p;
}

// when setting the img src:
img.src = normalizePath(question.image);

window.startQuiz = startQuiz; // ⬅️ Expose for HTML access

// 🧭 Auto-launch based on URL mode param
 const mode = new URLSearchParams(window.location.search).get("mode");

if (mode === "timed") {
  startQuiz(true);
} else if (mode === "leisure") {
  startQuiz(false);
}

// ======= Show Question =======
function showQuestion() {
  clearInterval(timerInterval);

  const question = questions[currentQuestionIndex];
  questionEl.textContent = question.question;

  console.log("🎯 showQuestion called with index:", currentQuestionIndex);
  console.log("Question:", question);

  if (question.image) {
    imageEl.src = `/static/${question.image}`;
    birdImage.style.display = "block";
  } else {
    birdImage.style.display = "none";
  }

  choicesEl.innerHTML = "";
  question.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.onclick = () => handleAnswer(choice, question.answer, question.info);
    choicesEl.appendChild(btn);
  });

  feedbackEl.innerHTML = "";
  nextButton.style.display = "none";

  imageElement.src = getImagePath(questions[currentQuestionIndex].image);

  updateProgressBar();
  if (isTimedMode) startTimer(30);
}

// ======= Handle Answer =======
function handleAnswer(selected, correct, info) {
  clearInterval(timerInterval);
  console.log("✅ handleAnswer triggered");
  const isCorrect = selected === correct;
  
  if (isCorrect) {
  score++;
  feedbackEl.innerHTML = `<p>✅ Correct!</p><p>${info}</p>`;
} else {
  feedbackEl.innerHTML = `<p>❌ Incorrect. The correct answer was <strong>${correct}</strong>.</p><p>${info}</p>`;
}

const newEntry = {
  question: questions[currentQuestionIndex].question,
  selected,
  correct,
  isCorrect,
  info
};

const existingIndex = userAnswers.findIndex(
  (q) => q.question === questions[currentQuestionIndex].question
);

if (existingIndex > -1) {
  userAnswers[existingIndex] = newEntry;
} else {
  userAnswers.push(newEntry);
}

  nextButton.style.display = "block";
}

// ======= Next Question =======
nextButton.onclick = () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
     
  } else {
    clearInterval(timerInterval); // Make sure timer stops
    showResults(); // 🐦 Your custom results page function
  }
};

function showResults() {
  const correctCount = userAnswers.filter(q => q.isCorrect).length;
  const totalQuestions = questions.length;
  const percent = Math.round((correctCount / totalQuestions) * 100);

  document.getElementById("quiz-section").style.display = "none";
  document.getElementById("results-summary").classList.remove("hidden");
  document.getElementById("final-score").textContent = `${correctCount} / ${totalQuestions} (${percent}%)`;

  document.body.classList.add("results-page");
  
  let message;
  if (percent === 100) {
    message = "You're a master birder! 🦅🏆";
  } else if (percent >= 80) {
    message = "Fantastic job! You really know your birds 🐦👏";
  } else if (percent >= 50) {
    message = "Nice work! There’s a birder in you yet 🌿";
  } else {
    message = "Keep exploring — birding is a journey 🐣";
  }

  document.getElementById("final-message").textContent = message;
}
console.log("quizData:", quizData);
console.log("quizData[0]:", quizData ? quizData[0] : "quizData is undefined");

quizData[0].image

const resultEl = document.getElementById("result");

if (resultEl) {
  resultEl.innerHTML = `
    <div class="final-score">
      <h2>You scored <strong>${score} / ${total}</strong> (${percent}%)</h2>
      <p>${message}</p>
      <button id="restart-btn" onclick="location.href='index.html'">🔄 Play Again</button>
    </div>
  `;
}

console.log("✅ showResults triggered");

// ======= End Quiz =======

function endQuiz() {
  quizSection.style.display = "none";
  quizHeader.style.display = "none";
  resultsSection.style.display = "block";

  let correctCount = userAnswers.filter(q => q.isCorrect).length;

  let resultsHTML = `<h2>🌟 You scored ${correctCount} / ${questions.length}</h2>`;

  userAnswers.forEach((entry, index) => {
    resultsHTML += `
      <div class="result-item ${entry.isCorrect ? 'correct' : 'incorrect'}">
        <h3>Question ${index + 1}</h3>
        <p><strong>Question:</strong> ${entry.question}</p>
        <p><strong>Your Answer:</strong> ${entry.selected}</p>
        <p><strong>Correct Answer:</strong> ${entry.correct}</p>
        ${entry.info ? `<a href="${entry.info}" target="_blank">🔗 More Information</a>` : ''}
      </div>
    `;
  });

  resultsSection.innerHTML = resultsHTML;
}

// ======= Timer Countdown =======

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
    const percent = (timeLeft / duration) * 100;
    progressFill.style.width = `${percent}%`;

    if (timeLeft === 10) timerText.style.color = "orange";
    if (timeLeft <= 5) {
      timerText.style.color = "red";
      timerText.style.fontWeight = "bold";
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      // ⏰ Trigger answer logic here
      handleAnswer("", questions[currentQuestionIndex].answer, questions[currentQuestionIndex].info);
    }
  }, 1000);
}

// ======= Progress Bar Logic =======
function updateProgressBar() {
  const progreconstss = ((currentQuestionIndex + 1) / questions.length) * 100;
  progressBar.style.width = `${progress}%`;
}

// ======= Button Setup =======
function submitAnswer() {
  document.getElementById("more-info-button").classList.remove("hidden");
}

function setupEventListeners() {

  // 🌐 Navigation
  homeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
    homeBtn.style.display = "none";
    document.getElementById("quiz-info").classList.remove("hidden");
    document.getElementById("question-box").classList.add("hidden");
    document.getElementById("result-box").classList.add("hidden");
    document.getElementById("final-result").style.display = "none";
  });

  // 🐣 Quiz Start
  document.getElementById("start-quiz").addEventListener("click", () => {
    document.getElementById("quiz-info").classList.add("hidden");
    document.getElementById("question-box").classList.remove("hidden");
    homeBtn.style.display = "inline-block";
  });

  // 🕐 Next Question
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

// ======= Initialize App =======
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

document.getElementById("view-answers").addEventListener("click", () => {
  document.getElementById("results-summary").classList.add("hidden");
  document.getElementById("answer-review").classList.remove("hidden");

document.getElementById("menu-toggle").onclick = () => {
  document.getElementById("menu").classList.toggle("show");
};
  const reviewContainer = document.getElementById("review-content");
  reviewContainer.innerHTML = "";

  userAnswers.forEach((entry, index) => {
    reviewContainer.innerHTML += `
      <div class="result-item ${entry.isCorrect ? 'correct' : 'incorrect'}">
        <h3>Question ${index + 1}</h3>
        <p><strong>Question:</strong> ${entry.question}</p>
        <p><strong>Your Answer:</strong> ${entry.selected}</p>
        <p><strong>Correct Answer:</strong> ${entry.correct}</p>
        ${entry.info ? `<a href="${entry.info}" target="info-button">🔗 More Info</a>` : ''}
      </div>

      
    `;
  });
});
