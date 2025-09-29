/**
 * Gesture Manager - Handles touch gestures and interactions
 */

class GestureManager {
    constructor() {
        this.isEnabled = true;
        this.touches = new Map();
        this.gestureState = {
            isPinching: false,
            isRotating: false,
            lastDistance: 0,
            lastAngle: 0,
            startScale: 1,
            startRotation: 0
        };
        this.imageGestures = {
            scale: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            minScale: 0.1,
            maxScale: 5
        };
        this.longPressTimer = null;
        this.longPressDuration = 500;
    }

    async init() {
        if (!this.isTouchDevice()) {
            console.log('👆 Touch device not detected, skipping gesture initialization');
            return;
        }

        this.setupEventListeners();
        this.setupImageGestures();
        
        console.log('👆 Gesture Manager initialized');
    }

    isTouchDevice() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    }

    setupEventListeners() {
        const canvas = document.getElementById('storyCanvas');
        if (!canvas) return;

        // Touch events for canvas
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

        // Prevent default zoom behavior
        canvas.addEventListener('gesturestart', (e) => e.preventDefault());
        canvas.addEventListener('gesturechange', (e) => e.preventDefault());
        canvas.addEventListener('gestureend', (e) => e.preventDefault());

        // Double tap handler
        let lastTap = 0;
        canvas.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0 && e.touches.length === 0) {
                this.handleDoubleTap(e);
            }
            
            lastTap = currentTime;
        });

        // Zoom controls
        this.setupZoomControls();
    }

    setupImageGestures() {
        const storyImage = document.getElementById('storyImage');
        if (!storyImage) return;

        storyImage.addEventListener('touchstart', this.handleImageTouchStart.bind(this), { passive: false });
        storyImage.addEventListener('touchmove', this.handleImageTouchMove.bind(this), { passive: false });
        storyImage.addEventListener('touchend', this.handleImageTouchEnd.bind(this), { passive: false });
    }

    setupZoomControls() {
        const zoomInBtn = document.querySelector('.zoom-btn[onclick="zoomIn()"]');
        const zoomOutBtn = document.querySelector('.zoom-btn[onclick="zoomOut()"]');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', this.zoomIn.bind(this));
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', this.zoomOut.bind(this));
        }
    }

    handleTouchStart(e) {
        if (!this.isEnabled) return;

        // Store touch information
        for (const touch of e.touches) {
            this.touches.set(touch.identifier, {
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: Date.now()
            });
        }

        // Handle different touch counts
        if (e.touches.length === 1) {
            this.handleSingleTouchStart(e);
        } else if (e.touches.length === 2) {
            this.handleTwoTouchStart(e);
        }

        // Start long press timer for single touch
        if (e.touches.length === 1) {
            this.startLongPress(e);
        } else {
            this.cancelLongPress();
        }
    }

    handleTouchMove(e) {
        if (!this.isEnabled) return;

        e.preventDefault();

        // Update touch positions
        for (const touch of e.touches) {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                touchData.currentX = touch.clientX;
                touchData.currentY = touch.clientY;
            }
        }

        // Cancel long press on move
        this.cancelLongPress();

        // Handle different touch counts
        if (e.touches.length === 1) {
            this.handleSingleTouchMove(e);
        } else if (e.touches.length === 2) {
            this.handleTwoTouchMove(e);
        }
    }

    handleTouchEnd(e) {
        if (!this.isEnabled) return;

        this.cancelLongPress();

        // Remove ended touches
        for (const touch of e.changedTouches) {
            this.touches.delete(touch.identifier);
        }

        // Reset gesture state when no touches remain
        if (e.touches.length === 0) {
            this.resetGestureState();
        } else if (e.touches.length === 1) {
            // Transition from multi-touch to single touch
            this.resetGestureState();
        }
    }

    handleTouchCancel(e) {
        this.handleTouchEnd(e);
    }

    handleSingleTouchStart(e) {
        // Single touch logic (dragging text elements)
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element && element.classList.contains('text-overlay')) {
            window.DACO.canvas?.selectElement(element);
        }
    }

    handleSingleTouchMove(e) {
        // Single touch move logic handled by canvas drag system
    }

    handleTwoTouchStart(e) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Calculate initial distance and angle
        this.gestureState.lastDistance = this.getDistance(touch1, touch2);
        this.gestureState.lastAngle = this.getAngle(touch1, touch2);
        this.gestureState.startScale = this.imageGestures.scale;
        this.gestureState.startRotation = this.imageGestures.rotation;
        this.gestureState.isPinching = true;

        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    handleTwoTouchMove(e) {
        if (!this.gestureState.isPinching) return;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const currentDistance = this.getDistance(touch1, touch2);
        const currentAngle = this.getAngle(touch1, touch2);

        // Calculate scale change
        const scaleChange = currentDistance / this.gestureState.lastDistance;
        const newScale = Math.max(
            this.imageGestures.minScale,
            Math.min(this.imageGestures.maxScale, this.gestureState.startScale * scaleChange)
        );

        // Calculate rotation change
        const rotationChange = currentAngle - this.gestureState.lastAngle;
        const newRotation = this.gestureState.startRotation + rotationChange;

        // Apply transformations
        this.updateImageTransform({
            scale: newScale,
            rotation: newRotation
        });

        // Update zoom level display
        this.updateZoomDisplay(newScale);
    }

    handleImageTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            
            this.imageGestures.startX = touch.clientX;
            this.imageGestures.startY = touch.clientY;
            this.imageGestures.startOffsetX = this.imageGestures.offsetX;
            this.imageGestures.startOffsetY = this.imageGestures.offsetY;
        }
    }

    handleImageTouchMove(e) {
        if (e.touches.length === 1 && !this.gestureState.isPinching) {
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.imageGestures.startX;
            const deltaY = touch.clientY - this.imageGestures.startY;

            this.updateImageTransform({
                offsetX: this.imageGestures.startOffsetX + deltaX,
                offsetY: this.imageGestures.startOffsetY + deltaY
            });
        }
    }

    handleImageTouchEnd(e) {
        // Save state after gesture
        if (window.DACO.app) {
            window.DACO.app.saveState();
        }
    }

    handleDoubleTap(e) {
        const storyImage = document.getElementById('storyImage');
        if (!storyImage || storyImage.style.display === 'none') {
            // Double tap on empty canvas to add text
            const canvas = document.getElementById('storyCanvas');
            const rect = canvas.getBoundingClientRect();
            const touch = e.changedTouches[0];
            
            const x = ((touch.clientX - rect.left) / rect.width) * 100;
            const y = ((touch.clientY - rect.top) / rect.height) * 100;
            
            if (window.DACO.canvas) {
                window.DACO.canvas.addTextElement('متن جدید', {
                    left: x + '%',
                    top: y + '%'
                });
            }
            
            window.DACO.notifications.info('متن جدید اضافه شد');
        } else {
            // Double tap on image to reset zoom
            this.resetImageTransform();
        }

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([10, 50, 10]);
        }

        window.DACO.app?.trackEvent('double_tap');
    }

    startLongPress(e) {
        this.cancelLongPress();
        
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress(e);
        }, this.longPressDuration);
    }

    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    handleLongPress(e) {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element && element.classList.contains('text-overlay')) {
            // Show context menu for text element
            if (window.DACO.canvas) {
                window.DACO.canvas.selectElement(element);
                window.DACO.canvas.showContextMenu(touch.clientX, touch.clientY);
            }
        } else {
            // Show general context menu or add text option
            this.showGeneralContextMenu(touch.clientX, touch.clientY);
        }

        // Strong haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        window.DACO.app?.trackEvent('long_press');
    }

    showGeneralContextMenu(x, y) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'gesture-context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 8px;
            z-index: 10000;
            animation: scaleIn 0.2s ease;
        `;

        contextMenu.innerHTML = `
            <div class="context-item" onclick="this.parentElement.remove(); window.addNewText();">
                ✏️ افزودن متن
            </div>
            <div class="context-item" onclick="this.parentElement.remove(); document.getElementById('hiddenImageInput').click();">
                🖼️ افزودن تصویر
            </div>
            <div class="context-item" onclick="this.parentElement.remove(); window.resetCanvas();">
                🔄 بازنشانی
            </div>
        `;

        document.body.appendChild(contextMenu);

        // Remove on click outside
        setTimeout(() => {
            document.addEventListener('click', function removeMenu(e) {
                if (!contextMenu.contains(e.target)) {
                    contextMenu.remove();
                    document.removeEventListener('click', removeMenu);
                }
            });
        }, 10);
    }

    updateImageTransform(updates) {
        // Update gesture state
        Object.assign(this.imageGestures, updates);
        
        // Apply to canvas image data
        if (window.DACO.canvas) {
            Object.assign(window.DACO.canvas.imageData, updates);
            window.DACO.canvas.updateImageTransform();
        }
    }

    resetImageTransform() {
        this.imageGestures = {
            scale: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            minScale: 0.1,
            maxScale: 5
        };

        this.updateImageTransform(this.imageGestures);
        this.updateZoomDisplay(1);
        
        window.DACO.notifications.info('تصویر بازنشانی شد');
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getAngle(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    resetGestureState() {
        this.gestureState = {
            isPinching: false,
            isRotating: false,
            lastDistance: 0,
            lastAngle: 0,
            startScale: 1,
            startRotation: 0
        };
    }

    zoomIn() {
        const newScale = Math.min(
            this.imageGestures.maxScale, 
            this.imageGestures.scale * 1.2
        );
        
        this.updateImageTransform({ scale: newScale });
        this.updateZoomDisplay(newScale);
        
        window.DACO.app?.trackEvent('zoom_in', { scale: newScale });
    }

    zoomOut() {
        const newScale = Math.max(
            this.imageGestures.minScale, 
            this.imageGestures.scale / 1.2
        );
        
        this.updateImageTransform({ scale: newScale });
        this.updateZoomDisplay(newScale);
        
        window.DACO.app?.trackEvent('zoom_out', { scale: newScale });
    }

    updateZoomDisplay(scale) {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(scale * 100) + '%';
        }

        // Update canvas zoom class for visual feedback
        const canvas = document.getElementById('storyCanvas');
        if (canvas) {
            canvas.classList.toggle('zoomed', scale > 1.1);
        }
    }

    // Swipe gesture detection
    detectSwipe(startTouch, endTouch) {
        const deltaX = endTouch.clientX - startTouch.startX;
        const deltaY = endTouch.clientY - startTouch.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const time = Date.now() - startTouch.startTime;

        // Minimum distance and maximum time for swipe
        if (distance > 50 && time < 300) {
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            
            let direction;
            if (angle > -45 && angle <= 45) direction = 'right';
            else if (angle > 45 && angle <= 135) direction = 'down';
            else if (angle > 135 || angle <= -135) direction = 'left';
            else direction = 'up';

            this.handleSwipe(direction);
        }
    }

    handleSwipe(direction) {
        switch (direction) {
            case 'left':
                // Next section
                this.nextSection();
                break;
            case 'right':
                // Previous section
                this.previousSection();
                break;
            case 'up':
                // Show export panel
                window.showExportPanel();
                break;
            case 'down':
                // Hide panels
                window.hideExportPanel();
                break;
        }

        window.DACO.app?.trackEvent('swipe', { direction });
    }

    nextSection() {
        const sections = ['text', 'color', 'background', 'effects', 'image'];
        const currentIndex = sections.indexOf(window.DACO.controls?.currentSection || 'text');
        const nextIndex = (currentIndex + 1) % sections.length;
        
        window.showSection(sections[nextIndex]);
    }

    previousSection() {
        const sections = ['text', 'color', 'background', 'effects', 'image'];
        const currentIndex = sections.indexOf(window.DACO.controls?.currentSection || 'text');
        const prevIndex = (currentIndex - 1 + sections.length) % sections.length;
        
        window.showSection(sections[prevIndex]);
    }

    // Accessibility enhancements
    enableAccessibilityGestures() {
        // Voice control integration
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            this.setupVoiceControl();
        }

        // Keyboard navigation for touch devices
        this.setupTouchKeyboardNavigation();
    }

    setupVoiceControl() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'fa-IR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            this.processVoiceCommand(command);
        };

        // Add voice control button
        this.addVoiceControlButton(recognition);
    }

    processVoiceCommand(command) {
        const commands = {
            'متن جدید': () => window.addNewText(),
            'تصویر جدید': () => document.getElementById('hiddenImageInput').click(),
            'ذخیره': () => window.showExportPanel(),
            'بازنشانی': () => window.resetCanvas(),
            'زوم بیشتر': () => this.zoomIn(),
            'زوم کمتر': () => this.zoomOut()
        };

        for (const [phrase, action] of Object.entries(commands)) {
            if (command.includes(phrase)) {
                action();
                window.DACO.notifications.success(`دستور "${phrase}" اجرا شد`);
                break;
            }
        }
    }

    addVoiceControlButton(recognition) {
        const voiceBtn = document.createElement('button');
        voiceBtn.innerHTML = '🎤';
        voiceBtn.className = 'voice-control-btn';
        voiceBtn.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 25px;
            background: var(--primary-color);
            color: white;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        `;

        voiceBtn.addEventListener('click', () => {
            recognition.start();
            voiceBtn.style.background = '#ff4444';
            
            setTimeout(() => {
                voiceBtn.style.background = 'var(--primary-color)';
            }, 3000);
        });

        document.body.appendChild(voiceBtn);
    }

    setupTouchKeyboardNavigation() {
        // Add virtual D-pad for precise element movement
        const dPad = document.createElement('div');
        dPad.className = 'virtual-dpad';
        dPad.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 120px;
            height: 120px;
            display: none;
            z-index: 1000;
        `;

        dPad.innerHTML = `
            <button class="dpad-btn dpad-up" onclick="window.DACO.gestures.moveSelected(0, -5)">▲</button>
            <button class="dpad-btn dpad-left" onclick="window.DACO.gestures.moveSelected(-5, 0)">◄</button>
            <button class="dpad-btn dpad-center" onclick="window.DACO.gestures.toggleDPad()">●</button>
            <button class="dpad-btn dpad-right" onclick="window.DACO.gestures.moveSelected(5, 0)">►</button>
            <button class="dpad-btn dpad-down" onclick="window.DACO.gestures.moveSelected(0, 5)">▼</button>
        `;

        document.body.appendChild(dPad);
        this.dPad = dPad;

        // Show D-pad when text is selected
        window.DACO.events.on('element-selected', () => {
            this.dPad.style.display = 'block';
        });

        window.DACO.events.on('element-deselected', () => {
            this.dPad.style.display = 'none';
        });
    }

    moveSelected(deltaX, deltaY) {
        if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
            window.DACO.canvas.moveElement(window.DACO.canvas.selectedElement, deltaX, deltaY);
        }
    }

    toggleDPad() {
        this.dPad.style.display = this.dPad.style.display === 'none' ? 'block' : 'none';
    }

    // Performance optimization for gestures
    throttleGestures(callback, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                callback.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Gesture recording for custom gestures
    recordGesture() {
        // Implementation for custom gesture recording
        // This could be used for power users to create custom shortcuts
    }

    // Clean up
    destroy() {
        this.cancelLongPress();
        this.touches.clear();
        this.resetGestureState();
        
        if (this.dPad) {
            this.dPad.remove();
        }
    }
}

// Global functions
window.zoomIn = () => {
    if (window.DACO.gestures) {
        window.DACO.gestures.zoomIn();
    }
};

window.zoomOut = () => {
    if (window.DACO.gestures) {
        window.DACO.gestures.zoomOut();
    }
};

window.toggleGrid = () => {
    const gridLines = document.getElementById('gridLines');
    const isVisible = gridLines && gridLines.style.display !== 'none';
    
    if (gridLines) {
        gridLines.style.display = isVisible ? 'none' : 'block';
        window.DACO.settings.grid = !isVisible;
        window.DACO.app?.saveSettings();
        
        window.DACO.notifications.info(
            isVisible ? 'خطوط راهنما پنهان شد' : 'خطوط راهنما نمایش داده شد'
        );
    }
};

// Export
window.DACO.GestureManager = GestureManager;