import { Request, Response } from 'express';
import prisma, { updateDailySummary, logActivity } from '../lib/prisma';
import {
  CreateMealEntrySchema,
  UpdateMealEntrySchema,
  MealQuerySchema,
  CreateMealAnalysisSchema,
  AnalyzeMealInputSchema,
  ApiResponse,
  PaginatedResponse,
  AuthUser,
  MealEntryWithAnalysis,
  CreateMealEntry,
  UpdateMealEntry,
  MealQuery
} from '../types/api.types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getClientContext(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  };
}

function determineMealTimeCategory(timestamp: Date): string {
  const hour = timestamp.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

import { AIService } from '../services/ai.service';
import { ImageService } from '../config/cloudinary';
import { PackagingAnalysisService } from '../services/packaging-analysis.service';

// Real AI analysis function using OpenAI
async function performAIAnalysis(input: any): Promise<any> {
  const { input_text, input_type, photo_data } = input;
  const startTime = Date.now();
  
  try {
    let analysisResult;
    
    if (input_type === 'image' && photo_data) {
      // Upload image to Cloudinary first
      let imageUrl: string;
      
      if (photo_data.startsWith('data:image')) {
        // Base64 image data
        const base64Data = photo_data.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const uploadResult = await ImageService.uploadFromBuffer(buffer, 'analysis-image', 'temp-user');
        imageUrl = uploadResult.secureUrl;
      } else if (photo_data.startsWith('http')) {
        // Already a URL
        imageUrl = photo_data;
      } else {
        throw new Error('Format d\'image non supporté');
      }
      
      // Validate image before analysis (permissif pour emballages et tableaux nutritionnels)
      try {
        const isValidImage = await AIService.validateImageForAnalysis(imageUrl);
        if (!isValidImage) {
          console.warn('⚠️ Image possiblement non alimentaire, mais tentative d\'analyse quand même');
        }
      } catch (validationError) {
        console.warn('⚠️ Erreur validation image, continuons l\'analyse:', validationError);
        // Ne pas faire échouer l'analyse si la validation échoue
      }
      
      // Analyze with OpenAI Vision
      analysisResult = await AIService.analyzeImageMeal(imageUrl, input_text);
    } else if (input_text) {
      // Text-based analysis
      analysisResult = await AIService.analyzeTextMeal(input_text);
    } else {
      throw new Error('Aucune donnée d\'entrée fournie pour l\'analyse');
    }
    
    const processingTime = Date.now() - startTime;
    
    // Convert AI result to database format
    return {
      detected_foods: analysisResult.foods,
      confidence_score: analysisResult.confidence,
      confidence_level: analysisResult.confidence >= 0.8 ? 'high' : 
                       analysisResult.confidence >= 0.6 ? 'medium' : 'low',
      estimated_protein: analysisResult.protein,
      estimated_calories: analysisResult.calories || null,
      estimated_carbs: analysisResult.carbs || null,
      estimated_fat: analysisResult.fat || null,
      estimated_fiber: analysisResult.fiber || null,
      estimated_completeness: analysisResult.confidence, // Use confidence as completeness
      estimated_weight: analysisResult.estimatedWeight || null, // Weight in grams for the calculated portion
      suggestions: analysisResult.suggestions || [],
      breakdown: analysisResult.breakdown || {},
      processing_time_ms: processingTime,
      ai_model_version: 'gpt-4o-v1.0',
      requires_manual_review: (analysisResult as any).requiresManualReview || false,
      image_quality: (analysisResult as any).imageQuality || null
    };
  } catch (error: any) {
    console.error('❌ Erreur analyse IA:', error);
    
    // Fallback avec analyse simplifiée si l'IA échoue
    const processingTime = Date.now() - startTime;
    
    return {
      detected_foods: input_text ? ['aliment non identifié'] : [],
      confidence_score: 0.1, // Très faible confiance pour le fallback
      confidence_level: 'low',
      estimated_protein: 20, // Valeur par défaut conservative
      estimated_calories: 200,
      estimated_carbs: null,
      estimated_fat: null,
      estimated_fiber: null,
      estimated_completeness: 0.1,
      suggestions: [
        'Analyse automatique échouée - veuillez vérifier et ajuster les valeurs manuellement',
        'Considérez reprendre la photo avec un meilleur éclairage'
      ],
      breakdown: {
        error: 'Analyse IA échouée',
        fallback: true
      },
      processing_time_ms: processingTime,
      ai_model_version: 'fallback-v1.0',
      requires_manual_review: true,
      error_message: error.message
    };
  }
}

// =====================================================
// MEAL ENTRY CONTROLLERS
// =====================================================

export async function createMealEntry(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    console.log(`🍽️ Create meal entry for user ${user.id}:`, {
      requestBody: req.body,
      clientContext: getClientContext(req)
    });
    
    // Validate request body
    const validation = CreateMealEntrySchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Meal validation failed:', validation.error.issues);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid meal entry data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const mealData: CreateMealEntry = validation.data;
    
    // Convert timestamp to Date object
    const mealTimestamp = new Date(mealData.meal_timestamp);
    
    // Auto-determine meal time category if not provided
    const mealTimeCategory = mealData.meal_time_category || determineMealTimeCategory(mealTimestamp);

    // Create meal entry
    const mealEntry = await prisma.meal_entries.create({
      data: {
        user_id: user.id,
        description: mealData.description,
        meal_timestamp: mealTimestamp,
        protein_grams: mealData.protein_grams,
        calories: mealData.calories,
        carbs_grams: mealData.carbs_grams,
        fat_grams: mealData.fat_grams,
        fiber_grams: mealData.fiber_grams,
        source_type: mealData.source_type || 'manual',
        ai_estimated: mealData.ai_estimated || false,
        photo_url: mealData.photo_url,
        photo_data: mealData.photo_data,
        tags: mealData.tags || [],
        meal_type: mealData.meal_type,
        meal_time_category: mealTimeCategory
      },
      include: {
        meal_analyses: true
      }
    });

    // Update daily summary asynchronously
    updateDailySummary(user.id, new Date(mealTimestamp.toDateString()))
      .catch(error => console.error('Failed to update daily summary:', error));

    // Log activity
    await logActivity(
      user.id,
      'MEAL_CREATED',
      'meal_entries',
      mealEntry.id,
      null,
      { 
        description: mealEntry.description,
        protein_grams: mealEntry.protein_grams,
        source_type: mealEntry.source_type
      },
      getClientContext(req)
    );

    res.status(201).json({
      success: true,
      data: { meal: mealEntry },
      message: 'Meal entry created successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Create meal entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meal entry',
      message: 'An error occurred while creating the meal entry'
    } as ApiResponse);
  }
}

