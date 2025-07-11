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
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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

        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Label htmlFor="name" className="text-lg font-semibold">Nom complet</Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" strokeWidth={2} />
            <Input
              id="name"
              type="text"
              placeholder="Votre nom complet"
              className="pl-14 h-14 text-lg font-medium shadow-ios"
              {...register('name')}
              autoComplete="name"
            />
          </div>
          {errors.name && (
            <motion.p 
              className="text-base text-destructive font-medium pt-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {errors.name.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label htmlFor="email" className="text-lg font-semibold">Adresse e-mail</Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" strokeWidth={2} />
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              className="pl-14 h-14 text-lg font-medium shadow-ios"
              {...register('email')}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <motion.p 
              className="text-base text-destructive font-medium pt-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {errors.email.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Label htmlFor="password" className="text-lg font-semibold">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" strokeWidth={2} />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Créer un mot de passe"
              className="pl-14 pr-14 h-14 text-lg font-medium shadow-ios"
              {...register('password')}
              autoComplete="new-password"
              onChange={async (e) => {
                register('password').onChange(e);
                if (e.target.value) {
                  await trigger('password');
                }
              }}
            />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-primary/10 text-muted-foreground"
                onClick={togglePasswordVisibility}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-6 w-6" strokeWidth={2} />
                ) : (
                  <Eye className="h-6 w-6" strokeWidth={2} />
                )}
              </Button>
            </motion.div>
          </div>
          
          {/* Critères du mot de passe */}
          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-muted/30 backdrop-blur-xl rounded-2xl p-5 space-y-3 border border-border/20 shadow-ios-sm"
            >
              <p className="text-base font-semibold text-muted-foreground mb-3">Critères du mot de passe :</p>
              <div className="grid grid-cols-2 gap-3 text-base">
                <motion.div 
                  className={cn("flex items-center gap-3", passwordCriteria.length ? "text-ios-green" : "text-muted-foreground")}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {passwordCriteria.length ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <X className="h-5 w-5" strokeWidth={2.5} />}
                  8 caractères min.
                </motion.div>
                <motion.div 
                  className={cn("flex items-center gap-3", passwordCriteria.uppercase ? "text-ios-green" : "text-muted-foreground")}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {passwordCriteria.uppercase ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <X className="h-5 w-5" strokeWidth={2.5} />}
                  1 majuscule
                </motion.div>
                <motion.div 
                  className={cn("flex items-center gap-3", passwordCriteria.lowercase ? "text-ios-green" : "text-muted-foreground")}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {passwordCriteria.lowercase ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <X className="h-5 w-5" strokeWidth={2.5} />}
                  1 minuscule
                </motion.div>
                <motion.div 
                  className={cn("flex items-center gap-3", passwordCriteria.number ? "text-ios-green" : "text-muted-foreground")}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {passwordCriteria.number ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <X className="h-5 w-5" strokeWidth={2.5} />}
                  1 chiffre
                </motion.div>
              </div>
            </motion.div>
          )}
          
          {errors.password && (
            <motion.p 
              className="text-base text-destructive font-medium pt-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {errors.password.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Label htmlFor="confirmPassword" className="text-lg font-semibold">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" strokeWidth={2} />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirmer votre mot de passe"
              className="pl-14 pr-14 h-14 text-lg font-medium shadow-ios"
              {...register('confirmPassword')}
              autoComplete="new-password"
            />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-primary/10 text-muted-foreground"
                onClick={toggleConfirmPasswordVisibility}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-6 w-6" strokeWidth={2} />
                ) : (
                  <Eye className="h-6 w-6" strokeWidth={2} />
                )}
              </Button>
            </motion.div>
          </div>
          {errors.confirmPassword && (
            <motion.p 
              className="text-base text-destructive font-medium pt-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {errors.confirmPassword.message}
            </motion.p>
          )}
        </motion.div>

        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-start space-x-4 p-4 rounded-2xl bg-muted/30 backdrop-blur-xl border border-border/20">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setValue('acceptTerms', !!checked, { shouldValidate: true })}
              className="mt-1 scale-125"
            />
            <div className="grid gap-2 leading-relaxed">
              <Label
                htmlFor="acceptTerms"
                className="text-base font-medium cursor-pointer"
              >
                J'accepte les{' '}
                <TermsAndConditionsModal>
                  <motion.span 
                    className="font-bold text-primary hover:underline cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Termes et Conditions
                  </motion.span>
                </TermsAndConditionsModal>
              </Label>
              {errors.acceptTerms && (
                <motion.p 
                  className="text-base text-destructive font-medium"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {errors.acceptTerms.message}
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            type="submit"
            variant="ios"
            className="w-full h-16 text-xl font-bold shadow-ios-lg group"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Création du compte...
              </span>
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </>
            )}
          </Button>
        </motion.div>
      </form>

      {showSwitchLink && (
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-lg text-muted-foreground font-medium">
            Vous avez déjà un compte ?{' '}
            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="link"
                className="font-bold text-primary hover:underline p-0 h-auto text-lg"
                onClick={onSwitchToLogin}
              >
                Connectez-vous
              </Button>
            </motion.span>
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RegisterForm;