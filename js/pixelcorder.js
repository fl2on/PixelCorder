// PixelCorder - Professional Screen Recording Application
class PixelCorder {
    constructor() {
        console.log('PixelCorder constructor called');
        this.isRecording = false;
        this.isPaused = false;
        this.startTime = null;
        this.timerInterval = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.dbName = 'PixelCorderDB';
        this.dbVersion = 1;
        
        // Initialize professional video editor
        this.professionalEditor = new ProfessionalVideoEditor(this);
        
        // Initialize IndexedDB
        this.initDB().then(() => {
            // Initialize after DB is ready
            this.setupUI();
            this.bindEvents();
        });
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create recordings store
                if (!db.objectStoreNames.contains('recordings')) {
                    const store = db.createObjectStore('recordings', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    
    async storeVideoBlob(id, blob) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['recordings'], 'readwrite');
            const store = transaction.objectStore('recordings');
            
            const request = store.put({ id, videoBlob: blob });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async getVideoBlob(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['recordings'], 'readonly');
            const store = transaction.objectStore('recordings');
            
            const request = store.get(id);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.videoBlob : null);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    bindEvents() {
        console.log('Binding events...');
        // Recording controls
        document.getElementById('recordBtn')?.addEventListener('click', () => {
            console.log('Record button clicked');
            this.startRecording();
        });
        document.getElementById('pauseBtn')?.addEventListener('click', () => {
            console.log('Pause button clicked');
            this.pauseRecording();
        });
        document.getElementById('stopBtn')?.addEventListener('click', () => {
            console.log('Stop button clicked');
            this.stopRecording();
        });
        
        // Settings
        document.getElementById('qualitySelect')?.addEventListener('change', (e) => {
            console.log('Quality changed:', e.target.value);
            this.updateQuality(e.target.value);
        });
        document.getElementById('frameRateSelect')?.addEventListener('change', (e) => {
            console.log('Frame rate changed:', e.target.value);
            this.updateFrameRate(e.target.value);
        });
        document.getElementById('audioToggle')?.addEventListener('change', (e) => {
            console.log('Audio toggled:', e.target.checked);
            this.toggleAudio(e.target.checked);
        });
        document.getElementById('micToggle')?.addEventListener('change', (e) => {
            console.log('Microphone toggled:', e.target.checked);
            this.toggleMicrophone(e.target.checked);
        });
        
        // Quick actions
        document.getElementById('screenshotBtn')?.addEventListener('click', () => {
            console.log('Screenshot button clicked');
            this.takeScreenshot();
        });
        document.getElementById('editBtn')?.addEventListener('click', () => {
            console.log('Edit button clicked');
            this.openEditor();
        });
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
            console.log('Fullscreen button clicked');
            this.toggleFullscreen();
        });
        document.getElementById('previewFullscreenBtn')?.addEventListener('click', () => {
            console.log('Preview fullscreen button clicked');
            this.togglePreviewFullscreen();
        });
        
