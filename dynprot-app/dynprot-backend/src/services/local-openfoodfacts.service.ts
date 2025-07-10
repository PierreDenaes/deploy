// Service de recherche dans la base OpenFoodFacts locale
import prisma from '../lib/prisma';
import { NutritionalData } from '../config/openai';

export interface LocalOpenFoodFactsProduct {
  id: number;
  barcode: string;
  product_name: string;
  brands?: string;
  categories?: string;
  energy_100g: number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
  fiber_100g: number;
  sodium_100g: number;
  countries?: string;
}

export class LocalOpenFoodFactsService {
  
  /**
   * Rechercher un produit dans la base locale avec recherche textuelle avancée
   */
  static async searchProducts(query: string, limit: number = 5): Promise<LocalOpenFoodFactsProduct[]> {
    console.log(`🔍 Recherche locale OpenFoodFacts: "${query}"`);
    
    try {
      // Nettoyer la requête pour la recherche
      const cleanQuery = this.cleanSearchQuery(query);
      
      // Recherche avec PostgreSQL full-text search
      const results = await prisma.$queryRaw<LocalOpenFoodFactsProduct[]>`
        SELECT 
          id, barcode, product_name, brands, categories,
          energy_100g, proteins_100g, carbohydrates_100g, 
          fat_100g, fiber_100g, sodium_100g, countries,
          -- Score de pertinence basé sur nom du produit et marques
          (
            ts_rank(to_tsvector('french', product_name), to_tsquery('french', ${cleanQuery})) * 2 +
            ts_rank(to_tsvector('french', COALESCE(brands, '')), to_tsquery('french', ${cleanQuery}))
          ) as relevance_score
        FROM openfoodfacts_products 
        WHERE 
          (
            to_tsvector('french', product_name) @@ to_tsquery('french', ${cleanQuery}) OR
            to_tsvector('french', COALESCE(brands, '')) @@ to_tsquery('french', ${cleanQuery}) OR
            product_name ILIKE ${`%${query}%`} OR
            brands ILIKE ${`%${query}%`}
          )
          AND proteins_100g > 0
          AND energy_100g > 0
        ORDER BY relevance_score DESC, proteins_100g DESC
        LIMIT ${limit}
      `;
      
      console.log(`✅ Trouvé ${results.length} produits locaux`);
      return results;
      
    } catch (error) {
      console.error('❌ Erreur recherche locale:', error);
      
      // Fallback vers recherche simple LIKE
      return await this.searchProductsSimple(query, limit);
    }
  }

  /**
   * Recherche simple fallback
   */
  private static async searchProductsSimple(query: string, limit: number): Promise<LocalOpenFoodFactsProduct[]> {
    console.log(`🔄 Fallback recherche simple: "${query}"`);
    
    return await prisma.openfoodfacts_products.findMany({
      where: {
        OR: [
          { product_name: { contains: query, mode: 'insensitive' } },
          { brands: { contains: query, mode: 'insensitive' } }
        ],
        AND: [
          { proteins_100g: { gt: 0 } },
          { energy_100g: { gt: 0 } }
        ]
      },
      orderBy: [
        { proteins_100g: 'desc' },
        { energy_100g: 'desc' }
      ],
      take: limit
    });
  }

  /**
   * Rechercher par code-barres
   */
  static async findByBarcode(barcode: string): Promise<LocalOpenFoodFactsProduct | null> {
    console.log(`📊 Recherche par code-barres: ${barcode}`);
    
    return await prisma.openfoodfacts_products.findUnique({
      where: { barcode }
    });
  }

  /**
   * Convertir un produit local en format NutritionalData
   */
  static convertToNutritionalData(product: LocalOpenFoodFactsProduct): NutritionalData {
    return {
      productName: product.product_name,
      brand: product.brands || undefined,
      proteins: product.proteins_100g,
      calories: Math.round(product.energy_100g / 4.184), // Convertir kJ en kcal
      carbs: product.carbohydrates_100g,
      fat: product.fat_100g,
      fiber: product.fiber_100g,
      source: 'OpenFoodFacts Local DB',
      confidence: 0.9 // Haute confiance pour données officielles
    };
  }

  /**
   * Recherche intelligente avec synonymes et variantes
   */
  static async searchWithVariants(productName: string, brand?: string): Promise<NutritionalData | null> {
    console.log(`🧠 Recherche intelligente: "${productName}" (${brand || 'sans marque'})`);
    
    // Stratégies de recherche par ordre de priorité
    const searchStrategies = [
      // 1. Marque + nom exact
      brand ? `${brand} ${productName}` : null,
      // 2. Nom du produit exact
      productName,
      // 3. Mots-clés principaux du produit
      this.extractMainKeywords(productName),
      // 4. Recherche par marque seule si fournie
      brand && brand.length > 2 ? brand : null
    ].filter(Boolean) as string[];

    for (const query of searchStrategies) {
      const results = await this.searchProducts(query, 3);
      
      if (results.length > 0) {
        // Prendre le meilleur résultat et le convertir
        const bestMatch = results[0];
        console.log(`✅ Match trouvé: ${bestMatch.product_name} (${bestMatch.brands || 'sans marque'})`);
        return this.convertToNutritionalData(bestMatch);
      }
    }

    console.log('❌ Aucun produit trouvé dans la base locale');
    return null;
  }

  /**
   * Extraire les mots-clés principaux d'un nom de produit
   */
  private static extractMainKeywords(productName: string): string {
    return productName
      .toLowerCase()
      .replace(/\b(bio|biologique|natural|nature|traditionnel)\b/g, '') // Supprimer mots génériques
      .replace(/\d+\s*(g|ml|kg|l|cl)\b/g, '') // Supprimer poids/volumes
      .replace(/[(),\[\]]/g, ' ') // Supprimer parenthèses
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
      .split(' ')
      .filter(word => word.length > 2) // Garder mots significatifs
      .slice(0, 3) // Prendre les 3 premiers mots
      .join(' ');
  }

  /**
   * Nettoyer une requête pour PostgreSQL full-text search
   */
  private static cleanSearchQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remplacer caractères spéciaux par espaces
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
      .split(' ')
      .filter(word => word.length > 1)
      .map(word => `${word}:*`) // Recherche avec préfixe
      .join(' & '); // Opérateur AND
  }

  /**
   * Statistiques de la base de données
   */
  static async getStats(): Promise<{
    totalProducts: number;
    productsWithProtein: number;
    topBrands: string[];
  }> {
    const [total, withProtein, brands] = await Promise.all([
      prisma.openfoodfacts_products.count(),
      prisma.openfoodfacts_products.count({
        where: { proteins_100g: { gt: 0 } }
      }),
      prisma.openfoodfacts_products.groupBy({
        by: ['brands'],
        where: {
          brands: { not: null },
          proteins_100g: { gt: 0 }
        },
        _count: { brands: true },
        orderBy: { _count: { brands: 'desc' } },
        take: 10
      })
    ]);

    return {
      totalProducts: total,
      productsWithProtein: withProtein,
      topBrands: brands.map(b => b.brands || '').filter(Boolean)
    };
  }
}