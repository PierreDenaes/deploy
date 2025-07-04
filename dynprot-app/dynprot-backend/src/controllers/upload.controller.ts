// Contrôleur pour l'upload d'images
import { Request, Response } from 'express';
import multer from 'multer';
import { ImageService } from '../config/cloudinary';
import { AuthUser, ApiResponse } from '../types/api.types';
import { logActivity } from '../lib/prisma';

// Configuration Multer pour upload en mémoire
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Valider le type de fichier
    if (ImageService.validateImageFormat(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez JPG, PNG ou WebP.'));
    }
  },
});

// Interface pour les réponses d'upload
interface UploadResponse {
  url: string;
  thumbnailUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

// Helper pour obtenir le contexte client
function getClientContext(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  };
}

// Upload d'une image de repas
export async function uploadMealImage(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No file provided',
        message: 'Veuillez sélectionner une image à uploader'
      } as ApiResponse);
      return;
    }

    // Valider la taille du fichier
    if (!ImageService.validateImageSize(file.size)) {
      res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'La taille du fichier dépasse la limite de 5MB'
      } as ApiResponse);
      return;
    }

    console.log(`📤 Upload image pour ${user.id}: ${file.originalname} (${file.size} bytes)`);

    // Upload vers Cloudinary
    const uploadResult = await ImageService.uploadFromBuffer(
      file.buffer,
      file.originalname,
      user.id
    );

    // Logger l'activité
    await logActivity(
      user.id,
      'IMAGE_UPLOADED',
      'uploads',
      uploadResult.publicId,
      null,
      {
        filename: file.originalname,
        size: file.size,
        format: uploadResult.format,
        url: uploadResult.secureUrl
      },
      getClientContext(req)
    );

    const response: UploadResponse = {
      url: uploadResult.secureUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      publicId: uploadResult.publicId,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      size: uploadResult.bytes,
    };

    console.log(`✅ Upload réussi: ${uploadResult.secureUrl}`);

    res.status(200).json({
      success: true,
      data: { image: response },
      message: 'Image uploadée avec succès'
    } as ApiResponse);
  } catch (error: any) {
    console.error('❌ Erreur upload image:', error);
    
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message || 'Erreur lors de l\'upload de l\'image'
    } as ApiResponse);
  }
}

// Upload d'image depuis une URL (pour les images web)
export async function uploadMealImageFromUrl(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { imageUrl, filename } = req.body;

    if (!imageUrl) {
      res.status(400).json({
        success: false,
        error: 'No image URL provided',
        message: 'URL d\'image requise'
      } as ApiResponse);
      return;
    }

    // Valider que c'est une URL valide
    try {
      new URL(imageUrl);
    } catch {
      res.status(400).json({
        success: false,
        error: 'Invalid URL',
        message: 'URL d\'image invalide'
      } as ApiResponse);
      return;
    }

    console.log(`📤 Upload image depuis URL pour ${user.id}: ${imageUrl}`);

    // Upload vers Cloudinary depuis URL
    const uploadResult = await ImageService.uploadFromUrl(
      imageUrl,
      user.id,
      filename || 'image-from-url'
    );

    // Logger l'activité
    await logActivity(
      user.id,
      'IMAGE_UPLOADED_FROM_URL',
      'uploads',
      uploadResult.publicId,
      null,
      {
        sourceUrl: imageUrl,
        filename: filename || 'image-from-url',
        format: uploadResult.format,
        url: uploadResult.secureUrl
      },
      getClientContext(req)
    );

    const response: UploadResponse = {
      url: uploadResult.secureUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      publicId: uploadResult.publicId,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      size: uploadResult.bytes,
    };

    console.log(`✅ Upload depuis URL réussi: ${uploadResult.secureUrl}`);

    res.status(200).json({
      success: true,
      data: { image: response },
      message: 'Image uploadée depuis URL avec succès'
    } as ApiResponse);
  } catch (error: any) {
    console.error('❌ Erreur upload image depuis URL:', error);
    
    res.status(500).json({
      success: false,
      error: 'Upload from URL failed',
      message: error.message || 'Erreur lors de l\'upload depuis URL'
    } as ApiResponse);
  }
}

// Supprimer une image
export async function deleteMealImage(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { publicId } = req.params;

    if (!publicId) {
      res.status(400).json({
        success: false,
        error: 'Public ID required',
        message: 'ID public de l\'image requis'
      } as ApiResponse);
      return;
    }

    // Vérifier que l'image appartient à l'utilisateur
    if (!publicId.startsWith(`dynprot/meals/${user.id}/`)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Vous ne pouvez supprimer que vos propres images'
      } as ApiResponse);
      return;
    }

    console.log(`🗑️ Suppression image ${publicId} pour ${user.id}`);

    // Supprimer de Cloudinary
    await ImageService.deleteImage(publicId);

    // Logger l'activité
    await logActivity(
      user.id,
      'IMAGE_DELETED',
      'uploads',
      publicId,
      { publicId },
      null,
      getClientContext(req)
    );

    console.log(`✅ Image supprimée: ${publicId}`);

    res.status(200).json({
      success: true,
      message: 'Image supprimée avec succès'
    } as ApiResponse);
  } catch (error: any) {
    console.error('❌ Erreur suppression image:', error);
    
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: error.message || 'Erreur lors de la suppression de l\'image'
    } as ApiResponse);
  }
}

// Générer une signature pour upload direct (optionnel)
export async function generateUploadSignature(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;

    console.log(`🔐 Génération signature upload pour ${user.id}`);

    // Générer signature Cloudinary
    const signature = ImageService.generateUploadSignature(user.id);

    res.status(200).json({
      success: true,
      data: { signature },
      message: 'Signature générée avec succès'
    } as ApiResponse);
  } catch (error: any) {
    console.error('❌ Erreur génération signature:', error);
    
    res.status(500).json({
      success: false,
      error: 'Signature generation failed',
      message: error.message || 'Erreur lors de la génération de signature'
    } as ApiResponse);
  }
}

// Obtenir une URL optimisée pour une image existante
export async function getOptimizedImageUrl(req: Request, res: Response): Promise<void> {
  try {
    const { publicId } = req.params;
    const { width, height, quality, format } = req.query;

    if (!publicId) {
      res.status(400).json({
        success: false,
        error: 'Public ID required',
        message: 'ID public de l\'image requis'
      } as ApiResponse);
      return;
    }

    // Générer URL optimisée
    const optimizedUrl = ImageService.getOptimizedUrl(publicId, {
      width: width ? parseInt(width as string) : undefined,
      height: height ? parseInt(height as string) : undefined,
      quality: quality as string,
      format: format as string,
    });

    res.status(200).json({
      success: true,
      data: { url: optimizedUrl },
      message: 'URL optimisée générée'
    } as ApiResponse);
  } catch (error: any) {
    console.error('❌ Erreur génération URL optimisée:', error);
    
    res.status(500).json({
      success: false,
      error: 'URL generation failed',
      message: error.message || 'Erreur lors de la génération d\'URL'
    } as ApiResponse);
  }
}