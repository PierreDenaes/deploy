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
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5 p-4">
              <AlertTitle className="text-lg font-bold">Erreur de connexion</AlertTitle>
              <AlertDescription className="text-base font-medium">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
        >
          <Label htmlFor="password" className="text-lg font-semibold">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" strokeWidth={2} />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Votre mot de passe"
              className="pl-14 pr-14 h-14 text-lg font-medium shadow-ios"
              {...register('password')}
              autoComplete="current-password"
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
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setValue('rememberMe', !!checked)}
              className="scale-125"
            />
            <Label
              htmlFor="rememberMe"
              className="text-base font-medium cursor-pointer"
            >
              Se souvenir de moi
            </Label>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="link"
              className="text-base text-primary hover:underline p-0 h-auto font-semibold"
              type="button"
              onClick={() => {
                // In a tabs context, this would be handled by parent
                // For now, we'll use window.location for forgot password
                window.location.href = '/forgot-password';
              }}
            >
              Mot de passe oublié ?
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            type="submit"
            variant="ios"
            className="w-full h-16 text-xl font-bold shadow-ios-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </Button>
        </motion.div>
      </form>

      {showSwitchLink && (
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-lg text-muted-foreground font-medium">
            Pas encore de compte ?{' '}
            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="link"
                className="font-bold text-primary hover:underline p-0 h-auto text-lg"
                onClick={onSwitchToRegister}
              >
                Inscrivez-vous
              </Button>
            </motion.span>
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default LoginForm;