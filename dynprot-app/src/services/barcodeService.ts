import jsQR from 'jsqr';
import Quagga from 'quagga';
import { NutritionalData } from '../types/NutritionalData';

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
      const context = canvas.getContext('2d');
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
    return new Promise((resolve) => {
      try {
        // Create a temporary canvas for QuaggaJS
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          resolve(null);
          return;
        }

        // Copy image data to temp canvas
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);

        // Configure QuaggaJS for single image detection WITHOUT Web Workers
        Quagga.decodeSingle({
          inputStream: {
            size: canvas.width && canvas.height ? Math.min(canvas.width, canvas.height) : 800,
            singleChannel: false
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 0, // Disable Web Workers to avoid CSP issues
          frequency: 10,
          decoder: {
            readers: [
              "ean_reader", // Focus on most common barcode types first
              "ean_8_reader",
              "code_128_reader",
              "upc_reader",
              "upc_e_reader"
            ]
          },
          locate: true,
          src: tempCanvas.toDataURL()
        }, (result: any) => {
          if (result && result.codeResult) {
            console.log('Barcode detected by QuaggaJS:', result.codeResult.code);
            resolve(result.codeResult.code);
          } else {
            console.log('No barcode detected by QuaggaJS');
            resolve(null);
          }
        });

        // Add timeout to prevent hanging
        setTimeout(() => {
          console.log('QuaggaJS detection timeout');
          resolve(null);
        }, 5000);

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
   * Validates barcode format
   * @param barcode The barcode string
   * @returns boolean
   */
  static isValidBarcode(barcode: string): boolean {
    // Common barcode formats: EAN-13, EAN-8, UPC-A, UPC-E
    const barcodeRegex = /^(\d{8}|\d{12}|\d{13}|\d{14})$/;
    return barcodeRegex.test(barcode);
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

    const scan = async () => {
      if (!isScanning) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      try {
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        scanCount++;

        // Add debug logging every 30 scans (roughly every 2 seconds at 15fps)
        if (scanCount % 30 === 0) {
          console.log(`Scan attempt ${scanCount}, canvas size: ${canvas.width}x${canvas.height}`);
        }

        // Attempt barcode detection
        const result = await this.scanBarcode(canvas);
        if (result) {
          console.log('Barcode detected successfully:', result);
          onDetected(result);
          return; // Stop scanning on first detection
        }

        // Continue scanning with a slight delay to prevent excessive CPU usage
        if (isScanning) {
          setTimeout(scan, 100); // Scan every 100ms (10fps)
        }
      } catch (error) {
        console.error('Error during scan iteration:', error);
        // Continue scanning even on error
        if (isScanning) {
          setTimeout(scan, 200);
        }
      }
    };

    // Start initial scan
    scan();

    return () => {
      isScanning = false;
    };
  }
}