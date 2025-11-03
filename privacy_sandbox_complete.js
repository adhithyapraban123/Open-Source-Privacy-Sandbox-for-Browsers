
/**
 * PrivacySandbox - Open Source Privacy Sandbox for Browsers
 * Version 1.0.0
 * 
 * An alternative to Google Privacy Sandbox with focus on:
 * - User transparency and control
 * - Granular permission management
 * - Decentralized consent
 * - Multi-layered tracking prevention
 * 
 * Architecture:
 * - SandboxManager: Orchestrates sandbox lifecycle
 * - APIMediator: Intercepts and filters API calls
 * - ConsentEngine: Manages user permissions
 * - TelemetryLogger: Records and audits access
 * - PolicyEngine: Enforces privacy policies
 */

// ============================================================================
// 1. TELEMETRY LOGGER - Records all access attempts for transparency
// ============================================================================

class TelemetryLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000;
    this.logStorage = this.initializeStorage();
  }

  initializeStorage() {
    // Use IndexedDB for persistent storage with user control
    try {
      const dbRequest = indexedDB.open('PrivacySandboxLogs', 1);

      dbRequest.onerror = () => console.error('Failed to open IndexedDB');

      dbRequest.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('auditLogs')) {
          const store = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('domain', 'domain', { unique: false });
        }
      };

      return dbRequest;
    } catch (e) {
      console.warn('IndexedDB not available, using in-memory storage');
      return null;
    }
  }

  log(event) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: event.type, // 'API_ACCESS', 'BLOCKED', 'ALLOWED', 'ERROR'
      domain: event.domain,
      api: event.api,
      details: event.details,
      status: event.status, // 'allowed' or 'blocked'
      userIP: null, // Never store user IP locally
      stackTrace: event.stackTrace || null
    };

    this.logs.push(logEntry);

    // Maintain size limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Persist to IndexedDB if available
    if (this.logStorage) {
      this.persistLog(logEntry);
    }

    return logEntry;
  }

  persistLog(logEntry) {
    const dbRequest = this.logStorage;
    dbRequest.onsuccess = (e) => {
      const db = e.target.result;
      const transaction = db.transaction(['auditLogs'], 'readwrite');
      const store = transaction.objectStore('auditLogs');
      store.add(logEntry);
    };
  }

  getLogs(filter = {}) {
    return this.logs.filter(log => {
      if (filter.domain && log.domain !== filter.domain) return false;
      if (filter.status && log.status !== filter.status) return false;
      if (filter.type && log.type !== filter.type) return false;
      if (filter.startTime && new Date(log.timestamp) < filter.startTime) return false;
      if (filter.endTime && new Date(log.timestamp) > filter.endTime) return false;
      return true;
    });
  }

  getStats() {
    const stats = {
      totalAccesses: this.logs.length,
      blocked: this.logs.filter(l => l.status === 'blocked').length,
      allowed: this.logs.filter(l => l.status === 'allowed').length,
      byDomain: {},
      byAPI: {}
    };

    this.logs.forEach(log => {
      stats.byDomain[log.domain] = (stats.byDomain[log.domain] || 0) + 1;
      stats.byAPI[log.api] = (stats.byAPI[log.api] || 0) + 1;
    });

    return stats;
  }

  clearLogs() {
    this.logs = [];
    // Also clear IndexedDB
    if (this.logStorage) {
      const dbRequest = this.logStorage;
      dbRequest.onsuccess = (e) => {
        const db = e.target.result;
        const transaction = db.transaction(['auditLogs'], 'readwrite');
        transaction.objectStore('auditLogs').clear();
      };
    }
  }

  exportLogs(format = 'json') {
    if (format === 'csv') {
      let csv = 'timestamp,domain,api,status,type,details\n';
      this.logs.forEach(log => {
        csv += `"${log.timestamp}","${log.domain}","${log.api}","${log.status}","${log.type}","${JSON.stringify(log.details)}\n`;
      });
      return csv;
    }
    return JSON.stringify(this.logs, null, 2);
  }
}

// ============================================================================
// 2. CONSENT ENGINE - User-controlled permission management
// ============================================================================

