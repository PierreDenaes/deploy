// Service d'intelligence artificielle avec OpenAI
import { openai, AI_CONFIG, AI_PROMPTS, AIError, AI_ERROR_CODES, validateAIResponse, validateVisionResponse, AIAnalysisResult, AIVisionResult, NutritionalData, ProductType, DataSource, OCRExtractionResult, ProductInterpretationResult } from '../config/openai';
import { QuantityParserService } from './quantity-parser.service';
import { FallbackNutritionService } from './fallback-nutrition.service';
// import { LocalOpenFoodFactsService } from './local-openfoodfacts.service';

export class AIService {
  // Analyser un texte de description de repas
  static async analyzeTextMeal(description: string): Promise<AIAnalysisResult> {
    let retries = 0;
    
    while (retries <= AI_CONFIG.maxRetries) {
      try {
        console.log(`🤖 Analyse IA du texte (tentative ${retries + 1}):`, description.substring(0, 100));
        
        const completion = await openai.chat.completions.create({
          model: AI_CONFIG.textModel,
          messages: [
            {
              role: 'system',
              content: AI_PROMPTS.textAnalysis
            },
            {
              role: 'user',
              content: `Analyse ce repas: "${description}"`
            }
          ],
          max_tokens: AI_CONFIG.maxTokens,
          temperature: AI_CONFIG.temperature,
        }, {
          timeout: AI_CONFIG.timeout,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new AIError('Réponse vide de l\'IA', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        // Parser la réponse JSON avec nettoyage intelligent
        let aiResponse: AIAnalysisResult;
        try {
          // Nettoyer la réponse pour extraire uniquement le JSON
          const cleanedResponse = this.cleanJSONResponse(responseText);
          const parsed = JSON.parse(cleanedResponse);
          aiResponse = this.normalizeAIResponse(parsed);
        } catch (parseError) {
          console.error('Erreur parsing JSON IA:', parseError);
          console.error('Réponse brute:', responseText);
          
          // Tentative de récupération avec extraction de JSON plus agressive
          try {
            const extractedJSON = this.extractJSONFromText(responseText);
            const parsed = JSON.parse(extractedJSON);
            aiResponse = this.normalizeAIResponse(parsed);
            console.log('✅ Récupération JSON réussie');
          } catch (secondParseError) {
            throw new AIError('Réponse IA invalide (JSON malformé)', AI_ERROR_CODES.INVALID_RESPONSE, true);
          }
        }

        // Valider la structure de la réponse
        if (!validateAIResponse(aiResponse)) {
          console.error('Structure réponse IA invalide:', aiResponse);
          throw new AIError('Structure de réponse IA invalide', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        // Vérifier le niveau de confiance
        if (aiResponse.confidence < AI_CONFIG.confidenceThreshold) {
          console.warn(`⚠️ Confiance IA faible: ${aiResponse.confidence}`);
          aiResponse.requiresManualReview = true;
        }

        console.log(`✅ Analyse IA réussie (confiance: ${aiResponse.confidence}, type: ${aiResponse.productType || 'unknown'})`);
        return aiResponse;

      } catch (error: any) {
        retries++;
        
        // Gestion des erreurs spécifiques
        if (error.code === 'rate_limit_exceeded') {
          const waitTime = Math.pow(2, retries) * 1000; // Backoff exponentiel
          console.warn(`⏱️ Rate limit atteint, attente ${waitTime}ms...`);
          
          if (retries <= AI_CONFIG.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            throw new AIError('Limite de taux dépassée', AI_ERROR_CODES.RATE_LIMIT, false);
          }
        }
        
        if (error.code === 'timeout') {
          throw new AIError('Timeout de l\'analyse IA', AI_ERROR_CODES.TIMEOUT, true);
        }

        if (error instanceof AIError && !error.retryable) {
          throw error;
        }

        if (retries > AI_CONFIG.maxRetries) {
          console.error('❌ Échec final analyse IA:', error);
          throw new AIError(
            `Échec de l'analyse après ${AI_CONFIG.maxRetries} tentatives`,
            AI_ERROR_CODES.API_ERROR,
            false
          );
        }

        console.warn(`⚠️ Erreur IA, retry ${retries}/${AI_CONFIG.maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    throw new AIError('Nombre maximum de tentatives atteint', AI_ERROR_CODES.API_ERROR, false);
  }

  // Analyser une image d'emballage/étiquette avec Vision API (sans validation préalable)
  static async analyzePackagingImage(imageUrl: string, description?: string): Promise<AIVisionResult> {
    console.log(`📦 Analyse spécifique emballage/étiquette:`, imageUrl.substring(0, 100));
    return this.analyzeImageMeal(imageUrl, description);
  }

  // Nouvelle méthode : Analyse complète de produit en deux étapes (OCR + Interprétation)
  static async analyzeTwoStepProduct(imageUrl: string, description?: string): Promise<AIVisionResult> {
    console.log(`🔍 Début analyse produit en deux étapes:`, imageUrl.substring(0, 100));
    
    try {
      // ÉTAPE 1: Extraction OCR du texte brut
      const ocrResult = await this.extractOCRText(imageUrl);
      console.log(`📄 OCR extrait: ${ocrResult.texte_detecte.substring(0, 200)}...`);
      
      // ÉTAPE 2: Interprétation du produit à partir du texte OCR
      const interpretationResult = await this.interpretProductFromOCR(ocrResult.texte_detecte, description);
      console.log(`🧠 Produit interprété: ${interpretationResult.nom_produit} (${interpretationResult.marque})`);
      
      // Convertir en format AIVisionResult compatible
      const combinedResult = this.mergeOCRAndInterpretation(ocrResult, interpretationResult);
      
      console.log(`✅ Analyse deux étapes réussie: ${combinedResult.nom_produit} - ${combinedResult.protein}g protéines`);
      return combinedResult;
      
    } catch (error) {
      console.error('❌ Erreur analyse deux étapes:', error);
      // Fallback vers l'analyse classique
      console.log('🔄 Fallback vers analyse classique...');
      return this.analyzePackagingImage(imageUrl, description);
    }
  }

  // ÉTAPE 1: Extraction OCR du texte brut
  private static async extractOCRText(imageUrl: string): Promise<OCRExtractionResult> {
    let retries = 0;
    
    while (retries <= AI_CONFIG.maxRetries) {
      try {
        console.log(`📄 Extraction OCR (tentative ${retries + 1}):`, imageUrl.substring(0, 100));
        
        const completion = await openai.chat.completions.create({
          model: AI_CONFIG.visionModel,
          messages: [
            {
              role: 'system',
              content: AI_PROMPTS.ocrExtraction
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extrais tout le texte visible sur cet emballage alimentaire:'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high' // Haute résolution pour meilleur OCR
                  }
                }
              ]
            }
          ],
          max_tokens: AI_CONFIG.maxTokens,
          temperature: 0.1, // Très faible pour OCR précis
        }, {
          timeout: AI_CONFIG.timeout,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new AIError('Réponse OCR vide', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        // Parser la réponse JSON OCR
        const cleanedResponse = this.cleanJSONResponse(responseText);
        const ocrResult: OCRExtractionResult = JSON.parse(cleanedResponse);
        
        if (!ocrResult.texte_detecte || ocrResult.texte_detecte.trim().length < 10) {
          throw new AIError('Texte OCR insuffisant', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        console.log(`✅ OCR réussi: ${ocrResult.texte_detecte.length} caractères extraits`);
        return ocrResult;

      } catch (error: any) {
        retries++;
        
        if (retries > AI_CONFIG.maxRetries) {
          console.error('❌ Échec final extraction OCR:', error);
          throw new AIError(`Échec OCR après ${AI_CONFIG.maxRetries} tentatives`, AI_ERROR_CODES.API_ERROR, false);
        }

        console.warn(`⚠️ Erreur OCR, retry ${retries}/${AI_CONFIG.maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    throw new AIError('Nombre maximum de tentatives OCR atteint', AI_ERROR_CODES.API_ERROR, false);
  }

  // ÉTAPE 2: Interprétation du produit à partir du texte OCR
  private static async interpretProductFromOCR(ocrText: string, description?: string): Promise<ProductInterpretationResult> {
    let retries = 0;
    
    while (retries <= AI_CONFIG.maxRetries) {
      try {
        console.log(`🧠 Interprétation produit (tentative ${retries + 1})`);
        
        const promptWithOCR = AI_PROMPTS.productInterpretation.replace(
          'À partir du texte OCR extrait d\'un emballage alimentaire',
          `À partir du texte OCR suivant extrait d'un emballage alimentaire:\n\n"${ocrText}"\n\n${description ? `\nInformation additionnelle: ${description}\n` : ''}`
        );
        
        const completion = await openai.chat.completions.create({
          model: AI_CONFIG.textModel, // Utiliser le modèle texte pour l'interprétation
          messages: [
            {
              role: 'system',
              content: promptWithOCR
            },
            {
              role: 'user',
              content: `Analyse ce texte OCR et identifie le produit alimentaire avec ses caractéristiques nutritionnelles.`
            }
          ],
          max_tokens: AI_CONFIG.maxTokens,
          temperature: 0.2, // Faible température pour analyse précise
        }, {
          timeout: AI_CONFIG.timeout,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new AIError('Réponse interprétation vide', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        // Parser la réponse JSON d'interprétation
        const cleanedResponse = this.cleanJSONResponse(responseText);
        const interpretationResult: ProductInterpretationResult = JSON.parse(cleanedResponse);
        
        if (!interpretationResult.nom_produit || interpretationResult.nom_produit.trim().length === 0) {
          throw new AIError('Produit non identifié dans l\'interprétation', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        console.log(`✅ Interprétation réussie: ${interpretationResult.nom_produit} (${interpretationResult.marque})`);
        return interpretationResult;

      } catch (error: any) {
        retries++;
        
        if (retries > AI_CONFIG.maxRetries) {
          console.error('❌ Échec final interprétation:', error);
          throw new AIError(`Échec interprétation après ${AI_CONFIG.maxRetries} tentatives`, AI_ERROR_CODES.API_ERROR, false);
        }

        console.warn(`⚠️ Erreur interprétation, retry ${retries}/${AI_CONFIG.maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    throw new AIError('Nombre maximum de tentatives interprétation atteint', AI_ERROR_CODES.API_ERROR, false);
  }

  // Fusionner les résultats OCR et interprétation en format AIVisionResult
  private static mergeOCRAndInterpretation(ocrResult: OCRExtractionResult, interpretationResult: ProductInterpretationResult): AIVisionResult {
    // Calculer les valeurs nutritionnelles pour la portion estimée
    const nutrition = interpretationResult.informations_nutritionnelles;
    const portionWeight = this.extractPortionWeightFromInterpretation(interpretationResult);
    
    // Déterminer si c'est pour 100g ou par portion
    const isFor100g = nutrition.unite_reference.toLowerCase().includes('100g');
    const baseProtein = nutrition.proteines || 0;
    const baseCalories = nutrition.calories || 0;
    
    // Calculer pour la portion réelle si les valeurs sont pour 100g
    let finalProtein = baseProtein;
    let finalCalories = baseCalories;
    
    if (isFor100g && portionWeight > 0 && portionWeight !== 100) {
      const ratio = portionWeight / 100;
      finalProtein = Math.round(baseProtein * ratio * 10) / 10;
      finalCalories = Math.round(baseCalories * ratio);
    }

    return {
      // Informations de base
      foods: [interpretationResult.nom_produit],
      protein: finalProtein,
      calories: finalCalories,
      carbs: nutrition.glucides || 0,
      fat: nutrition.lipides || 0,
      fiber: nutrition.fibres || 0,
      confidence: interpretationResult.confidence_ocr,
      explanation: `Analyse en deux étapes: OCR puis interprétation. Produit: ${interpretationResult.marque} ${interpretationResult.nom_produit} (${interpretationResult.type}). Valeurs nutritionnelles ${nutrition.unite_reference}: ${baseProtein}g protéines.`,
      
      // Champs Vision
      detectedItems: [{
        name: `${interpretationResult.marque} ${interpretationResult.nom_produit}`,
        confidence: interpretationResult.confidence_ocr,
      }],
      imageQuality: 'good',
      requiresManualReview: interpretationResult.confidence_ocr < 0.7,
      
      // Métadonnées produit
      productType: 'PACKAGED_PRODUCT' as ProductType,
      dataSource: 'OFFICIAL_LABEL' as DataSource,
      isExactValue: true,
      productName: `${interpretationResult.marque} ${interpretationResult.nom_produit}`,
      brand: interpretationResult.marque === 'marque_non_visible' ? undefined : interpretationResult.marque,
      
      // Nouveaux champs d'emballage
      nom_produit: interpretationResult.nom_produit,
      marque: interpretationResult.marque,
      type: interpretationResult.type,
      mentions_specifiques: interpretationResult.mentions_specifiques,
      contenu_paquet: interpretationResult.contenu_paquet,
      langue: interpretationResult.langue,
      
      // Données OCR enrichies
      ocr_text: ocrResult.texte_detecte,
      ingredients: interpretationResult.ingredients,
      confidence_ocr: interpretationResult.confidence_ocr,
      enhanced_nutrition: nutrition,
      
      // Données nutritionnelles officielles
      officialNutritionData: nutrition.proteines ? {
        proteinsValue: nutrition.proteines,
        proteinsUnit: isFor100g ? 'pour_100g' : 'par_portion',
        isFromLabel: true
      } : undefined,
    };
  }

  // Extraire le poids de portion à partir de l'interprétation
  private static extractPortionWeightFromInterpretation(interpretation: ProductInterpretationResult): number {
    const contenu = interpretation.contenu_paquet?.toLowerCase() || '';
    
    // Rechercher des patterns de poids
    const weightPatterns = [
      /(\d+)\s*g(?!\s*\/)/i,  // Ne pas matcher "g/100g"
      /(\d+)\s*grammes?/i,
      /(\d+)\s*ml/i,
    ];
    
    for (const pattern of weightPatterns) {
      const match = contenu.match(pattern);
      if (match) {
        const weightStr = match[1] ?? "";
        const weight = parseInt(weightStr);
        if (weight > 5 && weight < 2000) { // Valeurs raisonnables
          return weight;
        }
      }
    }
    
    // Valeurs par défaut selon le type de produit
    const produit = interpretation.nom_produit.toLowerCase();
    if (produit.includes('tranche')) return 25;
    if (produit.includes('yaourt') || produit.includes('yogurt')) return 125;
    if (produit.includes('biscuit') || produit.includes('cookie')) return 10;
    
    return 100; // Défaut 100g
  }

  // Analyser une image de repas avec Vision API
  static async analyzeImageMeal(imageUrl: string, description?: string): Promise<AIVisionResult> {
    let retries = 0;
    
    while (retries <= AI_CONFIG.maxRetries) {
      try {
        console.log(`📸 Analyse IA de l'image (tentative ${retries + 1}):`, imageUrl.substring(0, 100));
        
        const messages: any[] = [
          {
            role: 'system',
            content: AI_PROMPTS.visionAnalysis
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: description 
                  ? `Analyse cette image de repas. Description additionnelle: "${description}"`
                  : 'Analyse cette image de repas et identifie tous les aliments visibles.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high' // Utiliser haute résolution pour meilleure analyse
                }
              }
            ]
          }
        ];

        const completion = await openai.chat.completions.create({
          model: AI_CONFIG.visionModel,
          messages,
          max_tokens: AI_CONFIG.maxTokens,
          temperature: AI_CONFIG.temperature,
        }, {
          timeout: AI_CONFIG.timeout,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new AIError('Réponse vide de l\'IA Vision', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        // Parser la réponse JSON avec nettoyage intelligent
        let aiResponse: AIAnalysisResult;
        try {
          // Nettoyer la réponse pour extraire uniquement le JSON
          const cleanedResponse = this.cleanJSONResponse(responseText);
          const parsed = JSON.parse(cleanedResponse);
          aiResponse = this.normalizeAIResponse(parsed);
          
          // PRIORITÉ 1: Utiliser les données du tableau nutritionnel si disponibles
          if (parsed.officialNutritionData && parsed.officialNutritionData.isFromLabel && parsed.officialNutritionData.proteinsValue) {
            console.log('📊 Tableau nutritionnel détecté sur emballage - utilisation valeurs officielles:', parsed.officialNutritionData);
            
            // Calculer les protéines selon l'unité du tableau
            let finalProteins = parsed.officialNutritionData.proteinsValue;
            if (parsed.officialNutritionData.proteinsUnit === 'pour_100g') {
              // Estimer le poids de la portion et calculer
              const estimatedWeight = this.estimatePortionWeight(aiResponse.foods, aiResponse.breakdown, parsed);
              if (estimatedWeight > 0) {
                finalProteins = (parsed.officialNutritionData.proteinsValue * estimatedWeight) / 100;
                aiResponse.explanation = `Tableau nutritionnel lu sur emballage: ${parsed.officialNutritionData.proteinsValue}g protéines/100g. Portion estimée: ${estimatedWeight}g = ${finalProteins.toFixed(1)}g protéines.`;
              }
            }
            
            aiResponse.protein = finalProteins;
            aiResponse.confidence = 0.95;
            aiResponse.dataSource = 'OFFICIAL_LABEL';
            aiResponse.isExactValue = true;
            
            console.log(`✅ Valeurs officielles utilisées: ${finalProteins}g protéines`);
          }
          // PRIORITÉ 2: Recherche OpenFoodFacts si pas de tableau nutritionnel
          else if (parsed.productType === 'PACKAGED_PRODUCT' && 
              (parsed.brand && parsed.brand !== 'marque_non_visible') ||
              (parsed.productName && parsed.productName !== null)) {
            
            console.log(`🔍 Produit emballé détecté - Tentative d'enrichissement:`, {
              productName: parsed.productName,
              brand: parsed.brand,
              productType: parsed.productType
            });
            
            try {
              const brand = parsed.brand === 'marque_non_visible' ? undefined : parsed.brand;
              const onlineData = await this.searchProductNutrition(parsed.productName, brand);
              
              if (onlineData && onlineData.proteins !== null) {
                console.log('✅ Données trouvées via OpenFoodFacts:', {
                  productName: onlineData.productName,
                  brand: onlineData.brand,
                  proteins: onlineData.proteins,
                  source: onlineData.source
                });
                
                // Calculer les valeurs pour la portion réelle consommée
                const portionData = this.calculatePortionFromOpenFoodFacts(onlineData, aiResponse, parsed);
                
                // Utiliser les données calculées pour la portion
                aiResponse.protein = portionData.protein;
                aiResponse.calories = portionData.calories;
                aiResponse.carbs = portionData.carbs;
                aiResponse.fat = portionData.fat;
                aiResponse.fiber = portionData.fiber;
                
                // Confiance élevée pour OpenFoodFacts
                aiResponse.confidence = 0.90;
                aiResponse.dataSource = 'ONLINE_DATABASE';
                aiResponse.isExactValue = true;
                aiResponse.onlineSearchResult = onlineData;
                aiResponse.explanation = portionData.explanation;
                aiResponse.estimatedWeight = portionData.estimatedWeight;
                
                console.log(`🎯 Portion calculée: ${portionData.protein}g protéines pour ${portionData.estimatedWeight}g`);
              } else {
                console.log('⚠️ Produit non trouvé dans OpenFoodFacts - tentative fallback base de données');
                
                // Appliquer le fallback intelligent
                aiResponse = FallbackNutritionService.applyIntelligentFallback(
                  aiResponse,
                  parsed.productName,
                  parsed.brand
                );
                
                aiResponse.searchAvailable = true;
                aiResponse.confidence = Math.min(aiResponse.confidence, 0.75); // Confiance fallback
                if (aiResponse.dataSource !== 'FALLBACK_DATABASE') {
                  aiResponse.dataSource = 'VISUAL_ESTIMATION';
                  aiResponse.notes = `Produit identifié: ${parsed.brand || ''} ${parsed.productName}. Données basées sur estimation visuelle - valeurs exactes non disponibles.`;
                  aiResponse.explanation = `${aiResponse.explanation} [Estimation visuelle - prenez une photo du tableau nutritionnel pour plus de précision]`;
                }
              }
            } catch (enrichmentError) {
              console.error('❌ Erreur enrichissement:', enrichmentError);
              
              // Même en cas d'erreur, essayer le fallback
              aiResponse = FallbackNutritionService.applyIntelligentFallback(
                aiResponse,
                parsed.productName,
                parsed.brand
              );
              
              aiResponse.searchAvailable = true;
              if (aiResponse.dataSource !== 'FALLBACK_DATABASE') {
                aiResponse.notes = `Produit identifié mais enrichissement échoué. Données basées sur l'estimation visuelle.`;
              }
            }
          } else {
            console.log(`ℹ️ Pas d'enrichissement nécessaire:`, {
              productType: parsed.productType,
              productName: parsed.productName,
              brand: parsed.brand
            });
          }
        } catch (parseError) {
          console.error('Erreur parsing JSON IA Vision:', parseError);
          console.error('Réponse brute:', responseText);
          
          // Tentative de récupération avec extraction de JSON plus agressive
          try {
            const extractedJSON = this.extractJSONFromText(responseText);
            const parsed = JSON.parse(extractedJSON);
            aiResponse = this.normalizeAIResponse(parsed);
            console.log('✅ Récupération JSON Vision réussie');
          } catch (secondParseError) {
            throw new AIError('Réponse IA Vision invalide (JSON malformé)', AI_ERROR_CODES.INVALID_RESPONSE, true);
          }
        }

        // Valider la structure de la réponse vision
        if (!validateVisionResponse(aiResponse)) {
          console.error('Structure réponse IA Vision invalide:', aiResponse);
          throw new AIError('Structure de réponse IA Vision invalide', AI_ERROR_CODES.INVALID_RESPONSE, true);
        }

        // Évaluer la qualité de l'image et ajuster la confiance
        if (aiResponse.imageQuality === 'poor') {
          aiResponse.confidence *= 0.7; // Réduire la confiance pour les images de mauvaise qualité
          aiResponse.requiresManualReview = true;
        }

        // Vérifier le niveau de confiance
        if (aiResponse.confidence < AI_CONFIG.confidenceThreshold) {
          console.warn(`⚠️ Confiance IA Vision faible: ${aiResponse.confidence}`);
          aiResponse.requiresManualReview = true;
        }

        // Ensure detectedItems is present for AIVisionResult compatibility
        const visionResult: AIVisionResult = {
          ...aiResponse,
          detectedItems: aiResponse.detectedItems || [],
          imageQuality: aiResponse.imageQuality || 'fair',
          requiresManualReview: aiResponse.requiresManualReview || false,
        };

        console.log(`✅ Analyse IA Vision réussie (confiance: ${visionResult.confidence}, qualité: ${visionResult.imageQuality}, type: ${visionResult.productType || 'unknown'})`);
        return visionResult;

      } catch (error: any) {
        retries++;
        
        // Gestion des erreurs spécifiques à Vision
        if (error.code === 'invalid_image') {
          throw new AIError('Image invalide ou corrompue', AI_ERROR_CODES.IMAGE_QUALITY, false);
        }
        
        if (error.code === 'rate_limit_exceeded') {
          const waitTime = Math.pow(2, retries) * 1000;
          console.warn(`⏱️ Rate limit Vision atteint, attente ${waitTime}ms...`);
          
          if (retries <= AI_CONFIG.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            throw new AIError('Limite de taux Vision dépassée', AI_ERROR_CODES.RATE_LIMIT, false);
          }
        }

        if (error instanceof AIError && !error.retryable) {
          throw error;
        }

        if (retries > AI_CONFIG.maxRetries) {
          console.error('❌ Échec final analyse IA Vision:', error);
          throw new AIError(
            `Échec de l'analyse Vision après ${AI_CONFIG.maxRetries} tentatives`,
            AI_ERROR_CODES.API_ERROR,
            false
          );
        }

        console.warn(`⚠️ Erreur IA Vision, retry ${retries}/${AI_CONFIG.maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    throw new AIError('Nombre maximum de tentatives Vision atteint', AI_ERROR_CODES.API_ERROR, false);
  }

  // Analyser un repas avec texte ET image (meilleure précision)
  static async analyzeCompleteMeal(
    description: string, 
    imageUrl?: string
  ): Promise<AIAnalysisResult> {
    try {
      if (imageUrl) {
        // Utiliser l'analyse vision qui est plus précise
        console.log('🔍 Analyse complète avec image et texte');
        return await this.analyzeImageMeal(imageUrl, description);
      } else {
        // Fallback sur l'analyse texte uniquement
        console.log('📝 Analyse texte uniquement');
        return await this.analyzeTextMeal(description);
      }
    } catch (error) {
      console.error('❌ Erreur analyse complète:', error);
      
      // Si l'analyse avec image échoue, essayer le texte seul
      if (imageUrl && error instanceof AIError && error.code === AI_ERROR_CODES.IMAGE_QUALITY) {
        console.log('🔄 Fallback vers analyse texte après échec image');
        try {
          const textResult = await this.analyzeTextMeal(description);
          // Marquer comme nécessitant une révision manuelle
          return {
            ...textResult,
            confidence: textResult.confidence * 0.8, // Réduire confiance
            explanation: `${textResult.explanation} (Analyse basée sur le texte uniquement - image non analysable)`,
            requiresManualReview: true,
          } as AIAnalysisResult;
        } catch (textError) {
          throw error; // Renvoyer l'erreur originale si le fallback échoue aussi
        }
      }
      
      throw error;
    }
  }

  // Obtenir les statistiques d'utilisation IA (pour monitoring)
  static async getUsageStats(): Promise<{
    textAnalyses: number;
    imageAnalyses: number;
    successRate: number;
    avgConfidence: number;
  }> {
    // TODO: Implémenter le tracking des stats dans la base de données
    return {
      textAnalyses: 0,
      imageAnalyses: 0,
      successRate: 0.95,
      avgConfidence: 0.82,
    };
  }

  // Valider qu'une image est analysable pour l'alimentation
  static async validateImageForAnalysis(imageUrl: string): Promise<boolean> {
    try {
      // Test rapide avec un prompt élargi pour inclure emballages et tableaux nutritionnels
      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Cette image contient-elle de la nourriture visible, un emballage alimentaire, un tableau nutritionnel, ou une étiquette de produit alimentaire ? Réponds juste par "oui" ou "non".'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'low' }
              }
            ]
          }
        ],
        max_tokens: 10,
      }, {
        timeout: 10000, // 10 secondes max pour la validation
      });

      const response = completion.choices[0]?.message?.content?.toLowerCase();
      return response?.includes('oui') || response?.includes('yes') || false;
    } catch (error) {
      console.warn('⚠️ Impossible de valider l\'image:', error);
      return true; // En cas d'erreur, laisser passer l'analyse (plus permissif)
    }
  }

  // Nettoyer une réponse JSON pour enlever les commentaires ou formatage
  private static cleanJSONResponse(response: string): string {
    // Supprimer les commentaires de style ```json et ```
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    
    // Supprimer les espaces en début et fin
    cleaned = cleaned.trim();
    
    // Supprimer les éventuels caractères de contrôle
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    
    return cleaned;
  }

  // Extraire le JSON depuis un texte contenant autre chose
  private static extractJSONFromText(text: string): string {
    // Rechercher le premier { jusqu'au dernier } correspondant
    const firstBrace = text.indexOf('{');
    if (firstBrace === -1) {
      throw new Error('Aucun JSON trouvé dans la réponse');
    }

    let braceCount = 0;
    let lastValidBrace = -1;
    
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') {
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidBrace = i;
          break;
        }
      }
    }

    if (lastValidBrace === -1) {
      throw new Error('JSON mal formaté dans la réponse');
    }

    return text.substring(firstBrace, lastValidBrace + 1);
  }

  // Normaliser une réponse IA pour s'assurer qu'elle contient tous les champs requis
  private static normalizeAIResponse(response: any): AIAnalysisResult {
    return {
      foods: response.foods || [],
      protein: response.protein || 0,
      calories: response.calories || 0,
      carbs: response.carbs || 0,
      fat: response.fat || 0,
      fiber: response.fiber || 0,
      confidence: response.confidence || 0,
      explanation: response.explanation || 'Analyse non disponible',
      suggestions: response.suggestions || [],
      breakdown: response.breakdown || {},
      detectedItems: response.detectedItems || undefined,
      imageQuality: response.imageQuality || undefined,
      requiresManualReview: response.requiresManualReview || false,
      // Nouveaux champs pour l'analyse d'emballage structurée
      nom_produit: response.nom_produit || undefined,
      marque: response.marque || undefined,
      type: response.type || undefined,
      mentions_specifiques: response.mentions_specifiques || undefined,
      contenu_paquet: response.contenu_paquet || undefined,
      apparence_packaging: response.apparence_packaging || undefined,
      langue: response.langue || undefined,
      // Nouveaux champs OCR
      ocr_text: response.ocr_text || undefined,
      ingredients: response.ingredients || undefined,
      confidence_ocr: response.confidence_ocr || undefined,
      enhanced_nutrition: response.enhanced_nutrition || undefined,
    };
  }

  // =====================================================
  // NOUVELLES FONCTIONS DE RECHERCHE NUTRITIONNELLE
  // =====================================================

  // Circuit breaker pour OpenFoodFacts
  private static openFoodFactsCircuitBreaker = {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
    
    shouldSkip(): boolean {
      // Si 1 échec dans les 10 dernières secondes, passer en circuit ouvert
      if (this.failures >= 1 && (Date.now() - this.lastFailureTime) < 10000) {
        if (!this.isOpen) {
          console.log('🚨 Circuit breaker OpenFoodFacts activé - passage en estimation IA');
          this.isOpen = true;
        }
        return true;
      }
      
      // Reset après 10 secondes
      if ((Date.now() - this.lastFailureTime) >= 10000) {
        this.failures = 0;
        this.isOpen = false;
      }
      
      return false;
    },
    
    recordFailure(): void {
      this.failures++;
      this.lastFailureTime = Date.now();
    },
    
    recordSuccess(): void {
      this.failures = 0;
      this.isOpen = false;
    }
  };

  // Rechercher les données nutritionnelles d'un produit avec base locale en priorité
  static async searchProductNutrition(productName: string, brand?: string): Promise<NutritionalData | null> {
    console.log(`🔍 Début recherche nutritionnelle:`, { productName, brand });
    
    // ÉTAPE 1: Recherche dans la base locale OpenFoodFacts (priorité absolue) - DISABLED
    // try {
    //   console.log('📊 Recherche dans la base locale OpenFoodFacts...');
    //   const localResult = await LocalOpenFoodFactsService.searchWithVariants(productName, brand);
    //   if (localResult) {
    //     console.log(`✅ Produit trouvé dans la base locale: ${localResult.productName}`);
    //     return localResult;
    //   }
    // } catch (error) {
    //   console.warn('⚠️ Erreur recherche locale:', error);
    // }

    // ÉTAPE 2: Recherche dans l'API OpenFoodFacts (si base locale vide)
    // Vérifier le circuit breaker
    if (this.openFoodFactsCircuitBreaker.shouldSkip()) {
      console.log('⚡ Circuit breaker ouvert - passage direct au fallback');
    } else {
      console.log('🌐 Recherche dans l\'API OpenFoodFacts...');
      
      try {
        const result = await this.searchOpenFoodFacts(productName);
        if (result) {
          console.log(`✅ Succès API OpenFoodFacts: ${result.productName}`);
          this.openFoodFactsCircuitBreaker.recordSuccess();
          return result;
        }
      } catch (error: any) {
        console.warn(`⚠️ API OpenFoodFacts échouée:`, error?.message || error);
        this.openFoodFactsCircuitBreaker.recordFailure();
      }
    }
    
    console.log('❌ Aucune donnée trouvée dans les bases OpenFoodFacts');
    return null;
  }

  // Extraire les mots-clés pertinents d'un nom de produit
  private static extractProductKeywords(productName: string, brand?: string): string {
    // Supprimer les poids, volumes et formats
    let keywords = productName
      .replace(/\d+\s*(g|kg|ml|l|cl|oz|lb)\b/gi, '') // Poids/volumes
      .replace(/\d+\s*x\s*\d+/gi, '') // Formats type "4x125g"
      .replace(/\b(bio|biologique|organic)\b/gi, '') // Mots génériques
      .replace(/\b(nature|naturel|plain)\b/gi, '')
      .replace(/[(),\[\]]/g, ' ') // Parenthèses et crochets
      .replace(/\s+/g, ' ') // Espaces multiples
      .trim();
    
    // Ajouter la marque si elle n'est pas déjà dans le nom
    if (brand && !keywords.toLowerCase().includes(brand.toLowerCase())) {
      keywords = `${brand} ${keywords}`;
    }
    
    console.log(`🔤 Mots-clés extraits: "${productName}" → "${keywords}"`);
    return keywords;
  }

  // Calculer les valeurs nutritionnelles pour la portion réelle à partir des données OpenFoodFacts (pour 100g)
  private static calculatePortionFromOpenFoodFacts(
    openFoodData: NutritionalData, 
    aiResponse: AIAnalysisResult, 
    parsed: any
  ): {
    protein: number;
    calories: number;
    carbs: number;
    fat: number;
    fiber: number;
    explanation: string;
    estimatedWeight: number;
  } {
    
    // Estimer le poids de la portion en analysant les foods et breakdown
    let estimatedWeight = this.estimatePortionWeight(aiResponse.foods, aiResponse.breakdown, parsed);
    
    // Si pas d'estimation, utiliser un poids par défaut basé sur le type de produit
    if (estimatedWeight === 0) {
      console.log('⚠️ Impossible d\'estimer le poids, utilisation portion par défaut');
      
      // Utiliser une portion par défaut raisonnable (30g pour les chips/snacks)
      const defaultWeight = 30;
      const ratio = defaultWeight / 100;
      
      return {
        protein: Math.round((openFoodData.proteins || 0) * ratio * 10) / 10,
        calories: Math.round((openFoodData.calories || 0) * ratio),
        carbs: Math.round((openFoodData.carbs || 0) * ratio * 10) / 10,
        fat: Math.round((openFoodData.fat || 0) * ratio * 10) / 10,
        fiber: Math.round((openFoodData.fiber || 0) * ratio * 10) / 10,
        explanation: `${openFoodData.productName} (OpenFoodFacts): portion estimée ${defaultWeight}g = ${Math.round((openFoodData.proteins || 0) * ratio * 10) / 10}g protéines (basé sur ${openFoodData.proteins}g/100g).`,
        estimatedWeight: defaultWeight
      };
    }
    
    // Calculer les valeurs pour la portion estimée (OpenFoodFacts donne pour 100g)
    const ratio = estimatedWeight / 100;
    
    const portionData = {
      protein: Math.round((openFoodData.proteins || 0) * ratio * 10) / 10,
      calories: Math.round((openFoodData.calories || 0) * ratio),
      carbs: Math.round((openFoodData.carbs || 0) * ratio * 10) / 10,
      fat: Math.round((openFoodData.fat || 0) * ratio * 10) / 10,
      fiber: Math.round((openFoodData.fiber || 0) * ratio * 10) / 10,
      explanation: `${openFoodData.productName} (OpenFoodFacts): ${estimatedWeight}g portion = ${Math.round((openFoodData.proteins || 0) * ratio * 10) / 10}g protéines (basé sur ${openFoodData.proteins}g/100g).`,
      estimatedWeight
    };
    
    console.log('📊 Calcul portion:', {
      openFoodProteins100g: openFoodData.proteins,
      estimatedWeightG: estimatedWeight,
      ratio: ratio,
      finalProteinG: portionData.protein
    });
    
    return portionData;
  }
  
  // Estimer le poids d'une portion en analysant les aliments détectés
  private static estimatePortionWeight(foods: string[], breakdown: any, parsed: any): number {
    // Rechercher des indices dans les descriptions d'aliments
    const foodsLower = foods.join(' ').toLowerCase();
    
    // Try new quantity parser first
    const quantityParseResult = QuantityParserService.parseQuantity(foodsLower);
    if (quantityParseResult.confidence > 0.7) {
      const estimatedWeight = quantityParseResult.multiplier * 100; // Convert to grams
      console.log(`📏 Poids calculé par parseur: ${estimatedWeight}g (confiance: ${Math.round(quantityParseResult.confidence * 100)}%)`);
      return estimatedWeight;
    }
    
    // Fallback to legacy hardcoded patterns
    if (foodsLower.includes('tranche') && (foodsLower.includes('pain') || foodsLower.includes('mie'))) {
      return 25; // 1 tranche de pain de mie
    }
    if (foodsLower.includes('biscuit') || foodsLower.includes('cookie')) {
      return 10; // 1 biscuit moyen
    }
    if (foodsLower.includes('yaourt') || foodsLower.includes('yogurt')) {
      return 125; // 1 pot de yaourt standard
    }
    if (foodsLower.includes('fromage') && foodsLower.includes('portion')) {
      return 30; // Portion fromage standard
    }
    if (foodsLower.includes('canette') || foodsLower.includes('33cl')) {
      return 330; // Canette standard
    }
    if (foodsLower.includes('bouteille') && foodsLower.includes('50cl')) {
      return 500; // Bouteille 50cl
    }
    
    // Analyser le breakdown si disponible pour des indices de quantité
    if (breakdown) {
      for (const [, data] of Object.entries(breakdown)) {
        if (typeof data === 'object' && (data as any).quantity) {
          const quantity = (data as any).quantity.toLowerCase();
          
          // Use quantity parser for breakdown analysis
          const breakdownParseResult = QuantityParserService.parseQuantity(quantity);
          if (breakdownParseResult.confidence > 0.6) {
            const estimatedWeight = breakdownParseResult.multiplier * 100;
            console.log(`📏 Poids extrait du breakdown avec parseur: ${estimatedWeight}g`);
            return estimatedWeight;
          }
          
          // Legacy regex fallback
          const gramsMatch = quantity.match(/(\d+)\s*g/);
          if (gramsMatch) {
            const grams = parseInt(gramsMatch[1]);
            if (grams > 5 && grams < 1000) { // Valeurs raisonnables
              console.log(`📏 Poids extrait du breakdown: ${grams}g`);
              return grams;
            }
          }
        }
      }
    }
    
    // Rechercher dans le nom du produit des indices de poids
    if (parsed.productName) {
      const productLower = parsed.productName.toLowerCase();
      
      // Use quantity parser for product name
      const productParseResult = QuantityParserService.parseQuantity(productLower);
      if (productParseResult.confidence > 0.5) {
        const estimatedWeight = productParseResult.multiplier * 100;
        console.log(`📦 Poids produit calculé: ${estimatedWeight}g`);
        return Math.min(estimatedWeight, 500); // Max 500g for reasonable portion
      }
      
      // Legacy regex fallback
      const weightMatch = productLower.match(/(\d+)\s*g/);
      if (weightMatch) {
        const weight = parseInt(weightMatch[1]);
        // Si c'est un poids de produit entier, estimer une portion
        if (weight > 100) {
          console.log(`📦 Poids produit entier: ${weight}g, estimation portion`);
          // Estimation basée sur le type de produit
          if (productLower.includes('pain') || productLower.includes('mie')) {
            return 25; // Une tranche
          }
          if (productLower.includes('yaourt')) {
            return weight; // Tout le pot
          }
          return Math.min(weight, 100); // Max 100g pour une portion
        } else if (weight >= 10) {
          console.log(`📏 Poids portion détecté: ${weight}g`);
          return weight;
        }
      }
    }
    
    console.log('❓ Impossible d\'estimer le poids de la portion');
    return 0; // Impossible d'estimer
  }

  // Rechercher dans la base de données OpenFoodFacts avec une requête simple
  static async searchOpenFoodFacts(searchQuery: string): Promise<NutritionalData | null> {
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      
      console.log(`📡 Requête OpenFoodFacts: "${searchQuery}"`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 secondes timeout
      
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodedQuery}&search_simple=1&action=process&json=1&page_size=1&fields=product_name,brands,nutriments`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'DynProt-App/1.0 (https://dynprot.app)',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: any = await response.json();
      
      if (data.products && data.products.length > 0) {
        // Prendre le premier produit avec le meilleur score de correspondance
        const product = data.products[0];
        
        // Vérifier que le produit a des données nutritionnelles utilisables
        if (!product.nutriments) {
          console.log('⚠️ Produit trouvé mais sans données nutritionnelles');
          return null;
        }
        
        const nutritionalData: NutritionalData = {
          productName: product.product_name || searchQuery,
          brand: product.brands,
          proteins: this.extractNutrientValue(product.nutriments, 'proteins'),
          calories: this.extractNutrientValue(product.nutriments, 'energy-kcal'),
          carbs: this.extractNutrientValue(product.nutriments, 'carbohydrates'),
          fat: this.extractNutrientValue(product.nutriments, 'fat'),
          fiber: this.extractNutrientValue(product.nutriments, 'fiber'),
          source: 'OpenFoodFacts',
          confidence: this.calculateOpenFoodFactsConfidence(product, searchQuery),
        };
        
        console.log(`✅ OpenFoodFacts trouvé: ${nutritionalData.productName} (${nutritionalData.confidence}% confiance)`);
        return nutritionalData;
      }
      
      console.log('❌ Aucun produit trouvé dans OpenFoodFacts');
      return null;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Timeout OpenFoodFacts (8s dépassé)');
      } else if (error.message?.includes('504')) {
        console.error('❌ OpenFoodFacts temporairement indisponible (504)');
      } else if (error.message?.includes('503')) {
        console.error('❌ OpenFoodFacts en maintenance (503)');
      } else {
        console.error('❌ Erreur OpenFoodFacts:', error.message || error);
      }
      throw error; // Re-lancer l'erreur pour le circuit breaker
    }
  }

  // Extraire une valeur nutritionnelle des données OpenFoodFacts
  private static extractNutrientValue(nutriments: any, key: string): number | null {
    // OpenFoodFacts utilise différents suffixes (_100g, _serving, etc.)
    const possibleKeys = [
      `${key}_100g`,
      `${key}-100g`,
      `${key}_per_100g`,
      key,
    ];
    
    for (const possibleKey of possibleKeys) {
      if (nutriments[possibleKey] !== undefined && nutriments[possibleKey] !== null) {
        const value = parseFloat(nutriments[possibleKey]);
        if (!isNaN(value) && value >= 0) {
          return value;
        }
      }
    }
    
    return null;
  }

  // Calculer la confiance pour un résultat OpenFoodFacts
  private static calculateOpenFoodFactsConfidence(product: any, searchQuery: string): number {
    let confidence = 60; // Base de confiance pour OpenFoodFacts
    
    // Augmenter la confiance si le produit a des données complètes
    if (product.nutriments?.proteins_100g !== undefined) confidence += 15;
    if (product.nutriments?.['energy-kcal_100g'] !== undefined) confidence += 15;
    if (product.brands && product.brands.length > 0) confidence += 5;
    if (product.product_name && product.product_name.length > 0) confidence += 5;
    
    // Vérifier la correspondance du nom (approximative)
    if (product.product_name) {
      const normalizedProductName = product.product_name.toLowerCase();
      const normalizedQuery = searchQuery.toLowerCase();
      
      if (normalizedProductName.includes(normalizedQuery) || 
          normalizedQuery.includes(normalizedProductName)) {
        confidence += 10;
      }
    }
    
    return Math.min(confidence, 95); // Maximum 95% de confiance
  }

  // Traiter une réponse IA avec recherche en ligne automatique
  static async processAIResponseWithSearch(response: string): Promise<AIAnalysisResult> {
    try {
      const parsed = JSON.parse(response);
      
      // Si produit emballé mais données incomplètes, tenter recherche en ligne
      if (parsed.productType === 'PACKAGED_PRODUCT' && 
          parsed.dataSource !== 'OFFICIAL_LABEL' && 
          parsed.productName) {
        
        console.log(`🔍 Recherche en ligne: ${parsed.brand || ''} ${parsed.productName}`);
        const onlineData = await this.searchProductNutrition(parsed.productName, parsed.brand);
        
        if (onlineData && onlineData.proteins !== null) {
          console.log('✅ Données enrichies via recherche en ligne');
          
          return {
            ...parsed,
            protein: onlineData.proteins,
            calories: onlineData.calories || parsed.calories,
            carbs: onlineData.carbs || parsed.carbs,
            fat: onlineData.fat || parsed.fat,
            fiber: onlineData.fiber || parsed.fiber,
            confidence: Math.max(parsed.confidence, onlineData.confidence / 100),
            dataSource: 'ONLINE_DATABASE' as DataSource,
            notes: `Valeurs trouvées via ${onlineData.source}. ${parsed.notes || ''}`.trim(),
            isExactValue: true,
            onlineSearchResult: onlineData,
            explanation: `${parsed.explanation} [Données enrichies via ${onlineData.source}]`,
          };
        } else {
          // Produit identifié mais non trouvé en ligne
          return {
            ...parsed,
            searchAvailable: true,
            notes: `Produit identifié mais non trouvé dans les bases de données. ${parsed.notes || ''}`.trim(),
          };
        }
      }
      
      // Traitement normal si pas de recherche nécessaire
      return {
        ...parsed,
        protein: parsed.calculatedTotal?.proteins || parsed.nutritionalValues?.proteins?.value || parsed.protein || 0,
        calories: parsed.calculatedTotal?.calories || parsed.nutritionalValues?.calories?.value || parsed.calories || 0,
        isExactValue: parsed.dataSource === 'OFFICIAL_LABEL',
        searchAvailable: parsed.productType === 'PACKAGED_PRODUCT' && parsed.productName,
      };
      
    } catch (error) {
      console.error('❌ Erreur traitement réponse IA:', error);
      // Fallback sur le traitement traditionnel
      return this.parseTraditionalResponse(response);
    }
  }

  // Fallback pour traitement traditionnel des réponses
  private static parseTraditionalResponse(response: string): AIAnalysisResult {
    try {
      // Essayer d'extraire au moins les informations de base
      const cleanedResponse = this.cleanJSONResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      
      return this.normalizeAIResponse(parsed);
    } catch (error) {
      console.error('❌ Impossible de parser la réponse:', error);
      
      // Retourner une réponse d'erreur structurée
      return {
        foods: [],
        protein: 0,
        calories: 0,
        confidence: 0,
        explanation: 'Erreur d\'analyse - réponse non parsable',
        requiresManualReview: true,
        dataSource: 'VISUAL_ESTIMATION' as DataSource,
        productType: 'NATURAL_FOOD' as ProductType,
      };
    }
  }

  // Gérer les erreurs d'analyse avec suggestions contextuelles
  static handleAnalysisError(result: AIAnalysisResult): AIAnalysisResult {
    if (result.productType === 'PACKAGED_PRODUCT') {
      if (result.dataSource === 'VISUAL_ESTIMATION') {
        return {
          ...result,
          notes: 'Ce produit emballé peut être recherché en ligne pour obtenir des valeurs exactes. Voulez-vous que je recherche les données officielles ?',
          searchAvailable: true,
          suggestions: [
            ...(result.suggestions || []),
            'Rechercher les valeurs nutritionnelles officielles en ligne',
            'Prendre une photo plus nette du tableau nutritionnel'
          ],
        };
      }
      
      if (result.dataSource !== 'OFFICIAL_LABEL' && result.dataSource !== 'ONLINE_DATABASE') {
        return {
          ...result,
          notes: 'Produit identifié mais données non lisibles. Je peux rechercher les valeurs officielles en ligne ou vous pouvez prendre une photo plus nette du tableau nutritionnel.',
          searchAvailable: true,
          requiresManualReview: true,
        };
      }
    }
    
    return result;
  }
}