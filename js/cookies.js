const COOKIE_CACHE_NAME = 'imageporn-resource-cache-v1';
const COOKIE_CACHE_META_KEY = 'imageporn-cache-meta';
const COOKIE_RESOURCE_ROOT_MARGIN = '300px';

function isCacheSupported() {
    return 'caches' in window && typeof caches.open === 'function';
}

async function openCookieCache() {
    if (!isCacheSupported()) return null;
    return caches.open(COOKIE_CACHE_NAME);
}

function getCacheMeta() {
    try {
        return JSON.parse(localStorage.getItem(COOKIE_CACHE_META_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function setCacheMeta(meta) {
    try {
        localStorage.setItem(COOKIE_CACHE_META_KEY, JSON.stringify(meta));
    } catch (error) {
        console.warn('Unable to save cache metadata', error);
    }
}

function updateCacheMeta(url) {
    const meta = getCacheMeta();
    meta[url] = { cachedAt: Date.now() };
    setCacheMeta(meta);
}

async function getCachedResponse(url) {
    if (!isCacheSupported()) return null;
    try {
        const cache = await openCookieCache();
        return await cache.match(url);
    } catch (error) {
        return null;
    }
}

async function cacheResponse(url, response) {
    if (!isCacheSupported() || !response || !response.ok) return;
    try {
        const cache = await openCookieCache();
        await cache.put(url, response.clone());
        updateCacheMeta(url);
    } catch (error) {
        console.warn('Unable to cache resource', url, error);
    }
}

async function fetchAndCacheResource(url) {
    try {
        const request = new Request(url, { mode: 'cors', cache: 'no-store' });
        const response = await fetch(request);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url} (${response.status})`);
        }
        await cacheResponse(url, response.clone());
        return response;
    } catch (error) {
        const cached = await getCachedResponse(url);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

function getResourceUrl(el) {
    return el.dataset.src || el.dataset.cacheUrl || el.src || el.getAttribute('data-src') || el.getAttribute('src');
}

function applyBlobObjectUrl(el, blob, originalUrl) {
    const objectUrl = URL.createObjectURL(blob);
    if (!el.dataset.cacheUrl) {
        el.dataset.cacheUrl = originalUrl;
    }

    if (el.tagName === 'VIDEO') {
        el.src = objectUrl;
        el.load();
    } else if (el.tagName === 'IMG') {
        el.src = objectUrl;
    }
}

async function loadResourceForElement(el) {
    const originalUrl = getResourceUrl(el);
    if (!originalUrl || originalUrl.startsWith('data:') || el.dataset.cookieCacheProcessed === 'true') {
        return;
    }

    el.dataset.cookieCacheProcessed = 'pending';

    try {
        const cachedResponse = await getCachedResponse(originalUrl);
        const response = cachedResponse || await fetchAndCacheResource(originalUrl);
        const blob = await response.blob();
        applyBlobObjectUrl(el, blob, originalUrl);
        el.dataset.cookieCacheProcessed = 'true';
    } catch (error) {
        console.warn('Cookies cache failed for', originalUrl, error);
        el.dataset.cookieCacheProcessed = 'failed';
    }
}

const cookieObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const element = entry.target;
            loadResourceForElement(element);
            cookieObserver.unobserve(element);
        }
    });
}, { rootMargin: COOKIE_RESOURCE_ROOT_MARGIN, threshold: 0.01 });

function observeResourceElement(el) {
    if (el.dataset.cookieCacheObserved === 'true') return;
    el.dataset.cookieCacheObserved = 'true';

    if (el.dataset.src) {
        el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    }

    cookieObserver.observe(el);
}

function scanForResourceElements(root = document) {
    const resources = root.querySelectorAll('img[src], img[data-src], video[src], video[data-src]');
    resources.forEach(observeResourceElement);
}

function watchForDynamicResources() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                if (node.matches('img[src], img[data-src], video[src], video[data-src]')) {
                    observeResourceElement(node);
                } else if (node.querySelectorAll) {
                    scanForResourceElements(node);
                }
            });
        });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
}

async function preloadAllPageResources() {
    const urls = new Set();
    document.querySelectorAll('img[src], img[data-src], video[src], video[data-src], source[src], source[data-src]').forEach((element) => {
        const url = getResourceUrl(element);
        if (url && !url.startsWith('data:')) {
            urls.add(url);
        }
    });

    for (const url of urls) {
        try {
            await fetchAndCacheResource(url);
        } catch (error) {
            // ignore; resource may not be ready or may be cross-origin blocked.
        }
    }
}

function initCookiesCache() {
    if (!isCacheSupported()) {
        return;
    }

    scanForResourceElements(document);
    watchForDynamicResources();

    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadAllPageResources(), { timeout: 3000 });
    } else {
        setTimeout(() => preloadAllPageResources(), 3000);
    }
}

window.addEventListener('DOMContentLoaded', initCookiesCache);
window.addEventListener('load', initCookiesCache);
