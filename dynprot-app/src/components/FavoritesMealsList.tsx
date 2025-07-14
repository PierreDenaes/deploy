import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Plus, 
  Trash2, 
  Clock, 
  MoreVertical,
  Star,
  Utensils
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FavoriteMeal } from "@/context/AppContext";
import { safeDate, isValidDate } from "../utils/numberUtils";

interface FavoritesMealsListProps {
  onAddMeal?: () => void;
  showQuickAdd?: boolean;
  maxItems?: number;
  className?: string;
  displayOnly?: boolean; // New prop to disable all add buttons
  progressContext?: {
    currentProtein: number;
    goalProtein: number;
    progressPercentage: number;
    streakActive: boolean;
  };
}

export default function FavoritesMealsList({ 
  onAddMeal, 
  showQuickAdd = true, 
  maxItems,
  className,
  displayOnly = false,
  progressContext
}: FavoritesMealsListProps) {
  const { state, addMealFromFavorite, deleteFavoriteMeal } = useAppContext();
  const [addingFavoriteId, setAddingFavoriteId] = useState<string | null>(null);

  const sortedFavorites = [...(state.favoriteMeals || [])]
    .sort((a, b) => {
      // Si l'utilisateur est en retard (< 50% après 14h), prioriser les favoris riches en protéines
      const currentHour = new Date().getHours();
      if (progressContext && progressContext.progressPercentage < 50 && currentHour > 14) {
        // Trier par protéines d'abord, puis par usage récent
        const proteinDiff = (b.protein || 0) - (a.protein || 0);
        if (Math.abs(proteinDiff) > 5) { // Différence significative de protéines
          return proteinDiff;
        }
      }
      
      // Tri normal : par usage récent, puis par fréquence
      const aLastUsed = safeDate(a.lastUsed).getTime();
      const bLastUsed = safeDate(b.lastUsed).getTime();
      
      if (Math.abs(aLastUsed - bLastUsed) < 86400000) { // If within 24 hours
        return b.useCount - a.useCount; // Sort by use count
      }
      return bLastUsed - aLastUsed; // Sort by last used
    })
    .slice(0, maxItems);

  const handleAddFromFavorite = async (favoriteId: string) => {
    setAddingFavoriteId(favoriteId);
    try {
      await addMealFromFavorite(favoriteId);
      const favorite = sortedFavorites.find(f => f.id === favoriteId);
      toast.success(`${favorite?.name || 'Repas'} ajouté ! 🎉`, {
        description: `+${favorite?.protein || 0}g de protéines`,
        duration: 3000,
      });
      onAddMeal?.();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du repas");
    } finally {
      setAddingFavoriteId(null);
    }
  };

  const handleDeleteFavorite = (favoriteId: string, favoriteName: string) => {
    deleteFavoriteMeal(favoriteId);
    toast.success(`"${favoriteName}" retiré des favoris`);
  };

  const getUsageInfo = (favorite: FavoriteMeal) => {
    if (!isValidDate(favorite.lastUsed)) {
      return "Jamais utilisé";
    }
    
    const lastUsedDate = safeDate(favorite.lastUsed);
    const now = new Date();
    const diffInHours = (now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return "Utilisé aujourd'hui";
    } else if (diffInHours < 48) {
      return "Utilisé hier";
    } else if (diffInHours < 168) {
      return `Utilisé ${Math.floor(diffInHours / 24)} jours`;
    } else {
      try {
        return format(lastUsedDate, "dd MMM", { locale: fr });
      } catch (error) {
        return "Date invalide";
      }
    }
  };

  if (sortedFavorites.length === 0) {
    return (
      <Card className={cn("border-0 shadow-lg", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Accès rapide
          </CardTitle>
          <CardDescription>
            Ajoutez vos repas fréquents en favoris pour un accès rapide
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Aucun repas favori pour le moment
          </p>
          <p className="text-sm text-muted-foreground">
            Marquez vos repas favoris depuis l'historique ou lors de l'ajout d'un repas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-0 shadow-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Accès rapide
          <Badge variant="secondary" className="ml-auto">
            {sortedFavorites.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {(() => {
            const currentHour = new Date().getHours();
            if (progressContext && progressContext.progressPercentage < 50 && currentHour > 14) {
              return (
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  ⚡ Privilégiez vos favoris riches en protéines !
                </span>
              );
            }
            if (progressContext?.streakActive) {
              return (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  🔥 Maintenez votre série avec vos favoris !
                </span>
              );
            }
            return "Vos repas favoris prêts en un clic ! ⚡";
          })()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {sortedFavorites.map((favorite) => (
            <motion.div
              key={favorite.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 border border-border rounded-xl bg-card hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-200 hover:shadow-md dashboard-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-sm truncate flex items-center gap-2">
                      {favorite.name}
                      {favorite.useCount > 5 && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                      {isValidDate(favorite.lastUsed) && 
                       (new Date().getTime() - safeDate(favorite.lastUsed).getTime()) < 86400000 && (
                        <Badge variant="outline" className="text-xs px-1 py-0 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          Récent
                        </Badge>
                      )}
                    </h4>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {favorite.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Utensils className="h-3 w-3" />
                      {favorite.protein}g protéines
                    </span>
                    {favorite.calories && (
                      <span>{favorite.calories} cal</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getUsageInfo(favorite)}
                    </span>
                  </div>
                  
                  {favorite.tags && favorite.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {favorite.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {favorite.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{favorite.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 ml-3">
                  {showQuickAdd && !displayOnly && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        size="sm"
                        onClick={() => {
                          handleAddFromFavorite(favorite.id);
                          // Haptic feedback simulation
                          if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            navigator.vibrate(50);
                          }
                        }}
                        disabled={addingFavoriteId === favorite.id}
                        className={cn(
                          "h-10 px-4 font-semibold rounded-xl transition-all duration-200",
                          "bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/80",
                          "shadow-md hover:shadow-lg active:shadow-sm",
                          addingFavoriteId === favorite.id && "opacity-75"
                        )}
                      >
                        {addingFavoriteId === favorite.id ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Ajout...</span>
                          </motion.div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Ajouter</span>
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  )}
                  
                  {displayOnly && (
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      Inspiration
                    </Badge>
                  )}
                  
                  {!displayOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-1">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDeleteFavorite(favorite.id, favorite.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Retirer des favoris
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-center mt-3 pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Utilisé {favorite.useCount} fois
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}