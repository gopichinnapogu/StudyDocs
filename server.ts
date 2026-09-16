import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Set up storage directory for uploaded files
const UPLOADS_DIR = path.join(process.cwd(), 'uploads_storage');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Persistent documents index file on disk
const DOCS_DB_FILE = path.join(process.cwd(), 'documents_db.json');
if (!fs.existsSync(DOCS_DB_FILE)) {
  fs.writeFileSync(DOCS_DB_FILE, JSON.stringify([]), 'utf-8');
}

function readStoredDocs(): any[] {
  try {
    if (fs.existsSync(DOCS_DB_FILE)) {
      const content = fs.readFileSync(DOCS_DB_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error('Error reading documents_db.json:', err);
  }
  return [];
}

function writeStoredDocs(docs: any[]): void {
  try {
    fs.writeFileSync(DOCS_DB_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing documents_db.json:', err);
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniquePrefix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

// API Routes FIRST

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Get all uploaded documents (for ANY device)
app.get('/api/documents', (req, res) => {
  const docs = readStoredDocs();
  res.json({ success: true, documents: docs });
});

// 3. Upload a new document with actual binary file (works across all devices)
app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    const body = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const docId = body.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const downloadUrl = `/api/documents/download/${encodeURIComponent(file.filename)}`;

    const newDoc = {
      id: docId,
      title: body.title || file.originalname,
      format: body.format || 'OTHER',
      sizeFormatted: body.sizeFormatted || `${(file.size / 1024).toFixed(1)} KB`,
      sizeBytes: file.size,
      uploadDate: 'Recently',
      category: body.category || 'Uploaded Materials',
      downloadsCount: 0,
      colorTheme: body.colorTheme || 'indigo',
      fileName: file.originalname,
      storedFileName: file.filename,
      fileDownloadUrl: downloadUrl,
      summary: body.summary || `Uploaded ${body.format || 'study'} document`,
      tags: body.tags ? (typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags) : ['Study Resource'],
      author: body.author || 'User',
      isUserUploaded: true,
      createdAt: new Date().toISOString(),
    };

    const currentDocs = readStoredDocs();
    // Add to beginning of array
    currentDocs.unshift(newDoc);
    writeStoredDocs(currentDocs);

    return res.status(200).json({ success: true, document: newDoc });
  } catch (err: any) {
    console.error('Failed to handle file upload:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// 4. Download document binary file
app.get('/api/documents/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  // Find doc info to restore original filename on download
  const docs = readStoredDocs();
  const docInfo = docs.find((d) => d.storedFileName === filename);
  const originalName = docInfo?.fileName || filename;

  // Increment download counter
  if (docInfo) {
    docInfo.downloadsCount = (docInfo.downloadsCount || 0) + 1;
    writeStoredDocs(docs);
  }

  res.download(filePath, originalName);
});

// 5. Delete document
app.delete('/api/documents/:id', (req, res) => {
  const docId = req.params.id;
  const currentDocs = readStoredDocs();
  const targetDoc = currentDocs.find((d) => d.id === docId);

  if (targetDoc && targetDoc.storedFileName) {
    const filePath = path.join(UPLOADS_DIR, targetDoc.storedFileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not delete physical file:', e);
      }
    }
  }

  const updatedDocs = currentDocs.filter((d) => d.id !== docId);
  writeStoredDocs(updatedDocs);
  res.json({ success: true, deletedId: docId });
});

// 6. Increment download count API
app.post('/api/documents/:id/increment-download', (req, res) => {
  const docId = req.params.id;
  const docs = readStoredDocs();
  const docItem = docs.find((d) => d.id === docId);
  if (docItem) {
    docItem.downloadsCount = (docItem.downloadsCount || 0) + 1;
    writeStoredDocs(docs);
  }
  res.json({ success: true });
});

async function startServer() {
  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express v5 requires path pattern without raw wildcard: use regex or named route
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud Documents Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