export async function getMealEntries(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate query parameters
    const validation = MealQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const query: MealQuery = validation.data;
    
    // Build where clause
    const whereClause: any = {
      user_id: user.id
    };

    // Date range filter
    if (query.start_date || query.end_date) {
      whereClause.meal_timestamp = {};
      if (query.start_date) {
        whereClause.meal_timestamp.gte = new Date(query.start_date);
      }
      if (query.end_date) {
        whereClause.meal_timestamp.lte = new Date(query.end_date);
      }
    }

    // Other filters
    if (query.meal_type) {
      whereClause.meal_type = query.meal_type;
    }
    if (query.source_type) {
      whereClause.source_type = query.source_type;
    }
    if (query.ai_estimated !== undefined) {
      whereClause.ai_estimated = query.ai_estimated;
    }
    if (query.search) {
      whereClause.description = {
        contains: query.search,
        mode: 'insensitive'
      };
    }

    // Get total count for pagination
    const total = await prisma.meal_entries.count({ where: whereClause });
    
    // Calculate pagination
    const totalPages = Math.ceil(total / query.limit);
    const skip = (query.page - 1) * query.limit;

    // Get meals with analysis data
    const meals = await prisma.meal_entries.findMany({
      where: whereClause,
      include: {
        meal_analyses: true
      },
      orderBy: {
        meal_timestamp: 'desc'
      },
      skip,
      take: query.limit
    });

    res.status(200).json({
      success: true,
      data: meals,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages
      },
      message: 'Meal entries retrieved successfully'
    } as PaginatedResponse<MealEntryWithAnalysis>);
  } catch (error) {
    console.error('Get meal entries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve meal entries',
      message: 'An error occurred while retrieving meal entries'
    } as ApiResponse);
  }
}

export async function getMealEntry(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Meal ID is required'
      } as ApiResponse);
      return;
    }

    const meal = await prisma.meal_entries.findFirst({
      where: {
        id,
        user_id: user.id
      },
      include: {
        meal_analyses: true
      }
    });

    if (!meal) {
      res.status(404).json({
        success: false,
        error: 'Meal entry not found',
        message: 'The requested meal entry does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: { meal },
      message: 'Meal entry retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get meal entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve meal entry',
      message: 'An error occurred while retrieving the meal entry'
    } as ApiResponse);
  }
}

