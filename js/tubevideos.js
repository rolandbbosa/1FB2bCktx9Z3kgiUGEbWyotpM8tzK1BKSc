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

function getVideoLink(data) {
    return data.videoLink || data.videoUrl || data.link || data.url || data.src;
}

function getVideoTitle(data) {
    return data.title || data.name || 'Video Preview';
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
    const parts = ['#TubeVideos'];
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
            if ((data.type === 'video' || (videoLink && !hasImageLink && !isPreroll))) {
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
    if (linkButton) linkButton.style.display = 'none';
    if (skipButton) skipButton.style.display = 'none';
}

function setAdControls(ad) {
    const linkButton = document.getElementById('prerollLinkButton');
    const skipButton = document.getElementById('skipAdButton');
    if (!linkButton || !skipButton) return;

    if (ad && ad.clickUrl) {
        linkButton.style.display = 'inline-flex';
        linkButton.href = ad.clickUrl;
    } else {
        linkButton.style.display = 'none';
        linkButton.removeAttribute('href');
    }
    skipButton.style.display = 'none';
    if (currentAdSkipTimeout) {
        clearTimeout(currentAdSkipTimeout);
        currentAdSkipTimeout = null;
    }
    if (ad) {
        currentAdSkipTimeout = setTimeout(() => {
            skipButton.style.display = 'inline-flex';
        }, 3000);
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
    if (loadingEl) loadingEl.style.display = 'block';

    if (dailyVideos.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column:1 / -1; color: var(--text-muted);">No videos to show.</p>';
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVideos = dailyVideos.slice(start, end);

    let loadedCount = 0;
    pageVideos.forEach(video => {
        const item = document.createElement('div');
        item.className = 'video-card';
        // create thumbnail wrapper for overlay
        const thumb = document.createElement('div');
        thumb.className = 'video-thumb';
        thumb.style.position = 'relative';

        const videoEl = document.createElement('video');
        videoEl.src = video.videoLink;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.preload = 'metadata';
        videoEl.style.width = '100%';
        videoEl.style.height = '220px';
        videoEl.style.objectFit = 'cover';
        videoEl.addEventListener('contextmenu', (event) => event.preventDefault());

        // don't hide items while metadata loads; keep thumbnails clickable even
        // if the video source doesn't provide metadata (e.g., external hosts)
        let appended = false;
        videoEl.addEventListener('loadedmetadata', () => {
            loadedCount += 1;
            // Append the card only when the video reports metadata (playable)
            if (!appended) {
                grid.appendChild(item);
                appended = true;
            }
            if (loadingEl && loadedCount === 1) loadingEl.style.display = 'none';
        });

        videoEl.addEventListener('error', () => {
            // If the video fails to load, do not append the card. If it was
            // already appended, remove it so only working videos remain.
            try {
                if (appended && item.parentNode) item.parentNode.removeChild(item);
            } catch (err) {}
        });

        const overlay = document.createElement('a');
        overlay.className = 'video-overlay';
        overlay.href = buildHash(currentPage, video.id);
        overlay.innerHTML = '<div class="overlay-content">▶ Preview</div>';
        overlay.addEventListener('click', (e) => {
            // allow hash navigation to trigger modal, prevent default full navigation
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

        // items are appended when/if `loadedmetadata` fires above
    });

    document.getElementById('videoCount').textContent = `${allVideos.length} stored videos.`;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(dailyVideos.length / itemsPerPage)}`;

    // if none report metadata within short time, hide loading. Only show the
    // "No playable videos" message if there are no cards at all.
    setTimeout(() => {
        if (loadingEl && loadedCount === 0 && grid.children.length === 0) {
            loadingEl.style.display = 'none';
            grid.innerHTML = '<p style="text-align:center; grid-column:1 / -1; color: var(--text-muted);">No playable videos found on this page.</p>';
        } else if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }, 1200);
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
