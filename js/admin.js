// Admin Dashboard Logic

let currentImageEdit = null;
let currentBannerEdit = null;
let currentVideoEdit = null;
let currentPrerollEdit = null;
let allImages = [];
let allBanners = [];
let allVideos = [];
let allPrerollAds = [];
let currentAdminMediaFilter = 'images';
let currentAdminFetishFilter = '';

function isGif(url) {
    return /\.(gif)(\?.*)?$/i.test(url || '');
}

function filterAdminImages() {
    const mediaDropdown = document.getElementById('mediaTypeDropdown');
    const fetishDropdown = document.getElementById('adminFetishDropdown');

    currentAdminMediaFilter = mediaDropdown ? mediaDropdown.value : 'images';
    currentAdminFetishFilter = fetishDropdown ? fetishDropdown.value : '';
    renderImagesList();
}

function populateAdminFetishDropdown() {
    const dropdown = document.getElementById('adminFetishDropdown');
    if (!dropdown) return;

    const fetishSet = new Set();
    allImages.forEach(img => {
        if (img.fetish) fetishSet.add(img.fetish);
    });

    const previousSelection = dropdown.value;
    dropdown.innerHTML = '<option value="">All Fetishes</option>';

    Array.from(fetishSet).sort().forEach(fetish => {
        const option = document.createElement('option');
        option.value = fetish;
        option.textContent = fetish.toUpperCase();
        dropdown.appendChild(option);
    });

    if (previousSelection) {
        dropdown.value = previousSelection;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    loadImages();
    loadBanners();
    loadVideos();
    loadPrerollAds();
    setupEventListeners();
});

function setupEventListeners() {
    const imageForm = document.getElementById('imageForm');
    const bannerForm = document.getElementById('bannerForm');
    const videoForm = document.getElementById('videoForm');

    if (imageForm) {
        imageForm.addEventListener('submit', handleImageSubmit);
    }

    if (bannerForm) {
        bannerForm.addEventListener('submit', handleBannerSubmit);
    }

    if (videoForm) {
        videoForm.addEventListener('submit', handleVideoSubmit);
    }

    const prerollForm = document.getElementById('prerollForm');
    if (prerollForm) {
        prerollForm.addEventListener('submit', handlePrerollSubmit);
    }
}

// Switch between tabs
function switchTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

    // Show selected tab
    document.getElementById(tab + '-tab').classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
}

// ===== IMAGE MANAGEMENT =====

async function loadImages() {
    try {
        const snapshot = await db.collection(COLLECTIONS.IMAGES).orderBy('createdAt', 'desc').get();
        allImages = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'video' || data.type === 'preroll') return;
            allImages.push({ id: doc.id, ...data });
        });
        populateAdminFetishDropdown();
        renderImagesList();
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

