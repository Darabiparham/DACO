/**
 * Controls Manager - Handles UI controls and text styling
 */

class ControlsManager {
    constructor() {
        this.currentSection = 'text';
        this.currentElement = null;
        this.defaultValues = {
            fontSize: 24,
            fontFamily: 'Vazirmatn',
            color: '#ffffff',
            backgroundColor: '#000000',
            opacity: 100,
            bgOpacity: 0,
            lineHeight: 1.2,
            letterSpacing: 0,
            borderRadius: 0,
            padding: 8,
            shadow: 0,
            stroke: 0,
            glow: 0
        };
    }

    async init() {
        this.setupEventListeners();
        this.initializeControls();
        
        console.log('🎛️ Controls Manager initialized');
    }

    setupEventListeners() {
        // Text input
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.addEventListener('input', this.handleTextInput.bind(this));
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    textInput.blur();
                }
            });
        }

        // Sliders
        this.setupSlider('sizeSlider', 'sizeValue', this.handleFontSize.bind(this), 'px');
        this.setupSlider('opacitySlider', 'opacityValue', this.handleOpacity.bind(this), '%');
        this.setupSlider('bgOpacitySlider', 'bgOpacityValue', this.handleBgOpacity.bind(this), '%');
        this.setupSlider('lineHeightSlider', 'lineHeightValue', this.handleLineHeight.bind(this));
        this.setupSlider('letterSpacingSlider', 'letterSpacingValue', this.handleLetterSpacing.bind(this), 'px');
        this.setupSlider('borderRadiusSlider', 'borderRadiusValue', this.handleBorderRadius.bind(this), 'px');
        this.setupSlider('paddingSlider', 'paddingValue', this.handlePadding.bind(this), 'px');
        this.setupSlider('shadowSlider', 'shadowValue', this.handleShadow.bind(this), 'px');
        this.setupSlider('strokeSlider', 'strokeValue', this.handleStroke.bind(this), 'px');
        this.setupSlider('glowSlider', 'glowValue', this.handleGlow.bind(this), 'px');
        this.setupSlider('bgBlurSlider', 'bgBlurValue', this.handleBgBlur.bind(this), 'px');

        // Image adjustment sliders
        this.setupSlider('brightnessSlider', 'brightnessValue', this.handleBrightness.bind(this), '%');
        this.setupSlider('contrastSlider', 'contrastValue', this.handleContrast.bind(this), '%');
        this.setupSlider('saturationSlider', 'saturationValue', this.handleSaturation.bind(this), '%');

        // Color pickers
        this.setupColorPicker('textColorPicker', this.handleTextColor.bind(this));
        this.setupColorPicker('bgColorPicker', this.handleBgColor.bind(this));
        this.setupColorPicker('shadowColorPicker', this.handleShadowColor.bind(this));
        this.setupColorPicker('strokeColorPicker', this.handleStrokeColor.bind(this));

        // Controls toggle
        const controlsToggle = document.getElementById('controlsToggle');
        if (controlsToggle) {
            controlsToggle.addEventListener('click', this.toggleControls.bind(this));
        }

        // Listen for element selection
        window.DACO.events.on('element-selected', this.updateFromElement.bind(this));
        window.DACO.events.on('element-deselected', this.clearControls.bind(this));
    }

    setupSlider(sliderId, valueId, handler, unit = '') {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueDisplay.textContent = value + unit;
                handler(value);
            });
            
            slider.addEventListener('change', () => {
                window.DACO.app?.saveState();
            });
        }
    }

    setupColorPicker(pickerId, handler) {
        const picker = document.getElementById(pickerId);
        if (picker) {
            picker.addEventListener('change', (e) => {
                handler(e.target.value);
                window.DACO.app?.saveState();
            });
        }
    }

    initializeControls() {
        // Set default values
        this.setSliderValue('sizeSlider', 'sizeValue', this.defaultValues.fontSize, 'px');
        this.setSliderValue('opacitySlider', 'opacityValue', this.defaultValues.opacity, '%');
        this.setSliderValue('bgOpacitySlider', 'bgOpacityValue', this.defaultValues.bgOpacity, '%');
        this.setSliderValue('lineHeightSlider', 'lineHeightValue', this.defaultValues.lineHeight);
        this.setSliderValue('letterSpacingSlider', 'letterSpacingValue', this.defaultValues.letterSpacing, 'px');
        
        // Set default colors
        this.setColorValue('textColorPicker', this.defaultValues.color);
        this.setColorValue('bgColorPicker', this.defaultValues.backgroundColor);
        
        // Set default font
        this.setActiveFont(this.defaultValues.fontFamily);
    }

    setSliderValue(sliderId, valueId, value, unit = '') {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        if (slider) slider.value = value;
        if (valueDisplay) valueDisplay.textContent = value + unit;
    }

    setColorValue(pickerId, color) {
        const picker = document.getElementById(pickerId);
        if (picker) picker.value = color;
    }

    setActiveFont(fontFamily) {
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === fontFamily);
        });
    }

    // Text Handlers
    handleTextInput(e) {
        const text = e.target.value;
        if (this.currentElement) {
            window.DACO.canvas?.updateElementText(this.currentElement, text);
        }
    }

    // Font Handlers
    handleFontSize(size) {
        if (this.currentElement) {
            this.currentElement.style.fontSize = size + 'px';
            this.updateElementStyle();
        }
    }

    handleLineHeight(lineHeight) {
        if (this.currentElement) {
            this.currentElement.style.lineHeight = lineHeight;
            this.updateElementStyle();
        }
    }

    handleLetterSpacing(spacing) {
        if (this.currentElement) {
            this.currentElement.style.letterSpacing = spacing + 'px';
            this.updateElementStyle();
        }
    }

    // Color Handlers
    handleTextColor(color) {
        if (this.currentElement) {
            const opacity = document.getElementById('opacitySlider')?.value / 100 || 1;
            const rgb = window.DACO.Utils.hexToRgb(color);
            if (rgb) {
                this.currentElement.style.color = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
                this.updateElementStyle();
            }
        }
    }

    handleOpacity(opacity) {
        if (this.currentElement) {
            const colorPicker = document.getElementById('textColorPicker');
            if (colorPicker) {
                const rgb = window.DACO.Utils.hexToRgb(colorPicker.value);
                if (rgb) {
                    this.currentElement.style.color = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity / 100})`;
                    this.updateElementStyle();
                }
            }
        }
    }

    handleBgColor(color) {
        if (this.currentElement) {
            const opacity = document.getElementById('bgOpacitySlider')?.value / 100 || 0;
            const rgb = window.DACO.Utils.hexToRgb(color);
            if (rgb && opacity > 0) {
                this.currentElement.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
            } else {
                this.currentElement.style.backgroundColor = 'transparent';
            }
            this.updateElementStyle();
        }
    }

    handleBgOpacity(opacity) {
        if (this.currentElement) {
            const colorPicker = document.getElementById('bgColorPicker');
            if (colorPicker) {
                const rgb = window.DACO.Utils.hexToRgb(colorPicker.value);
                if (rgb && opacity > 0) {
                    this.currentElement.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity / 100})`;
                } else {
                    this.currentElement.style.backgroundColor = 'transparent';
                }
                this.updateElementStyle();
            }
        }
    }

    handleBgBlur(blur) {
        if (this.currentElement) {
            this.currentElement.style.backdropFilter = blur > 0 ? `blur(${blur}px)` : 'none';
            this.updateElementStyle();
        }
    }

    handleBorderRadius(radius) {
        if (this.currentElement) {
            this.currentElement.style.borderRadius = radius + 'px';
            this.updateElementStyle();
        }
    }

    handlePadding(padding) {
        if (this.currentElement) {
            this.currentElement.style.padding = padding + 'px';
            this.updateElementStyle();
        }
    }

    // Effect Handlers
    handleShadow(shadowSize) {
        if (this.currentElement) {
            const shadowColorPicker = document.getElementById('shadowColorPicker');
            const shadowColor = shadowColorPicker?.value || '#000000';
            
            if (shadowSize > 0) {
                this.currentElement.style.textShadow = `0 0 ${shadowSize}px ${shadowColor}`;
            } else {
                this.currentElement.style.textShadow = 'none';
            }
            this.updateElementStyle();
        }
    }

    handleShadowColor(color) {
        if (this.currentElement) {
            const shadowSlider = document.getElementById('shadowSlider');
            const shadowSize = shadowSlider?.value || 0;
            
            if (shadowSize > 0) {
                this.currentElement.style.textShadow = `0 0 ${shadowSize}px ${color}`;
                this.updateElementStyle();
            }
        }
    }

    handleStroke(strokeWidth) {
        if (this.currentElement) {
            const strokeColorPicker = document.getElementById('strokeColorPicker');
            const strokeColor = strokeColorPicker?.value || '#000000';
            
            if (strokeWidth > 0) {
                this.currentElement.style.webkitTextStroke = `${strokeWidth}px ${strokeColor}`;
                this.currentElement.style.textStroke = `${strokeWidth}px ${strokeColor}`;
            } else {
                this.currentElement.style.webkitTextStroke = 'none';
                this.currentElement.style.textStroke = 'none';
            }
            this.updateElementStyle();
        }
    }

    handleStrokeColor(color) {
        if (this.currentElement) {
            const strokeSlider = document.getElementById('strokeSlider');
            const strokeWidth = strokeSlider?.value || 0;
            
            if (strokeWidth > 0) {
                this.currentElement.style.webkitTextStroke = `${strokeWidth}px ${color}`;
                this.currentElement.style.textStroke = `${strokeWidth}px ${color}`;
                this.updateElementStyle();
            }
        }
    }

    handleGlow(glowSize) {
        if (this.currentElement) {
            if (glowSize > 0) {
                const currentColor = getComputedStyle(this.currentElement).color;
                this.currentElement.style.filter = `drop-shadow(0 0 ${glowSize}px ${currentColor})`;
            } else {
                this.currentElement.style.filter = 'none';
            }
            this.updateElementStyle();
        }
    }

    // Image Filter Handlers
    handleBrightness(brightness) {
        this.updateImageFilter('brightness', brightness + '%');
    }

    handleContrast(contrast) {
        this.updateImageFilter('contrast', contrast + '%');
    }

    handleSaturation(saturation) {
        this.updateImageFilter('saturate', saturation + '%');
    }

    updateImageFilter(filterName, value) {
        const storyImage = document.getElementById('storyImage');
        if (!storyImage) return;

        if (!window.DACO.canvas.imageData.filters) {
            window.DACO.canvas.imageData.filters = {};
        }

        window.DACO.canvas.imageData.filters[filterName] = value;

        const filters = Object.entries(window.DACO.canvas.imageData.filters)
            .map(([name, val]) => `${name}(${val})`)
            .join(' ');

        storyImage.style.filter = filters;
        window.DACO.app?.saveState();
    }

    // Section Management
    showSection(section) {
        this.currentSection = section;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        // Show/hide control sections
        document.querySelectorAll('.control-section').forEach(sectionEl => {
            sectionEl.classList.toggle('active', sectionEl.id === section + 'Section');
        });

        // Track section change
        window.DACO.app?.trackEvent('section_changed', { section });
    }

    toggleControls() {
        const controlsPanel = document.getElementById('controlsPanel');
        const controlsToggle = document.getElementById('controlsToggle');
        
        if (controlsPanel && controlsToggle) {
            const isCollapsed = controlsPanel.classList.contains('collapsed');
            
            controlsPanel.classList.toggle('collapsed');
            controlsToggle.textContent = isCollapsed ? '−' : '+';
            
            window.DACO.app?.trackEvent('controls_toggled', { collapsed: !isCollapsed });
        }
    }

    // Update from Element
    updateFromElement(element) {
        if (!element) return;
        
        this.currentElement = element;
        
        const style = getComputedStyle(element);
        
        // Update text input
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.value = element.textContent;
        }
        
        // Update character count
        window.DACO.canvas?.updateCharacterCount(element.textContent);
        
        // Update font size
        const fontSize = parseInt(style.fontSize);
        this.setSliderValue('sizeSlider', 'sizeValue', fontSize, 'px');
        
        // Update opacity
        const opacity = Math.round(parseFloat(style.opacity) * 100);
        this.setSliderValue('opacitySlider', 'opacityValue', opacity, '%');
        
        // Update line height
        const lineHeight = parseFloat(style.lineHeight) || 1.2;
        this.setSliderValue('lineHeightSlider', 'lineHeightValue', lineHeight);
        
        // Update letter spacing
        const letterSpacing = parseFloat(style.letterSpacing) || 0;
        this.setSliderValue('letterSpacingSlider', 'letterSpacingValue', letterSpacing, 'px');
        
        // Update font family
        const fontFamily = style.fontFamily.replace(/['"]/g, '').split(',')[0];
        this.setActiveFont(fontFamily);
        
        // Update text align
        this.updateTextAlignButtons(style.textAlign);
        
        // Update style buttons
        this.updateStyleButtons(style);
        
        // Update colors
        this.updateColorFromStyle(style);
    }

    updateColorFromStyle(style) {
        // Extract RGB values from computed style
        const colorMatch = style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (colorMatch) {
            const [, r, g, b] = colorMatch;
            const hex = window.DACO.Utils.rgbToHex(parseInt(r), parseInt(g), parseInt(b));
            this.setColorValue('textColorPicker', hex);
        }
        
        // Background color
        const bgColorMatch = style.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (bgColorMatch) {
            const [, r, g, b, a] = bgColorMatch;
            const hex = window.DACO.Utils.rgbToHex(parseInt(r), parseInt(g), parseInt(b));
            this.setColorValue('bgColorPicker', hex);
            
            const alpha = parseFloat(a || 1) * 100;
            this.setSliderValue('bgOpacitySlider', 'bgOpacityValue', alpha, '%');
        } else {
            this.setSliderValue('bgOpacitySlider', 'bgOpacityValue', 0, '%');
        }
    }

    updateTextAlignButtons(textAlign) {
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === textAlign);
        });
    }

    updateStyleButtons(style) {
        // Bold
        const boldBtn = document.getElementById('boldBtn');
        if (boldBtn) {
            boldBtn.classList.toggle('active', 
                style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600);
        }
        
        // Italic
        const italicBtn = document.getElementById('italicBtn');
        if (italicBtn) {
            italicBtn.classList.toggle('active', style.fontStyle === 'italic');
        }
        
        // Underline
        const underlineBtn = document.getElementById('underlineBtn');
        if (underlineBtn) {
            underlineBtn.classList.toggle('active', 
                style.textDecoration.includes('underline'));
        }
        
        // Strikethrough
        const strikeBtn = document.getElementById('strikeBtn');
        if (strikeBtn) {
            strikeBtn.classList.toggle('active', 
                style.textDecoration.includes('line-through'));
        }
    }

    clearControls() {
        this.currentElement = null;
        
        // Reset text input
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.value = '';
        }
        
        // Reset character count
        window.DACO.canvas?.updateCharacterCount('');
    }

    updateElementStyle() {
        // Mark as having unsaved changes
        window.DACO.state.hasUnsavedChanges = true;
        
        // Emit event for other components
        window.DACO.events.emit('element-style-updated', this.currentElement);
    }

    // Preset functions
    applyPresetColor(type, color) {
        if (type === 'text') {
            this.setColorValue('textColorPicker', color);
            this.handleTextColor(color);
        } else if (type === 'bg') {
            this.setColorValue('bgColorPicker', color);
            this.handleBgColor(color);
        }
    }

    applyImageFilter(filterName) {
        const storyImage = document.getElementById('storyImage');
        if (!storyImage) return;

        // Reset other filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filterName);
        });

        let filterValue = '';
        switch (filterName) {
            case 'none':
                filterValue = '';
                break;
            case 'grayscale':
                filterValue = 'grayscale(100%)';
                break;
            case 'sepia':
                filterValue = 'sepia(100%)';
                break;
            case 'blur':
                filterValue = 'blur(2px)';
                break;
            case 'brightness':
                filterValue = 'brightness(120%)';
                break;
            case 'contrast':
                filterValue = 'contrast(120%)';
                break;
            case 'vintage':
                filterValue = 'sepia(50%) contrast(120%) saturate(80%)';
                break;
        }

        storyImage.style.filter = filterValue;
        window.DACO.app?.saveState();
        
        window.DACO.notifications.info(`فیلتر ${filterName} اعمال شد`);
    }
}

