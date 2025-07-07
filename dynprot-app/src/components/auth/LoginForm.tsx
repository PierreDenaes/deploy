import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Veuillez entrer une adresse e-mail valide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  showSwitchLink?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  onSwitchToRegister, 
  showSwitchLink = false 
}) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login({
        email: data.email ?? '',
        password: data.password ?? '',
        rememberMe: data.rememberMe ?? false,
      });
      toast.success('Connexion réussie !');
      onSuccess?.();
    } catch (err) {
      // L'erreur est gérée par le contexte et affichée
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
              <AlertTitle>Erreur de connexion</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

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
              placeholder="Votre mot de passe"
              className="pl-12 pr-12 h-12 text-base"
              {...register('password')}
              autoComplete="current-password"
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
          {errors.password && (
            <p className="text-sm text-destructive pt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setValue('rememberMe', !!checked)}
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-normal cursor-pointer"
            >
              Se souvenir de moi
            </Label>
          </div>
          <Button
            variant="link"
            className="text-sm text-primary hover:underline p-0 h-auto"
            type="button"
            onClick={() => {
              // In a tabs context, this would be handled by parent
              // For now, we'll use window.location for forgot password
              window.location.href = '/forgot-password';
            }}
          >
            Mot de passe oublié ?
          </Button>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connexion...
            </span>
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>

      {showSwitchLink && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Button
              variant="link"
              className="font-semibold text-primary hover:underline p-0 h-auto"
              onClick={onSwitchToRegister}
            >
              Inscrivez-vous
            </Button>
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginForm;