import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Zap, AlertCircle, CheckCircle2, Keyboard } from 'lucide-react';
import { BarcodeServiceV2, BarcodeResult, ProductInfo } from '../services/barcodeServiceV2';

interface BarcodeScannerProps {
  onDetected: (product: ProductInfo) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onClose,
  isOpen
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanningRef = useRef<(() => void) | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'processing' | 'success' | 'error' | 'manual'>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

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

      // Request camera access with fallback constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        });
      } catch (primaryError) {
        console.warn('Primary camera config failed, trying fallback:', primaryError);
        // Fallback with more relaxed constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch (fallbackError) {
          console.error('All camera configs failed:', fallbackError);
          throw fallbackError;
        }
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Enhanced video load handling
        const handleVideoLoad = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Video playing successfully');
              setStatus('scanning');
              setIsScanning(true);
              startScanning();
            }).catch((playError) => {
              console.error('Error playing video:', playError);
              setError('Erreur lors du démarrage de la vidéo');
              setStatus('error');
            });
          }
        };

        videoRef.current.onloadedmetadata = handleVideoLoad;
        
        // Fallback timeout in case loadedmetadata doesn't fire
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2 && status === 'initializing') {
            console.log('Video ready via timeout fallback');
            handleVideoLoad();
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Impossible d\'accéder à la caméra.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Accès à la caméra refusé. Vérifiez les permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée sur cet appareil.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Caméra en cours d\'utilisation par une autre application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Configuration caméra non supportée.';
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  };

  const stopCamera = () => {
    // Arrêter le scanning en premier
    if (stopScanningRef.current) {
      stopScanningRef.current();
      stopScanningRef.current = null;
    }
    
    // Ensuite arrêter la caméra
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsScanning(false);
    setStatus('initializing');
  };

  const startScanning = () => {
    if (!videoRef.current) {
      console.warn('Video ref not available for scanning');
      return;
    }

    const video = videoRef.current;
    
    // Wait for video to be ready
    const initializeScanning = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Video not ready, waiting...');
        setTimeout(initializeScanning, 100);
        return;
      }

      try {
        console.log('Starting ZXing barcode scanning with video dimensions:', video.videoWidth, 'x', video.videoHeight);
        
        // Arrêter le scan précédent s'il existe
        if (stopScanningRef.current) {
          stopScanningRef.current();
        }

        // Démarrer le nouveau scan ZXing
        const stopScanningFn = BarcodeServiceV2.startContinuousScanning(
          video,
          handleBarcodeDetected
        );
        
        stopScanningRef.current = stopScanningFn;

      } catch (scanError) {
        console.error('Error setting up ZXing scanner:', scanError);
        setError('Erreur de configuration du scanner');
        setStatus('error');
      }
    };

    // Start scanning initialization
    initializeScanning();

    // Auto-cleanup after 60 seconds
    const timeout = setTimeout(() => {
      if (stopScanningRef.current) {
        stopScanningRef.current();
        stopScanningRef.current = null;
      }
      setIsScanning(false);
      console.log('Scanning auto-stopped after 60 seconds');
    }, 60000);

    return () => {
      clearTimeout(timeout);
    };
  };

  const handleBarcodeDetected = async (result: BarcodeResult) => {
    if (!BarcodeServiceV2.isValidBarcode(result.data)) {
      return; // Continue scanning for valid barcodes
    }

    // Arrêter le scanning immédiatement
    if (stopScanningRef.current) {
      stopScanningRef.current();
      stopScanningRef.current = null;
    }

    setDetectedBarcode(result.data);
    setStatus('processing');
    setIsScanning(false);

    try {
      // Look up product information
      const product = await BarcodeServiceV2.lookupProduct(result.data);
      
      if (product) {
        setStatus('success');
        // Small delay to show success state
        setTimeout(() => {
          onDetected(product);
          onClose();
        }, 1000);
      } else {
        setError(`Produit avec le code-barres ${result.data} non trouvé dans OpenFoodFacts`);
        setStatus('error');
        // Allow retry after error
        setTimeout(() => {
          setStatus('scanning');
          setIsScanning(true);
          setError(null);
          setDetectedBarcode(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Error looking up product:', err);
      setError('Erreur lors de la recherche du produit');
      setStatus('error');
      // Allow retry after error
      setTimeout(() => {
        setStatus('scanning');
        setIsScanning(true);
        setError(null);
        setDetectedBarcode(null);
      }, 2000);
    }
  };

  const testWithKnownBarcode = async () => {
    // Test avec un code-barres connu de Pringles Original
    const testBarcode = '5053990156009'; // Pringles Original 175g que nous avons testé plus tôt
    
    setDetectedBarcode(testBarcode);
    setStatus('processing');
    setIsScanning(false);

    try {
      const product = await BarcodeServiceV2.lookupProduct(testBarcode);
      
      if (product) {
        setStatus('success');
        setTimeout(() => {
          onDetected(product);
          onClose();
        }, 1000);
      } else {
        setError('Test échoué : Produit non trouvé');
        setStatus('error');
      }
    } catch (err) {
      console.error('Test error:', err);
      setError('Test échoué : Erreur de connexion');
      setStatus('error');
    }
  };

  const handleManualInput = async () => {
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
          onClose();
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
    // Arrêter le scanning en premier
    if (stopScanningRef.current) {
      stopScanningRef.current();
      stopScanningRef.current = null;
    }
    
    setIsScanning(false);
    setStatus('manual');
    setError(null);
    stopCamera();
  };

  const switchToScanMode = () => {
    setStatus('initializing');
    setError(null);
    setManualInput('');
    startCamera();
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
        return <Zap className="w-5 h-5 text-blue-500" />;
      case 'manual':
        return <Keyboard className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scanner un code-barres</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {status !== 'manual' ? (
          <div className="relative mb-4">
            <video
              ref={videoRef}
              className="w-full h-64 bg-gray-100 rounded-lg object-cover"
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-blue-500 rounded-lg w-48 h-32 bg-transparent">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4">
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
                  onClick={handleManualInput}
                  disabled={!manualInput.trim()}
                  className="flex-1"
                >
                  Rechercher
                </Button>
                <Button
                  onClick={() => setManualInput('5053990156009')}
                  variant="outline"
                  size="sm"
                >
                  Test Pringles
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center space-x-2 mb-4">
          {getStatusIcon()}
          <span className="text-sm text-gray-600">{getStatusMessage()}</span>
        </div>

        {detectedBarcode && (
          <div className="text-center text-sm text-gray-500 mb-4">
            Code-barres détecté: {detectedBarcode}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-2">
            <Button
              onClick={() => {
                setStatus('scanning');
                setIsScanning(true);
                setError(null);
                setDetectedBarcode(null);
              }}
              className="bg-blue-500 hover:bg-blue-600 w-full"
            >
              Réessayer
            </Button>
            <Button
              onClick={testWithKnownBarcode}
              variant="outline"
              className="w-full"
            >
              Test avec code-barres Pringles
            </Button>
          </div>
        )}

        {status === 'scanning' && (
          <div className="text-center space-y-2">
            <div className="flex gap-2 justify-center">
              <Button
                onClick={testWithKnownBarcode}
                variant="outline"
                size="sm"
              >
                Test Pringles
              </Button>
              <Button
                onClick={switchToManualMode}
                variant="outline"
                size="sm"
              >
                <Keyboard className="w-4 h-4 mr-1" />
                Saisie manuelle
              </Button>
            </div>
          </div>
        )}

        {status === 'manual' && (
          <div className="text-center">
            <Button
              onClick={switchToScanMode}
              variant="outline"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-1" />
              Retour au scan
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center mt-4">
          {status === 'manual' 
            ? 'Codes acceptés : EAN-13, EAN-8, UPC-A, UPC-E, Code 128, QR codes'
            : 'Placez le code-barres ou QR code dans le cadre pour le scanner automatiquement'
          }
        </div>
      </div>
    </div>
  );
};