// Global functions for HTML event handlers
window.showSection = (section) => {
    if (window.DACO.controls) {
        window.DACO.controls.showSection(section);
    }
};

window.toggleControls = () => {
    if (window.DACO.controls) {
        window.DACO.controls.toggleControls();
    }
};

window.changeFont = (button, fontFamily) => {
    // Update button states
    document.querySelectorAll('.font-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Apply font
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        window.DACO.canvas.selectedElement.style.fontFamily = `'${fontFamily}', sans-serif`;
        window.DACO.app?.saveState();
        window.DACO.notifications.success(`فونت به ${fontFamily} تغییر کرد`);
    }
};

window.toggleBold = () => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        const element = window.DACO.canvas.selectedElement;
        const currentWeight = getComputedStyle(element).fontWeight;
        const isBold = currentWeight === 'bold' || parseInt(currentWeight) >= 600;
        
        element.style.fontWeight = isBold ? 'normal' : 'bold';
        document.getElementById('boldBtn')?.classList.toggle('active', !isBold);
        window.DACO.app?.saveState();
    }
};

window.toggleItalic = () => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        const element = window.DACO.canvas.selectedElement;
        const currentStyle = getComputedStyle(element).fontStyle;
        const isItalic = currentStyle === 'italic';
        
        element.style.fontStyle = isItalic ? 'normal' : 'italic';
        document.getElementById('italicBtn')?.classList.toggle('active', !isItalic);
        window.DACO.app?.saveState();
    }
};

