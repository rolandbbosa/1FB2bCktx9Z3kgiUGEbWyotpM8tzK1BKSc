// Admin Dashboard Logic

let currentImageEdit = null;
let currentBannerEdit = null;
let allImages = [];
let allBanners = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    loadImages();
    loadBanners();
    setupEventListeners();
});

function setupEventListeners() {
    const imageForm = document.getElementById('imageForm');
    const bannerForm = document.getElementById('bannerForm');

    if (imageForm) {
        imageForm.addEventListener('submit', handleImageSubmit);
    }

    if (bannerForm) {
        bannerForm.addEventListener('submit', handleBannerSubmit);
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
            allImages.push({ id: doc.id, ...doc.data() });
        });
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

    allImages.forEach(image => {
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
