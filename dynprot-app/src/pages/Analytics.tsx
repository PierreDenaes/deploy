import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO, isToday, isThisWeek, isThisMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  BarChart3,
  Filter, 
  ArrowUpDown,
  Search,
  ArrowLeft,
  Heart,
  Utensils,
  Clock,
  Trash2,
  TrendingUp,
  Calendar,
  Target,
  Award
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import type { MealEntry } from "@/context/AppContext";
import type { DateRange } from "react-day-picker";

// Component imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WeeklyTrendChart } from "@/components/WeeklyTrendChart";
import PeriodSummary from "@/components/PeriodSummary";
import DataExport from "@/components/DataExport";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type DateFilter = "all" | "today" | "week" | "month" | "custom";
type SortDirection = "asc" | "desc";
type SortField = "date" | "protein";

export default function Analytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, deleteMeal, addFavoriteMeal, markAnalyticsViewed } = useAppContext();
  
  // Get tab from URL params with legacy support, default to 'analytics'
  const rawTab = searchParams.get('tab');
  const currentTab = (() => {
    // Handle legacy URLs
    if (rawTab === 'overview' || rawTab === 'trends') return 'analytics';
    if (rawTab === 'details') return 'history';
    return rawTab || 'analytics';
  })();
  
  const meals = state?.meals ?? [];
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortField, setSortField] = useState<SortField>("date");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);

  // Mark analytics as viewed when component mounts
  React.useEffect(() => {
    markAnalyticsViewed();
  }, [markAnalyticsViewed]);

  // Handle tab changes and update URL
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const groupedMeals = useMemo(() => {
    const filtered = meals
      .filter((meal) => {
        const mealDate = parseISO(meal.timestamp);
        const matchesSearch = meal.description.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        switch (dateFilter) {
          case "today": return isToday(mealDate);
          case "week": return isThisWeek(mealDate, { weekStartsOn: 1 });
          case "month": return isThisMonth(mealDate);
          case "custom": {
            const isAfterFrom = customDateRange?.from ? mealDate >= customDateRange.from : true;
            const isBeforeTo = customDateRange?.to ? mealDate <= customDateRange.to : true;
            return isAfterFrom && isBeforeTo;
          }
          default: return true;
        }
      })
      .sort((a, b) => {
        if (sortField === "date") {
          return sortDirection === "asc"
            ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        } else {
          return sortDirection === "asc"
            ? a.protein - b.protein
            : b.protein - a.protein;
        }
      });

    const groups: { [key: string]: { meals: typeof filtered; totalProtein: number; totalCalories: number } } = {};
    filtered.forEach(meal => {
      const dateKey = format(parseISO(meal.timestamp), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = { meals: [], totalProtein: 0, totalCalories: 0 };
      }
      groups[dateKey].meals.push(meal);
      groups[dateKey].totalProtein += meal.protein;
      if (meal.calories) groups[dateKey].totalCalories += meal.calories;
    });

    // Sort groups by date
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      return sortDirection === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    }).map(dateKey => ({ date: dateKey, ...groups[dateKey] }));

    return sortedGroups;
  }, [meals, dateFilter, customDateRange, searchTerm, sortField, sortDirection]);

  const stats = useMemo(() => {
    const allFilteredMeals = groupedMeals.flatMap(group => group.meals);
    const totalProtein = allFilteredMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const avgProtein = allFilteredMeals.length > 0 ? Math.round(totalProtein / allFilteredMeals.length) : 0;
    return {
      totalMeals: allFilteredMeals.length,
      totalProtein,
      avgProtein,
    };
  }, [groupedMeals]);

  const getDateFilterName = () => {
    if (dateFilter === "custom") {
      if (customDateRange?.from && customDateRange?.to) {
        return `${format(customDateRange.from, "d MMM", { locale: fr })} - ${format(customDateRange.to, "d MMM", { locale: fr })}`;
      }
      return "Plage personnalisée";
    }
    const names = { all: "Tout", today: "Aujourd'hui", week: "Cette semaine", month: "Ce mois" };
    return names[dateFilter];
  };

  const handleDeleteMeal = (mealId: string) => {
    setMealToDelete(mealId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMeal = () => {
    if (mealToDelete) {
      deleteMeal(mealToDelete);
      toast.success("Repas supprimé avec succès");
      setShowDeleteDialog(false);
      setMealToDelete(null);
    }
  };

  const handleAddToFavorites = (meal: MealEntry) => {
    // Check if meal is already in favorites
    const existingFavorite = (state.favoriteMeals || []).find(
      fav => fav.description.toLowerCase() === meal.description.toLowerCase()
    );
    
    if (existingFavorite) {
      toast.info("Ce repas est déjà dans vos favoris");
      return;
    }

    const favoriteData = {
      name: meal.description.split(' ').slice(0, 3).join(' ').trim() || 'Repas favori',
      description: meal.description.trim(),
      protein: Math.round(Math.max(0, meal.protein || 0)),
      calories: meal.calories && meal.calories > 0 ? Math.round(meal.calories) : null,
      tags: meal.tags || [],
    };
    
    addFavoriteMeal(favoriteData);
    toast.success("Repas ajouté aux favoris !");
  };

  const isMealInFavorites = (meal: MealEntry) => {
    return (state.favoriteMeals || []).some(
      fav => fav.description.toLowerCase() === meal.description.toLowerCase()
    );
  };

  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } } 
  };
  
  const itemVariants = { 
    hidden: { y: 20, opacity: 0 }, 
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } } 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-4xl mx-auto p-4 pb-32">
        <motion.div 
          className="space-y-8" 
          initial="hidden" 
          animate="visible" 
          variants={containerVariants}
        >
          {/* Header */}
          <motion.header 
            variants={itemVariants} 
            className="flex items-center justify-between mb-6 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 -mx-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Retour"
                className="mr-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Analytics
                </h1>
              </div>
            </div>
            <DataExport 
              variant="inline" 
              className="h-10 w-auto"
              buttonText="Exporter"
            />
          </motion.header>

          {/* Main Content with Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Historique
                </TabsTrigger>
              </TabsList>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6 mt-6">
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Card className="border-0 shadow-lg py-4">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">{stats.totalMeals}</p>
                      <p className="text-sm text-muted-foreground">Repas</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg py-4">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">{stats.totalProtein}g</p>
                      <p className="text-sm text-muted-foreground">Protéines</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg py-4">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">{stats.avgProtein}g</p>
                      <p className="text-sm text-muted-foreground">Moyenne</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend Chart */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Tendances</CardTitle>
                    <CardDescription>{getDateFilterName()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WeeklyTrendChart showProtein showCalories={false} />
                  </CardContent>
                </Card>

                {/* Period Summary - Compact Mode */}
                <PeriodSummary />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6 mt-6">
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un repas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 text-base"
                    />
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-12 w-full sm:w-auto">
                          <Filter className="h-4 w-4 mr-2" />
                          {getDateFilterName()}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDateFilter("all")}>Tout</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter("today")}>Aujourd'hui</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter("week")}>Cette semaine</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter("month")}>Ce mois</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start font-normal">
                              Personnalisé
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent 
                              mode="range" 
                              selected={customDateRange} 
                              onSelect={setCustomDateRange} 
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-12 w-full sm:w-auto">
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          Trier
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Trier par</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'date' && sortDirection === 'desc'} 
                          onCheckedChange={() => { setSortField("date"); setSortDirection("desc"); }}
                        >
                          Date (plus récent)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'date' && sortDirection === 'asc'} 
                          onCheckedChange={() => { setSortField("date"); setSortDirection("asc"); }}
                        >
                          Date (plus ancien)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'protein' && sortDirection === 'desc'} 
                          onCheckedChange={() => { setSortField("protein"); setSortDirection("desc"); }}
                        >
                          Protéines (élevé)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'protein' && sortDirection === 'asc'} 
                          onCheckedChange={() => { setSortField("protein"); setSortDirection("asc"); }}
                        >
                          Protéines (faible)
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Detailed Meal History */}
                <div className="space-y-6">
                  {groupedMeals.length > 0 ? (
                    groupedMeals.map((group) => (
                      <div key={group.date} className="space-y-3">
                        <div className="flex items-center justify-between px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                            {format(parseISO(group.date), "EEEE d MMMM", { locale: fr })}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-base font-bold">
                              {group.totalProtein}g
                            </Badge>
                            <Badge variant="outline" className="text-base font-bold">
                              {group.totalCalories} kcal
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {group.meals.map((meal) => (
                            <motion.div 
                              key={meal.id} 
                              initial={{ opacity: 0, y: 10 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                      <Utensils className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {meal.description}
                                      </h3>
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                                        {format(parseISO(meal.timestamp), "HH:mm", { locale: fr })}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-base font-bold py-1 px-3">
                                      {meal.protein}g
                                    </Badge>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleAddToFavorites(meal)}
                                      disabled={isMealInFavorites(meal)}
                                      className={cn(
                                        "text-muted-foreground transition-colors",
                                        isMealInFavorites(meal) 
                                          ? "text-red-500 hover:text-red-600" 
                                          : "hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                      )}
                                      title={isMealInFavorites(meal) ? "Déjà dans les favoris" : "Ajouter aux favoris"}
                                    >
                                      <Heart className={cn("h-4 w-4", isMealInFavorites(meal) && "fill-current")} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleDeleteMeal(meal.id)} 
                                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Aucun repas trouvé</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? "Essayez un autre terme de recherche." : "Modifiez vos filtres ou ajoutez de nouveaux repas."}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </motion.div>
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer le repas</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer ce repas ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmDeleteMeal}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}