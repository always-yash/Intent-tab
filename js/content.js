let activeSession = null;
let hudElement = null;
let hudTimerId = null;

const STORAGE_KEY = 'intentTabSession';
const HUD_CONTAINER_ID = 'intent-tab-hud-root';

function injectHudStyles() {
  const styleId = 'intent-tab-hud-styles';
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .intent-tab-floating-hud * {
      all: revert;
    }
    .intent-tab-floating-hud {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 340px !important;
      z-index: 2147483647 !important;
      font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      pointer-events: auto !important;
      animation: intent-hud-slide-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    @keyframes intent-hud-slide-in {
      from {
        opacity: 0;
        transform: translateY(20px) translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0) translateX(0);
      }
    }
    .intent-tab-hud-container {
      background: rgba(0, 0, 0, 0.96) !important;
      border: 1.5px solid rgba(66, 133, 244, 0.4) !important;
      border-radius: 14px !important;
      padding: 14px !important;
      box-shadow: 0 8px 32px rgba(66, 133, 244, 0.15), 0 16px 48px rgba(0, 0, 0, 0.8) !important;
      color: #f8fafc !important;
      backdrop-filter: blur(10px) !important;
    }
    .intent-tab-hud-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-bottom: 10px !important;
      gap: 8px !important;
    }
    .intent-tab-hud-title {
      margin: 0 !important;
      font-size: 0.9rem !important;
      font-weight: 600 !important;
      color: #f8fafc !important;
      flex: 1 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }
    .intent-tab-hud-timer {
      font-size: 0.8rem !important;
      font-weight: 700 !important;
      color: rgba(96, 165, 250, 0.9) !important;
      font-variant-numeric: tabular-nums !important;
    }
    .intent-tab-hud-subtask {
      width: 100% !important;
      height: 32px !important;
      background: rgba(255, 255, 255, 0.04) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 8px !important;
      padding: 6px 10px !important;
      font-size: 0.8rem !important;
      color: #f8fafc !important;
      font-family: 'Urbanist', sans-serif !important;
      margin: 8px 0 !important;
      outline: none !important;
      transition: border-color 180ms ease, background 180ms ease !important;
    }
    .intent-tab-hud-subtask:focus {
      border-color: rgba(96, 165, 250, 0.4) !important;
      background: rgba(255, 255, 255, 0.06) !important;
    }
    .intent-tab-hud-expanded {
      display: none !important;
      gap: 6px !important;
      margin-top: 8px !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
      flex-direction: column !important;
    }
    .intent-tab-hud-expanded.active {
      display: flex !important;
    }
    .intent-tab-hud-button {
      padding: 8px 10px !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      background: rgba(255, 255, 255, 0.03) !important;
      color: rgba(255, 255, 255, 0.8) !important;
      border-radius: 8px !important;
      font-size: 0.75rem !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: background 180ms ease, border-color 180ms ease !important;
    }
    .intent-tab-hud-button:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(255, 255, 255, 0.18) !important;
    }
    .intent-tab-hud-button.danger {
      border-color: rgba(239, 68, 68, 0.25) !important;
      color: rgba(252, 165, 165, 0.95) !important;
    }
    .intent-tab-hud-button.danger:hover {
      background: rgba(239, 68, 68, 0.1) !important;
      border-color: rgba(239, 68, 68, 0.35) !important;
    }
    .intent-tab-hud-toggle {
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      color: rgba(255, 255, 255, 0.6) !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: color 180ms ease, transform 180ms ease !important;
    }
    .intent-tab-hud-toggle:hover {
      color: rgba(255, 255, 255, 0.9) !important;
      transform: scale(1.1) !important;
    }
  `;
  document.head.appendChild(style);
}

function createHudMarkup() {
  const container = document.createElement('div');
  container.id = HUD_CONTAINER_ID;
  container.className = 'intent-tab-floating-hud';
  container.innerHTML = `
    <div class="intent-tab-hud-container">
      <div class="intent-tab-hud-header">
        <h4 class="intent-tab-hud-title" id="hud-intent-title">Active Session</h4>
        <span class="intent-tab-hud-timer" id="hud-timer">00:00:00</span>
        <button class="intent-tab-hud-toggle" id="hud-toggle" aria-label="Toggle HUD">▼</button>
      </div>
      <input
        type="text"
        class="intent-tab-hud-subtask"
        id="hud-subtask-input"
        placeholder="Current step..."
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

  injectHudStyles();
  hudElement = createHudMarkup();
  document.body.appendChild(hudElement);
  
  setupHudEventListeners();
}

function setupHudEventListeners() {
  if (!hudElement) return;

  const titleEl = document.getElementById('hud-intent-title');
  const timerEl = document.getElementById('hud-timer');
  const subtaskInput = document.getElementById('hud-subtask-input');
  const toggleBtn = document.getElementById('hud-toggle');
  const expandedPanel = document.getElementById('hud-expanded');
  const stuckBtn = document.getElementById('hud-stuck-btn');
  const endBtn = document.getElementById('hud-end-btn');

  if (!titleEl || !toggleBtn) return;

  if (activeSession) {
    titleEl.textContent = (activeSession.intent || 'Active Session').substring(0, 25);
    if (subtaskInput && activeSession.currentStep) {
      subtaskInput.value = activeSession.currentStep;
    }
  }

  subtaskInput?.addEventListener('change', () => {
    if (activeSession && subtaskInput.value) {
      activeSession.currentStep = subtaskInput.value;
      chrome.storage.local.set({ [STORAGE_KEY]: activeSession });
    }
  });

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (expandedPanel) {
      expandedPanel.classList.toggle('active');
      toggleBtn.textContent = expandedPanel.classList.contains('active') ? '▲' : '▼';
    }
  });

  stuckBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeSession) {
      activeSession.markedAsStuck = true;
      chrome.storage.local.set({ [STORAGE_KEY]: activeSession });
    }
  });

  endBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeSession) {
      terminateSession();
    }
  });
}

async function terminateSession() {
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
        const titleEl = document.getElementById('hud-intent-title');
        if (titleEl && session.intent) {
          titleEl.textContent = session.intent.substring(0, 25);
        }
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
