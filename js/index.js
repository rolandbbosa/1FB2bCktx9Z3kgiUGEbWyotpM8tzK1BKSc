// Age Verification
function checkAgeVerification() {
    if (!document.cookie.includes('ageVerified=true')) {
        const modal = document.getElementById('ageModal');
        modal.style.display = 'flex';
    }
}

function setAgeVerified() {
    document.cookie = "ageVerified=true; max-age=31536000; path=/";
    const modal = document.getElementById('ageModal');
    modal.style.display = 'none';
}

function exitPage() {
    window.location.href = 'about:blank';
}

// Homepage Logic

let allImages = [];
let currentPage = 1;
const itemsPerPage = 10;
let allBanners = [];
let currentRandomImage = null;
let allFetishes = [];
let currentFetishFilter = '';
let currentFetishPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    checkAgeVerification();
    loadImages();
    loadBanners();
    setupEventListeners();
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
});

function setupEventListeners() {
    // Modal close
    const modal = document.getElementById('imageModal');
    const modalClose = modal.querySelector('.modal-close');
    
    if (modalClose) {
        modalClose.addEventListener('click', closeImageModal);
    }

    // Click outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });

    // Age verification buttons
    const ageNoBtn = document.getElementById('ageNoBtn');
    const ageYesBtn = document.getElementById('ageYesBtn');
    
    if (ageNoBtn) {
        ageNoBtn.addEventListener('click', exitPage);
    }
    
    if (ageYesBtn) {
        ageYesBtn.addEventListener('click', setAgeVerified);
    }

    // Hamburger menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('active');
            hamburgerBtn.classList.toggle('active');
        });
    }
}

// ===== IMAGE LOADING =====

async function loadImages() {
    try {
        const snapshot = await db.collection('images').orderBy('createdAt', 'desc').get();
        allImages = [];
        snapshot.forEach(doc => {
            allImages.push({ id: doc.id, ...doc.data() });
        });
        loadRandomImage();
        renderImagesGrid();
        populateFetishDropdown();
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

// ===== RANDOM IMAGE SECTION =====

async function loadRandomImage() {
    if (allImages.length === 0) {
        document.getElementById('randomImageContainer').innerHTML = '<div class="loading">No images available</div>';
        return;
    }

    const randomIndex = Math.floor(Math.random() * allImages.length);
    currentRandomImage = allImages[randomIndex];
    
    const container = document.getElementById('randomImageContainer');
    container.innerHTML = `<img src="${currentRandomImage.imageLink}" alt="Random Image" onclick="openImageModal('${currentRandomImage.id}')">`;
}

// ===== IMAGES GRID WITH PAGINATION =====

function renderImagesGrid() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedImages = allImages.slice(start, end);

    const grid = document.getElementById('imagesGrid');
    grid.innerHTML = '';

    if (allImages.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted);">No images available</p>';
    } else {
        paginatedImages.forEach(image => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `<img src="${image.imageLink}" alt="Image" onclick="openImageModal('${image.id}')">`;
            grid.appendChild(item);
        });
    }

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(allImages.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderImagesGrid();
            document.querySelector('.section.active').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.addEventListener('click', () => {
            currentPage = i;
            renderImagesGrid();
            document.querySelector('.section.active').scrollIntoView({ behavior: 'smooth' });
        });
        pagination.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderImagesGrid();
            document.querySelector('.section.active').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(nextBtn);
}

// ===== IMAGE MODAL =====

function openImageModal(imageId) {
    const image = allImages.find(img => img.id === imageId) || currentRandomImage;
    if (!image) return;

    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const viewMoreBtn = document.getElementById('viewMoreBtn');

    modalImage.src = image.imageLink;
    modalImage.onclick = () => {
        window.open(image.imageLink, '_blank');
    };
    
    if (image.imageUrl) {
        viewMoreBtn.style.display = 'block';
        viewMoreBtn.onclick = () => {
            window.open(image.imageUrl, '_blank');
        };
    } else {
        viewMoreBtn.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
}

// ===== NAVIGATION =====

function setActiveNav(nav, updateHash = true) {
    const hashMap = {
        random: '#Random-images',
        images: '#Images',
        fetish: '#Fetish'
    };

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('nav-' + nav).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(nav + '-section').classList.add('active');

    if (updateHash) {
        window.location.hash = hashMap[nav];
    }

    closeHamburgerMenu();

    // Reset pagination when switching
    if (nav === 'images') {
        currentPage = 1;
        renderImagesGrid();
    } else if (nav === 'fetish') {
        currentFetishPage = 1;
        renderFetishGrid();
    }
}

function closeHamburgerMenu() {
    const navLinks = document.querySelector('.nav-links');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (navLinks && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
    }

    if (hamburgerBtn && hamburgerBtn.classList.contains('active')) {
        hamburgerBtn.classList.remove('active');
    }
}

function getNavFromHash() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#random-images') return 'random';
    if (hash === '#images') return 'images';
    if (hash === '#fetish') return 'fetish';
    return 'random';
}