class ConsentEngine {
  constructor() {
    this.permissions = {};
    this.globalDefaults = {
      allowCookies: false,
      allowLocalStorage: false,
      allowIndexedDB: false,
      allowFingerprinting: false,
      allowWebGL: false,
      allowServiceWorker: false,
      allowWebRTC: false,
      allowPlugins: false
    };
    this.loadPermissions();
  }

  loadPermissions() {
    try {
      const stored = localStorage.getItem('privacySandboxPermissions');
      if (stored) {
        this.permissions = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not load stored permissions', e);
    }
  }

  savePermissions() {
    try {
      localStorage.setItem('privacySandboxPermissions', JSON.stringify(this.permissions));
    } catch (e) {
      console.error('Failed to save permissions', e);
    }
  }

  setDomainPermissions(domain, permissions) {
    this.permissions[domain] = {
      ...this.globalDefaults,
      ...permissions,
      domain: domain,
      grantedAt: new Date().toISOString()
    };
    this.savePermissions();
  }

  getDomainPermissions(domain) {
    if (this.permissions[domain]) {
      return this.permissions[domain];
    }
    // Return defaults for new domains
    return {
      ...this.globalDefaults,
      domain: domain
    };
  }

  checkPermission(domain, apiName) {
    const permissions = this.getDomainPermissions(domain);

    // Map API names to permission keys
    const apiToPermission = {
      'document.cookie': 'allowCookies',
      'localStorage': 'allowLocalStorage',
      'sessionStorage': 'allowLocalStorage',
      'indexedDB': 'allowIndexedDB',
      'canvas': 'allowFingerprinting',
      'webgl': 'allowWebGL',
      'canvas.toDataURL': 'allowFingerprinting',
      'canvas.getImageData': 'allowFingerprinting',
      'navigator.hardwareConcurrency': 'allowFingerprinting',
      'navigator.deviceMemory': 'allowFingerprinting',
      'screen.colorDepth': 'allowFingerprinting',
      'HTMLCanvasElement.getContext': 'allowWebGL',
      'navigator.plugins': 'allowPlugins',
      'RTCPeerConnection': 'allowWebRTC',
      'ServiceWorker': 'allowServiceWorker'
    };

    const requiredPermission = apiToPermission[apiName] || 'allowCookies';
    return permissions[requiredPermission] === true;
  }

  requestPermission(domain, apiName, reason = '') {
    // In production, this would show a user prompt
    console.log(`Permission requested: ${domain} wants ${apiName}. Reason: ${reason}`);
    return false; // Deny by default
  }

  grantPermission(domain, apiName) {
    const perms = this.getDomainPermissions(domain);
    const apiToPermission = {
      'document.cookie': 'allowCookies',
      'localStorage': 'allowLocalStorage',
      'canvas': 'allowFingerprinting',
      // ... more mappings
    };
    const permKey = apiToPermission[apiName] || 'allowCookies';
    perms[permKey] = true;
    this.setDomainPermissions(domain, perms);
  }

  revokePermission(domain, apiName) {
    const perms = this.getDomainPermissions(domain);
    const apiToPermission = {
      'document.cookie': 'allowCookies',
      'localStorage': 'allowLocalStorage',
      'canvas': 'allowFingerprinting',
      // ... more mappings
    };
    const permKey = apiToPermission[apiName] || 'allowCookies';
    perms[permKey] = false;
    this.setDomainPermissions(domain, perms);
  }

  revokeAllPermissions(domain) {
    this.setDomainPermissions(domain, this.globalDefaults);
  }

  getAllPermissions() {
    return this.permissions;
  }
}

// ============================================================================
// 3. API MEDIATOR - Intercepts and filters browser API calls
// ============================================================================

class APIMediator {
  constructor(consentEngine, telemetryLogger) {
    this.consent = consentEngine;
    this.telemetry = telemetryLogger;
    this.currentDomain = this.extractDomain();
    this.interceptedAPIs = new Map();
  }

  extractDomain() {
    return window.location.hostname || 'unknown';
  }

