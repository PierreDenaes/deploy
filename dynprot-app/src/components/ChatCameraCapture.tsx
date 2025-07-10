import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { CameraInterface } from './CameraInterface';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatCameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onCancel: () => void;
  className?: string;
}

export const ChatCameraCapture: React.FC<ChatCameraCaptureProps> = ({
  onCapture,
  onCancel,
  className
}) => {
  const handleCapture = useCallback((imageSrc: string) => {
    // Valider que l'image n'est pas vide
    if (imageSrc && imageSrc.length > 0) {
      onCapture(imageSrc);
    }
  }, [onCapture]);

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
            Prenez une photo de votre repas
          </h3>
        </div>
      </div>

      {/* Camera interface */}
      <div className="p-4">
        <div className="mb-4 text-sm text-gray-600 text-center">
          Positionnez votre repas dans le cadre et appuyez sur le bouton pour capturer
        </div>
        
        <CameraInterface onCapture={handleCapture} />
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>Conseils pour une bonne photo :</strong></p>
          <ul className="ml-4 space-y-1">
            <li>• Éclairage naturel de préférence</li>
            <li>• Photo de dessus ou légèrement en angle</li>
            <li>• Repas bien visible et net</li>
            <li>• Évitez les ombres trop marquées</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatCameraCapture;