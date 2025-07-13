import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Mic, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// @ts-ignore
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface PressToTalkButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
  hasText?: boolean; // Si il y a du texte dans l'input
  onSend?: () => void; // Pour envoyer le texte existant
}

export const PressToTalkButton: React.FC<PressToTalkButtonProps> = ({
  onTranscript,
  disabled = false,
  hasText = false,
  onSend
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const recognitionRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const startPositionRef = useRef({ x: 0, y: 0 });
  const isPressingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef('');

  // Check for browser support
  const isSpeechSupported = useCallback(() => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }, []);

  const startRecording = useCallback(() => {
    if (!isSpeechSupported() || disabled) return;

    // Empêcher démarrage multiple
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Changé à false pour éviter auto-restart
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;
      setTranscript('');
      setInterimTranscript('');
      transcriptRef.current = ''; // Reset ref aussi

      recognition.onstart = () => {
        setIsRecording(true);
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


        // Remplace complètement au lieu d'ajouter pour éviter duplications
        if (finalTranscript) {
          setTranscript(prev => {
            const newTranscript = prev + finalTranscript;
            transcriptRef.current = newTranscript; // Sync avec la ref
            return newTranscript;
          });
        }
        setInterimTranscript(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        stopRecording();
      };

      recognition.onend = () => {
        // Ne plus redémarrer automatiquement - cause les répétitions
        setIsRecording(false);
        recognitionRef.current = null;
        
        // Déclencher handleComplete directement si on a un transcript
        if (transcriptRef.current.trim()) {
          setTimeout(() => {
            const finalTranscript = transcriptRef.current.trim();
            if (finalTranscript) {
              onTranscript(finalTranscript);
              setTranscript('');
              setInterimTranscript('');
              transcriptRef.current = '';
            }
          }, 100);
        }
      };

      recognition.start();
      
      // Timeout de sécurité de 30 secondes
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, [disabled, isSpeechSupported]);

  const stopRecording = useCallback(() => {
    // Nettoyer le timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    isPressingRef.current = false;
  }, []);

  const handleComplete = useCallback(() => {
    const finalTranscript = transcript.trim();
    if (finalTranscript) {
      onTranscript(finalTranscript);
      setTranscript(''); // Reset seulement après envoi
      setInterimTranscript('');
    }
  }, [transcript, onTranscript]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    if (hasText && onSend) {
      onSend();
      return;
    }

    e.preventDefault();
    isPressingRef.current = true;
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      startPositionRef.current = { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      };
    }
    
    startRecording();
  }, [disabled, hasText, onSend, startRecording]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isPressingRef.current) return;

    isPressingRef.current = false;
    
    if (isRecording) {
      stopRecording();
      // Attendre un peu pour que la reconnaissance se termine
      setTimeout(handleComplete, 500); // Même délai que touch
    }
    
    setIsDragging(false);
    setDragPosition({ x: 0, y: 0 });
  }, [isRecording, stopRecording, handleComplete]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPressingRef.current || !isRecording) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const deltaX = currentX - startPositionRef.current.x;
    const deltaY = currentY - startPositionRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    setDragPosition({ x: deltaX, y: deltaY });

    if (distance > 100) { // Seuil de 100px pour annuler
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  }, [isRecording]);

  const handleMouseLeave = useCallback(() => {
    if (isPressingRef.current && isRecording && isDragging) {
      // Annuler l'enregistrement si on sort en mode drag
      isPressingRef.current = false;
      stopRecording();
      setTranscript('');
      setInterimTranscript('');
      setIsDragging(false);
      setDragPosition({ x: 0, y: 0 });
    }
  }, [isRecording, isDragging, stopRecording]);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    if (hasText && onSend) {
      onSend();
      return;
    }

    e.preventDefault();
    isPressingRef.current = true;
    
    const touch = e.touches[0];
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      startPositionRef.current = { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      };
    }
    
    startRecording();
  }, [disabled, hasText, onSend, startRecording]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isPressingRef.current) return;

    isPressingRef.current = false;
    
    if (isRecording) {
      stopRecording();
      // Attendre que la reconnaissance se termine avant de traiter le transcript
      setTimeout(handleComplete, 500); // Augmenté à 500ms
    }
    
    setIsDragging(false);
    setDragPosition({ x: 0, y: 0 });
  }, [isRecording, stopRecording, handleComplete]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPressingRef.current || !isRecording) return;

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - startPositionRef.current.x;
    const deltaY = currentY - startPositionRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    setDragPosition({ x: deltaX, y: deltaY });

    if (distance > 100) {
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getButtonContent = () => {
    if (hasText) {
      return <Send className="w-5 h-5" />;
    }
    
    if (isRecording) {
      return <Mic className="w-5 h-5" />;
    }
    
    return <Mic className="w-5 h-5" />;
  };

  const getButtonColor = () => {
    if (hasText) {
      return "bg-primary hover:bg-primary/90 text-primary-foreground shadow-ios-lg";
    }
    
    if (isRecording) {
      if (isDragging) {
        return "bg-red-500 text-white shadow-lg shadow-red-500/25";
      }
      return "bg-green-500 text-white animate-pulse shadow-lg shadow-green-500/25";
    }
    
    return "bg-muted/80 hover:bg-muted text-muted-foreground active:scale-95";
  };

  return (
    <div className="relative">
      {/* Recording overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 pointer-events-none flex items-center justify-center"
            style={{ paddingBottom: '150px' }}
          >
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center" style={{ transform: 'translateY(-75px)' }}>
              <div className="flex items-center justify-center mb-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  isDragging ? "bg-red-500" : "bg-green-500"
                )}>
                  {isDragging ? (
                    <X className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
              
              {isDragging ? (
                <p className="text-red-600 font-medium">Relâchez pour annuler</p>
              ) : (
                <>
                  <p className="text-foreground font-medium mb-2">Enregistrement...</p>
                  {(transcript || interimTranscript) && (
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {transcript}
                      <span className="text-muted-foreground/70 italic">{interimTranscript}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Glissez vers le haut pour annuler</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button - iOS Style */}
      <motion.button
        ref={buttonRef}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
          "active:scale-95 select-none",
          getButtonColor(),
          disabled && "opacity-50 cursor-not-allowed"
        )}
        disabled={disabled}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        animate={{
          x: dragPosition.x * 0.1, // Légère réaction au drag
          y: dragPosition.y * 0.1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {getButtonContent()}
      </motion.button>

      {/* Instruction tooltip */}
      {!hasText && !isRecording && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-border shadow-ios">
          Maintenez pour parler
        </div>
      )}
    </div>
  );
};

export default PressToTalkButton;