  intercept(targetObject, property, apiName) {
    const self = this;
    const originalValue = targetObject[property];

    if (typeof originalValue === 'object' && originalValue !== null) {
      return this.interceptObject(targetObject, property, apiName);
    } else if (typeof originalValue === 'function') {
      return this.interceptFunction(targetObject, property, apiName);
    }
  }

  interceptFunction(targetObject, property, apiName) {
    const self = this;
    const originalFunction = targetObject[property];

    const interceptedFunction = function(...args) {
      const hasPermission = self.consent.checkPermission(self.currentDomain, apiName);

      self.telemetry.log({
        type: 'API_ACCESS',
        domain: self.currentDomain,
        api: apiName,
        status: hasPermission ? 'allowed' : 'blocked',
        details: {
          args: self.sanitizeArgs(args),
          callStack: self.getCallStack()
        }
      });

      if (!hasPermission) {
        console.warn(`Privacy Sandbox: Access to ${apiName} blocked. Domain: ${self.currentDomain}`);
        return self.getDefaultValue(apiName);
      }

      try {
        return originalFunction.apply(this, args);
      } catch (error) {
        self.telemetry.log({
          type: 'ERROR',
          domain: self.currentDomain,
          api: apiName,
          status: 'error',
          details: { error: error.message }
        });
        throw error;
      }
    };

    // Preserve function properties
    Object.defineProperty(interceptedFunction, 'name', { value: property });
    Object.defineProperty(interceptedFunction, 'length', { value: originalFunction.length });

    return interceptedFunction;
  }

  interceptObject(targetObject, property, apiName) {
    const self = this;
    const originalObject = targetObject[property];

    const handler = {
      get: function(target, prop) {
        const fullApiName = `${apiName}.${String(prop)}`;
        const hasPermission = self.consent.checkPermission(self.currentDomain, fullApiName);

        self.telemetry.log({
          type: 'API_ACCESS',
          domain: self.currentDomain,
          api: fullApiName,
          status: hasPermission ? 'allowed' : 'blocked',
          details: { property: prop }
        });

        if (!hasPermission) {
          console.warn(`Privacy Sandbox: Access to ${fullApiName} blocked`);
          return undefined;
        }

        return Reflect.get(target, prop);
      },

      set: function(target, prop, value) {
        const fullApiName = `${apiName}.${String(prop)}`;
        const hasPermission = self.consent.checkPermission(self.currentDomain, fullApiName);

        self.telemetry.log({
          type: 'API_ACCESS',
          domain: self.currentDomain,
          api: fullApiName,
          status: hasPermission ? 'allowed' : 'blocked',
          details: { property: prop, newValue: self.sanitizeValue(value) }
        });

        if (!hasPermission) {
          console.warn(`Privacy Sandbox: Write to ${fullApiName} blocked`);
          return false;
        }

        return Reflect.set(target, prop, value);
      }
    };

    return new Proxy(originalObject, handler);
  }

