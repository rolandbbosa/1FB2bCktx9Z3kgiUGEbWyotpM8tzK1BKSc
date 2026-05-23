// Age Verification
function checkAgeVerification() {
    if (!document.cookie.includes('ageVerified=true')) {
        const modal = document.getElementById('ageModal');
        modal.style.display = 'flex';
    }
}

function setAgeVerified() {
    document.cookie = 'ageVerified=true; max-age=31536000; path=/';
    const modal = document.getElementById('ageModal');
    modal.style.display = 'none';
}

function exitPage() {
    window.location.href = 'about:blank';
}
let allVideos = [];
let dailyVideos = [];
let allPrerollAds = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentPopupVideo = null;
let currentPopupAd = null;
let currentMainVideoSource = null;
let currentMainVideoTitle = null;
let currentAdSkipTimeout = null;
let adPlayingListener = null;

function getVideoLink(data) {
    return data.videoLink || data.videoUrl || data.link || data.url || data.src;
}

function getVideoTitle(data) {
    return data.title || data.name || 'Video Preview';
}

const VIDEO_RETRY_INTERVAL = 8000;
const VIDEO_RETRY_MESSAGE_DELAY = 10000;
const VIDEO_MAX_RETRY = 12;

function isValidVideoLink(url) {
    return typeof url === 'string' && url.trim() !== '';
}

