// Leaks gallery page

const leaksItemsPerPage = 12;
let leaksImages = [];
let leaksPage = 1;
let leaksTypeFilter = 'images';
let currentLeakModalId = null;
let currentLeakGallery = [];
let currentLeakGalleryIndex = 0;
let selectedLeakFiles = [];
let leakSearchQuery = '';
const LEAK_MAX_FILE_SIZE = 32 * 1024 * 1024;
const IMGBB_API_KEY = 'b104f553cace3645d1868c4bedc8f20b';
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

function escapeLeakAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
    checkLeakAgeVerification();
    setupLeakEventListeners();
    loadLeaks();
    loadLeakBanners();
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
    });

    setupLeakUpload();

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
        const firstImage = getLeakImageLinks(image)[0];
        if (!hasLeakImage(firstImage)) return false;
        if (leakSearchQuery && !(image.description || '').toLowerCase().includes(leakSearchQuery)) return false;
        return leaksTypeFilter === 'gifs' ? isLeakGif(firstImage) : !isLeakGif(firstImage);
    });
    const start = (leaksPage - 1) * leaksItemsPerPage;
    const pageItems = filtered.slice(start, start + leaksItemsPerPage);
    const grid = document.getElementById('leaksGrid');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted);">No matching ${leaksTypeFilter === 'gifs' ? 'GIFs' : 'images'} available</p>`;
    } else {
        pageItems.forEach((image) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `<img src="${escapeLeakAttribute(getLeakImageLinks(image)[0])}" alt="Leak image" loading="lazy">`;
            item.querySelector('img').addEventListener('click', () => openLeakModal(image.id));
            grid.appendChild(item);
        });
    }
    renderLeakPagination(filtered.length);
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

    addButton('← Previous', leaksPage - 1, leaksPage === 1);
    for (let page = 1; page <= totalPages; page++) addButton(String(page), page, false, page === leaksPage);
    addButton('Next →', leaksPage + 1, leaksPage === totalPages);
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
    leaksPage = pagePart ? Math.max(1, parseInt(pagePart.slice(5), 10) || 1) : 1;
    if (leaksImages.length) renderLeaks();
    if (imagePart && currentLeakModalId !== imagePart.slice(6)) openLeakModal(imagePart.slice(6), false);
    else if (!imagePart) closeLeakModal();
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
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') fileInput.click();
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
    dropZone.addEventListener('drop', (event) => setLeakFiles(event.dataTransfer.files));
    document.getElementById('leakDescription').addEventListener('input', updateUploadButton);
    document.getElementById('uploadLeaksBtn').addEventListener('click', uploadLeakBatch);
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
    const button = document.getElementById('uploadLeaksBtn');
    const description = document.getElementById('leakDescription').value.trim();
    if (!selectedLeakFiles.length || !description) return;
    const status = document.getElementById('uploadStatus');
    if (typeof window.ensureSubmitVerified === 'function') {
        const verified = await window.ensureSubmitVerified();
        if (!verified) return;
    }
    button.disabled = true;
    const uploadedLinks = [];
    const uploadedNames = [];
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
        await loadLeaks();
        window.setTimeout(closeUploadModal, 2000);
    } catch (error) {
        console.error('Leak upload failed:', error);
        status.className = 'upload-status error';
        if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
            status.innerHTML = 'Firebase Realtime Database denied anonymous uploads. Set the <strong>leaks</strong> write rule to true.';
        } else {
            status.textContent = error.message || 'Upload failed.';
        }
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
