/**
 * PWA Manager - Handles Progressive Web App features
 */

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.registration = null;
        this.updateAvailable = false;
    }

    async init() {
        this.checkInstallStatus();
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupUpdatePrompt();
        this.handleOfflineStatus();
        
        console.log('📱 PWA Manager initialized');
    }

    checkInstallStatus() {
        // Check if app is installed
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone === true;
        
        if (this.isInstalled) {
            console.log('📱 App is installed as PWA');
            this.hideInstallPrompt();
        }
    }

    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker not supported');
            return;
        }

        try {
            this.registration = await navigator.serviceWorker.register('./js/sw.js', {
                scope: './'
            });

            console.log('✅ Service Worker registered successfully');

            // Listen for updates
            this.registration.addEventListener('updatefound', () => {
                this.handleServiceWorkerUpdate();
            });

            // Check for updates immediately
            this.registration.update();

        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }

    handleServiceWorkerUpdate() {
        const newWorker = this.registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.showUpdateBanner();
            }
        });
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            if (!this.isInstalled) {
                this.showInstallPrompt();
            }
        });

        // Handle app installed
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.hideInstallPrompt();
            window.DACO.notifications.success('برنامه با موفقیت نصب شد!');
            window.DACO.app?.trackEvent('app_installed');
        });
    }

    setupUpdatePrompt() {
        // Listen for messages from service worker
        navigator.serviceWorker?.addEventListener('message', (event) => {
            if (event.data?.type === 'UPDATE_AVAILABLE') {
                this.showUpdateBanner();
            }
        });
    }

    async installApp() {
        if (!this.deferredPrompt) {
            window.DACO.notifications.warning('نصب از این مرورگر پشتیبانی نمی‌شود');
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                window.DACO.notifications.success('در حال نصب برنامه...');
            } else {
                window.DACO.notifications.info('نصب لغو شد');
            }
            
            this.deferredPrompt = null;
            this.hideInstallPrompt();
            
            window.DACO.app?.trackEvent('install_prompt_result', { outcome });
            
        } catch (error) {
            console.error('Install failed:', error);
            window.DACO.notifications.error('خطا در نصب برنامه');
        }
    }

    async updateApp() {
        if (!this.registration?.waiting) {
            window.DACO.notifications.warning('به‌روزرسانی در دسترس نیست');
            return;
        }

        try {
            // Tell the waiting service worker to activate
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Reload to get the new version
            window.location.reload();
            
        } catch (error) {
            console.error('Update failed:', error);
            window.DACO.notifications.error('خطا در به‌روزرسانی');
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

    showUpdateBanner() {
        const updateBanner = document.getElementById('updateBanner');
        if (updateBanner) {
            updateBanner.style.display = 'flex';
            updateBanner.classList.add('animate-slide-in-down');
        }
    }

    dismissInstall() {
        this.hideInstallPrompt();
        window.DACO.app?.trackEvent('install_dismissed');
    }

    dismissUpdate() {
        const updateBanner = document.getElementById('updateBanner');
        if (updateBanner) {
            updateBanner.style.display = 'none';
        }
        window.DACO.app?.trackEvent('update_dismissed');
    }
}

// Global functions
window.installApp = () => window.DACO.pwa?.installApp();
window.updateApp = () => window.DACO.pwa?.updateApp();
window.dismissInstall = () => window.DACO.pwa?.dismissInstall();
window.dismissUpdate = () => window.DACO.pwa?.dismissUpdate();

// Export
window.DACO.PWAManager = PWAManager;