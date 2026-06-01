// Mandala Web Server (Vanilla Node.js)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');

console.log(`Workspace Directory: ${PUBLIC_DIR}`);
console.log(`Downloads Directory: ${DOWNLOADS_DIR}`);

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.stl': 'model/stl',
  '.3mf': 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
};

// Security helper: ensure the resolved path stays inside the target directory
function safeResolve(baseDir, urlPath) {
  // Strip leading slashes to prevent absolute path resolution to C:\ on Windows
  const cleanPath = urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(baseDir, cleanPath);
  if (resolved.startsWith(path.resolve(baseDir))) {
    return resolved;
  }
  return null;
}

// Scans a specific directory for valid Mendala JSON files
function scanDirectoryForDesigns(dirPath, locationKey) {
  const designs = [];
  try {
    if (!fs.existsSync(dirPath)) return designs;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (path.extname(file).toLowerCase() === '.json') {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Check if it matches a Mendala save structure
            if (data && Array.isArray(data.layers)) {
              let strokeCount = 0;
              data.layers.forEach(l => {
                if (Array.isArray(l.strokes)) {
                  strokeCount += l.strokes.length;
                }
              });

              designs.push({
                filename: file,
                projectName: data.projectName || file.replace('.json', ''),
                layerCount: data.layers.length,
                strokeCount: strokeCount,
                sizeBytes: stat.size,
                modifiedTime: stat.mtime,
                location: locationKey, // 'workspace' or 'downloads'
                loadUrl: `/${locationKey}/${encodeURIComponent(file)}`, // Virtual path to fetch
                data: data // Send data for client-side rendering
              });
            }
          } catch (e) {
            // Ignore invalid JSON files or non-mandala files
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
  }
  return designs;
}

function getMendalaDesigns() {
  const workspaceDesigns = scanDirectoryForDesigns(PUBLIC_DIR, 'workspace');
  const downloadsDesigns = scanDirectoryForDesigns(DOWNLOADS_DIR, 'downloads');
  
  const allDesigns = [...workspaceDesigns, ...downloadsDesigns];
  
  // Sort by modified time descending (newest first)
  return allDesigns.sort((a, b) => b.modifiedTime - a.modifiedTime);
}

const server = http.createServer((req, res) => {
  const decodedUrl = decodeURIComponent(req.url);
  const parsedUrl = new URL(decodedUrl, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname}`);

  // CORS headers - restrict to localhost to prevent public sites from reading local file lists
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1' || originUrl.hostname === '[::1]') {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } catch (e) {
      // Ignored: invalid URL format
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Endpoints ---
  
  // GET /api/designs
  if (req.method === 'GET' && pathname === '/api/designs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getMendalaDesigns()));
    return;
  }

  // DELETE /api/designs/:location/:filename
  if (req.method === 'DELETE' && pathname.startsWith('/api/designs/')) {
    const parts = pathname.replace('/api/designs/', '').split('/');
    if (parts.length < 2) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid URL format' }));
      return;
    }

    const location = parts[0];
    const filename = parts.slice(1).join('/'); // Rejoin if filename has slashes

    // Security check: only allow .json and restrict traversal
    if (!filename || path.extname(filename).toLowerCase() !== '.json' || filename.includes('/') || filename.includes('\\')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid filename' }));
      return;
    }

    let targetDir;
    if (location === 'downloads') {
      targetDir = DOWNLOADS_DIR;
    } else if (location === 'workspace') {
      targetDir = PUBLIC_DIR;
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid location' }));
      return;
    }

    const filePath = path.join(targetDir, filename);
    
    if (fs.existsSync(filePath)) {
      try {
        // Read file first to make sure it's a valid Mendala file before deleting
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        if (data && Array.isArray(data.layers)) {
          fs.unlinkSync(filePath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Deleted ${filename} from ${location}` }));
          return;
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File is not a Mendala project' }));
          return;
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to delete file' }));
        return;
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }
  }

  // --- Static File & Virtual Path Serving ---

  // Handle virtual route for Downloads folder serving
  if (pathname.startsWith('/downloads/')) {
    const filename = pathname.replace('/downloads/', '');
    const safePath = safeResolve(DOWNLOADS_DIR, filename);
    
    if (!safePath || !fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 File Not Found in Downloads');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    fs.createReadStream(safePath).pipe(res);
    return;
  }

  // Handle virtual route for Workspace folder serving (removes prefix if passed)
  if (pathname.startsWith('/workspace/')) {
    pathname = pathname.replace('/workspace/', '/');
  }

  // Default routes
  if (pathname === '/' || pathname === '/index.html') {
    pathname = '/index.html';
  } else if (pathname === '/gallery' || pathname === '/gallery.html') {
    pathname = '/gallery.html';
  }

  const safePath = safeResolve(PUBLIC_DIR, pathname);
  if (!safePath || !fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(safePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(safePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Mendala Server running at http://localhost:${PORT}`);
  console.log(` View gallery dashboard at http://localhost:${PORT}/gallery`);
  console.log(`==================================================`);
});
