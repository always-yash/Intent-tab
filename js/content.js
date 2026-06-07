let activeSession = null;
let hudElement = null;
let hudTimerId = null;

const STORAGE_KEY = 'intentTabSession';
const HUD_CONTAINER_ID = 'intent-tab-hud-root';

function createHudMarkup() {
  const container = document.createElement('div');
  container.id = HUD_CONTAINER_ID;
  container.className = 'intent-tab-floating-hud';
  container.innerHTML = `
    <div class="intent-tab-hud-container">
      <div class="intent-tab-hud-header">
        <h4 class="intent-tab-hud-title" id="hud-intent-title"></h4>
        <span class="intent-tab-hud-timer" id="hud-timer">00:00:00</span>
        <button class="intent-tab-hud-toggle" id="hud-toggle" aria-label="Toggle HUD">▼</button>
      </div>
      <input
        type="text"
        class="intent-tab-hud-subtask"
        id="hud-subtask-input"
        placeholder="Currently: type active step..."
        autocomplete="off"
      />
      <div class="intent-tab-hud-expanded" id="hud-expanded">
        <button class="intent-tab-hud-button" id="hud-stuck-btn">I'm Stuck</button>
        <button class="intent-tab-hud-button danger" id="hud-end-btn">End Session</button>
      </div>
    </div>
  `;
  return container;
}

function injectHud() {
  if (hudElement && document.body.contains(hudElement)) {
    return;
  }

  hudElement = createHudMarkup();
  document.body.appendChild(hudElement);

  const titleEl = document.getElementById('hud-intent-title');
  const timerEl = document.getElementById('hud-timer');
  const subtaskInput = document.getElementById('hud-subtask-input');
  const toggleBtn = document.getElementById('hud-toggle');
  const expandedPanel = document.getElementById('hud-expanded');
  const stuckBtn = document.getElementById('hud-stuck-btn');
  const endBtn = document.getElementById('hud-end-btn');

  if (activeSession) {
    titleEl.textContent = activeSession.intent || 'Active Session';
    updateHudTimer();
  }

  subtaskInput.addEventListener('change', () => {
    if (activeSession) {
      activeSession.currentStep = subtaskInput.value;
      chrome.storage.local.set({ [STORAGE_KEY]: activeSession });
    }
  });

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    expandedPanel.classList.toggle('active');
    toggleBtn.textContent = expandedPanel.classList.contains('active') ? '▲' : '▼';
  });

  stuckBtn.addEventListener('click', async () => {
    if (activeSession) {
      activeSession.markedAsStuck = true;
      chrome.storage.local.set({ [STORAGE_KEY]: activeSession });
      alert(`Marked as stuck on: ${activeSession.intent}\nConsider taking a break or breaking down your task.`);
    }
  });

  endBtn.addEventListener('click', async () => {
    const result = confirm(`End session: "${activeSession.intent}"?`);
    if (result) {
      const endedAt = Date.now();
      const durationSeconds = Math.floor((endedAt - activeSession.startTime) / 1000);
      
      const history = await new Promise((resolve) => {
        chrome.storage.local.get(['intentTabHistory'], (res) => {
          resolve(res.intentTabHistory || []);
        });
      });

      history.unshift({
        intent: activeSession.intent,
        category: activeSession.category,
        startedAt: activeSession.startTime,
        endedAt,
        durationSeconds
      });

      chrome.storage.local.set({
        [STORAGE_KEY]: null,
        intentTabHistory: history.slice(0, 10)
      });

      removeHud();
    }
  });
}

function removeHud() {
  if (hudElement && document.body.contains(hudElement)) {
    hudElement.remove();
    hudElement = null;
  }
  if (hudTimerId) {
    clearInterval(hudTimerId);
    hudTimerId = null;
  }
}

function updateHudTimer() {
  const timerEl = document.getElementById('hud-timer');
  if (!timerEl || !activeSession) {
    return;
  }

  const elapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${hours}:${minutes}:${seconds}`;
}

function startHudTimer() {
  if (hudTimerId) {
    clearInterval(hudTimerId);
  }
  hudTimerId = setInterval(updateHudTimer, 1000);
}

function monitorSession() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const session = result[STORAGE_KEY];

    if (session && session.isActive) {
      if (!activeSession || activeSession.startTime !== session.startTime) {
        activeSession = session;
        injectHud();
        startHudTimer();
      } else {
        activeSession = session;
        if (hudElement && document.body.contains(hudElement)) {
          const subtaskInput = document.getElementById('hud-subtask-input');
          if (subtaskInput && session.currentStep) {
            subtaskInput.value = session.currentStep;
          }
        }
      }
    } else {
      activeSession = null;
      removeHud();
    }
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    monitorSession();
  }
});

monitorSession();