window.toggleUnderline = () => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        const element = window.DACO.canvas.selectedElement;
        const currentDecoration = getComputedStyle(element).textDecoration;
        const hasUnderline = currentDecoration.includes('underline');
        
        if (hasUnderline) {
            element.style.textDecoration = currentDecoration.replace('underline', '').trim() || 'none';
        } else {
            element.style.textDecoration = currentDecoration === 'none' ? 'underline' : currentDecoration + ' underline';
        }
        
        document.getElementById('underlineBtn')?.classList.toggle('active', !hasUnderline);
        window.DACO.app?.saveState();
    }
};

window.toggleStrikethrough = () => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        const element = window.DACO.canvas.selectedElement;
        const currentDecoration = getComputedStyle(element).textDecoration;
        const hasStrike = currentDecoration.includes('line-through');
        
        if (hasStrike) {
            element.style.textDecoration = currentDecoration.replace('line-through', '').trim() || 'none';
        } else {
            element.style.textDecoration = currentDecoration === 'none' ? 'line-through' : currentDecoration + ' line-through';
        }
        
        document.getElementById('strikeBtn')?.classList.toggle('active', !hasStrike);
        window.DACO.app?.saveState();
    }
};

window.setTextAlign = (align) => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        window.DACO.canvas.selectedElement.style.textAlign = align;
        
        // Update button states
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === align);
        });
        
        window.DACO.app?.saveState();
    }
};

