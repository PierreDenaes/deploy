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

  const toggleDarkMode = () => {
    dispatch({
      type: "SET_PREFERENCES",
      payload: {
        darkMode: !state.preferences.darkMode
      }
    });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-lg mx-auto p-4 pb-32">
        <motion.div
          className="space-y-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.header 
            variants={itemVariants} 
            className="flex items-center mb-6 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 -mx-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Retour"
              className="mr-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil & Paramètres</h1>
          </motion.header>

          <motion.div variants={itemVariants}>
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-lg py-2">
                  <User className="h-4 w-4" />
                  Profil
                </TabsTrigger>
                <TabsTrigger value="goals" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-lg py-2">
                  <Target className="h-4 w-4" />
                  Objectifs
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=active]:text-primary dark:data-[state=active]:text-white rounded-lg py-2">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Informations personnelles
                    </CardTitle>
                    <CardDescription>
                      Mettez à jour vos informations de profil.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Votre nom"
                        className="h-12 text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={authUser?.email || "utilisateur@exemple.com"}
                        disabled
                        placeholder="Votre email"
                        className="h-12 text-base bg-gray-100 dark:bg-gray-800"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                          {authUser?.emailVerified ? "Email vérifié" : "Email en attente de vérification"}
                        </p>
                        {authUser?.emailVerified && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Vérifié
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button onClick={saveProfile} className="w-full h-12 text-base">
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer le profil
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LogOut className="h-5 w-5 text-primary" />
                      Gestion du compte
                    </CardTitle>
                    <CardDescription>
                      Gérez vos données et votre session.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertTitle>Attention !</AlertTitle>
                      <AlertDescription>
                        La suppression des données est irréversible. Soyez prudent.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter className="flex flex-col w-full gap-3 border-t pt-4">
                      <div className="flex flex-col gap-2 w-full">
                        <DataExport 
                          variant="inline" 
                          className="w-full h-12 text-sm sm:text-base px-2"
                          buttonText="Exporter les données"
                        />
                        <DataDeletion 
                          variant="inline" 
                          className="w-full h-12 text-sm sm:text-base px-2"
                          buttonText="Supprimer sélectivement"
                        />
                      </div>
                      <Button variant="destructive" onClick={handleResetAppData} className="w-full h-12 text-sm sm:text-base px-2">
                        Réinitialiser toutes les données (aujourd'hui)
                      </Button>
                    </CardFooter>
                    <div className="w-full flex flex-col items-center gap-3">
                      <Button 
                        variant="destructive" 
                        onClick={handleLogout}
                        className="w-full sm:w-auto h-12 text-base"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Se déconnecter
                      </Button>

                      {/* Separation for danger zone */}
                      <div className="my-6 w-full">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-red-300" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-red-50 px-2 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                              Zone de danger
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        className="w-full sm:w-auto h-12 text-base bg-red-600 hover:bg-red-700 border-red-600 mb-8"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer définitivement mon compte
                      </Button>
                    </div>
                </Card>
              </TabsContent>

              <TabsContent value="goals" className="space-y-6">
                <ProteinGoalCalculator goalSetterRef={goalSetterRef} />
                
                <GoalSetter ref={goalSetterRef} />

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Fonctionnalités IA
                    </CardTitle>
                    <CardDescription>
                      Gérez les fonctionnalités alimentées par l'IA.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="protein-estimation">Estimation des protéines</Label>
                          <p className="text-sm text-muted-foreground">
                            Utilisez l'IA pour estimer les protéines à partir de photos.
                          </p>
                        </div>
                        <Switch id="protein-estimation" checked={state.ai.features.proteinEstimation} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="meal-recommendations">Recommandations de repas</Label>
                          <p className="text-sm text-muted-foreground">
                            Obtenez des suggestions de repas basées sur vos objectifs.
                          </p>
                        </div>
                        <Switch id="meal-recommendations" checked={state.ai.features.mealRecommendation} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="nutrition-analysis">Analyse nutritionnelle</Label>
                          <p className="text-sm text-muted-foreground">
                            Obtenez des analyses nutritionnelles détaillées de vos repas.
                          </p>
                        </div>
                        <Switch id="nutrition-analysis" checked={state.ai.features.nutritionAnalysis} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <div className="text-sm text-muted-foreground w-full flex justify-between items-center">
                      <span>Utilisation IA aujourd'hui</span>
                      <span>{state.ai.usageToday} / {state.ai.usageLimit}</span>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      Apparence
                    </CardTitle>
                    <CardDescription>
                      Personnalisez l'apparence de l'application.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dark-mode">Mode Sombre</Label>
                        <p className="text-sm text-muted-foreground">
                          Activez ou désactivez le thème sombre.
                        </p>
                      </div>
                      <Switch
                        id="dark-mode"
                        checked={state.preferences.darkMode}
                        onCheckedChange={toggleDarkMode}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="reduced-motion">Animations réduites</Label>
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="high-contrast">Contraste élevé</Label>
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="large-text">Texte agrandi</Label>
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
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
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>

        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la déconnexion</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir vous déconnecter ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmLogout}>
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
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmResetAppData}>
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
              <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting}>
                Annuler
              </Button>
              {deleteStep === 1 ? (
                <Button variant="destructive" onClick={proceedToStep2} disabled={!deletePassword.trim()}>
                  Continuer
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteAccount} 
                  disabled={deleteConfirmation !== 'SUPPRIMER' || isDeleting}
                  className="bg-red-600 hover:bg-red-700"
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