function renderImagesList() {
    const list = document.getElementById('imagesList');
    list.innerHTML = '';

    if (allImages.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No images yet</p>';
        return;
    }

    const filteredImages = allImages.filter(image => {
        if (currentAdminMediaFilter === 'gifs') return isGif(image.imageLink);
        if (currentAdminMediaFilter === 'images') return !isGif(image.imageLink);
        return true;
    });

    const selectedFetish = currentAdminFetishFilter.trim().toLowerCase();
    const displayImages = selectedFetish
        ? filteredImages.filter(image => (image.fetish || '').toLowerCase() === selectedFetish)
        : filteredImages;

    if (displayImages.length === 0) {
        const emptyText = selectedFetish
            ? 'No images match this fetish and media type.'
            : currentAdminMediaFilter === 'gifs'
                ? 'No GIFs available'
                : 'No images available';
        list.innerHTML = `<p style="text-align: center; color: var(--text-muted);">${emptyText}</p>`;
        return;
    }

    displayImages.forEach(image => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <img src="${image.imageLink}" alt="Image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage Error%3C/text%3E%3C/svg%3E'">
            <div class="list-item-info">
                <p><strong>Image Link:</strong></p>
                <p>${image.imageLink}</p>
                ${image.imageUrl ? `<p><strong>Link:</strong> ${image.imageUrl}</p>` : '<p style="color: var(--text-muted);">No link attached</p>'}
                ${image.fetish ? `<p><strong>Fetish:</strong> ${image.fetish}</p>` : '<p style="color: var(--text-muted);">No fetish category</p>'}
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editImage('${image.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteImage('${image.id}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function openImageModal() {
    currentImageEdit = null;
    document.getElementById('imageModalTitle').textContent = 'Add Image';
    document.getElementById('imageForm').reset();
    document.getElementById('imageModal').classList.add('active');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
    currentImageEdit = null;
}

function editImage(id) {
    const image = allImages.find(img => img.id === id);
    if (image) {
        currentImageEdit = id;
        document.getElementById('imageModalTitle').textContent = 'Edit Image';
        document.getElementById('imageLink').value = image.imageLink;
        document.getElementById('imageUrl').value = image.imageUrl || '';
        document.getElementById('imageFetish').value = image.fetish || '';
        document.getElementById('imageModal').classList.add('active');
    }
}

function validateImageLink(link) {
    return new Promise((resolve) => {
        const testImage = new Image();
        testImage.onload = () => resolve(true);
        testImage.onerror = () => resolve(false);
        testImage.src = link;
    });
}

async function handleImageSubmit(e) {
    e.preventDefault();
    const imageLink = document.getElementById('imageLink').value;
    const imageUrl = document.getElementById('imageUrl').value;
    let fetish = document.getElementById('imageFetish').value.trim();

    const linkIsValid = await validateImageLink(imageLink);
    if (!linkIsValid) {
        alert('Invalid link: image could not be loaded.');
        return;
    }

    // Fuzzy match fetish to existing ones
    if (fetish) {
        const matchedFetish = findSimilarFetish(fetish);
        if (matchedFetish) {
            fetish = matchedFetish;
        } else {
            fetish = fetish.charAt(0).toUpperCase() + fetish.slice(1).toLowerCase();
        }
    }

    try {
        if (currentImageEdit) {
            // Update
            await db.collection(COLLECTIONS.IMAGES).doc(currentImageEdit).update({
                imageLink,
                imageUrl,
                fetish: fetish || null,
                updatedAt: new Date()
            });
        } else {
            // Create
            await db.collection(COLLECTIONS.IMAGES).add({
                imageLink,
                imageUrl,
                fetish: fetish || null,
                createdAt: new Date()
            });
        }
        closeImageModal();
        loadImages();
    } catch (error) {
        alert('Error saving image: ' + error.message);
    }
}

async function deleteImage(id) {
    if (confirm('Are you sure you want to delete this image?')) {
        try {
            await db.collection(COLLECTIONS.IMAGES).doc(id).delete();
            loadImages();
        } catch (error) {
            alert('Error deleting image: ' + error.message);
        }
    }
}

// ===== FUZZY MATCHING FOR FETISH =====
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + indicator
            );
        }
    }
    return matrix[len2][len1];
}

function findSimilarFetish(input) {
    const existingFetishes = new Set();
    allImages.forEach(img => {
        if (img.fetish) {
            existingFetishes.add(img.fetish.toLowerCase());
        }
    });

    const inputLower = input.toLowerCase();
    const threshold = 2; // Maximum allowed distance
    let bestMatch = null;
    let bestDistance = threshold;

    for (const fetish of existingFetishes) {
        const distance = levenshteinDistance(inputLower, fetish);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = fetish;
        }
    }

    // Return with proper capitalization
    if (bestMatch) {
        return bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1);
    }
    return null;
}

// ===== BANNER MANAGEMENT =====

