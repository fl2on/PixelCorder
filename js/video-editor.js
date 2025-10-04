// Video Editor for PixelCorder
// Modern, intuitive, and fully functional video editor

class ProfessionalVideoEditor {
    constructor(pixelCorder) {
        this.pixelCorder = pixelCorder;
        this.modal = null;
        this.video = null;
        this.editorState = {
            rotation: 0,
            flipH: false,
            flipV: false,
            brightness: 100,
            contrast: 100,
            saturation: 100,
            hue: 0,
            blur: 0,
            volume: 100,
            trimStart: 0,
            trimEnd: null,
            speed: 1,
            preset: 'none',
            history: [],
            historyIndex: -1
        };
    }

    open(recording) {
        console.log('Opening Professional Video Editor for:', recording.name);
        
        // Create URL from blob if provided, otherwise use existing url
        if (recording.blob) {
            this.videoUrl = URL.createObjectURL(recording.blob);
        } else if (recording.url) {
            this.videoUrl = recording.url;
        } else {
            console.error('No blob or url provided for video');
            this.pixelCorder.showNotification('Error: No video source provided', 'error');
            return;
        }
        
        this.createModal(recording);
        document.body.appendChild(this.modal);
        document.body.style.overflow = 'hidden';
        this.setup(recording);
    }

    createModal(recording) {
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 z-[100] bg-black flex';
        this.modal.innerHTML = this.getHTML(recording);
    }

    getHTML(recording) {
        return `
            <div class="w-full h-full flex flex-col">
                <!-- Top Bar -->
                <div class="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <button id="closeEditorBtn" class="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                            <i class="fas fa-arrow-left"></i>
                            <span>Back</span>
                        </button>
                        <div class="h-6 w-px bg-gray-700"></div>
                        <h3 class="text-lg font-semibold text-white flex items-center">
                            <i class="fas fa-film mr-2 text-purple-500"></i>
                            ${recording.name}
                        </h3>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button id="undoBtn" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors" title="Undo">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button id="redoBtn" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors" title="Redo">
                            <i class="fas fa-redo"></i>
                        </button>
                        <div class="h-6 w-px bg-gray-700"></div>
                        <button id="exportVideoBtn" class="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded text-white font-medium transition-colors flex items-center space-x-2">
                            <i class="fas fa-download"></i>
                            <span>Export</span>
                        </button>
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="flex-1 flex overflow-hidden">
                    ${this.getLeftSidebarHTML()}
                    ${this.getCenterPreviewHTML(recording)}
                </div>
            </div>
            ${this.getStylesHTML()}
        `;
    }

    getLeftSidebarHTML() {
        return `
            <!-- Left Sidebar - Tools -->
            <div class="w-72 bg-gray-900 border-r border-gray-700 overflow-y-auto custom-scrollbar">
                <div class="p-4 space-y-4">
                    <!-- Tools Tabs -->
                    <div class="flex space-x-2 bg-gray-800 rounded-lg p-1">
                        <button class="tool-tab active flex-1 px-3 py-2 rounded text-sm font-medium transition-colors" data-tab="transform">
                            <i class="fas fa-crop mr-1"></i> Transform
                        </button>
                        <button class="tool-tab flex-1 px-3 py-2 rounded text-sm font-medium transition-colors" data-tab="effects">
                            <i class="fas fa-magic mr-1"></i> Effects
                        </button>
                        <button class="tool-tab flex-1 px-3 py-2 rounded text-sm font-medium transition-colors" data-tab="audio">
                            <i class="fas fa-volume-up mr-1"></i> Audio
                        </button>
                    </div>
                    
                    <!-- Transform Tab -->
                    <div id="transform-tab" class="tool-panel">
                        ${this.getTransformTabHTML()}
                    </div>
                    
                    <!-- Effects Tab -->
                    <div id="effects-tab" class="tool-panel hidden">
                        ${this.getEffectsTabHTML()}
                    </div>
                    
                    <!-- Audio Tab -->
                    <div id="audio-tab" class="tool-panel hidden">
                        ${this.getAudioTabHTML()}
                    </div>
                </div>
            </div>
        `;
    }

