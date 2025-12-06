// @version 2.2.0
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Session context store (simple in-memory for now)
let currentSessionId = 'default';

// GET /api/v1/context/current
router.get('/current', (req, res) => {
  res.json({
    ok: true,
    success: true,
    data: {
      sessionId: currentSessionId,
      session: currentSessionId,
      timestamp: new Date().toISOString(),
    },
  });
});

// POST /api/v1/context/session
router.post('/session', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    currentSessionId = sessionId;
  }
  res.json({
    ok: true,
    success: true,
    data: {
      sessionId: currentSessionId,
    },
  });
});

// POST /api/v1/context/upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    id: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export default router;
