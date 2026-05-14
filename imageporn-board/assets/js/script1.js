// ─── script1.js ──────────────────────────────────────────────────────────────
// Media parsing, lightbox, linkify – identical logic to original

const urlParams     = new URLSearchParams(window.location.search);
let currentViewId   = urlParams.get('id');
let sharedFile      = urlParams.get('file');

// --- MEDIA PARSING ---
function parseMedia(text) {
    if (!text) return "";
    const lines = text.split(/\s+/);
    let mediaHtml = '<div class="media-gallery">';
    let found = false;

    lines.forEach(line => {
        // YouTube
        const ytMatch = line.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
            mediaHtml += `<div class="media-item yt-item">
                <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>
            </div>`;
            found = true; return;
        }
        // Images
        if (line.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
            const safe = line.replace(/"/g, '&quot;');
            mediaHtml += `<div class="media-item img-item">
                <img src="${safe}" class="compressed-media" loading="lazy"
                     onclick="window.openLightbox(event, '${safe}', 'img')">
            </div>`;
            found = true; return;
        }
        // Videos
        if (line.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
            const safe = line.replace(/"/g, '&quot;');
            mediaHtml += `<div class="media-item vid-item">
                <video src="${safe}" muted class="compressed-media" preload="metadata"
                       onclick="window.openLightbox(event, '${safe}', 'vid')"></video>
            </div>`;
            found = true; return;
        }
    });

    mediaHtml += '</div>';
    return found ? mediaHtml : "";
}

// --- LINKIFY ---
function linkify(text) {
    if (!text) return "";
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, function(url) {
        const safe = url.replace(/"/g, '&quot;');
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="post-link">${url}</a>`;
    });
}

// --- LIGHTBOX ---
window.openLightbox = function(e, src, type) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const overlay   = document.getElementById('media-overlay');
    const container = document.getElementById('overlay-content');
    if (!overlay || !container) return;

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('file', src);
    window.history.pushState({ path: newUrl.href }, '', newUrl.href);

    overlay.style.display = 'flex';
    container.innerHTML = type === 'img'
        ? `<img src="${src}" style="max-width:95vw; max-height:95vh; object-fit: contain;" class="zoomable">`
        : `<video src="${src}" controls autoplay style="max-width:95vw; max-height:95vh;"></video>`;
};

window.closeLightbox = function() {
    const overlay = document.getElementById('media-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.getElementById('overlay-content').innerHTML = '';
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('file');
        window.history.pushState({ path: newUrl.href }, '', newUrl.href);
    }
};