    getTransformTabHTML() {
        return `
            <div class="space-y-4">
                <!-- Trim Section -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
                        <i class="fas fa-cut text-blue-400 mr-2"></i>
                        Trim Video
                    </h4>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Start Time</span>
                                <span id="trimStartDisplay">00:00</span>
                            </div>
                            <input type="range" id="trimStart" class="w-full range-slider" min="0" max="100" value="0" step="0.1">
                        </div>
                        <div>
                            <div class="flex justify-between text-xs text-gray-400 mb-1">
                                <span>End Time</span>
                                <span id="trimEndDisplay">00:00</span>
                            </div>
                            <input type="range" id="trimEnd" class="w-full range-slider" min="0" max="100" value="100" step="0.1">
                        </div>
                        <button id="setTrimStart" class="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors">
                            <i class="fas fa-map-marker-alt mr-1"></i> Set Current as Start
                        </button>
                        <button id="setTrimEnd" class="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors">
                            <i class="fas fa-map-marker-alt mr-1"></i> Set Current as End
                        </button>
                    </div>
                </div>
                
                <!-- Rotation & Flip -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
                        <i class="fas fa-sync text-purple-400 mr-2"></i>
                        Rotate & Flip
                    </h4>
                    <div class="grid grid-cols-2 gap-2">
                        <button id="rotateLeft" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors">
                            <i class="fas fa-undo"></i> 90° Left
                        </button>
                        <button id="rotateRight" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors">
                            <i class="fas fa-redo"></i> 90° Right
                        </button>
                        <button id="flipHorizontal" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors">
                            <i class="fas fa-arrows-alt-h"></i> Flip H
                        </button>
                        <button id="flipVertical" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors">
                            <i class="fas fa-arrows-alt-v"></i> Flip V
                        </button>
                    </div>
                </div>
                
                <!-- Speed -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
                        <i class="fas fa-tachometer-alt text-green-400 mr-2"></i>
                        Playback Speed
                    </h4>
                    <div class="grid grid-cols-4 gap-2 mb-2">
                        <button class="speed-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-speed="0.25">0.25x</button>
                        <button class="speed-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-speed="0.5">0.5x</button>
                        <button class="speed-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-speed="0.75">0.75x</button>
                        <button class="speed-btn px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs text-white transition-colors active" data-speed="1">1x</button>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <button class="speed-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-speed="1.25">1.25x</button>
                        <button class="speed-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-speed="1.5">1.5x</button>
                        <button class="speed-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-speed="1.75">1.75x</button>
                        <button class="speed-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-speed="2">2x</button>
                    </div>
                    <div class="mt-2 text-center">
                        <span class="text-xs text-gray-400">Current: <span id="currentSpeed" class="text-purple-400">1.0x</span></span>
                    </div>
                </div>
            </div>
        `;
    }

    getEffectsTabHTML() {
        return `
            <div class="space-y-4">
                <!-- Color Adjustments -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
                        <i class="fas fa-palette text-pink-400 mr-2"></i>
                        Color Adjustments
                    </h4>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-gray-300">Brightness</span>
                                <span id="brightnessValue" class="text-purple-400">100%</span>
                            </div>
                            <input type="range" id="brightness" min="0" max="200" value="100" class="w-full range-slider">
                        </div>
                        <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-gray-300">Contrast</span>
                                <span id="contrastValue" class="text-purple-400">100%</span>
                            </div>
                            <input type="range" id="contrast" min="0" max="200" value="100" class="w-full range-slider">
                        </div>
                        <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-gray-300">Saturation</span>
                                <span id="saturationValue" class="text-purple-400">100%</span>
                            </div>
                            <input type="range" id="saturation" min="0" max="200" value="100" class="w-full range-slider">
                        </div>
                        <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-gray-300">Hue</span>
                                <span id="hueValue" class="text-purple-400">0°</span>
                            </div>
                            <input type="range" id="hue" min="0" max="360" value="0" class="w-full range-slider">
                        </div>
                        <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-gray-300">Blur</span>
                                <span id="blurValue" class="text-purple-400">0px</span>
                            </div>
                            <input type="range" id="blur" min="0" max="20" value="0" class="w-full range-slider">
                        </div>
                    </div>
                </div>
                
                <!-- Filter Presets -->
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
                        <i class="fas fa-images text-yellow-400 mr-2"></i>
                        Filter Presets
                    </h4>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="preset-btn px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors active" data-preset="none">
                            <i class="fas fa-ban mr-1"></i> None
                        </button>
                        <button class="preset-btn px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-preset="grayscale">
                            <i class="fas fa-adjust mr-1"></i> B&W
                        </button>
                        <button class="preset-btn px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-preset="sepia">
                            <i class="fas fa-sun mr-1"></i> Sepia
                        </button>
                        <button class="preset-btn px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-preset="invert">
                            <i class="fas fa-adjust mr-1"></i> Invert
                        </button>
                        <button class="preset-btn px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-preset="vintage">
                            <i class="fas fa-film mr-1"></i> Vintage
                        </button>
                        <button class="preset-btn px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors" data-preset="vibrant">
                            <i class="fas fa-star mr-1"></i> Vibrant
                        </button>
                    </div>
                </div>
                
                <!-- Reset -->
                <button id="resetFilters" class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition-colors">
                    <i class="fas fa-undo mr-2"></i> Reset All Filters
                </button>
            </div>
        `;
    }

