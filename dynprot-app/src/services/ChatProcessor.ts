import { AnalysisService, MealAnalysisResult } from './api.analysis';
import { TextAnalysisService, TextAnalysisResult } from './textAnalysisService';
import { QuantityParser, QuantityParseResult } from '@/utils/quantity-parser';
import { 
  ChatMessage, 
  ChatMessageData, 
  QuantitySuggestion, 
  ChatAction,
  ConversationContext 
} from '@/types/chat';

// Réponse du ChatProcessor
export interface ChatProcessorResponse {
  message: string;
  data?: ChatMessageData;
  awaitingQuantity: boolean;
  analysis?: any;
  updateContext?: Partial<ConversationContext>;
}

// Types d'input supportés
export type ProcessorInputType = 'text' | 'photo' | 'voice' | 'scan' | 'quantity' | 'command';

// Commandes structurées supportées
interface StructuredCommand {
  type: 'manual_entry' | 'modify_quantity' | 'save_meal' | 'retry' | 'help';
  params: Record<string, any>;
}

export class ChatProcessor {
  private static instance: ChatProcessor;
  
  public static getInstance(): ChatProcessor {
    if (!ChatProcessor.instance) {
      ChatProcessor.instance = new ChatProcessor();
    }
    return ChatProcessor.instance;
  }

  /**
   * Point d'entrée principal pour traiter tout type d'input
   */
  async processInput(
    input: string,
    type: ProcessorInputType,
    context: ConversationContext,
    attachments?: { photo?: string; audio?: string }
  ): Promise<ChatProcessorResponse> {
    try {
      switch (type) {
        case 'text':
          return await this.processTextInput(input, context);
        
        case 'photo':
          return await this.processPhotoInput(attachments?.photo || '', context);
        
        case 'voice':
          return await this.processVoiceInput(input, context);
        
        case 'scan':
          return await this.processScanInput(input, context, attachments);
        
        case 'quantity':
          return await this.processQuantityInput(input, context);
        
        case 'command':
          return await this.processCommandInput(input, context);
        
        default:
          throw new Error(`Type d'input non supporté: ${type}`);
      }
    } catch (error) {
      console.error('Erreur dans ChatProcessor:', error);
      return this.createErrorResponse(error as Error);
    }
  }

  /**
   * Traitement des entrées textuelles
   */
  private async processTextInput(
    input: string,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    // 1. Vérifier si c'est une commande structurée
    const command = this.parseStructuredCommand(input);
    if (command) {
      return await this.processStructuredCommand(command, context);
    }

    // 2. Vérifier si on attend une quantité
    if (context.pendingAnalysis && this.isQuantityInput(input)) {
      return await this.processQuantityInput(input, context);
    }

    // 3. Vérifier si c'est une modification (plus, moins, etc.)
    const modification = this.parseModificationCommand(input);
    if (modification && context.lastQuantity) {
      return await this.processQuantityModification(modification, context);
    }

    // 4. Analyse normale avec l'API backend
    return await this.processNormalTextAnalysis(input, context);
  }

