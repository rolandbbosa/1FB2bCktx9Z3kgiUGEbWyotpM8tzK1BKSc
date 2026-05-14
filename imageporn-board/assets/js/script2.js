// ─── script2.js ──────────────────────────────────────────────────────────────
// loadContent, renderFeedView, renderSinglePostView – now using Firebase

async function loadContent() {
    const data = await getData(); // from firebase-config.js

    // Create overlay if missing
    if (!document.getElementById('media-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'media-overlay';
        overlay.innerHTML = '<div id="overlay-content" onclick="event.stopPropagation()"></div>';
        overlay.onclick = window.closeLightbox;
        document.body.appendChild(overlay);
    }

    if (currentViewId) renderSinglePostView(currentViewId, data.posts, data.comments);
    else renderFeedView(data.posts, data.comments);

    if (sharedFile) {
        const fileType = sharedFile.match(/\.(mp4|webm|ogg)$/i) ? 'vid' : 'img';
        window.openLightbox(null, sharedFile, fileType);
    }
}

window.onCachedDataUpdate = function(data) {
    if (!data || !data.posts || !data.comments) return;
    if (currentViewId) renderSinglePostView(currentViewId, data.posts, data.comments);
    else renderFeedView(data.posts, data.comments);
};

// --- FEED VIEW ---
function renderFeedView(posts, comments) {
    const nav    = document.getElementById('nav-actions');
    const submit = document.getElementById('submit-section');
    if (nav)    nav.innerHTML = '';
    if (submit) submit.innerHTML = `<div class="submit-area">
        <input type="text" id="p-title" placeholder="Title" required>
        <textarea style="resize: none;" id="p-message" placeholder="What's on your mind?" required></textarea>
        <input type="file" id="p-images" multiple accept="image/*">
        <button onclick="window.createPostAction()">Submit</button>
    </div>`;

    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    if (!posts || posts.length === 0) {
        feed.innerHTML = '<p class="tagline">No posts yet. Be the first to post!</p>';
        return;
    }

    posts.forEach(post => {
        const dateStr = post.timestamp ? new Date(post.timestamp * 1000).toLocaleDateString() : '';
        const el = document.createElement('div');
        el.className = 'post';
        el.innerHTML = `<div class="entry">
            <a href="index.html?id=${post.post_id}" class="title">${post.title}</a>
            <p class="tagline">submitted by ${post.anon}${dateStr ? ' on ' + dateStr : ''}</p>
            <div class="expando">
                <div class="text-content">${linkify(post.message)}</div>
                ${parseMedia(post.message)}
            </div>
            <div class="comment-area">
                <div id="tree-${post.post_id}">
                    ${renderLimitedComments(post.post_id, comments)}
                </div>
            </div>
        </div>`;
        feed.appendChild(el);
    });
}

// --- SINGLE POST VIEW ---
function renderSinglePostView(postId, posts, comments) {
    const post = posts.find(p => p.post_id == postId);
    if (!post) {
        document.getElementById('feed').innerHTML = 'Post not found. <a href="index.html">Go back</a>';
        return;
    }
    document.getElementById('submit-section').innerHTML = '';
    document.getElementById('nav-actions').innerHTML = '<a href="index.html" class="toggle-btn">← back to feed</a>';

    const dateStr = post.timestamp ? new Date(post.timestamp * 1000).toLocaleDateString() : '';
    const feed = document.getElementById('feed');
    feed.innerHTML = `<div class="post single-view">
        <h1 class="title">${post.title}</h1>
        <p class="tagline">by ${post.anon}${dateStr ? ' on ' + dateStr : ''}</p>
        <div class="expando large">
            <div class="text-content">${linkify(post.message)}</div>
            ${parseMedia(post.message)}
        </div>
        <div class="comment-area full">
            <div class="reply-input">
                <textarea id="input-${post.post_id}" placeholder="What are your thoughts?" style="width:100%; height:60px; overflow:hidden; resize: none;"></textarea><br>
                <button onclick="window.addComment('${post.post_id}', null)">post comment</button>
            </div>
            <div class="comment-tree">
                ${renderCommentsRecursive(post.post_id, null, comments)}
            </div>
        </div>
    </div>`;
}
