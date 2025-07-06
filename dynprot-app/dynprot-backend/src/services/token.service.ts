import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'password_reset' | 'email_verification';
  expires: number;
}

export class TokenService {
  // Générer un token sécurisé pour la réinitialisation de mot de passe
  static generatePasswordResetToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      userId,
      email,
      type: 'password_reset',
      expires: Date.now() + (60 * 60 * 1000), // 1 heure
    };

    return jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
  }

  // Générer un token sécurisé pour la vérification d'email
  static generateEmailVerificationToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      userId,
      email,
      type: 'email_verification',
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 heures
    };

    return jwt.sign(payload, config.jwt.secret, { expiresIn: '24h' });
  }

  // Valider un token et retourner le payload
  static validateToken(token: string, expectedType: 'password_reset' | 'email_verification'): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      
      // Vérifier le type de token
      if (decoded.type !== expectedType) {
        console.error(`Type de token invalide. Attendu: ${expectedType}, Reçu: ${decoded.type}`);
        return null;
      }

      // Vérifier l'expiration (sécurité supplémentaire)
      if (Date.now() > decoded.expires) {
        console.error('Token expiré');
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Erreur validation token:', error);
      return null;
    }
  }

  // Générer un token aléatoire sécurisé (pour les IDs de tokens en base)
  static generateSecureRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hasher un token pour le stockage en base de données
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Vérifier si un token hashé correspond au token en clair
  static verifyHashedToken(token: string, hashedToken: string): boolean {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash, 'hex'),
      Buffer.from(hashedToken, 'hex')
    );
  }

  // Générer un token de session unique
  static generateSessionToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  // Créer un token de réinitialisation avec ID unique pour la base de données
  static createPasswordResetTokenPair(userId: string, email: string): {
    token: string;
    hashedToken: string;
    tokenId: string;
  } {
    // Générer un ID unique pour le token
    const tokenId = this.generateSecureRandomToken();
    
    // Générer le token JWT avec l'ID inclus
    const jwtPayload = {
      userId,
      email,
      type: 'password_reset',
      tokenId,
      expires: Date.now() + (60 * 60 * 1000), // 1 heure
    };

    const token = jwt.sign(jwtPayload, config.jwt.secret, { expiresIn: '1h' });
    const hashedToken = this.hashToken(token);

    return {
      token,
      hashedToken,
      tokenId,
    };
  }

  // Créer un token de vérification d'email avec ID unique
  static createEmailVerificationTokenPair(userId: string, email: string): {
    token: string;
    hashedToken: string;
    tokenId: string;
  } {
    const tokenId = this.generateSecureRandomToken();
    
    const jwtPayload = {
      userId,
      email,
      type: 'email_verification',
      tokenId,
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 heures
    };

    const token = jwt.sign(jwtPayload, config.jwt.secret, { expiresIn: '24h' });
    const hashedToken = this.hashToken(token);

    return {
      token,
      hashedToken,
      tokenId,
    };
  }

  // Valider un token avec validation contre la base de données
  static validateTokenWithId(token: string, expectedType: 'password_reset' | 'email_verification'): 
    (TokenPayload & { tokenId: string }) | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload & { tokenId: string };
      
      // Vérifier le type de token
      if (decoded.type !== expectedType) {
        console.error(`Type de token invalide. Attendu: ${expectedType}, Reçu: ${decoded.type}`);
        return null;
      }

      // Vérifier l'expiration
      if (Date.now() > decoded.expires) {
        console.error('Token expiré');
        return null;
      }

      // Vérifier la présence du tokenId
      if (!decoded.tokenId) {
        console.error('Token ID manquant');
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Erreur validation token:', error);
      return null;
    }
  }
}