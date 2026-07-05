const shareBtn = document.getElementById('shareBtn');
const statusEl = document.getElementById('status');

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

async function sendLocation(position) {
  const { latitude, longitude, accuracy } = position.coords;
  const timestamp = new Date(position.timestamp).toISOString();

  const payload = {
    latitude,
    longitude,
    accuracy,
    timestamp,
    consent: true // user only reaches this point after granting the browser prompt
  };

  try {
    const response = await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // send the session cookie
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Server responded with ${response.status}`);
    }

    setStatus('✅ Location shared successfully. Thank you!', 'success');
  } catch (err) {
    console.error('Failed to send location:', err);
    setStatus('⚠️ We could not reach the server. Please try again.', 'error');
  } finally {
    shareBtn.disabled = false;
  }
}

function handleGeolocationError(error) {
  shareBtn.disabled = false;
  switch (error.code) {
    case error.PERMISSION_DENIED:
      setStatus('You declined location access. No data was sent.', 'error');
      break;
    case error.POSITION_UNAVAILABLE:
      setStatus('Your location could not be determined right now.', 'error');
      break;
    case error.TIMEOUT:
      setStatus('The request timed out. Please try again.', 'error');
      break;
    default:
      setStatus('An unknown error occurred while getting your location.', 'error');
  }
}

function requestLocation() {
  if (!('geolocation' in navigator)) {
    setStatus('Geolocation is not supported by your browser.', 'error');
    return;
  }

  shareBtn.disabled = true;
  setStatus('Requesting permission…', 'pending');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setStatus('Permission granted. Sending location…', 'pending');
      sendLocation(position);
    },
    handleGeolocationError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

shareBtn.addEventListener('click', requestLocation);
