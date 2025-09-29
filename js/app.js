/**
 * DACO Storymaker Pro - Main Application
 * Version: 3.0.0
 * Author: DACO Storymaker Team
 */

// Global Application State
window.DACO = {
    version: '3.0.0',
    initialized: false,
    currentTheme: 'light',
    settings: {
        autoSave: true,
        animations: true,
        grid: false,
        quality: 'high',
        analytics: true
    },
    state: {
        selectedElement: null,
        currentSection: 'text',
        isFullscreen: false,
        isOffline: false,
        hasUnsavedChanges: false,
        undoStack: [],
        redoStack: [],
        currentZoom: 1
    },
    elements: new Map(),
    eventListeners: new Map()
};

// Application Configuration
const CONFIG = {
    CANVAS_SIZE: {
        width: 280,
        height: 497
    },
    EXPORT_SIZE: {
        width: 1080,
        height: 1920
    },
    MAX_UNDO_STEPS: 50,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    FONTS: [
        'Vazirmatn',
        'Lalezar', 
        'Amiri',
        'Markazi Text',
        'Noto Naskh Arabic',
        'Inter',
        'Roboto'
    ]
};

// Utility Functions
const Utils = {
    // Generate unique ID
    generateId: () => Math.random().toString(36).substr(2, 9),
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Deep clone object
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    
    // Format file size
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Validate file
    validateFile: (file) => {
        const errors = [];
        
        if (!file) {
            errors.push('فایل انتخاب نشده است');
            return errors;
        }
        
        // Check file type
        const extension = file.name.split('.').pop().toLowerCase();
        if (!CONFIG.SUPPORTED_FORMATS.includes(extension)) {
            errors.push(`فرمت ${extension} پشتیبانی نمی‌شود`);
        }
        
        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            errors.push(`حجم فایل نباید بیشتر از ${Utils.formatFileSize(CONFIG.MAX_FILE_SIZE)} باشد`);
        }
        
        // Check if it's actually an image
        if (!file.type.startsWith('image/')) {
            errors.push('فایل انتخاب شده تصویر نیست');
        }
        
        return errors;
    },
    
    // Convert hex to RGB
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    // Convert RGB to hex
    rgbToHex: (r, g, b) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
    
    // Download file
    downloadFile: (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // Copy to clipboard
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    },
    
    // Get device info
    getDeviceInfo: () => {
        const ua = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isAndroid = /Android/.test(ua);
        const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
        
        return {
            isMobile,
            isIOS,
            isAndroid,
            isSafari,
            userAgent: ua,
            language: navigator.language,
            platform: navigator.platform
        };
    }
};

// Event Manager
class EventManager {
    constructor() {
        this.events = new Map();
    }
    
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }
    
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
}

// Create global event manager
window.DACO.events = new EventManager();

// Storage Manager
class StorageManager {
    constructor() {
        this.prefix = 'daco_storymaker_';
    }
    
    set(key, value) {
        try {
            const data = JSON.stringify(value);
            localStorage.setItem(this.prefix + key, data);
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }
    
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(this.prefix + key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }
    
    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
            return false;
        }
    }
    
    clear() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
            return false;
        }
    }
}

// Create global storage manager
window.DACO.storage = new StorageManager();

// Notification Manager
class NotificationManager {
    constructor() {
        this.container = null;
        this.init();
    }
    
    init() {
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9998;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    }
    
    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type} animate-slide-in-right`;
        notification.style.cssText = `
            background: var(--${type === 'info' ? 'primary' : type}-color);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            pointer-events: auto;
            cursor: pointer;
            max-width: 300px;
            word-wrap: break-word;
            font-weight: 500;
        `;
        
        // Add icon based on type
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">${icons[type] || icons.info}</span>
                <span>${message}</span>
            </div>
        `;
        
        this.container.appendChild(notification);
        
        // Auto remove
        const removeNotification = () => {
            notification.classList.add('animate-slide-out-right');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };
        
        // Click to dismiss
        notification.addEventListener('click', removeNotification);
        
        // Auto dismiss
        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }
        
        return notification;
    }
    
    success(message, duration) {
        return this.show(message, 'success', duration);
    }
    
    error(message, duration) {
        return this.show(message, 'error', duration);
    }
    
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }
    
    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Create global notification manager
