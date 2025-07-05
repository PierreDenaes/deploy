import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCw, CameraOff, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { FileUploadFallback } from './FileUploadFallback';

interface CameraInterfaceProps {
  onCapture: (imageSrc: string) => void;
}

export const CameraInterface = ({ onCapture }: CameraInterfaceProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const { state, dispatch } = useAppContext();
  
  // Check camera permissions
  const checkCameraPermission = useCallback(async () => {
    if (!navigator.permissions) {
      setPermissionStatus('unknown');
      return;
    }
    
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionStatus(permission.state);
      
      // Listen for permission changes
      permission.addEventListener('change', () => {
        setPermissionStatus(permission.state);
      });
    } catch (err) {
      setPermissionStatus('unknown');
    }
  }, []);

  // Check if camera is supported
  const isCameraSupported = useCallback(() => {
    // Check for modern MediaDevices API (all modern browsers)
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      return true;
    }
    
    // Check for legacy getUserMedia (older browsers)
    const getUserMedia = (navigator as any).getUserMedia || 
                        (navigator as any).webkitGetUserMedia || 
                        (navigator as any).mozGetUserMedia || 
                        (navigator as any).msGetUserMedia;
    
    return !!getUserMedia;
  }, []);

  // Initialize camera stream
  const initializeCamera = useCallback(async () => {
    // Check if camera is supported
    if (!isCameraSupported()) {
      setError("L'API caméra n'est pas prise en charge par votre navigateur. Veuillez utiliser un navigateur moderne comme Chrome, Firefox, Safari ou Edge.");
      dispatch({ 
        type: 'SET_CAMERA_STATE', 
        payload: { isActive: false, hasPermission: false }
      });
      return;
    }
    
    // Check if running in secure context (HTTPS or localhost)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setError("L'accès à la caméra nécessite une connexion sécurisée (HTTPS). Veuillez utiliser une connexion sécurisée.");
      dispatch({ 
        type: 'SET_CAMERA_STATE', 
        payload: { isActive: false, hasPermission: false }
      });
      return;
    }
    
    // Check permissions first
    await checkCameraPermission();
    
    try {
      // Try with optimal constraints first
      let constraints = {
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      };
      
      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstError) {
        // Fallback to basic constraints if advanced fail
        console.warn('Advanced constraints failed, trying basic constraints:', firstError);
        const fallbackConstraints: MediaStreamConstraints = { video: true };
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        setPermissionStatus('granted');
        dispatch({ 
          type: 'SET_CAMERA_STATE', 
          payload: { isActive: true, hasPermission: true }
        });
        setError(null);
      }
    } catch (err: unknown) {
      setIsStreaming(false);
      
      let errorMessage = 'Camera access failed';
      const error = err as { name?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permission caméra refusée. Veuillez activer l\'accès à la caméra dans les paramètres de votre navigateur.';
        setPermissionStatus('denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Aucune caméra trouvée sur cet appareil.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'La caméra est utilisée par une autre application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Les contraintes de la caméra n\'ont pas pu être satisfaites.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Accès à la caméra bloqué en raison de restrictions de sécurité.';
      }
      
      setError(errorMessage);
      dispatch({ 
        type: 'SET_CAMERA_STATE', 
        payload: { isActive: false, hasPermission: permissionStatus === 'granted' }
      });
    }
  }, [dispatch, checkCameraPermission, permissionStatus, isCameraSupported]);
  
  // Clean up on unmount
  useEffect(() => {
    initializeCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        setIsStreaming(false);
        dispatch({ 
          type: 'SET_CAMERA_STATE', 
          payload: { isActive: false }
        });
      }
    };
  }, [initializeCamera, dispatch]);
  
  // Handle video metadata loaded
  const handleVideoMetadata = () => {
    setIsStreaming(true);
  };
  
  // Capture photo from video stream
  const capturePhoto = () => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) {
      toast.error('Caméra non prête. Veuillez patienter ou réessayer.');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw overlay grid for alignment
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL and pass to parent
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        // Validate the captured image
        if (imageDataUrl && imageDataUrl !== 'data:,') {
          onCapture(imageDataUrl);
          toast.success('Photo capturée avec succès !');
        } else {
          throw new Error('Échec de la capture de l\'image');
        }
        
        // Stop the stream after capture
        const tracks = (video.srcObject as MediaStream)?.getTracks();
        tracks?.forEach(track => track.stop());
        
        setIsStreaming(false);
        dispatch({ 
          type: 'SET_CAMERA_STATE', 
          payload: { isActive: false }
        });
      }
    } catch (error) {
      toast.error('Échec de la capture de la photo. Veuillez réessayer.');
    }
  };
  
  // Retry camera initialization
  const handleRetry = () => {
    setError(null);
    setShowFileUpload(false);
    initializeCamera();
  };

  // Handle file upload fallback
  const handleFileUpload = useCallback(() => {
    setShowFileUpload(true);
  }, []);

  // Handle file selection from upload
  const handleFileSelect = useCallback((file: File) => {
    // File is already processed by FileUploadFallback
    console.log('File selected:', file.name);
  }, []);

  // Handle image capture from upload
  const handleImageFromUpload = useCallback((imageSrc: string) => {
    onCapture(imageSrc);
  }, [onCapture]);
  
  // Render alignment grid overlay
  const renderAlignmentGrid = () => (
    <div className="absolute inset-0 pointer-events-none">
      <div className="h-full w-full grid grid-cols-3 grid-rows-3">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="border border-white/20" />
        ))}
      </div>
    </div>
  );
  
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
        <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg mb-2">Accès à la caméra requis</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        
        {permissionStatus === 'denied' && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm">
            <p className="text-orange-800 dark:text-orange-200">
              <strong>Pour activer l'accès à la caméra :</strong>
            </p>
            <ul className="text-left mt-2 text-orange-700 dark:text-orange-300">
              <li>• Cliquez sur l'icône caméra dans la barre d'adresse de votre navigateur</li>
              <li>• Sélectionnez "Autoriser" pour les permissions caméra</li>
              <li>• Rafraîchissez la page si besoin</li>
            </ul>
          </div>
        )}
        
        {error?.includes('pas prise en charge') && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>Caméra non prise en charge :</strong>
            </p>
            <ul className="text-left mt-2 text-blue-700 dark:text-blue-300">
              <li>• Utilisez un navigateur moderne (Chrome, Firefox, Safari, Edge)</li>
              <li>• Activez l'accès à la caméra dans les paramètres du navigateur</li>
              <li>• Essayez d'utiliser l'option de téléchargement de photo</li>
            </ul>
          </div>
        )}
        
        {error?.includes('HTTPS') && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
            <p className="text-red-800 dark:text-red-200">
              <strong>Connexion sécurisée requise :</strong>
            </p>
            <ul className="text-left mt-2 text-red-700 dark:text-red-300">
              <li>• L'accès à la caméra nécessite HTTPS</li>
              <li>• Contactez votre administrateur pour la configuration SSL</li>
              <li>• Utilisez l'option de téléchargement de photo en alternative</li>
            </ul>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleRetry} variant={permissionStatus === 'denied' ? 'outline' : 'default'}>
            <RotateCw className="mr-2 h-4 w-4" />
            {permissionStatus === 'denied' ? 'Vérifier les permissions' : 'Réessayer'}
          </Button>
          
          <Button onClick={handleFileUpload} variant="secondary">
            <Upload className="mr-2 h-4 w-4" />
            Télécharger une photo à la place
          </Button>
        </div>
      </div>
    );
  }

  // Show file upload fallback
  if (showFileUpload) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Télécharger une photo</h3>
          <Button
            onClick={() => setShowFileUpload(false)}
            variant="ghost"
            size="sm"
          >
            Retour à la caméra
          </Button>
        </div>
        
        <FileUploadFallback
          onFileSelect={handleFileSelect}
          onImageCapture={handleImageFromUpload}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Video preview */}
      <div className="relative bg-black">
        <video 
          ref={videoRef}
          className="w-full h-auto max-h-[70vh]"
          autoPlay 
          playsInline
          muted
          onLoadedMetadata={handleVideoMetadata}
        />
        
        {/* Alignment grid */}
        {isStreaming && renderAlignmentGrid()}
        
        {/* Loading indicator */}
        <AnimatePresence>
          {!isStreaming && !error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-4"
              >
                <RotateCw className="h-10 w-10 text-white" />
              </motion.div>
              <p className="text-white text-sm font-medium">Initialisation de la caméra...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Capture button */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-0 right-0 flex justify-center"
          >
            <motion.button
              className="bg-white hover:bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center shadow-xl border-4 border-primary transition-colors"
              onClick={capturePhoto}
              disabled={!isStreaming}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              <Camera className="h-10 w-10 text-primary" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Usage info */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 right-4"
      >
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 text-xs text-white">
          <span className="font-medium">
            AI Credits: {state.ai.usageLimit - state.ai.usageToday}/{state.ai.usageLimit}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default CameraInterface;