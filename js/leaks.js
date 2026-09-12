// Leaks gallery page

const leaksItemsPerPage = 12;
let leaksImages = [];
let leaksPage = 1;
let leaksTypeFilter = 'all';
let currentLeakModalId = null;
let currentLeakGallery = [];
let currentLeakGalleryIndex = 0;
let selectedLeakFiles = [];
let selectedLeakVideoFiles = [];
let leakSearchQuery = '';
let leakPrerollAds = [];
let currentLeakVideo = null;
let currentLeakVideoAd = null;
let currentLeakVideoSource = null;
let currentLeakVideoTitle = null;
let leakVideoAdSkipTimeout = null;
let leakVideoAdPlayingListener = null;
const LEAK_MAX_FILE_SIZE = 32 * 1024 * 1024;
const LEAK_MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const IMGBB_API_KEY = 'b104f553cace3645d1868c4bedc8f20b';
const VIDEO_UPLOAD_API_URL = 'https://video-upload-api.bbosamoney.workers.dev';
const realtimeDb = firebase.database();

function isLeakGif(url) {
    return /\.(gif)(\?.*)?$/i.test(url || '');
}

function hasLeakImage(url) {
    return typeof url === 'string' && url.trim() !== '';
}

function getLeakImageLinks(image) {
    const links = Array.isArray(image.imageLinks) ? image.imageLinks : [];
    return links.length ? links : (hasLeakImage(image.imageLink) ? [image.imageLink] : []);
}

function getLeakMediaType(item) {
    const storedType = String(item.type || '').toLowerCase();
    const videoLink = item.videoLink || item.videoUrl;
    if (storedType === 'video' || isValidLeakVideoLink(videoLink)) return 'video';
    return 'image';
}

function getLeakSearchText(item) {
    const names = Array.isArray(item.fileNames) ? item.fileNames.join(' ') : (item.fileName || '');
    const mediaLinks = [item.imageLink, item.videoLink, item.videoUrl].filter(Boolean).join(' ');
    return `${item.description || ''} ${names} ${mediaLinks}`.toLowerCase();
}

function escapeLeakAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function createLeakSeed() {
    const values = new Uint32Array(50);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => String(value % 10)).join('');
}

async function hashLeakSeed(seed) {
    const data = new TextEncoder().encode(seed);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function showLeakSeedDialog(seed) {
    const dialog = document.getElementById('seedDialog');
    document.getElementById('postSeedValue').value = seed;
    dialog.classList.add('active');
    dialog.setAttribute('aria-hidden', 'false');
}

function closeLeakSeedDialog() {
    const dialog = document.getElementById('seedDialog');
    dialog.classList.remove('active');
    dialog.setAttribute('aria-hidden', 'true');
    document.getElementById('postSeedValue').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    checkLeakAgeVerification();
    setupLeakEventListeners();
    loadLeaks();
    loadLeakBanners();
    loadLeakPrerollAds();
    window.addEventListener('hashchange', handleLeakHashChange);
});

function checkLeakAgeVerification() {
    if (!document.cookie.includes('ageVerified=true')) {
        document.getElementById('ageModal').style.display = 'flex';
    }
}

function setLeakAgeVerified() {
    document.cookie = 'ageVerified=true; max-age=31536000; path=/';
    document.getElementById('ageModal').style.display = 'none';
}

function setupLeakEventListeners() {
    document.getElementById('ageNoBtn').addEventListener('click', () => {
        window.location.href = 'about:blank';
    });
    document.getElementById('ageYesBtn').addEventListener('click', setLeakAgeVerified);
    document.getElementById('mediaTypeDropdown').addEventListener('change', (event) => {
        leaksTypeFilter = event.target.value;
        leaksPage = 1;
        renderLeaks();
    });
    document.getElementById('leakSearch').addEventListener('input', (event) => {
        leakSearchQuery = event.target.value.trim().toLowerCase();
        leaksPage = 1;
        renderLeaks();
    });

    const modal = document.getElementById('imageModal');
    modal.querySelector('.modal-close').addEventListener('click', closeLeakModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeLeakModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        closeLeakModal();
        closeUploadModal();
        closeLeakVideoModal();
        closeLeakSeedDialog();
    });

    setupLeakUpload();
    document.getElementById('closeSeedDialogBtn').addEventListener('click', closeLeakSeedDialog);
    document.getElementById('copyPostSeedBtn').addEventListener('click', async () => {
        const seed = document.getElementById('postSeedValue').value;
        try {
            await navigator.clipboard.writeText(seed);
            document.getElementById('copyPostSeedBtn').textContent = 'Copied';
            window.setTimeout(() => { document.getElementById('copyPostSeedBtn').textContent = 'Copy Seed'; }, 1500);
        } catch (error) {
            document.getElementById('postSeedValue').select();
        }
    });

    const hamburger = document.getElementById('hamburgerBtn');
    hamburger.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