function handleHashChange() {
    const nav = getNavFromHash();
    setActiveNav(nav, false);
}

// ===== BANNERS =====

async function loadBanners() {
    try {
        const snapshot = await db.collection('banners').get();
        allBanners = [];
        snapshot.forEach(doc => {
            allBanners.push({ id: doc.id, ...doc.data() });
        });
        renderBanners();
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

function renderBanners() {
    // Top banners
    const topBanners = allBanners.filter(b => b.position.startsWith('top'));
    renderBannerPosition('bannersTop', topBanners);

    // Left side banners
    const leftBanners = allBanners.filter(b => b.position === 'left');
    renderBannerPosition('bannersLeft', leftBanners);

    // Right side banners
    const rightBanners = allBanners.filter(b => b.position === 'right');
    renderBannerPosition('bannersRight', rightBanners);

    // Between content banners
    const betweenBanners = allBanners.filter(b => b.position === 'between');
    renderBannerPosition('bannersBetween', betweenBanners);
}

function renderBannerPosition(elementId, banners) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    banners.forEach(banner => {
        const item = document.createElement('div');
        item.className = 'banner-item';
        item.onclick = () => window.open(banner.redirectLink, '_blank');
        item.innerHTML = `<img src="${banner.imageLink}" alt="Banner" onerror="this.style.display='none'">`;
        container.appendChild(item);
    });
}

// ===== FETISH MANAGEMENT =====

function populateFetishDropdown() {
    const fetishSet = new Set();
    allImages.forEach(img => {
        if (img.fetish) {
            fetishSet.add(img.fetish);
        }
    });

    allFetishes = Array.from(fetishSet).sort();
    
    const dropdown = document.getElementById('fetishDropdown');
    const currentValue = dropdown.value;
    dropdown.innerHTML = '<option value="">All Fetishes</option>';

    allFetishes.forEach(fetish => {
        const option = document.createElement('option');
        option.value = fetish;
        option.textContent = fetish.toUpperCase();
        dropdown.appendChild(option);
    });

    dropdown.value = currentValue;
}

function filterByFetish() {
    const dropdown = document.getElementById('fetishDropdown');
    currentFetishFilter = dropdown.value;
    currentFetishPage = 1;
    renderFetishGrid();
}

function renderFetishGrid() {
    let filteredImages = allImages;

    if (currentFetishFilter) {
        filteredImages = allImages.filter(img => img.fetish === currentFetishFilter);
    }

    const start = (currentFetishPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedImages = filteredImages.slice(start, end);

    const grid = document.getElementById('fetishGrid');
    grid.innerHTML = '';

    if (filteredImages.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted);">No images in this category</p>';
    } else {
        paginatedImages.forEach(image => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `<img src="${image.imageLink}" alt="Image" onclick="openImageModal('${image.id}')">`;
            grid.appendChild(item);
        });
    }

    renderFetishPagination(filteredImages.length);
}

function renderFetishPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('fetishPagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.disabled = currentFetishPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentFetishPage > 1) {
            currentFetishPage--;
            renderFetishGrid();
            document.querySelector('#fetish-section').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentFetishPage ? 'active' : '';
        btn.addEventListener('click', () => {
            currentFetishPage = i;
            renderFetishGrid();
            document.querySelector('#fetish-section').scrollIntoView({ behavior: 'smooth' });
        });
        pagination.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = currentFetishPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentFetishPage < totalPages) {
            currentFetishPage++;
            renderFetishGrid();
            document.querySelector('#fetish-section').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(nextBtn);
}
