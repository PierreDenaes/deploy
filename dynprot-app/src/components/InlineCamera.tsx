import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineCameraProps {
  onCapture: (imageSrc: string) => void;
  onCancel: () => void;
  isActive: boolean;
}

export const InlineCamera: React.FC<InlineCameraProps> = ({
  onCapture,
  onCancel,
  isActive
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isActive && !capturedImage) {
      startCamera();
    } else if (!isActive) {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive, capturedImage]);

  const startCamera = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsInitializing(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Impossible d\'accéder à la caméra');
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0);
      const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageSrc);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleCancel = () => {
    setCapturedImage(null);
    stopCamera();
    onCancel();
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden bg-gray-900 rounded-t-lg"
    >
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            <span className="font-medium">
              {capturedImage ? 'Photo capturée' : 'Prendre une photo'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-white hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Camera/Preview Area */}
        <div className="relative aspect-video bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="mt-2"
                >
                  Réessayer
                </Button>
              </div>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm">Initialisation...</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-4 bg-gray-800">
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={handleRetake}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reprendre
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
              >
                <Check className="w-4 h-4" />
                Utiliser cette photo
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCapture}
              disabled={isInitializing || !!error}
              className={cn(
                "w-16 h-16 rounded-full bg-white hover:bg-gray-100 text-gray-900",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Camera className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InlineCamera;