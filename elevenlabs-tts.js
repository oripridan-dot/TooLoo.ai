// ElevenLabs TTS Integration for TooLoo.ai
class ElevenLabsTTS {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        
        // Premium voice selection - these are the actual good ones
        this.voices = {
            'rachel': '21m00Tcm4TlvDq8ikWAM',    // Natural, expressive female
            'josh': '29vD33N1CtxCmqQRPOHJ',      // Professional, clear male  
            'bella': 'EXAVITQu4vr4xnSDxMaL',     // Warm, friendly female
            'antoni': 'ErXwobaYiN019PkySvjV',    // Smooth, engaging male
            'elli': 'MF3mGyEYCl7XYWbV9V6O',     // Young, energetic female
            'arnold': 'VR6AewLTigWG4xSOukaG',   // Authoritative male
            'adam': 'pNInz6obpgDQGcFmaJgB',     // Deep, resonant male
            'sam': 'yoZ06aMxZJJ28mfd3POQ',      // Confident, professional male
            'jessica': 'cgSgspJ2msm6clMCkdW9'   // Playful, assertive American female
        };

        // Set Jessica as the new default voice for TooLoo's persona
        this.defaultVoice = 'jessica';
        this.defaultSettings = {
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
                style: 0.5,
                use_speaker_boost: true
            }
        };
    }
    
    async speak(text, voiceName = null, settings = null) {
        try {
            const voice = voiceName || this.defaultVoice;
            const voiceId = this.voices[voice] || this.voices[this.defaultVoice];
            
            const requestData = {
                text: text,
                model_id: settings?.model_id || this.defaultSettings.model_id,
                voice_settings: {
                    ...this.defaultSettings.voice_settings,
                    ...(settings?.voice_settings || {})
                }
            };
            
            const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
            }
            
            const audioBuffer = await response.arrayBuffer();
            return this.playAudio(audioBuffer);
            
        } catch (error) {
            console.error('ElevenLabs TTS Error:', error);
            throw error;
        }
    }
    
    async playAudio(audioBuffer) {
        return new Promise((resolve, reject) => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                audioContext.decodeAudioData(audioBuffer)
                    .then(audioBuffer => {
                        const source = audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioContext.destination);
                        
                        source.onended = () => resolve();
                        source.start(0);
                    })
                    .catch(reject);
                    
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async getVoices() {
        try {
            const response = await fetch(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching voices:', error);
            return null;
        }
    }
    
    // Quick test method
    async test(voiceName = 'rachel') {
        const testText = "Hello! This is ElevenLabs premium voice synthesis. The quality difference should be immediately obvious compared to browser voices.";
        await this.speak(testText, voiceName);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElevenLabsTTS;
}