window.DACO.notifications = new NotificationManager();

// Application Initialization
class App {
    constructor() {
        this.initialized = false;
        this.loadingScreen = null;
        this.appContainer = null;
    }
    
    async init() {
        try {
            console.log('🚀 Initializing DACO Storymaker Pro v' + window.DACO.version);
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Load settings
            this.loadSettings();
            
            // Initialize theme
            this.initTheme();
            
            // Check orientation
            this.checkOrientation();
            
            // Initialize event listeners
            this.initEventListeners();
            
            // Initialize components
            await this.initComponents();
            
            // Check for updates
            this.checkForUpdates();
            
            // Setup auto-save
            this.setupAutoSave();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Initialize PWA features
            this.initPWA();
            
            // Track app load
            this.trackEvent('app_loaded', {
                version: window.DACO.version,
                device: Utils.getDeviceInfo()
            });
            
            // Hide loading screen
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 2000);
            
            this.initialized = true;
            window.DACO.initialized = true;
            
            console.log('✅ DACO Storymaker Pro initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            window.DACO.notifications.error('خطا در بارگذاری برنامه');
        }
    }
    
    showLoadingScreen() {
        this.loadingScreen = document.getElementById('loadingScreen');
        this.appContainer = document.getElementById('appContainer');
        
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
        }
        
