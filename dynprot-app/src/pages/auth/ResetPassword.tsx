import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthService } from '@/services/api.auth';

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, 
      'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  confirmPassword: z.string().min(1, 'Veuillez confirmer votre mot de passe'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { 
      newPassword: '',
      confirmPassword: ''
    },
  });

  const newPassword = watch('newPassword');

  // Validation du token au chargement de la page
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setError('Lien de réinitialisation invalide');
        setIsValidating(false);
        return;
      }

      try {
        // Essayer de décoder le token côté client pour une validation rapide
        // Note: Cette validation sera également faite côté serveur
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp && payload.exp < now) {
          setTokenValid(false);
          setError('Le lien de réinitialisation a expiré');
        } else if (payload.type !== 'password_reset') {
          setTokenValid(false);
          setError('Lien de réinitialisation invalide');
        } else {
          setTokenValid(true);
        }
      } catch (err) {
        setTokenValid(false);
        setError('Lien de réinitialisation invalide');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Token manquant');
      return;
    }

    setError(null);
    try {
      await AuthService.resetPassword({
        token,
        newPassword: data.newPassword
      });
      
      setSubmitted(true);
      toast.success('Mot de passe réinitialisé avec succès !');
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la réinitialisation du mot de passe.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Calcul de la force du mot de passe
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1: return { text: 'Très faible', color: 'bg-red-500' };
      case 2: return { text: 'Faible', color: 'bg-orange-500' };
      case 3: return { text: 'Moyen', color: 'bg-yellow-500' };
      case 4: return { text: 'Fort', color: 'bg-green-500' };
      case 5: return { text: 'Très fort', color: 'bg-emerald-500' };
      default: return { text: '', color: '' };
    }
  };

  const passwordStrength = getPasswordStrength(newPassword || '');
  const strengthInfo = getPasswordStrengthText(passwordStrength);

  if (isValidating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-lg">Validation du lien de réinitialisation...</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (tokenValid === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center p-8 bg-red-50 dark:bg-red-900/20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 shadow-lg"
            >
              <AlertCircle className="h-8 w-8 text-white" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-red-600">Lien invalide</CardTitle>
            <CardDescription className="text-base">
              {error || 'Ce lien de réinitialisation est invalide ou a expiré.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Vous pouvez demander un nouveau lien de réinitialisation.
              </p>
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => navigate('/forgot-password')}
                >
                  Demander un nouveau lien
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => navigate('/login')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 text-center p-8 bg-gray-50 dark:bg-gray-800/50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 shadow-lg"
          >
            {submitted ? (
              <CheckCircle className="h-8 w-8 text-white" />
            ) : (
              <Lock className="h-8 w-8 text-white" />
            )}
          </motion.div>
          <CardTitle className="text-3xl font-bold">
            {submitted ? 'Mot de passe réinitialisé !' : 'Nouveau mot de passe'}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {submitted 
              ? 'Votre mot de passe a été mis à jour avec succès.'
              : 'Choisissez un mot de passe sécurisé pour votre compte.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <p className="text-lg font-medium text-green-600">Réinitialisation réussie !</p>
              <p className="text-muted-foreground">
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
              <Button className="mt-4 w-full" onClick={() => navigate('/login')}>
                Se connecter
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Entrez votre nouveau mot de passe"
                    className="pl-12 h-12 text-base"
                    {...register('newPassword')}
                    autoComplete="new-password"
                  />
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive pt-1">{errors.newPassword.message}</p>
                )}
                
                {/* Indicateur de force du mot de passe */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Force du mot de passe :</span>
                      <span className={`font-medium ${
                        passwordStrength >= 4 ? 'text-green-600' : 
                        passwordStrength >= 3 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {strengthInfo.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${strengthInfo.color}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirmez votre nouveau mot de passe"
                    className="pl-12 h-12 text-base"
                    {...register('confirmPassword')}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive pt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Critères de sécurité :
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                  <li className="flex items-center">
                    <span className={`mr-2 ${newPassword && newPassword.length >= 8 ? 'text-green-500' : ''}`}>
                      {newPassword && newPassword.length >= 8 ? '✓' : '•'}
                    </span>
                    Au moins 8 caractères
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${newPassword && /[a-z]/.test(newPassword) ? 'text-green-500' : ''}`}>
                      {newPassword && /[a-z]/.test(newPassword) ? '✓' : '•'}
                    </span>
                    Une lettre minuscule
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${newPassword && /[A-Z]/.test(newPassword) ? 'text-green-500' : ''}`}>
                      {newPassword && /[A-Z]/.test(newPassword) ? '✓' : '•'}
                    </span>
                    Une lettre majuscule
                  </li>
                  <li className="flex items-center">
                    <span className={`mr-2 ${newPassword && /\d/.test(newPassword) ? 'text-green-500' : ''}`}>
                      {newPassword && /\d/.test(newPassword) ? '✓' : '•'}
                    </span>
                    Un chiffre
                  </li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base" 
                disabled={isSubmitting || passwordStrength < 3}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Réinitialisation...
                  </span>
                ) : (
                  'Réinitialiser le mot de passe'
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ResetPassword;