import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

type AuthTab = 'login' | 'register';

const AuthTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Déterminer l'onglet initial depuis l'URL ou par défaut login
  const getInitialTab = (): AuthTab => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'register') return 'register';
    // Si on vient de l'ancienne route /register, afficher register
    if (location.pathname === '/register') return 'register';
    return 'login';
  };

  const [activeTab, setActiveTab] = useState<AuthTab>(getInitialTab);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Synchroniser l'onglet avec l'URL seulement au montage initial
  useEffect(() => {
    const initialTab = getInitialTab();
    setActiveTab(initialTab);
  }, []); // Removed dependencies to avoid conflicts

  const handleTabChange = (value: string) => {
    const newTab = value as AuthTab;
    setActiveTab(newTab);
    
    // Mettre à jour l'URL sans navigation
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', newTab);
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleAuthSuccess = () => {
    navigate(from, { replace: true });
  };

  const switchToRegister = () => {
    handleTabChange('register');
  };

  const switchToLogin = () => {
    handleTabChange('login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <CardHeader className="space-y-1 text-center p-8 bg-gray-50 dark:bg-gray-800/50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 shadow-lg"
            >
              <span className="text-3xl font-bold text-white">D</span>
            </motion.div>
            
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger 
                value="login" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary"
              >
                <LogIn className="w-4 h-4" />
                Connexion
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary"
              >
                <UserPlus className="w-4 h-4" />
                Inscription
              </TabsTrigger>
            </TabsList>

            <CardTitle className="text-3xl font-bold">
              {activeTab === 'login' ? 'Bon retour !' : 'Rejoignez-nous !'}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {activeTab === 'login' 
                ? 'Connectez-vous pour continuer votre suivi'
                : 'Créez votre compte pour commencer'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <TabsContent value="login" className="mt-0">
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <LoginForm 
                  onSuccess={handleAuthSuccess}
                  onSwitchToRegister={switchToRegister}
                  showSwitchLink={true}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RegisterForm 
                  onSuccess={handleAuthSuccess}
                  onSwitchToLogin={switchToLogin}
                  showSwitchLink={true}
                />
              </motion.div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </motion.div>
  );
};

export default AuthTabs;