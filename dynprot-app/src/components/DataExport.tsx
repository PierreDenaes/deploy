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
  Download,
  FileText,
  Calendar as CalendarIcon,
  Settings,
  FileDown,
  Database,
  Heart,
  BarChart3,
  User,
  Loader2
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  ExportOptions,
  exportToCSV,
  exportToPDF,
  prepareExportData,
  getDefaultExportOptions
} from "@/lib/exportUtils";
import { calculatePeriodSummary } from "@/lib/summaryUtils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DataExportProps {
  className?: string;
  variant?: 'button' | 'card' | 'inline';
  buttonText?: string;
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

export default function DataExport({ 
  className, 
  variant = 'button',
  buttonText = "Exporter les données"
}: DataExportProps) {
  const { state, userSettings } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(getDefaultExportOptions());
  const [customDateRange, setCustomDateRange] = useState<{from?: Date; to?: Date} | undefined>(undefined);

  const proteinGoal = userSettings?.proteinGoal || state.user.dailyProteinGoal || 120;
  const calorieGoal = userSettings?.calorieGoal || state.user.calorieGoal || 2000;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Prepare summary data if requested
      let summary;
      if (options.includeData.summary) {
        summary = calculatePeriodSummary(
          state.meals || [],
          options.dateRange.start,
          options.dateRange.end,
          `${format(options.dateRange.start, "dd/MM/yyyy", { locale: fr })} - ${format(options.dateRange.end, "dd/MM/yyyy", { locale: fr })}`,
          proteinGoal,
          calorieGoal
        );
      }

      // Prepare export data
      const exportData = prepareExportData(
        state.meals || [],
        state.favoriteMeals || [],
        options,
        state.user.name,
        proteinGoal,
        calorieGoal,
        summary
      );

      // Check if there's data to export
      if (exportData.meals.length === 0 && options.includeData.meals) {
        toast.error("Aucun repas trouvé pour la période sélectionnée");
        return;
      }

      // Export based on format
      if (options.format === 'csv') {
        exportToCSV(exportData, options);
        toast.success("Données exportées en CSV avec succès");
      } else {
        exportToPDF(exportData, options);
        toast.success("PDF généré avec succès");
      }

      setIsOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'export des données");
    } finally {
      setIsExporting(false);
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

  const renderTrigger = () => {
    switch (variant) {
      case 'card':
        return (
          <Card className={cn("border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow", className)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Exporter les données
              </CardTitle>
              <CardDescription>
                Téléchargez vos données nutritionnelles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <FileDown className="h-4 w-4 mr-2" />
                Configurer l'export
              </Button>
            </CardContent>
          </Card>
        );
      case 'inline':
        return (
          <Button variant="outline" className={className}>
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="sm:hidden">Export</span>
            <span className="hidden sm:inline">{buttonText}</span>
          </Button>
        );
      default:
        return (
          <Button className={className}>
            <Download className="h-4 w-4 mr-2" />
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
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exporter les données nutritionnelles
          </DialogTitle>
          <DialogDescription>
            Configurez votre export pour télécharger vos données au format CSV ou PDF
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Format d'export</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={cn(
                  "cursor-pointer border-2 transition-colors",
                  options.format === 'csv' ? "border-primary bg-primary/5" : "border-border"
                )}
                onClick={() => setOptions(prev => ({ ...prev, format: 'csv' }))}
              >
                <CardContent className="p-4 text-center">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-muted-foreground">
                    Pour Excel, Google Sheets
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={cn(
                  "cursor-pointer border-2 transition-colors",
                  options.format === 'pdf' ? "border-primary bg-primary/5" : "border-border"
                )}
                onClick={() => setOptions(prev => ({ ...prev, format: 'pdf' }))}
              >
                <CardContent className="p-4 text-center">
                  <FileDown className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-medium">PDF</div>
                  <div className="text-xs text-muted-foreground">
                    Rapport formaté
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Période</Label>
            
            {/* Preset ranges */}
            <div className="flex flex-wrap gap-2">
              {presetDateRanges.map((preset, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
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
            <Label className="text-base font-medium">Données à inclure</Label>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-primary" />
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
                  <Heart className="h-4 w-4 text-primary" />
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
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Analyse et statistiques</div>
                    <div className="text-sm text-muted-foreground">
                      Résumé et tendances de la période
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
                  <User className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Informations personnelles</div>
                    <div className="text-sm text-muted-foreground">
                      Nom, objectifs et paramètres
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
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || totalMealsInRange === 0}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exporter {options.format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}