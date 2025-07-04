// Service d'intelligence artificielle avec OpenAI
import { openai, AI_CONFIG, AI_PROMPTS, AIError, AI_ERROR_CODES, validateAIResponse, validateVisionResponse, AIAnalysisResult, AIVisionResult } from '../config/openai';

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
        let aiResponse: any;
        try {
          // Nettoyer la réponse pour extraire uniquement le JSON
          const cleanedResponse = this.cleanJSONResponse(responseText);
          aiResponse = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error('Erreur parsing JSON IA:', parseError);
          console.error('Réponse brute:', responseText);
          
          // Tentative de récupération avec extraction de JSON plus agressive
          try {
            const extractedJSON = this.extractJSONFromText(responseText);
            aiResponse = JSON.parse(extractedJSON);
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

        console.log(`✅ Analyse IA réussie (confiance: ${aiResponse.confidence})`);
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
        let aiResponse: any;
        try {
          // Nettoyer la réponse pour extraire uniquement le JSON
          const cleanedResponse = this.cleanJSONResponse(responseText);
          aiResponse = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error('Erreur parsing JSON IA Vision:', parseError);
          console.error('Réponse brute:', responseText);
          
          // Tentative de récupération avec extraction de JSON plus agressive
          try {
            const extractedJSON = this.extractJSONFromText(responseText);
            aiResponse = JSON.parse(extractedJSON);
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

        console.log(`✅ Analyse IA Vision réussie (confiance: ${aiResponse.confidence}, qualité: ${aiResponse.imageQuality})`);
        return aiResponse;

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

  // Valider qu'une image est analysable
  static async validateImageForAnalysis(imageUrl: string): Promise<boolean> {
    try {
      // Test rapide avec un prompt minimal
      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Cette image contient-elle de la nourriture visible ? Réponds juste par "oui" ou "non".'
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
      return false; // En cas d'erreur, considérer l'image comme non valide
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
    };
  }
}