// ─── search.js ───────────────────────────────────────────────────────────────
// Replaces search.php – all logic in JS using Firebase

function removeUrls(text) {
    return (text || '').replace(/https?:\/\/\S+/g, '');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlight(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    const safe = escapeHtml(text);
    const re   = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return safe.replace(re, '<mark>$1</mark>');
}

function getFirstMediaThumb(message) {
    if (!message) return '';
    const lines = message.split('\n');
    for (const line of lines) {
        const t = line.trim();
        const ytMatch = t.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="width:120px;height:70px;"></iframe>`;
        if (t.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) return `<img src="${t}" style="width:120px;height:70px;object-fit:cover;">`;
        if (t.match(/\.(mp4|webm|ogg)$/i)) return `<video src="${t}" muted style="width:120px;height:70px;object-fit:cover;"></video>`;
    }
    return '';
}

function firstCommentSnippet(postId, comments) {
    const c = comments.find(c => c.post_id == postId && c.parent_id === null);
    if (!c) return '';
    const text = c.text || '';
    return text.length > 60 ? text.slice(0, 60) + '...' : text;
}

function renderResultCard(post, comments, query) {
    const thumb   = getFirstMediaThumb(post.message);
    const snippet = firstCommentSnippet(post.post_id, comments);
    return `<div class="post-preview">
        ${thumb ? `<div class="post-thumb">${thumb}</div>` : ''}
        <div class="post-content">
            <a href="index.html?id=${escapeHtml(post.post_id)}" class="title">
                ${highlight(post.title || 'Untitled', query)}
            </a>
            <div class="snippet">${highlight(snippet, query)}</div>
            <div class="tagline">${post.comment_count || 0} comments • ${new Date((post.timestamp || 0) * 1000).toLocaleDateString()}</div>
        </div>
    </div>`;
}

async function runSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const query     = urlParams.get('q') || '';

    // Sync input field with URL param
    const inputEl = document.getElementById('search-input');
    if (inputEl) inputEl.value = query;

    // Update page title
    document.title = query ? `Search: ${query} - Image Corn` : 'Search - Image Corn';

    if (!query) {
        document.getElementById('results-container').innerHTML = '<p class="tagline">Enter a keyword to start searching.</p>';
        return;
    }

    const { posts, comments } = await getData();

    const lq = query.toLowerCase();

    // Post IDs that match via comment text
    const postIdsFromComments = new Set(
        comments
            .filter(c => removeUrls(c.text || '').toLowerCase().includes(lq))
            .map(c => c.post_id)
    );

    // Filter & annotate posts
    const results = posts
        .filter(p => {
            const inTitle   = (p.title   || '').toLowerCase().includes(lq);
            const inMessage = removeUrls(p.message || '').toLowerCase().includes(lq);
            const inComment = postIdsFromComments.has(p.post_id);
            return inTitle || inMessage || inComment;
        })
        .map(p => ({
            ...p,
            comment_count: comments.filter(c => c.post_id === p.post_id).length
        }));

    // Two sort orders
    const topResults    = [...results].sort((a, b) => b.comment_count - a.comment_count).slice(0, 5);
    const latestResults = [...results].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 5);

    const container = document.getElementById('results-container');

    if (results.length === 0) {
        container.innerHTML = '<p class="tagline">No results found for that keyword.</p>';
        return;
    }

    container.innerHTML = `
        <div class="grid-container">
            <div class="column">
                <h3 class="section-title">🔥 Top Results</h3>
                ${topResults.length === 0
                    ? "<p class='tagline'>No results.</p>"
                    : topResults.map(p => renderResultCard(p, comments, query)).join('')}
            </div>
            <div class="column">
                <h3 class="section-title">🕒 Latest Results</h3>
                ${latestResults.length === 0
                    ? "<p class='tagline'>No results.</p>"
                    : latestResults.map(p => renderResultCard(p, comments, query)).join('')}
            </div>
        </div>`;
}

function doSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('search-input');
    if (inputEl) {
        inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    }
    runSearch();
});
