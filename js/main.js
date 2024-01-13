const $startButton = document.getElementById('startButton');
const $pauseButton = document.getElementById('pauseButton');
const $stopButton = document.getElementById('stopButton');
const $downloadButton = document.getElementById('downloadButton');
const $resolutionSelect = document.getElementById('resolution');
const $formatSelect = document.getElementById('format');
const $qualitySelect = document.getElementById('quality');
const $recordedVideo = document.getElementById('recordedVideo');
const $notification = document.getElementById('notification');
const $notificationText = document.getElementById('notificationText');

let mediaRecorder;
let recordedChunks = [];

$startButton.addEventListener('click', startRecording);
$pauseButton.addEventListener('click', pauseRecording);
$stopButton.addEventListener('click', stopRecording);
$downloadButton.addEventListener('click', downloadVideo);

let isFirstTime = true;

async function startRecording() {
    try {
        const resolution = $resolutionSelect.value.split('x');
        const media = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: {
                    ideal: parseInt(resolution[0], 10)
                },
                height: {
                    ideal: parseInt(resolution[1], 10)
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
        mediaRecorder.onstop = handleRecordingStop;

        const [videoTrack] = media.getVideoTracks();
        videoTrack.addEventListener("ended", handleRecordingEnd);

        $pauseButton.disabled = false;
        $stopButton.disabled = false;
        $downloadButton.disabled = true;

        mediaRecorder.start();

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (isFirstTime) {
            if ($notification) {
                $notificationText.textContent = 'Press the Stop button on the interface to view the video.';
                $notification.classList.remove('hidden');
            }
            isFirstTime = false;
        }
    } catch (error) {
        console.error('Error obtaining screen:', error);
    }
}

function pauseRecording() {
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            $pauseButton.textContent = 'Resume';
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            $pauseButton.textContent = 'Pause';
        }
    }
}

function stopRecording() {
    $notification.classList.add('hidden');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        handleRecordingStop();
    }
}

function handleRecordingEnd() {
    if (mediaRecorder && mediaRecorder.state === 'recording' && recordedChunks.length > 0) {
        handleRecordingStop();
    }
}

function handleRecordingStop() {
    if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, {
            type: $formatSelect.value
        });

        const url = URL.createObjectURL(blob);
        $recordedVideo.src = url;
        $recordedVideo.controls = true;
        $downloadButton.disabled = false;
        $stopButton.click();
    }
}

function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
    }
}

function downloadVideo() {
    if (recordedChunks.length === 0) {
        $stopButton.click();
        return;
    }

    const blob = new Blob(recordedChunks, {
        type: $formatSelect.value
    });
    const fileType = $formatSelect.value.split(';')[0].split('/')[1];
    const currentDate = new Date().toLocaleString().replace(/[/:\s]/g, '_');
    const randomFileName = `PixelCorder_${currentDate}.${fileType}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = randomFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