window.changeSize = (size) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleFontSize(size);
    }
};

window.increaseSize = () => {
    const slider = document.getElementById('sizeSlider');
    if (slider) {
        const newValue = Math.min(120, parseInt(slider.value) + 4);
        slider.value = newValue;
        window.changeSize(newValue);
    }
};

window.decreaseSize = () => {
    const slider = document.getElementById('sizeSlider');
    if (slider) {
        const newValue = Math.max(12, parseInt(slider.value) - 4);
        slider.value = newValue;
        window.changeSize(newValue);
    }
};

window.changeLineHeight = (lineHeight) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleLineHeight(lineHeight);
    }
};

window.changeLetterSpacing = (spacing) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleLetterSpacing(spacing);
    }
};

window.changeTextColor = (color) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleTextColor(color);
    }
};

window.changeOpacity = (opacity) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleOpacity(opacity);
    }
};

window.changeBgColor = (color) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleBgColor(color);
    }
};

window.changeBgOpacity = (opacity) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleBgOpacity(opacity);
    }
};

window.changeBgBlur = (blur) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleBgBlur(blur);
    }
};

window.changeBorderRadius = (radius) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleBorderRadius(radius);
    }
};

window.changePadding = (padding) => {
    if (window.DACO.controls) {
        window.DACO.controls.handlePadding(padding);
    }
};

window.changeShadow = (shadow) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleShadow(shadow);
    }
};

window.changeShadowColor = (color) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleShadowColor(color);
    }
};

window.changeStroke = (stroke) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleStroke(stroke);
    }
};

window.changeStrokeColor = (color) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleStrokeColor(color);
    }
};

window.changeGlow = (glow) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleGlow(glow);
    }
};

window.setPresetColor = (type, color) => {
    if (window.DACO.controls) {
        window.DACO.controls.applyPresetColor(type, color);
    }
};

window.applyFilter = (filterName) => {
    if (window.DACO.controls) {
        window.DACO.controls.applyImageFilter(filterName);
    }
};

window.adjustBrightness = (brightness) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleBrightness(brightness);
    }
};

window.adjustContrast = (contrast) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleContrast(contrast);
    }
};

window.adjustSaturation = (saturation) => {
    if (window.DACO.controls) {
        window.DACO.controls.handleSaturation(saturation);
    }
};

window.clearText = () => {
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.value = '';
        if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
            window.DACO.canvas.updateElementText(window.DACO.canvas.selectedElement, '');
        }
    }
};

// Animation functions
window.applyAnimation = (animationType) => {
    if (!window.DACO.canvas || !window.DACO.canvas.selectedElement) return;
    
    const element = window.DACO.canvas.selectedElement;
    
    // Remove existing animation classes
    element.classList.remove('animate-pulse', 'animate-bounce', 'animate-shake', 'animate-glow', 'animate-typewriter');
    
    // Update button states
    document.querySelectorAll('.animation-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.animation === animationType);
    });
    
    // Apply new animation
    if (animationType !== 'none') {
        element.classList.add(`animate-${animationType}`);
        window.DACO.notifications.success(`انیمیشن ${animationType} اعمال شد`);
    } else {
        window.DACO.notifications.info('انیمیشن حذف شد');
    }
    
    window.DACO.app?.saveState();
};

// Gradient functions
window.toggleGradient = () => {
    const gradientToggle = document.getElementById('gradientToggle');
    const gradientOptions = document.getElementById('gradientOptions');
    
    if (gradientToggle && gradientOptions) {
        const isActive = gradientToggle.classList.contains('active');
        
        gradientToggle.classList.toggle('active');
        gradientOptions.style.display = isActive ? 'none' : 'block';
        
        gradientToggle.textContent = isActive ? '🌈 فعال‌سازی گرادینت' : '🌈 غیرفعال‌سازی گرادینت';
    }
};

window.applyGradient = (gradient) => {
    if (window.DACO.canvas && window.DACO.canvas.selectedElement) {
        window.DACO.canvas.selectedElement.style.background = gradient;
        window.DACO.canvas.selectedElement.style.webkitBackgroundClip = 'text';
        window.DACO.canvas.selectedElement.style.webkitTextFillColor = 'transparent';
        window.DACO.canvas.selectedElement.style.backgroundClip = 'text';
        
        window.DACO.notifications.success('گرادینت اعمال شد');
        window.DACO.app?.saveState();
    }
};

// Export
window.DACO.ControlsManager = ControlsManager;