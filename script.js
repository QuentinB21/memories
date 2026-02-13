/**
 * Romantic Digital Gift - Core Logic
 */

const state = {
    isOpen: false,
    currentPhotoIndex: 0,
    isDragging: false,
    isOutSwiping: false,
    suppressOutClick: false,
    startY: 0,
    startX: 0,
    dragBaseY: 0,
    currentY: 0,
    photos: [
        { id: 1, src: 'photos/1.jpg', text: "Le pantalon qui ni survivera pas... 👖 <br>Un oreillé aussi touché au combat 👀 <br><br> (Tap pour retourner)" },
        { id: 2, src: 'photos/2.jpg', text: "Askip c'est un coeur ❤️ <br> Ce qui est sûr c'est que le mien est à toi 😉" },
        { id: 3, src: 'photos/3.jpg', text: "Je t'ai déjà dit à quel point tu es magnifique ? <br> Dans le doute, je te le redis 😘" },
        { id: 4, src: 'photos/4.jpg', text: "C'est pas un peu paradoxale d'être giga fraiche tout en foutant le feu à la piste ? ❤️‍🔥💃🏻" },
        { id: 5, src: 'photos/5.jpg', text: "Merci d'être toi, tout simplement. <br> Je t'aime plus que les mots ne peuvent le dire ❤️ <br> Ma petite margueritte d'amour 🫠" },
        { id: 6, src: 'photos/6.jpg', text: "Guette ce regard de tueuse ! On dirai tu cherche à me tirer dessus !<br> Alors que je suis déjà tomber sous ton charme 👀" },
        { id: 7, src: 'photos/7.png', text: "Mine de rien faire ça m'a pris un peu de temps, mais ça me plait de te faire ce genre de cadeau ❤️" },
        { id: 8, src: 'photos/8.png', text: "C'était pas prévu au dépard, mais j'ai eu envie d'en refaire une 😉 <br> Mieux réussi tu ne trouve pas  ? 😘" },
        { id: 9, src: 'photos/9.jpg', text: "Ma margueritte<br> Du matin au soir, ton doux parfum m'enivre,<br> Ecrivons notre hisoire" }
    ]
};
const PEEK_SCALE = 0.96;

const dom = {
    envelopeWrapper: document.getElementById('envelopeWrapper'),
    cardContainer: document.getElementById('cardContainer'),
    startOverlay: document.getElementById('startOverlay'),
    uiControls: document.getElementById('uiControls'),
    bgMusic: document.getElementById('bgMusic'),
    musicToggle: document.getElementById('musicToggle'),
    volumeSlider: document.getElementById('volumeSlider'),
    counter: document.getElementById('counter')
};

function init() {
    dom.envelopeWrapper.addEventListener('click', handleEnvelopeClick);
    dom.musicToggle.addEventListener('click', toggleMusic);
    dom.volumeSlider.addEventListener('input', onVolumeChange);
    dom.bgMusic.volume = Number(dom.volumeSlider.value) / 100;
    setMusicUiState(false);
    renderCards();
    updateCounter();
    console.log('App Initialized');
}

function handleEnvelopeClick() {
    if (state.isOpen) return;

    state.isOpen = true;
    dom.envelopeWrapper.classList.add('is-open');
    dom.envelopeWrapper.style.cursor = 'default';

    vibrate(50);
    playMusic();

    // Enable interaction on the first card after animation
    setTimeout(() => {
        enableCardInteraction(state.currentPhotoIndex);
    }, 600); // generic delay matching CSS transition
}