function buildRetryVideoUrl(url, attempt) {
    if (attempt <= 0) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}retry=${Date.now()}&attempt=${attempt}`;
}

function showVideoStatusMessage(grid, text) {
    let message = grid.querySelector('.video-status-message');
    if (!message) {
        message = document.createElement('p');
        message.className = 'video-status-message';
        message.style.cssText = 'text-align:center; grid-column:1 / -1; color: var(--text-muted);';
        grid.appendChild(message);
    }
    message.textContent = text;
}

function clearVideoStatusMessage(grid) {
    const message = grid.querySelector('.video-status-message');
    if (message) message.remove();
}

function setupVideoLoadWithRetry(video, videoEl, item, grid, loadingEl, onSuccess, onFailure) {
    let retryAttempt = 0;
    let appended = false;
    let resolved = false;

    function appendItem() {
        if (appended) return;
        appended = true;
        clearVideoStatusMessage(grid);
        if (!item.parentNode) {
            grid.appendChild(item);
        }
        if (loadingEl && loadingEl.style.display !== 'none') {
            loadingEl.style.display = 'none';
        }
        if (typeof onSuccess === 'function') {
            onSuccess();
        }
    }

    function loadSource() {
        videoEl.src = buildRetryVideoUrl(video.videoLink, retryAttempt);
        videoEl.load();
    }

    function handlePlayable() {
        if (resolved) return;
        resolved = true;
        appendItem();
    }

    function handleError() {
        if (resolved) return;
        retryAttempt += 1;
        if (retryAttempt > VIDEO_MAX_RETRY) {
            if (appended && item.parentNode) {
                item.parentNode.removeChild(item);
            }
            if (typeof onFailure === 'function') {
                onFailure();
            }
            return;
        }
        setTimeout(loadSource, VIDEO_RETRY_INTERVAL);
    }

    videoEl.addEventListener('loadeddata', handlePlayable);
    videoEl.addEventListener('canplaythrough', handlePlayable);
    videoEl.addEventListener('error', handleError);

    loadSource();
}

function seededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function shuffleWithSeed(array, seed) {
    const result = array.slice();
    const random = seededRandom(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function getDailySeed() {
    const today = new Date();
    return Number(`${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`);
}

function buildHash(page = null, videoId = null) {
    const parts = [''];
    if (page && page > 1) parts.push(`page-${page}`);
    if (videoId) parts.push(`video-${videoId}`);
    return parts.join('/');
}

function parseHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return { page: 1, videoId: null };
    const parts = hash.split('/');
    if (parts[0].toLowerCase() !== 'tubevideos') return { page: 1, videoId: null };
    let page = 1;
    let videoId = null;
    for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (p.startsWith('page-')) page = parseInt(p.slice(5), 10) || 1;
        if (p.startsWith('video-')) videoId = p.slice(6) || null;
    }
    return { page, videoId };
}

function handleHashChange() {
    const { page, videoId } = parseHash();
    if (page !== currentPage) {
        currentPage = page;
        renderVideosGrid();
        renderPagination();
    }
    if (videoId) {
        openVideoModal(videoId, false);
    } else {
        closeVideoModal(false);
    }
}

async function loadVideos() {
    try {
        const snapshot = await db.collection(COLLECTIONS.IMAGES).orderBy('createdAt', 'desc').get();
        allVideos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const videoLink = getVideoLink(data);
            const hasImageLink = !!data.imageLink;
            const isPreroll = data.type === 'preroll';
            if ((data.type === 'video' || (videoLink && !hasImageLink && !isPreroll)) && isValidVideoLink(videoLink)) {
                allVideos.push({ id: doc.id, videoLink, title: getVideoTitle(data) });
            }
        });

        if (allVideos.length === 0) {
            document.getElementById('videosGrid').innerHTML = '<p style="text-align:center; grid-column:1 / -1; color: var(--text-muted);">No videos found.</p>';
            document.getElementById('videoCount').textContent = '0 stored videos.';
            document.getElementById('pageInfo').textContent = '';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        dailyVideos = shuffleWithSeed(allVideos, getDailySeed());
        // apply current hash if present
        const parsed = parseHash();
        currentPage = parsed.page || 1;
        renderVideosGrid();
        renderPagination();
        await loadPrerollAds();
        if (parsed.videoId) openVideoModal(parsed.videoId, false);
    } catch (error) {
        console.error('Error loading videos:', error);
        document.getElementById('videosGrid').innerHTML = '<div class="loading">Failed to load videos</div>';
    }
}

async function loadPrerollAds() {
    try {
        const snapshot = await db.collection(COLLECTIONS.IMAGES).orderBy('createdAt', 'desc').get();
        allPrerollAds = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'preroll') {
                allPrerollAds.push({
                    id: doc.id,
                    adLink: data.adLink || data.videoLink || data.link || data.url,
                    clickUrl: data.clickUrl || data.linkUrl || null,
                    title: data.title || getVideoTitle(data)
                });
            }
        });
    } catch (error) {
        console.error('Error loading pre-roll ads:', error);
    }
}

function getRandomPrerollAd() {
    if (!allPrerollAds.length) return null;
    const index = Math.floor(Math.random() * allPrerollAds.length);
    return allPrerollAds[index];
}

function resetAdControls() {
    currentPopupAd = null;
    currentMainVideoSource = null;
    currentMainVideoTitle = null;
    if (currentAdSkipTimeout) {
        clearTimeout(currentAdSkipTimeout);
        currentAdSkipTimeout = null;
    }
    const linkButton = document.getElementById('prerollLinkButton');
    const skipButton = document.getElementById('skipAdButton');
    const modalContent = document.querySelector('.video-modal-content');
    const modalVideo = document.getElementById('modalVideo');
    // remove any pending 'playing' listener
    if (adPlayingListener && modalVideo) {
        modalVideo.removeEventListener('playing', adPlayingListener);
        adPlayingListener = null;
    }
    if (linkButton) {
        linkButton.style.display = 'none';
        linkButton.removeAttribute('href');
        linkButton.innerHTML = '<span class="overlay-text">See cams</span>';
    }
    if (skipButton) skipButton.style.display = 'none';
    if (modalContent) modalContent.classList.remove('ad-active');
}

function setAdControls(ad) {
    const linkButton = document.getElementById('prerollLinkButton');
    const skipButton = document.getElementById('skipAdButton');
    const modalContent = document.querySelector('.video-modal-content');
    const modalVideo = document.getElementById('modalVideo');
    if (!linkButton || !skipButton || !modalContent) return;
    // clear previous listener and timeout
    if (adPlayingListener && modalVideo) {
        modalVideo.removeEventListener('playing', adPlayingListener);
        adPlayingListener = null;
    }
    if (currentAdSkipTimeout) {
        clearTimeout(currentAdSkipTimeout);
        currentAdSkipTimeout = null;
    }
    skipButton.style.display = 'none';

    if (ad && ad.clickUrl) {
        linkButton.href = ad.clickUrl;
        linkButton.style.display = 'flex';
        linkButton.innerHTML = '<span class="overlay-text">See cams</span>';
        modalContent.classList.add('ad-active');
    } else {
        linkButton.style.display = 'none';
        linkButton.removeAttribute('href');
        modalContent.classList.remove('ad-active');
    }

    // Start skip countdown only after the ad actually starts playing
    if (ad && modalVideo) {
        adPlayingListener = function onAdPlaying() {
            if (currentAdSkipTimeout) clearTimeout(currentAdSkipTimeout);
            currentAdSkipTimeout = setTimeout(() => {
                skipButton.style.display = 'inline-flex';
            }, 5000);
            // remove listener after it's used
            modalVideo.removeEventListener('playing', adPlayingListener);
            adPlayingListener = null;
        };
        modalVideo.addEventListener('playing', adPlayingListener);
    }
}

function skipAd() {
    if (!currentPopupVideo || !currentMainVideoSource) return;
    if (currentAdSkipTimeout) {
        clearTimeout(currentAdSkipTimeout);
        currentAdSkipTimeout = null;
    }
    currentPopupAd = null;
    setAdControls(null);
    setupModalVideoForPlayback(currentMainVideoSource, currentMainVideoTitle, true);
}

function renderVideosGrid() {
    const grid = document.getElementById('videosGrid');
    const loadingEl = document.getElementById('videosLoading');
    grid.innerHTML = '';
    clearVideoStatusMessage(grid);
    if (loadingEl) loadingEl.style.display = 'block';

    if (dailyVideos.length === 0) {
        showVideoStatusMessage(grid, 'No videos to show.');
        if (loadingEl) loadingEl.style.display = 'none';
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVideos = dailyVideos.slice(start, end);
    let visibleCount = 0;
    let pendingVideos = pageVideos.length;

    pageVideos.forEach(video => {
        if (!isValidVideoLink(video.videoLink)) {
            pendingVideos -= 1;
            return;
        }

        const item = document.createElement('div');
        item.className = 'video-card';
        const thumb = document.createElement('div');
        thumb.className = 'video-thumb';
        thumb.style.position = 'relative';

        const videoEl = document.createElement('video');
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', '');
        videoEl.preload = 'auto';
        videoEl.style.width = '100%';
        videoEl.style.height = '220px';
        videoEl.style.objectFit = 'cover';
        videoEl.addEventListener('contextmenu', (event) => event.preventDefault());

        const overlay = document.createElement('a');
        overlay.className = 'video-overlay';
        overlay.href = buildHash(currentPage, video.id);
        overlay.innerHTML = '<div class="overlay-content">▶ Preview</div>';
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = buildHash(currentPage, video.id);
        });

        thumb.appendChild(videoEl);
        thumb.appendChild(overlay);

        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = video.title;

        item.appendChild(thumb);
        item.appendChild(label);

        setupVideoLoadWithRetry(video, videoEl, item, grid, loadingEl, () => {
            visibleCount += 1;
            if (visibleCount === 1 && loadingEl) {
                loadingEl.style.display = 'none';
            }
            pendingVideos -= 1;
            if (pendingVideos === 0 && visibleCount === 0) {
                if (loadingEl) loadingEl.style.display = 'none';
                showVideoStatusMessage(grid, 'No playable videos found on this page.');
            }
        }, () => {
            pendingVideos -= 1;
            if (pendingVideos === 0 && visibleCount === 0) {
                if (loadingEl) loadingEl.style.display = 'none';
                showVideoStatusMessage(grid, 'No playable videos found on this page.');
            }
        });
    });

    document.getElementById('videoCount').textContent = `${allVideos.length} stored videos.`;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(dailyVideos.length / itemsPerPage)}`;

    if (pendingVideos === 0 && visibleCount === 0) {
        if (loadingEl) loadingEl.style.display = 'none';
        showVideoStatusMessage(grid, 'No playable videos found on this page.');
    }
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const totalPages = Math.ceil(dailyVideos.length / itemsPerPage);
    if (totalPages <= 1) return;

    const createLink = (text, page, isDisabled = false, isActive = false) => {
        const link = document.createElement('a');
        link.textContent = text;
        link.href = isDisabled ? 'javascript:void(0);' : buildHash(page, null);
        if (isDisabled) {
            link.classList.add('disabled');
            link.setAttribute('aria-disabled', 'true');
        }
        if (isActive) {
            link.classList.add('active');
        }
        return link;
    };

    const prevLink = createLink('← Previous', currentPage - 1, currentPage === 1);
    pagination.appendChild(prevLink);

    for (let i = 1; i <= totalPages; i++) {
        const pageLink = createLink(i.toString(), i, false, i === currentPage);
        pagination.appendChild(pageLink);
    }

    const nextLink = createLink('Next →', currentPage + 1, currentPage === totalPages);
    pagination.appendChild(nextLink);
}