  /**
   * Traitement des analyses photo
   */
  private async processPhotoInput(
    photoData: string,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    try {
      // Valider les données photo
      if (!photoData || !photoData.startsWith('data:image/')) {
        return {
          message: "Format de photo invalide. Veuillez reprendre une photo.",
          awaitingQuantity: false,
          data: {
            actions: [
              { id: 'retry-photo', label: 'Reprendre une photo', type: 'retry' }
            ]
          }
        };
      }

      // Appel à l'API d'analyse photo
      const analysisResult = await AnalysisService.analyzeImageMeal(photoData);

      if (!analysisResult || !analysisResult.detected_foods || analysisResult.detected_foods.length === 0) {
        return {
          message: "Je n'ai pas pu identifier d'aliments sur cette photo. Pouvez-vous réessayer avec une photo plus claire ou décrire votre repas ?",
          awaitingQuantity: false,
          data: {
            actions: [
              { id: 'retry-photo', label: 'Reprendre une photo', type: 'retry' },
              { id: 'text-input', label: 'Décrire le repas', type: 'modify' }
            ]
          }
        };
      }

      // Vérifier la qualité de l'analyse
      const confidence = analysisResult.confidence_score || 0;
      const proteinValue = analysisResult.estimated_protein || 0;

      if (confidence < 0.3) {
        return {
          message: `J'ai détecté "${analysisResult.detected_foods[0]}" mais avec peu de certitude. Voulez-vous continuer ou reprendre une photo ?`,
          awaitingQuantity: false,
          data: {
            analysis: {
              description: analysisResult.detected_foods[0],
              protein: proteinValue,
              calories: analysisResult.estimated_calories || 0,
              confidence: confidence,
              estimatedWeight: analysisResult.estimated_weight
            },
            actions: [
              { id: 'continue', label: 'Continuer', type: 'save', variant: 'primary' },
              { id: 'retry-photo', label: 'Reprendre une photo', type: 'retry' }
            ]
          }
        };
      }

      // Normaliser les valeurs pour 100g si le backend a calculé pour une portion spécifique
      const normalizedAnalysis = this.normalizeAnalysisFor100g(analysisResult);
      
      // Générer des suggestions de quantité basées sur le produit détecté
      const suggestions = this.generateQuantitySuggestions(normalizedAnalysis);

      return {
        message: `${normalizedAnalysis.detected_foods[0]} détecté ! Quelle quantité ?`,
        awaitingQuantity: true,
        analysis: normalizedAnalysis,
        data: {
          analysis: {
            description: `${normalizedAnalysis.detected_foods[0]} (pour 100g)`,
            protein: normalizedAnalysis.estimated_protein,
            calories: normalizedAnalysis.estimated_calories || 0,
            confidence: confidence,
            estimatedWeight: 100 // Toujours afficher pour 100g
          },
          suggestions
        },
        updateContext: {
          lastAction: 'photo',
          currentProduct: normalizedAnalysis.detected_foods[0],
          pendingAnalysis: normalizedAnalysis
        }
      };

    } catch (error) {
      console.error('Erreur analyse photo:', error);
      return {
        message: "Erreur lors de l'analyse de la photo. Vérifiez votre connexion et réessayez.",
        awaitingQuantity: false,
        data: {
          actions: [
            { id: 'retry-photo', label: 'Reprendre une photo', type: 'retry' },
            { id: 'text-input', label: 'Décrire le repas', type: 'modify' }
          ]
        }
      };
    }
  }

  /**
   * Traitement des entrées vocales
   */
  private async processVoiceInput(
    transcribedText: string,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    try {
      // Le texte est déjà transcrit par BaseVoiceInput
      // On le traite comme une entrée texte normale
      return await this.processTextInput(transcribedText, {
        ...context,
        lastAction: 'voice'
      });

    } catch (error) {
      console.error('Erreur analyse vocale:', error);
      return this.createErrorResponse(error as Error);
    }
  }

  /**
   * Traitement des produits scannés
   */
  private async processScanInput(
    input: string,
    context: ConversationContext,
    attachments?: { photo?: string; audio?: string; productData?: any }
  ): Promise<ChatProcessorResponse> {
    try {
      const productData = attachments?.productData;
      
      if (!productData) {
        return {
          message: "Aucune donnée de produit reçue. Veuillez réessayer le scan.",
          awaitingQuantity: false,
          data: {
            actions: [
              { id: 'retry-scan', label: 'Scanner à nouveau', type: 'retry' }
            ]
          }
        };
      }

      // Convertir les données OpenFoodFacts au format d'analyse standard
      const analysis = {
        detected_foods: [productData.name],
        estimated_protein: productData.nutritionalData.protein,
        estimated_calories: productData.nutritionalData.calories,
        estimated_carbs: productData.nutritionalData.carbohydrates,
        estimated_fat: productData.nutritionalData.fat,
        estimated_fiber: productData.nutritionalData.fiber,
        estimated_sugar: productData.nutritionalData.sugar,
        estimated_weight: 100, // OpenFoodFacts data is per 100g
        confidence_score: productData.confidence,
        source: 'barcode_scan'
      };

      // Générer des suggestions de quantité
      const suggestions = this.generateQuantitySuggestions(analysis);

      return {
        message: `${productData.name}${productData.brand ? ` (${productData.brand})` : ''} détecté ! Quelle quantité avez-vous consommée ?`,
        awaitingQuantity: true,
        analysis,
        data: {
          analysis: {
            description: `${productData.name} (pour 100g)`,
            protein: productData.nutritionalData.protein,
            calories: productData.nutritionalData.calories,
            confidence: productData.confidence,
            estimatedWeight: 100
          },
          suggestions
        },
        updateContext: {
          lastAction: 'scan',
          currentProduct: productData.name,
          pendingAnalysis: analysis
        }
      };

    } catch (error) {
      console.error('Erreur traitement scan:', error);
      return this.createErrorResponse(error as Error);
    }
  }

