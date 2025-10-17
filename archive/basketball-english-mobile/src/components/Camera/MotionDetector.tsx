import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { RNCamera } from 'react-native-camera';
import GestureDetection from '../../services/camera/GestureDetection';

const MotionDetector = () => {
  const cameraRef = useRef(null);
  const gestureDetector = new GestureDetection();

  useEffect(() => {
    const startDetection = async () => {
      if (cameraRef.current) {
        const options = { quality: RNCamera.Constants.VideoQuality['480p'], base64: true };
        const data = await cameraRef.current.recordAsync(options);
        gestureDetector.analyze(data);
      }
    };

    const interval = setInterval(startDetection, 1000); // Analyze every second

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <RNCamera
        ref={cameraRef}
        style={{ flex: 1 }}
        type={RNCamera.Constants.Type.back}
        captureAudio={false}
      />
    </View>
  );
};

export default MotionDetector;