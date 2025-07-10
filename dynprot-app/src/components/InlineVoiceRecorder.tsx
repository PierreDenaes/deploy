import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Play, Pause, X, Check, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// @ts-ignore
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface InlineVoiceRecorderProps {
  onRecordingComplete: (transcript: string) => void;
  onCancel: () => void;
  isActive: boolean;
}

export const InlineVoiceRecorder: React.FC<InlineVoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  isActive
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));

  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isActive) {
      stopRecording();
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      cleanup();
    };
  }, [isActive]);

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      // Check for browser support
      if (!SpeechRecognition) {
        setError('La reconnaissance vocale n\'est pas supportée par votre navigateur');
        return;
      }

      // Get audio stream for visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analysis for visual feedback
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        
        // Start timer
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        // Start audio level animation
        updateAudioLevels();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
        setInterimTranscript(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        let errorMessage = 'Erreur de reconnaissance vocale. ';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage += 'Aucune parole détectée.';
            break;
          case 'audio-capture':
            errorMessage += 'Microphone non accessible.';
            break;
          case 'not-allowed':
            errorMessage += 'Permission microphone refusée.';
            break;
          case 'network':
            errorMessage += 'Erreur réseau.';
            break;
          default:
            errorMessage += 'Vérifiez votre microphone.';
        }
        
        setError(errorMessage);
        setIsRecording(false);
        cleanup();
      };

      recognition.onend = () => {
        setIsRecording(false);
        cleanup();
      };

      recognition.start();

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    cleanup();
  };

  const updateAudioLevels = () => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    
    setAudioLevels(prev => {
      const newLevels = [...prev.slice(1), normalizedLevel];
      return newLevels;
    });

    animationRef.current = requestAnimationFrame(updateAudioLevels);
  };

  const handleConfirm = () => {
    if (!transcript.trim()) {
      setError('Aucune transcription disponible');
      return;
    }
    onRecordingComplete(transcript);
  };

  const resetRecording = () => {
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    stopRecording();
    deleteRecording();
    onCancel();
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 border-t border-green-200 rounded-t-lg"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
            )} />
            <span className="font-medium text-gray-800">
              {isRecording ? 'Enregistrement...' : transcript ? 'Transcription terminée' : 'Enregistrement vocal'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-gray-600 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Audio Visualizer */}
        <div className="mb-4">
          <div className="flex items-end justify-center gap-1 h-16 bg-white rounded-lg p-2">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 rounded-full transition-all duration-100",
                  isRecording ? "bg-gradient-to-t from-green-400 to-green-600" : "bg-gray-300"
                )}
                style={{
                  height: `${Math.max(4, level * 48)}px`
                }}
              />
            ))}
          </div>
        </div>

        {/* Transcript Display */}
        {(transcript || interimTranscript) && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Transcription :</div>
            <div className="text-gray-800">
              {transcript}
              {interimTranscript && (
                <span className="text-gray-500 italic">
                  {interimTranscript}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Timer */}
        {(isRecording || transcript) && (
          <div className="text-center mb-4">
            <span className="text-2xl font-mono font-bold text-gray-800">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!transcript ? (
            // Recording controls
            <>
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={!!error}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <Mic className="w-6 h-6" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-900 text-white"
                >
                  <Square className="w-6 h-6" />
                </Button>
              )}
            </>
          ) : (
            // Transcript controls
            <>
              <Button
                variant="outline"
                onClick={resetRecording}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Recommencer
              </Button>
              
              <Button
                onClick={handleConfirm}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
              >
                <Check className="w-4 h-4" />
                Utiliser cette transcription
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center mt-4 text-sm text-gray-600">
          {!transcript ? (
            isRecording ? 
              "Parlez maintenant, cliquez sur ⏹ pour arrêter" :
              "Cliquez sur le micro pour commencer l'enregistrement"
          ) : (
            "Vérifiez la transcription et confirmez pour continuer"
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InlineVoiceRecorder;