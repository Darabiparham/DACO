/**
 * Export Manager - Handles image export and sharing functionality
 */

class ExportManager {
    constructor() {
        this.canvas = null;
        this.exportPanel = null;
        this.isExporting = false;
        this.exportFormats = {
            'high-quality': { width: 1080, height: 1920, format: 'png', quality: 1 },
            'text-only': { width: 1080, height: 1920, format: 'png', quality: 1, transparent: true },
            'instagram-story': { width: 1080, height: 1920, format: 'jpeg', quality: 0.9 },
            'wallpaper': { width: 1440, height: 2560, format: 'png', quality: 1 },
            'medium-quality': { width: 1080, height: 1920, format: 'jpeg', quality: 0.8 },
            'low-quality': { width: 720, height: 1280, format: 'jpeg', quality: 0.7 }
        };
    }

    async init() {
        this.exportPanel = document.getElementById('exportPanel');
        this.setupEventListeners();
        
        console.log('📤 Export Manager initialized');
    }

    setupEventListeners() {
        // Export panel close
        const exportClose = document.querySelector('.export-close');
        if (exportClose) {
            exportClose.addEventListener('click', this.hidePanel.bind(this));
        }

        // Click outside to close
        if (this.exportPanel) {
            this.exportPanel.addEventListener('click', (e) => {
                if (e.target === this.exportPanel) {
                    this.hidePanel();
                }
            });
        }

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.exportPanel?.classList.contains('show')) {
                this.hidePanel();
            }
        });
    }

    showPanel() {
        if (this.exportPanel) {
            this.exportPanel.classList.add('show');
            this.exportPanel.setAttribute('aria-hidden', 'false');
            
            // Focus trap
            const firstFocusable = this.exportPanel.querySelector('.export-option');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
        
        window.DACO.app?.trackEvent('export_panel_opened');
    }

    hidePanel() {
        if (this.exportPanel) {
            this.exportPanel.classList.remove('show');
            this.exportPanel.setAttribute('aria-hidden', 'true');
        }
        
        window.DACO.app?.trackEvent('export_panel_closed');
    }

    async exportImage(type) {
        if (this.isExporting) {
            window.DACO.notifications.warning('در حال تولید تصویر قبلی...');
            return;
        }

        try {
            this.isExporting = true;
            this.showProgress('در حال آماده‌سازی...');

            const config = this.exportFormats[type] || this.exportFormats['high-quality'];
            const canvas = await this.createExportCanvas(config);
            
            this.updateProgress('در حال تولید تصویر...', 70);

            const blob = await this.canvasToBlob(canvas, config);
            const filename = this.generateFilename(type, config.format);

            this.updateProgress('در حال دانلود...', 90);

            // Download the file
            window.DACO.Utils.downloadFile(blob, filename);

            this.hideProgress();
            this.hidePanel();
            
            window.DACO.notifications.success('تصویر با موفقیت دانلود شد!');
            
            // Track export
            window.DACO.app?.trackEvent('image_exported', {
                type,
                format: config.format,
                size: `${config.width}x${config.height}`,
                fileSize: blob.size
            });

        } catch (error) {
            console.error('Export failed:', error);
            this.hideProgress();
            window.DACO.notifications.error('خطا در تولید تصویر: ' + error.message);
        } finally {
            this.isExporting = false;
        }
    }

    async createExportCanvas(config) {
        const { width, height, transparent = false } = config;
        
        // Create export canvas
        const exportCanvas = document.createElement('canvas');
        const ctx = exportCanvas.getContext('2d');
        
        exportCanvas.width = width;
        exportCanvas.height = height;

        this.updateProgress('در حال رسم پس‌زمینه...', 20);

        // Set background
        if (!transparent) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Draw background image if exists
            const storyImage = document.getElementById('storyImage');
            if (storyImage && storyImage.style.display !== 'none' && storyImage.src) {
                await this.drawImageToCanvas(ctx, storyImage, width, height);
            }
        }

        this.updateProgress('در حال رسم متن‌ها...', 50);

        // Draw text elements
        await this.drawTextElements(ctx, width, height);

        return exportCanvas;
    }

    async drawImageToCanvas(ctx, imageElement, canvasWidth, canvasHeight) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // Apply image transformations
                    const imageData = window.DACO.canvas?.imageData || {};
                    const { scale = 1, offsetX = 0, offsetY = 0, rotation = 0 } = imageData;

                    ctx.save();
                    
                    // Apply transformations
                    ctx.translate(canvasWidth / 2, canvasHeight / 2);
                    ctx.rotate((rotation * Math.PI) / 180);
                    ctx.scale(scale, scale);
                    ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
                    
                    // Draw image with offset
                    ctx.drawImage(img, offsetX, offsetY, canvasWidth, canvasHeight);
                    
                    ctx.restore();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageElement.src;
        });
    }

    async drawTextElements(ctx, canvasWidth, canvasHeight) {
        const storyCanvas = document.getElementById('storyCanvas');
        if (!storyCanvas) return;

        const textElements = storyCanvas.querySelectorAll('.text-overlay');
        const canvasRect = storyCanvas.getBoundingClientRect();
        
        for (const textEl of textElements) {
            await this.drawSingleTextElement(ctx, textEl, canvasRect, canvasWidth, canvasHeight);
        }
    }

    async drawSingleTextElement(ctx, textElement, canvasRect, exportWidth, exportHeight) {
        const rect = textElement.getBoundingClientRect();
        const style = getComputedStyle(textElement);
        
        // Calculate position on export canvas
        const x = ((rect.left - canvasRect.left + rect.width / 2) / canvasRect.width) * exportWidth;
        const y = ((rect.top - canvasRect.top + rect.height / 2) / canvasRect.height) * exportHeight;
        
        // Calculate font size for export canvas
        const fontSizeRatio = exportWidth / canvasRect.width;
        const fontSize = parseInt(style.fontSize) * fontSizeRatio;
        
        // Set up text style
        ctx.textAlign = this.getCanvasTextAlign(style.textAlign);
        ctx.textBaseline = 'middle';
        
        // Font family and weight
        const fontFamily = style.fontFamily;
        const fontWeight = style.fontWeight;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        
        // Apply text effects
        this.applyTextEffects(ctx, style, fontSizeRatio);
        
        // Draw text with line wrapping
        const text = textElement.textContent;
        const maxWidth = (rect.width / canvasRect.width) * exportWidth;
        
        this.drawWrappedText(ctx, text, x, y, maxWidth, fontSize * 1.2);
    }

    getCanvasTextAlign(cssAlign) {
        const alignMap = {
            'right': 'right',
            'left': 'left', 
            'center': 'center',
            'justify': 'left'
        };
        return alignMap[cssAlign] || 'center';
    }

    applyTextEffects(ctx, style, scale) {
        // Text color
        ctx.fillStyle = style.color;
        
        // Text shadow
        if (style.textShadow && style.textShadow !== 'none') {
            const shadowMatch = style.textShadow.match(/rgba?\([^)]+\)|#[0-9a-f]{6}|#[0-9a-f]{3}|\w+/gi);
            if (shadowMatch && shadowMatch.length >= 4) {
                const color = shadowMatch[3] || shadowMatch[0];
                const offsetX = parseFloat(shadowMatch[0]) * scale;
                const offsetY = parseFloat(shadowMatch[1]) * scale;
                const blur = parseFloat(shadowMatch[2]) * scale;
                
                ctx.shadowColor = color;
                ctx.shadowOffsetX = offsetX;
                ctx.shadowOffsetY = offsetY;
                ctx.shadowBlur = blur;
            }
        }
        
        // Text stroke
        if (style.webkitTextStroke && style.webkitTextStroke !== 'none') {
            const strokeMatch = style.webkitTextStroke.match(/(\d+(?:\.\d+)?)px\s+(.+)/);
            if (strokeMatch) {
                ctx.strokeStyle = strokeMatch[2];
                ctx.lineWidth = parseFloat(strokeMatch[1]) * scale;
            }
        }
    }

    drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        // Break text into lines
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        // Draw lines
        const totalHeight = lines.length * lineHeight;
        let startY = y - (totalHeight - lineHeight) / 2;
        
        for (let i = 0; i < lines.length; i++) {
            const lineY = startY + (i * lineHeight);
            
            // Draw stroke first if exists
            if (ctx.strokeStyle && ctx.lineWidth > 0) {
                ctx.strokeText(lines[i], x, lineY);
            }
            
            // Draw fill text
            ctx.fillText(lines[i], x, lineY);
        }
    }

    canvasToBlob(canvas, config) {
        return new Promise((resolve, reject) => {
            const { format, quality } = config;
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            
            if (canvas.toBlob) {
                canvas.toBlob(resolve, mimeType, quality);
            } else {
                // Fallback for older browsers
                try {
                    const dataURL = canvas.toDataURL(mimeType, quality);
                    const blob = this.dataURLToBlob(dataURL);
                    resolve(blob);
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    dataURLToBlob(dataURL) {
        const parts = dataURL.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(parts[1]);
        const u8arr = new Uint8Array(bstr.length);
        
        for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }
        
        return new Blob([u8arr], { type: mime });
    }

    generateFilename(type, format) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const prefix = 'daco-story';
        const suffix = type.replace('-', '_');
        
        return `${prefix}_${suffix}_${timestamp}.${format}`;
    }

    showProgress(message, progress = 0) {
        let progressBar = document.getElementById('exportProgress');
        
        if (!progressBar) {
            progressBar = this.createProgressBar();
        }
        
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressText = progressBar.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = progress + '%';
        }
        
        if (progressText) {
            progressText.textContent = message;
        }
        
        progressBar.style.display = 'flex';
    }

    updateProgress(message, progress) {
        this.showProgress(message, progress);
    }

    hideProgress() {
        const progressBar = document.getElementById('exportProgress');
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    }

    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.id = 'exportProgress';
        progressBar.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            min-width: 300px;
            text-align: center;
            display: none;
        `;
        
        progressBar.innerHTML = `
            <div class="progress-text" style="margin-bottom: 1rem; font-weight: 600;">در حال پردازش...</div>
            <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; height: 8px;">
                <div class="progress-fill" style="height: 100%; background: var(--primary-color); width: 0%; transition: width 0.3s ease;"></div>
            </div>
        `;
        
        document.body.appendChild(progressBar);
        return progressBar;
    }

    async copyToClipboard() {
        try {
            this.showProgress('در حال آماده‌سازی برای کپی...', 30);
            
            const config = this.exportFormats['high-quality'];
            const canvas = await this.createExportCanvas(config);
            
            this.updateProgress('در حال کپی کردن...', 80);
            
            const blob = await this.canvasToBlob(canvas, config);
            
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
                
                this.hideProgress();
                this.hidePanel();
                window.DACO.notifications.success('تصویر در کلیپ‌بورد کپی شد!');
                
                window.DACO.app?.trackEvent('image_copied_to_clipboard');
            } else {
                throw new Error('کپی در کلیپ‌بورد پشتیبانی نمی‌شود');
            }
            
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            this.hideProgress();
            window.DACO.notifications.error('خطا در کپی کردن: ' + error.message);
        }
    }

    async shareToSocial() {
        if (!navigator.share) {
            window.DACO.notifications.warning('اشتراک‌گذاری در این مرورگر پشتیبانی نمی‌شود');
            return;
        }

        try {
            this.showProgress('در حال آماده‌سازی برای اشتراک...', 30);
            
            const config = this.exportFormats['instagram-story'];
            const canvas = await this.createExportCanvas(config);
            
            this.updateProgress('در حال آماده‌سازی فایل...', 70);
            
            const blob = await this.canvasToBlob(canvas, config);
            const filename = this.generateFilename('story', config.format);
            
            const file = new File([blob], filename, { type: blob.type });
            
            this.updateProgress('در حال باز کردن اشتراک‌گذاری...', 90);
            
            await navigator.share({
                title: 'DACO Storymaker Pro',
                text: 'استوری ساخته شده با DACO Storymaker Pro',
                files: [file]
            });
            
            this.hideProgress();
            this.hidePanel();
            
            window.DACO.app?.trackEvent('image_shared');
            
        } catch (error) {
            this.hideProgress();
            
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                window.DACO.notifications.error('خطا در اشتراک‌گذاری: ' + error.message);
            }
        }
    }

    // Quick export functions
    async quickExport(format = 'high-quality') {
        await this.exportImage(format);
    }

    async exportForInstagram() {
        await this.exportImage('instagram-story');
    }

    async exportTransparent() {
        await this.exportImage('text-only');
    }

    // Batch export
    async batchExport(formats = ['high-quality', 'instagram-story']) {
        if (this.isExporting) {
            window.DACO.notifications.warning('در حال تولید تصویر قبلی...');
            return;
        }

        try {
            this.isExporting = true;
            this.showProgress('در حال تولید چندین فرمت...', 0);

            const results = [];
            
            for (let i = 0; i < formats.length; i++) {
                const format = formats[i];
                const progress = ((i + 1) / formats.length) * 90;
                
                this.updateProgress(`در حال تولید ${format}...`, progress);
                
                const config = this.exportFormats[format];
                const canvas = await this.createExportCanvas(config);
                const blob = await this.canvasToBlob(canvas, config);
                const filename = this.generateFilename(format, config.format);
                
                results.push({ blob, filename, format });
            }
            
            this.updateProgress('در حال دانلود فایل‌ها...', 95);
            
            // Download all files
            for (const result of results) {
                window.DACO.Utils.downloadFile(result.blob, result.filename);
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
            }
            
            this.hideProgress();
            this.hidePanel();
            
            window.DACO.notifications.success(`${formats.length} فایل با موفقیت دانلود شد!`);
            
            window.DACO.app?.trackEvent('batch_export', {
                formats: formats.join(','),
                count: formats.length
            });
            
        } catch (error) {
            console.error('Batch export failed:', error);
            this.hideProgress();
            window.DACO.notifications.error('خطا در تولید فایل‌ها: ' + error.message);
        } finally {
            this.isExporting = false;
        }
    }

    // Print functionality
    async printStory() {
        try {
            const config = { width: 1080, height: 1920, format: 'png', quality: 1 };
            const canvas = await this.createExportCanvas(config);
            
            const dataURL = canvas.toDataURL('image/png');
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>DACO Story Print</title>
                        <style>
                            body { margin: 0; padding: 20px; text-align: center; }
                            img { max-width: 100%; height: auto; }
                            @page { margin: 0.5in; }
                        </style>
                    </head>
                    <body>
                        <img src="${dataURL}" alt="DACO Story" />
                        <script>window.onload = () => { window.print(); window.close(); }</script>
                    </body>
                </html>
            `);
            
            window.DACO.app?.trackEvent('story_printed');
            
        } catch (error) {
            console.error('Print failed:', error);
            window.DACO.notifications.error('خطا در چاپ: ' + error.message);
        }
    }
}

// Global functions for HTML event handlers
window.showExportPanel = () => {
    if (window.DACO.export) {
        window.DACO.export.showPanel();
    }
};

window.hideExportPanel = () => {
    if (window.DACO.export) {
        window.DACO.export.hidePanel();
    }
};

window.exportImage = (type) => {
    if (window.DACO.export) {
        window.DACO.export.exportImage(type);
    }
};

window.copyToClipboard = () => {
    if (window.DACO.export) {
        window.DACO.export.copyToClipboard();
    }
};

window.shareToSocial = () => {
    if (window.DACO.export) {
        window.DACO.export.shareToSocial();
    }
};

// Export
window.DACO.ExportManager = ExportManager;