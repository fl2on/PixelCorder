    const $startButton = document.getElementById('startButton');
    const $pauseButton = document.getElementById('pauseButton');
    const $stopButton = document.getElementById('stopButton');
    const $downloadButton = document.getElementById('downloadButton');
    const $resolutionSelect = document.getElementById('resolution');
    const $formatSelect = document.getElementById('format');
    const $qualitySelect = document.getElementById('quality');
    const $recordedVideo = document.getElementById('recordedVideo');

    let mediaRecorder;
    let recordedChunks = [];

    $startButton.addEventListener('click', startRecording);
    $pauseButton.addEventListener('click', pauseRecording);
    $stopButton.addEventListener('click', stopRecording);
    $downloadButton.addEventListener('click', downloadVideo);

    async function startRecording() {
        try {
            const resolution = $resolutionSelect.value.split('x');
            const media = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: {
                        ideal: resolution[0]
                    },
                    height: {
                        ideal: resolution[1]
                    },
                    frameRate: {
                        ideal: parseInt($qualitySelect.value, 10)
                    }
                },
                audio: {
                    echoCancellation: true
                }
            });

            mediaRecorder = new MediaRecorder(media, {
                mimeType: $formatSelect.value
            });
            recordedChunks = [];

            mediaRecorder.ondataavailable = handleDataAvailable;
            mediaRecorder.onstop = handleStop;

            const [videoTrack] = media.getVideoTracks();
            videoTrack.addEventListener("ended", () => handleRecordingEnd(mediaRecorder));

            $pauseButton.disabled = false;
            $stopButton.disabled = false;
            $downloadButton.disabled = true;

            mediaRecorder.start();
        } catch (error) {
            console.error('Error obtaining screen:', error);
        }
    }

    function pauseRecording() {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            $pauseButton.textContent = 'Resume';
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            $pauseButton.textContent = 'Pause';
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }

    function handleRecordingEnd() {
        $pauseButton.disabled = true;
        $stopButton.disabled = true;
        $downloadButton.disabled = false;
    }

    function handleDataAvailable(event) {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    }

    function handleStop() {
        const blob = new Blob(recordedChunks, {
            type: $formatSelect.value
        });
        $recordedVideo.src = URL.createObjectURL(blob);
        $recordedVideo.controls = true;
    }

    function downloadVideo() {
        const blob = new Blob(recordedChunks, {
            type: $formatSelect.value
        });
        const fileType = $formatSelect.value.split(';')[0].split('/')[1];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `screen_recording.${fileType}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }