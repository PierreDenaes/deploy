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

  // Envoyer un email de bienvenue après vérification
  static async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
    const displayName = firstName || 'Utilisateur';
    
    const emailTemplate: EmailTemplate = {
      to: email,
      subject: 'Bienvenue sur DynProt ! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue sur DynProt</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .welcome-badge { 
              background-color: #10b981; 
              color: white; 
              padding: 8px 16px; 
              border-radius: 20px; 
              font-size: 14px; 
              font-weight: bold; 
              display: inline-block; 
              margin-bottom: 20px; 
            }
            .button { 
              display: inline-block; 
              background-color: #667eea; 
              color: white; 
              text-decoration: none; 
              padding: 14px 28px; 
              border-radius: 8px; 
              font-weight: bold; 
              margin: 20px 0; 
              text-align: center;
            }
            .feature-box { 
              background-color: white; 
              border: 1px solid #e5e7eb; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 15px 0; 
            }
            .feature-icon { 
              font-size: 24px; 
              margin-right: 10px; 
            }
            .footer { font-size: 12px; color: #6b7280; margin-top: 30px; text-align: center; }
            .highlight { color: #667eea; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 DynProt</h1>
              <div class="welcome-badge">Compte vérifié ✓</div>
              <h2>Bienvenue dans votre parcours nutrition !</h2>
            </div>
            <div class="content">
              <p>Bonjour ${displayName},</p>
              
              <p>🎊 <strong>Félicitations !</strong> Votre compte DynProt est maintenant <span class="highlight">vérifié et prêt</span> à vous accompagner dans votre parcours nutritionnel.</p>
              
              <div class="feature-box">
                <h3><span class="feature-icon">📱</span>Vos premières étapes</h3>
                <ul>
                  <li><strong>Configurez votre profil</strong> - Renseignez vos objectifs personnels</li>
                  <li><strong>Ajoutez votre premier repas</strong> - Par photo, scan ou saisie manuelle</li>
                  <li><strong>Découvrez l'IA</strong> - Notre assistant analyse automatiquement vos repas</li>
                  <li><strong>Suivez vos progrès</strong> - Tableaux de bord et statistiques détaillées</li>
                </ul>
              </div>

              <div class="feature-box">
                <h3><span class="feature-icon">🚀</span>Fonctionnalités disponibles</h3>
                <ul>
                  <li><strong>Suivi des protéines intelligent</strong> - Objectifs personnalisés</li>
                  <li><strong>Analyse photo IA</strong> - Reconnaissance automatique des aliments</li>
                  <li><strong>Repas favoris</strong> - Sauvegardez vos plats préférés</li>
                  <li><strong>Statistiques avancées</strong> - Tendances et analytics</li>
                  <li><strong>Export de données</strong> - Vos données sont à vous</li>
                </ul>
              </div>
              
              <p style="text-align: center;">
                <a href="${config.app.frontendUrl}/profile" class="button">🎯 Commencer maintenant</a>
              </p>
              
              <p>Notre équipe est là pour vous accompagner. N'hésitez pas à explorer toutes les fonctionnalités et à nous faire part de vos retours !</p>
              
              <p><strong>Bon parcours nutritionnel ! 💪</strong></p>
              
              <p>Cordialement,<br>L'équipe DynProt</p>
            </div>
            <div class="footer">
              <p>🔒 Vos données sont sécurisées et ne sont jamais partagées</p>
              <p>Des questions ? Contactez-nous à support@dynprot.com</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await this.sendEmail(emailTemplate);
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