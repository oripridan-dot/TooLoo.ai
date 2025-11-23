// @version 2.1.11
/**
 * ScreenCaptureService - UI screenshot and OCR capture (stub)
 * Placeholder for Phase 11+ implementation
 */

export class ScreenCaptureService {
  constructor(config = {}) {
    this.config = config;
    this.frames = [];
    this.captureIntervalMs = config.captureIntervalMs || 3000;
    this.maxFrames = config.maxFrames || 50;
    this.enableOCR = config.enableOCR !== false;
    this.enableTagging = config.enableTagging !== false;
  }

  async startCapture() {
    return { ok: true, status: 'capturing', maxFrames: this.maxFrames };
  }

  async stopCapture() {
    return { ok: true, status: 'stopped', framesCaptured: this.frames.length };
  }

  async getFrames() {
    return { ok: true, frames: this.frames, count: this.frames.length };
  }

  async captureFrame() {
    return { ok: true, frame: null, timestamp: new Date().toISOString() };
  }

  getStatus() {
    return {
      service: 'screen-capture',
      frames: this.frames.length,
      enabled: true,
      ocrEnabled: this.enableOCR,
      taggingEnabled: this.enableTagging
    };
  }
}

export default ScreenCaptureService;