  enableCookieBlocking() {
    const self = this;

    Object.defineProperty(document, 'cookie', {
      get: function() {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'document.cookie');
        self.telemetry.log({
          type: 'COOKIE_READ',
          domain: self.currentDomain,
          api: 'document.cookie',
          status: hasPermission ? 'allowed' : 'blocked'
        });

        if (!hasPermission) {
          console.warn('Privacy Sandbox: Cookie read blocked');
          return '';
        }

        return document.__cookies__ || '';
      },

      set: function(value) {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'document.cookie');
        self.telemetry.log({
          type: 'COOKIE_WRITE',
          domain: self.currentDomain,
          api: 'document.cookie',
          status: hasPermission ? 'allowed' : 'blocked'
        });

        if (!hasPermission) {
          console.warn('Privacy Sandbox: Cookie write blocked');
          return;
        }

        document.__cookies__ = value;
      }
    });
  }

  enableStorageBlocking() {
    const self = this;

    // Block localStorage
    const localStorageHandler = {
      getItem: (key) => {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'localStorage');
        self.telemetry.log({
          type: 'STORAGE_READ',
          domain: self.currentDomain,
          api: 'localStorage.getItem',
          status: hasPermission ? 'allowed' : 'blocked'
        });
        return hasPermission ? (window.__localStorage__?.[key] || null) : null;
      },

      setItem: (key, value) => {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'localStorage');
        self.telemetry.log({
          type: 'STORAGE_WRITE',
          domain: self.currentDomain,
          api: 'localStorage.setItem',
          status: hasPermission ? 'allowed' : 'blocked'
        });
        if (hasPermission) {
          if (!window.__localStorage__) window.__localStorage__ = {};
          window.__localStorage__[key] = value;
        }
      },

      removeItem: (key) => {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'localStorage');
        if (hasPermission && window.__localStorage__) {
          delete window.__localStorage__[key];
        }
      },

      clear: () => {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'localStorage');
        if (hasPermission) {
          window.__localStorage__ = {};
        }
      },

      key: (index) => {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'localStorage');
        if (!hasPermission) return null;
        const keys = Object.keys(window.__localStorage__ || {});
        return keys[index] || null;
      },

      get length() {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'localStorage');
        return hasPermission ? Object.keys(window.__localStorage__ || {}).length : 0;
      }
    };

    Object.defineProperty(window, 'localStorage', {
      get: () => localStorageHandler,
      set: () => {} // Prevent reassignment
    });
  }

  enableFingerprintingMitigation() {
    const self = this;

    // Canvas fingerprinting prevention
    const OriginalCanvasGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
      const hasPermission = self.consent.checkPermission(self.currentDomain, 'canvas.getContext');

      self.telemetry.log({
        type: 'FINGERPRINTING_ATTEMPT',
        domain: self.currentDomain,
        api: 'canvas.getContext',
        status: hasPermission ? 'allowed' : 'blocked',
        details: { contextType }
      });

      if (!hasPermission) {
        // Return a sandboxed canvas context that randomizes fingerprinting data
        return self.createSandboxedCanvasContext(contextType);
      }

      return OriginalCanvasGetContext.apply(this, [contextType, ...args]);
    };

    // toDataURL fingerprinting prevention
    const OriginalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, ...args) {
      const hasPermission = self.consent.checkPermission(self.currentDomain, 'canvas.toDataURL');

      self.telemetry.log({
        type: 'FINGERPRINTING_ATTEMPT',
        domain: self.currentDomain,
        api: 'canvas.toDataURL',
        status: hasPermission ? 'allowed' : 'blocked'
      });

      if (!hasPermission) {
        return 'data:image/png;base64,' + self.generateFakeImageData();
      }

      return OriginalToDataURL.apply(this, [type, ...args]);
    };

    // Navigator hardwareConcurrency randomization
    const originalNavigator = window.navigator;
    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      get: () => {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'navigator.hardwareConcurrency');
        if (!hasPermission) {
          return Math.floor(Math.random() * 4) + 1;
        }
        return navigator.__hardwareConcurrency__ || 4;
      }
    });

    // Screen resolution randomization
    const originalScreen = window.screen;
    Object.defineProperty(window, 'screen', {
      get: () => {
        const hasPermission = self.consent.checkPermission(self.currentDomain, 'screen');
        if (!hasPermission) {
          return {
            width: [1920, 1366, 1024][Math.floor(Math.random() * 3)],
            height: [1080, 768, 768][Math.floor(Math.random() * 3)],
            colorDepth: 24,
            pixelDepth: 24
          };
        }
        return originalScreen;
      }
    });
  }

  createSandboxedCanvasContext(contextType) {
    // Create a fake canvas context that prevents fingerprinting
    // while maintaining basic functionality
    const fakeContext = {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {}
    };
    return fakeContext;
  }

  generateFakeImageData() {
    // Generate fake but consistent image data
    const randomBytes = new Uint8Array(100);
    crypto.getRandomValues(randomBytes);
    return btoa(String.fromCharCode.apply(null, randomBytes)).slice(0, 50);
  }

  enableWebRTCBlocking() {
    const self = this;

    const OriginalRTCPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function(...args) {
      const hasPermission = self.consent.checkPermission(self.currentDomain, 'RTCPeerConnection');

      self.telemetry.log({
        type: 'WEBRTC_ACCESS',
        domain: self.currentDomain,
        api: 'RTCPeerConnection',
        status: hasPermission ? 'allowed' : 'blocked'
      });

      if (!hasPermission) {
        throw new Error('WebRTC blocked by Privacy Sandbox');
      }

      return new OriginalRTCPeerConnection(...args);
    };
  }

  sanitizeArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'string' && arg.length > 100) {
        return arg.slice(0, 100) + '...';
      }
      return typeof arg === 'object' ? '[Object]' : arg;
    });
  }

  sanitizeValue(value) {
    if (typeof value === 'string' && value.length > 100) {
      return value.slice(0, 100) + '...';
    }
    return typeof value === 'object' ? '[Object]' : value;
  }

  getCallStack() {
    try {
      const stack = new Error().stack;
      return stack.split('\n').slice(2, 5).join(' ');
    } catch (e) {
      return 'Unknown';
    }
  }

  getDefaultValue(apiName) {
    const defaults = {
      'document.cookie': '',
      'localStorage': {},
      'indexedDB': null,
      'navigator.plugins': []
    };
    return defaults[apiName] || null;
  }
}

