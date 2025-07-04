import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Schéma de validation du mot de passe
const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Doit contenir au moins une minuscule')
  .regex(/\d/, 'Doit contenir au moins un chiffre')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Doit contenir au moins un caractère spécial');

// Schéma de validation de l'inscription
const registerSchema = z
  .object({
    name: z.string().min(2, 'Le nom doit faire au moins 2 caractères').max(50, 'Le nom doit faire moins de 50 caractères'),
    email: z.string().email('Veuillez entrer une adresse e-mail valide'),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, 'Vous devez accepter les termes et conditions'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// Vérificateur de force de mot de passe
const getPasswordStrength = (password: string) => {
  const checks = [
    { id: 'length', label: '8 caractères minimum', valid: password.length >= 8 },
    { id: 'uppercase', label: 'Une majuscule', valid: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'Une minuscule', valid: /[a-z]/.test(password) },
    { id: 'number', label: 'Un chiffre', valid: /\d/.test(password) },
    { id: 'special', label: 'Un caractère spécial', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  
  const validCount = checks.filter(check => check.valid).length;
  const strength = validCount === 5 ? 'fort' : validCount >= 3 ? 'moyen' : 'faible';
  
  return { checks, strength, score: validCount };
};

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/onboarding';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
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
  const passwordStrength = password ? getPasswordStrength(password) : null;

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      await registerUser({
        name: data.name ?? '',
        email: data.email ?? '',
        password: data.password ?? '',
        confirmPassword: data.confirmPassword ?? '',
        acceptTerms: data.acceptTerms ?? false,
      });
      toast.success('Compte créé avec succès !');
      navigate(from, { replace: true });
    } catch (err) {
      // L'erreur est gérée par le contexte
    }
  };

  const getStrengthColor = (strength: string) => {
    if (strength === 'fort') return 'bg-green-500';
    if (strength === 'moyen') return 'bg-yellow-500';
    return 'bg-red-500';
  };

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
            <span className="text-3xl font-bold text-white">D</span>
          </motion.div>
          <CardTitle className="text-3xl font-bold">Créez votre compte</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Rejoignez-nous pour un suivi nutritionnel intelligent
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
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
              <Label htmlFor="email">Email</Label>
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
                  placeholder="Créez un mot de passe sécurisé"
                  className="pl-12 pr-12 h-12 text-base"
                  {...register('password')}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-transparent text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive pt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Indicateur de force du mot de passe */}
            {password && passwordStrength && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 h-2 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all", getStrengthColor(passwordStrength.strength))} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {passwordStrength.checks.map((check) => (
                    <div key={check.id} className="flex items-center text-xs">
                      {check.valid ? (
                        <Check className="w-3.5 h-3.5 text-green-500 mr-2 flex-shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground mr-2 flex-shrink-0" />
                      )}
                      <span className={cn(check.valid ? 'text-foreground' : 'text-muted-foreground')}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Retapez votre mot de passe"
                  className="pl-12 pr-12 h-12 text-base"
                  {...register('confirmPassword')}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-transparent text-muted-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive pt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

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
                  <Link to="/terms" className="font-semibold text-primary hover:underline">
                    Termes et Conditions
                  </Link>
                </Label>
                {errors.acceptTerms && (
                  <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold group"
              disabled={isLoading || isSubmitting}
            >
              {(isLoading || isSubmitting) ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Vous avez déjà un compte ?{' '}
              <Link
                to="/login"
                state={{ from: location.state?.from }}
                className="font-semibold text-primary hover:underline"
              >
                Connectez-vous
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Register;