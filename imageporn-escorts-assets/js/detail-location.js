(function () {
  if (document.body.dataset.page !== 'detail-view' || !window.firebase?.firestore) return;
  const db = firebase.firestore();
  const username = new URLSearchParams(location.search).get('user');
  if (!username) return;
  const observer = new MutationObserver(async () => {
    const locationFact = document.querySelector('.facts span:first-child');
    if (!locationFact || locationFact.dataset.districtAdded) return;
    try {
      const snapshot = await db.collection('profiles').doc(username).get();
      const district = snapshot.data()?.district;
      if (district) locationFact.innerHTML += ` · ${String(district).replace(/[&<>"']/g, '')}`;
      locationFact.dataset.districtAdded = 'true';
      observer.disconnect();
    } catch (error) { observer.disconnect(); }
  });
  observer.observe(document.querySelector('#detail'), { childList: true, subtree: true });
})();
