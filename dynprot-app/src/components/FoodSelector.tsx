import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ScanResultItem {
  id: string;
  name: string;
  protein: number;
  calories?: number;
  confidence: number;
}

interface FoodSelectorProps {
  isLoading: boolean;
  results: ScanResultItem[] | null;
  selectedResult: ScanResultItem | null;
  onSelectResult: (result: ScanResultItem) => void;
  onConfirm: () => void;
  onRescan: () => void;
  error?: string | null;
}

export const FoodSelector: React.FC<FoodSelectorProps> = ({
  isLoading,
  results,
  selectedResult,
  onSelectResult,
  onConfirm,
  onRescan,
  error
}) => {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <Loader2 className="h-10 w-10 text-primary" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Identifying your food...
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Our AI is analyzing the image to identify specific food items
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Food Identification Failed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {error}
              </p>
              <Button onClick={onRescan} className="mt-2">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              We identified these foods:
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select the item that best matches your meal
            </p>
          </div>
          
          <div className="space-y-3">
            <AnimatePresence>
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                >
                  <button
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedResult?.id === result.id
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-sm'
                    }`}
                    onClick={() => onSelectResult(result)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {result.name}
                          </h4>
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
                            {Math.round(result.confidence * 100)}% match
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary">
                              {result.protein}g
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Protein
                            </p>
                          </div>
                          {result.calories && (
                            <div className="text-center">
                              <p className="text-lg font-bold text-primary">
                                {result.calories}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Calories
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedResult?.id === result.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <CheckCircle className="h-6 w-6 text-primary" />
                        </motion.div>
                      )}
                    </div>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
        
        <CardFooter className="p-6 pt-0">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onRescan}
              className="flex-1"
            >
              Retake Photo
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
              disabled={!selectedResult}
            >
              Confirm Selection
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default FoodSelector;