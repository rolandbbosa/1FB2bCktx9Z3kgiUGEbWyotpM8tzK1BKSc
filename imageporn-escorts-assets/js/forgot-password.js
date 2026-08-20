(function () {
  const $ = (selector) => document.querySelector(selector);
  const gate = $('#age-gate');
  const ageCookie = document.cookie.split('; ').find((item) => item.startsWith('imagepornAgeConfirmed='));
  if (gate && (ageCookie?.split('=')[1] === 'yes' || localStorage.getItem('imagepornAgeConfirmed') === 'yes')) gate.remove();
  $('#age-yes')?.addEventListener('click', () => { document.cookie = 'imagepornAgeConfirmed=yes; max-age=31536000; path=/; SameSite=Lax'; localStorage.setItem('imagepornAgeConfirmed', 'yes'); gate?.remove(); });
  $('#age-no')?.addEventListener('click', () => window.location.replace('https://www.google.com'));

  const configured = window.FIREBASE_CONFIG && !window.FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
  const message = (text, success) => { const node = $('#reset-message'); node.textContent = text; node.className = 'message' + (success ? ' success' : ''); };
  const readableError = (error) => { const text = error?.message || 'The reset link could not be sent.'; return text.replace(/^Firebase:\s*/, '').replace(/\s*\([^)]*\)\.?$/, '') + (error?.code ? ` [${error.code}]` : ''); };
  if (!configured) { message('Firebase is not configured. Add the Firebase values in firebase-config.js.'); $('#reset-submit').disabled = true; return; }
  if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try { await user.reload(); if (auth.currentUser?.emailVerified) window.location.replace('dashboard.html'); } catch (error) { message(readableError(error)); }
  });

  $('#forgot-password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const identifier = $('#account-identifier').value.trim();
    if (!identifier) return message('Enter your username or email address.');
    const submit = $('#reset-submit'); submit.disabled = true; submit.textContent = 'Sending...';
    try {
      let email = identifier.toLowerCase();
      if (!identifier.includes('@')) {
        if (!/^[A-Za-z0-9]+$/.test(identifier)) throw new Error('Enter a valid username or email address.');
        const usernameSnapshot = await db.collection('usernames').doc(identifier.toLowerCase()).get();
        if (!usernameSnapshot.exists || !usernameSnapshot.data().email) throw new Error('No account was found for that username.');
        email = usernameSnapshot.data().email;
      } else {
        let usernameSnapshot = await db.collection('usernames').where('email', '==', email).limit(1).get();
        if (usernameSnapshot.empty && identifier !== email) usernameSnapshot = await db.collection('usernames').where('email', '==', identifier).limit(1).get();
        if (usernameSnapshot.empty) throw new Error('No account was found for that email address.');
      }
      await auth.sendPasswordResetEmail(email);
      message('Password reset link sent. Check your email to choose a new password.', true);
    } catch (error) {
      message(readableError(error));
    } finally {
      submit.disabled = false; submit.textContent = 'Send reset link';
    }
  });
})();
