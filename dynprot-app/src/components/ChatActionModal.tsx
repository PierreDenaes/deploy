import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Mic, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChatInputType } from '@/types/chat';

interface ChatActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ChatInputType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const getActionIcon = (actionType: ChatInputType) => {
  switch (actionType) {
    case 'photo': return <Camera className="w-5 h-5" />;
    case 'voice': return <Mic className="w-5 h-5" />;
    case 'scan': return <Scan className="w-5 h-5" />;
    default: return null;
  }
};

const getActionTitle = (actionType: ChatInputType) => {
  switch (actionType) {
    case 'photo': return 'Prendre une photo';
    case 'voice': return 'Enregistrement vocal';
    case 'scan': return 'Scanner un produit';
    default: return 'Action';
  }
};

const getActionColor = (actionType: ChatInputType) => {
  switch (actionType) {
    case 'photo': return 'text-blue-500';
    case 'voice': return 'text-green-500';
    case 'scan': return 'text-primary';
    default: return 'text-gray-500';
  }
};

export const ChatActionModal: React.FC<ChatActionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  title,
  children,
  className
}) => {
  const modalTitle = title || getActionTitle(actionType);
  const iconColor = getActionColor(actionType);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className={cn(
              "w-full max-w-lg max-h-[90vh] overflow-hidden",
              className
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex-shrink-0", iconColor)}>
                    {getActionIcon(actionType)}
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {modalTitle}
                  </CardTitle>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="flex-shrink-0 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
                  {children}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatActionModal;