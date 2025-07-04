import { MealEntry, FavoriteMeal } from "@/context/AppContext";
import { PeriodSummary } from "./summaryUtils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface ExportOptions {
  format: 'csv' | 'pdf';
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
  customFields?: string[];
}

export interface ExportData {
  user: {
    name: string;
    exportDate: string;
    dateRange: string;
    proteinGoal: number;
    calorieGoal: number;
  };
  meals: MealEntry[];
  favorites: FavoriteMeal[];
  summary?: PeriodSummary;
  stats: {
    totalMeals: number;
    totalProtein: number;
    totalCalories: number;
    averageProtein: number;
    averageCalories: number;
    activeDays: number;
  };
}

/**
 * Filter meals by date range
 */
export function filterMealsByDateRange(
  meals: MealEntry[], 
  start: Date, 
  end: Date
): MealEntry[] {
  return meals.filter(meal => {
    const mealDate = new Date(meal.timestamp);
    return mealDate >= start && mealDate <= end;
  });
}

/**
 * Calculate basic stats for export
 */
export function calculateExportStats(meals: MealEntry[]): ExportData['stats'] {
  const totalMeals = meals.length;
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  
  // Get unique days with meals
  const uniqueDays = new Set(
    meals.map(meal => new Date(meal.timestamp).toDateString())
  );
  const activeDays = uniqueDays.size;
  
  return {
    totalMeals,
    totalProtein: Math.round(totalProtein),
    totalCalories: Math.round(totalCalories),
    averageProtein: activeDays > 0 ? Math.round(totalProtein / activeDays) : 0,
    averageCalories: activeDays > 0 ? Math.round(totalCalories / activeDays) : 0,
    activeDays
  };
}

/**
 * Prepare data for export
 */
export function prepareExportData(
  meals: MealEntry[],
  favorites: FavoriteMeal[],
  options: ExportOptions,
  userName: string,
  proteinGoal: number,
  calorieGoal: number,
  summary?: PeriodSummary
): ExportData {
  const filteredMeals = filterMealsByDateRange(meals, options.dateRange.start, options.dateRange.end);
  const stats = calculateExportStats(filteredMeals);
  
  return {
    user: {
      name: userName,
      exportDate: format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr }),
      dateRange: `${format(options.dateRange.start, "dd/MM/yyyy", { locale: fr })} - ${format(options.dateRange.end, "dd/MM/yyyy", { locale: fr })}`,
      proteinGoal,
      calorieGoal
    },
    meals: options.includeData.meals ? filteredMeals : [],
    favorites: options.includeData.favorites ? favorites : [],
    summary: options.includeData.summary ? summary : undefined,
    stats
  };
}

/**
 * Export data as CSV
 */
export function exportToCSV(data: ExportData, options: ExportOptions): void {
  const csvContent = generateCSVContent(data, options);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `nutrition-data-${format(new Date(), "yyyy-MM-dd")}.csv`;
  downloadFile(blob, fileName);
}

/**
 * Generate CSV content
 */
