// Service spécialisé pour l'analyse structurée d'emballages alimentaires
import { AIService } from './ai.service';
import { AIAnalysisResult } from '../config/openai';

export interface PackagingAnalysisResult {
  nom_produit: string;
  marque: string;
  type: string;
  mentions_specifiques: string[];
  contenu_paquet: string;
  apparence_packaging: string;
  langue: string;
}

export class PackagingAnalysisService {
  
  /**
   * Analyser une image d'emballage alimentaire et retourner les informations structurées
   */
  static async analyzePackaging(imageUrl: string, description?: string): Promise<PackagingAnalysisResult> {
    try {
      // Utiliser d'abord l'analyse en deux étapes (OCR + Interprétation) pour plus de précision
      console.log('🔍 Tentative analyse OCR en deux étapes...');
      const aiResult = await AIService.analyzeTwoStepProduct(imageUrl, description);
      
      // Transformer le résultat en format structuré
      return this.formatPackagingResult(aiResult);
    } catch (error) {
      console.error('❌ Erreur analyse packaging deux étapes:', error);
      
      // Fallback vers l'analyse classique
      console.log('🔄 Fallback vers analyse packaging classique...');
      try {
        const fallbackResult = await AIService.analyzePackagingImage(imageUrl, description);
        return this.formatPackagingResult(fallbackResult);
      } catch (fallbackError) {
        console.error('❌ Erreur analyse packaging fallback:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Formater le résultat de l'IA en structure d'emballage
   */
  private static formatPackagingResult(aiResult: AIAnalysisResult): PackagingAnalysisResult {
    // Prioriser les données OCR si disponibles
    const hasOCRData = Boolean(aiResult.ocr_text && aiResult.ocr_text.length > 0);
    
    return {
      nom_produit: aiResult.nom_produit || this.extractProductTypeFromFoods(aiResult.foods) || "",
      marque: aiResult.marque || aiResult.brand || "",
      type: aiResult.type || this.extractTypeFromProductName(aiResult.productName) || "",
      mentions_specifiques: aiResult.mentions_specifiques || this.extractMentionsFromText(aiResult.explanation, aiResult.ocr_text) || [],
      contenu_paquet: aiResult.contenu_paquet || this.extractContentFromProductName(aiResult.productName) || "",
      apparence_packaging: aiResult.apparence_packaging || this.generatePackagingDescription(aiResult, hasOCRData),
      langue: aiResult.langue || this.detectLanguageFromContent(aiResult.explanation, aiResult.productName, aiResult.ocr_text) || "Français"
    };
  }

  /**
   * Extraire le type de produit à partir de la liste des aliments détectés
   */
  private static extractProductTypeFromFoods(foods: string[]): string {
    if (!foods || foods.length === 0) return "";
    
    const firstFood = foods[0]?.toLowerCase() || "";
    
    // Mapping des aliments vers des noms de produits génériques
    const productMapping: { [key: string]: string } = {
      'pain': 'pain de mie',
      'tranche': 'pain de mie',
      'yaourt': 'yaourt',
      'yogurt': 'yaourt',
      'fromage': 'fromage',
      'biscuit': 'biscuits',
      'cookie': 'biscuits',
      'céréales': 'céréales',
      'lait': 'lait',
      'jus': 'jus de fruits',
      'boisson': 'boisson'
    };

    for (const [key, value] of Object.entries(productMapping)) {
      if (firstFood.includes(key)) {
        return value;
      }
    }

    return firstFood;
  }

  /**
   * Extraire le type/variante à partir du nom de produit complet
   */
  private static extractTypeFromProductName(productName?: string): string {
    if (!productName) return "";
    
    const lowerName = productName.toLowerCase();
    
    // Extraire les types courants
    const types = [
      'complet', 'nature', 'vanille', 'fraise', 'chocolat',
      'épais', 'fin', 'tranché', 'entier',
      'bio', 'allégé', 'sans sucre', 'riche en protéines'
    ];
    
    const foundTypes = types.filter(type => lowerName.includes(type));
    return foundTypes.join(', ');
  }

  /**
   * Extraire les mentions spécifiques à partir du texte d'explication et OCR
   */
  private static extractMentionsFromText(explanation: string, ocrText?: string): string[] {
    const mentions: string[] = [];
    const textToAnalyze = `${explanation} ${ocrText || ''}`.toLowerCase();
    
    // Mentions de santé et marketing courantes
    const commonMentions = [
      'sans sucres ajoutés', 'sans gluten', 'bio', 'biologique',
      'riche en protéines', 'source de calcium', 'allégé',
      '0% matière grasse', 'tradition', 'artisanal',
      'label rouge', 'aoc', 'igp', 'crousti moelleux',
      'extra fin', 'natural', 'organic', 'nature',
      'complet', 'sans conservateur', 'authentique'
    ];
    
    commonMentions.forEach(mention => {
      if (textToAnalyze.includes(mention)) {
        mentions.push(mention);
      }
    });
    
    return [...new Set(mentions)]; // Éliminer les doublons
  }

  /**
   * Extraire le contenu du paquet à partir du nom de produit
   */
  private static extractContentFromProductName(productName?: string): string {
    if (!productName) return "";
    
    // Rechercher des patterns de quantité
    const quantityPatterns = [
      /(\d+)\s*tranches?/i,
      /(\d+)\s*x\s*(\d+)\s*g/i,
      /(\d+)\s*g/i,
      /(\d+)\s*ml/i,
      /(\d+)\s*l/i,
      /(\d+)\s*unités?/i,
      /(\d+)\s*pièces?/i
    ];
    
    for (const pattern of quantityPatterns) {
      const match = productName.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return "";
  }

  /**
   * Générer une description de l'apparence du packaging
   */
  private static generatePackagingDescription(aiResult: AIAnalysisResult, hasOCRData: boolean = false): string {
    let description = "";
    
    if (aiResult.productType === 'PACKAGED_PRODUCT') {
      description = "Emballage de produit alimentaire";
      
      if (aiResult.brand) {
        description += ` avec marque ${aiResult.brand}`;
      }
      
      if (hasOCRData) {
        description += ", texte clairement lisible";
      }
      
      if (aiResult.imageQuality) {
        const qualityDesc = {
          'excellent': 'image très nette',
          'good': 'image claire',
          'fair': 'image correcte',
          'poor': 'image de qualité limitée'
        };
        description += `, ${qualityDesc[aiResult.imageQuality]}`;
      }
      
      if (aiResult.dataSource === 'OFFICIAL_LABEL') {
        description += ", tableau nutritionnel visible";
      }
    }
    
    return description;
  }

  /**
   * Détecter la langue à partir du contenu analysé
   */
  private static detectLanguageFromContent(explanation: string, productName?: string, ocrText?: string): string {
    const content = `${explanation} ${productName || ''} ${ocrText || ''}`.toLowerCase();
    
    // Mots indicateurs de langue française
    const frenchWords = ['sans', 'avec', 'de', 'le', 'la', 'les', 'un', 'une', 'des', 'pain', 'yaourt', 'fromage', 'valeurs', 'nutritionnelles', 'ingrédients', 'protéines', 'glucides'];
    const englishWords = ['with', 'without', 'the', 'and', 'bread', 'yogurt', 'cheese', 'milk', 'nutrition', 'facts', 'ingredients', 'protein', 'carbohydrates'];
    
    const frenchCount = frenchWords.filter(word => content.includes(word)).length;
    const englishCount = englishWords.filter(word => content.includes(word)).length;
    
    if (frenchCount > englishCount) {
      return 'Français';
    } else if (englishCount > frenchCount) {
      return 'Anglais';
    } else if (frenchCount > 0 && englishCount > 0) {
      return 'Multilingue';
    }
    
    return 'Français'; // Défaut
  }

  /**
   * Valider et nettoyer le résultat final
   */
  static validateAndCleanResult(result: PackagingAnalysisResult): PackagingAnalysisResult {
    return {
      nom_produit: result.nom_produit || "",
      marque: result.marque === "marque_non_visible" ? "" : result.marque || "",
      type: result.type || "",
      mentions_specifiques: Array.isArray(result.mentions_specifiques) ? result.mentions_specifiques : [],
      contenu_paquet: result.contenu_paquet || "",
      apparence_packaging: result.apparence_packaging || "",
      langue: result.langue || "Français"
    };
  }
}