  /**
   * Traitement des quantités
   */
  private async processQuantityInput(
    input: string,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    if (!context.pendingAnalysis) {
      return {
        message: "Je n'ai pas d'analyse en cours. Décrivez d'abord votre repas.",
        awaitingQuantity: false
      };
    }

    // Parser la quantité avec QuantityParser
    const quantityResult = QuantityParser.parseQuantity(input);
    
    if (quantityResult.confidence < 0.5) {
      return {
        message: "Je n'ai pas bien compris la quantité. Pouvez-vous être plus précis ? (ex: '150g', '2 portions', '1 assiette')",
        awaitingQuantity: true,
        data: {
          suggestions: this.generateQuantitySuggestions(context.pendingAnalysis)
        }
      };
    }

    // Calculer les valeurs nutritionnelles finales
    const finalNutrition = this.calculateFinalNutrition(
      context.pendingAnalysis,
      quantityResult
    );

    return {
      message: "✅ Parfait ! Voici votre repas final :",
      awaitingQuantity: false,
      analysis: finalNutrition,
      data: {
        analysis: finalNutrition,
        actions: [
          { id: 'save', label: 'Sauvegarder', type: 'save', variant: 'primary' },
          { id: 'modify', label: 'Modifier', type: 'modify', variant: 'secondary' }
        ]
      },
      updateContext: {
        lastQuantity: input,
        pendingAnalysis: null
      }
    };
  }

  /**
   * Traitement des commandes
   */
  private async processCommandInput(
    input: string,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    const command = this.parseStructuredCommand(input);
    if (command) {
      return await this.processStructuredCommand(command, context);
    }

    return {
      message: "Commande non reconnue. Tapez 'aide' pour voir les commandes disponibles.",
      awaitingQuantity: false
    };
  }