async function loadLeaks() {
    try {
        const snapshot = await realtimeDb.ref('leaks').once('value');
        const records = snapshot.val() || {};
        leaksImages = Object.entries(records)
            .map(([id, data]) => ({ id, ...data }))
            .sort((first, second) => (second.createdAt || 0) - (first.createdAt || 0));
        renderLeaks();
        handleLeakHashChange();
    } catch (error) {
        console.error('Error loading leaks:', error);
        document.getElementById('leaksGrid').innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted);">Unable to load leaks</p>';
    }
}

function renderLeaks() {
    const filtered = leaksImages.filter((image) => {
        const videoLink = image.videoLink || image.videoUrl;
        const isVideo = getLeakMediaType(image) === 'video' && isValidLeakVideoLink(videoLink);
        const matchesSearch = !leakSearchQuery || getLeakSearchText(image).includes(leakSearchQuery);
        if (!matchesSearch) return false;
        if (leaksTypeFilter === 'videos') {
            return isVideo;
        }
        if (isVideo) return leaksTypeFilter === 'all';
        const firstImage = getLeakImageLinks(image)[0];
        if (!hasLeakImage(firstImage)) return false;
        if (leaksTypeFilter === 'all') return true;
        return leaksTypeFilter === 'gifs' ? isLeakGif(firstImage) : !isLeakGif(firstImage);
    });
    const start = (leaksPage - 1) * leaksItemsPerPage;
    const pageItems = filtered.slice(start, start + leaksItemsPerPage);
    const grid = document.getElementById('leaksGrid');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        const label = leaksTypeFilter === 'gifs' ? 'GIFs' : leaksTypeFilter === 'videos' ? 'videos' : leaksTypeFilter === 'all' ? 'media' : 'images';
        grid.innerHTML = `<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted);">No matching ${label} available</p>`;
    } else {
        pageItems.forEach((image) => {
            const item = document.createElement('div');
            const isVideo = getLeakMediaType(image) === 'video';
            item.className = 'image-item leak-media-item';
            if (isVideo) {
                const video = document.createElement('video');
                video.src = image.videoLink || image.videoUrl;
                video.muted = true;
                video.playsInline = true;
                video.preload = 'metadata';
                video.setAttribute('aria-label', image.description || 'Preview leak video');
                video.addEventListener('contextmenu', (event) => event.preventDefault());
                video.addEventListener('click', () => openLeakVideoModal(image.id));
                item.appendChild(video);
                addLeakMediaOverlay(item, 'fa-solid fa-video');
            } else {
                item.innerHTML = `<img src="${escapeLeakAttribute(getLeakImageLinks(image)[0])}" alt="Leak image" loading="lazy">`;
                item.querySelector('img').addEventListener('click', () => openLeakModal(image.id));
                addLeakMediaOverlay(item, 'fa-solid fa-image');
            }
            grid.appendChild(item);
        });
    }
    renderLeakPagination(filtered.length);
}

function addLeakMediaOverlay(item, iconClass) {
    const overlay = document.createElement('span');
    overlay.className = 'leak-media-overlay';
    overlay.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><span>Preview</span>`;
    overlay.setAttribute('aria-hidden', 'true');
    item.appendChild(overlay);
}

function renderLeakPagination(totalItems) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / leaksItemsPerPage);
    if (totalPages <= 1) return;

    const addButton = (label, page, disabled = false, active = false) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.disabled = disabled;
        button.className = active ? 'active' : '';
        button.addEventListener('click', () => {
            leaksPage = page;
            window.location.hash = `#Leaks/page-${page}`;
            renderLeaks();
            document.getElementById('leaks-section').scrollIntoView({ behavior: 'smooth' });
        });
        pagination.appendChild(button);
    };

    addButton('â† Previous', leaksPage - 1, leaksPage === 1);
    for (let page = 1; page <= totalPages; page++) addButton(String(page), page, false, page === leaksPage);
    addButton('Next â†’', leaksPage + 1, leaksPage === totalPages);
}