function renderCards() {
    dom.cardContainer.innerHTML = ''; // Clear
    state.photos.forEach((photo, index) => {
        const card = document.createElement('div');
        card.className = `photo-card ${index === 0 ? 'current' : ''}`;

        // Fix: Z-index MUST be less than .envelope-front (which is 10)
        // We stack them e.g., 5, 4, 3...
        card.style.zIndex = 5 + (state.photos.length - index);

        card.dataset.index = index;

        // Front Side
        const front = document.createElement('div');
        front.className = 'card-face card-front';
        const img = document.createElement('img');
        img.src = photo.src;
        img.alt = "Souvenir";
        front.appendChild(img);

        // Back Side
        const back = document.createElement('div');
        back.className = 'card-face card-back';

        const contentHelper = document.createElement('div');
        contentHelper.className = 'back-content';

        const p = document.createElement('p');
        p.innerHTML = photo.text; // innerHTML for line breaks

        contentHelper.appendChild(p);

        // Add 'Next' button if not last
        if (index < state.photos.length) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'next-btn';
            nextBtn.innerText = index === state.photos.length - 1 ? "Fin ❤️" : "Suivant →";

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't flip back
                onNextClick(card);
            });
            contentHelper.appendChild(nextBtn);
        }

        back.appendChild(contentHelper);

        card.appendChild(front);
        card.appendChild(back);

        dom.cardContainer.appendChild(card);
    });
}

function updateCounter() {
    const current = Math.min(state.currentPhotoIndex + 1, state.photos.length);
    if (dom.counter) {
        dom.counter.innerText = `${current} / ${state.photos.length}`;
    }
}

function enableCardInteraction(index) {
    const card = document.querySelector(`.photo-card[data-index="${index}"]`);
    if (!card) return;

    // Use Pointer Events for unified touch/mouse
    card.addEventListener('pointerdown', onPointerDown);

    // Also click to flip logic
    card.addEventListener('click', (e) => {
        // Only flip if it has the 'is-out' class
        // (independent of drag state check because click fires after mouseup)
        if (card.classList.contains('is-out')) {
            if (state.suppressOutClick) {
                state.suppressOutClick = false;
                return;
            }
            card.classList.toggle('is-flipped');
            vibrate(20);
        }
    });
}

function onPointerDown(e) {
    const card = e.currentTarget;
    if (card.classList.contains('is-out')) {
        state.isOutSwiping = true;
        state.startX = e.clientX;
        state.startY = e.clientY;

        card.setPointerCapture(e.pointerId);
        card.addEventListener('pointermove', onOutSwipeMove);
        card.addEventListener('pointerup', onOutSwipeEnd);
        card.addEventListener('pointercancel', onOutSwipeEnd);
        return;
    }

    state.isDragging = true;
    state.startY = e.clientY;
    state.dragBaseY = getCurrentTranslateY(card);
    card.classList.add('is-dragging');

    // Capture pointer
    card.setPointerCapture(e.pointerId);

    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', onPointerUp);
    card.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
    if (!state.isDragging) return;

    const dy = e.clientY - state.startY;
    const card = e.currentTarget;

    // Pull-up moves freely; pull-down is clamped to keep the peek visible.
    if (dy < 0) {
        const translate = state.dragBaseY + dy;
        card.style.transform = `translateY(${translate}px) scale(${PEEK_SCALE})`;
    } else {
        card.style.transform = `translateY(${state.dragBaseY}px) scale(${PEEK_SCALE})`;
    }
}

function onPointerUp(e) {
    if (!state.isDragging) return;

    state.isDragging = false;
    const card = e.currentTarget;
    const dy = e.clientY - state.startY;

    card.classList.remove('is-dragging');
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerup', onPointerUp);
    card.removeEventListener('pointercancel', onPointerUp);
    card.style.transform = '';

    // Threshold to pull out (e.g., -100px)
    if (dy < -80) {
        pullCardOut(card);
        vibrate(50);
    }
}

function onOutSwipeMove(e) {
    if (!state.isOutSwiping) return;
}

function onOutSwipeEnd(e) {
    if (!state.isOutSwiping) return;

    state.isOutSwiping = false;
    const card = e.currentTarget;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    card.removeEventListener('pointermove', onOutSwipeMove);
    card.removeEventListener('pointerup', onOutSwipeEnd);
    card.removeEventListener('pointercancel', onOutSwipeEnd);

    if (dx > 70 && Math.abs(dx) > Math.abs(dy) && !card.classList.contains('is-gone')) {
        state.suppressOutClick = true;
        onNextClick(card);
        vibrate(30);
    }
}

