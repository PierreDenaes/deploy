// Service de cache local pour éviter la ré-analyse de repas similaires
import prisma from '../lib/prisma';
import { NutritionalData } from '../config/openai';

export interface LocalMealData {
  id: number;
  description: string;
  protein: number;
  calories: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  user_id: number;
  created_at: Date;
}

export class LocalMealCacheService {
  
  /**
   * Rechercher des repas similaires dans notre base de données
   */
  static async searchSimilarMeals(description: string, limit: number = 3): Promise<LocalMealData[]> {
    console.log(`🔍 Recherche repas similaires: "${description}"`);
    
    try {
      // Nettoyer la description pour la recherche
      const cleanQuery = this.cleanSearchQuery(description);
      
      // Recherche par similarité de texte dans les descriptions de repas
      const results = await prisma.meals.findMany({
        where: {
          description: {
            contains: cleanQuery,
            mode: 'insensitive'
          },
          // Exclure les repas sans valeurs nutritionnelles
          protein: { gt: 0 },
          calories: { gt: 0 }
        },
        orderBy: [
          { protein: 'desc' },
          { created_at: 'desc' }
        ],
        take: limit,
        select: {
          id: true,
          description: true,
          protein: true,
          calories: true,
          user_id: true,
          created_at: true
        }
      });

      console.log(`📊 ${results.length} repas similaires trouvés`);
      return results as LocalMealData[];
      
    } catch (error) {
      console.error('❌ Erreur recherche repas similaires:', error);
      return [];
    }
  }

  /**
   * Nettoyer la requête de recherche
   */
  private static cleanSearchQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remplacer la ponctuation par des espaces
      .replace(/\s+/g, ' ')     // Normaliser les espaces
      .trim();
  }

  /**
   * Convertir un repas local en format NutritionalData
   */
  static convertToNutritionalData(meal: LocalMealData): NutritionalData {
    return {
      productName: meal.description,
      proteins: meal.protein,
      calories: meal.calories,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      fiber: meal.fiber || 0,
      source: 'Repas déjà analysé',
      confidence: 0.85 // Bonne confiance car basé sur nos propres analyses
    };
  }

  /**
   * Recherche intelligente avec calcul de similarité
   */
  static async findSimilarMeal(description: string): Promise<NutritionalData | null> {
    console.log(`🎯 Recherche intelligente pour: "${description}"`);
    
    // Stratégies de recherche par ordre de spécificité
    const searchStrategies = [
      description,                                    // Description complète
      this.extractKeywords(description).join(' '),   // Mots-clés principaux
      this.removeQuantities(description)             // Sans quantités
    ];

    for (const query of searchStrategies) {
      const results = await this.searchSimilarMeals(query, 3);
      
      if (results.length > 0) {
        // Prendre le meilleur résultat
        const bestMatch = results[0];
        if (bestMatch) {
          console.log(`✅ Repas similaire trouvé: ${bestMatch.description}`);
          return this.convertToNutritionalData(bestMatch);
        }
      }
    }

    console.log('❌ Aucun repas similaire trouvé dans le cache');
    return null;
  }

  /**
   * Extraire les mots-clés principaux d'une description
   */
  private static extractKeywords(description: string): string[] {
    const stopWords = ['de', 'du', 'la', 'le', 'les', 'un', 'une', 'des', 'avec', 'sans', 'et', 'ou'];
    
    return description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3); // Garder les 3 mots-clés principaux
  }

  /**
   * Supprimer les quantités d'une description
   */
  private static removeQuantities(description: string): string {
    return description
      .replace(/\d+\s*(g|kg|ml|l|grammes?|litres?|cuillères?|portions?)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sauvegarder un repas analysé dans le cache pour utilisation future
   */
  static async cacheMealAnalysis(
    description: string, 
    nutritionalData: NutritionalData, 
    userId: number
  ): Promise<void> {
    try {
      await prisma.meals.create({
        data: {
          description,
          protein: nutritionalData.proteins || 0,
          calories: nutritionalData.calories || 0,
          user_id: userId,
          timestamp: new Date().toISOString(),
          source: 'cache'
        }
      });
      
      console.log(`💾 Repas sauvegardé dans le cache: ${description}`);
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde cache:', error);
    }
  }
}

export default LocalMealCacheService;