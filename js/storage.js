const IntentTabStorage = {
  sessionKey: 'intentTabSession',
  historyKey: 'intentTabHistory',

  get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  },

  set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  async getSession() {
    return (await this.get(this.sessionKey)) || null;
  },

  async saveSession(session) {
    await this.set(this.sessionKey, session);
  },

  async clearSession() {
    await this.set(this.sessionKey, null);
  },

  async getHistory() {
    return (await this.get(this.historyKey)) || [];
  },

  async appendHistory(item) {
    const history = await this.getHistory();
    history.unshift(item);
    // Preserve full history array safely without hard caps or truncation
    await this.set(this.historyKey, history);
  }
};