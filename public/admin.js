const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const countBadge = document.getElementById('countBadge');
const refreshBtn = document.getElementById('refreshBtn');

function shortSessionId(id) {
  if (!id) return 'unknown';
  return id.slice(0, 8) + '…';
}

function formatTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString();
}

function renderRows(locations) {
  tableBody.innerHTML = '';

  if (!locations.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  const fragment = document.createDocumentFragment();

  for (const loc of locations) {
    const tr = document.createElement('tr');

    const mapUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;

    tr.innerHTML = `
      <td title="${loc.sessionId || ''}">${shortSessionId(loc.sessionId)}</td>
      <td>${loc.latitude.toFixed(6)}</td>
      <td>${loc.longitude.toFixed(6)}</td>
      <td>${loc.accuracy !== null ? Math.round(loc.accuracy) : '—'}</td>
      <td>${formatTime(loc.receivedAt)}</td>
      <td><a class="map-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer">View on Map</a></td>
    `;

    fragment.appendChild(tr);
  }

  tableBody.appendChild(fragment);
}

async function loadLocations() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Loading…';

  try {
    const response = await fetch('/api/admin/locations', { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);

    const data = await response.json();
    countBadge.textContent = `${data.count} record${data.count === 1 ? '' : 's'}`;
    renderRows(data.locations);
  } catch (err) {
    console.error('Failed to load locations:', err);
    countBadge.textContent = 'Error loading data';
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '⟳ Refresh';
  }
}

refreshBtn.addEventListener('click', loadLocations);

// Initial load
loadLocations();
