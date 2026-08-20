(function () {
  if (document.body.dataset.page !== 'dashboard' || !window.firebase?.firestore) return;
  const db = firebase.firestore();
  const auth = firebase.auth();
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const catalog = window.LOCATION_CATALOG || {};
  const options = (country, region, selected) => { const values = catalog[country]?.[region] || (selected ? [selected] : ['Central district', 'North district', 'South district']); return '<option value="">Choose district...</option>' + values.map((district) => `<option value="${escapeHtml(district)}" ${district === selected ? 'selected' : ''}>${escapeHtml(district)}</option>`).join(''); };
  let observedRoot;
  function enhance() {
    const form = $('#profile-form'); const country = $('#country'); const region = $('#region');
    if (!form || !country || !region || $('#district')) return;
    const group = document.createElement('div'); group.className = 'form-group'; group.innerHTML = '<label for="district">District</label><select id="district" required></select>';
    region.closest('.form-group').after(group);
    const district = $('#district'); const updateRegions = (selected) => { const values = Object.keys(catalog[country.value] || {}); if (!values.length) return; region.innerHTML = '<option value="">Choose region...</option>' + values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join(''); }; const update = () => { district.innerHTML = options(country.value, region.value, district.value); };
    updateRegions(region.value);
    district.innerHTML = options(country.value, region.value, '');
    country.addEventListener('change', () => { updateRegions(''); update(); }); region.addEventListener('change', update);
    const originalSubmit = form.onsubmit;
    form.onsubmit = async (event) => { if (originalSubmit) await originalSubmit(event); if (!district.value || !auth.currentUser) return; try { const profile = await db.collection('profiles').doc(document.querySelector('.dashboard-nav h2')?.textContent.trim()).get(); if (profile.exists) await db.collection('profiles').doc(profile.id).update({ district: district.value, uid: auth.currentUser.uid }); } catch (error) { const node = document.querySelector('#editor-message') || document.querySelector('#form-message'); if (node) node.textContent = error.message || 'District could not be saved.'; } };
  }
  observedRoot = new MutationObserver(enhance); observedRoot.observe($('#dashboard-content'), { childList: true, subtree: true }); enhance();
})();
