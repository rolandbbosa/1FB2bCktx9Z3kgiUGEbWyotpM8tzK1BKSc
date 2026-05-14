// ─── Human Verification (replaces human.php) ─────────────────────────────────
// Uses localStorage instead of PHP cookies (30-minute expiry logic preserved)

(function () {
    const COOKIE_KEY  = 'age_verified';
    const EXPIRY_MS   = 30 * 60 * 1000; // 30 minutes

    function isVerified() {
        const raw = localStorage.getItem(COOKIE_KEY);
        if (!raw) return false;
        try {
            const { value, expiry } = JSON.parse(raw);
            if (value === 'yes' && Date.now() < expiry) return true;
            localStorage.removeItem(COOKIE_KEY);
            return false;
        } catch { return false; }
    }

    function setVerified() {
        localStorage.setItem(COOKIE_KEY, JSON.stringify({
            value:  'yes',
            expiry: Date.now() + EXPIRY_MS
        }));
    }

    // ── Captcha helpers ──────────────────────────────────────────────────────
    function getRandomLetters(count) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return Array.from({ length: count }, () =>
            letters.charAt(Math.floor(Math.random() * letters.length)));
    }

    function getRandomEmojis(count) {
        const emojis = ['😀','😎','😜','🤖','🐱','🍕','🌟','🔥','🎉','🍀','🐷','🐒','🎃'];
        return Array.from({ length: count }, () =>
            emojis[Math.floor(Math.random() * emojis.length)]);
    }

    let captchaType, correctAnswer;
    let pendingSubmitResolve = null;
    let currentMode = 'age';

    function generateCaptcha() {
        const types = ['emoji', 'image'];
        captchaType = types[Math.floor(Math.random() * types.length)];
        const area = document.getElementById('captchaArea');
        let html = '';

        if (captchaType === 'emoji') {
            const emojis = getRandomEmojis(3);
            correctAnswer = emojis[Math.floor(Math.random() * emojis.length)];
            html = `<p>Click the correct emoji: ${correctAnswer}</p>`;
            emojis.forEach(e => { html += `<button class="emojiBtn">${e}</button>`; });
        } else {
            const letters = getRandomLetters(3);
            correctAnswer = letters[Math.floor(Math.random() * letters.length)];
            html = `<p>Click on the letter: ${correctAnswer}</p>`;
            letters.forEach(l => { html += `<button class="imgBtn">${l}</button>`; });
        }

        area.innerHTML = html;
        bindCaptchaEvents();
    }

    function bindCaptchaEvents() {
        document.getElementById('errorMsg').textContent = '';

        document.querySelectorAll('.emojiBtn, .imgBtn').forEach(btn => {
            btn.addEventListener('click', () => submitCaptcha(btn.textContent));
        });
    }

    function submitCaptcha(val) {
        if (val === correctAnswer) {
            setVerified();
            hidePopup();
            if (pendingSubmitResolve) {
                pendingSubmitResolve(true);
                pendingSubmitResolve = null;
            }
        } else {
            document.getElementById('errorMsg').textContent = 'Wrong selection, try again.';
            generateCaptcha();
        }
    }

    function hidePopup() {
        const popup = document.getElementById('agePopup');
        if (popup) popup.style.display = 'none';
    }

    function showPopup(mode = 'age') {
        currentMode = mode;
        const popup    = document.getElementById('agePopup');
        const titleEl  = popup.querySelector('h2');
        const descEl   = popup.querySelector('p');

        if (mode === 'submit') {
            titleEl.textContent = 'Confirm Submission';
            descEl.textContent  = 'Please complete this quick human check to submit your post.';
        } else {
            titleEl.textContent = 'Human Verification';
            descEl.textContent  = 'You must be 16+ to use this website.';
        }

        popup.style.display = 'block';
        generateCaptcha();
    }

    window.ensureSubmitVerified = function() {
        return new Promise(resolve => {
            pendingSubmitResolve = resolve;
            showPopup('submit');
        });
    };

    // ── Inject popup HTML if not already in page ─────────────────────────────
    function injectPopupHTML() {
        if (document.getElementById('agePopup')) return; // already in page
        const div = document.createElement('div');
        div.innerHTML = `
        <div id="agePopup">
            <div class="popup-content">
                <h2>Human Verification</h2>
                <p>You must be 16+ to use this website.</p>
                <div id="captchaArea"></div>
                <p id="errorMsg" style="color:red;"></p>
            </div>
        </div>`;
        document.body.prepend(div.firstElementChild);
    }

    // ── Boot ─────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        injectPopupHTML();
        if (!isVerified()) showPopup('age');
    });
})();
