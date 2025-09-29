/**
 * Utility Functions - Additional helper functions
 */

class ImagePickerModal {
    constructor() {
        this.modal = null;
        this.currentTab = 'upload';
        this.unsplashApiKey = 'YOUR_UNSPLASH_ACCESS_KEY'; // Replace with actual key
    }

    show() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.classList.add('show');
        this.modal.setAttribute('aria-hidden', 'false');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.modal.setAttribute('aria-hidden', 'true');
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal image-picker-modal';
        this.modal.setAttribute('aria-hidden', 'true');
        
        this.modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow: hidden;">
                <div class="modal-header">
                    <h3>انتخاب تصویر</h3>
                    <button class="modal-close" onclick="this.closest('.modal').classList.remove('show')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tab-buttons">
                        <button class="tab-btn active" data-tab="upload">📁 آپلود</button>
                        <button class="tab-btn" data-tab="unsplash">🔍 Unsplash</button>
                        <button class="tab-btn" data-tab="camera">📷 دوربین</button>
                    </div>
                    
                    <div class="tab-content">
                        <div class="tab-pane active" id="upload-tab">
                            <div class="upload-dropzone" onclick="document.getElementById('hiddenImageInput').click()">
                                <div class="dropzone-content">
                                    <div class="upload-icon">📁</div>
                                    <h4>تصویر خود را بکشید و رها کنید</h4>
                                    <p>یا کلیک کنید تا انتخاب کنید</p>
                                    <button class="upload-btn">انتخاب فایل</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tab-pane" id="unsplash-tab">
                            <div class="search-container">
                                <input type="text" class="search-input" placeholder="جستجوی تصاویر..." />
                                <button class="search-btn">🔍</button>
                            </div>
                            <div class="image-grid" id="unsplashGrid">
                                <div class="loading">در حال بارگذاری...</div>
                            </div>
                        </div>
                        
                        <div class="tab-pane" id="camera-tab">
                            <div class="camera-container">
                                <video id="cameraVideo" style="width: 100%; max-height: 300px; background: black; border-radius: 8px;"></video>
                                <div class="camera-controls" style="text-align: center; margin-top: 1rem;">
                                    <button class="camera-btn" id="startCamera">📷 روشن کردن دوربین</button>
                                    <button class="camera-btn" id="capturePhoto" style="display: none;">📸 عکس گرفتن</button>
                                </div>
                                <div class="camera-error" style="display: none; text-align: center; padding: 2rem;">
                                    <p>🚫 دوربین در دسترس نیست</p>
                                    <p>متأسفانه امکان دسترسی به دوربین وجود ندارد</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        this.modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Search functionality
        const searchInput = this.modal.querySelector('.search-input');
        const searchBtn = this.modal.querySelector('.search-btn');
        