  /**
   * Analyse normale avec TextAnalysisService ou API backend
   */
  private async processNormalTextAnalysis(
    input: string,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    try {
      // Vérifier si une quantité est déjà présente dans l'input
      const quantityResult = QuantityParser.parseQuantity(input);
      const hasQuantity = quantityResult.confidence > 0.5;
      
      // Si une quantité est détectée, extraire juste la description de l'aliment
      let foodDescription = input;
      if (hasQuantity) {
        // Enlever la quantité du texte pour analyser seulement l'aliment
        foodDescription = this.removeQuantityFromText(input, quantityResult);
      }
      

      // Essayer d'abord avec l'API backend en utilisant la description de l'aliment sans quantité
      const rawAnalysisResult = await AnalysisService.analyzeTextMeal(foodDescription);
      
      // Corriger les valeurs nutritionnelles incorrectes du backend
      const analysisResult = this.correctBackendNutritionValues(rawAnalysisResult, foodDescription);


      if (analysisResult && analysisResult.estimated_protein && analysisResult.estimated_protein > 0) {
        
        // Si une quantité est détectée, calculer directement le résultat final
        if (hasQuantity) {
          // Détecter si le backend a déjà pris en compte la quantité
          const shouldApplyMultiplier = this.shouldApplyQuantityMultiplier(analysisResult, quantityResult, foodDescription);
          const finalNutrition = this.calculateFinalNutrition(analysisResult, quantityResult, shouldApplyMultiplier);
          
          return {
            message: "✅ Parfait ! Voici votre repas :",
            awaitingQuantity: false,
            analysis: finalNutrition,
            data: {
              analysis: finalNutrition,
              actions: [
                { id: 'save', label: 'Sauvegarder', type: 'save', variant: 'primary' },
                { id: 'modify', label: 'Modifier', type: 'modify', variant: 'secondary' }
              ]
            },
            updateContext: {
              lastAction: 'text',
              currentProduct: analysisResult.detected_foods[0],
              lastQuantity: quantityResult.originalText,
              pendingAnalysis: null
            }
          };
        }

        // Normaliser les valeurs pour 100g si nécessaire, puis demander la quantité
        const normalizedAnalysis = this.normalizeAnalysisFor100g(analysisResult);
        const suggestions = this.generateQuantitySuggestions(normalizedAnalysis);

        return {
          message: `${normalizedAnalysis.detected_foods[0]} détecté ! Quelle quantité ?`,
          awaitingQuantity: true,
          analysis: normalizedAnalysis,
          data: {
            analysis: {
              description: `${normalizedAnalysis.detected_foods[0]} (pour 100g)`,
              protein: normalizedAnalysis.estimated_protein,
              calories: normalizedAnalysis.estimated_calories || 0,
              confidence: normalizedAnalysis.confidence_score,
              estimatedWeight: 100 // Toujours afficher pour 100g
            },
            suggestions
          },
          updateContext: {
            lastAction: 'text',
            currentProduct: normalizedAnalysis.detected_foods[0],
            pendingAnalysis: normalizedAnalysis
          }
        };
      }

      // Fallback sur TextAnalysisService local
      const localResult = await TextAnalysisService.analyzeText(input);
      
      if (localResult.result) {
        
        // Si une quantité est détectée, calculer directement le résultat final
        if (hasQuantity) {
          const finalNutrition = this.calculateFinalNutrition(localResult.result, quantityResult);
          
          return {
            message: "✅ Parfait ! Voici votre repas :",
            awaitingQuantity: false,
            analysis: finalNutrition,
            data: {
              analysis: finalNutrition,
              actions: [
                { id: 'save', label: 'Sauvegarder', type: 'save', variant: 'primary' },
                { id: 'modify', label: 'Modifier', type: 'modify', variant: 'secondary' }
              ]
            },
            updateContext: {
              lastAction: 'text',
              currentProduct: localResult.result.detectedFoods[0] || input,
              lastQuantity: quantityResult.originalText,
              pendingAnalysis: null
            }
          };
        }

        // Sinon, demander la quantité comme avant
        const suggestions = this.generateDefaultQuantitySuggestions();

        return {
          message: `Analyse locale réussie ! Quelle quantité ?`,
          awaitingQuantity: true,
          data: {
            analysis: {
              description: localResult.result.detectedFoods[0] || input,
              protein: localResult.result.protein,
              calories: localResult.result.calories || 0,
              confidence: localResult.result.confidence
            },
            suggestions
          },
          updateContext: {
            lastAction: 'text',
            currentProduct: localResult.result.detectedFoods[0] || input,
            pendingAnalysis: localResult.result
          }
        };
      }

      // Aucune analyse n'a fonctionné
      return {
        message: `Je n'ai pas pu analyser "${input}". Pouvez-vous être plus précis ou utiliser une photo ?`,
        awaitingQuantity: false,
        data: {
          suggestions: [
            { label: "Prendre une photo", value: "photo", weight: 0 },
            { label: "Saisie manuelle", value: "manual", weight: 0 }
          ]
        }
      };

    } catch (error) {
      console.error('Erreur analyse texte:', error);
      return this.createErrorResponse(error as Error);
    }
  }

  /**
   * Génération de suggestions de quantité contextuelles
   */
  private generateQuantitySuggestions(analysis: MealAnalysisResult): QuantitySuggestion[] {
    const productName = analysis.detected_foods[0]?.toLowerCase() || '';
    
    // Suggestions spécifiques par type de produit
    if (productName.includes('pâtes') || productName.includes('pasta')) {
      return [
        { label: "100g", value: "100g", weight: 100, isDefault: true },
        { label: "150g", value: "150g", weight: 150 },
        { label: "200g", value: "200g", weight: 200 },
        { label: "1 portion", value: "1 portion", weight: 150 }
      ];
    }

    if (productName.includes('salade')) {
      return [
        { label: "1 portion", value: "1 portion", weight: 200, isDefault: true },
        { label: "200g", value: "200g", weight: 200 },
        { label: "300g", value: "300g", weight: 300 }
      ];
    }

    if (productName.includes('chips') || productName.includes('pringles')) {
      return [
        { label: "30g", value: "30g", weight: 30, isDefault: true },
        { label: "50g", value: "50g", weight: 50 },
        { label: "75g", value: "75g", weight: 75 },
        { label: "1 portion", value: "1 portion", weight: 30 }
      ];
    }

    // Biscuits et gâteaux
    if (productName.includes('biscuit') || productName.includes('cookie') || 
        productName.includes('prince') || productName.includes('lu') ||
        productName.includes('oreo') || productName.includes('petit beurre') ||
        productName.includes('chocolat') && (productName.includes('biscuit') || productName.includes('prince'))) {
      return [
        { label: "1 biscuit (~20g)", value: "1 biscuit", weight: 20, isDefault: true },
        { label: "2 biscuits (~40g)", value: "2 biscuits", weight: 40 },
        { label: "3 biscuits (~60g)", value: "3 biscuits", weight: 60 },
        { label: "50g", value: "50g", weight: 50 },
        { label: "100g", value: "100g", weight: 100 }
      ];
    }

    // Suggestions par défaut
    return this.generateDefaultQuantitySuggestions();
  }