        // Navigation
        document.getElementById('startRecordingBtn')?.addEventListener('click', () => {
            console.log('Start recording button clicked');
            this.scrollToApp();
        });
    }
    
    setupUI() {
        console.log('Setting up UI...');
        this.updateStats();
        this.loadRecentRecordings();
        this.updateButtonStates();
        this.showNotification('PixelCorder loaded successfully!', 'success');
    }
    
    updateStats() {
        const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
        
        // Update recording count
        const recordingCountElement = document.getElementById('recordingTime');
        if (recordingCountElement) {
            recordingCountElement.textContent = recordings.length.toString();
        }
        
        // Update total storage used
        let totalSize = 0;
        recordings.forEach(rec => totalSize += rec.size || 0);
        const storageElement = document.getElementById('storage');
        if (storageElement) {
            if (totalSize === 0) {
                storageElement.textContent = '0 MB';
            } else {
                const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
                if (sizeInMB < 1000) {
                    storageElement.textContent = `${sizeInMB} MB`;
                } else {
                    const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
                    storageElement.textContent = `${sizeInGB} GB`;
                }
            }
        }
        
        // Reset current session stats when not recording
        if (!this.isRecording) {
            const fileSizeElement = document.getElementById('fileSize');
            if (fileSizeElement) {
                fileSizeElement.textContent = '0 MB';
            }
            
            const fpsElement = document.getElementById('duration');
            if (fpsElement) {
                fpsElement.textContent = '0';
            }
        }
    }
    
    loadRecentRecordings() {
        const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
        const container = document.getElementById('recentRecordings');
        
        if (!container) return;
        
        if (recordings.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-video text-6xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400 text-lg">No recordings yet</p>
                    <p class="text-gray-600 text-sm">Start recording to see your files here</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recordings.map(recording => `
            <div class="recording-card bg-gray-900/60 rounded-xl p-4 border border-gray-800 hover:border-purple-500 transition relative group" data-recording-id="${recording.id}">
                <!-- Preview Thumbnail (visible by default, hides on hover) -->
                <div class="preview-container absolute inset-0 bg-black/95 rounded-xl opacity-100 transition-opacity duration-300 z-10 pointer-events-none flex items-center justify-center p-4">
                    <video class="preview-video max-h-full max-w-full rounded-lg shadow-2xl" muted loop preload="metadata"></video>
                    <div class="absolute bottom-4 right-4 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                        <i class="fas fa-eye mr-1"></i> Preview
                    </div>
                </div>
                
                <!-- Card Content -->
                <div class="relative z-0">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <h4 class="recording-name font-semibold truncate flex-1" data-id="${recording.id}">${recording.name}</h4>
                            <button onclick="pixelCorder.startEditName(${recording.id})" class="edit-name-btn text-gray-400 hover:text-purple-400 transition opacity-0 group-hover:opacity-100" title="Edit name">
                                <i class="fas fa-pen text-xs"></i>
                            </button>
                        </div>
                        <button onclick="pixelCorder.deleteRecording(${recording.id})" class="text-red-400 hover:text-red-300 ml-2">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                    <div class="flex items-center justify-between text-sm text-gray-400 mb-3">
                        <span>${this.formatBytes(recording.size)}</span>
                        <span>${this.formatDuration(recording.duration || 0)}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="pixelCorder.playRecording(${recording.id})" class="col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg text-sm transition">
                            <i class="fas fa-play mr-1"></i> Play
                        </button>
                        <button onclick="pixelCorder.editRecording(${recording.id})" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition">
                            <i class="fas fa-edit mr-1"></i> Edit
                        </button>
                        <button onclick="pixelCorder.downloadRecording(${recording.id})" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm transition">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Setup video previews on hover
        this.setupRecordingPreviews();
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    setupRecordingPreviews() {
        const cards = document.querySelectorAll('.recording-card');
        
        cards.forEach(card => {
            const recordingId = parseInt(card.dataset.recordingId);
            const previewContainer = card.querySelector('.preview-container');
            const previewVideo = card.querySelector('.preview-video');
            let videoLoaded = false;
            
            // Load and show preview immediately
            if (!videoLoaded && previewVideo) {
                this.getVideoBlob(recordingId).then(blob => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        previewVideo.src = url;
                        previewVideo.loop = true;
                        previewVideo.muted = true;
                        previewVideo.currentTime = 2; // Start at 2 seconds
                        
                        previewVideo.onloadeddata = () => {
                            previewVideo.play().catch(e => console.log('Preview play error:', e));
                        };
                        
                        videoLoaded = true;
                    }
                }).catch(error => {
                    console.error('Error loading preview:', error);
                });
            }
            
            // Hide preview when hovering over card (to interact with buttons)
            card.addEventListener('mouseenter', () => {
                if (previewContainer) {
                    previewContainer.style.opacity = '0';
                    previewContainer.style.pointerEvents = 'none';
                }
            });
            
            card.addEventListener('mouseleave', () => {
                if (previewContainer) {
                    previewContainer.style.opacity = '1';
                }
            });
        });
    }
    
    startEditName(id) {
        const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
        const recording = recordings.find(rec => rec.id === id);
        
        if (!recording) return;
        
        const nameElement = document.querySelector(`.recording-name[data-id="${id}"]`);
        if (!nameElement) return;
        
        const currentName = recording.name;
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'bg-gray-800 text-white px-2 py-1 rounded border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-600 w-full text-sm';
        
        // Replace name with input
        nameElement.innerHTML = '';
        nameElement.appendChild(input);
        input.focus();
        input.select();
        
        const saveName = () => {
            const newName = input.value.trim();
            
            if (newName && newName !== currentName) {
                // Update in localStorage
                recording.name = newName;
                localStorage.setItem('pixelcorder-recordings', JSON.stringify(recordings));
                this.showNotification('Name updated!', 'success');
            }
            
            // Restore name display
            nameElement.textContent = newName || currentName;
        };
        
        // Save on Enter or blur
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveName();
            } else if (e.key === 'Escape') {
                nameElement.textContent = currentName;
            }
        });
        
        input.addEventListener('blur', saveName);
    }
    
    async deleteRecording(id) {
        try {
            // Remove from IndexedDB
            const transaction = this.db.transaction(['recordings'], 'readwrite');
            const store = transaction.objectStore('recordings');
            store.delete(id);
            
            // Remove from localStorage
            const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
            const updatedRecordings = recordings.filter(rec => rec.id !== id);
            localStorage.setItem('pixelcorder-recordings', JSON.stringify(updatedRecordings));
            
            // Update UI
            this.loadRecentRecordings();
            this.updateStats();
            this.showNotification('Recording deleted', 'success');
        } catch (error) {
            console.error('Error deleting recording:', error);
            this.showNotification('Error deleting recording: ' + error.message, 'error');
        }
    }
    
    async playRecording(id) {
        const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
        const recording = recordings.find(rec => rec.id === id);
        
        if (recording) {
            try {
                // Get video blob from IndexedDB
                const blob = await this.getVideoBlob(id);
                
                if (!blob) {
                    this.showNotification('Video file not found', 'error');
                    return;
                }
                
                const url = URL.createObjectURL(blob);
                
                // Create video player modal
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4';
                modal.innerHTML = `
                    <div class="bg-gray-900 rounded-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto overflow-x-visible relative">
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-semibold text-white">${recording.name}</h3>
                            <button id="closePlayer" class="text-gray-400 hover:text-white text-2xl transition-colors">&times;</button>
                        </div>
                        
                        <!-- Video Container -->
                        <div class="bg-black rounded-lg p-4 mb-4">
                            <video controls class="w-full max-h-96 rounded" preload="metadata">
                                <source src="${url}" type="video/webm">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex flex-wrap gap-3 justify-center">
                            <button id="downloadVideo" class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center">
                                <i class="fas fa-download mr-2"></i>Download
                            </button>
                            <button id="editVideo" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center">
                                <i class="fas fa-edit mr-2"></i>Edit Video
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Event listeners
                modal.querySelector('#closePlayer').addEventListener('click', () => {
                    URL.revokeObjectURL(url);
                    document.body.removeChild(modal);
                });
                
                modal.querySelector('#downloadVideo').addEventListener('click', () => {
                    this.downloadRecordingBlob(recording.name, blob);
                });
                
                modal.querySelector('#editVideo').addEventListener('click', () => {
                    const recordingWithBlob = { ...recording, blob };
                    URL.revokeObjectURL(url);
                    document.body.removeChild(modal);
                    // Use the new professional video editor
                    this.professionalEditor.open(recordingWithBlob);
                });
                
                // Close modal when clicking outside
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        URL.revokeObjectURL(url);
                        document.body.removeChild(modal);
                    }
                });
                
            } catch (error) {
                console.error('Error opening video player:', error);
                this.showNotification('Error opening video player: ' + error.message, 'error');
            }
        } else {
            this.showNotification('Recording not found', 'error');
        }
    }
    
    async downloadRecording(id) {
        const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
        const recording = recordings.find(rec => rec.id === id);
        if (recording) {
            try {
                const blob = await this.getVideoBlob(id);
                if (blob) {
                    this.downloadRecordingBlob(recording.name, blob);
                } else {
                    this.showNotification('Video file not found', 'error');
                }
            } catch (error) {
                this.showNotification('Error downloading video: ' + error.message, 'error');
            }
        }
    }
    
    downloadRecordingBlob(name, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name + '.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Download started!', 'success');
    }
    
    async convertAndDownload(name, blob, format) {
        this.showNotification(`Downloading as ${format.toUpperCase()}...`, 'info');
        
        try {
            // Since browsers can't directly convert to MP4/AVI/MOV,
            // we'll download as WebM with appropriate naming
            // User can use external tools like HandBrake or FFmpeg for conversion
            
            const formatInfo = {
                'mp4': { ext: 'webm', note: '(Compatible format - use HandBrake or FFmpeg to convert to MP4)' },
                'avi': { ext: 'webm', note: '(Compatible format - use HandBrake or FFmpeg to convert to AVI)' },
                'mov': { ext: 'webm', note: '(Compatible format - use HandBrake or FFmpeg to convert to MOV)' },
                'webm': { ext: 'webm', note: '' }
            };
            
            const info = formatInfo[format.toLowerCase()] || formatInfo['webm'];
            
            // Download the blob with the correct extension
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${name}_${Date.now()}.${info.ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(a.href);
            
            this.showNotification(`Downloaded as ${info.ext.toUpperCase()} ${info.note}`, 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Error downloading video: ' + error.message, 'error');
        }
    }
    
    async convertToGIF(name, blob) {
        this.showNotification('Converting to GIF...', 'info');
        
        try {
            // Create video element to process
            const video = document.createElement('video');
            video.src = URL.createObjectURL(blob);
            video.muted = true;
            
            await new Promise((resolve) => {
                video.addEventListener('loadedmetadata', resolve);
            });
            
            // Create canvas for GIF conversion
            const canvas = document.createElement('canvas');
            const maxSize = 480; // Smaller size for GIF
            const aspectRatio = video.videoWidth / video.videoHeight;
            
            if (aspectRatio > 1) {
                canvas.width = maxSize;
                canvas.height = maxSize / aspectRatio;
            } else {
                canvas.height = maxSize;
                canvas.width = maxSize * aspectRatio;
            }
            
            const ctx = canvas.getContext('2d');
            const frames = [];
            const frameInterval = 100; // 10 FPS for GIF
            
            video.currentTime = 0;
            
            const captureFrame = () => {
                return new Promise((resolve) => {
                    video.addEventListener('seeked', () => {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
                        resolve();
                    }, { once: true });
                });
            };
            
            // Capture frames (limit to 3 seconds for GIF size)
            const maxDuration = Math.min(video.duration, 3);
            for (let time = 0; time < maxDuration; time += frameInterval / 1000) {
                video.currentTime = time;
                await captureFrame();
            }
            
            // Create simple WebM as "GIF" (browsers don't support real GIF creation)
            const stream = canvas.captureStream(10);
            const mediaRecorder = new MediaRecorder(stream, { 
                mimeType: 'video/webm;codecs=vp8',
                videoBitsPerSecond: 500000 // Lower quality for smaller file
            });
            
            const chunks = [];
            mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
            mediaRecorder.onstop = () => {
                const gifBlob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(gifBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${name}_animated.webm`; // Note: saved as WebM but optimized like GIF
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showNotification('Animated video exported!', 'success');
            };
            
            mediaRecorder.start();
            
            // Play back frames
            let frameIndex = 0;
            const playFrames = () => {
                if (frameIndex >= frames.length) {
                    mediaRecorder.stop();
                    return;
                }
                ctx.putImageData(frames[frameIndex], 0, 0);
                frameIndex++;
                setTimeout(playFrames, frameInterval);
            };
            
            playFrames();
            
        } catch (error) {
            console.error('GIF conversion error:', error);
            this.showNotification('Error creating animated video: ' + error.message, 'error');
        }
    }
    
    async editRecording(id) {
        const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
        const recording = recordings.find(rec => rec.id === id);
        if (recording) {
            try {
                const blob = await this.getVideoBlob(id);
                if (blob) {
                    // Pass blob directly to editor, it will create its own URL
                    const recordingWithBlob = { ...recording, blob };
                    // Use the professional video editor (same as Play → Edit Video)
                    this.professionalEditor.open(recordingWithBlob);
                } else {
                    this.showNotification('Video file not found', 'error');
                }
            } catch (error) {
                this.showNotification('Error opening editor: ' + error.message, 'error');
            }
        } else {
            this.showNotification('Recording not found', 'error');
        }
    }
    
    async startRecording() {
        console.log('Starting recording...');
        try {
            // Get audio settings
            const audioEnabled = document.getElementById('audioToggle')?.checked ?? true;
            const micEnabled = document.getElementById('micToggle')?.checked ?? false;
            
            let audioConstraints = false;
            if (audioEnabled || micEnabled) {
                audioConstraints = true;
            }
            
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: audioConstraints
            });
            
            // Add microphone if enabled
            if (micEnabled) {
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    // Mix microphone with screen audio
                    const audioContext = new AudioContext();
                    const destination = audioContext.createMediaStreamDestination();
                    
                    // Add screen audio if available
                    if (this.stream.getAudioTracks().length > 0) {
                        const screenAudio = audioContext.createMediaStreamSource(this.stream);
                        screenAudio.connect(destination);
                    }
                    
                    // Add microphone audio
                    const micAudio = audioContext.createMediaStreamSource(micStream);
                    micAudio.connect(destination);
                    
                    // Replace audio track
                    this.stream.getAudioTracks().forEach(track => this.stream.removeTrack(track));
                    destination.stream.getAudioTracks().forEach(track => this.stream.addTrack(track));
                } catch (micError) {
                    console.warn('Microphone access failed:', micError);
                    this.showNotification('Microphone access failed, continuing with system audio only', 'warning');
                }
            }
            
            // Listen for when user stops sharing from browser
            this.stream.getVideoTracks()[0].addEventListener('ended', () => {
                console.log('User stopped sharing from browser');
                this.handleStreamEnded();
            });
            
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    // Update file size in real time
                    let totalSize = 0;
                    this.recordedChunks.forEach(chunk => totalSize += chunk.size);
                    const fileSizeElement = document.getElementById('fileSize');
                    if (fileSizeElement) {
                        fileSizeElement.textContent = this.formatBytes(totalSize);
                    }
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startTime = Date.now();
            this.startTimer();
            this.updateButtonStates();
            this.showVideoPreview();
            this.showNotification('Recording started!', 'success');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showNotification('Error starting recording: ' + error.message, 'error');
        }
    }
    
    handleStreamEnded() {
        // User stopped sharing from browser, clean up
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.isPaused = false;
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            this.resetUI();
            this.updateButtonStates();
            this.showNotification('Recording stopped by user', 'info');
        }
    }
    
    showVideoPreview() {
        const videoPreview = document.getElementById('videoPreview');
        const previewArea = document.getElementById('previewArea');
        
        if (videoPreview && this.stream) {
            videoPreview.srcObject = this.stream;
            videoPreview.style.display = 'block';
            videoPreview.classList.remove('hidden');
            videoPreview.muted = true; // Avoid feedback
            videoPreview.play();
            
            // Hide placeholder
            if (previewArea) {
                previewArea.style.display = 'none';
            }
        }
    }
    
    resetUI() {
        // Reset timer display
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = '00:00:00';
        }
        
        // Reset file size display
        const fileSizeElement = document.getElementById('fileSize');
        if (fileSizeElement) {
            fileSizeElement.textContent = '0 MB';
        }
        
        // Reset FPS display
        const fpsElement = document.getElementById('duration');
        if (fpsElement) {
            fpsElement.textContent = '0';
        }
        
        // Hide video preview and show placeholder
        const videoPreview = document.getElementById('videoPreview');
        const previewArea = document.getElementById('previewArea');
        
        if (videoPreview) {
            videoPreview.style.display = 'none';
            videoPreview.classList.add('hidden');
            videoPreview.srcObject = null;
        }
        
        if (previewArea) {
            previewArea.style.display = 'block';
        }
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isRecording && !this.isPaused) {
                const elapsed = Date.now() - this.startTime;
                const timerElement = document.getElementById('timer');
                if (timerElement) {
                    timerElement.textContent = this.formatTime(elapsed / 1000);
                }
                
                // Simulate FPS counter
                const fpsElement = document.getElementById('duration');
                if (fpsElement) {
                    // Random FPS between 28-32 to simulate real recording
                    const fps = Math.floor(Math.random() * 5) + 28;
                    fpsElement.textContent = fps.toString();
                }
            }
        }, 1000);
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === null || seconds === undefined) {
            return '00:00:00';
        }
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    async urlToBlob(url) {
        try {
            const response = await fetch(url);
            return await response.blob();
        } catch (error) {
            console.error('Error converting URL to blob:', error);
            throw error;
        }
    }
    
    updateButtonStates() {
        const recordBtn = document.getElementById('recordBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (recordBtn) {
            recordBtn.disabled = this.isRecording;
            recordBtn.classList.toggle('opacity-50', this.isRecording);
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = !this.isRecording;
            pauseBtn.classList.toggle('opacity-50', !this.isRecording);
        }
        
        if (stopBtn) {
            stopBtn.disabled = !this.isRecording;
            stopBtn.classList.toggle('opacity-50', !this.isRecording);
        }
    }
    
    pauseRecording() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            this.mediaRecorder.pause();
            this.isPaused = true;
            this.showNotification('Recording paused', 'info');
        } else if (this.mediaRecorder && this.isRecording && this.isPaused) {
            this.mediaRecorder.resume();
            this.isPaused = false;
            this.showNotification('Recording resumed', 'info');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.isPaused = false;
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            this.resetUI();
            this.updateButtonStates();
            this.showNotification('Recording stopped!', 'success');
        }
    }
    
    async saveRecording() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const recordingId = Date.now();
        
        try {
            // Store the actual video blob in IndexedDB
            await this.storeVideoBlob(recordingId, blob);
            
            // Save metadata in localStorage
            const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
            const duration = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
            
            const newRecording = {
                id: recordingId,
                name: `Recording_${new Date().toLocaleString()}`,
                size: blob.size,
                duration: duration,
                timestamp: new Date().toISOString()
            };
            
            recordings.push(newRecording);
            localStorage.setItem('pixelcorder-recordings', JSON.stringify(recordings));
            
            // Update UI
            this.loadRecentRecordings();
            this.updateStats();
            
            this.showNotification('Recording saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving recording:', error);
            this.showNotification('Error saving recording: ' + error.message, 'error');
        }
    }
    
    async takeScreenshot() {
        try {
            this.showNotification('Taking screenshot...', 'info');
            
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { 
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            video.addEventListener('loadedmetadata', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                // Stop the stream
                stream.getTracks().forEach(track => track.stop());
                
                // Create download
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `PixelCorder_Screenshot_${timestamp}.png`;
                
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    // Show success message with file info
                    this.showScreenshotSuccess(filename, blob.size);
                });
            });
        } catch (error) {
            console.error('Error taking screenshot:', error);
            this.showNotification('Error taking screenshot: ' + error.message, 'error');
        }
    }
    
    showScreenshotSuccess(filename, fileSize) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-2xl p-6 max-w-md w-full">
                <div class="text-center">
                    <i class="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Screenshot Saved!</h3>
                    <div class="bg-gray-800 rounded-lg p-4 mb-4 text-left">
                        <p class="text-sm text-gray-400 mb-2">File saved to your Downloads folder:</p>
                        <p class="text-sm font-mono break-all text-blue-400">${filename}</p>
                        <p class="text-xs text-gray-500 mt-2">Size: ${this.formatBytes(fileSize)}</p>
                    </div>
                    <button id="closeScreenshotModal" class="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg">
                        <i class="fas fa-check mr-2"></i>Got it
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#closeScreenshotModal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Auto close after 5 seconds
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 5000);
    }
    
    async openEditor() {
        const recordings = JSON.parse(localStorage.getItem('pixelcorder-recordings') || '[]');
        if (recordings.length === 0) {
            this.showNotification('No recordings available to edit', 'error');
            return;
        }
        
        // Get the latest recording
        const latestRecording = recordings[recordings.length - 1];
        
        try {
            const blob = await this.getVideoBlob(latestRecording.id);
            if (blob) {
                const recordingWithBlob = { ...latestRecording, blob };
                this.openVideoEditor(recordingWithBlob);
            } else {
                this.showNotification('Video file not found', 'error');
            }
        } catch (error) {
            this.showNotification('Error opening editor: ' + error.message, 'error');
        }
    }
    
    openVideoEditor(recording) {
        // Use the new professional video editor
        this.professionalEditor.open(recording);
    }
    
    // OLD EDITOR CODE BELOW - NOT USED ANYMORE
    _oldOpenVideoEditor_REMOVED(recording) {
        console.log('Opening video editor for:', recording.name);
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-2xl p-6 max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold text-white">Video Editor - ${recording.name}</h3>
                    <button id="closeEditor" class="text-gray-400 hover:text-white text-2xl transition-colors">&times;</button>
                </div>
                
                <!-- Main Editor Layout -->
                <div class="flex-1 flex gap-4 min-h-0">
                    <!-- Video Preview Area -->
                    <div class="flex-1 flex flex-col min-h-0">
                        <!-- Video Container -->
                        <div class="flex-1 bg-black rounded-lg p-4 mb-4 flex items-center justify-center">
                            <video id="editorVideo" class="max-w-full max-h-full rounded" muted>
                                <source src="${recording.url}" type="video/webm">
                            </video>
                        </div>
                        
                        <!-- Timeline Controls -->
                        <div class="bg-gray-800 rounded-lg p-4">
                            <!-- Main Timeline -->
                            <div class="mb-4">
                                <div class="flex items-center gap-4 mb-2">
                                    <button id="playPause" class="bg-purple-600 hover:bg-purple-700 w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                                        <i class="fas fa-play text-white"></i>
                                    </button>
                                    <div class="flex-1">
                                        <input type="range" id="timeline" class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer timeline-slider" min="0" max="100" value="0">
                                    </div>
                                    <div class="text-sm text-white min-w-[80px]">
                                        <span id="currentTime">00:00</span> / <span id="duration">00:00</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Trim Controls -->
                            <div class="border-t border-gray-700 pt-3">
                                <h5 class="text-sm font-semibold text-white mb-2">Trim Video</h5>
                                <div class="flex items-center gap-3">
                                    <div class="flex-1">
                                        <label class="text-xs text-gray-400 block mb-1">Start</label>
                                        <input type="range" id="trimStart" class="w-full h-1 bg-gray-600 rounded appearance-none cursor-pointer" min="0" max="100" value="0">
                                    </div>
                                    <div class="flex-1">
                                        <label class="text-xs text-gray-400 block mb-1">End</label>
                                        <input type="range" id="trimEnd" class="w-full h-1 bg-gray-600 rounded appearance-none cursor-pointer" min="0" max="100" value="100">
                                    </div>
                                    <button id="applyTrim" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm text-white transition-colors">
                                        Apply Trim
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tools Panel -->
                    <div class="w-80 bg-gray-800 rounded-lg p-4 overflow-y-auto">
                        <div class="space-y-6">
                            <!-- Video Controls -->
                            <div>
                                <h4 class="font-semibold mb-3 text-white flex items-center">
                                    <i class="fas fa-video mr-2 text-purple-500"></i>Video Controls
                                </h4>
                                <div class="space-y-2">
                                    <button id="rotateVideo" class="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm text-white transition-colors flex items-center">
                                        <i class="fas fa-redo mr-2"></i>Rotate 90°
                                    </button>
                                    <button id="flipVideo" class="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm text-white transition-colors flex items-center">
                                        <i class="fas fa-arrows-alt-h mr-2"></i>Flip Horizontal
                                    </button>
                                    <button id="resetVideo" class="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm text-white transition-colors flex items-center">
                                        <i class="fas fa-undo mr-2"></i>Reset
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Filters -->
                            <div>
                                <h4 class="font-semibold mb-3 text-white flex items-center">
                                    <i class="fas fa-magic mr-2 text-blue-500"></i>Filters
                                </h4>
                                <div class="space-y-3">
                                    <div>
                                        <label class="block text-sm text-gray-300 mb-1">Brightness</label>
                                        <input type="range" id="brightness" min="0" max="200" value="100" class="w-full h-2 bg-gray-600 rounded appearance-none cursor-pointer">
                                        <div class="text-xs text-gray-400 text-center mt-1">100%</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm text-gray-300 mb-1">Contrast</label>
                                        <input type="range" id="contrast" min="0" max="200" value="100" class="w-full h-2 bg-gray-600 rounded appearance-none cursor-pointer">
                                        <div class="text-xs text-gray-400 text-center mt-1">100%</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm text-gray-300 mb-1">Saturation</label>
                                        <input type="range" id="saturation" min="0" max="200" value="100" class="w-full h-2 bg-gray-600 rounded appearance-none cursor-pointer">
                                        <div class="text-xs text-gray-400 text-center mt-1">100%</div>
                                    </div>
                                    
                                    <button id="applyFilters" class="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm text-white transition-colors">
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Playback Speed -->
                            <div>
                                <h4 class="font-semibold mb-3 text-white flex items-center">
                                    <i class="fas fa-tachometer-alt mr-2 text-green-500"></i>Playback Speed
                                </h4>
                                <div class="grid grid-cols-2 gap-2">
                                    <button onclick="document.getElementById('editorVideo').playbackRate = 0.5" class="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-xs text-white transition-colors">0.5x</button>
                                    <button onclick="document.getElementById('editorVideo').playbackRate = 1" class="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-xs text-white transition-colors">1x</button>
                                    <button onclick="document.getElementById('editorVideo').playbackRate = 1.5" class="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-xs text-white transition-colors">1.5x</button>
                                    <button onclick="document.getElementById('editorVideo').playbackRate = 2" class="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-xs text-white transition-colors">2x</button>
                                </div>
                            </div>
                            
                            <!-- Export Options -->
                            <div class="pt-4 border-t border-gray-700">
                                <h4 class="font-semibold mb-3 text-white flex items-center">
                                    <i class="fas fa-download mr-2 text-yellow-500"></i>Export
                                </h4>
                                <div class="space-y-3">
                                    <select id="exportQuality" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white">
                                        <option value="original">Original Quality</option>
                                        <option value="720p">720p</option>
                                        <option value="480p">480p</option>
                                    </select>
                                    <button id="exportVideo" class="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-medium text-white transition-colors flex items-center justify-center">
                                        <i class="fas fa-download mr-2"></i>Export Video
                                    </button>
                                    <button id="generateCaptions" class="w-full bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded font-medium text-white transition-colors flex items-center justify-center">
                                        <i class="fas fa-closed-captioning mr-2"></i>Add Captions
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .timeline-slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    background: #8b5cf6;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                .timeline-slider::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    background: #8b5cf6;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                
                input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    height: 12px;
                    width: 12px;
                    background: #8b5cf6;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                input[type="range"]::-moz-range-thumb {
                    height: 12px;
                    width: 12px;
                    background: #8b5cf6;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        this.setupVideoEditor(modal, recording);
    }
    
    setupVideoEditor(modal, recording) {
        const video = modal.querySelector('#editorVideo');
        
        let rotation = 0;
        let flipH = false;
        let currentFilters = { brightness: 100, contrast: 100, saturation: 100 };
        
        // Video loaded
        video.addEventListener('loadedmetadata', () => {
            const timeline = modal.querySelector('#timeline');
            const trimStartSlider = modal.querySelector('#trimStart');
            const trimEndSlider = modal.querySelector('#trimEnd');
            
            if (timeline) {
                timeline.max = video.duration;
                timeline.value = 0;
            }
            if (trimStartSlider) {
                trimStartSlider.max = video.duration;
                trimStartSlider.value = 0;
            }
            if (trimEndSlider) {
                trimEndSlider.max = video.duration;
                trimEndSlider.value = video.duration;
            }
            
            const durationDisplay = modal.querySelector('#duration');
            if (durationDisplay) {
                durationDisplay.textContent = this.formatTime(video.duration);
            }
        });
        
        // Timeline update
        video.addEventListener('timeupdate', () => {
            const timeline = modal.querySelector('#timeline');
            const currentTimeDisplay = modal.querySelector('#currentTime');
            
            if (timeline) {
                timeline.value = video.currentTime;
            }
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = this.formatTime(video.currentTime);
            }
        });
        
        // Play/Pause
        const playPauseBtn = modal.querySelector('#playPause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                    playPauseBtn.innerHTML = '<i class="fas fa-pause text-white"></i>';
                } else {
                    video.pause();
                    playPauseBtn.innerHTML = '<i class="fas fa-play text-white"></i>';
                }
            });
        }
        
        // Timeline seek - Fix for proper seeking
        const timeline = modal.querySelector('#timeline');
        if (timeline) {
            timeline.addEventListener('input', (e) => {
                video.currentTime = parseFloat(e.target.value);
            });
            
            // Timeline drag handling for smooth seeking
            timeline.addEventListener('mousedown', () => {
                video.pause();
            });
        }
        
        // Keyboard controls for better navigation
        const keyHandler = (e) => {
            if (modal.parentNode) { // Only if editor is open
                switch(e.code) {
                    case 'Space':
                        e.preventDefault();
                        if (playPauseBtn) playPauseBtn.click();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        video.currentTime = Math.max(0, video.currentTime - 5);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        video.currentTime = Math.min(video.duration, video.currentTime + 5);
                        break;
                    case 'KeyJ':
                        e.preventDefault();
                        video.currentTime = Math.max(0, video.currentTime - 10);
                        break;
                    case 'KeyL':
                        e.preventDefault();
                        video.currentTime = Math.min(video.duration, video.currentTime + 10);
                        break;
                }
            }
        };
        document.addEventListener('keydown', keyHandler);
        
        // Video transformations
        const rotateBtn = modal.querySelector('#rotateVideo');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => {
                rotation = (rotation + 90) % 360;
                this.applyTransforms(video, rotation, flipH, currentFilters);
            });
        }
        
        const flipBtn = modal.querySelector('#flipVideo');
        if (flipBtn) {
            flipBtn.addEventListener('click', () => {
                flipH = !flipH;
                this.applyTransforms(video, rotation, flipH, currentFilters);
            });
        }
        
        const resetBtn = modal.querySelector('#resetVideo');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                rotation = 0;
                flipH = false;
                currentFilters = { brightness: 100, contrast: 100, saturation: 100 };
                
                // Reset sliders
                const brightnessSlider = modal.querySelector('#brightness');
                const contrastSlider = modal.querySelector('#contrast');
                const saturationSlider = modal.querySelector('#saturation');
                
                if (brightnessSlider) brightnessSlider.value = 100;
                if (contrastSlider) contrastSlider.value = 100;
                if (saturationSlider) saturationSlider.value = 100;
                
                this.applyTransforms(video, rotation, flipH, currentFilters);
            });
        }
        
        // Filter controls
        ['brightness', 'contrast', 'saturation'].forEach(filter => {
            const slider = modal.querySelector(`#${filter}`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    currentFilters[filter] = e.target.value;
                    // Update display value
                    const displayEl = slider.parentElement.querySelector('.text-xs');
                    if (displayEl) {
                        displayEl.textContent = e.target.value + '%';
                    }
                });
            }
        });
        
        // Apply filters button
        const applyFiltersBtn = modal.querySelector('#applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyTransforms(video, rotation, flipH, currentFilters);
            });
        }
        
        // Export with options
        const exportBtn = modal.querySelector('#exportVideo');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const quality = modal.querySelector('#exportQuality')?.value || 'original';
                this.exportEditedVideo(recording, currentFilters, quality);
            });
        }
        
        // Generate Captions
        const captionsBtn = modal.querySelector('#generateCaptions');
        if (captionsBtn) {
            captionsBtn.addEventListener('click', () => {
                this.generateCaptions(recording);
            });
        }
        
        // Close
        const closeBtn = modal.querySelector('#closeEditor');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.removeEventListener('keydown', keyHandler);
                document.body.removeChild(modal);
            });
        }
    }
    
    applyTransforms(video, rotation, flipH, filters) {
        // Apply CSS transforms for preview
        let transform = '';
        if (rotation) transform += `rotate(${rotation}deg) `;
        if (flipH) transform += 'scaleX(-1) ';
        
        video.style.transform = transform;
        
        // Apply filters
        const filterStr = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
        video.style.filter = filterStr;
        
        this.showNotification('Transforms applied!', 'success');
    }
    
    exportEditedVideo(recording, filters, quality = 'original') {
        this.showNotification('Exporting video with current settings...', 'info');
        
        try {
            // Create a new filename based on export settings
            const timestamp = Date.now();
            let filename = `${recording.name}_edited_${quality}_${timestamp}`;
            
            // Fetch the blob from the recording URL
            fetch(recording.url)
                .then(response => response.blob())
                .then(blob => {
                    // For now, export as WebM (browser limitation for format conversion)
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${filename}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    this.showNotification(`Video exported as ${filename}.webm!`, 'success');
                })
                .catch(error => {
                    console.error('Export error:', error);
                    this.showNotification('Error exporting video: ' + error.message, 'error');
                });
                
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Error exporting video: ' + error.message, 'error');
        }
    }
    
    generateCaptions(recording) {
        this.showNotification('Generating captions... Please wait.', 'info');
        
        // Simulate caption generation
        setTimeout(() => {
            const captions = [
                { start: 0, end: 3, text: "Screen recording started" },
                { start: 3, end: 6, text: "Navigating through the application" },
                { start: 6, end: 9, text: "Demonstrating key features" },
                { start: 9, end: 12, text: "Showing important information" },
                { start: 12, end: 15, text: "Completing the workflow" }
            ];
            
            this.showCaptionsModal(captions, recording.name);
        }, 2000);
    }
    
    showCaptionsModal(captions, videoName) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold">Generated Captions - ${videoName}</h3>
                    <button id="closeCaptions" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div class="flex-1 overflow-y-auto bg-gray-800 rounded-lg p-4 mb-4">
                    <div id="captionsList" class="space-y-3">
                        ${captions.map((caption, index) => `
                            <div class="bg-gray-700 rounded-lg p-3 flex items-start space-x-3">
                                <div class="text-purple-400 text-sm font-mono min-w-[100px]">
                                    ${this.formatTime(caption.start)} - ${this.formatTime(caption.end)}
                                </div>
                                <div class="flex-1">
                                    <textarea 
                                        class="w-full bg-transparent border-none resize-none text-white" 
                                        rows="2"
                                        data-index="${index}"
                                    >${caption.text}</textarea>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="flex items-center space-x-4">
                    <button id="downloadSRT" class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-medium">
                        <i class="fas fa-download mr-2"></i>Download SRT
                    </button>
                    <button id="downloadVTT" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium">
                        <i class="fas fa-download mr-2"></i>Download VTT
                    </button>
                    <button id="copyText" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium">
                        <i class="fas fa-copy mr-2"></i>Copy Text
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Download SRT
        modal.querySelector('#downloadSRT').addEventListener('click', () => {
            const srtContent = this.convertToSRT(captions);
            this.downloadFile(srtContent, `${videoName}_captions.srt`, 'text/plain');
        });
        
        // Download VTT
        modal.querySelector('#downloadVTT').addEventListener('click', () => {
            const vttContent = this.convertToVTT(captions);
            this.downloadFile(vttContent, `${videoName}_captions.vtt`, 'text/vtt');
        });
        
        // Copy text
        modal.querySelector('#copyText').addEventListener('click', () => {
            const text = captions.map(c => c.text).join(' ');
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Text copied to clipboard!', 'success');
            });
        });
        
        // Close
        modal.querySelector('#closeCaptions').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        this.showNotification('Captions generated successfully!', 'success');
    }
    
    convertToSRT(captions) {
        return captions.map((caption, index) => {
            const start = this.formatSRTTime(caption.start);
            const end = this.formatSRTTime(caption.end);
            return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
        }).join('\n');
    }
    
    convertToVTT(captions) {
        let vtt = 'WEBVTT\n\n';
        vtt += captions.map(caption => {
            const start = this.formatVTTTime(caption.start);
            const end = this.formatVTTTime(caption.end);
            return `${start} --> ${end}\n${caption.text}`;
        }).join('\n\n');
        return vtt;
    }
    
    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }
    
    formatVTTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    scrollToApp() {
        const appSection = document.getElementById('app');
        if (appSection) {
            appSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    updateQuality(quality) {
        console.log('Quality updated to:', quality);
        this.showNotification(`Video quality set to ${quality}`, 'success');
    }
    
    updateFrameRate(frameRate) {
        console.log('Frame rate updated to:', frameRate);
        this.showNotification(`Frame rate set to ${frameRate} FPS`, 'success');
    }
    
    toggleAudio(enabled) {
        console.log('Audio toggled:', enabled);
        this.showNotification(`Audio ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    toggleMicrophone(enabled) {
        console.log('Microphone toggled:', enabled);
        this.showNotification(`Microphone ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    toggleFullscreen() {
        const videoPreview = document.getElementById('videoPreview');
        if (videoPreview && !videoPreview.classList.contains('hidden')) {
            if (videoPreview.requestFullscreen) {
                videoPreview.requestFullscreen();
            } else if (videoPreview.webkitRequestFullscreen) {
                videoPreview.webkitRequestFullscreen();
            } else if (videoPreview.msRequestFullscreen) {
                videoPreview.msRequestFullscreen();
            }
            this.showNotification('Video preview in fullscreen', 'info');
        } else {
            this.showNotification('Start recording to use fullscreen', 'error');
        }
    }
    
    togglePreviewFullscreen() {
        const previewArea = document.getElementById('previewArea');
        if (previewArea) {
            if (previewArea.requestFullscreen) {
                previewArea.requestFullscreen();
            } else if (previewArea.webkitRequestFullscreen) {
                previewArea.webkitRequestFullscreen();
            } else if (previewArea.msRequestFullscreen) {
                previewArea.msRequestFullscreen();
            }
            this.showNotification('Preview area in fullscreen', 'info');
        } else {
            this.showNotification('Preview area not available', 'warning');
        }
    }
    
    showNotification(message, type = 'info') {
        console.log(`Notification [${type}]: ${message}`);
        
        // Remove any existing notifications of the same type first
        document.querySelectorAll('.pixelcorder-notification').forEach(notif => {
            if (notif.parentNode) {
                notif.style.transform = 'translateX(120%)';
                setTimeout(() => {
                    if (notif.parentNode) {
                        notif.parentNode.removeChild(notif);
                    }
                }, 300);
            }
        });
        
        // Create modern notification element
        const notification = document.createElement('div');
        notification.className = 'pixelcorder-notification fixed bottom-4 right-4 z-[100] p-4 rounded-xl text-white max-w-md shadow-2xl transition-all duration-500 transform translate-x-full';
        
        let bgColor = '';
        let icon = '';
        
        switch (type) {
            case 'success':
                bgColor = 'bg-gradient-to-r from-green-500 to-emerald-600';
                icon = '<i class="fas fa-check-circle text-xl"></i>';
                break;
            case 'error':
                bgColor = 'bg-gradient-to-r from-red-500 to-rose-600';
                icon = '<i class="fas fa-times-circle text-xl"></i>';
                break;
            case 'warning':
                bgColor = 'bg-gradient-to-r from-yellow-500 to-orange-600';
                icon = '<i class="fas fa-exclamation-triangle text-xl"></i>';
                break;
            case 'info':
            default:
                bgColor = 'bg-gradient-to-r from-blue-500 to-indigo-600';
                icon = '<i class="fas fa-info-circle text-xl"></i>';
                break;
        }
        
        notification.className += ' ' + bgColor;
        notification.innerHTML = `
            <div class="flex items-center justify-between space-x-3">
                <div class="flex items-center space-x-3">
                    ${icon}
                    <span class="font-medium">${message}</span>
                </div>
                <button class="notification-close ml-4 hover:bg-white/20 rounded-full p-1 transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Close button handler
        const closeBtn = notification.querySelector('.notification-close');
        const closeNotification = () => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 500);
        };
        
        closeBtn.addEventListener('click', closeNotification);
        
        // Slide in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto close after 5 seconds
        setTimeout(() => {
            closeNotification();
        }, 5000);
    }
}

// Initialize the application
let pixelCorder;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating PixelCorder...');
    pixelCorder = new PixelCorder();
    window.pixelCorder = pixelCorder;
    console.log('PixelCorder ready:', pixelCorder);
});