function openLeakModal(imageId, updateHash = true) {
    const image = leaksImages.find((item) => item.id === imageId);
    const gallery = image ? getLeakImageLinks(image) : [];
    if (!image || !gallery.length) return;

    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    currentLeakGallery = gallery;
    currentLeakGalleryIndex = 0;
    modalImage.ondblclick = () => {
        window.location.href = `imageview.html?link=${encodeURIComponent(currentLeakGallery[currentLeakGalleryIndex])}`;
    };
    modalImage.title = 'Double-click to view this image';
    document.getElementById('leakModalDescription').textContent = image.description || '';
    document.getElementById('previousLeakImage').onclick = () => moveLeakGallery(-1);
    document.getElementById('nextLeakImage').onclick = () => moveLeakGallery(1);
    updateLeakGalleryImage();

    currentLeakModalId = imageId;
    modal.classList.add('active');
    if (updateHash) window.location.hash = `#Leaks/page-${leaksPage}/image-${imageId}`;
}

function updateLeakGalleryImage() {
    document.getElementById('modalImage').src = currentLeakGallery[currentLeakGalleryIndex];
    document.getElementById('leakGalleryCounter').textContent = `${currentLeakGalleryIndex + 1} / ${currentLeakGallery.length}`;
    const hasMultipleImages = currentLeakGallery.length > 1;
    document.querySelector('.leak-gallery-controls').style.display = hasMultipleImages ? 'flex' : 'none';
    document.getElementById('leakGalleryCounter').style.display = hasMultipleImages ? 'block' : 'none';
}

function moveLeakGallery(direction) {
    if (currentLeakGallery.length < 2) return;
    currentLeakGalleryIndex = (currentLeakGalleryIndex + direction + currentLeakGallery.length) % currentLeakGallery.length;
    updateLeakGalleryImage();
}

function closeLeakModal() {
    const modal = document.getElementById('imageModal');
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('active');
    currentLeakModalId = null;
    currentLeakGallery = [];
    history.replaceState(null, '', `#Leaks${leaksPage > 1 ? `/page-${leaksPage}` : ''}`);
}

function handleLeakHashChange() {
    const parts = window.location.hash.slice(1).split('/');
    const pagePart = parts.find((part) => part.startsWith('page-'));
    const imagePart = parts.find((part) => part.startsWith('image-'));
    const videoPart = parts.find((part) => part.startsWith('video-'));
    leaksPage = pagePart ? Math.max(1, parseInt(pagePart.slice(5), 10) || 1) : 1;
    if (leaksImages.length) renderLeaks();
    if (imagePart && currentLeakModalId !== imagePart.slice(6)) openLeakModal(imagePart.slice(6), false);
    else if (videoPart) openLeakVideoModal(videoPart.slice(6), false);
    else if (!imagePart && !videoPart) {
        closeLeakModal();
        closeLeakVideoModal(false);
    }
}

