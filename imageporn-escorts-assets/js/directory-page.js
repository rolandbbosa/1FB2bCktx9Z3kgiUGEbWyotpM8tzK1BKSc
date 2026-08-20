(function () {
  if (document.body.dataset.page !== 'directory-enhanced' || !window.firebase?.firestore) return;
  const db = firebase.firestore();
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#profiles');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const hash = (value) => { let result = 0; for (let index = 0; index < value.length; index += 1) result = ((result << 5) - result) + value.charCodeAt(index) | 0; return Math.abs(result); };
  const catalog = window.LOCATION_CATALOG || {};
  const setOptions = (select, label, values) => { select.innerHTML = `<option value="all">All ${label}</option>` + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(''); };
  const renderCards = (profiles) => {
    const term = $('#search').value.trim().toLowerCase(); const gender = $('#gender-filter').value; const country = $('#country-filter').value; const region = $('#region-filter').value; const district = $('#district-filter').value;
    const visible = profiles.filter((profile) => (!term || `${profile.username} ${profile.bio || ''} ${profile.country || ''} ${profile.region || ''} ${profile.district || ''}`.toLowerCase().includes(term)) && (gender === 'all' || profile.gender === gender) && (country === 'all' || profile.country === country) && (region === 'all' || profile.region === region) && (district === 'all' || profile.district === district));
    $('#result-count').textContent = `${visible.length} profile${visible.length === 1 ? '' : 's'}`;
    grid.innerHTML = visible.length ? visible.map((profile) => `<a class="escort-card" href="imageporn-escort-view.html?user=${encodeURIComponent(profile.username)}" style="background-image:url('${escapeHtml(profile.profileImage || '')}')"><div class="card-info"><span class="tag">${escapeHtml(profile.gender || 'Profile')} · ${escapeHtml(profile.country || 'Location not set')}</span><h3>${escapeHtml(profile.displayName || profile.username)}</h3><p>${escapeHtml(profile.region || 'Region not set')} · ${escapeHtml(profile.district || 'District not set')}</p><p>${escapeHtml((profile.bio || 'No bio available.').slice(0, 92))}${(profile.bio || '').length > 92 ? '...' : ''}</p></div></a>`).join('') : '<div class="empty">No active profiles match those filters.</div>';
  };
  async function loadDirectory() {
    try {
      const profiles = []; const snapshot = await db.collection('profiles').where('active', '==', true).get();
      snapshot.forEach((doc) => { const data = doc.data(); profiles.push({ id: doc.id, ...data, username: data.username || doc.id }); });
      profiles.sort((a, b) => hash(new Date().toISOString().slice(0, 10) + a.id) - hash(new Date().toISOString().slice(0, 10) + b.id));
      const countries = [...new Set([...Object.keys(catalog), ...profiles.map((profile) => profile.country).filter(Boolean)])].sort();
      setOptions($('#country-filter'), 'countries', countries);
      const updateDistricts = () => { const country = $('#country-filter').value; const region = $('#region-filter').value; let districts = country !== 'all' && region !== 'all' ? catalog[country]?.[region] || [] : []; if (!districts.length) districts = [...new Set(profiles.filter((profile) => (country === 'all' || profile.country === country) && (region === 'all' || profile.region === region)).map((profile) => profile.district).filter(Boolean))].sort(); setOptions($('#district-filter'), 'districts', districts); };
      const updateRegions = () => { const country = $('#country-filter').value; const regions = country === 'all' ? [...new Set([...Object.values(catalog).flatMap((entry) => Object.keys(entry)), ...profiles.map((profile) => profile.region).filter(Boolean)])].sort() : Object.keys(catalog[country] || {}); setOptions($('#region-filter'), 'regions', regions); updateDistricts(); renderCards(profiles); };
      updateRegions(); $('#search').oninput = () => renderCards(profiles); $('#gender-filter').onchange = () => renderCards(profiles); $('#country-filter').onchange = updateRegions; $('#region-filter').onchange = () => { updateDistricts(); renderCards(profiles); }; $('#district-filter').onchange = () => renderCards(profiles); renderCards(profiles);
    } catch (error) { grid.innerHTML = `<div class="empty">${escapeHtml(error.message || 'Profiles could not be loaded.')}</div>`; }
  }
  loadDirectory();
})();