function generateCSVContent(data: ExportData, options: ExportOptions): string {
  let csv = '';
  
  // Add header information
  csv += `Données Nutritionnelles - ${data.user.name}\n`;
  csv += `Exporté le: ${data.user.exportDate}\n`;
  csv += `Période: ${data.user.dateRange}\n`;
  csv += `Objectif Protéines: ${data.user.proteinGoal}g/jour\n`;
  csv += `Objectif Calories: ${data.user.calorieGoal} cal/jour\n\n`;
  
  // Add summary statistics
  csv += `RÉSUMÉ\n`;
  csv += `Total repas,${data.stats.totalMeals}\n`;
  csv += `Total protéines,${data.stats.totalProtein}g\n`;
  csv += `Total calories,${data.stats.totalCalories} cal\n`;
  csv += `Moyenne protéines/jour,${data.stats.averageProtein}g\n`;
  csv += `Moyenne calories/jour,${data.stats.averageCalories} cal\n`;
  csv += `Jours actifs,${data.stats.activeDays}\n\n`;
  
  // Add meals data
  if (options.includeData.meals && data.meals.length > 0) {
    csv += `REPAS\n`;
    csv += `Date,Heure,Description,Protéines (g),Calories,Source,IA\n`;
    
    data.meals.forEach(meal => {
      const date = format(new Date(meal.timestamp), "dd/MM/yyyy", { locale: fr });
      const time = format(new Date(meal.timestamp), "HH:mm", { locale: fr });
      const description = `"${meal.description.replace(/"/g, '""')}"`;
      const calories = meal.calories || 0;
      const source = meal.source || 'Inconnu';
      const aiEstimated = meal.aiEstimated ? 'Oui' : 'Non';
      
      csv += `${date},${time},${description},${meal.protein},${calories},${source},${aiEstimated}\n`;
    });
    csv += '\n';
  }
  
  // Add favorites data
  if (options.includeData.favorites && data.favorites.length > 0) {
    csv += `REPAS FAVORIS\n`;
    csv += `Nom,Description,Protéines (g),Calories,Utilisations,Dernière utilisation\n`;
    
    data.favorites.forEach(favorite => {
      const name = `"${favorite.name.replace(/"/g, '""')}"`;
      const description = `"${favorite.description.replace(/"/g, '""')}"`;
      const calories = favorite.calories || 0;
      const lastUsed = format(new Date(favorite.lastUsed), "dd/MM/yyyy", { locale: fr });
      
      csv += `${name},${description},${favorite.protein},${calories},${favorite.useCount},${lastUsed}\n`;
    });
    csv += '\n';
  }
  
  // Add summary data if available
  if (options.includeData.summary && data.summary) {
    csv += `ANALYSE DÉTAILLÉE\n`;
    csv += `Période,${data.summary.label}\n`;
    csv += `Jours totaux,${data.summary.totalDays}\n`;
    csv += `Jours actifs,${data.summary.activeDays}\n`;
    csv += `Protéines max/jour,${data.summary.maxProtein}g\n`;
    csv += `Protéines min/jour,${data.summary.minProtein}g\n`;
    csv += `Objectif protéines atteint,${data.summary.proteinGoalAchieved} jours\n`;
    csv += `Tendance protéines,${data.summary.proteinTrend}\n`;
    csv += `Repas matin,${data.summary.mealFrequency.morning}\n`;
    csv += `Repas après-midi,${data.summary.mealFrequency.afternoon}\n`;
    csv += `Repas soir,${data.summary.mealFrequency.evening}\n`;
    csv += `Repas nuit,${data.summary.mealFrequency.night}\n`;
  }
  
  return csv;
}

/**
 * Export data as PDF (basic implementation using HTML and print)
 */
export function exportToPDF(data: ExportData, options: ExportOptions): void {
  const htmlContent = generatePDFContent(data, options);
  
  // Create a new window for PDF generation
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les pop-ups sont autorisés.');
  }
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load then trigger print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };
}

/**
 * Generate HTML content for PDF
 */