  private generateDefaultQuantitySuggestions(): QuantitySuggestion[] {
    return [
      { label: "1 portion", value: "1 portion", weight: 150, isDefault: true },
      { label: "100g", value: "100g", weight: 100 },
      { label: "200g", value: "200g", weight: 200 },
      { label: "300g", value: "300g", weight: 300 }
    ];
  }

  /**
   * Calcul des valeurs nutritionnelles finales
   */
  private calculateFinalNutrition(analysis: any, quantityResult: QuantityParseResult, shouldApplyMultiplier: boolean = true) {
    const baseProtein = analysis.estimated_protein || analysis.protein || 0;
    const baseCalories = analysis.estimated_calories || analysis.calories || 0;
    const baseWeight = analysis.estimated_weight || 100;


    // Déterminer si les données viennent d'OpenFoodFacts (produits emballés)
    const isOpenFoodFactsData = this.isOpenFoodFactsSource(analysis);
    
    // Déterminer si c'est une unité de pièce (oeuf, pomme, etc.)
    const isUnitBasedFood = quantityResult.parsedComponents.unitType === 'piece' && quantityResult.parsedComponents.foodType;
    
    
    // Si on ne doit pas appliquer le multiplicateur (le backend a déjà calculé avec la quantité)
    if (!shouldApplyMultiplier) {
      const confidence = Math.max(0.8, parseFloat(analysis.confidence_score || analysis.confidence || 0.8));
      return {
        description: `${analysis.detected_foods?.[0] || analysis.detectedFoods?.[0] || 'Repas'} - ${quantityResult.originalText}`,
        protein: parseFloat(baseProtein) || 0,
        calories: Math.round(baseCalories),
        confidence,
        estimatedWeight: quantityResult.multiplier * 100
      };
    }
    
    if (isOpenFoodFactsData) {
      // 📦 PRODUITS EMBALLÉS (OpenFoodFacts)
      // Les données sont pour 100g, on applique le ratio de quantité
      const ratio = quantityResult.multiplier;
      const targetWeight = ratio * 100;

      return {
        description: `${analysis.detected_foods?.[0] || analysis.detectedFoods?.[0] || 'Repas'} - ${quantityResult.originalText}`,
        protein: Math.round((baseProtein * ratio) * 10) / 10,
        calories: Math.round(baseCalories * ratio),
        confidence: analysis.confidence_score || analysis.confidence || 0.8,
        estimatedWeight: targetWeight
      };
      
    } else if (isUnitBasedFood) {
      // 🥚 ALIMENTS NATURELS PAR UNITÉ (œufs, fruits, biscuits, etc.)
      // Les données sont pour 100g, on applique le multiplier pour la quantité d'unités
      const ratio = quantityResult.multiplier; // Ex: 1 biscuit = 0.2 (20g/100g)
      const targetWeight = ratio * 100;
      
      return {
        description: `${analysis.detected_foods?.[0] || analysis.detectedFoods?.[0] || 'Repas'} - ${quantityResult.originalText}`,
        protein: Math.round((baseProtein * ratio) * 10) / 10,
        calories: Math.round(baseCalories * ratio),
        confidence: analysis.confidence_score || analysis.confidence || 0.8,
        estimatedWeight: targetWeight
      };
      
    } else {
      // 🍽️ AUTRES CAS (portions, grammes de plats cuisinés, etc.)
      // Appliquer le ratio classique
      const ratio = quantityResult.multiplier;
      const targetWeight = ratio * 100;

      return {
        description: `${analysis.detected_foods?.[0] || analysis.detectedFoods?.[0] || 'Repas'} - ${quantityResult.originalText}`,
        protein: Math.round((baseProtein * ratio) * 10) / 10,
        calories: Math.round(baseCalories * ratio),
        confidence: analysis.confidence_score || analysis.confidence || 0.8,
        estimatedWeight: targetWeight
      };
    }
  }

  /**
   * Détecter si les données viennent d'OpenFoodFacts
   */
  private isOpenFoodFactsSource(analysis: any): boolean {
    // Vérifier les indicateurs d'OpenFoodFacts
    if (analysis.source && analysis.source === 'OpenFoodFacts') return true;
    if (analysis.explanation && analysis.explanation.includes('OpenFoodFacts')) return true;
    if (analysis.breakdown && analysis.breakdown.source === 'OpenFoodFacts') return true;
    
    // Vérifier si c'est un produit emballé typique (avec code-barres, marque, etc.)
    const productName = analysis.detected_foods?.[0] || analysis.detectedFoods?.[0] || '';
    const isPackagedProduct = this.isPackagedProductName(productName);
    
    return isPackagedProduct;
  }

  /**
   * Détecter si c'est un nom de produit emballé
   */
  private isPackagedProductName(productName: string): boolean {
    const packagedIndicators = [
      'pringles', 'chips', 'biscuit', 'cookie', 'yaourt', 'yogurt',
      'céréales', 'pasta', 'sauce', 'conserve', 'boîte', 'paquet',
      'nutella', 'coca', 'pepsi', 'fanta', 'sprite'
    ];
    
    const lowerName = productName.toLowerCase();
    return packagedIndicators.some(indicator => lowerName.includes(indicator));
  }

  /**
   * Parsing des commandes structurées
   */
  private parseStructuredCommand(input: string): StructuredCommand | null {
    const lowerInput = input.toLowerCase().trim();

    // Commande d'entrée manuelle
    const manualMatch = lowerInput.match(/^entrée manuelle\s*:\s*(.+?)(?:\s*\|\s*protéines?\s*:\s*(\d+(?:\.\d+)?)g?)?(?:\s*\|\s*calories?\s*:\s*(\d+))?$/i);
    if (manualMatch) {
      return {
        type: 'manual_entry',
        params: {
          description: manualMatch[1],
          protein: manualMatch[2] ? parseFloat(manualMatch[2]) : null,
          calories: manualMatch[3] ? parseInt(manualMatch[3]) : null
        }
      };
    }

    // Autres commandes simples
    if (lowerInput === 'aide' || lowerInput === 'help') {
      return { type: 'help', params: {} };
    }

    return null;
  }

  /**
   * Traitement des commandes structurées
   */
  private async processStructuredCommand(
    command: StructuredCommand,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    switch (command.type) {
      case 'manual_entry':
        return {
          message: "✅ Entrée manuelle enregistrée !",
          awaitingQuantity: false,
          data: {
            analysis: {
              description: command.params.description,
              protein: command.params.protein || 0,
              calories: command.params.calories || 0,
              confidence: 1.0
            },
            actions: [
              { id: 'save', label: 'Sauvegarder', type: 'save', variant: 'primary' },
              { id: 'modify', label: 'Modifier', type: 'modify', variant: 'secondary' }
            ]
          }
        };

      case 'help':
        return {
          message: `Commandes disponibles :
          
• **Saisie normale** : "pâtes au poulet"
• **Entrée manuelle** : "entrée manuelle : salade | protéines : 30g | calories : 500"
• **Quantités** : "150g", "2 portions", "1 assiette"
• **Modifications** : "plus", "moins", "double", "moitié"
• **Actions** : Utilisez les icônes 📷 🎤 🔍`,
          awaitingQuantity: false
        };

      default:
        return {
          message: "Commande non implémentée.",
          awaitingQuantity: false
        };
    }
  }

  /**
   * Normaliser une analyse pour 100g si le backend a calculé pour une portion spécifique
   */
  private normalizeAnalysisFor100g(analysis: any): any {
    if (!analysis || !analysis.estimated_weight) {
      return analysis;
    }

    const estimatedWeight = parseFloat(analysis.estimated_weight) || 100;
    
    // Si le backend a déjà calculé pour 100g, pas besoin de normaliser
    if (estimatedWeight === 100) {
      return analysis;
    }
    
    // Si le backend a calculé pour une portion spécifique (ex: 30g), normaliser pour 100g
    const ratio = 100 / estimatedWeight;
    
    console.log(`🔄 Normalisation pour 100g: ${estimatedWeight}g → 100g (ratio: ${ratio})`);
    
    return {
      ...analysis,
      estimated_protein: Math.round((parseFloat(analysis.estimated_protein) || 0) * ratio * 10) / 10,
      estimated_calories: Math.round((parseFloat(analysis.estimated_calories) || 0) * ratio),
      estimated_carbs: analysis.estimated_carbs ? Math.round((parseFloat(analysis.estimated_carbs) || 0) * ratio * 10) / 10 : null,
      estimated_fat: analysis.estimated_fat ? Math.round((parseFloat(analysis.estimated_fat) || 0) * ratio * 10) / 10 : null,
      estimated_fiber: analysis.estimated_fiber ? Math.round((parseFloat(analysis.estimated_fiber) || 0) * ratio * 10) / 10 : null,
      estimated_weight: 100, // Toujours normaliser à 100g
      explanation: `${analysis.explanation || ''} (normalisé pour 100g)`
    };
  }