// ============================================================================
// 4. POLICY ENGINE - Manages privacy policies and regulatory compliance
// ============================================================================

class PolicyEngine {
  constructor() {
    this.policies = {};
    this.globalPolicy = this.createDefaultPolicy();
    this.loadPolicies();
  }

  createDefaultPolicy() {
    return {
      name: 'Default Privacy Policy',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      rules: [
        {
          name: 'GDPR Compliance',
          regulation: 'GDPR',
          requirement: 'Explicit consent required for any data processing',
          enabled: true
        },
        {
          name: 'CCPA Right to Opt-Out',
          regulation: 'CCPA',
          requirement: 'Users must be able to opt-out of data sales',
          enabled: true
        },
        {
          name: 'No Tracking Without Consent',
          regulation: 'General',
          requirement: 'No cookies or fingerprinting without user permission',
          enabled: true
        }
      ]
    };
  }

  loadPolicies() {
    try {
      const stored = localStorage.getItem('privacyPolicies');
      if (stored) {
        this.policies = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not load stored policies', e);
    }
  }

  savePolicies() {
    try {
      localStorage.setItem('privacyPolicies', JSON.stringify(this.policies));
    } catch (e) {
      console.error('Failed to save policies', e);
    }
  }

  createDomainPolicy(domain, customRules = []) {
    this.policies[domain] = {
      name: `Policy for ${domain}`,
      domain: domain,
      createdAt: new Date().toISOString(),
      rules: [...this.globalPolicy.rules, ...customRules]
    };
    this.savePolicies();
    return this.policies[domain];
  }

  getPolicyCompliance(domain, action) {
    const policy = this.policies[domain] || this.globalPolicy;

    // Check if action complies with policies
    const violations = [];

    policy.rules.forEach(rule => {
      if (rule.enabled) {
        // Implement rule checking logic
        if (rule.regulation === 'GDPR' && action.requiresConsent && !action.consentGiven) {
          violations.push(`GDPR: Explicit consent required for ${action.type}`);
        }
        if (rule.regulation === 'CCPA' && action.type === 'dataSale' && !action.optOutAllowed) {
          violations.push('CCPA: Users must be able to opt-out of data sales');
        }
      }
    });

    return {
      compliant: violations.length === 0,
      violations: violations,
      policy: policy
    };
  }

  auditCompliance(domain, logs) {
    const issues = [];

    logs.forEach(log => {
      if (log.status === 'allowed' && log.api.includes('fingerprint')) {
        issues.push({
          severity: 'HIGH',
          message: `Fingerprinting allowed on ${domain}`,
          timestamp: log.timestamp
        });
      }
      if (log.status === 'allowed' && log.api.includes('cookie')) {
        issues.push({
          severity: 'MEDIUM',
          message: `Cookies allowed on ${domain}`,
          timestamp: log.timestamp
        });
      }
    });

    return {
      domain: domain,
      totalIssues: issues.length,
      issues: issues,
      complianceScore: 100 - (issues.length * 5) // Simple scoring
    };
  }
}

// ============================================================================
// 5. SANDBOX MANAGER - Orchestrates all components
// ============================================================================

class SandboxManager {
  constructor(config = {}) {
    this.config = config;
    this.telemetry = new TelemetryLogger();
    this.consent = new ConsentEngine();
    this.mediator = new APIMediator(this.consent, this.telemetry);
    this.policy = new PolicyEngine();
    this.sandboxes = new Map();

    this.initialize();
  }