async function loadBanners() {
    try {
        const snapshot = await db.collection(COLLECTIONS.BANNERS).get();
        allBanners = [];
        snapshot.forEach(doc => {
            allBanners.push({ id: doc.id, ...doc.data() });
        });
        renderBannersList();
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

// ===== VIDEO MANAGEMENT =====

async function loadVideos() {
    try {
        const snapshot = await db.collection(COLLECTIONS.IMAGES).orderBy('createdAt', 'desc').get();
        allVideos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const hasVideoLink = !!data.videoLink || !!data.videoUrl || !!data.link || !!data.url || !!data.src;
            if (data.type === 'video' || (hasVideoLink && !data.imageLink && data.type !== 'preroll')) {
                allVideos.push({ id: doc.id, ...data });
            }
        });
        renderVideosList();
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

function renderVideosList() {
    const list = document.getElementById('videosList');
    list.innerHTML = '';

    if (allVideos.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No videos yet</p>';
        return;
    }

    allVideos.forEach(video => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <p><strong>Video Link:</strong></p>
                <p>${video.videoLink}</p>
                ${video.title ? `<p><strong>Title:</strong> ${video.title}</p>` : '<p style="color: var(--text-muted);">No title provided</p>'}
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editVideo('${video.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteVideo('${video.id}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function openVideoModal() {
    currentVideoEdit = null;
    document.getElementById('videoModalTitle').textContent = 'Add Video';
    document.getElementById('videoForm').reset();
    document.getElementById('videoModal').classList.add('active');
}

function closeVideoModal() {
    document.getElementById('videoModal').classList.remove('active');
    currentVideoEdit = null;
}

function editVideo(id) {
    const video = allVideos.find(v => v.id === id);
    if (!video) return;

    currentVideoEdit = id;
    document.getElementById('videoModalTitle').textContent = 'Edit Video';
    document.getElementById('videoLink').value = video.videoLink || '';
    document.getElementById('videoTitle').value = video.title || '';
    document.getElementById('videoModal').classList.add('active');
}

async function handleVideoSubmit(e) {
    e.preventDefault();
    const videoLink = document.getElementById('videoLink').value.trim();
    const title = document.getElementById('videoTitle').value.trim();

    if (!videoLink) {
        alert('Please provide a video link.');
        return;
    }

    try {
        if (currentVideoEdit) {
            await db.collection(COLLECTIONS.IMAGES).doc(currentVideoEdit).update({
                videoLink,
                title: title || null,
                type: 'video',
                updatedAt: new Date()
            });
        } else {
            await db.collection(COLLECTIONS.IMAGES).add({
                videoLink,
                title: title || null,
                type: 'video',
                createdAt: new Date()
            });
        }
        closeVideoModal();
        loadVideos();
    } catch (error) {
        alert('Error saving video: ' + error.message);
    }
}

async function deleteVideo(id) {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
        await db.collection(COLLECTIONS.IMAGES).doc(id).delete();
        loadVideos();
    } catch (error) {
        alert('Error deleting video: ' + error.message);
    }
}

// ===== PRE-ROLL AD MANAGEMENT =====

async function loadPrerollAds() {
    try {
        const snapshot = await db.collection(COLLECTIONS.IMAGES).orderBy('createdAt', 'desc').get();
        allPrerollAds = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'preroll') {
                allPrerollAds.push({ id: doc.id, ...data });
            }
        });
        renderPrerollAdsList();
    } catch (error) {
        console.error('Error loading pre-roll ads:', error);
    }
}

function renderPrerollAdsList() {
    const list = document.getElementById('preRollList');
    list.innerHTML = '';

    if (allPrerollAds.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No pre-roll ads yet</p>';
        return;
    }

    allPrerollAds.forEach(ad => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <p><strong>Ad Link:</strong></p>
                <p>${ad.adLink || ad.videoLink || ad.url || ad.link}</p>
                ${ad.clickUrl ? `<p><strong>Click URL:</strong> <a href="${ad.clickUrl}" target="_blank" rel="noopener noreferrer">${ad.clickUrl}</a></p>` : ''}
                ${ad.title ? `<p><strong>Title:</strong> ${ad.title}</p>` : '<p style="color: var(--text-muted);">No title provided</p>'}
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editPrerollAd('${ad.id}')">Edit</button>
                <button class="btn-delete" onclick="deletePrerollAd('${ad.id}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function openPrerollModal() {
    currentPrerollEdit = null;
    document.getElementById('prerollModalTitle').textContent = 'Add Pre-roll Ad';
    document.getElementById('prerollForm').reset();
    document.getElementById('prerollModal').classList.add('active');
}

function closePrerollModal() {
    document.getElementById('prerollModal').classList.remove('active');
    currentPrerollEdit = null;
}

function editPrerollAd(id) {
    const ad = allPrerollAds.find(item => item.id === id);
    if (!ad) return;

    currentPrerollEdit = id;
    document.getElementById('prerollModalTitle').textContent = 'Edit Pre-roll Ad';
    document.getElementById('adLink').value = ad.adLink || ad.videoLink || ad.url || ad.link || '';
    document.getElementById('adTitle').value = ad.title || '';
    document.getElementById('adClickUrl').value = ad.clickUrl || '';
    document.getElementById('prerollModal').classList.add('active');
}

async function handlePrerollSubmit(e) {
    e.preventDefault();
    const adLink = document.getElementById('adLink').value.trim();
    const title = document.getElementById('adTitle').value.trim();
    const clickUrl = document.getElementById('adClickUrl').value.trim();

    if (!adLink) {
        alert('Please provide an ad video link.');
        return;
    }

    try {
        const prerollData = {
            adLink,
            title: title || null,
            clickUrl: clickUrl || null,
            type: 'preroll',
        };

        if (currentPrerollEdit) {
            prerollData.updatedAt = new Date();
            await db.collection(COLLECTIONS.IMAGES).doc(currentPrerollEdit).update(prerollData);
        } else {
            prerollData.createdAt = new Date();
            await db.collection(COLLECTIONS.IMAGES).add(prerollData);
        }
        closePrerollModal();
        loadPrerollAds();
    } catch (error) {
        alert('Error saving pre-roll ad: ' + error.message);
    }
}

async function deletePrerollAd(id) {
    if (!confirm('Are you sure you want to delete this pre-roll ad?')) return;

    try {
        await db.collection(COLLECTIONS.IMAGES).doc(id).delete();
        loadPrerollAds();
    } catch (error) {
        alert('Error deleting pre-roll ad: ' + error.message);
    }
}

function renderBannersList() {
    const list = document.getElementById('bannersList');
    list.innerHTML = '';

    if (allBanners.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No banners yet</p>';
        return;
    }

    allBanners.forEach(banner => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <img src="${banner.imageLink}" alt="Banner" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage Error%3C/text%3E%3C/svg%3E'">
            <div class="list-item-info">
                <p><strong>Position:</strong> ${banner.position}</p>
                <p><strong>Image:</strong> ${banner.imageLink.substring(0, 50)}...</p>
                <p><strong>Redirect:</strong> ${banner.redirectLink.substring(0, 50)}...</p>
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editBanner('${banner.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteBanner('${banner.id}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function openBannerModal() {
    currentBannerEdit = null;
    document.getElementById('bannerModalTitle').textContent = 'Add Banner';
    document.getElementById('bannerForm').reset();
    document.getElementById('bannerModal').classList.add('active');
}

function closeBannerModal() {
    document.getElementById('bannerModal').classList.remove('active');
    currentBannerEdit = null;
}

function editBanner(id) {
    const banner = allBanners.find(b => b.id === id);
    if (banner) {
        currentBannerEdit = id;
        document.getElementById('bannerModalTitle').textContent = 'Edit Banner';
        document.getElementById('bannerImageLink').value = banner.imageLink;
        document.getElementById('bannerRedirectLink').value = banner.redirectLink;
        document.getElementById('bannerPosition').value = banner.position;
        document.getElementById('bannerModal').classList.add('active');
    }
}

async function handleBannerSubmit(e) {
    e.preventDefault();
    const imageLink = document.getElementById('bannerImageLink').value;
    const redirectLink = document.getElementById('bannerRedirectLink').value;
    const position = document.getElementById('bannerPosition').value;

    try {
        // Check if position is already taken
        if (!currentBannerEdit) {
            const existingBanner = allBanners.find(b => b.position === position);
            if (existingBanner) {
                alert('This position is already taken! Delete the existing banner first or choose a different position.');
                return;
            }
        } else {
            // When editing, allow same position, but not other banners' positions
            const existingBanner = allBanners.find(b => b.position === position && b.id !== currentBannerEdit);
            if (existingBanner) {
                alert('This position is already taken! Choose a different position.');
                return;
            }
        }

        if (currentBannerEdit) {
            // Update
            await db.collection(COLLECTIONS.BANNERS).doc(currentBannerEdit).update({
                imageLink,
                redirectLink,
                position,
                updatedAt: new Date()
            });
        } else {
            // Create
            await db.collection(COLLECTIONS.BANNERS).add({
                imageLink,
                redirectLink,
                position,
                createdAt: new Date()
            });
        }
        closeBannerModal();
        loadBanners();
    } catch (error) {
        alert('Error saving banner: ' + error.message);
    }
}

async function deleteBanner(id) {
    if (confirm('Are you sure you want to delete this banner?')) {
        try {
            await db.collection(COLLECTIONS.BANNERS).doc(id).delete();
            loadBanners();
        } catch (error) {
            alert('Error deleting banner: ' + error.message);
        }
    }
}

function timestampToISOString(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
        return value.toDate().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'string') {
        return value;
    }
    if (value.seconds !== undefined) {
        return new Date(value.seconds * 1000).toISOString();
    }
    return null;
}

function parseImportedDate(value) {
    if (!value) return null;
    if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }
    if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }
    return null;
}

function downloadDataJson() {
    return Promise.all([
        db.collection(COLLECTIONS.IMAGES).orderBy('createdAt', 'desc').get(),
        db.collection(COLLECTIONS.BANNERS).get()
    ]).then(([imagesSnapshot, bannersSnapshot]) => {
        const images = [];
        const videos = [];
        const prerollAds = [];
        const banners = [];

        imagesSnapshot.forEach(doc => {
            const data = doc.data();
            const hasVideoLink = data.videoLink || data.videoUrl || data.link || data.url || data.src;
            const type = data.type ? data.type : (hasVideoLink && !data.imageLink ? 'video' : 'image');
            const record = {
                id: doc.id,
                type,
                createdAt: timestampToISOString(data.createdAt),
                updatedAt: timestampToISOString(data.updatedAt)
            };

            if (type === 'image') {
                record.imageLink = data.imageLink || null;
                record.imageUrl = data.imageUrl || null;
                record.fetish = data.fetish || null;
                images.push(record);
            } else if (type === 'video') {
                record.videoLink = data.videoLink || data.link || data.url || data.src || null;
                record.title = data.title || null;
                videos.push(record);
            } else if (type === 'preroll') {
                record.adLink = data.adLink || data.videoLink || data.link || data.url || null;
                record.title = data.title || null;
                record.clickUrl = data.clickUrl || null;
                prerollAds.push(record);
            }
        });

        bannersSnapshot.forEach(doc => {
            const data = doc.data();
            banners.push({
                id: doc.id,
                imageLink: data.imageLink || null,
                redirectLink: data.redirectLink || null,
                position: data.position || null,
                createdAt: timestampToISOString(data.createdAt),
                updatedAt: timestampToISOString(data.updatedAt)
            });
        });

        const payload = {
            images,
            videos,
            prerollAds,
            banners
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `imageporn-data-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }).catch(error => {
        alert('Error exporting JSON: ' + error.message);
    });
}

function triggerImportJson() {
    const input = document.getElementById('importJsonInput');
    if (!input) return;
    input.value = '';
    input.click();
}

function handleImportJsonFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const payload = JSON.parse(evt.target.result);
            await importDataFromJson(payload);
        } catch (error) {
            alert('Error importing JSON file: ' + error.message);
        }
    };
    reader.onerror = function() {
        alert('Unable to read the selected file.');
    };
    reader.readAsText(file);
}

function validateImportFormat(payload) {
    if (typeof payload !== 'object' || payload === null) {
        throw new Error('JSON root must be an object.');
    }
    if (!Array.isArray(payload.images) || !Array.isArray(payload.banners)) {
        throw new Error('JSON must contain arrays named "images" and "banners".');
    }
    if (!Array.isArray(payload.videos) && !Array.isArray(payload.prerollAds) && payload.images.length === 0 && payload.banners.length === 0) {
        throw new Error('JSON must include at least one data array.');
    }
}

function buildFirestoreDate(value) {
    const parsed = parseImportedDate(value);
    return parsed || new Date();
}

async function importDataFromJson(payload) {
    validateImportFormat(payload);

    const images = Array.isArray(payload.images) ? payload.images : [];
    const videos = Array.isArray(payload.videos) ? payload.videos : [];
    const prerollAds = Array.isArray(payload.prerollAds) ? payload.prerollAds : [];
    const banners = Array.isArray(payload.banners) ? payload.banners : [];

    if (images.length === 0 && videos.length === 0 && prerollAds.length === 0 && banners.length === 0) {
        throw new Error('JSON contains no items to import.');
    }

    const totalCount = images.length + videos.length + prerollAds.length + banners.length;
    if (!confirm(`Import ${totalCount} records? Existing items with matching IDs may be updated.`)) {
        return;
    }

    const writes = [];

    function saveDoc(collectionName, item, requiredFields, defaults = {}) {
        requiredFields.forEach(field => {
            if (!item[field]) {
                throw new Error(`Missing required field "${field}" for ${collectionName} item.`);
            }
        });

        const docId = item.id && typeof item.id === 'string' ? item.id : null;
        const docRef = docId ? db.collection(collectionName).doc(docId) : db.collection(collectionName).doc();
        const payload = {
            ...defaults,
            ...item
        };

        if (payload.createdAt) {
            payload.createdAt = buildFirestoreDate(payload.createdAt);
        } else {
            payload.createdAt = new Date();
        }
        if (payload.updatedAt) {
            payload.updatedAt = buildFirestoreDate(payload.updatedAt);
        }

        delete payload.id;
        return docRef.set(payload);
    }

    images.forEach(image => {
        if (!image.imageLink) {
            throw new Error('Image item missing imageLink.');
        }
        writes.push(saveDoc(COLLECTIONS.IMAGES, {
            id: image.id,
            type: image.type || 'image',
            imageLink: image.imageLink,
            imageUrl: image.imageUrl || null,
            fetish: image.fetish || null,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt
        }, ['imageLink']));
    });

    videos.forEach(video => {
        if (!video.videoLink) {
            throw new Error('Video item missing videoLink.');
        }
        writes.push(saveDoc(COLLECTIONS.IMAGES, {
            id: video.id,
            type: 'video',
            videoLink: video.videoLink,
            title: video.title || null,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt
        }, ['videoLink']));
    });

    prerollAds.forEach(ad => {
        if (!ad.adLink) {
            throw new Error('Pre-roll ad item missing adLink.');
        }
        writes.push(saveDoc(COLLECTIONS.IMAGES, {
            id: ad.id,
            type: 'preroll',
            adLink: ad.adLink,
            title: ad.title || null,
            clickUrl: ad.clickUrl || null,
            createdAt: ad.createdAt,
            updatedAt: ad.updatedAt
        }, ['adLink']));
    });

    banners.forEach(banner => {
        if (!banner.imageLink || !banner.redirectLink || !banner.position) {
            throw new Error('Banner item missing imageLink, redirectLink, or position.');
        }
        writes.push(saveDoc(COLLECTIONS.BANNERS, {
            id: banner.id,
            imageLink: banner.imageLink,
            redirectLink: banner.redirectLink,
            position: banner.position,
            createdAt: banner.createdAt,
            updatedAt: banner.updatedAt
        }, ['imageLink', 'redirectLink', 'position']));
    });

    await Promise.all(writes);
    alert('Import complete. Reloading admin data...');
    await Promise.all([loadImages(), loadBanners(), loadVideos(), loadPrerollAds()]);
}
