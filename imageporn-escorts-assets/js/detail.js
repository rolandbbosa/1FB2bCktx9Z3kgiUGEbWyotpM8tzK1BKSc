(function () {
  if (document.body.dataset.page !== 'detail-view') return;
  const ageGate = document.querySelector('#age-gate');
  const ageCookie = document.cookie.split('; ').find((item) => item.startsWith('imagepornAgeConfirmed='));
  if (ageGate && (ageCookie?.split('=')[1] === 'yes' || localStorage.getItem('imagepornAgeConfirmed') === 'yes')) ageGate.remove();
  ageGate?.querySelector('#age-yes')?.addEventListener('click', () => { document.cookie = 'imagepornAgeConfirmed=yes; max-age=31536000; path=/; SameSite=Lax'; localStorage.setItem('imagepornAgeConfirmed', 'yes'); ageGate.remove(); });
  ageGate?.querySelector('#age-no')?.addEventListener('click', () => { window.location.replace('https://www.google.com'); });
  if (!window.firebase?.firestore) return;
  const configured = window.FIREBASE_CONFIG && !window.FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
  if (!configured) { document.querySelector('#detail').innerHTML = '<div class="empty">Firebase is not configured.</div>'; return; }
  if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
  const db = firebase.firestore();
  const root = document.querySelector('#detail');
  const lightbox = document.querySelector('#lightbox');
  const lightboxImage = document.querySelector('#lightbox-image');
  const closeLightbox = document.querySelector('#close-lightbox');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const calculateAge = (birthDateValue) => { if (!birthDateValue) return null; const birthDate = new Date(`${birthDateValue}T00:00:00`); if (Number.isNaN(birthDate.getTime())) return null; const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1; return age; };
  const showLightbox = (url, alt) => { lightboxImage.src = url; lightboxImage.alt = alt; lightbox.classList.remove('hidden'); document.body.classList.add('modal-open'); };
  const hideLightbox = () => { lightbox.classList.add('hidden'); lightboxImage.removeAttribute('src'); document.body.classList.remove('modal-open'); };
  closeLightbox.onclick = hideLightbox;
  lightbox.onclick = (event) => { if (event.target === lightbox) hideLightbox(); };
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hideLightbox(); });

  async function loadProfile() {
    const username = new URLSearchParams(location.search).get('user');
    if (!username) { root.innerHTML = '<div class="empty">No profile was selected.</div>'; return; }
    try {
      const snapshot = await db.collection('profiles').doc(username).get();
      if (!snapshot.exists || snapshot.data().active !== true) { root.innerHTML = '<div class="empty">This profile is not currently active.</div>'; return; }
      const profile = snapshot.data();
      const currentAge = calculateAge(profile.birthDate) ?? profile.age;
      const images = Array.isArray(profile.publicImages) ? profile.publicImages : [];
      const phone = profile.phone || '';
      const whatsappNumber = phone.replace(/\D/g, '');
      root.innerHTML = `<section class="profile-hero"><div class="profile-hero-copy"><a class="back-link" href="index.html"><i class="fa-solid fa-arrow-left"></i> Back to directory</a><div class="eyebrow">Verified profile</div><h1>${escapeHtml(profile.displayName || username)}</h1><p class="profile-handle">@${escapeHtml(profile.username || username)}</p><div class="facts"><span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(profile.country)} · ${escapeHtml(profile.region)}</span><span><i class="fa-solid fa-cake-candles"></i> ${escapeHtml(currentAge)} years</span></div><div class="contact-actions"><a class="contact-link" href="tel:${encodeURIComponent(phone)}"><i class="fa-solid fa-phone"></i><span>${escapeHtml(phone)}</span></a>${profile.whatsapp ? `<a class="btn whatsapp-btn" href="https://wa.me/${encodeURIComponent(whatsappNumber)}?text=${encodeURIComponent('Hi 👋, I found your page on imageporn.xyz/escorts')}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}</div></div><button class="profile-avatar-button" type="button" aria-label="Expand profile picture"><img class="profile-photo" src="${escapeHtml(profile.profileImage)}" alt="${escapeHtml(profile.displayName || username)}"></button></section><section class="profile-content"><div><div class="section-label">About</div><p class="bio">${escapeHtml(profile.bio)}</p></div><div><div class="section-label">Public pictures</div><p class="muted gallery-note">Click an image to expand it. Double-click the expanded image to open it direct.</p><div class="gallery">${images.map((url, index) => `<button class="gallery-item" type="button" data-image-url="${escapeHtml(url)}"><img src="${escapeHtml(url)}" alt="${escapeHtml(profile.displayName || username)} public image ${index + 1}" loading="lazy"><span class="gallery-index">${String(index + 1).padStart(2, '0')}</span></button>`).join('')}</div></div><div class="visit-line"><i class="fa-regular fa-eye"></i> Page visits: <strong id="visits">...</strong></div></section>`;
      document.querySelector('.profile-avatar-button').onclick = () => showLightbox(profile.profileImage, profile.displayName || username);
      document.querySelectorAll('.gallery-item').forEach((item) => { const url = item.dataset.imageUrl; item.onclick = () => showLightbox(url, item.querySelector('img').alt); });
      lightboxImage.ondblclick = () => { if (lightboxImage.src) window.location.assign(lightboxImage.src); };
      const visitCookie = `imagepornVisited_${encodeURIComponent(username)}`;
      const hasVisitCookie = document.cookie.split('; ').some((cookie) => cookie.startsWith(`${visitCookie}=1`));
      const profileRef = db.collection('profiles').doc(snapshot.id);
      const unsubscribe = profileRef.onSnapshot((liveSnapshot) => { if (liveSnapshot.exists) document.querySelector('#visits').textContent = Number(liveSnapshot.data().visits || 0); });
      if (!hasVisitCookie) { document.cookie = `${visitCookie}=1; max-age=31536000; path=/; SameSite=Lax`; try { await profileRef.update({ visits: firebase.firestore.FieldValue.increment(1) }); } catch (error) { document.cookie = `${visitCookie}=; max-age=0; path=/; SameSite=Lax`; console.error('Could not update page visits.', error); } }
      window.addEventListener('pagehide', unsubscribe, { once: true });
    } catch (error) { root.innerHTML = `<div class="empty">${escapeHtml(error.message || 'This profile could not be loaded.')}</div>`; }
  }
  loadProfile();
})();
