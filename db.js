/**
 * xer's store - Unified Local Database Engine v3.0
 * Includes:
 * - Dynamic Categories Management
 * - Digital Assets / Source Code / Courses / Formats / Pricing
 * - Xer Verified System (Red Tick Badge & Waiting List Approvals)
 * - xerconsole Developer Submissions
 * - Screenshots Gallery
 * - 3 Themes: Dark Blue, Gradient Dark Grey, Clean Light
 * - Client-Side Anti-Tamper & State Integrity Protection
 */
(function(window) {
  'use strict';

  const STORAGE_KEYS = {
    ITEMS: 'xers_store_items_v3',
    USERS: 'xers_store_users_v3',
    CATEGORIES: 'xers_store_categories_v3',
    VERIFICATION_REQUESTS: 'xers_store_verifications_v3',
    SESSION: 'xers_store_session_v3',
    THEME: 'xers_store_theme_preference_v3',
    INTEGRITY: 'xers_store_integrity_sig'
  };

  const DEFAULT_CATEGORIES = ['Apps', 'Games', 'Windows Softwares', 'Source Codes', 'Courses'];

  // Tamper detection salt
  const INTEGRITY_SALT = 'xer_sec_v3_994182_salt';

  function generateSignature(data) {
    const str = JSON.stringify(data) + INTEGRITY_SALT;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'sig_' + Math.abs(hash);
  }

  function verifyIntegrity() {
    try {
      const savedSig = localStorage.getItem(STORAGE_KEYS.INTEGRITY);
      if (!savedSig) return true;
      const users = localStorage.getItem(STORAGE_KEYS.USERS) || '[]';
      const expected = generateSignature(users);
      return savedSig === expected;
    } catch (e) {
      return true;
    }
  }

  function saveUsersWithIntegrity(users) {
    const raw = JSON.stringify(users);
    localStorage.setItem(STORAGE_KEYS.USERS, raw);
    localStorage.setItem(STORAGE_KEYS.INTEGRITY, generateSignature(raw));
  }

  // Initialize Users
  function initializeUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!raw) {
        const defaultAdmin = [{
          id: 'usr_admin_default',
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          isXerVerified: true,
          verifiedTitle: 'xer Founder & Administrator',
          createdAt: Date.now()
        }];
        saveUsersWithIntegrity(defaultAdmin);
        return defaultAdmin;
      }

      // Anti-Tamper Verification
      if (!verifyIntegrity()) {
        console.warn('Security Alert: Database integrity check failed. Client modification detected & revoked.');
        try {
          const parsed = JSON.parse(raw);
          const sanitized = parsed.map(u => {
            if (u.role !== 'admin') {
              return { ...u, isXerVerified: false, verifiedTitle: '' };
            }
            return u;
          });
          saveUsersWithIntegrity(sanitized);
          return sanitized;
        } catch (err) {
          return [];
        }
      }

      return JSON.parse(raw);
    } catch (e) {
      console.error('Error initializing users:', e);
      return [];
    }
  }

  // Initialize Categories
  function initializeCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
        return DEFAULT_CATEGORIES;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  }

  // Initialize Items (Strictly ZERO mock/demo items seeded)
  function initializeItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
        return [];
      }
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  // Initialize Verification Requests
  function initializeVerificationRequests() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VERIFICATION_REQUESTS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.VERIFICATION_REQUESTS, JSON.stringify([]));
        return [];
      }
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  // Session
  function getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Synchronize latest user state
      const users = initializeUsers();
      const freshUser = users.find(u => u.id === session.id);
      if (freshUser) {
        return {
          id: freshUser.id,
          username: freshUser.username,
          role: freshUser.role,
          isXerVerified: !!freshUser.isXerVerified,
          verifiedTitle: freshUser.verifiedTitle || '',
          loggedInAt: session.loggedInAt || Date.now()
        };
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } else {
      const sessionData = {
        id: user.id,
        username: user.username,
        role: user.role,
        isXerVerified: !!user.isXerVerified,
        verifiedTitle: user.verifiedTitle || '',
        loggedInAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
    }
    notifySubscribers('session_changed');
  }

  // Event Broadcasting
  const listeners = [];
  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function notifySubscribers(eventType, data) {
    listeners.forEach(fn => {
      try { fn(eventType, data); } catch (err) { console.error(err); }
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.ITEMS) notifySubscribers('items_changed');
    if (e.key === STORAGE_KEYS.USERS) notifySubscribers('users_changed');
    if (e.key === STORAGE_KEYS.CATEGORIES) notifySubscribers('categories_changed');
    if (e.key === STORAGE_KEYS.VERIFICATION_REQUESTS) notifySubscribers('verifications_changed');
    if (e.key === STORAGE_KEYS.SESSION) notifySubscribers('session_changed');
    if (e.key === STORAGE_KEYS.THEME) notifySubscribers('theme_changed');
  });

  // DB API
  const StoreDB = {
    // --- CATEGORIES MANAGEMENT ---
    getCategories() {
      return initializeCategories();
    },

    addCategory(name) {
      const clean = (name || '').trim();
      if (!clean) return { success: false, message: 'Category name cannot be empty' };
      const categories = this.getCategories();
      if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
        return { success: false, message: 'Category already exists' };
      }
      categories.push(clean);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      notifySubscribers('categories_changed', categories);
      return { success: true, categories };
    },

    deleteCategory(name) {
      const clean = (name || '').trim().toLowerCase();
      let categories = this.getCategories();
      if (categories.length <= 1) {
        return { success: false, message: 'At least one category must remain' };
      }
      const initialLen = categories.length;
      categories = categories.filter(c => c.toLowerCase() !== clean);
      if (categories.length === initialLen) {
        return { success: false, message: 'Category not found' };
      }
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      notifySubscribers('categories_changed', categories);
      return { success: true, categories };
    },

    // --- USERS & AUTHENTICATION ---
    getUsers() {
      return initializeUsers();
    },

    findUserByUsername(username) {
      const users = this.getUsers();
      return users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
    },

    addUser({ username, password, role = 'user', isXerVerified = false, verifiedTitle = '' }) {
      const cleanUser = (username || '').trim();
      const cleanPass = (password || '').trim();
      if (!cleanUser || !cleanPass) {
        return { success: false, message: 'Username and password are required' };
      }
      if (cleanUser.length < 3) {
        return { success: false, message: 'Username must be at least 3 characters' };
      }
      if (cleanPass.length < 4) {
        return { success: false, message: 'Password must be at least 4 characters' };
      }

      const users = this.getUsers();
      if (users.some(u => u.username.toLowerCase() === cleanUser.toLowerCase())) {
        return { success: false, message: 'Username already taken' };
      }

      const newUser = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        username: cleanUser,
        password: cleanPass,
        role: role === 'admin' ? 'admin' : 'user',
        isXerVerified: !!isXerVerified,
        verifiedTitle: (verifiedTitle || '').trim(),
        createdAt: Date.now()
      };

      users.push(newUser);
      saveUsersWithIntegrity(users);
      notifySubscribers('users_changed', newUser);
      return { success: true, user: newUser };
    },

    deleteUser(id) {
      let users = this.getUsers();
      const current = this.getCurrentUser();
      if (current && current.id === id) {
        return { success: false, message: 'Cannot delete current logged-in user account' };
      }
      const initialLen = users.length;
      users = users.filter(u => u.id !== id);
      if (users.length === initialLen) {
        return { success: false, message: 'User not found' };
      }
      saveUsersWithIntegrity(users);
      notifySubscribers('users_changed');
      return { success: true };
    },

    updateUserRole(id, role) {
      const users = this.getUsers();
      const user = users.find(u => u.id === id);
      if (!user) return { success: false, message: 'User not found' };
      user.role = role === 'admin' ? 'admin' : 'user';
      saveUsersWithIntegrity(users);
      
      const current = this.getCurrentUser();
      if (current && current.id === id) {
        current.role = user.role;
        setSession(current);
      }
      notifySubscribers('users_changed');
      return { success: true, user };
    },

    setXerVerifiedBadge(userId, isVerified, title = '') {
      const users = this.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user) return { success: false, message: 'User not found' };
      user.isXerVerified = !!isVerified;
      if (title !== undefined) user.verifiedTitle = title.trim();
      saveUsersWithIntegrity(users);

      const current = this.getCurrentUser();
      if (current && current.id === userId) {
        current.isXerVerified = user.isXerVerified;
        current.verifiedTitle = user.verifiedTitle;
        setSession(current);
      }
      notifySubscribers('users_changed');
      return { success: true, user };
    },

    login(username, password) {
      const cleanUser = (username || '').trim();
      const cleanPass = (password || '').trim();
      const user = this.findUserByUsername(cleanUser);
      if (!user || user.password !== cleanPass) {
        return { success: false, message: 'Invalid username or password' };
      }
      setSession(user);
      return { success: true, user };
    },

    register(username, password) {
      const result = this.addUser({ username, password, role: 'user' });
      if (result.success) {
        setSession(result.user);
      }
      return result;
    },

    logout() {
      setSession(null);
      return { success: true };
    },

    getCurrentUser() {
      return getSession();
    },

    isAdmin() {
      const current = this.getCurrentUser();
      return !!(current && current.role === 'admin');
    },

    isVerifiedDeveloper() {
      if (!verifyIntegrity()) {
        console.warn('Security Alert: Database integrity mismatch. Developer console blocked.');
        return false;
      }
      const current = this.getCurrentUser();
      return !!(current && (current.isXerVerified || current.role === 'admin'));
    },

    // --- XER VERIFIED APPLICATION & WAITING LIST ---
    getVerificationRequests() {
      return initializeVerificationRequests();
    },

    getUserVerificationStatus(userId) {
      const requests = this.getVerificationRequests();
      const req = requests.find(r => r.userId === userId && r.status === 'pending');
      if (req) return { status: 'pending', request: req };
      const users = this.getUsers();
      const u = users.find(user => user.id === userId);
      if (u && u.isXerVerified) return { status: 'verified', user: u };
      return { status: 'unverified' };
    },

    applyForXerVerified({ userId, username, developerName, reason, portfolioUrl }) {
      if (!userId || !username) {
        return { success: false, message: 'User authentication required' };
      }
      const existingStatus = this.getUserVerificationStatus(userId);
      if (existingStatus.status === 'verified') {
        return { success: false, message: 'Your account is already xer verified!' };
      }
      if (existingStatus.status === 'pending') {
        return { success: false, message: 'Application is already pending in Waiting List' };
      }

      const requests = this.getVerificationRequests();
      const newReq = {
        id: 'vreq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        username,
        developerName: (developerName || username).trim(),
        reason: (reason || 'Developer / Publisher on xer\'s store').trim(),
        portfolioUrl: (portfolioUrl || '').trim(),
        status: 'pending',
        appliedAt: Date.now()
      };

      requests.unshift(newReq);
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_REQUESTS, JSON.stringify(requests));
      notifySubscribers('verifications_changed');
      return { success: true, request: newReq };
    },

    approveVerification(requestId, customTitle = 'xer Verified Creator') {
      const requests = this.getVerificationRequests();
      const req = requests.find(r => r.id === requestId);
      if (!req) return { success: false, message: 'Verification request not found' };

      req.status = 'approved';
      req.approvedAt = Date.now();
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_REQUESTS, JSON.stringify(requests));

      // Award the red badge
      this.setXerVerifiedBadge(req.userId, true, customTitle);
      notifySubscribers('verifications_changed');
      return { success: true };
    },

    rejectVerification(requestId) {
      let requests = this.getVerificationRequests();
      const req = requests.find(r => r.id === requestId);
      if (!req) return { success: false, message: 'Request not found' };
      req.status = 'rejected';
      req.rejectedAt = Date.now();
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_REQUESTS, JSON.stringify(requests));
      notifySubscribers('verifications_changed');
      return { success: true };
    },

    // --- SOFTWARE & ASSETS CATALOG METHODS ---
    getItems() {
      return initializeItems();
    },

    getItem(id) {
      const items = this.getItems();
      return items.find(i => String(i.id) === String(id)) || null;
    },

    addItem(data) {
      const {
        title,
        category,
        description,
        tags,
        downloadUrl,
        mirrors = [],
        version = '',
        changelog = '',
        developer = '',
        size = '',
        architecture = 'Windows x64',
        moreDetails = '',
        iconUrl = '',
        screenshots = [],
        pricingType = 'free',
        price = 'Free',
        assetFormat = 'Direct Executable (.exe)',
        isPublisherVerified = false
      } = data;

      if (!title || !title.trim()) return { success: false, message: 'Name is required' };
      if (!category) return { success: false, message: 'Category is required' };
      if (!description || !description.trim()) return { success: false, message: 'Description is required' };
      if (!downloadUrl || !downloadUrl.trim()) return { success: false, message: 'Primary download/access link is required' };

      const processedTags = Array.isArray(tags) 
        ? tags.map(t => String(t).trim()).filter(Boolean)
        : String(tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

      const validMirrors = Array.isArray(mirrors) 
        ? mirrors.filter(m => m && m.url && m.url.trim())
        : [];

      const validScreenshots = Array.isArray(screenshots)
        ? screenshots.filter(s => s && s.trim())
        : [];

      // Check current user's verified status
      const currentUser = this.getCurrentUser();
      const hasVerifiedBadge = isPublisherVerified || (currentUser && (currentUser.isXerVerified || currentUser.role === 'admin'));

      const newItem = {
        id: 'pkg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title: title.trim(),
        category: category.trim(),
        iconUrl: (iconUrl || '').trim(),
        screenshots: validScreenshots,
        pricingType: pricingType === 'paid' ? 'paid' : 'free',
        price: pricingType === 'paid' ? (price || '₹299').trim() : 'Free',
        assetFormat: assetFormat.trim() || 'Direct Executable (.exe)',
        isPublisherVerified: !!hasVerifiedBadge,
        description: description.trim(),
        tags: processedTags,
        downloadUrl: downloadUrl.trim(),
        mirrors: validMirrors,
        version: version.trim() || '1.0.0',
        changelog: changelog.trim(),
        developer: developer.trim() || (currentUser ? currentUser.username : 'Independent Developer'),
        size: size.trim() || 'Direct Link',
        architecture: architecture.trim() || 'Windows x64',
        moreDetails: moreDetails.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const items = this.getItems();
      items.unshift(newItem);
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      notifySubscribers('items_changed', newItem);
      return { success: true, item: newItem };
    },

    updateItem(id, data) {
      const items = this.getItems();
      const index = items.findIndex(i => String(i.id) === String(id));
      if (index === -1) return { success: false, message: 'Item not found' };

      const existing = items[index];

      let processedTags = existing.tags;
      if (data.tags !== undefined) {
        processedTags = Array.isArray(data.tags)
          ? data.tags.map(t => String(t).trim()).filter(Boolean)
          : String(data.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      }

      let validMirrors = existing.mirrors;
      if (data.mirrors !== undefined) {
        validMirrors = Array.isArray(data.mirrors)
          ? data.mirrors.filter(m => m && m.url && m.url.trim())
          : [];
      }

      let validScreenshots = existing.screenshots || [];
      if (data.screenshots !== undefined) {
        validScreenshots = Array.isArray(data.screenshots)
          ? data.screenshots.filter(s => s && s.trim())
          : [];
      }

      const updated = {
        ...existing,
        title: data.title !== undefined ? data.title.trim() : existing.title,
        category: data.category !== undefined ? data.category.trim() : existing.category,
        iconUrl: data.iconUrl !== undefined ? data.iconUrl.trim() : (existing.iconUrl || ''),
        screenshots: validScreenshots,
        pricingType: data.pricingType !== undefined ? data.pricingType : (existing.pricingType || 'free'),
        price: data.price !== undefined ? data.price.trim() : (existing.price || 'Free'),
        assetFormat: data.assetFormat !== undefined ? data.assetFormat.trim() : (existing.assetFormat || 'Executable'),
        isPublisherVerified: data.isPublisherVerified !== undefined ? data.isPublisherVerified : existing.isPublisherVerified,
        description: data.description !== undefined ? data.description.trim() : existing.description,
        tags: processedTags,
        downloadUrl: data.downloadUrl !== undefined ? data.downloadUrl.trim() : existing.downloadUrl,
        mirrors: validMirrors,
        version: data.version !== undefined ? data.version.trim() : existing.version,
        changelog: data.changelog !== undefined ? data.changelog.trim() : existing.changelog,
        developer: data.developer !== undefined ? data.developer.trim() : existing.developer,
        size: data.size !== undefined ? data.size.trim() : existing.size,
        architecture: data.architecture !== undefined ? data.architecture.trim() : existing.architecture,
        moreDetails: data.moreDetails !== undefined ? data.moreDetails.trim() : existing.moreDetails,
        updatedAt: Date.now()
      };

      items[index] = updated;
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      notifySubscribers('items_changed', updated);
      return { success: true, item: updated };
    },

    deleteItem(id) {
      let items = this.getItems();
      const initialLen = items.length;
      items = items.filter(i => String(i.id) !== String(id));
      if (items.length === initialLen) return { success: false, message: 'Item not found' };
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      notifySubscribers('items_changed');
      return { success: true };
    },

    // --- BACKUP & SYNC ---
    exportDatabase() {
      return {
        store: "xer's store",
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        categories: this.getCategories(),
        items: this.getItems(),
        users: this.getUsers().map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role,
          isXerVerified: !!u.isXerVerified,
          verifiedTitle: u.verifiedTitle || '',
          createdAt: u.createdAt
        })),
        verifications: this.getVerificationRequests()
      };
    },

    importDatabase(data) {
      try {
        if (!data || typeof data !== 'object') return { success: false, message: 'Invalid payload' };
        if (Array.isArray(data.categories)) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
        if (Array.isArray(data.items)) localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(data.items));
        if (Array.isArray(data.users)) saveUsersWithIntegrity(data.users);
        if (Array.isArray(data.verifications)) localStorage.setItem(STORAGE_KEYS.VERIFICATION_REQUESTS, JSON.stringify(data.verifications));
        notifySubscribers('items_changed');
        notifySubscribers('users_changed');
        notifySubscribers('categories_changed');
        notifySubscribers('verifications_changed');
        return { success: true };
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    // --- THEME ENGINE (DARK BLUE / GRADIENT DARK GREY / LIGHT) ---
    getTheme() {
      return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark-blue';
    },

    setTheme(theme) {
      const valid = ['dark-blue', 'dark-grey', 'light'].includes(theme) ? theme : 'dark-blue';
      localStorage.setItem(STORAGE_KEYS.THEME, valid);
      document.documentElement.setAttribute('data-theme', valid);
      notifySubscribers('theme_changed', valid);
      return valid;
    },

    cycleTheme() {
      const cur = this.getTheme();
      let next = 'dark-blue';
      if (cur === 'dark-blue') next = 'dark-grey';
      else if (cur === 'dark-grey') next = 'light';
      else next = 'dark-blue';
      return this.setTheme(next);
    },

    initTheme() {
      const saved = this.getTheme();
      document.documentElement.setAttribute('data-theme', saved);
      return saved;
    },

    // Anti-Tamper Shield
    verifySecurityIntegrity: verifyIntegrity,

    // Live Remote Catalog Sync
    syncWithRemoteCatalog,

    subscribe
  };

  // Remote catalog live sync for Vercel deployment
  async function syncWithRemoteCatalog() {
    try {
      const res = await fetch('./catalog.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
            notifySubscribers('categories_changed', data.categories);
          }
          if (Array.isArray(data.items)) {
            localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(data.items));
            notifySubscribers('items_changed', data.items);
          }
        }
      }
    } catch (e) {
      // Local or offline mode
    }
  }

  // Auto initialize
  StoreDB.initTheme();
  initializeUsers();
  initializeCategories();
  initializeItems();
  initializeVerificationRequests();
  syncWithRemoteCatalog();

  // Active anti-tamper monitoring
  if (!verifyIntegrity()) {
    console.warn('Security alert: Local database signature mismatch detected.');
  }

  window.StoreDB = StoreDB;
})(window);
