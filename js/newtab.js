const focusHub = document.querySelector('.focus-hub');
const sessionCard = document.getElementById('session-card');
const intentForm = document.getElementById('intent-form');
const intentInput = document.getElementById('intent-input');
const categoryInput = document.getElementById('category-input');
const categoryLine = document.querySelector('.category-line');
const submitIntentBtn = document.getElementById('submit-intent-btn');
const sessionIntent = document.getElementById('session-intent');
const sessionCategory = document.getElementById('session-category');
const sessionStart = document.getElementById('session-start');
const sessionTimer = document.getElementById('session-timer');
const stopButton = document.getElementById('stop-button');

let activeSession = null;
let timerId = null;
let categoryRevealed = false;

const hasText = (input) => input.value.trim().length > 0;
const toggleCategory = (show) => {
  categoryRevealed = show;
  categoryLine.classList.toggle('hidden', !show);
  categoryLine.classList.toggle('visible', show);
  updateIntentAccessibility();
};

async function refreshView() {
  activeSession = await IntentTabStorage.getSession();
  const sessionActive = Boolean(activeSession?.isActive);

  focusHub.classList.toggle('hidden', sessionActive);
  sessionCard.classList.toggle('hidden', !sessionActive);
  document.body.classList.toggle('session-is-active', sessionActive);

  if (sessionActive) {
    sessionIntent.textContent = IntentTabUtils.safeText(activeSession.intent);
    sessionCategory.textContent = IntentTabUtils.safeText(activeSession.category) || 'Intent';
    sessionStart.textContent = IntentTabUtils.getTimestamp(activeSession.startTime);
    updateTimer();
    startTimer();
  } else {
    stopTimer();
  }
}

function updateIntentAccessibility() {
  intentInput.classList.toggle('locked', categoryRevealed && !hasText(categoryInput));
}

function revealCategory() {
  if (!categoryRevealed) {
    toggleCategory(true);
  }
}

function resetForm() {
  toggleCategory(false);
  intentForm.reset();
  intentInput.focus();
}

function updateTimer() {
  if (!activeSession) {
    sessionTimer.textContent = '00:00:00';
    return;
  }

  const seconds = IntentTabFocus.elapsedSeconds(activeSession);
  sessionTimer.textContent = IntentTabFocus.formatDuration(seconds);
}

function startTimer() {
  if (timerId) {
    return;
  }

  timerId = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (!timerId) {
    return;
  }

  clearInterval(timerId);
  timerId = null;
}

async function submitIntent() {
  const intent = intentInput.value.trim();
  const category = categoryInput.value.trim();

  if (!intent) {
    intentInput.focus();
    return;
  }

  activeSession = {
    intent,
    category,
    startTime: Date.now(),
    isActive: true
  };

  await IntentTabStorage.saveSession(activeSession);
  refreshView();
}

intentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitIntent();
});

intentInput.addEventListener('input', () => {
  if (hasText(intentInput)) {
    revealCategory();
  } else {
    toggleCategory(false);
  }
});

intentInput.addEventListener('keydown', (event) => {
  if (!hasText(intentInput)) {
    return;
  }

  if (event.key === 'ArrowDown' || event.key === 'Enter') {
    event.preventDefault();
    revealCategory();
    categoryInput.focus();
  }
});

categoryInput.addEventListener('input', () => {
  updateIntentAccessibility();
});

categoryInput.addEventListener('keydown', async (event) => {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    intentInput.focus();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    await submitIntent();
  }
});

submitIntentBtn.addEventListener('click', async (event) => {
  event.preventDefault();
  await submitIntent();
});

stopButton.addEventListener('click', async () => {
  if (!activeSession) {
    return;
  }

  const endedAt = Date.now();
  await IntentTabStorage.appendHistory({
    intent: activeSession.intent,
    category: activeSession.category,
    startedAt: activeSession.startTime,
    endedAt,
    durationSeconds: Math.floor((endedAt - activeSession.startTime) / 1000)
  });

  await IntentTabStorage.clearSession();
  activeSession = null;
  resetForm();
  refreshView();
});

refreshView();

async function renderSessionHistory(showAll = false) {
  const historyList = document.getElementById('history-list');
  const history = await IntentTabStorage.getHistory();
  
  historyList.innerHTML = '';
  
  if (!history || history.length === 0) {
    return;
  }

  const itemsToShow = showAll ? history : history.slice(0, 8);
  
  itemsToShow.forEach((item) => {
    const li = document.createElement('li');
    const duration = IntentTabFocus.formatDuration(item.durationSeconds || 0);
    const intent = IntentTabUtils.safeText(item.intent).substring(0, showAll ? 30 : 20);
    li.textContent = `${intent} — ${duration}`;
    li.title = IntentTabUtils.safeText(item.intent);
    historyList.appendChild(li);
  });
}

function toggleHistoryCardExpand() {
  const card = document.getElementById('session-history-card');
  const isExpanded = card.classList.toggle('expanded');
  renderSessionHistory(isExpanded);
}

const historyTitle = document.getElementById('history-card-title');
if (historyTitle) {
  historyTitle.addEventListener('click', toggleHistoryCardExpand);
}

renderSessionHistory();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.intentTabHistory) {
    const card = document.getElementById('session-history-card');
    const isExpanded = card && card.classList.contains('expanded');
    renderSessionHistory(isExpanded);
  }
  if (changes.intentTabSession) {
    refreshView();
  }
});
