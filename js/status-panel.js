/**
 * OJAS Status & Activity Console Logger Component
 * Provides real-time live status feedback for every backend call,
 * map event, and user action across the platform.
 */

class StatusConsole {
  constructor(containerId = 'status-console-body') {
    this.containerId = containerId;
    this.container = null;
    this.logs = [];
    this.init();
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.warn(`[StatusConsole] Container #${this.containerId} not found initially.`);
    } else {
      this.log('OJAS Platform v1.0 initialized. Connected to System Log Stream.', 'INFO', 'SYSTEM');
    }
  }

  getTimestamp() {
    const d = new Date();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hrs}:${mins}:${secs}.${ms}`;
  }

  log(message, level = 'INFO', source = 'APP') {
    const timestamp = this.getTimestamp();
    const entry = { timestamp, message, level: level.toLowerCase(), source };
    this.logs.push(entry);

    console.log(`[${timestamp}] [${level}] [${source}] ${message}`);

    // If container isn't cached, attempt DOM lookup
    if (!this.container) {
      this.container = document.getElementById(this.containerId);
    }

    if (this.container) {
      const logEl = document.createElement('div');
      logEl.className = 'log-entry';
      logEl.innerHTML = `
        <span class="log-time">[${timestamp}]</span>
        <span class="log-level ${level.toLowerCase()}">[${level.toUpperCase()}]</span>
        <span class="log-msg"><strong style="color: #94A3B8;">[${source}]</strong> ${this.escapeHtml(message)}</span>
      `;
      this.container.appendChild(logEl);
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  clear() {
    this.logs = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Global Singleton Instance
window.StatusLog = new StatusConsole();

/**
 * Global logStatus helper function as required for OJAS workflow
 * @param {string} message - Status log message
 * @param {string} type - Log level type ('info', 'pending', 'success', 'error', 'warn', 'call')
 * @param {string} [source='ROOF'] - Category source tag
 */
function logStatus(message, type = 'info', source = 'ROOF') {
  if (window.StatusLog) {
    window.StatusLog.log(message, type.toUpperCase(), source);
  }
}

window.logStatus = logStatus;

// Re-bind when DOM Content Loaded in case container was mounted late
document.addEventListener('DOMContentLoaded', () => {
  if (!window.StatusLog.container) {
    window.StatusLog.init();
  }
});

