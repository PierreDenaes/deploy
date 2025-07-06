/**
 * Gets an array of the last seven dates
 */
export function getLastSevenDays(): Date[] {
  const dates = [];
  const today = new Date();
  
  // Add today and the past 6 days to the array
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push(date);
  }
  
  return dates;
}

/**
 * Formats a date as MM/DD
 */
export function formatDate(date: Date): string {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * Formats a date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Gets the time of day based on hour
 */
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Gets an array of dates for the last N weeks
 */
export function getLastNWeeks(n: number): Date[][] {
  const weeks = [];
  const today = new Date();
  
  for (let weekIndex = 0; weekIndex < n; weekIndex++) {
    const week = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (today.getDay() + weekIndex * 7));
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + dayIndex);
      week.push(day);
    }
    weeks.unshift(week); // Add most recent week first
  }
  
  return weeks;
}

/**
 * Gets an array of dates for the last N months
 */
export function getLastNMonths(n: number): Date[][] {
  const months = [];
  const today = new Date();
  
  for (let monthIndex = 0; monthIndex < n; monthIndex++) {
    const month = [];
    const startOfMonth = new Date(today.getFullYear(), today.getMonth() - monthIndex, 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() - monthIndex + 1, 0);
    
    for (let day = startOfMonth.getDate(); day <= endOfMonth.getDate(); day++) {
      const date = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day);
      month.push(date);
    }
    months.unshift(month); // Add most recent month first
  }
  
  return months;
}

/**
 * Gets start and end dates for the last N weeks
 */
export function getWeekRanges(n: number): Array<{ start: Date; end: Date; label: string }> {
  const ranges = [];
  const today = new Date();
  
  for (let weekIndex = 0; weekIndex < n; weekIndex++) {
    const startOfWeek = new Date(today);
    // Calculate days to go back to Monday (1 = Monday in French calendar)
    const dayOfWeek = today.getDay();
    const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Sunday = 0, so 6 days back to Monday
    startOfWeek.setDate(today.getDate() - daysToMonday - (weekIndex * 7));
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const label = weekIndex === 0 ? 'Cette semaine' : 
                  weekIndex === 1 ? 'Semaine dernière' : 
                  `Il y a ${weekIndex} semaines`;
    
    ranges.unshift({ start: startOfWeek, end: endOfWeek, label });
  }
  
  return ranges;
}

/**
 * Gets start and end dates for the last N months
 */
export function getMonthRanges(n: number): Array<{ start: Date; end: Date; label: string }> {
  const ranges = [];
  const today = new Date();
  
  for (let monthIndex = 0; monthIndex < n; monthIndex++) {
    const start = new Date(today.getFullYear(), today.getMonth() - monthIndex, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - monthIndex + 1, 0);
    
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    const label = monthIndex === 0 ? 'Ce mois' : 
                  monthIndex === 1 ? 'Mois dernier' : 
                  `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    
    ranges.unshift({ start, end, label });
  }
  
  return ranges;
}

/**
 * Check if a date is within a date range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * Format date range for display (French format: DD/MM)
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = `${start.getDate()}/${start.getMonth() + 1}`;
  const endStr = `${end.getDate()}/${end.getMonth() + 1}`;
  return `${startStr} - ${endStr}`;
}