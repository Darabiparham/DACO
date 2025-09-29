/**
 * Canvas Manager - Handles canvas operations and text elements
 */

class CanvasManager {
    constructor() {
        this.canvas = null;
        this.canvasImage = null;
        this.selectedElement = null;
        this.elements = new Map();
        this.isDragging = false;
        this.dragData = {
            startX: 0,
            startY: 0,
            elementStartX: 0,
            elementStartY: 0
        };
        this.scale = 1;
        this.imageData = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
            filters: {}
        };
        this.guidelines = [];
        this.snapThreshold = 10;
    }

    async init() {
        this.canvas = document.getElementById('storyCanvas');
        this.canvasImage = document.getElementById('storyImage');
        
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        this.setupEventListeners();
        this.initializeDefaultText();
        this.setupDropZone();
        
        console.log('📐 Canvas Manager initialized');
    }

    setupEventListeners() {
        // Canvas click for deselection
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas || e.target.classList.contains('canvas-overlay')) {
                this.deselectElement();
            }
        });

        // Context menu
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.selectedElement) {
                this.showContextMenu(e.clientX, e.clientY);
            }
        });

        // Handle drag and drop
        this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
        this.canvas.addEventListener('drop', this.handleDrop.bind(this));

        // Resize observer
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.updateCanvasSize();
            });
            resizeObserver.observe(this.canvas);
        }
    }

    setupDropZone() {
        const dropZone = document.getElementById('dropZone');
        const canvasOverlay = document.getElementById('canvasOverlay');

        if (dropZone) {
            dropZone.addEventListener('click', () => {
                document.getElementById('hiddenImageInput')?.click();
            });
        }

        // Drag events
        this.canvas.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropZone?.classList.add('dragover');
        });

        this.canvas.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!this.canvas.contains(e.relatedTarget)) {
                dropZone?.classList.remove('dragover');
            }
        });
    }

    initializeDefaultText() {
        const defaultText = document.getElementById('defaultText');
        if (defaultText) {
            this.setupTextElement(defaultText);
            this.selectElement(defaultText);
        }
    }

    // Text Element Management
    addTextElement(text = 'متن جدید', options = {}) {
        const element = document.createElement('div');
        element.className = 'text-overlay';
        element.textContent = text;
        element.id = 'text_' + window.DACO.Utils.generateId();
        
        // Default positioning
        element.style.top = options.top || '30%';
        element.style.left = options.left || '50%';
        element.style.transform = 'translate(-50%, -50%)';
        
        // Apply styles
        if (options.fontSize) element.style.fontSize = options.fontSize + 'px';
        if (options.color) element.style.color = options.color;
        if (options.fontFamily) element.style.fontFamily = options.fontFamily;
        if (options.fontWeight) element.style.fontWeight = options.fontWeight;
        if (options.textAlign) element.style.textAlign = options.textAlign;
        
        this.canvas.appendChild(element);
        this.setupTextElement(element);
        this.selectElement(element);
        
        // Save state for undo
        window.DACO.app?.saveState();
        
        // Track event
        window.DACO.app?.trackEvent('text_added', {
            text: text.substring(0, 50),
            elementId: element.id
        });
        
        return element;
    }

    setupTextElement(element) {
        if (!element) return;

        // Store element data
        this.elements.set(element.id, {
            id: element.id,
            type: 'text',
            element: element,
            properties: this.getElementProperties(element)
        });

        // Make element interactive
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'textbox');
        element.setAttribute('aria-label', 'متن قابل ویرایش');

        // Event listeners
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectElement(element);
        });

        element.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.editElementText(element);
        });

        element.addEventListener('mousedown', this.startDrag.bind(this));
        element.addEventListener('touchstart', this.startDrag.bind(this));
        
        // Keyboard navigation
        element.addEventListener('keydown', (e) => {
            this.handleElementKeydown(e, element);
        });

        // Focus events
        element.addEventListener('focus', () => {
            this.selectElement(element);
        });
    }

    selectElement(element) {
        if (!element) return;

        // Deselect previous element
        if (this.selectedElement) {
            this.selectedElement.classList.remove('selected');
        }

        // Select new element
        this.selectedElement = element;
        element.classList.add('selected');
        window.DACO.state.selectedElement = element;

        // Update controls
        if (window.DACO.controls) {
            window.DACO.controls.updateFromElement(element);
        }

        // Show guidelines
        this.showGuidelines(element);

        // Emit event
        window.DACO.events.emit('element-selected', element);

        console.log('Selected element:', element.id);
    }

    deselectElement() {
        if (this.selectedElement) {
            this.selectedElement.classList.remove('selected');
            this.selectedElement = null;
            window.DACO.state.selectedElement = null;
            
            this.hideGuidelines();
            window.DACO.events.emit('element-deselected');
        }
    }

    deleteElement(element = this.selectedElement) {
        if (!element || element.id === 'defaultText') {
            window.DACO.notifications.warning('نمی‌توان متن پیش‌فرض را حذف کرد');
            return;
        }

        // Remove from DOM
        element.remove();
        
        // Remove from elements map
        this.elements.delete(element.id);
        
        // Update selection
        if (this.selectedElement === element) {
            this.deselectElement();
            // Select default text
            const defaultText = document.getElementById('defaultText');
            if (defaultText) {
                this.selectElement(defaultText);
            }
        }

        // Save state for undo
        window.DACO.app?.saveState();
        
        window.DACO.notifications.success('متن حذف شد');
        window.DACO.app?.trackEvent('text_deleted', { elementId: element.id });
    }

    duplicateElement(element = this.selectedElement) {
        if (!element) return null;

        const properties = this.getElementProperties(element);
        const newElement = this.addTextElement(element.textContent, {
            ...properties,
            top: (parseFloat(properties.top) + 5) + '%',
            left: (parseFloat(properties.left) + 5) + '%'
        });

        window.DACO.notifications.success('متن کپی شد');
        window.DACO.app?.trackEvent('text_duplicated');
        
        return newElement;
    }

    editElementText(element) {
        if (!element) return;

        const currentText = element.textContent;
        const textInput = document.getElementById('textInput');
        
        if (textInput) {
            textInput.value = currentText;
            textInput.focus();
            textInput.select();
        }
    }

    updateElementText(element, text) {
        if (!element || text === undefined) return;

        element.textContent = text;
        
        // Update character count
        this.updateCharacterCount(text);
        
        // Save state
        window.DACO.app?.saveState();
        
        window.DACO.events.emit('element-text-updated', { element, text });
    }

    updateCharacterCount(text) {
        const charCount = document.getElementById('charCount');
        if (charCount) {
            charCount.textContent = text.length;
            
            // Update color based on length
            if (text.length > 450) {
                charCount.style.color = 'var(--error-color)';
            } else if (text.length > 350) {
                charCount.style.color = 'var(--warning-color)';
            } else {
                charCount.style.color = 'var(--text-muted)';
            }
        }
    }

    // Drag and Drop Functionality
    startDrag(e) {
        if (!this.selectedElement) return;

        e.preventDefault();
        this.isDragging = true;

        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        this.dragData.startX = touch.clientX;
        this.dragData.startY = touch.clientY;

        const rect = this.selectedElement.getBoundingClientRect();
        this.dragData.elementStartX = rect.left;
        this.dragData.elementStartY = rect.top;

        // Add event listeners
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('touchmove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));
        document.addEventListener('touchend', this.stopDrag.bind(this));

        // Add dragging class
        this.selectedElement.classList.add('dragging');
        document.body.style.userSelect = 'none';

        window.DACO.app?.trackEvent('drag_start');
    }

    handleDrag(e) {
        if (!this.isDragging || !this.selectedElement) return;

        e.preventDefault();
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        
        const deltaX = touch.clientX - this.dragData.startX;
        const deltaY = touch.clientY - this.dragData.startY;

        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate new position relative to canvas
        const newX = ((this.dragData.elementStartX + deltaX - canvasRect.left) / canvasRect.width) * 100;
        const newY = ((this.dragData.elementStartY + deltaY - canvasRect.top) / canvasRect.height) * 100;

        // Apply snapping
        const snappedPosition = this.applySnapping(newX, newY);
        
        // Constrain to canvas bounds
        const constrainedX = Math.max(5, Math.min(95, snappedPosition.x));
        const constrainedY = Math.max(5, Math.min(95, snappedPosition.y));

        // Update position
        this.selectedElement.style.left = constrainedX + '%';
        this.selectedElement.style.top = constrainedY + '%';

        // Update guidelines
        this.updateGuidelines(constrainedX, constrainedY);
    }

    stopDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;

        // Remove event listeners
        document.removeEventListener('mousemove', this.handleDrag.bind(this));
        document.removeEventListener('touchmove', this.handleDrag.bind(this));
        document.removeEventListener('mouseup', this.stopDrag.bind(this));
        document.removeEventListener('touchend', this.stopDrag.bind(this));

        // Remove dragging class
        if (this.selectedElement) {
            this.selectedElement.classList.remove('dragging');
        }
        
        document.body.style.userSelect = '';
        
        // Hide guidelines
        this.hideGuidelines();
        
        // Save state
        window.DACO.app?.saveState();
        
        window.DACO.app?.trackEvent('drag_end');
    }

    // Snapping and Guidelines
    applySnapping(x, y) {
        const snapPoints = this.getSnapPoints();
        let snappedX = x;
        let snappedY = y;

        // Check horizontal snapping
        for (const point of snapPoints.horizontal) {
            if (Math.abs(x - point) < this.snapThreshold) {
                snappedX = point;
                break;
            }
        }

        // Check vertical snapping
        for (const point of snapPoints.vertical) {
            if (Math.abs(y - point) < this.snapThreshold) {
                snappedY = point;
                break;
            }
        }

        return { x: snappedX, y: snappedY };
    }

    getSnapPoints() {
        const points = {
            horizontal: [25, 50, 75], // Thirds and center
            vertical: [25, 50, 75]
        };

        // Add positions of other elements
        this.elements.forEach((data, id) => {
            if (data.element === this.selectedElement) return;
            
            const rect = data.element.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            const x = ((rect.left - canvasRect.left) / canvasRect.width) * 100;
            const y = ((rect.top - canvasRect.top) / canvasRect.height) * 100;
            
            points.horizontal.push(x);
            points.vertical.push(y);
        });

        return points;
    }

    showGuidelines(element) {
        if (!window.DACO.settings.grid) return;
        
        const guidelinesContainer = document.getElementById('guidelines');
        if (!guidelinesContainer) return;

        this.clearGuidelines();

        const rect = element.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const x = ((rect.left - canvasRect.left) / canvasRect.width) * 100;
        const y = ((rect.top - canvasRect.top) / canvasRect.height) * 100;

        // Vertical guideline
        const vGuideline = document.createElement('div');
        vGuideline.className = 'guideline vertical';
        vGuideline.style.left = x + '%';
        guidelinesContainer.appendChild(vGuideline);

        // Horizontal guideline
        const hGuideline = document.createElement('div');
        hGuideline.className = 'guideline horizontal';
        hGuideline.style.top = y + '%';
        guidelinesContainer.appendChild(hGuideline);

        this.guidelines = [vGuideline, hGuideline];
    }

    updateGuidelines(x, y) {
        if (this.guidelines.length >= 2) {
            this.guidelines[0].style.left = x + '%';
            this.guidelines[1].style.top = y + '%';
        }
    }

    hideGuidelines() {
        this.clearGuidelines();
    }

    clearGuidelines() {
        this.guidelines.forEach(guideline => {
            if (guideline.parentNode) {
                guideline.parentNode.removeChild(guideline);
            }
        });
        this.guidelines = [];
    }

    // Image Management
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(e) {
        e.preventDefault();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleImageUpload({ target: { files } });
        }
        
        document.getElementById('dropZone')?.classList.remove('dragover');
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        const errors = window.DACO.Utils.validateFile(file);
        if (errors.length > 0) {
            window.DACO.notifications.error(errors[0]);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.setCanvasImage(e.target.result);
            window.DACO.app?.trackEvent('image_uploaded', {
                size: file.size,
                type: file.type
            });
        };
        
        reader.onerror = () => {
            window.DACO.notifications.error('خطا در خواندن فایل');
        };
        
        reader.readAsDataURL(file);
    }

    setCanvasImage(src) {
        if (!this.canvasImage) return;

        this.canvasImage.src = src;
        this.canvasImage.style.display = 'block';
        
        // Hide drop zone
        const canvasOverlay = document.getElementById('canvasOverlay');
        if (canvasOverlay) {
            canvasOverlay.classList.add('hidden');
        }

        // Reset image transformations
        this.imageData = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
            filters: {}
        };
        
        this.updateImageTransform();
        
        // Show image controls
        const imageFilters = document.getElementById('imageFilters');
        const imageAdjustments = document.getElementById('imageAdjustments');
        if (imageFilters) imageFilters.style.display = 'block';
        if (imageAdjustments) imageAdjustments.style.display = 'block';
        
        window.DACO.notifications.success('تصویر با موفقیت بارگذاری شد');
        window.DACO.app?.saveState();
    }

    updateImageTransform() {
        if (!this.canvasImage) return;

        const { scale, offsetX, offsetY, rotation } = this.imageData;
        
        this.canvasImage.style.transform = 
            `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`;
    }

    // Utility Methods
    getElementProperties(element) {
        if (!element) return {};

        const style = getComputedStyle(element);
        
        return {
            fontSize: parseInt(style.fontSize),
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            textAlign: style.textAlign,
            color: style.color,
            backgroundColor: style.backgroundColor,
            opacity: style.opacity,
            textDecoration: style.textDecoration,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textShadow: style.textShadow,
            borderRadius: style.borderRadius,
            padding: style.padding,
            top: element.style.top,
            left: element.style.left,
            transform: element.style.transform
        };
    }

    applyElementProperties(element, properties) {
        if (!element || !properties) return;

        Object.keys(properties).forEach(prop => {
            if (properties[prop] !== undefined && properties[prop] !== '') {
                if (prop === 'top' || prop === 'left' || prop === 'transform') {
                    element.style[prop] = properties[prop];
                } else {
                    element.style[prop] = properties[prop];
                }
            }
        });
    }

    centerElement(element = this.selectedElement) {
        if (!element) return;

        element.style.top = '50%';
        element.style.left = '50%';
        element.style.transform = 'translate(-50%, -50%)';
        
        window.DACO.app?.saveState();
        window.DACO.notifications.info('متن در وسط قرار گرفت');
    }

    resetCanvas() {
        // Remove all text elements except default
        this.elements.forEach((data, id) => {
            if (id !== 'defaultText') {
                data.element.remove();
                this.elements.delete(id);
            }
        });

        // Reset default text
        const defaultText = document.getElementById('defaultText');
        if (defaultText) {
            defaultText.textContent = 'برای ویرایش متن کلیک کنید';
            defaultText.style.top = '50%';
            defaultText.style.left = '50%';
            defaultText.style.transform = 'translate(-50%, -50%)';
            this.selectElement(defaultText);
        }

        // Remove image
        if (this.canvasImage) {
            this.canvasImage.style.display = 'none';
            this.canvasImage.src = '';
        }

        // Show drop zone
        const canvasOverlay = document.getElementById('canvasOverlay');
        if (canvasOverlay) {
            canvasOverlay.classList.remove('hidden');
        }

        // Reset image data
        this.imageData = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
            filters: {}
        };

        // Hide image controls
        const imageFilters = document.getElementById('imageFilters');
        const imageAdjustments = document.getElementById('imageAdjustments');
        if (imageFilters) imageFilters.style.display = 'none';
        if (imageAdjustments) imageAdjustments.style.display = 'none';

        window.DACO.app?.saveState();
        window.DACO.notifications.success('کانواس بازنشانی شد');
    }

    updateCanvasSize() {
        // Responsive canvas sizing logic
        const container = this.canvas.parentElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const aspectRatio = CONFIG.CANVAS_SIZE.height / CONFIG.CANVAS_SIZE.width;
        
        let newWidth = Math.min(containerRect.width * 0.8, CONFIG.CANVAS_SIZE.width);
        let newHeight = newWidth * aspectRatio;
        
        if (newHeight > containerRect.height * 0.8) {
            newHeight = containerRect.height * 0.8;
            newWidth = newHeight / aspectRatio;
        }

        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
    }

    handleElementKeydown(e, element) {
        const step = e.shiftKey ? 10 : 1;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.moveElement(element, 0, -step);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.moveElement(element, 0, step);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.moveElement(element, -step, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.moveElement(element, step, 0);
                break;
            case 'Enter':
                e.preventDefault();
                this.editElementText(element);
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.deleteElement(element);
                break;
        }
    }

    moveElement(element, deltaX, deltaY) {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const currentX = ((rect.left - canvasRect.left) / canvasRect.width) * 100;
        const currentY = ((rect.top - canvasRect.top) / canvasRect.height) * 100;
        
        const newX = Math.max(5, Math.min(95, currentX + deltaX));
        const newY = Math.max(5, Math.min(95, currentY + deltaY));
        
        element.style.left = newX + '%';
        element.style.top = newY + '%';
        
        window.DACO.app?.saveState();
    }

    showContextMenu(x, y) {
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;

        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';

        // Hide on click outside
        const hideMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
                document.removeEventListener('click', hideMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 10);
    }

    // State management
    getState() {
        return {
            selectedElementId: this.selectedElement?.id,
            imageData: this.imageData,
            elements: Array.from(this.elements.values()).map(data => ({
                id: data.id,
                type: data.type,
                properties: this.getElementProperties(data.element),
                content: data.element.textContent
            }))
        };
    }

    restoreState(state) {
        if (!state) return;

        // Restore image
        if (state.imageData) {
            this.imageData = state.imageData;
            this.updateImageTransform();
        }

        // Restore elements
        if (state.elements) {
            state.elements.forEach(elementData => {
                let element = document.getElementById(elementData.id);
                
                if (!element && elementData.id !== 'defaultText') {
                    element = this.addTextElement(elementData.content, elementData.properties);
                    element.id = elementData.id;
                } else if (element) {
                    element.textContent = elementData.content;
                    this.applyElementProperties(element, elementData.properties);
                }
            });
        }

        // Restore selection
        if (state.selectedElementId) {
            const element = document.getElementById(state.selectedElementId);
            if (element) {
                this.selectElement(element);
            }
        }
    }
}

