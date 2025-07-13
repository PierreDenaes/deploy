import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { NutritionalData } from '@/types/NutritionalData';

export interface BarcodeResult {
  data: string;
  format: string;
}

export interface ProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  nutritionalData: NutritionalData;
  confidence: number;
  source: 'openfoodfacts' | 'fallback';
}

export class BarcodeServiceV2 {
  private static reader: BrowserMultiFormatReader | null = null;
  private static readonly OPENFOODFACTS_API = 'https://world.openfoodfacts.org/api/v0/product';

  /**
   * Initialize the barcode reader with optimal mobile settings
   */
  private static getReader(): BrowserMultiFormatReader {
    if (!this.reader) {
      // Create reader with mobile-optimized hints
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.PURE_BARCODE, false); // Better for real-world images
      hints.set(DecodeHintType.ALSO_INVERTED, true); // Handle inverted barcodes
      
      this.reader = new BrowserMultiFormatReader(hints);
    }
    return this.reader;
  }

  /**
   * Scans a barcode from canvas using ZXing
   * @param canvas Canvas element containing the image data
   * @returns Promise<BarcodeResult | null>
   */
  static async scanBarcode(canvas: HTMLCanvasElement): Promise<BarcodeResult | null> {
    try {
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.warn('Invalid canvas for barcode detection');
        return null;
      }

      const reader = this.getReader();
      const imageData = canvas.toDataURL('image/png');
      
      try {
        const result = await reader.decodeFromImageUrl(imageData);
        
        if (result && result.getText()) {
          const detectedCode = result.getText().trim();
          const format = result.getBarcodeFormat().toString();
          
          console.log('ZXing detected barcode:', detectedCode, 'format:', format);
          
          if (this.isValidBarcode(detectedCode)) {
            return {
              data: detectedCode,
              format: format
            };
          } else {
            console.warn('Invalid barcode format detected:', detectedCode);
            return null;
          }
        }
      } catch (decodeError) {
        console.log('No barcode detected by ZXing');
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error in ZXing barcode detection:', error);
      return null;
    }
  }

  /**
   * Continuously scans for barcodes in video stream
   * @param video Video element
   * @param onDetected Callback when barcode is detected
   * @returns Function to stop scanning
   */
  static startContinuousScanning(
    video: HTMLVideoElement,
    onDetected: (result: BarcodeResult) => void
  ): () => void {
    let isScanning = true;
    let scanCount = 0;
    const reader = this.getReader();

    const scan = async () => {
      if (!isScanning || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        if (isScanning) {
          setTimeout(scan, 500); // Wait for video to be ready
        }
        return;
      }

      try {
        scanCount++;
        
        // Log every 20 scans (roughly every 4 seconds at 5fps)
        if (scanCount % 20 === 0) {
          console.log(`ZXing scan attempt ${scanCount}, video ready: ${video.readyState >= 2}`);
        }

        // Create a canvas to capture video frame for ZXing with mobile optimization
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Optimize canvas for mobile barcode scanning
        context.imageSmoothingEnabled = false; // Preserve sharp edges for barcodes
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Apply contrast enhancement for mobile cameras
        if (canvas.width > 0 && canvas.height > 0) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Simple contrast enhancement
          for (let i = 0; i < data.length; i += 4) {
            // Increase contrast for better barcode detection
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.2 + 128));     // Red
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.2 + 128)); // Green
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.2 + 128)); // Blue
          }
          
          context.putImageData(imageData, 0, 0);
        }

        // Use ZXing to decode from canvas
        const imageData = canvas.toDataURL('image/png');
        const result = await reader.decodeFromImageUrl(imageData);
        
        if (result && result.getText()) {
          const detectedCode = result.getText().trim();
          const format = result.getBarcodeFormat().toString();
          
          if (this.isValidBarcode(detectedCode)) {
            console.log('ZXing detected valid barcode:', detectedCode, 'format:', format);
            isScanning = false; // Stop scanning
            onDetected({
              data: detectedCode,
              format: format
            });
            return;
          }
        }

        // Continue scanning with mobile-optimized frequency
        if (isScanning) {
          setTimeout(scan, 150); // ~6.7fps for better mobile performance
        }
      } catch (error) {
        // ZXing throws NotFoundException when no barcode is found - this is normal
        if (error.name !== 'NotFoundException') {
          console.warn('ZXing scan error:', error.message);
        }
        
        if (isScanning) {
          setTimeout(scan, 300); // Longer delay on error
        }
      }
    };

    // Start scanning
    scan();

    return () => {
      isScanning = false;
    };
  }

  /**
   * Enhanced barcode validation with format-specific checks
   * @param barcode The barcode string
   * @returns boolean
   */
  static isValidBarcode(barcode: string): boolean {
    if (!barcode || typeof barcode !== 'string') return false;
    
    const cleanBarcode = barcode.trim();
    
    // Basic format validation
    const barcodeRegex = /^(\d{8}|\d{12}|\d{13}|\d{14})$/;
    if (!barcodeRegex.test(cleanBarcode)) return false;
    
    const length = cleanBarcode.length;
    
    // Reject obviously invalid patterns
    if (cleanBarcode === '0'.repeat(length)) return false;
    if (cleanBarcode === '1'.repeat(length)) return false;
    if (/^(\d)\1+$/.test(cleanBarcode)) return false;
    
    // Validate checksums for common formats
    if (length === 13) {
      return this.validateEAN13Checksum(cleanBarcode);
    } else if (length === 12) {
      return this.validateUPCAChecksum(cleanBarcode);
    }
    
    return true;
  }

  /**
   * Validates EAN-13 checksum
   */
  private static validateEAN13Checksum(barcode: string): boolean {
    if (barcode.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[12]);
  }

  /**
   * Validates UPC-A checksum
   */
  private static validateUPCAChecksum(barcode: string): boolean {
    if (barcode.length !== 12) return false;
    
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(barcode[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[11]);
  }

  /**
   * Looks up product information by barcode
   * @param barcode The barcode string
   * @returns Promise<ProductInfo | null>
   */
  static async lookupProduct(barcode: string): Promise<ProductInfo | null> {
    try {
      // Use backend service to avoid CORS issues
      const product = await this.fetchFromBackend(barcode);
      return product;
    } catch (error) {
      console.error('Error looking up product:', error);
      return null;
    }
  }

  /**
   * Fetches product data from backend service
   */
  private static async fetchFromBackend(barcode: string): Promise<ProductInfo | null> {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/products/barcode/${barcode}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Product not found in OpenFoodFacts for barcode:', barcode);
        } else {
          console.error(`Backend returned ${response.status}: ${response.statusText}`);
        }
        return null;
      }

      const data = await response.json();
      
      return {
        barcode,
        name: data.name || 'Produit inconnu',
        brand: data.brand,
        nutritionalData: data.nutritionalData,
        confidence: data.confidence || 0.7,
        source: 'fallback'
      };
    } catch (error) {
      console.error('Error fetching from backend:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    if (this.reader) {
      try {
        this.reader.reset();
      } catch (error) {
        console.warn('Error cleaning up ZXing reader:', error);
      }
    }
  }
}