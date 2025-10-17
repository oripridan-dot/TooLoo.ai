import React, { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { View } from 'react-native';
import { requestMicrophonePermissions } from '../../utils/permissions';

const MicrophoneInput = ({ onAudioCaptured }) => {
  const recording = useRef(null);

  const startRecording = async () => {
    const { status } = await requestMicrophonePermissions();
    if (status === 'granted') {
      recording.current = new Audio.Recording();
      await recording.current.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.current.startAsync();
    }
  };

  const stopRecording = async () => {
    if (recording.current) {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      onAudioCaptured(uri);
      recording.current = null;
    }
  };

  useEffect(() => {
    startRecording();

    return () => {
      stopRecording();
    };
  }, []);

  return (
    <View />
  );
};

export default MicrophoneInput;