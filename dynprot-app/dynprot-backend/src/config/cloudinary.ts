// Configuration Cloudinary pour le stockage d'images
import { v2 as cloudinary } from 'cloudinary';
import { config } from './env';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Options de upload pour les images de repas
export const MEAL_IMAGE_OPTIONS = {
  folder: 'dynprot/meals',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  max_file_size: 5 * 1024 * 1024, // 5MB
  quality: 'auto',
  fetch_format: 'auto',
  transformation: [
    {
      width: 1200,
      height: 900,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto',
      flags: 'progressive',
    },
    {
      width: 800,
      height: 600,
      crop: 'limit',
      quality: 'auto:eco',
      fetch_format: 'auto',
      suffix: '_medium',
    },
    {
      width: 300,
      height: 225,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:low',
      fetch_format: 'auto',
      suffix: '_thumb',
    }
  ],
  tags: ['meal', 'food-analysis'],
};

// Interface pour les résultats d'upload
export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  createdAt: string;
}

// Service de gestion des images
export class ImageService {
  // Upload d'une image depuis un buffer
  static async uploadFromBuffer(
    buffer: Buffer,
    filename: string,
    userId: string
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions = {
        ...MEAL_IMAGE_OPTIONS,
        public_id: `${userId}/${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
        context: {
          user_id: userId,
          upload_date: new Date().toISOString(),
        },
      };

      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString('base64')}`,
        uploadOptions
      );

      // Générer les URLs optimisées
      const thumbnailUrl = cloudinary.url(result.public_id, {
        width: 300,
        height: 225,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:low',
        fetch_format: 'auto',
        suffix: '_thumb',
      });

      const mediumUrl = cloudinary.url(result.public_id, {
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 'auto:eco',
        fetch_format: 'auto',
        suffix: '_medium',
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        thumbnailUrl,
        mediumUrl,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
      };
    } catch (error) {
      console.error('Erreur upload Cloudinary:', error);
      throw new Error('Échec de l\'upload de l\'image');
    }
  }

  // Upload depuis une URL (pour les images provenant du frontend)
  static async uploadFromUrl(
    imageUrl: string,
    userId: string,
    filename?: string
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions = {
        ...MEAL_IMAGE_OPTIONS,
        public_id: `${userId}/${Date.now()}_${filename || 'image'}`,
        context: {
          user_id: userId,
          upload_date: new Date().toISOString(),
          source: 'url',
        },
      };

      const result = await cloudinary.uploader.upload(imageUrl, uploadOptions);

      const thumbnailUrl = cloudinary.url(result.public_id, {
        width: 300,
        height: 225,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:low',
        fetch_format: 'auto',
        suffix: '_thumb',
      });

      const mediumUrl = cloudinary.url(result.public_id, {
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 'auto:eco',
        fetch_format: 'auto',
        suffix: '_medium',
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        thumbnailUrl,
        mediumUrl,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
      };
    } catch (error) {
      console.error('Erreur upload URL Cloudinary:', error);
      throw new Error('Échec de l\'upload de l\'image depuis URL');
    }
  }

  // Upload depuis une chaîne base64
  static async uploadBase64(
    base64Data: string,
    options: any = {}
  ): Promise<any> {
    try {
      const result = await cloudinary.uploader.upload(base64Data, options);
      return result;
    } catch (error) {
      console.error('Erreur upload base64 Cloudinary:', error);
      throw new Error('Échec de l\'upload de l\'image base64');
    }
  }

  // Supprimer une image
  static async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Erreur suppression Cloudinary:', error);
      // Ne pas faire échouer l'opération si la suppression échoue
    }
  }

  // Optimiser une image existante
  static getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: string;
      format?: string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      quality: 'auto:good',
      fetch_format: 'auto',
      ...options,
    });
  }

  // Générer une URL signée pour upload direct (optionnel)
  static generateUploadSignature(userId: string): {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
  } {
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      ...MEAL_IMAGE_OPTIONS,
      timestamp,
      folder: `${MEAL_IMAGE_OPTIONS.folder}/${userId}`,
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      config.cloudinary.apiSecret
    );

    return {
      signature,
      timestamp,
      apiKey: config.cloudinary.apiKey,
      cloudName: config.cloudinary.cloudName,
    };
  }

  // Valider le format d'image
  static validateImageFormat(mimetype: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    return allowedTypes.includes(mimetype);
  }

  // Valider la taille d'image
  static validateImageSize(size: number): boolean {
    return size <= MEAL_IMAGE_OPTIONS.max_file_size;
  }
}

export { cloudinary };