  /**
   * Corriger les valeurs nutritionnelles incorrectes du backend
   */
  private correctBackendNutritionValues(analysis: any, foodDescription: string): any {
    if (!analysis || !analysis.estimated_protein) {
      return analysis;
    }

    // Facteurs de correction pour les aliments avec des valeurs backend incorrectes
    // Format: 'nom_aliment': valeur_correcte / valeur_backend_incorrecte
    const corrections = {
      'poulet': 23/31,      // Backend dit 31g, devrait être 23g pour 100g
      'chicken': 23/31,     // Même correction pour l'anglais
      'boeuf': 26/35,       // Backend surestime souvent le boeuf
      'beef': 26/35,        // Anglais
      'saumon': 25/32,      // Backend surestime le saumon
      'salmon': 25/32,      // Anglais
      'thon': 30/38,        // Backend surestime le thon
      'tuna': 30/38,        // Anglais
      'dinde': 24/30,       // Backend surestime la dinde
      'turkey': 24/30,      // Anglais
      'porc': 25/32,        // Backend surestime le porc
      'pork': 25/32,        // Anglais
      'jambon': 20/28,      // Backend surestime le jambon
      'ham': 20/28,         // Anglais
      'oeuf': 12/15,        // Backend surestime les oeufs
      'egg': 12/15,         // Anglais
      'fromage': 14/20,     // Backend surestime les fromages
      'cheese': 14/20,      // Anglais
      'yaourt': 4/6,        // Backend surestime les yaourts nature
      'yogurt': 4/6,        // Anglais
    };

    const food = foodDescription.toLowerCase();
    
    for (const [foodType, factor] of Object.entries(corrections)) {
      if (food.includes(foodType)) {
        // Appliquer la correction
        const correctedProtein = Math.round(parseFloat(analysis.estimated_protein) * factor);
        
        console.log(`🔧 Correction protéine ${foodType}: ${analysis.estimated_protein}g → ${correctedProtein}g`);
        
        return {
          ...analysis,
          estimated_protein: correctedProtein.toString(),
          // Garder les autres valeurs inchangées
        };
      }
    }

    // Aucune correction nécessaire
    return analysis;
  }

  /**
   * Obtenir la valeur typique de protéines pour 100g d'un aliment
   */
  private getTypicalProteinFor100g(foodDescription: string): number {
    const food = foodDescription.toLowerCase();
    
    if (food.includes('poulet') || food.includes('chicken')) return 23;
    if (food.includes('boeuf') || food.includes('beef')) return 26;
    if (food.includes('saumon') || food.includes('salmon')) return 25;
    if (food.includes('thon') || food.includes('tuna')) return 30;
    if (food.includes('oeuf') || food.includes('egg')) return 12;
    if (food.includes('porc') || food.includes('pork')) return 25;
    if (food.includes('dinde') || food.includes('turkey')) return 24;
    if (food.includes('jambon') || food.includes('ham')) return 20;
    if (food.includes('fromage') || food.includes('cheese')) return 14;
    if (food.includes('yaourt') || food.includes('yogurt')) return 17;
    if (food.includes('tofu')) return 12;
    if (food.includes('haricot') || food.includes('bean')) return 8;
    if (food.includes('lentille') || food.includes('lentil')) return 9;
    if (food.includes('quinoa')) return 4;
    if (food.includes('riz') || food.includes('rice')) return 3;
    if (food.includes('pâte') || food.includes('pasta')) return 5;
    
    return 20; // Valeur par défaut conservatrice
  }

