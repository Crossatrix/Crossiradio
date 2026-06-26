let songs = [];
let newsSchedule = [];
let playedNewsTimes = new Set(); // Verhindert, dass die Nachricht in derselben Minute mehrfach triggert

const audioPlayer = new Audio();
let isPlaying = false;
let isNewsPlaying = false;

// DOM Elements
const playBtn = document.getElementById('play-btn');
const trackTitle = document.getElementById('track-title');
const statusBadge = document.getElementById('status-badge');
const newsBox = document.getElementById('news-box');
const transcriptText = document.getElementById('transcript-text');

// Init
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Relativ zum aktuellen Verzeichnis ('./'), um Base-URL-Fehler auf Custom Domains zu umgehen
        const songResponse = await fetch('./song_choice.json');
        if (!songResponse.ok) throw new Error(`HTTP error! status: ${songResponse.status}`);
        songs = await songResponse.json();
        
        const newsResponse = await fetch('./news.json');
        if (!newsResponse.ok) throw new Error(`HTTP error! status: ${newsResponse.status}`);
        newsSchedule = await newsResponse.json();
    } catch (error) {
        console.error("Error loading configuration files:", error);
        trackTitle.textContent = "Error loading playlist.";
    }
});

// Play/Pause Click
playBtn.addEventListener('click', () => {
    if (!isPlaying) {
        startRadio();
    } else {
        stopRadio();
    }
});

function startRadio() {
    isPlaying = true;
    playBtn.textContent = "Stop Radio";
    playNextSong();
    
    // Start interval to check for news every second
    setInterval(checkNewsSchedule, 1000);
}

function stopRadio() {
    isPlaying = false;
    isNewsPlaying = false;
    audioPlayer.pause();
    playBtn.textContent = "Play Radio";
    statusBadge.textContent = "Ready";
    statusBadge.className = "status-badge";
    trackTitle.textContent = "Click play to start listening";
    newsBox.classList.add('hidden');
}

// Selects a song based on its probability
function getRandomSong() {
    let totalProbability = songs.reduce((sum, song) => sum + parseFloat(song.probability), 0);
    let randomNum = Math.random() * totalProbability;
    
    for (let song of songs) {
        randomNum -= parseFloat(song.probability);
        if (randomNum <= 0) {
            return song;
        }
    }
    return songs[0];
}

function playNextSong() {
    if (!isPlaying || isNewsPlaying) return;

    const currentSong = getRandomSong();
    // Relativer Pfad für den Audio-Ordner
    audioPlayer.src = `./tracks/${currentSong.name}`;
    
    // Check if optional display-name exists, otherwise fallback to filename
    if (currentSong["display-name"]) {
        trackTitle.textContent = currentSong["display-name"];
    } else {
        trackTitle.textContent = currentSong.name.replace('.mp3', '');
    }
    
    statusBadge.textContent = "Playing";
    statusBadge.className = "status-badge playing";
    newsBox.classList.add('hidden');

    audioPlayer.play().catch(e => console.log("Playback error, waiting for interaction:", e));
}

// Check every second if it's time for news
async function checkNewsSchedule() {
    if (!isPlaying) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeString = `${hours}:${minutes}`;

    // Reset played news history at midnight
    if (currentTimeString === "00:00") {
        playedNewsTimes.clear();
    }

    // Find if there is a news broadcast scheduled for right now
    const currentNews = newsSchedule.find(n => n.time === currentTimeString);

    if (currentNews && !playedNewsTimes.has(currentTimeString)) {
        playedNewsTimes.add(currentTimeString);
        playNews(currentNews);
    }
}

async function playNews(newsItem) {
    isNewsPlaying = true;
    audioPlayer.pause(); // Stops current song immediately

    statusBadge.textContent = "News Broadcast";
    statusBadge.className = "status-badge news";
    trackTitle.textContent = `Breaking News (${newsItem.time})`;

    // Load transcript
    try {
        // Relativer Pfad für News-Transkripte
        const transResponse = await fetch(`./news/${newsItem.transcript}`);
        if (transResponse.ok) {
            const text = await transResponse.text();
            transcriptText.textContent = text;
            newsBox.classList.remove('hidden');
        } else {
            transcriptText.textContent = "Transcript unavailable.";
            newsBox.classList.remove('hidden');
        }
    } catch (e) {
        transcriptText.textContent = "Error loading transcript.";
        newsBox.classList.remove('hidden');
    }

    // Play News Audio
    audioPlayer.src = `./news/${newsItem.name}`;
    audioPlayer.play().catch(e => console.log("News playback error:", e));
}

// When audio ends, determine what to do next
audioPlayer.onended = () => {
    if (isNewsPlaying) {
        isNewsPlaying = false;
        playNextSong();
    } else {
        playNextSong();
    }
};
