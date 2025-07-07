import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Check, X, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TermsAndConditionsModal from '@/components/TermsAndConditionsModal';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Schéma de validation du mot de passe
const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

// Schéma de validation complet
const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Veuillez entrer une adresse e-mail valide'),
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'Vous devez accepter les termes et conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// Helper pour vérifier les critères du mot de passe
const checkPasswordCriteria = (password: string) => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
});

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  showSwitchLink?: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSuccess, 
  onSwitchToLogin, 
  showSwitchLink = false 
}) => {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const password = watch('password');
  const acceptTerms = watch('acceptTerms');
  const passwordCriteria = checkPasswordCriteria(password || '');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        acceptTerms: data.acceptTerms,
      });
      toast.success('Inscription réussie !');
      onSuccess?.();
    } catch (err) {
      // L'erreur est gérée par le contexte et affichée
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant="destructive">
              <AlertTitle>Erreur d'inscription</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Nom complet</Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Votre nom complet"
              className="pl-12 h-12 text-base"
              {...register('name')}
              autoComplete="name"
            />
          </div>
          {errors.name && (
            <p className="text-sm text-destructive pt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              className="pl-12 h-12 text-base"
              {...register('email')}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive pt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Créer un mot de passe"
              className="pl-12 pr-12 h-12 text-base"
              {...register('password')}
              autoComplete="new-password"
              onChange={async (e) => {
                register('password').onChange(e);
                if (e.target.value) {
                  await trigger('password');
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-transparent text-muted-foreground"
              onClick={togglePasswordVisibility}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {/* Critères du mot de passe */}
          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-muted/50 rounded-lg p-3 space-y-2"
            >
              <p className="text-xs font-medium text-muted-foreground mb-2">Critères du mot de passe :</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={cn("flex items-center gap-2", passwordCriteria.length ? "text-green-600" : "text-muted-foreground")}>
                  {passwordCriteria.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  8 caractères min.
                </div>
                <div className={cn("flex items-center gap-2", passwordCriteria.uppercase ? "text-green-600" : "text-muted-foreground")}>
                  {passwordCriteria.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  1 majuscule
                </div>
                <div className={cn("flex items-center gap-2", passwordCriteria.lowercase ? "text-green-600" : "text-muted-foreground")}>
                  {passwordCriteria.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  1 minuscule
                </div>
                <div className={cn("flex items-center gap-2", passwordCriteria.number ? "text-green-600" : "text-muted-foreground")}>
                  {passwordCriteria.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  1 chiffre
                </div>
              </div>
            </motion.div>
          )}
          
          {errors.password && (
            <p className="text-sm text-destructive pt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirmer votre mot de passe"
              className="pl-12 pr-12 h-12 text-base"
              {...register('confirmPassword')}
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-transparent text-muted-foreground"
              onClick={toggleConfirmPasswordVisibility}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive pt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setValue('acceptTerms', !!checked, { shouldValidate: true })}
              className="mt-0.5"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="acceptTerms"
                className="text-sm font-normal cursor-pointer"
              >
                J'accepte les{' '}
                <TermsAndConditionsModal>
                  <span className="font-semibold text-primary hover:underline cursor-pointer">
                    Termes et Conditions
                  </span>
                </TermsAndConditionsModal>
              </Label>
              {errors.acceptTerms && (
                <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base group"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création du compte...
            </span>
          ) : (
            <>
              Créer mon compte
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {showSwitchLink && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Vous avez déjà un compte ?{' '}
            <Button
              variant="link"
              className="font-semibold text-primary hover:underline p-0 h-auto"
              onClick={onSwitchToLogin}
            >
              Connectez-vous
            </Button>
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;