        if (searchInput && searchBtn) {
            const handleSearch = () => {
                const query = searchInput.value.trim();
                if (query) {
                    this.searchUnsplash(query);
                }
            };

            searchBtn.addEventListener('click', handleSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });
        }

        // Camera functionality
        this.setupCamera();

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        this.modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        this.modal.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabName + '-tab');
        });

        // Load content if needed
        if (tabName === 'unsplash') {
            this.searchUnsplash('minimal aesthetic');
        }
    }

    async searchUnsplash(query) {
        const grid = this.modal.querySelector('#unsplashGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="loading">در حال جستجو...</div>';

        try {
            // Note: In a real implementation, you'd need a proper Unsplash API key
            // For now, we'll show a placeholder message
            grid.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>🔍 جستجوی تصاویر</p>
                    <p>برای استفاده از این قابلیت، کلید API Unsplash مورد نیاز است</p>
                    <button onclick="document.getElementById('hiddenImageInput').click()" class="upload-btn">
                        آپلود تصویر محلی
                    </button>
                </div>
            `;

        } catch (error) {
            console.error('Unsplash search failed:', error);
            grid.innerHTML = '<div class="error">خطا در جستجو</div>';
        }
    }

    setupCamera() {
        const video = this.modal.querySelector('#cameraVideo');
        const startBtn = this.modal.querySelector('#startCamera');
        const captureBtn = this.modal.querySelector('#capturePhoto');
        const errorDiv = this.modal.querySelector('.camera-error');

        if (!video || !startBtn || !captureBtn) return;

        let stream = null;

        startBtn.addEventListener('click', async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                
                video.srcObject = stream;
                video.style.display = 'block';
                startBtn.style.display = 'none';
                captureBtn.style.display = 'inline-block';
                errorDiv.style.display = 'none';

            } catch (error) {
                console.error('Camera access failed:', error);
                video.style.display = 'none';
                startBtn.style.display = 'none';
                captureBtn.style.display = 'none';
                errorDiv.style.display = 'block';
            }
        });

        captureBtn.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                if (window.DACO.canvas) {
                    window.DACO.canvas.setCanvasImage(url);
                }
                this.hide();
                
                // Stop camera
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            });
        });
    }
}

// Settings Modal
class SettingsModal {
    constructor() {
        this.modal = null;
    }

    show() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.classList.add('show');
        this.loadCurrentSettings();
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal settings-modal';
        
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>تنظیمات</h3>
                    <button class="modal-close" onclick="this.closest('.modal').classList.remove('show')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h4>ظاهر</h4>
                        <label class="setting-label">
                            <input type="checkbox" id="darkModeToggle">
                            <span class="checkmark"></span>
                            حالت تاریک
                        </label>
                        <label class="setting-label">
                            <input type="checkbox" id="animationsToggle">
                            <span class="checkmark"></span>
                            انیمیشن‌ها
                        </label>
                    </div>
                    
                    <div class="settings-section">
                        <h4>عملکرد</h4>
                        <label class="setting-label">
                            <input type="checkbox" id="autoSaveToggle">
                            <span class="checkmark"></span>
                            ذخیره خودکار
                        </label>
                        <label class="setting-label">
                            <input type="checkbox" id="gridToggle">
                            <span class="checkmark"></span>
                            نمایش خطوط راهنما
                        </label>
                    </div>
                    
                    <div class="settings-section">
                        <h4>کیفیت خروجی</h4>
                        <label>کیفیت پیش‌فرض:</label>
                        <select id="qualitySelect">
                            <option value="high">بالا (PNG)</option>
                            <option value="medium">متوسط (JPG 90%)</option>
                            <option value="low">پایین (JPG 70%)</option>
                        </select>
                    </div>
                    
                    <div class="settings-section">
                        <h4>حریم خصوصی</h4>
                        <label class="setting-label">
                            <input type="checkbox" id="analyticsToggle">
                            <span class="checkmark"></span>
                            ارسال آمار استفاده
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="settings-btn secondary" onclick="this.closest('.modal').classList.remove('show')">انصراف</button>
                    <button class="settings-btn primary" id="resetBtn">بازنشانی</button>
                    <button class="settings-btn primary" id="saveSettingsBtn">ذخیره</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        const saveBtn = this.modal.querySelector('#saveSettingsBtn');
        const resetBtn = this.modal.querySelector('#resetBtn');

        saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        resetBtn.addEventListener('click', () => {
            this.resetSettings();
        });

        // Real-time updates
        this.modal.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => {
                this.applySettingRealtime(input);
            });
        });
    }

    loadCurrentSettings() {
        const settings = window.DACO.settings;
        
        this.modal.querySelector('#darkModeToggle').checked = window.DACO.currentTheme === 'dark';
        this.modal.querySelector('#animationsToggle').checked = settings.animations;
        this.modal.querySelector('#autoSaveToggle').checked = settings.autoSave;
        this.modal.querySelector('#gridToggle').checked = settings.grid;
        this.modal.querySelector('#qualitySelect').value = settings.quality;
        this.modal.querySelector('#analyticsToggle').checked = settings.analytics;
    }

    applySettingRealtime(input) {
        switch (input.id) {
            case 'darkModeToggle':
                window.DACO.app?.setTheme(input.checked ? 'dark' : 'light');
                break;
            case 'gridToggle':
                window.toggleGrid?.();
                break;
        }
    }

    saveSettings() {
        const settings = {
            animations: this.modal.querySelector('#animationsToggle').checked,
            autoSave: this.modal.querySelector('#autoSaveToggle').checked,
            grid: this.modal.querySelector('#gridToggle').checked,
            quality: this.modal.querySelector('#qualitySelect').value,
            analytics: this.modal.querySelector('#analyticsToggle').checked
        };

        Object.assign(window.DACO.settings, settings);
        window.DACO.app?.saveSettings();
        
        this.hide();
        window.DACO.notifications.success('تنظیمات ذخیره شد');
    }

    resetSettings() {
        if (window.confirm('آیا مطمئن هستید که می‌خواهید تنظیمات را بازنشانی کنید؟')) {
            window.DACO.storage.clear();
            window.location.reload();
        }
    }
}

// Help Modal
class HelpModal {
    constructor() {
        this.modal = null;
    }

    show() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.classList.add('show');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal help-modal';
        
        this.modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>راهنما</h3>
                    <button class="modal-close" onclick="this.closest('.modal').classList.remove('show')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="help-section">
                        <h4>🎯 شروع سریع</h4>
                        <ol>
                            <li>روی "تصویر" کلیک کنید و عکس خود را آپلود کنید</li>
                            <li>متن را انتخاب کنید و متن دلخواه خود را بنویسید</li>
                            <li>فونت، رنگ و اندازه را تنظیم کنید</li>
                            <li>از قسمت "خروجی" تصویر نهایی را دانلود کنید</li>
                        </ol>
                    </div>
                    
                    <div class="help-section">
                        <h4>⌨️ میانبرهای کیبورد</h4>
                        <div class="shortcuts">
                            <div class="shortcut">
                                <kbd>Ctrl</kbd> + <kbd>S</kbd>
                                <span>ذخیره</span>
                            </div>
                            <div class="shortcut">
                                <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                                <span>بازگشت</span>
                            </div>
                            <div class="shortcut">
                                <kbd>Ctrl</kbd> + <kbd>Y</kbd>
                                <span>تکرار</span>
                            </div>
                            <div class="shortcut">
                                <kbd>Del</kbd>
                                <span>حذف عنصر انتخاب شده</span>
                            </div>
                            <div class="shortcut">
                                <kbd>Ctrl</kbd> + <kbd>D</kbd>
                                <span>کپی عنصر</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h4>📱 نکات موبایل</h4>
                        <ul>
                            <li>🤏 برای زوم کردن تصویر دو انگشت استفاده کنید</li>
                            <li>👆 برای جابجایی متن آن را لمس کرده و بکشید</li>
                            <li>📐 خطوط راهنما کمک می‌کند متن را دقیق قرار دهید</li>
                            <li>🔄 دستگاه را عمودی نگه دارید</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>💡 نکات حرفه‌ای</h4>
                        <ul>
                            <li>از فونت‌های فارسی برای متن‌های فارسی استفاده کنید</li>
                            <li>کنتراست مناسب بین متن و پس‌زمینه در نظر بگیرید</li>
                            <li>اندازه متن را مناسب دستگاه موبایل تنظیم کنید</li>
                            <li>از جلوه‌های نوری برای جذاب‌تر شدن استفاده کنید</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>🐛 رفع مشکل</h4>
                        <p>اگر با مشکلی مواجه شدید:</p>
                        <ul>
                            <li>صفحه را تازه‌سازی کنید (F5)</li>
                            <li>کش مرورگر را پاک کنید</li>
                            <li>از آخرین نسخه مرورگر استفاده کنید</li>
                            <li>با ما تماس بگیرید: info@dacostorymaker.app</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }
}

// Global instances
window.DACO.imagePickerModal = new ImagePickerModal();
window.DACO.settingsModal = new SettingsModal();
window.DACO.helpModal = new HelpModal();

// Global functions
window.openImagePicker = () => window.DACO.imagePickerModal.show();
window.openSettings = () => window.DACO.settingsModal.show();
window.openHelp = () => window.DACO.helpModal.show();

// Additional utility functions
window.showAbout = () => {
    window.DACO.notifications.info(`DACO Storymaker Pro v${window.DACO.version} - ساخت استوری حرفه‌ای`);
};

// Context menu global variable
window.contextMenuFunctions = {
    copyElement: () => {
        if (window.DACO.canvas?.selectedElement) {
            const text = window.DACO.canvas.selectedElement.textContent;
            window.DACO.Utils.copyToClipboard(text);
            window.DACO.notifications.success('متن کپی شد');
        }
    },
    duplicateElement: () => window.duplicateSelected?.(),
    deleteElement: () => window.deleteSelected?.(),
    bringToFront: () => {
        if (window.DACO.canvas?.selectedElement) {
            window.DACO.canvas.selectedElement.style.zIndex = '30';
            window.DACO.notifications.info('متن به جلو آمد');
        }
    },
    sendToBack: () => {
        if (window.DACO.canvas?.selectedElement) {
            window.DACO.canvas.selectedElement.style.zIndex = '10';
            window.DACO.notifications.info('متن به عقب رفت');
        }
    }
};