    getAudioTabHTML() {
        return `
            <div class="space-y-4">
                <div class="bg-gray-800 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
                        <i class="fas fa-volume-up text-blue-400 mr-2"></i>
                        Volume Control
                    </h4>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-gray-300">Volume</span>
                                <span id="volumeValue" class="text-purple-400">100%</span>
                            </div>
                            <input type="range" id="volumeControl" min="0" max="200" value="100" class="w-full range-slider">
                        </div>
                        <button id="muteToggle" class="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors">
                            <i class="fas fa-volume-up mr-2"></i> Mute/Unmute
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getCenterPreviewHTML(recording) {
        return `
            <!-- Center - Video Preview -->
            <div class="flex-1 flex flex-col bg-gray-950">
                <!-- Video Container -->
                <div class="flex-1 flex items-center justify-center p-8">
                    <div class="relative max-w-full max-h-full flex items-center justify-center">
                        <video id="editorVideo" class="max-w-full max-h-full rounded-lg shadow-2xl" muted>
                            <source src="${this.videoUrl}" type="video/webm">
                        </video>
                        <div id="videoOverlay" class="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <button id="bigPlayBtn" class="pointer-events-auto w-20 h-20 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl">
                                <i class="fas fa-play text-white text-2xl ml-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Timeline Section -->
                <div class="bg-gray-900 border-t border-gray-700 p-4">
                    <!-- Controls -->
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-2">
                            <button id="playPauseBtn" class="w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors">
                                <i id="playPauseIcon" class="fas fa-play text-white"></i>
                            </button>
                            <button id="skipBackward" class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors" title="Skip back 5s">
                                <i class="fas fa-backward text-white text-xs"></i>
                            </button>
                            <button id="skipForward" class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors" title="Skip forward 5s">
                                <i class="fas fa-forward text-white text-xs"></i>
                            </button>
                            <div class="text-white text-sm font-mono ml-2">
                                <span id="currentTime">00:00</span>
                                <span class="text-gray-500 mx-1">/</span>
                                <span id="totalDuration">00:00</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button id="volumeBtn" class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors">
                                <i class="fas fa-volume-up text-white text-xs"></i>
                            </button>
                            <button id="fullscreenBtn" class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors">
                                <i class="fas fa-expand text-white text-xs"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Timeline Slider -->
                    <div class="relative">
                        <input type="range" id="timelineSlider" class="w-full timeline-slider" min="0" max="100" value="0" step="0.1">
                        <div class="flex items-center justify-between mt-1 px-1">
                            <div id="trimStartMarker" class="text-xs text-blue-400"><i class="fas fa-cut"></i> <span id="trimStartTime">--:--</span></div>
                            <div id="trimEndMarker" class="text-xs text-blue-400"><i class="fas fa-cut"></i> <span id="trimEndTime">--:--</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getStylesHTML() {
        return `
            <style>
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1F2937;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #8b5cf6, #3b82f6);
                    border-radius: 3px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #7c3aed, #2563eb);
                }
                
                .range-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 6px;
                    background: linear-gradient(90deg, #4B5563 0%, #4B5563 100%);
                    border-radius: 3px;
                    outline: none;
                    transition: background 0.2s;
                }
                
                .range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .range-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.8);
                }
                
                .range-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
                }
                
                .timeline-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 8px;
                    background: linear-gradient(90deg, #8b5cf6 0%, #8b5cf6 var(--progress, 0%), #374151 var(--progress, 0%), #374151 100%);
                    border-radius: 4px;
                    outline: none;
                    cursor: pointer;
                }
                
                .timeline-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #ffffff;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                    border: 3px solid #8b5cf6;
                }
                
                .tool-tab {
                    color: #9CA3AF;
                }
                
                .tool-tab.active {
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    color: white;
                }
                
                .speed-btn.active, .preset-btn.active {
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6) !important;
                }
                
                #videoOverlay {
                    transition: opacity 0.3s;
                }
                
                #videoOverlay.hidden {
                    opacity: 0;
                    pointer-events: none;
                }
            </style>
        `;
    }

    setup(recording) {
        this.video = this.modal.querySelector('#editorVideo');
        
        // Add error handler
        this.video.addEventListener('error', (e) => {
            console.error('Video load error:', e, this.video.error);
            this.pixelCorder.showNotification('Error loading video: ' + (this.video.error?.message || 'Unknown error'), 'error');
        });
        
        // Add loadstart listener for debugging
        this.video.addEventListener('loadstart', () => {
            console.log('Video loading started, src:', this.video.src);
        });
        
        this.video.load();
        
        this.saveState();
        this.setupEventListeners();
        this.setupVideoEvents();
        this.setupToolTabs();
        this.setupTransformControls();
        this.setupEffectsControls();
        this.setupAudioControls();
        this.setupExport(recording);
    }

    saveState() {
        this.editorState.history = this.editorState.history.slice(0, this.editorState.historyIndex + 1);
        this.editorState.history.push({...this.editorState});
        this.editorState.historyIndex++;
    }

    applyEffects() {
        let transform = '';
        if (this.editorState.rotation) transform += `rotate(${this.editorState.rotation}deg) `;
        if (this.editorState.flipH) transform += `scaleX(-1) `;
        if (this.editorState.flipV) transform += `scaleY(-1) `;
        this.video.style.transform = transform;
        
        let filter = `brightness(${this.editorState.brightness}%) `;
        filter += `contrast(${this.editorState.contrast}%) `;
        filter += `saturate(${this.editorState.saturation}%) `;
        filter += `hue-rotate(${this.editorState.hue}deg) `;
        filter += `blur(${this.editorState.blur}px)`;
        this.video.style.filter = filter;
        
        this.video.volume = this.editorState.volume / 100;
        this.video.playbackRate = this.editorState.speed;
        
        this.updateUIValues();
    }

    updateUIValues() {
        // Update text displays
        this.modal.querySelector('#brightnessValue').textContent = `${this.editorState.brightness}%`;
        this.modal.querySelector('#contrastValue').textContent = `${this.editorState.contrast}%`;
        this.modal.querySelector('#saturationValue').textContent = `${this.editorState.saturation}%`;
        this.modal.querySelector('#hueValue').textContent = `${this.editorState.hue}°`;
        this.modal.querySelector('#blurValue').textContent = `${this.editorState.blur}px`;
        this.modal.querySelector('#volumeValue').textContent = `${this.editorState.volume}%`;
        this.modal.querySelector('#currentSpeed').textContent = `${this.editorState.speed}x`;
        
        // Update slider values
        this.modal.querySelector('#brightness').value = this.editorState.brightness;
        this.modal.querySelector('#contrast').value = this.editorState.contrast;
        this.modal.querySelector('#saturation').value = this.editorState.saturation;
        this.modal.querySelector('#hue').value = this.editorState.hue;
        this.modal.querySelector('#blur').value = this.editorState.blur;
        this.modal.querySelector('#volumeControl').value = this.editorState.volume;
        
        // Update speed button states
        this.modal.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.speed) === this.editorState.speed);
        });
    }

    setupVideoEvents() {
        this.video.addEventListener('loadedmetadata', () => {
            const timelineSlider = this.modal.querySelector('#timelineSlider');
            const trimStartSlider = this.modal.querySelector('#trimStart');
            const trimEndSlider = this.modal.querySelector('#trimEnd');
            
            // Ensure duration is valid (not Infinity or NaN), minimum 1 second to allow slider movement
            let duration = this.video.duration;
            if (!isFinite(duration) || isNaN(duration) || duration <= 0) {
                duration = 100; // Default fallback
            }
            
            // Update slider maximums
            timelineSlider.max = duration;
            trimStartSlider.max = duration;
            trimEndSlider.max = duration;
            trimEndSlider.value = duration;
            trimStartSlider.value = 0;
            
            // Update state
            this.editorState.trimStart = 0;
            this.editorState.trimEnd = duration;
            
            // Update UI
            this.modal.querySelector('#totalDuration').textContent = this.formatTime(duration);
            this.modal.querySelector('#trimStartDisplay').textContent = this.formatTime(0);
            this.modal.querySelector('#trimEndDisplay').textContent = this.formatTime(duration);
            this.modal.querySelector('#trimStartTime').textContent = this.formatTime(0);
            this.modal.querySelector('#trimEndTime').textContent = this.formatTime(duration);
        });
        
        // Additional listener for when video is actually ready to play
        this.video.addEventListener('canplay', () => {
            const timelineSlider = this.modal.querySelector('#timelineSlider');
            const trimStartSlider = this.modal.querySelector('#trimStart');
            const trimEndSlider = this.modal.querySelector('#trimEnd');
            
            // Update with actual duration if it's now valid
            if (isFinite(this.video.duration) && !isNaN(this.video.duration) && this.video.duration > 0) {
                const duration = this.video.duration;
                
                timelineSlider.max = duration;
                trimStartSlider.max = duration;
                trimEndSlider.max = duration;
                trimEndSlider.value = duration;
                
                this.editorState.trimEnd = duration;
                
                this.modal.querySelector('#totalDuration').textContent = this.formatTime(duration);
                this.modal.querySelector('#trimEndDisplay').textContent = this.formatTime(duration);
                this.modal.querySelector('#trimEndTime').textContent = this.formatTime(duration);
            }
        }, { once: true });
        
        this.video.addEventListener('timeupdate', () => {
            const timelineSlider = this.modal.querySelector('#timelineSlider');
            if (!timelineSlider.dataset.seeking) {
                timelineSlider.value = this.video.currentTime;
                const progress = (this.video.currentTime / this.video.duration) * 100;
                timelineSlider.style.setProperty('--progress', `${progress}%`);
            }
            this.modal.querySelector('#currentTime').textContent = this.formatTime(this.video.currentTime);
        });
    }

    setupEventListeners() {
        // Close
        this.modal.querySelector('#closeEditorBtn').addEventListener('click', () => this.close());
        
        // Undo/Redo
        this.modal.querySelector('#undoBtn').addEventListener('click', () => this.undo());
        this.modal.querySelector('#redoBtn').addEventListener('click', () => this.redo());
        
        // Play/Pause
        const playPauseBtn = this.modal.querySelector('#playPauseBtn');
        const bigPlayBtn = this.modal.querySelector('#bigPlayBtn');
        playPauseBtn.addEventListener('click', () => this.togglePlay());
        bigPlayBtn.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('click', () => this.togglePlay());
        
        // Skip
        this.modal.querySelector('#skipBackward').addEventListener('click', () => {
            this.video.currentTime = Math.max(0, this.video.currentTime - 5);
        });
        this.modal.querySelector('#skipForward').addEventListener('click', () => {
            this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 5);
        });
        
        // Timeline
        const timelineSlider = this.modal.querySelector('#timelineSlider');
        timelineSlider.addEventListener('input', (e) => {
            timelineSlider.dataset.seeking = 'true';
            this.video.currentTime = parseFloat(e.target.value);
            const progress = (e.target.value / this.video.duration) * 100;
            timelineSlider.style.setProperty('--progress', `${progress}%`);
        });
        timelineSlider.addEventListener('change', () => delete timelineSlider.dataset.seeking);
        
        // Volume
        this.modal.querySelector('#volumeBtn').addEventListener('click', () => {
            this.video.muted = !this.video.muted;
            const icon = this.modal.querySelector('#volumeBtn i');
            icon.className = this.video.muted ? 'fas fa-volume-mute text-white text-xs' : 'fas fa-volume-up text-white text-xs';
        });
        
        // Fullscreen
        this.modal.querySelector('#fullscreenBtn').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.modal.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
        
        // Keyboard
        this.keyHandler = (e) => {
            if (!this.modal.parentNode) return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.video.currentTime = Math.max(0, this.video.currentTime - 5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 5);
                    break;
            }
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    setupToolTabs() {
        this.modal.querySelectorAll('.tool-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.modal.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                this.modal.querySelectorAll('.tool-panel').forEach(p => p.classList.add('hidden'));
                this.modal.querySelector(`#${tab.dataset.tab}-tab`).classList.remove('hidden');
            });
        });
    }

    setupTransformControls() {
        // Trim
        const trimStartSlider = this.modal.querySelector('#trimStart');
        const trimEndSlider = this.modal.querySelector('#trimEnd');
        
        trimStartSlider.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            // Ensure start is before end
            if (value >= this.editorState.trimEnd) {
                value = Math.max(0, this.editorState.trimEnd - 0.5);
                e.target.value = value;
            }
            
            this.editorState.trimStart = value;
            this.modal.querySelector('#trimStartDisplay').textContent = this.formatTime(this.editorState.trimStart);
            this.modal.querySelector('#trimStartTime').textContent = this.formatTime(this.editorState.trimStart);
            this.video.currentTime = this.editorState.trimStart;
        });
        
        trimEndSlider.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            // Ensure end is after start
            if (value <= this.editorState.trimStart) {
                value = Math.min(this.video.duration, this.editorState.trimStart + 0.5);
                e.target.value = value;
            }
            
            this.editorState.trimEnd = value;
            this.modal.querySelector('#trimEndDisplay').textContent = this.formatTime(this.editorState.trimEnd);
            this.modal.querySelector('#trimEndTime').textContent = this.formatTime(this.editorState.trimEnd);
        });
        
        this.modal.querySelector('#setTrimStart').addEventListener('click', () => {
            this.editorState.trimStart = this.video.currentTime;
            trimStartSlider.value = this.video.currentTime;
            this.modal.querySelector('#trimStartDisplay').textContent = this.formatTime(this.editorState.trimStart);
            this.modal.querySelector('#trimStartTime').textContent = this.formatTime(this.editorState.trimStart);
            this.saveState();
            this.pixelCorder.showNotification('Trim start set!', 'success');
        });
        
        this.modal.querySelector('#setTrimEnd').addEventListener('click', () => {
            this.editorState.trimEnd = this.video.currentTime;
            trimEndSlider.value = this.video.currentTime;
            this.modal.querySelector('#trimEndDisplay').textContent = this.formatTime(this.editorState.trimEnd);
            this.modal.querySelector('#trimEndTime').textContent = this.formatTime(this.editorState.trimEnd);
            this.saveState();
            this.pixelCorder.showNotification('Trim end set!', 'success');
        });
        
        // Rotation
        this.modal.querySelector('#rotateLeft').addEventListener('click', () => {
            this.editorState.rotation = (this.editorState.rotation - 90) % 360;
            this.applyEffects();
            this.saveState();
        });
        
        this.modal.querySelector('#rotateRight').addEventListener('click', () => {
            this.editorState.rotation = (this.editorState.rotation + 90) % 360;
            this.applyEffects();
            this.saveState();
        });
        
        // Flip
        this.modal.querySelector('#flipHorizontal').addEventListener('click', () => {
            this.editorState.flipH = !this.editorState.flipH;
            this.applyEffects();
            this.saveState();
        });
        
        this.modal.querySelector('#flipVertical').addEventListener('click', () => {
            this.editorState.flipV = !this.editorState.flipV;
            this.applyEffects();
            this.saveState();
        });
        
        // Speed
        this.modal.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editorState.speed = parseFloat(btn.dataset.speed);
                this.applyEffects();
                this.modal.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.saveState();
            });
        });
    }

    setupEffectsControls() {
        // Color adjustments
        ['brightness', 'contrast', 'saturation', 'hue', 'blur'].forEach(prop => {
            const slider = this.modal.querySelector(`#${prop}`);
            const valueDisplay = this.modal.querySelector(`#${prop}Value`);
            
            slider.addEventListener('input', (e) => {
                this.editorState[prop] = parseInt(e.target.value);
                
                // Update value display in real-time
                if (prop === 'hue') {
                    valueDisplay.textContent = `${this.editorState[prop]}°`;
                } else if (prop === 'blur') {
                    valueDisplay.textContent = `${this.editorState[prop]}px`;
                } else {
                    valueDisplay.textContent = `${this.editorState[prop]}%`;
                }
                
                this.applyEffects();
            });
            slider.addEventListener('change', () => this.saveState());
        });
        
        // Presets
        this.modal.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset);
                this.modal.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.saveState();
            });
        });
        
        // Reset
        this.modal.querySelector('#resetFilters').addEventListener('click', () => {
            this.editorState.brightness = 100;
            this.editorState.contrast = 100;
            this.editorState.saturation = 100;
            this.editorState.hue = 0;
            this.editorState.blur = 0;
            this.editorState.preset = 'none';
            this.modal.querySelector('#brightness').value = 100;
            this.modal.querySelector('#contrast').value = 100;
            this.modal.querySelector('#saturation').value = 100;
            this.modal.querySelector('#hue').value = 0;
            this.modal.querySelector('#blur').value = 0;
            this.applyEffects();
            this.saveState();
            this.pixelCorder.showNotification('Filters reset!', 'success');
        });
    }

    setupAudioControls() {
        const volumeSlider = this.modal.querySelector('#volumeControl');
        const volumeValue = this.modal.querySelector('#volumeValue');
        
        volumeSlider.addEventListener('input', (e) => {
            this.editorState.volume = parseInt(e.target.value);
            volumeValue.textContent = `${this.editorState.volume}%`;
            this.applyEffects();
        });
        volumeSlider.addEventListener('change', () => this.saveState());
        
        this.modal.querySelector('#muteToggle').addEventListener('click', () => {
            this.video.muted = !this.video.muted;
            const icon = this.modal.querySelector('#muteToggle i');
            icon.className = this.video.muted ? 'fas fa-volume-mute mr-2' : 'fas fa-volume-up mr-2';
            this.pixelCorder.showNotification(this.video.muted ? 'Muted' : 'Unmuted', 'info');
        });
    }

    setupExport(recording) {
        this.modal.querySelector('#exportVideoBtn').addEventListener('click', () => {
            this.pixelCorder.showNotification('Exporting video with effects...', 'info');
            setTimeout(() => {
                this.exportVideo(recording);
            }, 500);
        });
    }

    async exportVideo(recording) {
        // Check if any effects are applied
        const hasEffects = 
            this.editorState.rotation !== 0 ||
            this.editorState.flipH ||
            this.editorState.flipV ||
            this.editorState.brightness !== 100 ||
            this.editorState.contrast !== 100 ||
            this.editorState.saturation !== 100 ||
            this.editorState.hue !== 0 ||
            this.editorState.blur !== 0;
        
        const hasTrim = 
            this.editorState.trimStart > 0 ||
            this.editorState.trimEnd < this.video.duration;
        
        // If no effects and no trim, download the original blob from IndexedDB
        if (!hasEffects && !hasTrim) {
            this.pixelCorder.showNotification('Downloading original video...', 'info');
            
            try {
                // Get the original blob from IndexedDB (this preserves all metadata)
                const blob = await this.pixelCorder.getVideoBlob(recording.id);
                
                if (!blob) {
                    throw new Error('Video not found in storage');
                }
                
                // Download using the same method as the Download button
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${recording.name}_${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.pixelCorder.showNotification('Video downloaded!', 'success');
                
                // Show tip about seeking in Windows Media Player
                setTimeout(() => {
                    this.pixelCorder.showNotification(
                        'Tip: If seeking doesn\'t work in Windows Media Player, use VLC Player or convert to MP4.',
                        'info'
                    );
                }, 2000);
                
                return;
            } catch (error) {
                console.error('Failed to download original:', error);
                this.pixelCorder.showNotification('Download failed: ' + error.message, 'error');
                return;
            }
        }
        
        // Otherwise, process with effects
        this.pixelCorder.showNotification('Processing video with effects...', 'info');
        
        try {
            // Create canvas for processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Use existing video dimensions
            canvas.width = this.video.videoWidth || 1920;
            canvas.height = this.video.videoHeight || 1080;
            
            // Create video element for processing
            const processVideo = document.createElement('video');
            // Use the same videoUrl that we created in open()
            processVideo.src = this.videoUrl;
            processVideo.muted = true;
            processVideo.preload = 'auto';
            
            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                processVideo.onloadeddata = resolve;
                processVideo.onerror = () => reject(new Error('Failed to load video'));
                setTimeout(() => reject(new Error('Video load timeout')), 10000);
            });
            
            // Set trim bounds with validation
            let startTime = Math.max(0, this.editorState.trimStart);
            let endTime = Math.min(this.editorState.trimEnd, processVideo.duration);
            
            // Ensure valid range
            if (startTime >= endTime) {
                startTime = 0;
                endTime = processVideo.duration;
            }
            
            // Ensure minimum duration of 0.5 seconds
            if (endTime - startTime < 0.5) {
                endTime = Math.min(startTime + 0.5, processVideo.duration);
            }
            
            console.log('Export range:', startTime, 'to', endTime, 'seconds');
            
            // Seek to start
            processVideo.currentTime = startTime;
            await new Promise(resolve => {
                processVideo.onseeked = resolve;
            });
            
            // Setup MediaRecorder with explicit FPS
            const stream = canvas.captureStream(25); // 25 FPS for better compatibility
            
            // Try VP9 first (better quality and seekability), fallback to VP8
            let options;
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                options = {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 3000000
                };
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                options = {
                    mimeType: 'video/webm;codecs=vp8',
                    videoBitsPerSecond: 2500000
                };
            } else {
                options = {
                    mimeType: 'video/webm',
                    videoBitsPerSecond: 2500000
                };
            }
            
            console.log('Using codec:', options.mimeType);
            
            const recorder = new MediaRecorder(stream, options);
            const chunks = [];
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                    console.log('Chunk recorded:', e.data.size, 'bytes');
                }
            };
            
            // Start recording with smaller timeslice for better seeking
            recorder.start(100); // Collect data every 100ms for better seeking
            processVideo.play();
            
            let frameCount = 0;
            let isRecording = true;
            
            // Draw frames loop
            const drawFrame = () => {
                if (!isRecording || processVideo.currentTime >= endTime || processVideo.ended) {
                    console.log('Stopping recording. Frames drawn:', frameCount);
                    isRecording = false;
                    processVideo.pause();
                    
                    // Stop recorder after a small delay to ensure last chunks are captured
                    setTimeout(() => {
                        if (recorder.state !== 'inactive') {
                            recorder.stop();
                        }
                    }, 500);
                    return;
                }
                
                // Clear and draw frame
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                
                // Apply transformations
                ctx.translate(canvas.width / 2, canvas.height / 2);
                
                if (this.editorState.rotation !== 0) {
                    ctx.rotate((this.editorState.rotation * Math.PI) / 180);
                }
                
                ctx.scale(
                    this.editorState.flipH ? -1 : 1,
                    this.editorState.flipV ? -1 : 1
                );
                
                // Apply filters
                ctx.filter = `brightness(${this.editorState.brightness}%) contrast(${this.editorState.contrast}%) saturate(${this.editorState.saturation}%) hue-rotate(${this.editorState.hue}deg) blur(${this.editorState.blur}px)`;
                
                // Draw video
                ctx.drawImage(processVideo, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
                ctx.restore();
                
                frameCount++;
                requestAnimationFrame(drawFrame);
            };
            
            // Start drawing
            requestAnimationFrame(drawFrame);
            
            // Wait for recording to stop
            await new Promise((resolve) => {
                recorder.onstop = () => {
                    console.log('Recording stopped. Total chunks:', chunks.length);
                    // Small delay to ensure all data is collected
                    setTimeout(resolve, 200);
                };
            });
            
            // Request any final data
            if (chunks.length === 0) {
                console.warn('No chunks recorded, trying to request data...');
            }
            
            // Create blob with proper type
            const blob = new Blob(chunks, { type: options.mimeType });
            console.log('Final blob size:', blob.size, 'bytes');
            
            if (blob.size < 1000) {
                throw new Error(`Recording failed - captured only ${blob.size} bytes. Make sure trim range is valid (Start: ${startTime.toFixed(2)}s, End: ${endTime.toFixed(2)}s).`);
            }
            
            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${recording.name}_edited_${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            processVideo.src = '';
            
            // Show success
            this.pixelCorder.showNotification('Video with effects exported!', 'success');
            
            setTimeout(() => {
                this.pixelCorder.showNotification(
                    'Note: Videos with effects may have limited seeking. Convert to MP4 for better compatibility.',
                    'info'
                );
            }, 2000);
            
        } catch (error) {
            console.error('Export error:', error);
            this.pixelCorder.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    applyPreset(preset) {
        const presets = {
            none: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0 },
            grayscale: { brightness: 100, contrast: 100, saturation: 0, hue: 0, blur: 0 },
            sepia: { brightness: 110, contrast: 90, saturation: 80, hue: 30, blur: 0 },
            invert: { brightness: 100, contrast: 100, saturation: 100, hue: 180, blur: 0 },
            vintage: { brightness: 105, contrast: 85, saturation: 70, hue: 20, blur: 1 },
            vibrant: { brightness: 110, contrast: 120, saturation: 150, hue: 0, blur: 0 }
        };
        
        const presetData = presets[preset];
        Object.assign(this.editorState, presetData);
        
        this.modal.querySelector('#brightness').value = presetData.brightness;
        this.modal.querySelector('#contrast').value = presetData.contrast;
        this.modal.querySelector('#saturation').value = presetData.saturation;
        this.modal.querySelector('#hue').value = presetData.hue;
        this.modal.querySelector('#blur').value = presetData.blur;
        
        this.applyEffects();
    }

    togglePlay() {
        const playPauseIcon = this.modal.querySelector('#playPauseIcon');
        const bigPlayBtn = this.modal.querySelector('#bigPlayBtn i');
        const videoOverlay = this.modal.querySelector('#videoOverlay');
        
        if (this.video.paused) {
            this.video.play();
            playPauseIcon.className = 'fas fa-pause text-white';
            bigPlayBtn.className = 'fas fa-pause text-white text-2xl';
            videoOverlay.classList.add('hidden');
        } else {
            this.video.pause();
            playPauseIcon.className = 'fas fa-play text-white';
            bigPlayBtn.className = 'fas fa-play text-white text-2xl ml-1';
            videoOverlay.classList.remove('hidden');
        }
    }

    undo() {
        if (this.editorState.historyIndex > 0) {
            this.editorState.historyIndex--;
            Object.assign(this.editorState, this.editorState.history[this.editorState.historyIndex]);
            this.applyEffects();
            this.pixelCorder.showNotification('Undo', 'info');
        }
    }

    redo() {
        if (this.editorState.historyIndex < this.editorState.history.length - 1) {
            this.editorState.historyIndex++;
            Object.assign(this.editorState, this.editorState.history[this.editorState.historyIndex]);
            this.applyEffects();
            this.pixelCorder.showNotification('Redo', 'info');
        }
    }

    close() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
        
        // Clean up video URL
        if (this.videoUrl) {
            URL.revokeObjectURL(this.videoUrl);
            this.videoUrl = null;
        }
        
        document.body.removeChild(this.modal);
        document.body.style.overflow = '';
        this.video = null;
        this.modal = null;
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}
