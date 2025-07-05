// Service API pour l'upload d'images
import { z } from 'zod';
import { 
  apiClient, 
  ApiResponse, 
  validateWithSchema, 
  withRetry 
} from './api.service';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Schéma pour upload depuis URL
const UploadFromUrlSchema = z.object({
  imageUrl: z.string().url('URL invalide'),
  filename: z.string().optional()
});

// Types TypeScript
export type UploadFromUrlRequest = z.infer<typeof UploadFromUrlSchema>;

export interface ImageUploadResult {
  url: string;
  thumbnailUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
}

// =====================================================
// SERVICE D'UPLOAD D'IMAGES
// =====================================================

export class UploadService {
  // Upload d'image depuis un fichier
  static async uploadImageFile(file: File): Promise<ImageUploadResult> {
    try {
      // Valider le fichier
      if (!file) {
        throw new Error('Aucun fichier sélectionné');
      }

      // Valider le type de fichier
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Type de fichier non supporté. Utilisez JPG, PNG ou WebP.');
      }

      // Valider la taille (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Fichier trop volumineux. Taille maximum: 5MB');
      }

      // Créer FormData
      const formData = new FormData();
      formData.append('image', file);

      console.log(`📤 Upload image: ${file.name} (${file.size} bytes)`);

      // Upload avec retry
      const response: ApiResponse<{ image: ImageUploadResult }> = await withRetry(
        async () => {
          const result = await fetch('/upload/image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
            },
            body: formData
          });

          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${result.status}`);
          }

          return result.json();
        },
        2, // 2 tentatives max pour les uploads
        3000 // 3 secondes de délai
      );

      if (response.success && response.data) {
        console.log(`✅ Upload réussi: ${response.data.image.url}`);
        return response.data.image;
      }

      throw new Error(response.message || 'Erreur lors de l\'upload');
    } catch (error: any) {
      console.error('❌ Erreur upload fichier:', error);
      throw new Error(error.message || 'Échec de l\'upload du fichier');
    }
  }

  // Upload d'image depuis une URL
  static async uploadImageFromUrl(data: UploadFromUrlRequest): Promise<ImageUploadResult> {
    // Validation côté client
    const validatedData = validateWithSchema(UploadFromUrlSchema, data);

    console.log(`📤 Upload image depuis URL: ${validatedData.imageUrl}`);

    const response: ApiResponse<{ image: ImageUploadResult }> = await withRetry(
      () => apiClient.post('/upload/image/url', validatedData),
      2,
      3000
    );

    if (response.success && response.data) {
      console.log(`✅ Upload URL réussi: ${response.data.image.url}`);
      return response.data.image;
    }

    throw new Error(response.message || 'Erreur lors de l\'upload depuis URL');
  }

  // Supprimer une image
  static async deleteImage(publicId: string): Promise<void> {
    if (!publicId) {
      throw new Error('ID public requis pour la suppression');
    }

    console.log(`🗑️ Suppression image: ${publicId}`);

    // Encoder le publicId pour l'URL
    const encodedPublicId = encodeURIComponent(publicId);

    const response: ApiResponse = await apiClient.delete(`/upload/image/${encodedPublicId}`);

    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de la suppression');
    }

    console.log(`✅ Image supprimée: ${publicId}`);
  }

  // Générer une signature pour upload direct (optionnel)
  static async generateUploadSignature(): Promise<UploadSignature> {
    const response: ApiResponse<{ signature: UploadSignature }> = await apiClient.post('/upload/signature');

    if (response.success && response.data) {
      return response.data.signature;
    }

    throw new Error(response.message || 'Erreur lors de la génération de signature');
  }

  // Obtenir une URL optimisée
  static async getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: string;
      format?: string;
    } = {}
  ): Promise<string> {
    if (!publicId) {
      throw new Error('ID public requis');
    }

    const encodedPublicId = encodeURIComponent(publicId);
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality);
    if (options.format) params.append('format', options.format);

    const queryString = params.toString();
    const url = `/upload/image/${encodedPublicId}/optimized${queryString ? `?${queryString}` : ''}`;

    const response: ApiResponse<{ url: string }> = await apiClient.get(url);

    if (response.success && response.data) {
      return response.data.url;
    }

    throw new Error(response.message || 'Erreur lors de la génération d\'URL optimisée');
  }

  // Upload d'image depuis canvas/base64
  static async uploadImageFromCanvas(
    canvas: HTMLCanvasElement,
    filename: string = 'canvas-image'
  ): Promise<ImageUploadResult> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Impossible de convertir le canvas en blob'));
          return;
        }

        try {
          const file = new File([blob], `${filename}.png`, { type: 'image/png' });
          const result = await this.uploadImageFile(file);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 'image/png', 0.9);
    });
  }

  // Upload d'image depuis data URL (base64)
  static async uploadImageFromDataUrl(
    dataUrl: string,
    filename: string = 'data-image'
  ): Promise<ImageUploadResult> {
    try {
      // Convertir data URL en blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Créer un fichier depuis le blob
      const file = new File([blob], `${filename}.jpg`, { type: blob.type || 'image/jpeg' });

      return await this.uploadImageFile(file);
    } catch (error: any) {
      console.error('❌ Erreur upload data URL:', error);
      throw new Error(error.message || 'Échec de l\'upload depuis data URL');
    }
  }

  // Compresser une image avant upload
  static async compressImage(
    file: File,
    maxWidth: number = 1200,
    maxHeight: number = 900,
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Redimensionner sur canvas
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Échec de la compression'));
              }
            },
            file.type,
            quality
          );
        } else {
          reject(new Error('Impossible de créer le contexte canvas'));
        }
      };

      img.onerror = () => reject(new Error('Impossible de charger l\'image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Valider une image avant upload
  static validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Type de fichier non supporté. Utilisez JPG, PNG ou WebP.'
      };
    }

    // Vérifier la taille (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Fichier trop volumineux. Taille maximum: 5MB'
      };
    }

    // Vérifier les dimensions minimales (optionnel)
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const minWidth = 100;
        const minHeight = 100;
        
        if (img.width < minWidth || img.height < minHeight) {
          resolve({
            isValid: false,
            error: `Image trop petite. Dimensions minimales: ${minWidth}x${minHeight}px`
          });
        } else {
          resolve({ isValid: true });
        }
      };
      img.onerror = () => resolve({
        isValid: false,
        error: 'Image corrompue ou format invalide'
      });
      img.src = URL.createObjectURL(file);
    }) as any; // Type workaround for Promise/sync return
  }
}

// =====================================================
// HOOKS UTILITAIRES
// =====================================================

import { useState, useCallback } from 'react';

// Hook pour gérer l'upload d'images
export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<ImageUploadResult | null> => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      // Valider le fichier
      const validation = UploadService.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Simuler le progrès
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await UploadService.uploadImageFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      return result;
    } catch (error: any) {
      setUploadError(error.message);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, []);

  return {
    uploadImage,
    isUploading,
    uploadProgress,
    uploadError,
    clearError: () => setUploadError(null)
  };
}