import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const ASSETS_DIR = path.join(process.cwd(), 'data', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });

// Upload Asset
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    id: req.file.filename,
    url: `/api/v1/assets/${req.file.filename}`,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

// Serve Asset
router.get('/:filename', (req, res) => {
  const filePath = path.join(ASSETS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Asset not found' });
  }
});

// Process Asset (Crop, Resize, Enhance)
router.post('/process', async (req, res) => {
  const { id, operations } = req.body;

  if (!id || !operations || !Array.isArray(operations)) {
    return res.status(400).json({
      error: "Invalid request. 'id' and 'operations' array required.",
    });
  }

  const inputPath = path.join(ASSETS_DIR, id);
  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  try {
    let pipeline = sharp(inputPath);

    for (const op of operations) {
      if (op.type === 'resize') {
        pipeline = pipeline.resize(op.width, op.height, {
          fit: op.fit || 'cover',
        });
      } else if (op.type === 'crop') {
        pipeline = pipeline.extract({
          left: op.left,
          top: op.top,
          width: op.width,
          height: op.height,
        });
      } else if (op.type === 'grayscale') {
        pipeline = pipeline.grayscale();
      } else if (op.type === 'blur') {
        pipeline = pipeline.blur(op.sigma);
      } else if (op.type === 'enhance') {
        // Simple enhancement: modulate brightness/saturation
        pipeline = pipeline.modulate({ brightness: 1.1, saturation: 1.2 });
      }
    }

    const newFilename = `processed-${uuidv4()}.png`;
    const outputPath = path.join(ASSETS_DIR, newFilename);

    await pipeline.toFile(outputPath);

    res.json({
      id: newFilename,
      url: `/api/v1/assets/${newFilename}`,
      original: id,
    });
  } catch (error: any) {
    console.error('Asset processing error:', error);
    res.status(500).json({ error: 'Processing failed', details: error.message });
  }
});

export default router;
