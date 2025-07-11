import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Settings, LogOut, Save, Zap, Target, Shield, ArrowLeft, BellRing, Palette, Accessibility, Lock, Trash2, AlertTriangle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import GoalSetter, { type GoalSetterRef } from "@/components/GoalSetter";
import ProteinGoalCalculator from "@/components/ProteinGoalCalculator";
import DataExport from "@/components/DataExport";
import DataDeletion from "@/components/DataDeletion";
import ThemeToggle from "@/components/ThemeToggle";
import { sanitizeName } from "@/utils/sanitize";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ProfileService } from "@/services/api.profile";

// Utility to sanitize profile payloads
function sanitizeProfilePayload(payload: Record<string, any>) {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export default function Profile() {
  const navigate = useNavigate();
  const { state, dispatch, resetAppData, deleteUserAccount } = useAppContext();
  const { user: authUser, logout } = useAuth();
  const [name, setName] = useState(state.user.name);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const goalSetterRef = useRef<GoalSetterRef>(null);

  // Synchronize local name state with app context user name
  useEffect(() => {
    if (state.user.name && state.user.name !== name) {
      setName(state.user.name);
    }
  }, [state.user.name]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 100 }
    }
  };

  const saveProfile = async () => {
    const sanitizedName = sanitizeName(name);
    if (!sanitizedName.trim()) {
      toast.error("Veuillez entrer un nom valide.");
      return;
    }
    
    try {
      // Split the full name into first and last name
      const nameParts = sanitizedName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Save name to backend using first_name and last_name
      await ProfileService.updateProfile(sanitizeProfilePayload({
        first_name: firstName,
        last_name: lastName
      }));

      // Update local state
      dispatch({
        type: "SET_USER",
        payload: {
          ...state.user,
          name: sanitizedName
        }
      });
      setName(sanitizedName); 
      toast.success("Profil enregistré avec succès !");
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du nom:', error);
      toast.error("Erreur lors de la sauvegarde. Veuillez réessayer.");
    }
  };


  const toggleAccessibility = (setting: "reducedMotion" | "highContrast" | "largeText") => {
    dispatch({
      type: "SET_PREFERENCES",
      payload: {
        accessibility: {
          ...state.preferences.accessibility,
          [setting]: !state.preferences.accessibility[setting]
        }
      }
    });
  };

  const togglePrivacy = (setting: "shareData" | "allowAnalytics") => {
    dispatch({
      type: "SET_PREFERENCES",
      payload: {
        privacySettings: {
          ...state.preferences.privacySettings,
          [setting]: !state.preferences.privacySettings[setting]
        }
      }
    });
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    toast.info("Vous avez été déconnecté.");
  };

  const handleResetAppData = () => {
    setShowResetConfirm(true);
  };

  const confirmResetAppData = async () => {
    try {
      setShowResetConfirm(false);
      // Use the context resetAppData function to properly clear all data
      await resetAppData();
      toast.success("Données de l'application réinitialisées avec succès !");
      
      // Optional: Navigate to home or reload after a short delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast.error("Erreur lors de la réinitialisation des données.");
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteConfirmation('');
  };

  const closeDeleteDialog = () => {
    setShowDeleteConfirm(false);
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteConfirmation('');
    setIsDeleting(false);
  };

  const proceedToStep2 = () => {
    if (!deletePassword.trim()) {
      toast.error("Veuillez saisir votre mot de passe");
      return;
    }
    setDeleteStep(2);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      toast.error('Vous devez taper "SUPPRIMER" exactement pour confirmer');
      return;
    }

    try {
      setIsDeleting(true);
      
      // Use the context deleteUserAccount function that handles everything
      await deleteUserAccount(deletePassword, deleteConfirmation);

      // Logout the user
      logout();
      
      toast.success('Compte supprimé avec succès');
      
      // Navigate to home page
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      toast.error('Erreur lors de la suppression du compte. Vérifiez votre mot de passe.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container max-w-lg mx-auto p-4 pb-40">
        <motion.div
          className="space-y-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.header 
            variants={itemVariants} 
            className="flex items-center justify-between mb-8 sticky top-0 glass z-20 -mx-4 px-4 sm:px-6 py-4 border-b border-border/30"
          >
            <div className="flex items-center flex-1 min-w-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  aria-label="Retour"
                  className="mr-3 sm:mr-4 rounded-2xl h-10 w-10 sm:h-12 sm:w-12 hover:bg-primary/10 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                </Button>
              </motion.div>
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center shadow-ios flex-shrink-0">
                  <User className="h-6 w-6 sm:h-7 sm:w-7 text-primary" strokeWidth={2.5} />
                </div>
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
                  <span className="sm:hidden">Profil</span>
                  <span className="hidden sm:inline">Profil & Paramètres</span>
                </h1>
              </div>
            </div>
          </motion.header>

          <motion.div variants={itemVariants}>
            <Tabs defaultValue="profile" className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                  <span className="hidden xs:inline">Profil</span>
                </TabsTrigger>
                <TabsTrigger value="goals" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                  <span className="hidden xs:inline">Objectifs</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                  <span className="hidden xs:inline">Paramètres</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-0 shadow-ios backdrop-blur-xl hover:shadow-ios-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shadow-ios-sm">
                          <User className="h-6 w-6 text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">Informations personnelles</CardTitle>
                          <CardDescription className="text-base font-medium">
                            Mettez à jour vos informations de profil.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-base md:text-lg font-semibold">Nom</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Votre nom"
                          className="h-12 md:h-14 text-base md:text-lg font-medium shadow-ios"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="email" className="text-base md:text-lg font-semibold">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={authUser?.email || "utilisateur@exemple.com"}
                          disabled
                          placeholder="Votre email"
                          className="h-12 md:h-14 text-base md:text-lg font-medium bg-muted/50 shadow-ios"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                          <p className="text-base text-muted-foreground font-medium">
                            {authUser?.emailVerified ? "Email vérifié" : "Email en attente de vérification"}
                          </p>
                          {authUser?.emailVerified && (
                            <Badge variant="secondary" className="text-sm px-3 py-1 rounded-xl bg-ios-green/10 text-ios-green border-ios-green/20">
                              <Shield className="w-4 h-4 mr-1" strokeWidth={2} />
                              Vérifié
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-border/30 pt-6">
                      <Button onClick={saveProfile} variant="ios" className="w-full h-12 md:h-14 text-base md:text-lg font-semibold shadow-ios">
                        <Save className="mr-3 h-5 w-5" strokeWidth={2.5} />
                        Enregistrer le profil
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-0 shadow-ios backdrop-blur-xl hover:shadow-ios-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-destructive/20 rounded-2xl flex items-center justify-center shadow-ios-sm">
                          <LogOut className="h-6 w-6 text-destructive" strokeWidth={2.5} />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">Gestion du compte</CardTitle>
                          <CardDescription className="text-base font-medium">
                            Gérez vos données et votre session.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <Alert className="border-destructive/20 bg-destructive/5 rounded-2xl p-4">
                        <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={2} />
                        <AlertTitle className="text-base md:text-lg font-bold">Attention !</AlertTitle>
                        <AlertDescription className="text-sm md:text-base font-medium leading-relaxed">
                          La suppression des données est irréversible. Soyez prudent.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                    <CardFooter className="flex flex-col w-full gap-4 border-t border-border/30 pt-6">
                      <div className="flex flex-col gap-3 w-full">
                        <DataExport 
                          variant="inline" 
                          className="w-full h-12 md:h-14 text-base md:text-lg font-semibold shadow-ios rounded-2xl"
                          buttonText="Exporter les données"
                        />
                        <DataDeletion 
                          variant="inline" 
                          className="w-full h-12 md:h-14 text-base md:text-lg font-semibold shadow-ios rounded-2xl"
                          buttonText="Supprimer sélectivement"
                        />
                      </div>
                      <Button variant="destructive" onClick={handleResetAppData} className="w-full h-12 md:h-14 text-sm md:text-base font-semibold shadow-ios rounded-2xl">
                        <span className="block sm:hidden">Réinitialiser les données</span>
                        <span className="hidden sm:block">Réinitialiser toutes les données (aujourd'hui)</span>
                      </Button>
                    </CardFooter>
                    <div className="w-full flex flex-col items-center gap-4 p-6">
                      <Button 
                        variant="destructive" 
                        onClick={handleLogout}
                        className="w-full h-12 md:h-14 text-base md:text-lg font-semibold shadow-ios rounded-2xl"
                      >
                        <LogOut className="mr-3 h-5 w-5" strokeWidth={2.5} />
                        Se déconnecter
                      </Button>

                      {/* Separation for danger zone */}
                      <div className="my-8 w-full">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-destructive/30" />
                          </div>
                          <div className="relative flex justify-center text-sm uppercase font-bold">
                            <span className="bg-destructive/10 px-4 py-2 text-destructive rounded-xl border border-destructive/20">
                              Zone de danger
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        className="w-full h-12 md:h-14 text-sm md:text-base font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive shadow-ios rounded-2xl mb-8"
                      >
                        <Trash2 className="mr-2 sm:mr-3 h-4 sm:h-5 w-4 sm:w-5" strokeWidth={2.5} />
                        <span className="block sm:hidden">Supprimer mon compte</span>
                        <span className="hidden sm:block">Supprimer définitivement mon compte</span>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="goals" className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <ProteinGoalCalculator goalSetterRef={goalSetterRef} />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <GoalSetter ref={goalSetterRef} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-0 shadow-ios backdrop-blur-xl hover:shadow-ios-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shadow-ios-sm">
                          <Zap className="h-6 w-6 text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">Fonctionnalités IA</CardTitle>
                          <CardDescription className="text-base font-medium">
                            Gérez les fonctionnalités alimentées par l'IA.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 p-4 rounded-2xl bg-muted/30 border border-border/20">
                          <div className="space-y-1">
                            <Label htmlFor="protein-estimation" className="text-base md:text-lg font-semibold">Estimation des protéines</Label>
                            <p className="text-base text-muted-foreground font-medium">
                              Utilisez l'IA pour estimer les protéines à partir de photos.
                            </p>
                          </div>
                          <Switch id="protein-estimation" checked={state.ai.features.proteinEstimation} className="scale-110 sm:scale-125" />
                        </div>
                        <Separator className="border-border/30" />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 p-4 rounded-2xl bg-muted/30 border border-border/20">
                          <div className="space-y-1">
                            <Label htmlFor="meal-recommendations" className="text-base md:text-lg font-semibold">Recommandations de repas</Label>
                            <p className="text-base text-muted-foreground font-medium">
                              Obtenez des suggestions de repas basées sur vos objectifs.
                            </p>
                          </div>
                          <Switch id="meal-recommendations" checked={state.ai.features.mealRecommendation} className="scale-110 sm:scale-125" />
                        </div>
                        <Separator className="border-border/30" />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 p-4 rounded-2xl bg-muted/30 border border-border/20">
                          <div className="space-y-1">
                            <Label htmlFor="nutrition-analysis" className="text-base md:text-lg font-semibold">Analyse nutritionnelle</Label>
                            <p className="text-base text-muted-foreground font-medium">
                              Obtenez des analyses nutritionnelles détaillées de vos repas.
                            </p>
                          </div>
                          <Switch id="nutrition-analysis" checked={state.ai.features.nutritionAnalysis} className="scale-110 sm:scale-125" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-border/30 pt-6">
                      <div className="text-base md:text-lg font-semibold text-foreground w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                        <span>Utilisation IA aujourd'hui</span>
                        <Badge variant="secondary" className="text-sm md:text-base font-bold px-3 md:px-4 py-1 md:py-2 rounded-xl bg-primary/10 text-primary border-primary/20">
                          {state.ai.usageToday} / {state.ai.usageLimit}
                        </Badge>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-0 shadow-ios backdrop-blur-xl hover:shadow-ios-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center shadow-ios-sm">
                          <Palette className="h-6 w-6 text-accent" strokeWidth={2.5} />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">Apparence</CardTitle>
                          <CardDescription className="text-base font-medium">
                            Personnalisez l'apparence de l'application.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-6">
                    <ThemeToggle />
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="notifications">Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Activez les notifications de l'application.
                        </p>
                      </div>
                      <Switch
                        id="notifications"
                        checked={state.preferences.notifications}
                        onCheckedChange={() =>
                          dispatch({
                            type: "SET_PREFERENCES",
                            payload: {
                              notifications: !state.preferences.notifications
                            }
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Accessibility className="h-5 w-5 text-primary" />
                      Accessibilité
                    </CardTitle>
                    <CardDescription>
                      Ajustez les paramètres pour une meilleure accessibilité.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reduced-motion">Animations réduites</Label>
                          {state.preferences.accessibility.reducedMotion && (
                            <Badge variant="secondary" className="text-xs bg-ios-green/10 text-ios-green border-ios-green/20">
                              Actif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Minimisez les animations dans toute l'application.
                        </p>
                      </div>
                      <Switch
                        id="reduced-motion"
                        checked={state.preferences.accessibility.reducedMotion}
                        onCheckedChange={() => toggleAccessibility("reducedMotion")}
                      />
                    </div>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="high-contrast">Contraste élevé</Label>
                          {state.preferences.accessibility.highContrast && (
                            <Badge variant="secondary" className="text-xs bg-ios-yellow/10 text-ios-yellow border-ios-yellow/20">
                              Actif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Augmentez le contraste pour une meilleure visibilité.
                        </p>
                      </div>
                      <Switch
                        id="high-contrast"
                        checked={state.preferences.accessibility.highContrast}
                        onCheckedChange={() => toggleAccessibility("highContrast")}
                      />
                    </div>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="large-text">Texte agrandi</Label>
                          {state.preferences.accessibility.largeText && (
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                              Actif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Augmentez la taille du texte dans toute l'application.
                        </p>
                      </div>
                      <Switch
                        id="large-text"
                        checked={state.preferences.accessibility.largeText}
                        onCheckedChange={() => toggleAccessibility("largeText")}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      Confidentialité
                    </CardTitle>
                    <CardDescription>
                      Gérez vos paramètres de confidentialité.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="data-sharing">Partage de données</Label>
                        <p className="text-sm text-muted-foreground">
                          Autorisez le partage anonyme de données pour améliorer l'application.
                        </p>
                      </div>
                      <Switch
                        id="data-sharing"
                        checked={state.preferences.privacySettings.shareData}
                        onCheckedChange={() => togglePrivacy("shareData")}
                      />
                    </div>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="analytics">Analytiques</Label>
                        <p className="text-sm text-muted-foreground">
                          Autorisez la collecte d'analyses d'utilisation.
                        </p>
                      </div>
                      <Switch
                        id="analytics"
                        checked={state.preferences.privacySettings.allowAnalytics}
                        onCheckedChange={() => togglePrivacy("allowAnalytics")}
                      />
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>

        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent className="rounded-3xl border-0 shadow-ios-xl backdrop-blur-xl">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut className="h-8 w-8 text-destructive" strokeWidth={2} />
              </div>
              <DialogTitle className="text-2xl font-bold">Confirmer la déconnexion</DialogTitle>
              <DialogDescription className="text-lg leading-relaxed mt-2">
                Êtes-vous sûr de vouloir vous déconnecter ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-12 rounded-2xl text-base font-semibold shadow-ios"
              >
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmLogout}
                className="flex-1 h-12 rounded-2xl text-base font-semibold shadow-ios"
              >
                Déconnexion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la réinitialisation des données</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir réinitialiser toutes vos données ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="h-10 md:h-12 text-sm md:text-base">
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmResetAppData} className="h-10 md:h-12 text-sm md:text-base">
                Réinitialiser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Dialog - Multi-step security process */}
        <Dialog open={showDeleteConfirm} onOpenChange={closeDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Supprimer définitivement votre compte
              </DialogTitle>
              <DialogDescription>
                {deleteStep === 1 ? (
                  "Cette action est irréversible. Toutes vos données seront définitivement supprimées."
                ) : (
                  "Pour confirmer, tapez exactement \"SUPPRIMER\" dans le champ ci-dessous."
                )}
              </DialogDescription>
            </DialogHeader>

            {deleteStep === 1 ? (
              // Step 1: Password verification
              <div className="space-y-4">
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    <strong>Attention :</strong> Cette action supprimera définitivement :
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      <li>Votre compte utilisateur</li>
                      <li>Tous vos repas enregistrés</li>
                      <li>Vos repas favoris</li>
                      <li>Vos objectifs et préférences</li>
                      <li>Toutes vos données personnelles</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="delete-password">
                    Confirmez avec votre mot de passe
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="border-red-300 focus:border-red-500"
                  />
                </div>
              </div>
            ) : (
              // Step 2: Final confirmation
              <div className="space-y-4">
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    <strong>Dernière chance !</strong> Cette action ne peut pas être annulée.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation">
                    Tapez <strong>"SUPPRIMER"</strong> pour confirmer
                  </Label>
                  <Input
                    id="delete-confirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="border-red-300 focus:border-red-500"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Vous devez taper exactement "SUPPRIMER" (en majuscules)
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting} className="h-10 md:h-12 text-sm md:text-base">
                Annuler
              </Button>
              {deleteStep === 1 ? (
                <Button variant="destructive" onClick={proceedToStep2} disabled={!deletePassword.trim()} className="h-10 md:h-12 text-sm md:text-base">
                  Continuer
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteAccount} 
                  disabled={deleteConfirmation !== 'SUPPRIMER' || isDeleting}
                  className="bg-red-600 hover:bg-red-700 h-10 md:h-12 text-sm md:text-base"
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer définitivement
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}