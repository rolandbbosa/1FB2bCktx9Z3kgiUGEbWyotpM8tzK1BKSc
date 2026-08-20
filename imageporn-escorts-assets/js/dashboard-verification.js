(function () {
  if (document.body.dataset.page !== 'dashboard' || !window.firebase?.auth || !window.firebase?.firestore) return;
  const auth = firebase.auth();
  const db = firebase.firestore();
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      await user.reload();
      const currentUser = auth.currentUser;
      if (!currentUser?.emailVerified) return;
      const profiles = await db.collection('profiles').where('email', '==', currentUser.email).limit(1).get();
      if (profiles.empty) return;
      await db.collection('profiles').doc(profiles.docs[0].id).set({
        emailVerified: true,
        emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Could not remember email verification state.', error);
    }
  });
})();
