import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

const forgotSchema = z.object({
  email: z.string().email('Veuillez entrer une adresse e-mail valide'),
});
type ForgotFormData = z.infer<typeof forgotSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setError(null);
    try {
      await authService.requestPasswordReset(data.email);
      setSubmitted(true);
      toast.success('Si cet email existe, un lien de réinitialisation a été envoyé.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la demande de réinitialisation.');
      toast.error('Erreur lors de la demande de réinitialisation.');
    }
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
            <Mail className="h-8 w-8 text-white" />
          </motion.div>
          <CardTitle className="text-3xl font-bold">Mot de passe oublié&nbsp;?</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <p className="text-lg font-medium text-primary">Vérifiez votre boîte de réception&nbsp;!</p>
              <p className="text-muted-foreground">Si cet email existe, un lien de réinitialisation a été envoyé.</p>
              <Button className="mt-4 w-full" onClick={() => navigate('/login')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion
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
              <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
                {isSubmitting ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi...</span> : 'Envoyer le lien de réinitialisation'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/login')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ForgotPassword; 