function generatePDFContent(data: ExportData, options: ExportOptions): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Données Nutritionnelles - ${data.user.name}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333; 
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #3b82f6; 
          margin-bottom: 10px; 
        }
        .section { 
          margin-bottom: 30px; 
          page-break-inside: avoid;
        }
        .section h2 { 
          color: #1f2937; 
          border-bottom: 1px solid #e5e7eb; 
          padding-bottom: 5px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px;
        }
        th, td { 
          border: 1px solid #d1d5db; 
          padding: 8px; 
          text-align: left; 
          font-size: 12px;
        }
        th { 
          background-color: #f3f4f6; 
          font-weight: bold;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        .stat-item {
          border: 1px solid #e5e7eb;
          padding: 15px;
          border-radius: 8px;
          background-color: #f9fafb;
        }
        .stat-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
        }
        @media print {
          body { margin: 0; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Rapport Nutritionnel</h1>
        <p><strong>${data.user.name}</strong></p>
        <p>Exporté le ${data.user.exportDate}</p>
        <p>Période: ${data.user.dateRange}</p>
      </div>

      <div class="section">
        <h2>Résumé des Objectifs</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Objectif Protéines</div>
            <div class="stat-value">${data.user.proteinGoal}g/jour</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Objectif Calories</div>
            <div class="stat-value">${data.user.calorieGoal} cal/jour</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Statistiques de la Période</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Total Repas</div>
            <div class="stat-value">${data.stats.totalMeals}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Protéines</div>
            <div class="stat-value">${data.stats.totalProtein}g</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Moyenne Protéines/jour</div>
            <div class="stat-value">${data.stats.averageProtein}g</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Jours Actifs</div>
            <div class="stat-value">${data.stats.activeDays}</div>
          </div>
        </div>
      </div>

      ${options.includeData.meals && data.meals.length > 0 ? `
        <div class="section">
          <h2>Historique des Repas</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Heure</th>
                <th>Description</th>
                <th>Protéines (g)</th>
                <th>Calories</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${data.meals.map(meal => `
                <tr>
                  <td>${format(new Date(meal.timestamp), "dd/MM/yyyy", { locale: fr })}</td>
                  <td>${format(new Date(meal.timestamp), "HH:mm", { locale: fr })}</td>
                  <td>${meal.description}</td>
                  <td>${meal.protein}</td>
                  <td>${meal.calories || '-'}</td>
                  <td>${meal.source || 'Inconnu'}${meal.aiEstimated ? ' (IA)' : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${options.includeData.favorites && data.favorites.length > 0 ? `
        <div class="section">
          <h2>Repas Favoris</h2>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Description</th>
                <th>Protéines (g)</th>
                <th>Calories</th>
                <th>Utilisations</th>
              </tr>
            </thead>
            <tbody>
              ${data.favorites.map(favorite => `
                <tr>
                  <td>${favorite.name}</td>
                  <td>${favorite.description}</td>
                  <td>${favorite.protein}</td>
                  <td>${favorite.calories || '-'}</td>
                  <td>${favorite.useCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${options.includeData.summary && data.summary ? `
        <div class="section">
          <h2>Analyse Détaillée</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Protéines Max/Jour</div>
              <div class="stat-value">${data.summary.maxProtein}g</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Protéines Min/Jour</div>
              <div class="stat-value">${data.summary.minProtein}g</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Objectif Atteint</div>
              <div class="stat-value">${data.summary.proteinGoalAchieved} jours</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Tendance</div>
              <div class="stat-value">${data.summary.proteinTrend}</div>
            </div>
          </div>
          
          <h3>Répartition des Repas</h3>
          <table style="width: 60%;">
            <tr><td><strong>Matin</strong></td><td>${data.summary.mealFrequency.morning} repas</td></tr>
            <tr><td><strong>Après-midi</strong></td><td>${data.summary.mealFrequency.afternoon} repas</td></tr>
            <tr><td><strong>Soir</strong></td><td>${data.summary.mealFrequency.evening} repas</td></tr>
            <tr><td><strong>Nuit</strong></td><td>${data.summary.mealFrequency.night} repas</td></tr>
          </table>
        </div>
      ` : ''}

      <div class="section" style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
        <p>Rapport généré par DynProt App • ${data.user.exportDate}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download file helper
 */
function downloadFile(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Get default export options
 */
export function getDefaultExportOptions(): ExportOptions {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30); // Last 30 days by default
  
  return {
    format: 'csv',
    dateRange: { start, end },
    includeData: {
      meals: true,
      favorites: true,
      summary: true,
      personalInfo: true
    }
  };
}