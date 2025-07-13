import jsQR from 'jsqr';
import Quagga from 'quagga';
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

export class BarcodeService {
  private static readonly OPENFOODFACTS_API = 'https://world.openfoodfacts.org/api/v0/product';
  private static readonly SEARCH_API = 'https://world.openfoodfacts.org/cgi/search.pl';

  /**
   * Scans a barcode from camera stream or image
   * @param canvas Canvas element containing the image data
   * @returns Promise<BarcodeResult | null>
   */
  static async scanBarcode(canvas: HTMLCanvasElement): Promise<BarcodeResult | null> {
    try {
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Use jsQR for QR code detection
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
      if (qrCode) {
        return {
          data: qrCode.data,
          format: 'QR_CODE'
        };
      }

      // For traditional barcodes, use QuaggaJS
      const possibleBarcode = await this.detectBarcode(canvas);
      if (possibleBarcode) {
        return {
          data: possibleBarcode,
          format: 'BARCODE'
        };
      }

      return null;
    } catch (error) {
      console.error('Error scanning barcode:', error);
      return null;
    }
  }

  /**
   * Traditional barcode detection using QuaggaJS
   * @param canvas Canvas element containing the image
   * @returns Promise<string | null>
   */
  private static async detectBarcode(canvas: HTMLCanvasElement): Promise<string | null> {
    // Store detected codes to find consistent results
    const detectedCodes: Map<string, number> = new Map();
    
    return new Promise((resolve) => {
      try {
        // Validate canvas and its dimensions
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          console.warn('Invalid canvas dimensions for barcode detection');
          resolve(null);
          return;
        }

        // Create a temporary canvas for QuaggaJS
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) {
          console.error('Failed to get 2D context from temporary canvas');
          resolve(null);
          return;
        }

        // Copy image data to temp canvas with validation
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        try {
          // Apply image enhancement for better detection
          tempCtx.filter = 'contrast(1.5) brightness(1.1)';
          tempCtx.drawImage(canvas, 0, 0);
        } catch (drawError) {
          console.error('Failed to draw image to temporary canvas:', drawError);
          resolve(null);
          return;
        }

        // Try multiple detection attempts with different settings
        const detectionAttempts = [
          { patchSize: "large", halfSample: false },
          { patchSize: "medium", halfSample: false },
          { patchSize: "small", halfSample: true }
        ];

        let attemptsCompleted = 0;
        
        detectionAttempts.forEach((settings, index) => {
          setTimeout(() => {
            // Configure QuaggaJS for single image detection
            const config = {
              inputStream: {
                size: 800, // Fixed size for consistency
                singleChannel: true // Try grayscale for better contrast
              },
              locator: {
                patchSize: settings.patchSize,
                halfSample: settings.halfSample
              },
              numOfWorkers: 0,
              frequency: 10,
              decoder: {
                readers: [
                  "ean_reader", // EAN-13
                  "upc_reader"  // UPC-A only - more strict
                ],
                multiple: false
              },
              locate: true,
              src: tempCanvas.toDataURL('image/png')
            };

            Quagga.decodeSingle(config, (result: any) => {
              attemptsCompleted++;
              
              if (result && result.codeResult && result.codeResult.code) {
                const detectedCode = result.codeResult.code.trim();
                
                // Only consider codes with good format
                if (detectedCode.length === 13 || detectedCode.length === 12) {
                  const count = detectedCodes.get(detectedCode) || 0;
                  detectedCodes.set(detectedCode, count + 1);
                  console.log(`Attempt ${index + 1}: detected ${detectedCode}`);
                }
              }
              
              // After all attempts, return the most frequent valid code
              if (attemptsCompleted === detectionAttempts.length) {
                let bestCode = null;
                let maxCount = 0;
                
                detectedCodes.forEach((count, code) => {
                  if (count > maxCount && this.isValidBarcode(code)) {
                    maxCount = count;
                    bestCode = code;
                  }
                });
                
                if (bestCode && maxCount >= 2) {
                  console.log(`Consistent barcode detected: ${bestCode} (${maxCount} times)`);
                  resolve(bestCode);
                } else {
                  console.log('No consistent barcode detected across attempts');
                  resolve(null);
                }
              }
            });
          }, index * 100); // Stagger attempts
        });

        // Timeout for all attempts
        setTimeout(() => {
          console.log('QuaggaJS detection timeout');
          resolve(null);
        }, 3000); // Reduced timeout since we're doing multiple quick attempts

      } catch (error) {
        console.error('Error in QuaggaJS detection:', error);
        resolve(null);
      }
    });
  }

  /**
   * Looks up product information by barcode
   * @param barcode The barcode string
   * @returns Promise<ProductInfo | null>
   */
  static async lookupProduct(barcode: string): Promise<ProductInfo | null> {
    try {
      // Use backend service to avoid CSP issues with direct OpenFoodFacts calls
      const product = await this.fetchFromBackend(barcode);
      return product;
    } catch (error) {
      console.error('Error looking up product:', error);
      return null;
    }
  }

  /**
   * Fetches product data from OpenFoodFacts API
   * @param barcode The barcode string
   * @returns Promise<ProductInfo | null>
   */
  private static async fetchFromOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
    try {
      const response = await fetch(`${this.OPENFOODFACTS_API}/${barcode}.json`, {
        headers: {
          'User-Agent': 'DynProt-App/1.0 (https://dynprot.app)'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.status === 0) {
        // Product not found, try search
        return await this.searchByBarcode(barcode);
      }

      const product = data.product;
      if (!product) return null;

      const nutritionalData = this.extractNutritionalData(product);
      
      return {
        barcode,
        name: product.product_name || product.product_name_fr || 'Produit inconnu',
        brand: product.brands,
        nutritionalData,
        confidence: 0.9,
        source: 'openfoodfacts'
      };
    } catch (error) {
      console.error('Error fetching from OpenFoodFacts:', error);
      return null;
    }
  }

  /**
   * Searches for product by barcode in OpenFoodFacts
   * @param barcode The barcode string
   * @returns Promise<ProductInfo | null>
   */
  private static async searchByBarcode(barcode: string): Promise<ProductInfo | null> {
    try {
      const response = await fetch(`${this.SEARCH_API}?code=${barcode}&search_simple=1&json=1&page_size=1&fields=product_name,brands,nutriments,code`, {
        headers: {
          'User-Agent': 'DynProt-App/1.0 (https://dynprot.app)'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (!data.products || data.products.length === 0) {
        return null;
      }

      const product = data.products[0];
      const nutritionalData = this.extractNutritionalData(product);
      
      return {
        barcode,
        name: product.product_name || product.product_name_fr || 'Produit inconnu',
        brand: product.brands,
        nutritionalData,
        confidence: 0.8,
        source: 'openfoodfacts'
      };
    } catch (error) {
      console.error('Error searching by barcode:', error);
      return null;
    }
  }

  /**
   * Fetches product data from backend service
   * @param barcode The barcode string
   * @returns Promise<ProductInfo | null>
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
        console.log(`Backend returned ${response.status}: ${response.statusText}`);
        console.log(`URL was: ${API_BASE_URL}/products/barcode/${barcode}`);
        // Pour les 404, c'est normal (produit non trouvé), pas besoin de logs d'erreur
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            console.log('Product not found in OpenFoodFacts:', errorData.message);
          } catch (e) {
            console.log('404 response was not JSON');
          }
        } else {
          // Pour les autres erreurs, afficher les détails
          try {
            const errorData = await response.json();
            console.error('API Error:', errorData);
          } catch (e) {
            console.error('Non-JSON error response');
          }
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
   * Extracts nutritional data from OpenFoodFacts product
   * @param product OpenFoodFacts product object
   * @returns NutritionalData
   */
  private static extractNutritionalData(product: any): NutritionalData {
    const nutriments = product.nutriments || {};
    
    return {
      calories: this.parseFloat(nutriments.energy_kcal_100g) || 0,
      protein: this.parseFloat(nutriments.proteins_100g) || 0,
      carbohydrates: this.parseFloat(nutriments.carbohydrates_100g) || 0,
      fat: this.parseFloat(nutriments.fat_100g) || 0,
      fiber: this.parseFloat(nutriments.fiber_100g) || 0,
      sugar: this.parseFloat(nutriments.sugars_100g) || 0,
      sodium: this.parseFloat(nutriments.sodium_100g) || 0,
      saturatedFat: this.parseFloat(nutriments['saturated-fat_100g']) || 0,
      portionSize: 100 // OpenFoodFacts data is per 100g
    };
  }

  /**
   * Safely parses float values from OpenFoodFacts data
   * @param value The value to parse
   * @returns number
   */
  private static parseFloat(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Validates barcode format with enhanced validation
   * @param barcode The barcode string
   * @returns boolean
   */
  static isValidBarcode(barcode: string): boolean {
    if (!barcode || typeof barcode !== 'string') return false;
    
    // Remove any whitespace
    const cleanBarcode = barcode.trim();
    
    // Common barcode formats: EAN-13, EAN-8, UPC-A, UPC-E
    const barcodeRegex = /^(\d{8}|\d{12}|\d{13}|\d{14})$/;
    
    if (!barcodeRegex.test(cleanBarcode)) return false;
    
    // Additional validation for common patterns
    const length = cleanBarcode.length;
    
    // Reject obviously invalid patterns
    if (cleanBarcode === '0'.repeat(length)) return false; // All zeros
    if (cleanBarcode === '1'.repeat(length)) return false; // All ones
    if (/^(\d)\1+$/.test(cleanBarcode)) return false; // All same digit
    
    // EAN-13 and UPC-A should not start with certain patterns
    if (length === 13) {
      const firstDigit = cleanBarcode[0];
      // Reject certain country codes that are unlikely
      if (['0', '1'].includes(firstDigit)) {
        // For US/Canada codes, be more strict
        if (cleanBarcode.startsWith('00000') || cleanBarcode.startsWith('11111')) {
          return false;
        }
      }
    }
    
    // Validate EAN-13 checksum if it's 13 digits
    if (length === 13) {
      // Check for valid country code prefixes (first 3 digits)
      const prefix = cleanBarcode.substring(0, 3);
      const validPrefixes = [
        // Europe
        '300', '301', '302', '303', '304', '305', '306', '307', '308', '309', // France
        '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', // France
        '320', '321', '322', '323', '324', '325', '326', '327', '328', '329', // France
        '400', '401', '402', '403', '404', '405', '406', '407', '408', '409', // Germany
        '410', '411', '412', '413', '414', '415', '416', '417', '418', '419', // Germany
        '420', '421', '422', '423', '424', '425', '426', '427', '428', '429', // Germany
        '430', '431', '432', '433', '434', '435', '436', '437', '438', '439', // Germany
        '440', // Germany
        '500', '501', '502', '503', '504', '505', '506', '507', '508', '509', // UK
        '540', '541', '542', '543', '544', '545', '546', '547', '548', '549', // Belgium/Luxembourg
        '560', '561', '562', '563', '564', '565', '566', '567', '568', '569', // Portugal
        '800', '801', '802', '803', '804', '805', '806', '807', '808', '809', // Italy
        '810', '811', '812', '813', '814', '815', '816', '817', '818', '819', // Italy
        '820', '821', '822', '823', '824', '825', '826', '827', '828', '829', // Italy
        '830', '831', '832', '833', '834', '835', '836', '837', '838', '839', // Italy
        '840', '841', '842', '843', '844', '845', '846', '847', '848', '849', // Spain
        '870', '871', '872', '873', '874', '875', '876', '877', '878', '879', // Netherlands
        // Americas
        '000', '001', '002', '003', '004', '005', '006', '007', '008', '009', // USA/Canada
        '010', '011', '012', '013', '014', '015', '016', '017', '018', '019', // USA/Canada
        '020', '021', '022', '023', '024', '025', '026', '027', '028', '029', // USA/Canada
        '030', '031', '032', '033', '034', '035', '036', '037', '038', '039', // USA/Canada
        '040', '041', '042', '043', '044', '045', '046', '047', '048', '049', // USA/Canada
        '050', '051', '052', '053', '054', '055', '056', '057', '058', '059', // USA/Canada
        '060', '061', '062', '063', '064', '065', '066', '067', '068', '069', // USA/Canada
        '070', '071', '072', '073', '074', '075', '076', '077', '078', '079', // USA/Canada
        '080', '081', '082', '083', '084', '085', '086', '087', '088', '089', // USA/Canada
        '090', '091', '092', '093', '094', '095', '096', '097', '098', '099', // USA/Canada
        '100', '101', '102', '103', '104', '105', '106', '107', '108', '109', // USA/Canada
        '110', '111', '112', '113', '114', '115', '116', '117', '118', '119', // USA/Canada
        '120', '121', '122', '123', '124', '125', '126', '127', '128', '129', // USA/Canada
        '130', '131', '132', '133', '134', '135', '136', '137', '138', '139'  // USA/Canada
      ];
      
      if (!validPrefixes.includes(prefix)) {
        console.warn('Invalid country code prefix:', prefix, 'in barcode:', cleanBarcode);
        return false;
      }
      
      return this.validateEAN13Checksum(cleanBarcode);
    }
    
    // For UPC-A (12 digits), also validate checksum
    if (length === 12) {
      return this.validateUPCAChecksum(cleanBarcode);
    }
    
    // For other lengths, basic format validation is sufficient
    return true;
  }
  
  /**
   * Validates EAN-13 checksum
   * @param barcode 13-digit barcode string
   * @returns boolean
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
   * @param barcode 12-digit barcode string
   * @returns boolean
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
   * Continuously scans for barcodes in video stream
   * @param video Video element
   * @param canvas Canvas element for processing
   * @param onDetected Callback when barcode is detected
   * @returns Function to stop scanning
   */
  static startContinuousScanning(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    onDetected: (result: BarcodeResult) => void
  ): () => void {
    let isScanning = true;
    let scanCount = 0;
    let errorCount = 0;
    const maxErrors = 10; // Stop after too many consecutive errors

    const scan = async () => {
      if (!isScanning) return;

      // Validate video and canvas state
      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
        if (isScanning) {
          setTimeout(scan, 200); // Retry after video loads
        }
        return;
      }

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        console.error('Failed to get canvas 2D context');
        return;
      }

      try {
        // Ensure canvas size matches video for optimal detection
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Draw video frame to canvas with error handling
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (drawError) {
          console.warn('Failed to draw video frame to canvas:', drawError);
          if (isScanning) {
            setTimeout(scan, 200);
          }
          return;
        }

        scanCount++;
        errorCount = 0; // Reset error count on successful draw

        // Add debug logging every 30 scans (roughly every 3 seconds at 10fps)
        if (scanCount % 30 === 0) {
          console.log(`Scan attempt ${scanCount}, canvas size: ${canvas.width}x${canvas.height}, video ready: ${video.readyState >= 2}`);
        }

        // Attempt barcode detection
        const result = await this.scanBarcode(canvas);
        if (result) {
          console.log('Barcode detected successfully:', result);
          isScanning = false; // Stop scanning immediately
          setTimeout(() => onDetected(result), 0); // Async callback to avoid race conditions
          return;
        }

        // Continue scanning with longer delays to reduce false positives
        if (isScanning) {
          const delay = scanCount < 20 ? 200 : 300; // Slower scanning for better accuracy
          setTimeout(scan, delay);
        }
      } catch (error) {
        console.error('Error during scan iteration:', error);
        errorCount++;
        
        // Stop scanning if too many consecutive errors
        if (errorCount >= maxErrors) {
          console.error('Too many consecutive scanning errors, stopping');
          isScanning = false;
          return;
        }
        
        // Continue scanning with longer delay on error
        if (isScanning) {
          setTimeout(scan, 300);
        }
      }
    };

    // Start initial scan with small delay to ensure video is ready
    setTimeout(scan, 100);

    return () => {
      isScanning = false;
    };
  }
}