/**
 * Production Server for MyDetailArea
 * Express server with custom routing for SPA + static assets
 * Specifically configured for face-api.js .bin files
 */

const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, 'dist');

// Compression middleware - but NOT for .bin files
app.use(compression({
  filter: (req, res) => {
    // Never compress binary model files
    if (req.url.endsWith('.bin')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Custom middleware for .bin files
app.use('/models', (req, res, next) => {
  if (req.url.endsWith('.bin')) {
    // Set correct headers for binary files
    res.set({
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Encoding': 'identity',
      'Access-Control-Allow-Origin': '*'
    });
  }
  next();
});

// Serve static files from dist/
app.use(express.static(DIST_DIR, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filepath) => {
    // Set proper Content-Type for .bin files
    if (filepath.endsWith('.bin')) {
      res.set('Content-Type', 'application/octet-stream');
    }
    // Cache static assets aggressively
    if (filepath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Health check endpoint (MUST be before catch-all route)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for all non-static routes
// This MUST be after static file handling and specific routes
app.use((req, res, next) => {
  // Don't serve index.html for API calls or files with extensions
  if (req.path.startsWith('/api/') || req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).send('Not Found');
  }

  res.sendFile(path.join(DIST_DIR, 'index.html'), {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ MyDetailArea server running on port ${PORT}`);
  console.log(`✓ Serving static files from: ${DIST_DIR}`);
  console.log(`✓ Models directory: ${path.join(DIST_DIR, 'models')}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