export async function updateMealEntry(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Meal ID is required'
      } as ApiResponse);
      return;
    }

    // Validate request body
    const validation = UpdateMealEntrySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid meal entry update data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const updateData: UpdateMealEntry = validation.data;

    // Get existing meal for logging
    const existingMeal = await prisma.meal_entries.findFirst({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!existingMeal) {
      res.status(404).json({
        success: false,
        error: 'Meal entry not found',
        message: 'The requested meal entry does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    // Prepare update data
    const updatePayload: any = {};
    
    if (updateData.description !== undefined) updatePayload.description = updateData.description;
    if (updateData.meal_timestamp !== undefined) {
      updatePayload.meal_timestamp = new Date(updateData.meal_timestamp);
      updatePayload.meal_time_category = updateData.meal_time_category || 
        determineMealTimeCategory(new Date(updateData.meal_timestamp));
    }
    if (updateData.protein_grams !== undefined) updatePayload.protein_grams = updateData.protein_grams;
    if (updateData.calories !== undefined) updatePayload.calories = updateData.calories;
    if (updateData.carbs_grams !== undefined) updatePayload.carbs_grams = updateData.carbs_grams;
    if (updateData.fat_grams !== undefined) updatePayload.fat_grams = updateData.fat_grams;
    if (updateData.fiber_grams !== undefined) updatePayload.fiber_grams = updateData.fiber_grams;
    if (updateData.source_type !== undefined) updatePayload.source_type = updateData.source_type;
    if (updateData.ai_estimated !== undefined) updatePayload.ai_estimated = updateData.ai_estimated;
    if (updateData.photo_url !== undefined) updatePayload.photo_url = updateData.photo_url;
    if (updateData.photo_data !== undefined) updatePayload.photo_data = updateData.photo_data;
    if (updateData.tags !== undefined) updatePayload.tags = updateData.tags;
    if (updateData.meal_type !== undefined) updatePayload.meal_type = updateData.meal_type;
    if (updateData.meal_time_category !== undefined) updatePayload.meal_time_category = updateData.meal_time_category;

    // Update meal entry
    const updatedMeal = await prisma.meal_entries.update({
      where: { id },
      data: updatePayload,
      include: {
        meal_analyses: true
      }
    });

    // Update daily summaries if date or nutrition changed
    const oldDate = new Date(existingMeal.meal_timestamp.toDateString());
    const newDate = new Date(updatedMeal.meal_timestamp.toDateString());
    
    if (oldDate.getTime() !== newDate.getTime() || 
        updateData.protein_grams !== undefined || 
        updateData.calories !== undefined) {
      // Update both old and new dates
      updateDailySummary(user.id, oldDate).catch(console.error);
      if (oldDate.getTime() !== newDate.getTime()) {
        updateDailySummary(user.id, newDate).catch(console.error);
      }
    }

    // Log activity
    await logActivity(
      user.id,
      'MEAL_UPDATED',
      'meal_entries',
      updatedMeal.id,
      { 
        description: existingMeal.description,
        protein_grams: existingMeal.protein_grams
      },
      { 
        description: updatedMeal.description,
        protein_grams: updatedMeal.protein_grams
      },
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { meal: updatedMeal },
      message: 'Meal entry updated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Update meal entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meal entry',
      message: 'An error occurred while updating the meal entry'
    } as ApiResponse);
  }
}

export async function deleteMealEntry(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Meal ID is required'
      } as ApiResponse);
      return;
    }

    // Get existing meal for logging and daily summary update
    const existingMeal = await prisma.meal_entries.findFirst({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!existingMeal) {
      res.status(404).json({
        success: false,
        error: 'Meal entry not found',
        message: 'The requested meal entry does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    // Delete meal entry (this will cascade delete analyses)
    await prisma.meal_entries.delete({
      where: { id }
    });

    // Update daily summary
    const mealDate = new Date(existingMeal.meal_timestamp.toDateString());
    updateDailySummary(user.id, mealDate).catch(console.error);

    // Log activity
    await logActivity(
      user.id,
      'MEAL_DELETED',
      'meal_entries',
      id,
      { 
        description: existingMeal.description,
        protein_grams: existingMeal.protein_grams
      },
      null,
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      message: 'Meal entry deleted successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Delete meal entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meal entry',
      message: 'An error occurred while deleting the meal entry'
    } as ApiResponse);
  }
}

// =====================================================
// AI ANALYSIS CONTROLLERS
// =====================================================

export async function analyzeMealInput(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate request body
    const validation = AnalyzeMealInputSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid analysis input data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const { input_text, input_type, photo_data } = validation.data;

    // Perform AI analysis (mock implementation)
    const analysisResult = await performAIAnalysis({
      input_text,
      input_type,
      photo_data
    });

    // Create analysis record
    const analysis = await prisma.meal_analyses.create({
      data: {
        user_id: user.id,
        input_text,
        input_type,
        detected_foods: analysisResult.detected_foods,
        confidence_score: analysisResult.confidence_score,
        confidence_level: analysisResult.confidence_level,
        estimated_protein: analysisResult.estimated_protein,
        estimated_calories: analysisResult.estimated_calories,
        estimated_completeness: analysisResult.estimated_completeness,
        suggestions: analysisResult.suggestions,
        breakdown: analysisResult.breakdown,
        processing_time_ms: analysisResult.processing_time_ms,
        ai_model_version: analysisResult.ai_model_version
      }
    });

    // Log analysis activity
    await logActivity(
      user.id,
      'MEAL_ANALYZED',
      'meal_analyses',
      analysis.id,
      null,
      { 
        input_type,
        confidence_level: analysis.confidence_level,
        estimated_protein: analysis.estimated_protein
      },
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { analysis },
      message: 'Meal analyzed successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Analyze meal input error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze meal',
      message: 'An error occurred during meal analysis'
    } as ApiResponse);
  }
}

