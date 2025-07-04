import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import VoiceModal from './VoiceModal';
import AnalysisResultCard from './AnalysisResultCard';
import { useAnalyzeMeal, UnifiedAnalysisResult } from '@/hooks/useAnalyzeMeal';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export type VoiceInputVariant = 'simple' | 'enhanced';

export type VoiceState = 'idle' | 'recording' | 'analyzing' | 'done' | 'error';

interface BaseVoiceInputProps {
  variant?: VoiceInputVariant;
  onResult?: (result: UnifiedAnalysisResult) => void;
  onTranscript?: (transcript: string) => void;
  className?: string;
  placeholder?: string;
  autoAnalyze?: boolean;
  showModal?: boolean;
}

export const BaseVoiceInput: React.FC<BaseVoiceInputProps> = ({
  variant = 'enhanced',
  onResult,
  onTranscript,
  className,
  placeholder = "Click to start recording...",
  autoAnalyze = true,
  showModal = true
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const { analyzeVoice, isAnalyzing, result: analysisResult, error: analysisError } = useAnalyzeMeal();
  const { state, setAnalysisResult } = useAppContext();

  // Check for browser speech recognition support
  const isSpeechRecognitionSupported = useCallback(() => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }, []);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setError('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = variant === 'enhanced';
    recognition.interimResults = true;
    recognition.lang = 'fr-FR'; // Support for French
    recognition.maxAlternatives = 1;

    return recognition;
  }, [variant, isSpeechRecognitionSupported]);

  // Start recording timer
  const startTimer = useCallback(() => {
    recordingStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (recordingStartTimeRef.current) {
        setRecordingTime(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  // Stop recording timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recordingStartTimeRef.current = null;
    setRecordingTime(0);
  }, []);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      
      const recognition = initializeSpeechRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      
      recognition.onstart = () => {
        setVoiceState('recording');
        startTimer();
        if (showModal) setIsModalOpen(true);
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
          onTranscript?.(finalTranscript);
        }
        setInterimTranscript(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        let errorMessage = 'Speech recognition failed. ';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage += 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage += 'Microphone access denied or unavailable.';
            break;
          case 'not-allowed':
            errorMessage += 'Microphone permission denied.';
            break;
          case 'network':
            errorMessage += 'Network error occurred.';
            break;
          default:
            errorMessage += 'Please check your microphone and try again.';
        }
        
        setError(errorMessage);
        setVoiceState('error');
        stopTimer();
      };

      recognition.onend = () => {
        if (voiceState === 'recording') {
          stopTimer();
          
          if (transcript.trim() && autoAnalyze) {
            handleAnalysis(transcript);
          } else if (transcript.trim()) {
            setVoiceState('done');
          } else {
            setVoiceState('idle');
          }
        }
      };

      recognition.start();
      
    } catch (error) {
      setError('Failed to start voice recording. Please check your microphone permissions.');
      setVoiceState('error');
    }
  }, [variant, autoAnalyze, transcript, voiceState, showModal, initializeSpeechRecognition, startTimer, stopTimer, onTranscript]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopTimer();
  }, [stopTimer]);

  // Handle analysis
  const handleAnalysis = useCallback(async (transcriptToAnalyze: string) => {
    if (!transcriptToAnalyze.trim()) return;

    setVoiceState('analyzing');
    
    try {
      const result = await analyzeVoice(transcriptToAnalyze);
      if (result) {
        setAnalysisResult(result);
        onResult?.(result);
        setVoiceState('done');
      } else {
        setVoiceState('error');
      }
    } catch (error) {
      setVoiceState('error');
    }
  }, [analyzeVoice, onResult, setAnalysisResult]);

  // Reset to initial state
  const resetVoiceInput = useCallback(() => {
    setVoiceState('idle');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setRecordingTime(0);
    stopTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [stopTimer]);

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle button click
  const handleButtonClick = useCallback(() => {
    switch (voiceState) {
      case 'idle':
      case 'done':
      case 'error':
        startRecording();
        break;
      case 'recording':
        stopRecording();
        break;
      default:
        break;
    }
  }, [voiceState, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [stopTimer]);

  // Use existing analysis result if available
  const displayResult = state.analysisResult || analysisResult;

  // Render simple variant
  if (variant === 'simple') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleButtonClick}
            disabled={voiceState === 'analyzing' || isAnalyzing}
            variant={voiceState === 'recording' ? 'destructive' : 'default'}
            size="sm"
            className="flex items-center gap-2"
          >
            {voiceState === 'recording' ? (
              <>
                <Square className="h-4 w-4" />
                Stop ({formatTime(recordingTime)})
              </>
            ) : voiceState === 'analyzing' || isAnalyzing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Mic className="h-4 w-4" />
                </motion.div>
                Analyzing...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Record
              </>
            )}
          </Button>

          {voiceState === 'recording' && (
            <Badge variant="destructive" className="animate-pulse">
              Recording
            </Badge>
          )}
        </div>

        {/* Transcript Display */}
        {(transcript || interimTranscript) && (
          <Card>
            <CardContent className="p-3">
              <p className="text-sm">
                {transcript}
                {interimTranscript && (
                  <span className="text-muted-foreground italic">
                    {interimTranscript}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {(error || analysisError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || analysisError}</AlertDescription>
          </Alert>
        )}

        {/* Analysis Result */}
        {displayResult && (
          <AnalysisResultCard result={displayResult} />
        )}
      </div>
    );
  }

  // Render enhanced variant
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleButtonClick}
          disabled={voiceState === 'analyzing' || isAnalyzing}
          variant={voiceState === 'recording' ? 'destructive' : 'default'}
          size="lg"
          className="flex items-center gap-2 min-w-[120px]"
        >
          {voiceState === 'recording' ? (
            <>
              <Square className="h-5 w-5" />
              Stop
            </>
          ) : voiceState === 'analyzing' || isAnalyzing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Mic className="h-5 w-5" />
              </motion.div>
              Analyzing
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              Start Recording
            </>
          )}
        </Button>

        {voiceState === 'recording' && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="animate-pulse">
              Recording
            </Badge>
            <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
          </div>
        )}

        {voiceState === 'done' && displayResult && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">Analysis Complete</span>
          </div>
        )}
      </div>

      {/* Enhanced Transcript Display */}
      <AnimatePresence>
        {(transcript || interimTranscript) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Transcript</span>
                  </div>
                  <p className="text-sm leading-relaxed">
                    {transcript}
                    {interimTranscript && (
                      <span className="text-muted-foreground italic bg-muted/50 px-1 rounded">
                        {interimTranscript}
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {(error || analysisError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || analysisError}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Result */}
      <AnimatePresence>
        {displayResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AnalysisResultCard 
              result={displayResult} 
              isRealtime={voiceState === 'recording'} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Modal */}
      {showModal && (
        <VoiceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          state={voiceState}
          transcript={transcript}
          interimTranscript={interimTranscript}
          recordingTime={recordingTime}
          analysisResult={displayResult}
          onStop={stopRecording}
          onReset={resetVoiceInput}
        />
      )}
    </div>
  );
};

export default BaseVoiceInput;