function setupLeakUpload() {
    const uploadModal = document.getElementById('uploadModal');
    const dropZone = document.getElementById('uploadDropZone');
    const fileInput = document.getElementById('leakFileInput');
    document.getElementById('openUploadBtn').addEventListener('click', () => {
        uploadModal.classList.add('active');
        uploadModal.setAttribute('aria-hidden', 'false');
    });
    document.getElementById('uploadModalClose').addEventListener('click', closeUploadModal);
    uploadModal.addEventListener('click', (event) => {
        if (event.target === uploadModal) closeUploadModal();
    });
    dropZone.addEventListener('click', () => {
        if (!fileInput.disabled) fileInput.click();
    });
    dropZone.addEventListener('keydown', (event) => {
        if (!fileInput.disabled && (event.key === 'Enter' || event.key === ' ')) fileInput.click();
    });
    fileInput.addEventListener('change', () => setLeakFiles(fileInput.files));
    ['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('drag-over');
    }));
    dropZone.addEventListener('drop', (event) => {
        if (!fileInput.disabled) setLeakFiles(event.dataTransfer.files);
    });
    document.getElementById('leakDescription').addEventListener('input', updateUploadButton);
    document.getElementById('uploadLeaksBtn').addEventListener('click', uploadLeakBatch);

    const videoUploadModal = document.getElementById('videoUploadModal');
    const videoDropZone = document.getElementById('videoUploadDropZone');
    const videoInput = document.getElementById('leakVideoInput');
    document.getElementById('openVideoUploadBtn').addEventListener('click', () => {
        videoUploadModal.classList.add('active');
        videoUploadModal.setAttribute('aria-hidden', 'false');
    });
    document.getElementById('videoUploadModalClose').addEventListener('click', closeVideoUploadModal);
    videoUploadModal.addEventListener('click', (event) => {
        if (event.target === videoUploadModal) closeVideoUploadModal();
    });
    videoDropZone.addEventListener('click', () => {
        if (!videoInput.disabled) videoInput.click();
    });
    videoDropZone.addEventListener('keydown', (event) => {
        if (!videoInput.disabled && (event.key === 'Enter' || event.key === ' ')) videoInput.click();
    });
    videoInput.addEventListener('change', () => setLeakVideoFiles(videoInput.files));
    ['dragenter', 'dragover'].forEach((eventName) => videoDropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        videoDropZone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach((eventName) => videoDropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        videoDropZone.classList.remove('drag-over');
    }));
    videoDropZone.addEventListener('drop', (event) => {
        if (!videoInput.disabled) setLeakVideoFiles(event.dataTransfer.files);
    });
    document.getElementById('videoLeakDescription').addEventListener('input', updateVideoUploadButton);
    document.getElementById('uploadLeakVideoBtn').addEventListener('click', uploadLeakVideo);
    document.getElementById('leakVideoModalClose').addEventListener('click', closeLeakVideoModal);
    document.getElementById('leakVideoModal').addEventListener('click', (event) => {
        if (event.target.id === 'leakVideoModal') closeLeakVideoModal();
    });
    document.getElementById('leakSkipAdButton').addEventListener('click', (event) => {
        event.stopPropagation();
        skipLeakVideoAd();
    });
}

function setLeakUploadBusy(type, busy) {
    const isVideo = type === 'video';
    const input = document.getElementById(isVideo ? 'leakVideoInput' : 'leakFileInput');
    const dropZone = document.getElementById(isVideo ? 'videoUploadDropZone' : 'uploadDropZone');
    const button = document.getElementById(isVideo ? 'uploadLeakVideoBtn' : 'uploadLeaksBtn');
    input.disabled = busy;
    button.disabled = busy;
    dropZone.classList.toggle('upload-busy', busy);
    dropZone.setAttribute('aria-disabled', String(busy));
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function setLeakFiles(fileList) {
    const files = Array.from(fileList || []);
    const invalid = files.find((file) => !file.type.startsWith('image/') || file.size > LEAK_MAX_FILE_SIZE);
    const status = document.getElementById('uploadStatus');
    if (invalid) {
        selectedLeakFiles = [];
        status.className = 'upload-status error';
        status.textContent = `${invalid.name} must be an image smaller than 32 MB.`;
    } else {
        selectedLeakFiles = files;
        status.className = 'upload-status';
        status.textContent = '';
    }
    document.getElementById('selectedLeakFiles').textContent = selectedLeakFiles.length
        ? `${selectedLeakFiles.length} image${selectedLeakFiles.length === 1 ? '' : 's'} selected.`
        : 'No images selected.';
    updateUploadButton();
}

function updateUploadButton() {
    const hasDescription = document.getElementById('leakDescription').value.trim().length > 0;
    document.getElementById('uploadLeaksBtn').disabled = selectedLeakFiles.length === 0 || !hasDescription;
}

function createLeakFilename(file) {
    const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let index = 0; index < 10; index++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `imageporn-${suffix}${extension}`;
}

async function uploadLeakBatch() {
    const description = document.getElementById('leakDescription').value.trim();
    if (!selectedLeakFiles.length || !description) return;
    const status = document.getElementById('uploadStatus');
    if (typeof window.ensureSubmitVerified === 'function') {
        const verified = await window.ensureSubmitVerified();
        if (!verified) return;
    }
    setLeakUploadBusy('image', true);
    const uploadedLinks = [];
    const uploadedNames = [];
    const seed = createLeakSeed();
    const seedHash = await hashLeakSeed(seed);
    try {
        for (let index = 0; index < selectedLeakFiles.length; index++) {
            status.className = 'upload-status';
            status.textContent = `Uploading ${index + 1}/${selectedLeakFiles.length}...`;
            const originalFile = selectedLeakFiles[index];
            const renamedFile = new File([originalFile], createLeakFilename(originalFile), { type: originalFile.type });
            const form = new FormData();
            form.append('image', renamedFile);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: form });
            const result = await response.json();
            if (!response.ok || !result.data?.url) throw new Error(result.error?.message || 'ImgBB upload failed.');
            uploadedLinks.push(result.data.url);
            uploadedNames.push(renamedFile.name);
        }
        await realtimeDb.ref('leaks').push({
            imageLink: uploadedLinks[0],
            imageLinks: uploadedLinks,
            fileNames: uploadedNames,
            description,
            seedHash,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        status.className = 'upload-status success';
        status.textContent = 'Upload complete.';
        leaksPage = 1;
        currentLeakModalId = null;
        currentLeakGallery = [];
        history.replaceState(null, '', '#Leaks');
        selectedLeakFiles = [];
        document.getElementById('leakDescription').value = '';
        document.getElementById('selectedLeakFiles').textContent = 'No images selected.';
        updateUploadButton();
        setLeakUploadBusy('image', false);
        await loadLeaks();
        showLeakSeedDialog(seed);
        window.setTimeout(closeUploadModal, 2000);
    } catch (error) {
        console.error('Leak upload failed:', error);
        status.className = 'upload-status error';
        if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
            status.innerHTML = 'Firebase Realtime Database denied anonymous uploads. Set the <strong>leaks</strong> write rule to true.';
        } else {
            status.textContent = error.message || 'Upload failed.';
        }
        setLeakUploadBusy('image', false);
        updateUploadButton();
    }
}

