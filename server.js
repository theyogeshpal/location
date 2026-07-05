const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- In-memory data store -----
// Swap this out for MongoDB/SQLite/Postgres in production (see README).
const locations = [];
const MAX_RECORDS = 5000; // simple cap so memory doesn't grow forever

// ----- Middleware -----
app.use(helmet({
  contentSecurityPolicy: false // keep simple for local dev; tighten for prod (see README)
}));
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Assign each browser a random, anonymous session id via cookie.
// This is NOT tied to a real identity — it just lets us group pings
// from the same browser without asking for personal info.
app.use((req, res, next) => {
  if (!req.cookies.session_id) {
    const sessionId = uuidv4();
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', // requires HTTPS in prod
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });
    req.cookies.session_id = sessionId;
  }
  next();
});

// ----- Validation helper -----
function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

// ----- Routes -----

// User-facing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin dashboard page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Receive a location update from a consenting user
app.post('/api/location', (req, res) => {
  try {
    const { latitude, longitude, accuracy, timestamp, consent } = req.body || {};

    if (consent !== true) {
      return res.status(400).json({ error: 'Consent flag missing or false. Location not stored.' });
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid or missing latitude/longitude.' });
    }

    const record = {
      id: uuidv4(),
      sessionId: req.cookies.session_id,
      latitude,
      longitude,
      accuracy: typeof accuracy === 'number' ? accuracy : null,
      clientTimestamp: timestamp ? new Date(timestamp).toISOString() : null,
      receivedAt: new Date().toISOString(),
      ip: req.ip
    };

    locations.push(record);
    if (locations.length > MAX_RECORDS) {
      locations.shift(); // drop oldest when we hit the cap
    }

    return res.status(201).json({ message: 'Location recorded.', id: record.id });
  } catch (err) {
    console.error('Error storing location:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Return all stored locations for the admin dashboard
// NOTE: in production, put real authentication in front of this route (see README).
app.get('/api/admin/locations', (req, res) => {
  const sorted = [...locations].sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)
  );
  res.json({ count: sorted.length, locations: sorted });
});

// Optional: let a user clear their own stored history (good practice for consent-based apps)
app.delete('/api/location/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (sessionId !== req.cookies.session_id) {
    return res.status(403).json({ error: 'You can only delete your own session data.' });
  }
  for (let i = locations.length - 1; i >= 0; i--) {
    if (locations[i].sessionId === sessionId) locations.splice(i, 1);
  }
  res.json({ message: 'Session data deleted.' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.listen(PORT, () => {
  console.log(`Location tracker running at http://localhost:${PORT}`);
  console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
});