        if (this.appContainer) {
            this.appContainer.style.display = 'none';
        }
    }
    
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
        
        if (this.appContainer) {
            this.appContainer.style.display = 'flex';
            this.appContainer.classList.add('animate-fade-in');
        }
    }
    
    loadSettings() {
        const savedSettings = window.DACO.storage.get('settings', {});
        window.DACO.settings = { ...window.DACO.settings, ...savedSettings };
        
        // Apply settings
        if (!window.DACO.settings.animations) {
            document.body.classList.add('no-animations');
        }
        
        if (window.DACO.settings.grid) {
            this.toggleGrid(true);
        }
    }
    
    saveSettings() {
        window.DACO.storage.set('settings', window.DACO.settings);
    }
    
    initTheme() {
        // Get saved theme or system preference
        const savedTheme = window.DACO.storage.get('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = savedTheme || systemTheme;
        
        this.setTheme(theme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!window.DACO.storage.get('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    setTheme(theme) {
        window.DACO.currentTheme = theme;
        document.documentElement.classList.toggle('dark', theme === 'dark');
        
        // Update theme toggle button
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        
        // Save preference
        window.DACO.storage.set('theme', theme);
        
        // Emit event
        window.DACO.events.emit('theme-changed', theme);
    }
    
    checkOrientation() {
        const portraitAlert = document.getElementById('portraitAlert');
        
        const handleOrientation = () => {
            const isPortrait = window.innerHeight > window.innerWidth;
            const isMobile = window.innerWidth < 768;
            
            if (!isPortrait && isMobile) {
                portraitAlert?.classList.add('show');
            } else {
                portraitAlert?.classList.remove('show');
            }
        };
        
        handleOrientation();
        window.addEventListener('resize', Utils.throttle(handleOrientation, 100));
        window.addEventListener('orientationchange', () => {
            setTimeout(handleOrientation, 100);
        });
    }
    
    initEventListeners() {
        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.trackEvent('error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno
            });
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.trackEvent('unhandled_promise_rejection', {
                reason: e.reason?.toString()
            });
        });
        
        // Online/Offline status
        window.addEventListener('online', () => {
            window.DACO.state.isOffline = false;
            window.DACO.notifications.success('اتصال به اینترنت برقرار شد');
            document.getElementById('offlineAlert')?.style.setProperty('display', 'none');
        });
        
        window.addEventListener('offline', () => {
            window.DACO.state.isOffline = true;
            window.DACO.notifications.warning('اتصال به اینترنت قطع شد');
            const offlineAlert = document.getElementById('offlineAlert');
            if (offlineAlert) {
                offlineAlert.style.display = 'flex';
            }
        });
        
        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (window.DACO.state.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'تغییرات ذخیره نشده‌ای دارید. آیا مطمئن هستید؟';
                return e.returnValue;
            }
        });
        
        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('app_hidden');
            } else {
                this.trackEvent('app_visible');
            }
        });
    }
    
    async initComponents() {
        // Initialize canvas
        if (window.CanvasManager) {
            window.DACO.canvas = new window.CanvasManager();
            await window.DACO.canvas.init();
        }
        
        // Initialize controls
        if (window.ControlsManager) {
            window.DACO.controls = new window.ControlsManager();
            await window.DACO.controls.init();
        }
        
        // Initialize gestures
        if (window.GestureManager) {
            window.DACO.gestures = new window.GestureManager();
            await window.DACO.gestures.init();
        }
        
        // Initialize export
        if (window.ExportManager) {
            window.DACO.export = new window.ExportManager();
            await window.DACO.export.init();
        }
    }
    
    setupAutoSave() {
        if (!window.DACO.settings.autoSave) return;
        
        setInterval(() => {
            if (window.DACO.state.hasUnsavedChanges) {
                this.autoSave();
            }
        }, CONFIG.AUTO_SAVE_INTERVAL);
    }
    
    autoSave() {
        try {
            const state = this.getAppState();
            window.DACO.storage.set('autosave', {
                timestamp: Date.now(),
                state
            });
            
            console.log('Auto-saved at', new Date().toLocaleTimeString());
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }
    
    loadAutoSave() {
        const autosave = window.DACO.storage.get('autosave');
        if (autosave && autosave.state) {
            this.restoreAppState(autosave.state);
            window.DACO.notifications.info(
                `بازیابی از ذخیره خودکار: ${new Date(autosave.timestamp).toLocaleString()}`
            );
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input
            if (e.target.matches('input, textarea, [contenteditable]')) {
                return;
            }
            
            const isCtrl = e.ctrlKey || e.metaKey;
            
            if (isCtrl) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.handleSave();
                        break;
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.duplicateSelected();
                        break;
                    case 'a':
                        e.preventDefault();
                        this.selectAll();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.addNewText();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.openImagePicker();
                        break;
                }
            }
            
            // Delete key
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (window.DACO.state.selectedElement) {
                    e.preventDefault();
                    this.deleteSelected();
                }
            }
            
            // Escape key
            if (e.key === 'Escape') {
                this.handleEscape();
            }
            
            // F11 for fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });
    }
    
    initPWA() {
        // Handle install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.DACO.deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        // Handle app installed
        window.addEventListener('appinstalled', () => {
            window.DACO.notifications.success('برنامه با موفقیت نصب شد!');
            this.hideInstallPrompt();
            this.trackEvent('app_installed');
        });
    }
    
    checkForUpdates() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'UPDATE_AVAILABLE') {
                    this.showUpdateBanner();
                }
            });
        }
    }
    
    showUpdateBanner() {
        const updateBanner = document.getElementById('updateBanner');
        if (updateBanner) {
            updateBanner.style.display = 'flex';
            updateBanner.classList.add('animate-slide-in-down');
        }
    }
    
    showInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        if (installPrompt) {
            installPrompt.style.display = 'flex';
            installPrompt.classList.add('animate-slide-in-up');
        }
    }
    
    hideInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        if (installPrompt) {
            installPrompt.classList.add('animate-slide-out-down');
            setTimeout(() => {
                installPrompt.style.display = 'none';
            }, 300);
        }
    }
    
    // State management
    getAppState() {
        return {
            version: window.DACO.version,
            elements: Array.from(window.DACO.elements.values()),
            settings: window.DACO.settings,
            canvas: window.DACO.canvas?.getState(),
            timestamp: Date.now()
        };
    }
    
    restoreAppState(state) {
        if (state.version !== window.DACO.version) {
            console.warn('State version mismatch, migration may be needed');
        }
        
        // Restore elements
        window.DACO.elements.clear();
        if (state.elements) {
            state.elements.forEach(element => {
                window.DACO.elements.set(element.id, element);
            });
        }
        
        // Restore settings
        if (state.settings) {
            window.DACO.settings = { ...window.DACO.settings, ...state.settings };
        }
        
        // Restore canvas
        if (state.canvas && window.DACO.canvas) {
            window.DACO.canvas.restoreState(state.canvas);
        }
        
        // Mark as having unsaved changes
        window.DACO.state.hasUnsavedChanges = true;
    }
    
    // Undo/Redo system
    saveState() {
        const state = this.getAppState();
        window.DACO.state.undoStack.push(state);
        
        // Limit undo stack size
        if (window.DACO.state.undoStack.length > CONFIG.MAX_UNDO_STEPS) {
            window.DACO.state.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        window.DACO.state.redoStack = [];
        
        // Update UI
        this.updateUndoRedoButtons();
        
        // Mark as having unsaved changes
        window.DACO.state.hasUnsavedChanges = true;
    }
    
    undo() {
        if (window.DACO.state.undoStack.length > 0) {
            const currentState = this.getAppState();
            window.DACO.state.redoStack.push(currentState);
            
            const previousState = window.DACO.state.undoStack.pop();
            this.restoreAppState(previousState);
            
            this.updateUndoRedoButtons();
            window.DACO.notifications.info('عملیات لغو شد');
            this.trackEvent('undo');
        }
    }
    
    redo() {
        if (window.DACO.state.redoStack.length > 0) {
            const currentState = this.getAppState();
            window.DACO.state.undoStack.push(currentState);
            
            const nextState = window.DACO.state.redoStack.pop();
            this.restoreAppState(nextState);
            
            this.updateUndoRedoButtons();
            window.DACO.notifications.info('عملیات تکرار شد');
            this.trackEvent('redo');
        }
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = window.DACO.state.undoStack.length === 0;
        }
        
        if (redoBtn) {
            redoBtn.disabled = window.DACO.state.redoStack.length === 0;
        }
    }
    
    // Action handlers
    handleSave() {
        if (window.DACO.export) {
            window.DACO.export.showPanel();
        }
    }
    
    handleEscape() {
        // Close any open modals or panels
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
        
        document.querySelectorAll('.export-panel.show').forEach(panel => {
            panel.classList.remove('show');
        });
        
        // Close sidebar
        this.closeSidebar();
        
        // Deselect elements
        if (window.DACO.state.selectedElement) {
            window.DACO.canvas?.deselectElement();
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                window.DACO.state.isFullscreen = true;
                window.DACO.notifications.info('حالت تمام صفحه فعال شد');
            });
        } else {
            document.exitFullscreen().then(() => {
                window.DACO.state.isFullscreen = false;
                window.DACO.notifications.info('حالت تمام صفحه غیرفعال شد');
            });
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar && overlay) {
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                this.closeSidebar();
            } else {
                sidebar.classList.add('open');
                overlay.classList.add('show');
            }
        }
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        }
    }
    
    toggleTheme() {
        const newTheme = window.DACO.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.trackEvent('theme_toggled', { theme: newTheme });
    }
    
    // Analytics
    trackEvent(event, data = {}) {
        if (!window.DACO.settings.analytics) return;
        
        const eventData = {
            event,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: location.href,
            ...data
        };
        
        // Store locally
        const events = window.DACO.storage.get('events', []);
        events.push(eventData);
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        window.DACO.storage.set('events', events);
        
        // Emit event for other components
        window.DACO.events.emit('analytics-event', eventData);
    }
}

// Global functions for HTML event handlers
window.toggleSidebar = () => window.DACO.app?.toggleSidebar();
window.closeSidebar = () => window.DACO.app?.closeSidebar();
window.toggleTheme = () => window.DACO.app?.toggleTheme();
window.toggleFullscreen = () => window.DACO.app?.toggleFullscreen();
window.updateApp = () => window.DACO.pwa?.updateApp();
window.dismissUpdate = () => window.DACO.pwa?.dismissUpdate();
window.installApp = () => window.DACO.pwa?.installApp();
window.dismissInstall = () => window.DACO.pwa?.dismissInstall();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.DACO.app = new App();
    window.DACO.app.init();
});

// Export for use in other modules
window.DACO.App = App;
window.DACO.Utils = Utils;
window.DACO.CONFIG = CONFIG;