async function loadLeakBanners() {
    try {
        let banners = [];
        try {
            const snapshot = await db.collection('banners').get();
            snapshot.forEach((doc) => banners.push({ id: doc.id, ...doc.data() }));
        } catch (firestoreError) {
            console.warn('Firestore banners unavailable, trying Realtime Database.', firestoreError);
        }
        if (!banners.some((banner) => banner?.imageLink || banner?.imageUrl)) {
            const realtimeSnapshot = await realtimeDb.ref('banners').once('value');
            const rawBanners = realtimeSnapshot.val() || {};
            banners = (Array.isArray(rawBanners) ? rawBanners : Object.values(rawBanners)).filter(Boolean);
        }
        ['top', 'left', 'right', 'between'].forEach((position) => {
            const id = position === 'top' ? 'bannersTop' : position === 'between' ? 'bannersBetween' : `banners${position[0].toUpperCase()}${position.slice(1)}`;
            const container = document.getElementById(id);
            if (!container) return;
            const matchingBanners = banners.filter((banner) => {
                const bannerPosition = String(banner?.position || '').toLowerCase();
                return position === 'top' ? bannerPosition.startsWith('top') : bannerPosition === position;
            });
            matchingBanners.forEach((banner) => {
                const imageLink = banner?.imageLink || banner?.imageUrl;
                if (!imageLink) return;
                const item = document.createElement('div');
                item.className = 'banner-item';
                if (banner.redirectLink) item.onclick = () => window.open(banner.redirectLink, '_blank');
                item.innerHTML = `<img src="${escapeLeakAttribute(imageLink)}" alt="Banner" onerror="this.style.display='none'">`;
                container.appendChild(item);
            });
        });
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

function closeVideoUploadModal() {
    const modal = document.getElementById('videoUploadModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function isValidLeakVideoLink(url) {
    return typeof url === 'string' && url.trim() !== '';
}

function setLeakVideoFiles(fileList) {
    const status = document.getElementById('videoUploadStatus');
    const files = Array.from(fileList || []);
    const invalid = files.find((file) => !file.type.startsWith('video/') || file.size > LEAK_MAX_VIDEO_SIZE);
    selectedLeakVideoFiles = invalid ? [] : files;
    if (invalid) {
        status.className = 'upload-status error';
        status.textContent = `${invalid.name} must be a video smaller than 100 MB.`;
    } else if (!files.length) {
        status.className = 'upload-status';
        status.textContent = '';
    } else {
        status.className = 'upload-status';
        status.textContent = '';
    }
    document.getElementById('selectedLeakVideo').textContent = selectedLeakVideoFiles.length
        ? `${selectedLeakVideoFiles.length} video${selectedLeakVideoFiles.length === 1 ? '' : 's'} selected.`
        : 'No videos selected.';
    updateVideoUploadButton();
}

function updateVideoUploadButton() {
    const hasDescription = document.getElementById('videoLeakDescription').value.trim().length > 0;
    document.getElementById('uploadLeakVideoBtn').disabled = selectedLeakVideoFiles.length === 0 || !hasDescription;
}

function getLeakVideoExtension(file) {
    const lastDot = file.name.lastIndexOf('.');
    return lastDot === -1 ? '' : file.name.substring(lastDot).toLowerCase();
}

async function uploadLeakVideo() {
    const description = document.getElementById('videoLeakDescription').value.trim();
    const status = document.getElementById('videoUploadStatus');
    if (!selectedLeakVideoFiles.length || !description) return;
    if (typeof window.ensureSubmitVerified === 'function' && !(await window.ensureSubmitVerified())) return;

    const progressText = document.getElementById('videoUploadProgressText');
    const totalBytes = selectedLeakVideoFiles.reduce((total, file) => total + file.size, 0);
    let uploadedBytes = 0;
    const uploadedVideos = [];
    const seed = createLeakSeed();
    const seedHash = await hashLeakSeed(seed);
    setLeakUploadBusy('video', true);
    try {
        for (let index = 0; index < selectedLeakVideoFiles.length; index++) {
            const file = selectedLeakVideoFiles[index];
            status.className = 'upload-status';
            status.textContent = `Uploading video ${index + 1}/${selectedLeakVideoFiles.length}: ${file.name}`;
            const result = await uploadLeakVideoFile(file, (loaded) => {
                const percentage = Math.round(((uploadedBytes + loaded) / totalBytes) * 100);
                progressText.textContent = `${percentage}%`;
            });
            uploadedVideos.push({
                type: 'video',
                videoLink: result.url,
                fileName: file.name,
                description,
                seedHash,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            uploadedBytes += file.size;
        }
        const recordWrites = uploadedVideos.map((post) => realtimeDb.ref('leaks').push(post));
        await Promise.all(recordWrites);
        progressText.textContent = '100%';
        status.className = 'upload-status success';
        status.textContent = `${selectedLeakVideoFiles.length} videos uploaded successfully.`;
        selectedLeakVideoFiles = [];
        document.getElementById('leakVideoInput').value = '';
        document.getElementById('videoLeakDescription').value = '';
        document.getElementById('selectedLeakVideo').textContent = 'No videos selected.';
        updateVideoUploadButton();
        setLeakUploadBusy('video', false);
        await loadLeaks();
        showLeakSeedDialog(seed);
        window.setTimeout(closeVideoUploadModal, 2000);
    } catch (error) {
        console.error('Leak video upload failed:', error);
        status.className = 'upload-status error';
        status.textContent = error.message || 'Upload failed.';
        setLeakUploadBusy('video', false);
        updateVideoUploadButton();
    }
}

function uploadLeakVideoFile(file, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${VIDEO_UPLOAD_API_URL}/upload`, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('X-File-Extension', getLeakVideoExtension(file));
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) onProgress(event.loaded);
        });
        xhr.addEventListener('load', () => {
            let result;
            try { result = JSON.parse(xhr.responseText); } catch (error) {
                reject(new Error('The upload server returned an invalid response.'));
                return;
            }
            if (xhr.status < 200 || xhr.status >= 300 || !result.success || !result.url) {
                reject(new Error(result.error || 'Video upload failed.'));
                return;
            }
            resolve(result);
        });
        xhr.addEventListener('error', () => reject(new Error('Network error. Could not reach the upload server.')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));
        xhr.send(file);
    });
}


function loadLeakPrerollAds() {
    return db.collection(COLLECTIONS.IMAGES).orderBy('createdAt', 'desc').get().then((snapshot) => {
        leakPrerollAds = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const adLink = data.type === 'preroll' && (data.adLink || data.videoLink || data.link || data.url);
            if (isValidLeakVideoLink(adLink)) {
                leakPrerollAds.push({ adLink, clickUrl: data.clickUrl || data.linkUrl || null, title: data.title || 'Pre-roll' });
            }
        });
    }).catch((error) => console.error('Error loading leak pre-roll ads:', error));
}

function resetLeakVideoAdControls() {
    const link = document.getElementById('leakPrerollLinkButton');
    const skip = document.getElementById('leakSkipAdButton');
    const content = document.querySelector('#leakVideoModal .video-modal-content');
    const video = document.getElementById('leakModalVideo');
    if (leakVideoAdSkipTimeout) clearTimeout(leakVideoAdSkipTimeout);
    if (leakVideoAdPlayingListener) video.removeEventListener('playing', leakVideoAdPlayingListener);
    leakVideoAdSkipTimeout = null;
    leakVideoAdPlayingListener = null;
    link.style.display = 'none';
    link.removeAttribute('href');
    skip.style.display = 'none';
    content.classList.remove('ad-active');
}

function setLeakVideoAdControls(ad) {
    const link = document.getElementById('leakPrerollLinkButton');
    const skip = document.getElementById('leakSkipAdButton');
    const content = document.querySelector('#leakVideoModal .video-modal-content');
    const video = document.getElementById('leakModalVideo');
    resetLeakVideoAdControls();
    if (ad.clickUrl) {
        link.href = ad.clickUrl;
        link.style.display = 'flex';
        content.classList.add('ad-active');
    }
    leakVideoAdPlayingListener = () => {
        leakVideoAdSkipTimeout = window.setTimeout(() => { skip.style.display = 'inline-flex'; }, 5000);
        video.removeEventListener('playing', leakVideoAdPlayingListener);
        leakVideoAdPlayingListener = null;
    };
    video.addEventListener('playing', leakVideoAdPlayingListener);
}

function setupLeakModalVideo(source, title, controls = true) {
    const video = document.getElementById('leakModalVideo');
    document.getElementById('leakVideoModalTitle').textContent = title;
    video.src = source;
    video.controls = controls;
    video.muted = false;
    video.play().catch(() => {});
}

function skipLeakVideoAd() {
    if (!currentLeakVideo || !currentLeakVideoSource) return;
    currentLeakVideoAd = null;
    resetLeakVideoAdControls();
    setupLeakModalVideo(currentLeakVideoSource, currentLeakVideoTitle);
}

function openLeakVideoModal(videoId, updateHash = true) {
    const video = leaksImages.find((item) => item.id === videoId);
    const source = video?.videoLink || video?.videoUrl;
    if (!video || !isValidLeakVideoLink(source)) return;
    const modal = document.getElementById('leakVideoModal');
    const modalVideo = document.getElementById('leakModalVideo');
    const ad = leakPrerollAds.length ? leakPrerollAds[Math.floor(Math.random() * leakPrerollAds.length)] : null;
    currentLeakVideo = video;
    currentLeakVideoSource = source;
    currentLeakVideoTitle = video.description || 'Video Preview';
    const playMainVideo = () => {
        currentLeakVideoAd = null;
        resetLeakVideoAdControls();
        setupLeakModalVideo(source, currentLeakVideoTitle);
    };
    if (ad) {
        currentLeakVideoAd = ad;
        setupLeakModalVideo(ad.adLink, `Ad: ${ad.title} - ${currentLeakVideoTitle}`, false);
        setLeakVideoAdControls(ad);
        modalVideo.onended = playMainVideo;
        modalVideo.onerror = playMainVideo;
    } else {
        playMainVideo();
    }
    modal.classList.add('active');
    if (updateHash) window.location.hash = `#Leaks/page-${leaksPage}/video-${videoId}`;
}

function closeLeakVideoModal(updateHash = true) {
    const modal = document.getElementById('leakVideoModal');
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('active');
    const video = document.getElementById('leakModalVideo');
    video.pause();
    video.currentTime = 0;
    video.src = '';
    video.load();
    video.onended = null;
    video.onerror = null;
    currentLeakVideo = null;
    currentLeakVideoSource = null;
    currentLeakVideoTitle = null;
    resetLeakVideoAdControls();
    if (updateHash) history.replaceState(null, '', `#Leaks${leaksPage > 1 ? `/page-${leaksPage}` : ''}`);
}
