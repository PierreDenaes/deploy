import { Request, Response } from 'express';

/**
 * GET /api/products/barcode/:barcode
 * Lookup product by barcode
 */
export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;
    
    if (!barcode) {
      res.status(400).json({
        error: 'Missing barcode parameter',
        message: 'Barcode is required'
      });
      return;
    }
    
    // Validate barcode format
    if (!/^\d{8,14}$/.test(barcode)) {
      res.status(400).json({
        error: 'Invalid barcode format',
        message: 'Barcode must be 8-14 digits'
      });
      return;
    }

    console.log(`Looking up barcode: ${barcode}`);

    // Try OpenFoodFacts API directly (avoiding CSP issues by using backend)
    
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'DynProt-App/1.0 (https://dynprot.app)'
      }
    });

    if (!response.ok) {
      res.status(404).json({
        error: 'Product not found',
        message: 'Product not found in OpenFoodFacts database'
      });
      return;
    }

    const data: any = await response.json();
    
    if (data.status === 0) {
      // Product not found in direct API, try search as fallback
      try {
        const searchResponse = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?code=${barcode}&search_simple=1&json=1&page_size=1&fields=product_name,brands,nutriments,code`, {
          headers: {
            'User-Agent': 'DynProt-App/1.0 (https://dynprot.app)'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (searchResponse.ok) {
          const contentType = searchResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const searchData: any = await searchResponse.json();
            if (searchData.products && searchData.products.length > 0) {
              const product = searchData.products[0];
              const nutritionalData = extractNutritionalData(product);
              
              res.json({
                barcode,
                name: product.product_name || product.product_name_fr || 'Produit inconnu',
                brand: product.brands,
                nutritionalData,
                confidence: 0.8,
                source: 'openfoodfacts'
              });
              return;
            }
          } else {
            console.log('Search API returned non-JSON response (likely timeout)');
          }
        } else {
          console.log(`Search API returned status: ${searchResponse.status}`);
        }
      } catch (searchError) {
        console.log('Search API failed:', searchError);
      }
      
      res.status(404).json({
        error: 'Product not found',
        message: 'Product not found in OpenFoodFacts database'
      });
      return;
    }

    const product = data.product;
    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        message: 'Product data unavailable'
      });
      return;
    }

    const nutritionalData = extractNutritionalData(product);
    
    console.log(`Found product via API: ${product.product_name}`);
    
    res.json({
      barcode,
      name: product.product_name || product.product_name_fr || 'Produit inconnu',
      brand: product.brands,
      nutritionalData,
      confidence: 0.9,
      source: 'openfoodfacts'
    });

  } catch (error) {
    console.error('Error looking up barcode:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to lookup product'
    });
  }
};

/**
 * Extract nutritional data from OpenFoodFacts product
 */
function extractNutritionalData(product: any) {
  const nutriments = product.nutriments || {};
  
  // Calculer les calories avec fallback kJ -> kcal
  let calories = parseFloatSafe(nutriments.energy_kcal_100g);
  if (!calories && nutriments.energy_100g) {
    // Convertir kJ en kcal (1 kcal = 4.184 kJ)
    calories = parseFloatSafe(nutriments.energy_100g) / 4.184;
  }
  if (!calories && nutriments.energy_value) {
    // Essayer energy_value comme fallback
    calories = parseFloatSafe(nutriments.energy_value) / 4.184;
  }
  
  return {
    calories: Math.round(calories) || 0,
    protein: parseFloatSafe(nutriments.proteins_100g) || 0,
    carbohydrates: parseFloatSafe(nutriments.carbohydrates_100g) || 0,
    fat: parseFloatSafe(nutriments.fat_100g) || 0,
    fiber: parseFloatSafe(nutriments.fiber_100g) || 0,
    sugar: parseFloatSafe(nutriments.sugars_100g) || 0,
    sodium: parseFloatSafe(nutriments.sodium_100g) || 0,
    saturatedFat: parseFloatSafe(nutriments['saturated-fat_100g']) || 0,
    portionSize: 100 // OpenFoodFacts data is per 100g
  };
}

/**
 * Safely parse float values
 */
function parseFloatSafe(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}