function setupModalVideoForPlayback(source, title, enableControls = true) {
    const modalVideo = document.getElementById('modalVideo');
    const modalTitle = document.getElementById('videoModalTitle');

    modalTitle.textContent = title;
    modalVideo.src = source;
    modalVideo.controls = enableControls;
    modalVideo.muted = false;
    modalVideo.addEventListener('contextmenu', (event) => event.preventDefault());
    modalVideo.play().catch(() => {});
}

function openVideoModal(videoId, updateHash = true) {
    const video = dailyVideos.find(v => v.id === videoId) || allVideos.find(v => v.id === videoId);
    if (!video) return;

    const modal = document.getElementById('videoModal');
    const ad = getRandomPrerollAd();
    const mainTitle = video.title;
    const mainSource = video.videoLink;
    const modalVideo = document.getElementById('modalVideo');

    currentMainVideoSource = mainSource;
    currentMainVideoTitle = mainTitle;

    const playMainVideo = () => {
        currentPopupAd = null;
        setAdControls(null);
        modalVideo.onended = null;
        modalVideo.onerror = null;
        setupModalVideoForPlayback(mainSource, mainTitle, true);
    };

    if (ad) {
        currentPopupAd = ad;
        setupModalVideoForPlayback(ad.adLink, `Ad: ${ad.title || 'Pre-roll'} — ${mainTitle}`, false);
        setAdControls(ad);
        modalVideo.onended = playMainVideo;
        modalVideo.onerror = playMainVideo;
    } else {
        resetAdControls();
        playMainVideo();
    }

    modal.classList.add('active');
    currentPopupVideo = modalVideo;

    if (updateHash) {
        window.location.hash = buildHash(currentPage, videoId);
    }
}

