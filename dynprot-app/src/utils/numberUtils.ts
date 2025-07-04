/**
 * Utilities pour les calculs numériques sécurisés
 * Évite les bugs de concaténation de chaînes dans les additions
 */

/**
 * Convertit une valeur en nombre de manière sécurisée
 * @param value - Valeur à convertir (string, number, null, undefined)
 * @param defaultValue - Valeur par défaut si la conversion échoue
 * @returns Nombre valide ou valeur par défaut
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  // Si c'est déjà un nombre valide
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  
  // Si c'est une chaîne, essayer de la convertir
  if (typeof value === 'string') {
    const parsed = parseFloat(value.trim());
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  
  // Retourner la valeur par défaut pour null, undefined, NaN, etc.
  return defaultValue;
}

/**
 * Addition sécurisée qui évite la concaténation de chaînes
 * @param values - Valeurs à additionner
 * @returns Somme des valeurs numériques
 */
export function safeSum(...values: any[]): number {
  return values.reduce((sum, value) => sum + safeNumber(value, 0), 0);
}

/**
 * Addition sécurisée pour une liste de valeurs
 * @param values - Array de valeurs à additionner
 * @returns Somme des valeurs numériques
 */
export function safeSumArray(values: any[]): number {
  return values.reduce((sum, value) => sum + safeNumber(value, 0), 0);
}

/**
 * Calcule la moyenne de manière sécurisée
 * @param values - Valeurs pour calculer la moyenne
 * @returns Moyenne ou 0 si aucune valeur valide
 */
export function safeAverage(...values: any[]): number {
  const numbers = values.map(v => safeNumber(v, 0)).filter(n => n !== 0);
  return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
}

/**
 * Calcule la moyenne d'un array de manière sécurisée
 * @param values - Array de valeurs pour calculer la moyenne
 * @returns Moyenne ou 0 si aucune valeur valide
 */
export function safeAverageArray(values: any[]): number {
  const numbers = values.map(v => safeNumber(v, 0)).filter(n => n !== 0);
  return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
}

/**
 * Valide qu'une valeur est un nombre positif
 * @param value - Valeur à valider
 * @param allowZero - Autoriser 0 comme valeur valide
 * @returns true si la valeur est un nombre positif (ou 0 si autorisé)
 */
export function isPositiveNumber(value: any, allowZero: boolean = true): boolean {
  const num = safeNumber(value, -1);
  return allowZero ? num >= 0 : num > 0;
}

/**
 * Arrondit un nombre à un nombre de décimales spécifié
 * @param value - Valeur à arrondir
 * @param decimals - Nombre de décimales (défaut: 1)
 * @returns Nombre arrondi
 */
export function safeRound(value: any, decimals: number = 1): number {
  const num = safeNumber(value, 0);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Type guard pour vérifier qu'une valeur est un nombre valide
 * @param value - Valeur à vérifier
 * @returns true si c'est un nombre valide
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Convertit les propriétés numériques d'un objet de manière sécurisée
 * @param obj - Objet contenant des propriétés numériques
 * @param numericKeys - Clés qui doivent être converties en nombres
 * @returns Objet avec les propriétés numériques converties
 */
export function sanitizeNumericObject<T extends Record<string, any>>(
  obj: T, 
  numericKeys: (keyof T)[]
): T {
  const result = { ...obj };
  
  numericKeys.forEach(key => {
    if (key in result) {
      result[key] = safeNumber(result[key], 0) as T[typeof key];
    }
  });
  
  return result;
}

/**
 * Applique safeNumber à toutes les propriétés protein et calories d'un objet meal
 * @param meal - Objet repas avec propriétés nutritionnelles
 * @returns Objet repas avec valeurs numériques sécurisées
 */
export function sanitizeMealNutrition<T extends { protein?: any; calories?: any }>(meal: T): T {
  return {
    ...meal,
    protein: safeNumber(meal.protein, 0),
    calories: meal.calories !== null && meal.calories !== undefined 
      ? safeNumber(meal.calories, 0) 
      : meal.calories
  };
}

/**
 * Log d'avertissement quand une valeur attendue comme numérique est une chaîne
 * @param value - Valeur problématique
 * @param context - Contexte où le problème survient
 */
export function warnStringAsNumber(value: any, context: string): void {
  if (typeof value === 'string' && !isNaN(parseFloat(value))) {
    console.warn(`[NumberUtils] String détectée comme nombre dans ${context}:`, value);
  }
}

/**
 * Convertit une date en Date valide de manière sécurisée
 * @param value - Valeur de date (string, Date, timestamp)
 * @param defaultValue - Date par défaut si la conversion échoue
 * @returns Date valide ou date par défaut
 */
export function safeDate(value: any, defaultValue: Date = new Date()): Date {
  // Si c'est déjà une Date valide
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  
  // Si c'est null, undefined ou chaîne vide
  if (!value || value === '') {
    return defaultValue;
  }
  
  try {
    // Essayer de parser la date
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (error) {
    // Ignorer les erreurs de parsing
  }
  
  // Retourner la date par défaut
  return defaultValue;
}

/**
 * Vérifie si une valeur est une date valide
 * @param value - Valeur à vérifier
 * @returns true si c'est une date valide
 */
export function isValidDate(value: any): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}