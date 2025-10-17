import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { RNCamera } from 'react-native-camera';

const CameraView = ({ onCapture }) => {
  const cameraRef = useRef(null);

  const handleCapture = async () => {
    if (cameraRef.current) {
      const options = { quality: RNCamera.Constants.VideoQuality['480p'], base64: true };
      const data = await cameraRef.current.recordAsync(options);
      onCapture(data.uri);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stopRecording();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <RNCamera
        ref={cameraRef}
        style={styles.preview}
        type={RNCamera.Constants.Type.back}
        flashMode={RNCamera.Constants.FlashMode.off}
        onCameraReady={handleCapture}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});

export default CameraView;