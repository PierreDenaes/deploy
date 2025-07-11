import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { getLastSevenDays, formatDate } from "@/lib/dateUtils";
import { safeNumber, safeDate } from "../utils/numberUtils";

interface WeeklyTrendChartProps {
  className?: string;
  showProtein?: boolean;
  showCalories?: boolean;
}

export function WeeklyTrendChart({
  className,
  showProtein = true,
  showCalories = true,
}: WeeklyTrendChartProps) {
  const { state, userSettings } = useAppContext();

  const weeklyData = useMemo(() => {
    const meals = state?.meals ?? [];
    const last7Days = getLastSevenDays();
    
    // Initialize data structure for the last 7 days
    const dailyData = last7Days.map((date) => ({
      date: formatDate(date),
      fullDate: date,
      protein: 0,
      calories: 0,
      proteinGoal: userSettings?.proteinGoal || 120,
      calorieGoal: userSettings?.calorieGoal || 2000,
    }));

    // Group and sum meal data by date
    meals.forEach((meal) => {
      const mealDate = safeDate(meal.timestamp);
      const dateStr = formatDate(mealDate);
      
      const dayData = dailyData.find((day) => day.date === dateStr);
      if (dayData) {
        dayData.protein += safeNumber(meal.protein, 0);
        dayData.calories += safeNumber(meal.calories, 0);
      }
    });

    return dailyData;
  }, [state?.meals, userSettings]);

  const isDarkMode = state?.preferences?.darkMode ?? false;
  const axisColor = isDarkMode ? "#A0A0A0" : "#6B7280"; // Gray-400 / Gray-500
  const gridColor = isDarkMode ? "#4B5563" : "#E5E7EB"; // Gray-600 / Gray-200
  const proteinColor = isDarkMode ? "#0a84ff" : "#007aff"; // iOS Blue Dark / iOS Blue
  const caloriesColor = isDarkMode ? "#30d158" : "#34c759"; // iOS Green Dark / iOS Green

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Évolution hebdomadaire</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: axisColor }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: axisColor }}
                width={30}
              />
              <Tooltip 
                labelFormatter={(value) => `Date: ${value}`} 
                formatter={(value, name) => {
                  if (name === "protein") return [`${value}g`, "Protein"];
                  if (name === "calories") return [`${value} cal`, "Calories"];
                  if (name === "proteinGoal") return [`${value}g`, "Protein Goal"];
                  if (name === "calorieGoal") return [`${value} cal`, "Calorie Goal"];
                  return [value, name];
                }}
                contentStyle={{
                  backgroundColor: isDarkMode ? "#374151" : "#FFFFFF", // Gray-700 / White
                  borderColor: isDarkMode ? "#4B5563" : "#E5E7EB", // Gray-600 / Gray-200
                  color: isDarkMode ? "#F9FAFB" : "#111827", // Gray-50 / Gray-900
                }}
                itemStyle={{
                  color: isDarkMode ? "#F9FAFB" : "#111827", // Gray-50 / Gray-900
                }}
              />
              {showProtein && (
                <>
                  <Line
                    type="monotone"
                    dataKey="protein"
                    stroke={proteinColor}
                    strokeWidth={2}
                    dot={{ r: 4, fill: proteinColor, stroke: proteinColor, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: proteinColor, stroke: proteinColor, strokeWidth: 2 }}
                    name="Protein"
                  />
                  <Line
                    type="monotone"
                    dataKey="proteinGoal"
                    stroke={proteinColor}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Protein Goal"
                  />
                </>
              )}
              {showCalories && (
                <>
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke={caloriesColor}
                    strokeWidth={2}
                    dot={{ r: 4, fill: caloriesColor, stroke: caloriesColor, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: caloriesColor, stroke: caloriesColor, strokeWidth: 2 }}
                    name="Calories"
                  />
                  <Line
                    type="monotone"
                    dataKey="calorieGoal"
                    stroke={caloriesColor}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Calorie Goal"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}