function closeVideoModal(updateHash = true) {
    const modal = document.getElementById('videoModal');
    if (!modal.classList.contains('active')) return;

    modal.classList.remove('active');
    if (currentPopupVideo) {
        currentPopupVideo.pause();
        currentPopupVideo.currentTime = 0;
        currentPopupVideo.src = '';
        currentPopupVideo.load();
        currentPopupVideo = null;
    }
    resetAdControls();

    if (updateHash) {
        const h = buildHash(currentPage, null);
        history.replaceState(null, '', h);
    }
}

function setupEventListeners() {
    const modal = document.getElementById('videoModal');
    const modalClose = modal.querySelector('.modal-close');
    const skipButton = document.getElementById('skipAdButton');

    if (modalClose) {
        modalClose.addEventListener('click', closeVideoModal);
    }

    if (skipButton) {
        skipButton.addEventListener('click', (e) => {
            e.stopPropagation();
            skipAd();
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeVideoModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeVideoModal();
        }
    });

    const ageNoBtn = document.getElementById('ageNoBtn');
    const ageYesBtn = document.getElementById('ageYesBtn');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (ageNoBtn) {
        ageNoBtn.addEventListener('click', exitPage);
    }
    if (ageYesBtn) {
        ageYesBtn.addEventListener('click', setAgeVerified);
    }
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('active');
            hamburgerBtn.classList.toggle('active');
        });
    }
}


window.addEventListener('DOMContentLoaded', () => {
    checkAgeVerification();
    setupEventListeners();
    loadVideos();
    window.addEventListener('hashchange', handleHashChange);
});
