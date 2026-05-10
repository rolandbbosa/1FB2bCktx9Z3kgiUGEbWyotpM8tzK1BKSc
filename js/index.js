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
const itemsPerPage = 12;
let allBanners = [];
let currentRandomImage = null;
let allFetishes = [];
let currentFetishFilter = '';
let currentImageTypeFilter = 'images';
let currentFetishTypeFilter = 'images';
let currentFetishPage = 1;
let currentImageModalId = null;

function isGif(url) {
    return /\.(gif)(\?.*)?$/i.test(url || '');
}

function filterImageType(section) {
    if (section === 'images') {
        const dropdown = document.getElementById('mediaTypeDropdown');
        currentImageTypeFilter = dropdown ? dropdown.value : 'images';
        currentPage = 1;
        renderImagesGrid();
    } else if (section === 'fetish') {
        const dropdown = document.getElementById('fetishMediaTypeDropdown');
        currentFetishTypeFilter = dropdown ? dropdown.value : 'images';
        currentFetishPage = 1;
        renderFetishGrid();
    }
}

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

    // Close image modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
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
        handleHashChange();
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
    const filteredImages = allImages.filter(img => {
        if (currentImageTypeFilter === 'gifs') return isGif(img.imageLink);
        return !isGif(img.imageLink);
    });

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedImages = filteredImages.slice(start, end);

    const grid = document.getElementById('imagesGrid');
    grid.innerHTML = '';

    if (filteredImages.length === 0) {
        const emptyText = currentImageTypeFilter === 'gifs'
            ? 'No GIFs available'
            : 'No images available';
        grid.innerHTML = `<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted);">${emptyText}</p>`;
    } else {
        paginatedImages.forEach(image => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `<img src="${image.imageLink}" alt="Image" onclick="openImageModal('${image.id}')">`;
            grid.appendChild(item);
        });
    }

    renderPagination(filteredImages.length);
}

function renderPagination(totalItems = null) {
    const count = totalItems !== null ? totalItems : allImages.length;
    const totalPages = Math.ceil(count / itemsPerPage);
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
            window.location.hash = buildHash('images', currentPage, currentImageModalId);
            document.querySelector('.section.active').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    const maxButtons = window.innerWidth <= 768 ? 2 : 4;
    let startPage = Math.max(1, Math.min(currentPage - 1, totalPages - maxButtons + 1));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.addEventListener('click', () => {
            currentPage = i;
            window.location.hash = buildHash('images', currentPage, currentImageModalId);
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
            window.location.hash = buildHash('images', currentPage, currentImageModalId);
            document.querySelector('.section.active').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(nextBtn);
}

// ===== IMAGE MODAL =====

function openImageModal(imageId, shouldUpdateHash = true) {
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

    currentImageModalId = imageId;
    modal.classList.add('active');

    if (shouldUpdateHash) {
        const sectionNav = getActiveSectionHash();
        const page = sectionNav === '#Images' ? currentPage : sectionNav === '#Fetish' ? currentFetishPage : null;
        window.location.hash = buildHash(getNavFromHash(sectionNav), page, imageId);
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (!modal.classList.contains('active')) return;

    modal.classList.remove('active');
    currentImageModalId = null;

    const hash = window.location.hash;
    if (!hash) return;

    if (hash.includes('/image-')) {
        const baseHash = hash.split('/image-')[0] || '#Random-images';
        history.replaceState(null, '', baseHash);
    } else if (hash.startsWith('#image-')) {
        history.replaceState(null, '', '#Random-images');
    }
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
        return;
    }

    closeHamburgerMenu();

    // Reset pagination when switching tabs (but not when loading from hash)
    if (updateHash) {
        if (nav === 'images') {
            currentPage = 1;
            renderImagesGrid();
        } else if (nav === 'fetish') {
            currentFetishPage = 1;
            renderFetishGrid();
        }
    } else {
        if (nav === 'images') {
            renderImagesGrid();
        } else if (nav === 'fetish') {
            renderFetishGrid();
        }
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

function getNavFromHash(hash) {
    const normalizedHash = hash.toLowerCase();
    if (normalizedHash === '#random-images') return 'random';
    if (normalizedHash === '#images') return 'images';
    if (normalizedHash === '#fetish') return 'fetish';
    return 'random';
}

function buildHash(nav, page = null, imageId = null) {
    const hashMap = {
        random: '#Random-images',
        images: '#Images',
        fetish: '#Fetish'
    };

    const parts = [hashMap[nav] || '#Random-images'];
    if (page && page > 1 && (nav === 'images' || nav === 'fetish')) {
        parts.push(`page-${page}`);
    }
    if (imageId) {
        parts.push(`image-${imageId}`);
    }
    return parts.join('/');
}

function getActiveSectionHash() {
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return '#Random-images';

    switch (activeSection.id) {
        case 'images-section':
            return '#Images';
        case 'fetish-section':
            return '#Fetish';
        default:
            return '#Random-images';
    }
}

function parseHash() {
    const rawHash = window.location.hash.slice(1);
    if (!rawHash) return { nav: 'random', page: 1, imageId: null };

    const parts = rawHash.split('/');
    let nav = 'random';
    let page = 1;
    let imageId = null;

    if (parts[0].startsWith('image-')) {
        nav = 'images';
        imageId = parts[0].slice(6);
    } else {
        nav = getNavFromHash('#' + parts[0]);
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('page-')) {
                page = parseInt(part.slice(5), 10) || 1;
            } else if (part.startsWith('image-')) {
                imageId = part.slice(6);
            }
        }
    }

    return { nav, page, imageId };
}

function handleHashChange() {
    const { nav, page, imageId } = parseHash();

    if (nav === 'images') {
        currentPage = page;
    } else if (nav === 'fetish') {
        currentFetishPage = page;
    }

    setActiveNav(nav, false);

    if (imageId) {
        if (currentImageModalId !== imageId) {
            openImageModal(imageId, false);
        }
    } else {
        closeImageModal();
    }
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
    let filteredImages = allImages.filter(img => {
        if (currentFetishTypeFilter === 'gifs') return isGif(img.imageLink);
        return !isGif(img.imageLink);
    });

    if (currentFetishFilter) {
        filteredImages = filteredImages.filter(img => img.fetish === currentFetishFilter);
    }

    const start = (currentFetishPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedImages = filteredImages.slice(start, end);

    const grid = document.getElementById('fetishGrid');
    grid.innerHTML = '';

    if (filteredImages.length === 0) {
        const emptyText = currentFetishTypeFilter === 'gifs'
            ? 'No GIFs found for this category'
            : 'No images found for this category';
        grid.innerHTML = `<p style="text-align: center; grid-column: 1 / -1; color: var(--text-muted);">${emptyText}</p>`;
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
            window.location.hash = buildHash('fetish', currentFetishPage, currentImageModalId);
            document.querySelector('#fetish-section').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    const maxButtons = window.innerWidth <= 768 ? 2 : 4;
    let startPage = Math.max(1, Math.min(currentFetishPage - 1, totalPages - maxButtons + 1));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentFetishPage ? 'active' : '';
        btn.addEventListener('click', () => {
            currentFetishPage = i;
            window.location.hash = buildHash('fetish', currentFetishPage, currentImageModalId);
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
            window.location.hash = buildHash('fetish', currentFetishPage, currentImageModalId);
            document.querySelector('#fetish-section').scrollIntoView({ behavior: 'smooth' });
        }
    });
    pagination.appendChild(nextBtn);
}