function pullCardOut(card) {
    // Fix: Move card to body to break out of envelope stacking context
    // We need to calculate its current screen position to avoid visual jump
    const rect = card.getBoundingClientRect();

    // Set fixed position styles BEFORE moving to maintain visual continuity
    card.style.position = 'fixed';
    card.style.top = rect.top + 'px';
    card.style.left = rect.left + 'px';
    card.style.width = rect.width + 'px';
    card.style.height = rect.height + 'px';
    card.style.transform = 'none'; // Reset any transform from drag
    card.style.margin = '0';
    card.style.opacity = '1';

    document.body.appendChild(card);

    // Force reflow
    card.offsetHeight;

    // Add class for centering animation
    requestAnimationFrame(() => {
        card.classList.add('is-out');
        const targetRect = getCenteredCardRect();
        card.style.top = `${targetRect.top}px`;
        card.style.left = `${targetRect.left}px`;
        card.style.width = `${targetRect.width}px`;
        card.style.height = `${targetRect.height}px`;
        card.style.transform = '';
        card.style.margin = '0';
        card.style.opacity = '1';
    });
}

function getCenteredCardRect() {
    const targetWidth = Math.min(window.innerWidth * 0.85, 400);
    const targetHeight = Math.min(window.innerHeight * 0.65, 600);

    return {
        width: targetWidth,
        height: targetHeight,
        left: (window.innerWidth - targetWidth) / 2,
        top: (window.innerHeight - targetHeight) / 2
    };
}

function getCurrentTranslateY(el) {
    const transform = window.getComputedStyle(el).transform;
    if (!transform || transform === 'none') return 0;

    const matrix = new DOMMatrix(transform);
    return matrix.m42 || 0;
}

function onNextClick(currentCard) {
    // 1. Animate current card away
    currentCard.classList.add('is-gone');

    // 2. Wait for animation
    setTimeout(() => {
        currentCard.remove(); // Remove from DOM entirely since it's on body now

        // 3. Increment index
        state.currentPhotoIndex++;
        updateCounter();

        if (state.currentPhotoIndex < state.photos.length) {
            // activate next
            // We need to find the card inside the cardContainer (which is still in the envelope)
            // Note: Since renderCards creates all cards, subsequent ones are still in dom.cardContainer
            const nextCard = dom.cardContainer.querySelector(`.photo-card[data-index="${state.currentPhotoIndex}"]`);
            if (nextCard) {
                nextCard.classList.add('current');
                enableCardInteraction(state.currentPhotoIndex);
            }
        } else {
            // End of experience
            showEndScreen();
        }
    }, 600);
}

function showEndScreen() {
    const overlay = document.createElement('div');
    overlay.className = 'end-overlay';
    overlay.innerHTML = "<h1>Joyeuse St Valentin ❤️</h1><p>Je t'aime.</p>";
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.classList.add('visible');
    }, 100);
}

/* --- Audio & Haptics --- */

function toggleMusic(e) {
    e.stopPropagation(); // prevent other clicks
    if (dom.bgMusic.paused) {
        playMusic();
    } else {
        pauseMusic();
    }
}

function playMusic() {
    dom.bgMusic.play().then(() => {
        dom.musicToggle.innerText = '🎵';
        setMusicUiState(true);
    }).catch(e => {
        console.log("Audio autoplay prevented", e);
        dom.musicToggle.innerText = '🔇';
        setMusicUiState(false);
    });
}

function pauseMusic() {
    dom.bgMusic.pause();
    dom.musicToggle.innerText = '🔇';
    setMusicUiState(false);
}

function onVolumeChange(e) {
    dom.bgMusic.volume = Number(e.target.value) / 100;
}

function setMusicUiState(isPlaying) {
    dom.musicToggle.classList.toggle('playing', isPlaying);
    dom.uiControls.classList.toggle('music-on', isPlaying);
}
function vibrate(ms) {
    if (navigator.vibrate) {
        navigator.vibrate(ms);
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


