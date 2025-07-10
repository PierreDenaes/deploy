// Service de fallback pour les valeurs nutritionnelles quand OpenFoodFacts échoue
// Base de données complète des produits alimentaires français courants

export interface FallbackNutrition {
  protein: number;      // Protéines pour 100g
  calories: number;     // Calories pour 100g
  carbs: number;       // Glucides pour 100g
  fat: number;         // Lipides pour 100g
  fiber: number;       // Fibres pour 100g
  confidence: number;  // Confiance de l'estimation (0-1)
  source: string;      // Source des données
}

export class FallbackNutritionService {
  
  // =====================================================
  // BASE DE DONNÉES NUTRITIONNELLE COMPLÈTE
  // =====================================================
  
  private static readonly NUTRITION_DATABASE: Record<string, FallbackNutrition> = {
    
    // =====================================================
    // BISCUITS ET GÂTEAUX
    // =====================================================
    
    // Marque Prince
    'prince chocolat': { protein: 6.3, calories: 467, carbs: 65, fat: 18, fiber: 4.2, confidence: 0.85, source: 'Base CIQUAL + données fabricant' },
    'prince petit déjeuner': { protein: 8.1, calories: 456, carbs: 62, fat: 17, fiber: 5.1, confidence: 0.85, source: 'Base CIQUAL + données fabricant' },
    'prince goût chocolat': { protein: 6.3, calories: 467, carbs: 65, fat: 18, fiber: 4.2, confidence: 0.85, source: 'Base CIQUAL + données fabricant' },
    'prince blé complet': { protein: 8.5, calories: 445, carbs: 60, fat: 16, fiber: 6.8, confidence: 0.85, source: 'Base CIQUAL + données fabricant' },
    'prince chocolat blé complet': { protein: 7.2, calories: 455, carbs: 62, fat: 17, fiber: 5.5, confidence: 0.85, source: 'Base CIQUAL + données fabricant' },
    'prince céréales': { protein: 8.1, calories: 456, carbs: 62, fat: 17, fiber: 5.1, confidence: 0.85, source: 'Base CIQUAL + données fabricant' },
    
    // Marque LU
    'petit beurre': { protein: 7.2, calories: 435, carbs: 72, fat: 13, fiber: 2.8, confidence: 0.85, source: 'Base CIQUAL' },
    'petit beurre lu': { protein: 7.2, calories: 435, carbs: 72, fat: 13, fiber: 2.8, confidence: 0.85, source: 'Base CIQUAL' },
    'pim\'s orange': { protein: 4.8, calories: 445, carbs: 68, fat: 16, fiber: 2.1, confidence: 0.85, source: 'Base CIQUAL' },
    'pim\'s framboise': { protein: 4.8, calories: 445, carbs: 68, fat: 16, fiber: 2.1, confidence: 0.85, source: 'Base CIQUAL' },
    'belvita petit déjeuner': { protein: 8.5, calories: 456, carbs: 64, fat: 16, fiber: 6.2, confidence: 0.85, source: 'Base CIQUAL' },
    'granola lu': { protein: 8.1, calories: 465, carbs: 62, fat: 19, fiber: 5.8, confidence: 0.85, source: 'Base CIQUAL' },
    'mikado': { protein: 6.8, calories: 488, carbs: 66, fat: 21, fiber: 3.2, confidence: 0.85, source: 'Base CIQUAL' },
    'oreo': { protein: 4.8, calories: 468, carbs: 71, fat: 18, fiber: 3.1, confidence: 0.85, source: 'Base CIQUAL' },
    'sablé lu': { protein: 6.5, calories: 485, carbs: 63, fat: 22, fiber: 2.5, confidence: 0.85, source: 'Base CIQUAL' },
    
    // Autres marques de biscuits
    'digestive mcvitie\'s': { protein: 7.1, calories: 471, carbs: 62, fat: 20, fiber: 6.8, confidence: 0.85, source: 'Base CIQUAL' },
    'gerblé': { protein: 9.2, calories: 425, carbs: 58, fat: 15, fiber: 8.1, confidence: 0.85, source: 'Base CIQUAL' },
    'biscotte': { protein: 11.5, calories: 410, carbs: 72, fat: 7.5, fiber: 4.2, confidence: 0.85, source: 'Base CIQUAL' },
    'cracotte': { protein: 11.5, calories: 410, carbs: 72, fat: 7.5, fiber: 4.2, confidence: 0.85, source: 'Base CIQUAL' },
    'galette riz': { protein: 8.2, calories: 380, carbs: 83, fat: 2.8, fiber: 1.2, confidence: 0.85, source: 'Base CIQUAL' },
    'madeleine': { protein: 6.8, calories: 465, carbs: 55, fat: 23, fiber: 1.8, confidence: 0.85, source: 'Base CIQUAL' },
    'financier': { protein: 8.5, calories: 485, carbs: 45, fat: 28, fiber: 2.1, confidence: 0.85, source: 'Base CIQUAL' },
    'cookie': { protein: 5.8, calories: 502, carbs: 64, fat: 24, fiber: 2.8, confidence: 0.85, source: 'Base CIQUAL' },
    'spéculoos': { protein: 6.2, calories: 486, carbs: 72, fat: 18, fiber: 2.5, confidence: 0.85, source: 'Base CIQUAL' },
    
    // =====================================================
    // CÉRÉALES ET PETIT-DÉJEUNER
    // =====================================================
    
    'cornflakes': { protein: 7.5, calories: 357, carbs: 84, fat: 0.9, fiber: 3.3, confidence: 0.85, source: 'Base CIQUAL' },
    'muesli': { protein: 10.1, calories: 363, carbs: 56, fat: 8.2, fiber: 8.5, confidence: 0.85, source: 'Base CIQUAL' },
    'granola': { protein: 9.8, calories: 471, carbs: 64, fat: 18, fiber: 6.8, confidence: 0.85, source: 'Base CIQUAL' },
    'flocons avoine': { protein: 13.2, calories: 389, carbs: 56, fat: 7.0, fiber: 10.1, confidence: 0.85, source: 'Base CIQUAL' },
    'porridge': { protein: 13.2, calories: 389, carbs: 56, fat: 7.0, fiber: 10.1, confidence: 0.85, source: 'Base CIQUAL' },
    'cheerios': { protein: 8.1, calories: 375, carbs: 74, fat: 3.8, fiber: 7.2, confidence: 0.85, source: 'Base CIQUAL' },
    'special k': { protein: 15.0, calories: 378, carbs: 71, fat: 1.5, fiber: 3.8, confidence: 0.85, source: 'Base CIQUAL' },
    'all bran': { protein: 14.0, calories: 270, carbs: 46, fat: 3.5, fiber: 29.0, confidence: 0.85, source: 'Base CIQUAL' },
    
    // =====================================================
    // PRODUITS LAITIERS
    // =====================================================
    
    // Yaourts
    'yaourt nature': { protein: 4.0, calories: 58, carbs: 4.5, fat: 3.2, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'yaourt grec': { protein: 8.5, calories: 97, carbs: 4.0, fat: 5.8, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'yaourt aux fruits': { protein: 3.8, calories: 85, carbs: 13.5, fat: 2.8, fiber: 0.2, confidence: 0.9, source: 'Base CIQUAL' },
    'yaourt 0%': { protein: 4.2, calories: 45, carbs: 6.2, fat: 0.1, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'activia': { protein: 4.0, calories: 58, carbs: 4.5, fat: 3.2, fiber: 0, confidence: 0.85, source: 'Base CIQUAL' },
    'danette': { protein: 3.2, calories: 101, carbs: 16.8, fat: 2.8, fiber: 0.5, confidence: 0.85, source: 'Base CIQUAL' },
    'fromage blanc': { protein: 7.5, calories: 75, carbs: 4.8, fat: 3.2, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'fromage blanc 0%': { protein: 8.2, calories: 45, carbs: 5.1, fat: 0.2, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'petit suisse': { protein: 6.8, calories: 115, carbs: 4.2, fat: 9.1, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'faisselle': { protein: 7.8, calories: 78, carbs: 4.1, fat: 4.2, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    
    // Fromages
    'emmental': { protein: 28.5, calories: 382, carbs: 0.4, fat: 30.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'gruyère': { protein: 29.8, calories: 413, carbs: 0.4, fat: 32.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'camembert': { protein: 19.8, calories: 264, carbs: 0.5, fat: 21.2, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'brie': { protein: 20.1, calories: 334, carbs: 0.5, fat: 27.7, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'roquefort': { protein: 19.1, calories: 369, carbs: 2.0, fat: 32.9, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'chèvre': { protein: 18.5, calories: 364, carbs: 2.5, fat: 32.7, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'mozzarella': { protein: 18.1, calories: 280, carbs: 2.2, fat: 22.4, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'feta': { protein: 14.2, calories: 264, carbs: 4.1, fat: 21.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'comté': { protein: 27.0, calories: 409, carbs: 1.4, fat: 32.7, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'boursin': { protein: 9.5, calories: 410, carbs: 2.8, fat: 42.0, fiber: 0.5, confidence: 0.85, source: 'Base CIQUAL' },
    
    // =====================================================
    // VIANDES ET POISSONS
    // =====================================================
    
    // Viandes
    'poulet': { protein: 23.0, calories: 121, carbs: 0, fat: 2.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'poulet grillé': { protein: 23.0, calories: 121, carbs: 0, fat: 2.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'escalope poulet': { protein: 23.0, calories: 121, carbs: 0, fat: 2.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'blanc poulet': { protein: 23.0, calories: 121, carbs: 0, fat: 2.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'cuisse poulet': { protein: 20.1, calories: 180, carbs: 0, fat: 9.7, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'boeuf': { protein: 26.0, calories: 158, carbs: 0, fat: 6.8, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'steak boeuf': { protein: 26.0, calories: 158, carbs: 0, fat: 6.8, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'porc': { protein: 25.7, calories: 173, carbs: 0, fat: 8.9, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'jambon': { protein: 20.9, calories: 145, carbs: 0.5, fat: 5.5, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'jambon blanc': { protein: 20.9, calories: 145, carbs: 0.5, fat: 5.5, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'saucisson': { protein: 26.9, calories: 460, carbs: 1.5, fat: 40.2, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'merguez': { protein: 15.0, calories: 330, carbs: 2.8, fat: 29.0, fiber: 0.8, confidence: 0.9, source: 'Base CIQUAL' },
    'dinde': { protein: 24.1, calories: 135, carbs: 0, fat: 4.0, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'veau': { protein: 24.4, calories: 168, carbs: 0, fat: 7.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'agneau': { protein: 25.6, calories: 234, carbs: 0, fat: 14.1, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    
    // Poissons
    'saumon': { protein: 25.4, calories: 184, carbs: 0, fat: 8.1, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'thon': { protein: 30.0, calories: 144, carbs: 0, fat: 4.9, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'colin': { protein: 17.8, calories: 78, carbs: 0, fat: 0.7, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'cabillaud': { protein: 17.8, calories: 78, carbs: 0, fat: 0.7, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'sole': { protein: 16.9, calories: 73, carbs: 0, fat: 1.2, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'sardine': { protein: 24.6, calories: 208, carbs: 0, fat: 11.5, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'maquereau': { protein: 23.7, calories: 205, carbs: 0, fat: 11.9, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'truite': { protein: 22.0, calories: 129, carbs: 0, fat: 4.5, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'bar': { protein: 18.4, calories: 97, carbs: 0, fat: 2.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'dorade': { protein: 19.8, calories: 95, carbs: 0, fat: 1.8, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    
    // =====================================================
    // ŒUFS
    // =====================================================
    
    'oeuf': { protein: 12.6, calories: 145, carbs: 0.7, fat: 10.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'oeuf dur': { protein: 12.6, calories: 145, carbs: 0.7, fat: 10.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'oeuf à la coque': { protein: 12.6, calories: 145, carbs: 0.7, fat: 10.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'oeuf brouillé': { protein: 12.6, calories: 145, carbs: 0.7, fat: 10.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'omelette': { protein: 12.6, calories: 145, carbs: 0.7, fat: 10.3, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    
    // =====================================================
    // LÉGUMINEUSES ET CÉRÉALES
    // =====================================================
    
    'lentilles': { protein: 9.0, calories: 116, carbs: 16.3, fat: 0.4, fiber: 7.9, confidence: 0.9, source: 'Base CIQUAL' },
    'haricots rouges': { protein: 8.7, calories: 129, carbs: 19.7, fat: 0.5, fiber: 6.4, confidence: 0.9, source: 'Base CIQUAL' },
    'haricots blancs': { protein: 7.1, calories: 106, carbs: 16.9, fat: 0.7, fiber: 5.8, confidence: 0.9, source: 'Base CIQUAL' },
    'pois chiches': { protein: 8.0, calories: 139, carbs: 22.5, fat: 2.4, fiber: 4.8, confidence: 0.9, source: 'Base CIQUAL' },
    'quinoa': { protein: 4.4, calories: 112, carbs: 18.5, fat: 1.8, fiber: 2.8, confidence: 0.9, source: 'Base CIQUAL' },
    'riz': { protein: 2.7, calories: 130, carbs: 28.2, fat: 0.3, fiber: 1.4, confidence: 0.9, source: 'Base CIQUAL' },
    'riz complet': { protein: 2.6, calories: 112, carbs: 22.9, fat: 0.9, fiber: 1.8, confidence: 0.9, source: 'Base CIQUAL' },
    'pâtes': { protein: 5.0, calories: 131, carbs: 25.0, fat: 0.9, fiber: 1.8, confidence: 0.9, source: 'Base CIQUAL' },
    'pâtes complètes': { protein: 5.1, calories: 124, carbs: 23.2, fat: 1.4, fiber: 3.4, confidence: 0.9, source: 'Base CIQUAL' },
    'pain': { protein: 8.8, calories: 285, carbs: 55.7, fat: 3.5, fiber: 3.8, confidence: 0.9, source: 'Base CIQUAL' },
    'pain complet': { protein: 8.5, calories: 247, carbs: 45.1, fat: 3.5, fiber: 7.4, confidence: 0.9, source: 'Base CIQUAL' },
    'pain de mie': { protein: 7.5, calories: 280, carbs: 50.6, fat: 4.9, fiber: 3.6, confidence: 0.9, source: 'Base CIQUAL' },
    'baguette': { protein: 8.8, calories: 285, carbs: 55.7, fat: 3.5, fiber: 3.8, confidence: 0.9, source: 'Base CIQUAL' },
    
    // =====================================================
    // FRUITS ET LÉGUMES
    // =====================================================
    
    // Fruits
    'pomme': { protein: 0.3, calories: 54, carbs: 11.6, fat: 0.4, fiber: 2.4, confidence: 0.9, source: 'Base CIQUAL' },
    'banane': { protein: 1.2, calories: 90, carbs: 20.0, fat: 0.2, fiber: 2.7, confidence: 0.9, source: 'Base CIQUAL' },
    'orange': { protein: 1.2, calories: 45, carbs: 8.3, fat: 0.2, fiber: 2.2, confidence: 0.9, source: 'Base CIQUAL' },
    'poire': { protein: 0.4, calories: 60, carbs: 13.6, fat: 0.4, fiber: 3.3, confidence: 0.9, source: 'Base CIQUAL' },
    'fraise': { protein: 0.8, calories: 35, carbs: 6.2, fat: 0.4, fiber: 2.3, confidence: 0.9, source: 'Base CIQUAL' },
    'kiwi': { protein: 1.1, calories: 58, carbs: 10.6, fat: 0.6, fiber: 2.7, confidence: 0.9, source: 'Base CIQUAL' },
    'avocat': { protein: 1.9, calories: 169, carbs: 1.8, fat: 14.8, fiber: 6.3, confidence: 0.9, source: 'Base CIQUAL' },
    
    // Légumes
    'tomate': { protein: 0.8, calories: 15, carbs: 2.8, fat: 0.1, fiber: 1.2, confidence: 0.9, source: 'Base CIQUAL' },
    'carotte': { protein: 0.8, calories: 33, carbs: 6.7, fat: 0.2, fiber: 3.0, confidence: 0.9, source: 'Base CIQUAL' },
    'courgette': { protein: 1.3, calories: 13, carbs: 1.4, fat: 0.4, fiber: 1.1, confidence: 0.9, source: 'Base CIQUAL' },
    'brocoli': { protein: 3.3, calories: 29, carbs: 2.4, fat: 0.4, fiber: 2.4, confidence: 0.9, source: 'Base CIQUAL' },
    'épinards': { protein: 2.8, calories: 17, carbs: 1.4, fat: 0.4, fiber: 6.3, confidence: 0.9, source: 'Base CIQUAL' },
    'salade': { protein: 1.8, calories: 13, carbs: 1.3, fat: 0.2, fiber: 1.9, confidence: 0.9, source: 'Base CIQUAL' },
    'concombre': { protein: 0.6, calories: 10, carbs: 1.5, fat: 0.1, fiber: 1.0, confidence: 0.9, source: 'Base CIQUAL' },
    'poivron': { protein: 1.0, calories: 21, carbs: 4.6, fat: 0.2, fiber: 1.6, confidence: 0.9, source: 'Base CIQUAL' },
    
    // =====================================================
    // SNACKS ET CHIPS
    // =====================================================
    
    'chips': { protein: 6.6, calories: 536, carbs: 49.7, fat: 34.6, fiber: 4.8, confidence: 0.85, source: 'Base CIQUAL' },
    'chips lay\'s': { protein: 6.6, calories: 536, carbs: 49.7, fat: 34.6, fiber: 4.8, confidence: 0.85, source: 'Base CIQUAL' },
    'pringles': { protein: 4.4, calories: 536, carbs: 50.0, fat: 35.0, fiber: 4.0, confidence: 0.85, source: 'Base CIQUAL' },
    'crackers': { protein: 9.9, calories: 434, carbs: 71.3, fat: 11.1, fiber: 3.1, confidence: 0.85, source: 'Base CIQUAL' },
    'pop corn': { protein: 11.0, calories: 429, carbs: 57.2, fat: 15.1, fiber: 14.2, confidence: 0.85, source: 'Base CIQUAL' },
    'noix': { protein: 20.0, calories: 618, carbs: 11.2, fat: 51.5, fiber: 5.0, confidence: 0.9, source: 'Base CIQUAL' },
    'amandes': { protein: 25.4, calories: 634, carbs: 4.6, fat: 53.4, fiber: 12.9, confidence: 0.9, source: 'Base CIQUAL' },
    'cacahuètes': { protein: 23.7, calories: 623, carbs: 7.5, fat: 49.6, fiber: 8.0, confidence: 0.9, source: 'Base CIQUAL' },
    
    // =====================================================
    // BOISSONS
    // =====================================================
    
    'lait': { protein: 3.2, calories: 46, carbs: 4.6, fat: 1.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'lait entier': { protein: 3.2, calories: 46, carbs: 4.6, fat: 1.6, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'lait écrémé': { protein: 3.4, calories: 33, carbs: 5.0, fat: 0.1, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'coca cola': { protein: 0, calories: 42, carbs: 10.6, fat: 0, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'jus orange': { protein: 0.8, calories: 45, carbs: 10.0, fat: 0.2, fiber: 0.2, confidence: 0.9, source: 'Base CIQUAL' },
    'café': { protein: 0.1, calories: 1, carbs: 0, fat: 0, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'thé': { protein: 0, calories: 1, carbs: 0.3, fat: 0, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    
    // =====================================================
    // PLATS CUISINÉS
    // =====================================================
    
    'pizza': { protein: 11.0, calories: 266, carbs: 33.0, fat: 10.4, fiber: 2.3, confidence: 0.8, source: 'Base CIQUAL moyenne' },
    'hamburger': { protein: 16.0, calories: 295, carbs: 24.0, fat: 15.5, fiber: 2.8, confidence: 0.8, source: 'Base CIQUAL moyenne' },
    'sandwich': { protein: 8.5, calories: 250, carbs: 35.0, fat: 8.2, fiber: 3.1, confidence: 0.8, source: 'Base CIQUAL moyenne' },
    'quiche': { protein: 9.8, calories: 314, carbs: 21.0, fat: 21.5, fiber: 1.8, confidence: 0.8, source: 'Base CIQUAL moyenne' },
    'lasagne': { protein: 12.5, calories: 165, carbs: 14.8, fat: 7.8, fiber: 1.5, confidence: 0.8, source: 'Base CIQUAL moyenne' },
    'ratatouille': { protein: 1.2, calories: 32, carbs: 4.9, fat: 1.0, fiber: 2.8, confidence: 0.8, source: 'Base CIQUAL moyenne' },
    'soupe': { protein: 1.8, calories: 35, carbs: 4.2, fat: 1.5, fiber: 1.2, confidence: 0.7, source: 'Base CIQUAL moyenne' },
    
    // =====================================================
    // PRODUITS INDUSTRIELS SPÉCIFIQUES
    // =====================================================
    
    // Nutella et pâtes à tartiner
    'nutella': { protein: 6.3, calories: 539, carbs: 57.5, fat: 30.9, fiber: 4.4, confidence: 0.85, source: 'Données fabricant' },
    'pâte tartiner': { protein: 6.3, calories: 539, carbs: 57.5, fat: 30.9, fiber: 4.4, confidence: 0.8, source: 'Base CIQUAL moyenne' },
    
    // Glaces et desserts
    'glace vanille': { protein: 3.8, calories: 184, carbs: 23.6, fat: 8.7, fiber: 0.5, confidence: 0.85, source: 'Base CIQUAL' },
    'sorbet': { protein: 0.5, calories: 134, carbs: 34.0, fat: 0.1, fiber: 0.8, confidence: 0.85, source: 'Base CIQUAL' },
    
    // =====================================================
    // AUTRES PRODUITS COURANTS
    // =====================================================
    
    'miel': { protein: 0.4, calories: 329, carbs: 82.1, fat: 0, fiber: 0.2, confidence: 0.9, source: 'Base CIQUAL' },
    'confiture': { protein: 0.4, calories: 279, carbs: 68.0, fat: 0.1, fiber: 1.2, confidence: 0.9, source: 'Base CIQUAL' },
    'beurre': { protein: 0.7, calories: 753, carbs: 0.7, fat: 83.0, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'huile olive': { protein: 0, calories: 899, carbs: 0, fat: 99.9, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
    'sucre': { protein: 0, calories: 399, carbs: 99.8, fat: 0, fiber: 0, confidence: 0.9, source: 'Base CIQUAL' },
  };

  // =====================================================
  // MÉTHODES DE RECHERCHE ET MATCHING
  // =====================================================

  /**
   * Rechercher des valeurs nutritionnelles de fallback pour un produit
   */
  static searchFallback(productName: string, brand?: string): FallbackNutrition | null {
    if (!productName) return null;

    const searchTerm = this.normalizeSearchTerm(productName, brand);
    console.log(`🔍 Recherche fallback pour: "${searchTerm}"`);

    // 1. Recherche exacte
    const exactMatch = this.NUTRITION_DATABASE[searchTerm];
    if (exactMatch) {
      console.log(`✅ Match exact trouvé: ${searchTerm}`);
      return exactMatch;
    }

    // 2. Recherche par mots-clés avec scoring
    const results = this.searchByKeywords(searchTerm);
    if (results.length > 0) {
      const bestMatch = results[0];
      if (bestMatch) {
        console.log(`✅ Match par mots-clés: "${bestMatch.key}" (score: ${bestMatch.score})`);
        return bestMatch.nutrition;
      }
    }

    // 3. Recherche par catégorie de produit
    const categoryMatch = this.searchByCategory(searchTerm);
    if (categoryMatch) {
      console.log(`✅ Match par catégorie: ${categoryMatch.key}`);
      return categoryMatch.nutrition;
    }

    console.log(`❌ Aucun fallback trouvé pour: "${searchTerm}"`);
    return null;
  }

  /**
   * Normaliser les termes de recherche
   */
  private static normalizeSearchTerm(productName: string, brand?: string): string {
    let searchTerm = productName.toLowerCase();
    
    // Ajouter la marque si pertinente
    if (brand && brand !== 'marque_non_visible' && brand.toLowerCase() !== 'unknown') {
      const brandLower = brand.toLowerCase();
      // Ne pas ajouter la marque si elle est déjà dans le nom
      if (!searchTerm.includes(brandLower)) {
        searchTerm = `${brandLower} ${searchTerm}`;
      }
    }

    // Nettoyer les termes de recherche
    searchTerm = searchTerm
      .replace(/\b(goût|saveur|parfum)\b/g, '') // Supprimer les mots-clés non essentiels
      .replace(/\b(au|aux|à la|de la|du|des|d'|avec)\b/g, '') // Supprimer les prépositions
      .replace(/\b(plein|complet|entier|riche en)\b/g, '') // Simplifier les qualificatifs
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();

    return searchTerm;
  }

  /**
   * Recherche par mots-clés avec scoring
   */
  private static searchByKeywords(searchTerm: string): Array<{key: string, nutrition: FallbackNutrition, score: number}> {
    const searchWords = searchTerm.split(' ').filter(word => word.length > 2);
    const results: Array<{key: string, nutrition: FallbackNutrition, score: number}> = [];

    for (const [key, nutrition] of Object.entries(this.NUTRITION_DATABASE)) {
      const score = this.calculateMatchScore(searchWords, key);
      if (score > 0.3) {
        results.push({ key, nutrition, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculer le score de correspondance entre les mots de recherche et une clé
   */
  private static calculateMatchScore(searchWords: string[], key: string): number {
    const keyWords = key.split(' ');
    let matchedWords = 0;
    let totalWords = searchWords.length;

    for (const searchWord of searchWords) {
      for (const keyWord of keyWords) {
        if (keyWord.includes(searchWord) || searchWord.includes(keyWord)) {
          matchedWords++;
          break;
        }
      }
    }

    // Bonus pour les marques exactes
    if (searchWords.some(word => ['prince', 'lu', 'nutella', 'oreo'].includes(word))) {
      if (keyWords.some(word => ['prince', 'lu', 'nutella', 'oreo'].includes(word))) {
        matchedWords += 0.5;
      }
    }

    return matchedWords / totalWords;
  }

  /**
   * Recherche par catégorie de produit
   */
  private static searchByCategory(searchTerm: string): {key: string, nutrition: FallbackNutrition} | null {
    const categories = {
      'biscuit': ['prince chocolat', 'petit beurre', 'cookie'],
      'yaourt': ['yaourt nature', 'yaourt aux fruits'],
      'fromage': ['emmental', 'camembert'],
      'viande': ['poulet', 'boeuf'],
      'poisson': ['saumon', 'thon'],
      'céréales': ['cornflakes', 'muesli'],
      'pain': ['pain', 'baguette'],
      'chips': ['chips', 'pringles']
    };

    for (const [category, examples] of Object.entries(categories)) {
      if (searchTerm.includes(category)) {
        const defaultProduct = examples[0];
        if (typeof defaultProduct === 'string') {
          const nutrition = this.NUTRITION_DATABASE[defaultProduct];
          if (nutrition) {
            return { key: defaultProduct, nutrition };
          }
        }
      }
    }

    return null;
  }

  /**
   * Obtenir des valeurs par défaut selon le type de produit
   */
  static getDefaultByProductType(productType: string): FallbackNutrition | null {
    const defaults = {
      'biscuit': this.NUTRITION_DATABASE['prince chocolat'],
      'yaourt': this.NUTRITION_DATABASE['yaourt nature'],
      'fromage': this.NUTRITION_DATABASE['emmental'],
      'pain': this.NUTRITION_DATABASE['pain'],
      'céréales': this.NUTRITION_DATABASE['cornflakes'],
      'chips': this.NUTRITION_DATABASE['chips'],
      'viande': this.NUTRITION_DATABASE['poulet'],
      'poisson': this.NUTRITION_DATABASE['saumon'],
    } as const;

    const key = productType.toLowerCase() as keyof typeof defaults;
    return defaults[key] || null;
  }

  /**
   * Vérifier si une valeur nutritionnelle semble incorrecte (0 ou très faible)
   */
  static needsFallback(protein: number, calories: number): boolean {
    return protein <= 0 || calories <= 0 || (protein < 1 && calories < 50);
  }

  /**
   * Appliquer un fallback intelligent basé sur le contexte
   */
  static applyIntelligentFallback(
    originalResult: any,
    productName: string,
    brand?: string
  ): any {
    // Si les valeurs semblent correctes, ne pas appliquer de fallback
    if (!this.needsFallback(originalResult.protein || 0, originalResult.calories || 0)) {
      return originalResult;
    }

    console.log(`🔄 Application fallback intelligent pour: ${productName}`);
    
    const fallback = this.searchFallback(productName, brand);
    if (!fallback) {
      console.log(`⚠️ Aucun fallback disponible pour: ${productName}`);
      return originalResult;
    }

    // Appliquer les valeurs de fallback avec une confiance réduite
    const result = {
      ...originalResult,
      protein: fallback.protein,
      calories: fallback.calories,
      carbs: fallback.carbs,
      fat: fallback.fat,
      fiber: fallback.fiber,
      confidence: Math.min(originalResult.confidence || 0.5, fallback.confidence - 0.1),
      explanation: `${originalResult.explanation || ''} [Valeurs basées sur données nutritionnelles de référence: ${fallback.source}]`,
      dataSource: 'FALLBACK_DATABASE',
      notes: `Valeurs de fallback appliquées depuis ${fallback.source}. ${originalResult.notes || ''}`
    };

    console.log(`✅ Fallback appliqué: ${fallback.protein}g protéines, ${fallback.calories} calories`);
    return result;
  }
}