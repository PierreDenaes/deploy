import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scan, X, CheckCircle2, AlertCircle, Keyboard, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarcodeServiceV2, BarcodeResult, ProductInfo } from '../services/barcodeServiceV2';
import { cn } from '@/lib/utils';

interface InlineBarcodeScannerProps {
  onDetected: (product: ProductInfo) => void;
  onCancel: () => void;
  isActive: boolean;
}

export const InlineBarcodeScanner: React.FC<InlineBarcodeScannerProps> = ({
  onDetected,
  onCancel,
  isActive
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanningRef = useRef<(() => void) | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'processing' | 'success' | 'error' | 'manual'>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState(false);

  useEffect(() => {
    if (isActive && !isManualMode) {
      startCamera();
    } else if (!isActive) {
      cleanup();
    }

    return cleanup;
  }, [isActive, isManualMode]);

  const cleanup = () => {
    if (stopScanningRef.current) {
      stopScanningRef.current();
      stopScanningRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsScanning(false);
    setStatus('initializing');
  };

  const startCamera = async () => {
    try {
      setStatus('initializing');
      setError(null);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API non supportée par ce navigateur');
        setStatus('error');
        return;
      }

      // Request camera access with optimized mobile constraints
      let stream: MediaStream;
      try {
        // Primary config optimized for mobile barcode scanning
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 15 },
            focusMode: 'continuous',
            exposureMode: 'continuous',
            whiteBalanceMode: 'continuous'
          }
        });
      } catch (primaryError) {
        console.warn('Primary mobile camera config failed, trying high-res fallback:', primaryError);
        // High-resolution fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 }
            }
          });
        } catch (highResError) {
          console.warn('High-res fallback failed, trying standard fallback:', highResError);
          // Standard fallback for older devices
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 }
              }
            });
          } catch (fallbackError) {
            console.error('All camera configs failed:', fallbackError);
            throw fallbackError;
          }
        }
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Enhanced video load handling
        const handleVideoLoad = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Inline video playing successfully');
              setStatus('scanning');
              setIsScanning(true);
              startScanning();
            }).catch((playError) => {
              console.error('Error playing inline video:', playError);
              setError('Erreur lors du démarrage de la vidéo');
              setStatus('error');
            });
          }
        };

        videoRef.current.onloadedmetadata = handleVideoLoad;
        
        // Fallback timeout in case loadedmetadata doesn't fire
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2 && status === 'initializing') {
            console.log('Inline video ready via timeout fallback');
            handleVideoLoad();
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Impossible d\'accéder à la caméra.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Accès caméra refusé. Vérifiez les permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Caméra utilisée par une autre app.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Config caméra non supportée.';
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  };

  const startScanning = () => {
    if (!videoRef.current) {
      console.warn('Video ref not available for inline scanning');
      return;
    }

    const video = videoRef.current;
    
    // Wait for video to be ready
    const initializeScanning = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Inline video not ready, waiting...');
        setTimeout(initializeScanning, 100);
        return;
      }

      try {
        console.log('Starting inline ZXing barcode scanning with video dimensions:', video.videoWidth, 'x', video.videoHeight);
        
        if (stopScanningRef.current) {
          stopScanningRef.current();
        }

        const stopScanningFn = BarcodeServiceV2.startContinuousScanning(
          video,
          handleBarcodeDetected
        );
        
        stopScanningRef.current = stopScanningFn;

      } catch (scanError) {
        console.error('Error setting up inline ZXing scanner:', scanError);
        setError('Erreur de configuration du scanner');
        setStatus('error');
      }
    };

    // Start scanning initialization
    initializeScanning();
  };

  const handleBarcodeDetected = async (result: BarcodeResult) => {
    if (!BarcodeServiceV2.isValidBarcode(result.data)) {
      return;
    }

    // Stop scanning immediately - NO RESTART
    cleanup();
    
    setDetectedBarcode(result.data);
    setStatus('processing');
    setIsScanning(false);

    try {
      const product = await BarcodeServiceV2.lookupProduct(result.data);
      
      if (product) {
        setStatus('success');
        setTimeout(() => {
          onDetected(product);
        }, 1000);
      } else {
        setError(`Produit avec le code-barres ${result.data} non trouvé`);
        setStatus('error');
        // NO AUTO-RESTART - User must manually restart
      }
    } catch (err) {
      console.error('Error looking up product:', err);
      setError('Erreur lors de la recherche du produit');
      setStatus('error');
      // NO AUTO-RESTART - User must manually restart
    }
  };

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    
    const barcode = manualInput.trim();
    if (!BarcodeServiceV2.isValidBarcode(barcode)) {
      setError('Format de code-barres invalide (8, 12, 13 ou 14 chiffres requis)');
      return;
    }

    setDetectedBarcode(barcode);
    setStatus('processing');

    try {
      const product = await BarcodeServiceV2.lookupProduct(barcode);
      
      if (product) {
        setStatus('success');
        setTimeout(() => {
          onDetected(product);
        }, 1000);
      } else {
        setError('Produit non trouvé dans la base de données');
        setStatus('manual');
      }
    } catch (err) {
      console.error('Manual lookup error:', err);
      setError('Erreur lors de la recherche du produit');
      setStatus('manual');
    }
  };

  const switchToManualMode = () => {
    cleanup();
    setIsManualMode(true);
    setStatus('manual');
    setError(null);
  };

  const switchToScanMode = () => {
    cleanup(); // Clean any existing state
    setIsManualMode(false);
    setStatus('initializing');
    setError(null);
    setDetectedBarcode(null);
    setManualInput('');
    startCamera();
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'initializing':
        return 'Initialisation de la caméra...';
      case 'scanning':
        return 'Positionnez le code-barres dans le cadre';
      case 'processing':
        return 'Recherche du produit...';
      case 'success':
        return 'Produit trouvé !';
      case 'manual':
        return 'Saisissez le code-barres manuellement';
      case 'error':
        return error || 'Une erreur est survenue';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'initializing':
      case 'scanning':
        return <Scan className="w-5 h-5 text-primary" />;
      case 'manual':
        return <Keyboard className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50 border-t border-blue-200 rounded-t-lg"
    >
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-primary text-white">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">Scanner un code-barres</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-white hover:bg-primary/80"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Camera/Manual Input Area */}
        <div className="relative">
          {isManualMode ? (
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Ex: 5053990156009"
                  className="text-center text-lg font-mono"
                  maxLength={14}
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleManualSearch}
                    disabled={!manualInput.trim()}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Rechercher
                  </Button>
                  <Button
                    onClick={() => setManualInput('5053990156009')}
                    variant="outline"
                    size="sm"
                  >
                    Test
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video bg-black">
              {error && status === 'error' ? (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center p-4">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
                    <p className="text-sm mb-3">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        startCamera();
                      }}
                    >
                      Réessayer
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  
                  {/* Scanning overlay */}
                  {status === 'scanning' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-primary rounded-lg w-64 h-40 bg-transparent relative">
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                        
                        {/* Scanning line */}
                        <div className="absolute inset-0 overflow-hidden rounded-lg">
                          <div className="w-full h-0.5 bg-primary animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="text-white text-center">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm">Recherche en cours...</p>
                      </div>
                    </div>
                  )}

                  {status === 'success' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-75">
                      <div className="text-white text-center">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-lg font-semibold">Produit trouvé !</p>
                        {detectedBarcode && (
                          <p className="text-sm opacity-90">Code: {detectedBarcode}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Status and Controls */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-3">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getStatusMessage()}</span>
          </div>

          {detectedBarcode && (
            <div className="text-center text-sm text-gray-500 mb-3">
              Code-barres détecté: {detectedBarcode}
            </div>
          )}

          <div className="flex justify-center gap-2">
            {status === 'error' && !isManualMode ? (
              <>
                <Button
                  onClick={switchToScanMode}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Scan className="w-4 h-4" />
                  Rescanner
                </Button>
                <Button
                  onClick={switchToManualMode}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Keyboard className="w-4 h-4" />
                  Saisie manuelle
                </Button>
              </>
            ) : isManualMode ? (
              <Button
                onClick={switchToScanMode}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Scan className="w-4 h-4" />
                Retour au scan
              </Button>
            ) : status === 'scanning' ? (
              <Button
                onClick={switchToManualMode}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Keyboard className="w-4 h-4" />
                Saisie manuelle
              </Button>
            ) : null}
          </div>

          <div className="text-xs text-gray-500 text-center mt-3">
            {isManualMode 
              ? 'Codes acceptés : EAN-13, EAN-8, UPC-A, UPC-E, Code 128, QR codes'
              : 'Placez le code-barres ou QR code dans le cadre pour le scanner automatiquement'
            }
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InlineBarcodeScanner;