export async function createMealFromAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { analysisId } = req.params;
    const mealData = req.body;

    if (!analysisId) {
      res.status(400).json({
        success: false,
        error: 'Analysis ID is required'
      } as ApiResponse);
      return;
    }

    // Get analysis
    const analysis = await prisma.meal_analyses.findFirst({
      where: {
        id: analysisId,
        user_id: user.id
      }
    });

    if (!analysis) {
      res.status(404).json({
        success: false,
        error: 'Analysis not found',
        message: 'The requested analysis does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    // Validate meal data
    const validation = CreateMealEntrySchema.safeParse({
      ...mealData,
      ai_estimated: true,
      source_type: analysis.input_type
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid meal entry data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const mealEntryData: CreateMealEntry = validation.data;
    const mealTimestamp = new Date(mealEntryData.meal_timestamp);

    // Create meal entry and link to analysis
    const mealEntry = await prisma.$transaction(async (tx) => {
      // Create meal entry
      const meal = await tx.meal_entries.create({
        data: {
          user_id: user.id,
          description: mealEntryData.description,
          meal_timestamp: mealTimestamp,
          protein_grams: mealEntryData.protein_grams,
          calories: mealEntryData.calories,
          carbs_grams: mealEntryData.carbs_grams,
          fat_grams: mealEntryData.fat_grams,
          fiber_grams: mealEntryData.fiber_grams,
          source_type: analysis.input_type,
          ai_estimated: true,
          photo_url: mealEntryData.photo_url,
          photo_data: mealEntryData.photo_data,
          tags: mealEntryData.tags || [],
          meal_type: mealEntryData.meal_type,
          meal_time_category: mealEntryData.meal_time_category || determineMealTimeCategory(mealTimestamp)
        }
      });

      // Link analysis to meal entry
      await tx.meal_analyses.update({
        where: { id: analysisId },
        data: { meal_entry_id: meal.id }
      });

      return meal;
    });

    // Update daily summary
    updateDailySummary(user.id, new Date(mealTimestamp.toDateString()))
      .catch(error => console.error('Failed to update daily summary:', error));

    // Log activity
    await logActivity(
      user.id,
      'MEAL_CREATED_FROM_ANALYSIS',
      'meal_entries',
      mealEntry.id,
      null,
      { 
        description: mealEntry.description,
        protein_grams: mealEntry.protein_grams,
        analysis_id: analysisId
      },
      getClientContext(req)
    );

    // Return meal with analysis
    const mealWithAnalysis = await prisma.meal_entries.findUnique({
      where: { id: mealEntry.id },
      include: { meal_analyses: true }
    });

    res.status(201).json({
      success: true,
      data: { meal: mealWithAnalysis },
      message: 'Meal entry created from analysis successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Create meal from analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meal from analysis',
      message: 'An error occurred while creating meal from analysis'
    } as ApiResponse);
  }
}

// =====================================================
// PACKAGING ANALYSIS CONTROLLER
// =====================================================

export async function analyzePackaging(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate request body
    const validation = AnalyzeMealInputSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid packaging analysis input data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const { input_text, photo_data } = validation.data;

    if (!photo_data) {
      res.status(400).json({
        success: false,
        error: 'Image required',
        message: 'Photo data is required for packaging analysis'
      } as ApiResponse);
      return;
    }

    // Upload image to Cloudinary
    const uploadResult = await ImageService.uploadBase64(photo_data, {
      folder: 'meal-photos',
      resource_type: 'image',
      format: 'jpg',
      transformation: [
        { width: 1024, height: 1024, crop: 'limit', quality: 'auto' }
      ]
    });

    const imageUrl = uploadResult.secure_url;

    // Perform packaging analysis
    const packagingResult = await PackagingAnalysisService.analyzePackaging(imageUrl, input_text);
    
    // Clean and validate result
    const cleanResult = PackagingAnalysisService.validateAndCleanResult(packagingResult);

    // Log activity
    await logActivity(
      user.id,
      'PACKAGING_ANALYZED',
      'meal_analyses',
      undefined,
      null,
      { 
        product_name: cleanResult.nom_produit,
        brand: cleanResult.marque,
        image_url: imageUrl
      },
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { packaging: cleanResult },
      message: 'Packaging analysis completed successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Packaging analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze packaging',
      message: 'An error occurred while analyzing packaging'
    } as ApiResponse);
  }
}

// =====================================================
// ENHANCED OCR PACKAGING ANALYSIS CONTROLLER
// =====================================================

export async function analyzePackagingOCR(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate request body
    const validation = AnalyzeMealInputSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid OCR packaging analysis input data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const { input_text, photo_data } = validation.data;

    if (!photo_data) {
      res.status(400).json({
        success: false,
        error: 'Image required',
        message: 'Photo data is required for OCR packaging analysis'
      } as ApiResponse);
      return;
    }

    // Upload image to Cloudinary
    const uploadResult = await ImageService.uploadBase64(photo_data, {
      folder: 'meal-photos',
      resource_type: 'image',
      format: 'jpg',
      transformation: [
        { width: 1024, height: 1024, crop: 'limit', quality: 'auto' }
      ]
    });

    const imageUrl = uploadResult.secure_url;

    // Perform enhanced OCR analysis in two steps
    const enhancedResult = await AIService.analyzeTwoStepProduct(imageUrl, input_text);
    
    // Format for both packaging structure and nutritional data
    const packagingResult = PackagingAnalysisService.validateAndCleanResult({
      nom_produit: enhancedResult.nom_produit || "",
      marque: enhancedResult.marque || "",
      type: enhancedResult.type || "",
      mentions_specifiques: enhancedResult.mentions_specifiques || [],
      contenu_paquet: enhancedResult.contenu_paquet || "",
      apparence_packaging: enhancedResult.apparence_packaging || "",
      langue: enhancedResult.langue || "Français"
    });

    // Log activity
    await logActivity(
      user.id,
      'OCR_PACKAGING_ANALYZED',
      'meal_analyses',
      undefined,
      null,
      { 
        product_name: packagingResult.nom_produit,
        brand: packagingResult.marque,
        ocr_confidence: enhancedResult.confidence_ocr,
        has_ocr_text: Boolean(enhancedResult.ocr_text),
        image_url: imageUrl
      },
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { 
        packaging: packagingResult,
        nutritional_data: {
          protein: enhancedResult.protein,
          calories: enhancedResult.calories,
          carbs: enhancedResult.carbs,
          fat: enhancedResult.fat,
          fiber: enhancedResult.fiber,
          enhanced_nutrition: enhancedResult.enhanced_nutrition,
          data_source: enhancedResult.dataSource,
          confidence: enhancedResult.confidence,
          confidence_ocr: enhancedResult.confidence_ocr
        },
        ocr_data: {
          extracted_text: enhancedResult.ocr_text,
          ingredients: enhancedResult.ingredients,
          interpretation_confidence: enhancedResult.confidence_ocr
        }
      },
      message: 'Enhanced OCR packaging analysis completed successfully'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Enhanced OCR packaging analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze packaging with OCR',
      message: 'An error occurred while performing enhanced OCR packaging analysis'
    } as ApiResponse);
  }
}