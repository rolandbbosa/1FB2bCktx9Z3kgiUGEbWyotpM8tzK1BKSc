(function () {
  if (document.body.dataset.authMode !== 'login' || !window.firebase?.auth || !window.firebase?.firestore) return;
  const resend = document.querySelector('#resend');
  const message = document.querySelector('#auth-message');
  if (!resend) return;
  const show = (text, success) => { message.textContent = text; message.className = 'message' + (success ? ' success' : ''); };
  resend.onclick = async () => {
    try {
      const username = document.querySelector('#username').value.trim();
      const password = document.querySelector('#password').value;
      if (!username || !password) throw new Error('Enter your username and password first.');
      const db = firebase.firestore();
      const usernameSnapshot = await db.collection('usernames').doc(username.toLowerCase()).get();
      if (!usernameSnapshot.exists) throw new Error('Username or password is incorrect.');
      const credential = await firebase.auth().signInWithEmailAndPassword(usernameSnapshot.data().email, password);
      if (credential.user.emailVerified) return show('This email is already verified. Log in again to continue.', true);
      await credential.user.sendEmailVerification();
      show('A new Firebase verification link has been sent. Click it, then log in again.', true);
    } catch (error) {
      show(error.message || 'The verification email could not be sent.');
    }
  };
})();
