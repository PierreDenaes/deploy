import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Square, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AnalysisResultCard from './AnalysisResultCard';
import { UnifiedAnalysisResult } from '@/hooks/useAnalyzeMeal';
import { VoiceState } from './BaseVoiceInput';
import { cn } from '@/lib/utils';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: VoiceState;
  transcript: string;
  interimTranscript: string;
  recordingTime: number;
  analysisResult: UnifiedAnalysisResult | null;
  onStop: () => void;
  onReset: () => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  state,
  transcript,
  interimTranscript,
  recordingTime,
  analysisResult,
  onStop,
  onReset
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateConfig = (currentState: VoiceState) => {
    switch (currentState) {
      case 'idle':
        return {
          title: 'Voice Input Ready',
          icon: <Mic className="h-8 w-8 text-blue-500" />,
          color: 'text-blue-500',
          description: 'Ready to start recording your meal description'
        };
      case 'recording':
        return {
          title: 'Recording in Progress',
          icon: (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Mic className="h-8 w-8 text-red-500" />
            </motion.div>
          ),
          color: 'text-red-500',
          description: 'Speak clearly about your meal...'
        };
      case 'analyzing':
        return {
          title: 'Analyzing Your Meal',
          icon: (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Mic className="h-8 w-8 text-yellow-500" />
            </motion.div>
          ),
          color: 'text-yellow-500',
          description: 'Processing speech and estimating nutrition...'
        };
      case 'done':
        return {
          title: 'Analysis Complete',
          icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
          color: 'text-green-500',
          description: 'Your meal analysis is ready!'
        };
      case 'error':
        return {
          title: 'Recording Error',
          icon: <AlertCircle className="h-8 w-8 text-red-500" />,
          color: 'text-red-500',
          description: 'Something went wrong. Please try again.'
        };
      default:
        return {
          title: 'Voice Input',
          icon: <Mic className="h-8 w-8 text-gray-500" />,
          color: 'text-gray-500',
          description: ''
        };
    }
  };

  const stateConfig = getStateConfig(state);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {stateConfig.icon}
              <span className={cn("text-lg", stateConfig.color)}>
                {stateConfig.title}
              </span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Description */}
          <p className="text-sm text-muted-foreground text-center">
            {stateConfig.description}
          </p>

          {/* Recording Timer */}
          {state === 'recording' && (
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              <span className="text-lg font-mono text-red-500">
                {formatTime(recordingTime)}
              </span>
              <Badge variant="destructive" className="animate-pulse">
                REC
              </Badge>
            </div>
          )}

          {/* Transcript Display */}
          <AnimatePresence>
            {(transcript || interimTranscript) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Live Transcript</span>
                      </div>
                      <div className="min-h-[80px] max-h-[150px] overflow-y-auto">
                        <p className="text-sm leading-relaxed">
                          {transcript && (
                            <span className="text-foreground">{transcript}</span>
                          )}
                          {interimTranscript && (
                            <span className="text-muted-foreground italic bg-muted/50 px-1 rounded ml-1">
                              {interimTranscript}
                            </span>
                          )}
                          {!transcript && !interimTranscript && state === 'recording' && (
                            <span className="text-muted-foreground italic">
                              Start speaking to see your words appear here...
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis Result */}
          <AnimatePresence>
            {analysisResult && state === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AnalysisResultCard result={analysisResult} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Control Buttons */}
          <div className="flex gap-3 justify-center">
            {state === 'recording' && (
              <Button
                onClick={onStop}
                variant="destructive"
                size="lg"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}

            {(state === 'done' || state === 'error') && (
              <div className="flex gap-2">
                <Button
                  onClick={onReset}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Record Again
                </Button>
                <Button
                  onClick={onClose}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </Button>
              </div>
            )}

            {state === 'analyzing' && (
              <div className="flex items-center gap-2 justify-center py-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full"
                />
                <span className="text-sm text-muted-foreground">
                  Analyzing your meal description...
                </span>
              </div>
            )}
          </div>

          {/* Voice Tips */}
          {state === 'idle' && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-2">Voice Input Tips:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Speak clearly and at a normal pace</li>
                  <li>• Mention specific foods: "grilled chicken breast"</li>
                  <li>• Include cooking methods: "baked salmon"</li>
                  <li>• Describe portions: "large portion" or "two eggs"</li>
                  <li>• Add context: "chicken salad with avocado"</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceModal;