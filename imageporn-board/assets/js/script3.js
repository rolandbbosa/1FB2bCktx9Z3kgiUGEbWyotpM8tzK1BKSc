// ─── script3.js ──────────────────────────────────────────────────────────────
// Comments rendering, post creation, add comment – now calling Firebase

// --- COMMENT RENDERING ---
function countReplies(commentId, allComments) {
    return allComments.filter(c => c.parent_id == commentId).length;
}

function totalCommentCount(postId, allComments) {
    return allComments.filter(c => c.post_id == postId).length;
}

function getThreadColorClass(index) {
    const classes = ['thread-color-0', 'thread-color-1', 'thread-color-2', 'thread-color-3', 'thread-color-4'];
    return classes[index % classes.length];
}

function renderLimitedComments(postId, allComments) {
    const root = allComments.filter(c => c.post_id == postId && (c.parent_id === null || c.parent_id === undefined || c.parent_id === 'null' || c.parent_id === ''));
    if (root.length === 0) return '<p class="tagline">no comments yet</p>';

    const ranked = root
        .map(comment => ({ comment, replyCount: countReplies(comment.id, allComments) }))
        .sort((a, b) => b.replyCount - a.replyCount || (b.comment.timestamp || 0) - (a.comment.timestamp || 0));

    const visible = ranked.slice(0, Math.min(2, ranked.length));
    let html = visible.map((item, index) => renderSingleCommentHtml(item.comment, postId, allComments, false, getThreadColorClass(index))).join('');

    if (ranked.length > visible.length) {
        html += `<a href="index.html?id=${postId}" class="toggle-btn">+ view more comments (${totalCommentCount(postId, allComments)})</a>`;
    }
    return html;
}

function renderCommentsRecursive(postId, parentId, allComments, threadClass) {
    const children  = allComments.filter(c => c.post_id == postId && c.parent_id == parentId);
    let html        = "";
    const threshold = parentId === null ? Infinity : 2;
    const moreCount = children.length > threshold ? children.length - threshold : 0;

    children.forEach((c, index) => {
        if (index === threshold) html += `<div id="more-from-${parentId}" class="hidden">`;
        const childThreadClass = threadClass || (parentId === null ? getThreadColorClass(index) : '');
        html += renderSingleCommentHtml(c, postId, allComments, true, childThreadClass);
    });

    if (children.length > threshold) {
        html += `</div>
        <a href="javascript:void(0)" id="btn-more-${parentId}" class="toggle-btn view-more-btn"
           onclick="window.revealComments('${parentId}', ${moreCount})">
            +${moreCount} View more replies
        </a>`;
    }
    return html;
}

function renderSingleCommentHtml(c, postId, allComments, recursive, threadClass) {
    const timeStr    = new Date(c.timestamp * 1000).toLocaleTimeString();
    const replyCount = countReplies(c.id, allComments);
    const replyText  = replyCount > 0 ? ` • ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : '';

    return `<div class="comment${threadClass ? ' ' + threadClass : ''}">
        <p class="tagline">${c.anon} • ${timeStr}${replyText}</p>
        <div class="md">${linkify(c.text)}</div>
        <ul class="flat-list"><li><a href="javascript:void(0)" onclick="window.showReplyBox('${c.id}')">reply</a></li></ul>
        <div id="box-${c.id}" class="hidden reply-input">
            <textarea id="in-${c.id}" placeholder="Your reply..." style="resize: none; width:100%; height:40px; overflow:hidden;"></textarea>
            <button onclick="window.addComment('${postId}', '${c.id}')">save</button>
        </div>
        <div class="child">${recursive ? renderCommentsRecursive(postId, c.id, allComments, threadClass) : ''}</div>
    </div>`;
}

window.revealComments = function(parentId, count) {
    const target = document.getElementById(`more-from-${parentId}`);
    const btn    = document.getElementById(`btn-more-${parentId}`);
    if (!target || !btn) return;
    if (target.classList.contains('hidden')) {
        target.classList.remove('hidden');
        btn.innerText = `- minimise`;
    } else {
        target.classList.add('hidden');
        btn.innerText = `+${count} View more replies`;
    }
};

window.showReplyBox = function(id) {
    document.getElementById(`box-${id}`).classList.toggle('hidden');
};

// --- POST CREATION WITH IMGBB MULTI-UPLOAD ---
window.createPostAction = async function() {
    const titleEl   = document.getElementById('p-title');
    const msgEl     = document.getElementById('p-message');
    const filesEl   = document.getElementById('p-images');
    const submitBtn = document.querySelector('#submit-section button');

    const title   = titleEl ? titleEl.value.trim() : '';
    const message = msgEl   ? msgEl.value.trim()   : '';
    const files   = filesEl ? filesEl.files          : [];

    if (!title || !message) {
        alert('Title and message are required.');
        return;
    }

    if (typeof window.ensureSubmitVerified === 'function') {
        const verified = await window.ensureSubmitVerified();
        if (!verified) return;
    }

    // Size check: max 25 MB total
    let totalSize = 0;
    for (let f of files) totalSize += f.size;
    if (totalSize > 25 * 1024 * 1024) {
        alert("Total image size must be 25MB or less");
        return;
    }

    submitBtn.disabled  = true;
    submitBtn.innerText = files.length > 0 ? `Uploading 0/${files.length}...` : 'Posting...';

    let uploadedUrls = [];
    const apiKey     = 'a9c5cc56e9e09cf9dbe5dc9cbb207441';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Rename file with random 15-digit prefix
        const random15  = Math.floor(Math.random() * 900000000000000 + 100000000000000);
        const ext        = file.name.split('.').pop();
        const renamed    = new File([file], `${random15}_imageporn-board.${ext}`, { type: file.type });

        const form = new FormData();
        form.append('image', renamed);

        try {
            const res  = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: form });
            const data = await res.json();
            if (data && data.data && data.data.url) {
                uploadedUrls.push(data.data.url);
            }
        } catch (err) {
            console.error("Image upload failed:", err);
        }

        submitBtn.innerText = `Uploading ${i + 1}/${files.length}...`;
    }

    // Combine message + uploaded image URLs
    const fullMessage = message + (uploadedUrls.length ? '\n' + uploadedUrls.join('\n') : '');

    await createPost(title || 'Untitled', fullMessage); // Firebase call

    submitBtn.innerText = "Post Submitted!";
    setTimeout(() => location.reload(), 1000);
};

// --- ADD COMMENT ---
window.addComment = async function(postId, parentId) {
    const inputId = parentId ? `in-${parentId}` : `input-${postId}`;
    const el      = document.getElementById(inputId);
    if (!el) return;
    const val = el.value.trim();
    if (!val) return;

    const btn = el.nextElementSibling;
    if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

    await createComment(postId, parentId || null, val); // Firebase call
    location.reload();
};

// --- AUTO RESIZE TEXTAREAS ---
document.addEventListener('input', function(event) {
    if (event.target.tagName.toLowerCase() !== 'textarea') return;
    event.target.style.height = 'auto';
    event.target.style.height = event.target.scrollHeight + 'px';
});

// ── Boot ──────────────────────────────────────────────────────────────────────
loadContent();