// Global functions
window.addNewText = () => {
    if (window.DACO.canvas) {
        window.DACO.canvas.addTextElement();
    }
};

window.resetCanvas = () => {
    if (window.DACO.canvas) {
        window.DACO.canvas.resetCanvas();
    }
};

window.centerElements = () => {
    if (window.DACO.canvas) {
        window.DACO.canvas.centerElement();
    }
};

window.duplicateSelected = () => {
    if (window.DACO.canvas) {
        window.DACO.canvas.duplicateElement();
    }
};

window.deleteSelected = () => {
    if (window.DACO.canvas) {
        window.DACO.canvas.deleteElement();
    }
};

window.handleImageUpload = (event) => {
    if (window.DACO.canvas) {
        window.DACO.canvas.handleImageUpload(event);
    }
};

// Context menu functions
window.copyElement = () => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        const text = window.DACO.canvas.selectedElement.textContent;
        window.DACO.Utils.copyToClipboard(text);
        window.DACO.notifications.success('متن کپی شد');
    }
};

window.duplicateElement = () => {
    window.duplicateSelected();
};

window.deleteElement = () => {
    window.deleteSelected();
};

window.bringToFront = () => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        window.DACO.canvas.selectedElement.style.zIndex = '30';
        window.DACO.notifications.info('متن به جلو آمد');
    }
};

window.sendToBack = () => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        window.DACO.canvas.selectedElement.style.zIndex = '10';
        window.DACO.notifications.info('متن به عقب رفت');
    }
};

// Export
window.DACO.CanvasManager = CanvasManager;