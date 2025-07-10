import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { BaseVoiceInput } from './BaseVoiceInput';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatVoiceCaptureProps {
  onTranscript: (transcript: string) => void;
  onCancel: () => void;
  className?: string;
}

export const ChatVoiceCapture: React.FC<ChatVoiceCaptureProps> = ({
  onTranscript,
  onCancel,
  className
}) => {
  const [isRecording, setIsRecording] = useState(false);

  const handleTranscript = useCallback((transcript: string) => {
    if (transcript && transcript.trim().length > 0) {
      onTranscript(transcript.trim());
    }
  }, [onTranscript]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn("bg-white", className)}
    >
      {/* Header with cancel button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-medium text-gray-900">
            Décrivez votre repas à la voix
          </h3>
        </div>
      </div>

      {/* Voice interface */}
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all",
              isRecording 
                ? "bg-red-100 border-2 border-red-300 animate-pulse" 
                : "bg-green-100 border-2 border-green-300"
            )}>
              <Mic className={cn(
                "w-8 h-8",
                isRecording ? "text-red-500" : "text-green-500"
              )} />
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            {isRecording 
              ? "🎤 Enregistrement en cours... Parlez maintenant"
              : "Cliquez sur le microphone pour commencer"
            }
          </p>
        </div>

        <BaseVoiceInput
          variant="simple"
          onTranscript={handleTranscript}
          autoAnalyze={false}
          showModal={false}
          placeholder="Appuyez pour enregistrer votre description..."
          className="w-full"
        />
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>Conseils pour un bon enregistrement :</strong></p>
          <ul className="ml-4 space-y-1">
            <li>• Parlez clairement et à un rythme normal</li>
            <li>• Décrivez les ingrédients principaux</li>
            <li>• Mentionnez la quantité si vous la connaissez</li>
            <li>• Évitez les bruits de fond</li>
          </ul>
          
          <div className="mt-3 p-2 bg-blue-50 rounded text-blue-700">
            <p className="font-medium text-xs">Exemples :</p>
            <p className="text-xs">"Pâtes au poulet avec des légumes, environ 150 grammes"</p>
            <p className="text-xs">"Salade césar avec croûtons, une portion normale"</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatVoiceCapture;