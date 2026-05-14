// ─── trending.js ─────────────────────────────────────────────────────────────
// Replaces trending.php + trending_logic.php – all logic in JS using Firebase

// ── Trending keyword extraction (direct port of PHP getTrendingKeywords) ──────
function getTrendingKeywords(posts, comments) {
    const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    let textBuffer   = "";

    // Collect recent post text
    posts.forEach(p => {
        if ((p.timestamp || 0) >= oneWeekAgo) {
            textBuffer += " " + (p.title || "") + " " + (p.message || "");
        }
    });

    // Collect recent comment text
    comments.forEach(c => {
        if ((c.timestamp || 0) >= oneWeekAgo) {
            textBuffer += " " + (c.text || "");
        }
    });

    // Remove URLs
    textBuffer = textBuffer.replace(/https?:\/\/\S+/g, '');

    // Normalize: lowercase, remove non-word chars
    textBuffer = textBuffer.toLowerCase().replace(/[^\w\s]/g, '');

    // Split into words
    const words = textBuffer.match(/\b[a-z]+\b/g) || [];

    const stopWords = new Set([
        'the','and','this','that','with','from','your','have','what','some',
        'would','there','they','their','will','about','just','know','like',
        'been','were','when','them','than','then','only'
    ]);

    const phrases = {};
    const count   = words.length;

    // N-gram extraction (1 to 3 words)
    for (let i = 0; i < count; i++) {
        for (let len = 1; len <= 3; len++) {
            if (i + len - 1 >= count) break;
            const slice = words.slice(i, i + len);

            // Don't start or end with stopword
            if (stopWords.has(slice[0]) || stopWords.has(slice[slice.length - 1])) continue;

            const phrase = slice.join(' ');

            // Must be ≥ 4 chars and not pure number
            if (phrase.length < 4 || /^\d+$/.test(phrase)) continue;

            phrases[phrase] = (phrases[phrase] || 0) + 1;
        }
    }

    // Sort by frequency, return top 10
    return Object.entries(phrases)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
}

// ── Media thumbnail helper ────────────────────────────────────────────────────
function getFirstMediaThumb(message) {
    if (!message) return '';
    const lines = message.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // YouTube
        const ytMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
            return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="width:120px;height:70px;"></iframe>`;
        }
        // Image
        if (trimmed.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
            return `<img src="${trimmed}" style="width:120px;height:70px;object-fit:cover;">`;
        }
        // Video
        if (trimmed.match(/\.(mp4|webm|ogg)$/i)) {
            return `<video src="${trimmed}" muted style="width:120px;height:70px;object-fit:cover;"></video>`;
        }
    }
    return '';
}

// ── Highlight trend keyword in text ──────────────────────────────────────────
function highlightTrend(text, trend) {
    if (!text || !trend) return escapeHtml(text || '');
    const escaped = escapeHtml(text);
    const re      = new RegExp(`(${escapeRegex(trend)})`, 'gi');
    return escaped.replace(re, '<mark>$1</mark>');
}

// ── First comment snippet for a post ─────────────────────────────────────────
function firstCommentSnippet(postId, comments) {
    const c = comments.find(c => c.post_id == postId && c.parent_id === null);
    if (!c) return '';
    const text = c.text || '';
    return text.length > 60 ? text.slice(0, 60) + '...' : text;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Main render ───────────────────────────────────────────────────────────────
async function renderTrendingPage() {
    const urlParams  = new URLSearchParams(window.location.search);
    const activeTrend = urlParams.get('tag');

    const { posts, comments } = await getData();
    const trends    = getTrendingKeywords(posts, comments);
    const entries   = Object.entries(trends);
    const maxCount  = entries.length ? Math.max(...entries.map(e => e[1])) : 1;

    // ── Render trend tags ─────────────────────────────────────────────────────
    const trendBar = document.getElementById('trend-bar');
    if (entries.length === 0) {
        trendBar.innerHTML = '<span class="tagline">No topics trending this week.</span>';
    } else {
        trendBar.innerHTML = entries.map(([word, cnt]) => {
            const hotness  = Math.round((cnt / maxCount) * 100);
            const fontSize = 10 + hotness / 50;
            const active   = activeTrend === word ? 'trend-active' : '';
            return `<a href="trending.html?tag=${encodeURIComponent(word)}"
                       class="trend-item ${active}"
                       style="font-size:${fontSize}px;">
                       #${escapeHtml(word)} <span class="stat">${cnt}</span>
                    </a>`;
        }).join('') + `<a href="trending.html" class="toggle-btn" style="margin-left:10px;">Clear</a>`;
    }

    // ── Filter posts by active trend ──────────────────────────────────────────
    let displayPosts = [...posts];

    if (activeTrend) {
        // Find post_ids referenced in trending comments
        const postIdsFromComments = new Set(
            comments
                .filter(c => (c.text || '').toLowerCase().includes(activeTrend.toLowerCase()))
                .map(c => c.post_id)
        );

        displayPosts = posts.filter(p => {
            const inPost     = (p.title || '').toLowerCase().includes(activeTrend.toLowerCase())
                            || (p.message || '').toLowerCase().includes(activeTrend.toLowerCase());
            const inComments = postIdsFromComments.has(p.post_id);
            return inPost || inComments;
        });

        // Sort by comment count (most discussed first)
        displayPosts.sort((a, b) => {
            const ca = comments.filter(c => c.post_id === a.post_id).length;
            const cb = comments.filter(c => c.post_id === b.post_id).length;
            return cb - ca;
        });
    }

    // ── Render feed ───────────────────────────────────────────────────────────
    const feed = document.getElementById('feed');

    let feedHtml = '';
    if (activeTrend) {
        feedHtml += `<p class="tagline" style="margin-bottom:20px;">
            Showing posts and threads discussing <b>#${escapeHtml(activeTrend)}</b>
        </p>`;
    }

    if (displayPosts.length === 0) {
        feedHtml += '<div class="post"><p class="tagline">No posts found for this keyword.</p></div>';
    } else {
        displayPosts.forEach(post => {
            const pId      = post.post_id;
            const cCount   = comments.filter(c => c.post_id === pId).length;
            const thumbHtml = getFirstMediaThumb(post.message);
            const snippet   = firstCommentSnippet(pId, comments);

            feedHtml += `<div class="post-preview">
                ${thumbHtml ? `<div class="post-thumb">${thumbHtml}</div>` : ''}
                <div class="post-content">
                    <a href="index.html?id=${escapeHtml(pId)}" class="title">
                        ${highlightTrend(post.title || 'Untitled', activeTrend)}
                    </a>
                    <div class="snippet">${highlightTrend(snippet, activeTrend)}</div>
                    <div class="tagline">By ${escapeHtml(post.anon || 'Anon')} • ${cCount} comments</div>
                </div>
            </div>`;
        });
    }

    feed.innerHTML = feedHtml;
}

document.addEventListener('DOMContentLoaded', renderTrendingPage);
