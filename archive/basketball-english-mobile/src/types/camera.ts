export interface CameraSettings {
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  facingMode: 'user' | 'environment';
}

export interface CameraStream {
  id: string;
  settings: CameraSettings;
  active: boolean;
}

export interface MotionDetectionResult {
  detected: boolean;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Gesture {
  type: string;
  confidence: number;
  timestamp: number;
}