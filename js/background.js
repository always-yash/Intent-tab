const DISTRACTION_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'reddit.com',
  'www.reddit.com',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'twitter.com',
  'www.twitter.com',
  'facebook.com',
  'www.facebook.com'
];

// Inside your background service worker script
// Inside your background service worker script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "END_AND_SAVE_SESSION") {
        
        // 1. Fetch current session details using your real key: intentTabSession
        chrome.storage.local.get(['intentTabSession', 'intentTabHistory'], (result) => {
            const activeSession = result.intentTabSession;
            let history = result.intentTabHistory || [];

            if (activeSession) {
                const endedAt = Date.now();
                const durationSeconds = Math.floor((endedAt - activeSession.startTime) / 1000);

                // Build history item structure exactly how your app expects it
                history.unshift({
                    intent: activeSession.intent || 'Active Session',
                    category: activeSession.category || 'General',
                    startedAt: activeSession.startTime,
                    endedAt: endedAt,
                    durationSeconds: durationSeconds
                });
            }

            // 2. Commit to storage and turn off active session flag by clearing intentTabSession
            chrome.storage.local.set({ 
                intentTabHistory: history,
                intentTabSession: null  // Clears active session state
            }, () => {
                console.log("Background: Session saved. Total records:", history.length);
                sendResponse({ success: true });
            });
        });

        return true; // Keeps the message channel open for async response
    }
});

function isDistractionUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return DISTRACTION_HOSTS.some((host) => parsed.hostname.includes(host));
  } catch (error) {
    return false;
  }
}

function maybeNotifyTab(tab) {
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('file://')) {
    return;
  }

  chrome.storage.local.get(['intentTabSession'], (result) => {
    const session = result.intentTabSession;
    if (!session || !session.isActive) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    if (isDistractionUrl(tab.url)) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
      chrome.storage.local.set({ lastDistraction: { url: tab.url, time: Date.now() } });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    maybeNotifyTab(tab);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    maybeNotifyTab(tab);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
