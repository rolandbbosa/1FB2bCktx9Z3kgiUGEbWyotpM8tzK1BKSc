(function () {
    function getDailySeed() {
        const today = new Date();
        return Number(`${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`);
    }

    function hash(value) {
        let result = 2166136261;
        for (let index = 0; index < value.length; index++) {
            result ^= value.charCodeAt(index);
            result = Math.imul(result, 16777619);
        }
        return result >>> 0;
    }

    function getItemKey(item) {
        const media = item.querySelector('img, video');
        return media?.currentSrc || media?.src || item.textContent.trim();
    }

    function shuffleGrid(grid) {
        const items = Array.from(grid.children);
        if (items.length < 2) return;

        const dailySeed = getDailySeed();
        items.sort((first, second) => {
            const firstOrder = hash(`${dailySeed}:${getItemKey(first)}`);
            const secondOrder = hash(`${dailySeed}:${getItemKey(second)}`);
            return firstOrder - secondOrder;
        });
        const fragment = document.createDocumentFragment();
        items.forEach((item) => fragment.appendChild(item));
        grid.appendChild(fragment);
    }

    function watchGrid(id) {
        const grid = document.getElementById(id);
        if (!grid) return;

        const observer = new MutationObserver(() => {
            observer.disconnect();
            shuffleGrid(grid);
            observer.observe(grid, { childList: true });
        });
        observer.observe(grid, { childList: true });
        shuffleGrid(grid);
    }

    function setupDailyOrdering() {
        watchGrid('imagesGrid');
        watchGrid('fetishGrid');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupDailyOrdering);
    } else {
        setupDailyOrdering();
    }
})();