  initialize() {
    console.log('Privacy Sandbox initializing...');

    // Enable all protections
    this.mediator.enableCookieBlocking();
    this.mediator.enableStorageBlocking();
    this.mediator.enableFingerprintingMitigation();
    this.mediator.enableWebRTCBlocking();

    // Initialize dashboard
    this.initializeDashboard();

    console.log('Privacy Sandbox initialized successfully');
  }

  createSandbox(domain, options = {}) {
    const sandboxId = this.generateId();
    const sandbox = {
      id: sandboxId,
      domain: domain,
      createdAt: new Date().toISOString(),
      iframe: null,
      permissions: options.permissions || {},
      status: 'created'
    };

    // Set default permissions
    if (Object.keys(sandbox.permissions).length === 0) {
      sandbox.permissions = this.consent.globalDefaults;
    }

    this.sandboxes.set(sandboxId, sandbox);
    this.consent.setDomainPermissions(domain, sandbox.permissions);

    return sandboxId;
  }

  destroySandbox(sandboxId) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox && sandbox.iframe) {
      sandbox.iframe.remove();
    }
    this.sandboxes.delete(sandboxId);
  }

  getSandbox(sandboxId) {
    return this.sandboxes.get(sandboxId);
  }

  updateSandboxPermissions(sandboxId, permissions) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.permissions = { ...sandbox.permissions, ...permissions };
      this.consent.setDomainPermissions(sandbox.domain, sandbox.permissions);
    }
  }

  getDashboardData() {
    const stats = this.telemetry.getStats();
    const permissions = this.consent.getAllPermissions();

    return {
      summary: {
        totalRequests: stats.totalAccesses,
        blocked: stats.blocked,
        allowed: stats.allowed,
        blockRate: ((stats.blocked / stats.totalAccesses) * 100).toFixed(2) + '%'
      },
      byDomain: stats.byDomain,
      byAPI: stats.byAPI,
      permissions: permissions,
      sandboxes: Array.from(this.sandboxes.values())
    };
  }

  initializeDashboard() {
    // Expose dashboard methods globally
    window.PrivacySandboxDashboard = {
      getStatus: () => this.getDashboardData(),
      getLogs: (filter) => this.telemetry.getLogs(filter),
      getStats: () => this.telemetry.getStats(),
      clearLogs: () => this.telemetry.clearLogs(),
      exportLogs: (format) => this.telemetry.exportLogs(format),
      setDomainPermissions: (domain, perms) => this.consent.setDomainPermissions(domain, perms),
      revokeAllPermissions: (domain) => this.consent.revokeAllPermissions(domain),
      auditCompliance: (domain) => this.policy.auditCompliance(domain, this.telemetry.getLogs({ domain }))
    };
  }

  generateId() {
    return 'sandbox_' + Math.random().toString(36).substr(2, 9);
  }
}

// ============================================================================
// 6. INITIALIZATION AND USAGE
// ============================================================================

// Initialize Privacy Sandbox when page loads
let privacySandbox;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    privacySandbox = new SandboxManager({
      enableLogging: true,
      enableDashboard: true
    });
  });
} else {
  privacySandbox = new SandboxManager({
    enableLogging: true,
    enableDashboard: true
  });
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SandboxManager,
    APIMediator,
    ConsentEngine,
    TelemetryLogger,
    PolicyEngine
  };
}

// Global API
window.PrivacySandbox = {
  getManager: () => privacySandbox,
  createSandbox: (domain, options) => privacySandbox.createSandbox(domain, options),
  destroySandbox: (id) => privacySandbox.destroySandbox(id),
  setPermissions: (domain, perms) => privacySandbox.consent.setDomainPermissions(domain, perms),
  getLogs: (filter) => privacySandbox.telemetry.getLogs(filter),
  getStatus: () => privacySandbox.getDashboardData()
};
