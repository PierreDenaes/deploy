import { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  AlertTriangle,
  Calendar as CalendarIcon,
  Settings,
  Database,
  Heart,
  BarChart3,
  User,
  Loader2
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DataDeletionProps {
  className?: string;
  variant?: 'button' | 'card' | 'inline';
  buttonText?: string;
}

interface DeletionOptions {
  dateRange: {
    start: Date;
    end: Date;
  };
  includeData: {
    meals: boolean;
    favorites: boolean;
    summary: boolean;
    personalInfo: boolean;
  };
}

const presetDateRanges = [
  {
    label: 'Derniers 7 jours',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { start, end };
    }
  },
  {
    label: 'Derniers 30 jours',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { start, end };
    }
  },
  {
    label: 'Derniers 3 mois',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(end.getMonth() - 3);
      return { start, end };
    }
  },
  {
    label: 'Cette année',
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return { start, end };
    }
  },
  {
    label: 'Toutes les données',
    getValue: () => {
      const end = new Date();
      const start = new Date(2020, 0, 1); // Far back start date
      return { start, end };
    }
  }
];

const getDefaultDeletionOptions = (): DeletionOptions => ({
  dateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  },
  includeData: {
    meals: false,
    favorites: false,
    summary: false,
    personalInfo: false
  }
});

export default function DataDeletion({ 
  className, 
  variant = 'button',
  buttonText = "Supprimer les données"
}: DataDeletionProps) {
  const { state } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [options, setOptions] = useState<DeletionOptions>(getDefaultDeletionOptions());
  const [customDateRange, setCustomDateRange] = useState<{from?: Date; to?: Date} | undefined>(undefined);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDeletion = async () => {
    setIsDeleting(true);
    
    try {
      // Call backend deletion API
      const response = await fetch('/api/profile/delete-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          dateRange: options.dateRange,
          includeData: options.includeData
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression des données');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || "Données supprimées avec succès");
        setIsOpen(false);
        setShowConfirmation(false);
        // Refresh the page or update context to reflect changes
        window.location.reload();
      } else {
        throw new Error(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Deletion error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression des données");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePresetDateRange = (preset: typeof presetDateRanges[0]) => {
    const range = preset.getValue();
    setOptions(prev => ({
      ...prev,
      dateRange: range
    }));
    setCustomDateRange({ from: range.start, to: range.end });
  };

  const handleCustomDateRange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setOptions(prev => ({
        ...prev,
        dateRange: { start: range.from!, end: range.to! }
      }));
    }
    setCustomDateRange(range || {});
  };

  const totalMealsInRange = state.meals ? state.meals.filter(meal => {
    const mealDate = new Date(meal.timestamp);
    return mealDate >= options.dateRange.start && mealDate <= options.dateRange.end;
  }).length : 0;

  const hasDataSelected = Object.values(options.includeData).some(selected => selected);

  const renderTrigger = () => {
    switch (variant) {
      case 'card':
        return (
          <Card className={cn("border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-destructive/20", className)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Supprimer les données
              </CardTitle>
              <CardDescription>
                Supprimez définitivement vos données nutritionnelles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Configurer la suppression
              </Button>
            </CardContent>
          </Card>
        );
      case 'inline':
        return (
          <Button variant="destructive" className={className}>
            <Trash2 className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        );
      default:
        return (
          <Button variant="destructive" className={className}>
            <Trash2 className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Supprimer les données nutritionnelles
          </DialogTitle>
          <DialogDescription>
            <strong>Attention:</strong> Cette action est irréversible. Sélectionnez soigneusement les données à supprimer.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Période</Label>
            
            {/* Preset ranges */}
            <div className="flex flex-wrap gap-2">
              {presetDateRanges.map((preset, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => handlePresetDateRange(preset)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>

            {/* Custom date range */}
            <div className="space-y-2">
              <Label className="text-sm">Période personnalisée</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange?.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, "dd MMM yyyy", { locale: fr })} -{" "}
                          {format(customDateRange.to, "dd MMM yyyy", { locale: fr })}
                        </>
                      ) : (
                        format(customDateRange.from, "dd MMM yyyy", { locale: fr })
                      )
                    ) : (
                      "Sélectionner une période"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange && customDateRange.from && customDateRange.to ? customDateRange as any : undefined}
                    onSelect={handleCustomDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="text-sm text-muted-foreground">
              {totalMealsInRange} repas dans la période sélectionnée
            </div>
          </div>

          <Separator />

          {/* Data Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Données à supprimer</Label>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium">Historique des repas</div>
                    <div className="text-sm text-muted-foreground">
                      Liste détaillée de tous vos repas
                    </div>
                  </div>
                </div>
                <Switch
                  checked={options.includeData.meals}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({
                      ...prev,
                      includeData: { ...prev.includeData, meals: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium">Repas favoris</div>
                    <div className="text-sm text-muted-foreground">
                      Vos repas marqués comme favoris
                    </div>
                  </div>
                </div>
                <Switch
                  checked={options.includeData.favorites}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({
                      ...prev,
                      includeData: { ...prev.includeData, favorites: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium">Analyse et statistiques</div>
                    <div className="text-sm text-muted-foreground">
                      Résumés quotidiens et tendances
                    </div>
                  </div>
                </div>
                <Switch
                  checked={options.includeData.summary}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({
                      ...prev,
                      includeData: { ...prev.includeData, summary: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium">Informations personnelles</div>
                    <div className="text-sm text-muted-foreground">
                      Réinitialiser le profil aux valeurs par défaut
                    </div>
                  </div>
                </div>
                <Switch
                  checked={options.includeData.personalInfo}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({
                      ...prev,
                      includeData: { ...prev.includeData, personalInfo: checked }
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {hasDataSelected && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Attention
              </div>
              <p className="text-sm text-destructive/80">
                Cette action est irréversible. Les données sélectionnées seront définitivement supprimées.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeletion}
            disabled={isDeleting || !hasDataSelected}
            className="w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression en cours...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer les données
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}