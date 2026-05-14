// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDKtOdU4PmUQE8_vwaz6k_w_BjRe466dyg",
    authDomain: "data-b61c7.firebaseapp.com",
    databaseURL: "https://data-b61c7-default-rtdb.firebaseio.com",
    projectId: "data-b61c7",
    storageBucket: "data-b61c7.firebasestorage.app",
    messagingSenderId: "570416012500",
    appId: "1:570416012500:web:66921eb421f776b01d2f41",
    measurementId: "G-XN0PPCPW42"
};

// Initialize Firebase (using compat SDK loaded via CDN in HTML)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const LOCAL_DATA_KEY = 'imageporn-board_data_cache';

// ─── Cache helpers ───────────────────────────────────────────────────────────

function normalizeComment(comment) {
    const parent = comment.parent_id;
    return {
        ...comment,
        parent_id: parent == null || parent === 'null' || parent === '' ? null : parent
    };
}

function sortData(posts, comments) {
    const normalizedComments = comments.map(normalizeComment);
    const sortedPosts       = posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const sortedComments    = normalizedComments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return { posts: sortedPosts, comments: sortedComments };
}

function loadCachedData() {
    try {
        const raw = localStorage.getItem(LOCAL_DATA_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (!cached || !Array.isArray(cached.posts) || !Array.isArray(cached.comments)) return null;
        return cached;
    } catch {
        return null;
    }
}

function saveCachedData(data) {
    try {
        localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify({ ...data, storedAt: Date.now() }));
    } catch {
        // Ignore write errors.
    }
}

function clearCachedData() {
    try { localStorage.removeItem(LOCAL_DATA_KEY); } catch {};
}

function dataHasChanged(oldData, newData) {
    if (!oldData || !newData) return true;
    if (oldData.posts.length !== newData.posts.length || oldData.comments.length !== newData.comments.length) {
        return true;
    }
    const oldLatestPost = oldData.posts[0]?.timestamp || 0;
    const newLatestPost = newData.posts[0]?.timestamp || 0;
    const oldLatestComment = oldData.comments[0]?.timestamp || 0;
    const newLatestComment = newData.comments[0]?.timestamp || 0;
    return oldLatestPost !== newLatestPost || oldLatestComment !== newLatestComment;
}

async function fetchRemoteData() {
    const [postsSnap, commentsSnap] = await Promise.all([
        db.ref('posts').once('value'),
        db.ref('comments').once('value')
    ]);

    const postsObj    = postsSnap.val()    || {};
    const commentsObj = commentsSnap.val() || {};

    const data = sortData(Object.values(postsObj), Object.values(commentsObj));
    saveCachedData(data);
    return data;
}

async function getData() {
    const cachedData = loadCachedData();
    if (cachedData) {
        fetchRemoteData().then(freshData => {
            if (dataHasChanged(cachedData, freshData) && typeof window.onCachedDataUpdate === 'function') {
                window.onCachedDataUpdate(freshData);
            }
        }).catch(() => {});
        return cachedData;
    }
    return await fetchRemoteData();
}

/**
 * Create a new post in Firebase.
 */
async function createPost(title, message) {
    const postId = generateId();
    const post = {
        post_id:   postId,
        title:     sanitize(title || 'Untitled'),
        message:   message || '',
        thumb:     extractFirstImageUrl(message),
        anon:      'Anon' + Math.floor(Math.random() * 9000 + 1000),
        timestamp: Math.floor(Date.now() / 1000)
    };
    await db.ref('posts/' + postId).set(post);
    clearCachedData();
    return { success: true };
}

/**
 * Create a new comment in Firebase.
 */
async function createComment(postId, parentId, text) {
    const id = generateId();
    const comment = {
        id:        id,
        post_id:   postId,
        parent_id: parentId || null,
        text:      sanitize(text || ''),
        anon:      'Anon' + Math.floor(Math.random() * 9000 + 1000),
        timestamp: Math.floor(Date.now() / 1000)
    };
    await db.ref('comments/' + id).set(comment);
    clearCachedData();
    return { success: true };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
    return Date.now().toString(16) + Math.random().toString(16).slice(2, 7);
}

function sanitize(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function extractFirstImageUrl(msg) {
    if (!msg) return null;
    const m = msg.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
    return m ? m[0] : null;
}
