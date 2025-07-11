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
      <Card className="shadow-ios-xl border-0 rounded-3xl overflow-hidden backdrop-blur-xl bg-card/95">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <CardHeader className="space-y-6 text-center p-10 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-6 shadow-ios-lg"
            >
              <span className="text-4xl font-bold text-white tracking-tight">D</span>
            </motion.div>
            
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger 
                value="login" 
                className="flex items-center gap-3"
              >
                <LogIn className="w-5 h-5" strokeWidth={2.5} />
                Connexion
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="flex items-center gap-3"
              >
                <UserPlus className="w-5 h-5" strokeWidth={2.5} />
                Inscription
              </TabsTrigger>
            </TabsList>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardTitle className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {activeTab === 'login' ? 'Bon retour !' : 'Rejoignez-nous !'}
              </CardTitle>
              <CardDescription className="text-xl text-muted-foreground font-medium">
                {activeTab === 'login' 
                  ? 'Connectez-vous pour continuer votre suivi'
                  : 'Créez votre compte pour commencer'
                }
              </CardDescription>
            </motion.div>
          </CardHeader>
          
          <CardContent className="p-10">
            <TabsContent value="login" className="mt-0">
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.95 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
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
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
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