  /**
   * Détecter si le backend a probablement pris en compte la quantité dans l'input original
   */
  private detectIfBackendParsedQuantity(
    originalInput: string,
    cleanedInput: string,
    baseProtein: number,
    multiplier: number
  ): boolean {
    // Si l'input original contenait une quantité mais pas le cleaned input
    const inputHadQuantity = originalInput !== cleanedInput;
    
    if (inputHadQuantity) {
      const typicalFor100g = this.getTypicalProteinFor100g(cleanedInput);
      const tolerance = 1.2; // 20% de tolérance
      
      // Si le backend retourne plus que la valeur typique pour 100g + tolérance,
      // c'est qu'il a probablement pris en compte la quantité de l'input original
      if (baseProtein > (typicalFor100g * tolerance)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Déterminer si on doit appliquer le multiplicateur de quantité
   */
  private shouldApplyQuantityMultiplier(
    analysis: any, 
    quantityResult: QuantityParseResult, 
    foodDescription: string
  ): boolean {
    // Le backend est intelligent et fait déjà le calcul quand il reçoit une quantité
    // Si on a extrait la quantité de l'input, le backend a analysé seulement l'aliment
    // Si le backend a reçu l'input original avec quantité, il a déjà fait le calcul
    
    const originalInput = quantityResult.originalText;
    
    // Si on a vraiment réussi à nettoyer l'input (foodDescription très différent de l'original)
    // alors le backend a analysé seulement l'aliment et on doit appliquer le multiplicateur
    if (foodDescription.length < originalInput.length * 0.6) {
      return true; // Appliquer le multiplicateur
    }
    
    // Sinon, le backend a probablement reçu l'input avec la quantité et a déjà fait le calcul
    return false; // Ne pas appliquer le multiplicateur
  }

  /**
   * Enlever la quantité du texte pour ne garder que la description de l'aliment
   */
  private removeQuantityFromText(input: string, quantityResult: QuantityParseResult): string {
    // Patterns pour identifier et supprimer les quantités
    const quantityPatterns = [
      /(\d+(?:[.,]\d+)?)\s*gr?(?:ammes?)?\s*/gi,  // 150g, 150gr, 150grammes
      /(\d+(?:[.,]\d+)?)\s*kg(?:ilogrammes?)?\s*/gi,
      /(\d+(?:[.,]\d+)?)\s*ml(?:illilitres?)?\s*/gi,
      /(\d+(?:[.,]\d+)?)\s*l(?:itres?)?\s*/gi,
      /(\d+(?:[.,]\d+)?)\s*oz\s*/gi,
      /(\d+(?:[.,]\d+)?)\s*lb\s*/gi,
      /(\d+(?:[.,]\d+)?)\s*portions?\s*/gi,
      /(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*/gi,
      /(\d+)\s*(assiettes?|bols?|tranches?|morceaux?)\s*/gi
    ];

    let cleanedText = input.trim();
    
    // Supprimer les patterns de quantité
    for (const pattern of quantityPatterns) {
      cleanedText = cleanedText.replace(pattern, '').trim();
    }
    
    // Nettoyer les mots de liaison en début : "de", "du", "des", "d'"
    cleanedText = cleanedText.replace(/^(de\s+|du\s+|des\s+|d'\s*)/gi, '').trim();
    
    // Nettoyer les espaces multiples et la ponctuation en début/fin
    cleanedText = cleanedText.replace(/\s+/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '');
    
    // Si le texte devient vide ou trop court, garder l'original
    if (cleanedText.length < 3) {
      return input;
    }
    
    return cleanedText;
  }

  /**
   * Utilitaires
   */
  private isQuantityInput(input: string): boolean {
    const quantityResult = QuantityParser.parseQuantity(input);
    return quantityResult.confidence > 0.3;
  }

  private parseModificationCommand(input: string): string | null {
    const lowerInput = input.toLowerCase().trim();
    const modifications = ['plus', 'moins', 'double', 'moitié', 'triple', 'quart'];
    return modifications.find(mod => lowerInput.includes(mod)) || null;
  }

  private async processQuantityModification(
    modification: string,
    context: ConversationContext
  ): Promise<ChatProcessorResponse> {
    // TODO: Implémenter la modification des quantités
    return {
      message: `Modification "${modification}" appliquée !`,
      awaitingQuantity: false
    };
  }

  private createErrorResponse(error: Error): ChatProcessorResponse {
    return {
      message: "Désolé, une erreur s'est produite. Pouvez-vous réessayer ?",
      awaitingQuantity: false,
      data: {
        actions: [
          { id: 'retry', label: 'Réessayer', type: 'retry', variant: 'primary' }
        ]
      }
    };
  }
}

export default ChatProcessor;