import { Resend } from 'resend';
import { config } from '../config/env';

const resend = new Resend(config.resend.apiKey);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  // Envoyer un email de réinitialisation de mot de passe
  static async sendPasswordReset(email: string, resetToken: string, firstName?: string): Promise<void> {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;
    const displayName = firstName || 'Utilisateur';
    
    const emailTemplate: EmailTemplate = {
      to: email,
      subject: 'Réinitialisation de votre mot de passe - DynProt',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de mot de passe</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { 
              display: inline-block; 
              background-color: #6366f1; 
              color: white; 
              text-decoration: none; 
              padding: 12px 24px; 
              border-radius: 6px; 
              font-weight: bold; 
              margin: 20px 0; 
            }
            .warning { background-color: #fef3cd; border: 1px solid #fdbf47; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { font-size: 12px; color: #6b7280; margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>DynProt</h1>
              <p>Réinitialisation de votre mot de passe</p>
            </div>
            <div class="content">
              <p>Bonjour ${displayName},</p>
              
              <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte DynProt.</p>
              
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </p>
              
              <div class="warning">
                <strong>⚠️ Important :</strong>
                <ul>
                  <li>Ce lien expire dans 1 heure</li>
                  <li>Il ne peut être utilisé qu'une seule fois</li>
                  <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                </ul>
              </div>
              
              <p>Si le bouton ne fonctionne pas, vous pouvez copier-coller ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${resetUrl}</p>
              
              <p>Cordialement,<br>L'équipe DynProt</p>
            </div>
            <div class="footer">
              <p>Si vous avez des questions, contactez-nous à support@dynprot.com</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await this.sendEmail(emailTemplate);
  }

  // Envoyer un email de vérification
  static async sendEmailVerification(email: string, verificationToken: string, firstName?: string): Promise<void> {
    const verificationUrl = `${config.app.frontendUrl}/verify-email?token=${verificationToken}`;
    const displayName = firstName || 'Utilisateur';
    
    const emailTemplate: EmailTemplate = {
      to: email,
      subject: 'Vérifiez votre adresse email - DynProt',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vérification d'email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { 
              display: inline-block; 
              background-color: #10b981; 
              color: white; 
              text-decoration: none; 
              padding: 12px 24px; 
              border-radius: 6px; 
              font-weight: bold; 
              margin: 20px 0; 
            }
            .footer { font-size: 12px; color: #6b7280; margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>DynProt</h1>
              <p>Bienvenue ! Vérifiez votre email</p>
            </div>
            <div class="content">
              <p>Bonjour ${displayName},</p>
              
              <p>Merci de vous être inscrit sur DynProt ! Pour commencer à utiliser votre compte, veuillez vérifier votre adresse email.</p>
              
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Vérifier mon email</a>
              </p>
              
              <p>Si le bouton ne fonctionne pas, vous pouvez copier-coller ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${verificationUrl}</p>
              
              <p>Ce lien expire dans 24 heures.</p>
              
              <p>Cordialement,<br>L'équipe DynProt</p>
            </div>
            <div class="footer">
              <p>Si vous avez des questions, contactez-nous à support@dynprot.com</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await this.sendEmail(emailTemplate);
  }

  // Envoyer un email générique
  private static async sendEmail(emailTemplate: EmailTemplate): Promise<void> {
    try {
      const result = await resend.emails.send({
        from: config.resend.fromEmail,
        to: emailTemplate.to,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      if (result.error) {
        console.error('Erreur envoi email:', result.error);
        throw new Error(`Erreur envoi email: ${result.error.message}`);
      }

      console.log('Email envoyé avec succès:', result.data?.id);
    } catch (error) {
      console.error('Erreur service email:', error);
      throw new Error('Impossible d\'envoyer l\'email');
    }
  }

  // Vérifier la configuration du service
  static async testConfiguration(): Promise<boolean> {
    try {
      // Test simple avec une requête à l'API Resend
      const result = await resend.emails.send({
        from: config.resend.fromEmail,
        to: 'test@example.com',
        subject: 'Test configuration',
        html: '<p>Test</p>',
      });

      // Même si l'email n'est pas envoyé, on vérifie qu'il n'y a pas d'erreur d'API
      return true;
    } catch (error: any) {
      console.error('Configuration email invalide:', error);
      return false;
    }
  }
}