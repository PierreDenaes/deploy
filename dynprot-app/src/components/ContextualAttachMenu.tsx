import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, Scan, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AttachmentType = 'photo' | 'voice' | 'scan';

interface AttachmentAction {
  type: AttachmentType;
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

interface ContextualAttachMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: AttachmentType) => void;
  disabled?: boolean;
  className?: string;
}

const attachmentActions: AttachmentAction[] = [
  {
    type: 'photo',
    icon: Camera,
    label: 'Photo',
    description: 'Prendre une photo du repas',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    type: 'voice',
    icon: Mic,
    label: 'Voix',
    description: 'Décrire à la voix',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100'
  },
  {
    type: 'scan',
    icon: Scan,
    label: 'Scanner',
    description: 'Scanner un code-barres',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100'
  }
];

export const ContextualAttachMenu: React.FC<ContextualAttachMenuProps> = ({
  isOpen,
  onClose,
  onSelect,
  disabled = false,
  className
}) => {
  const handleSelect = (type: AttachmentType) => {
    if (!disabled) {
      onSelect(type);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "absolute bottom-full left-0 mb-3 z-50",
          className
        )}
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800">Ajouter un élément</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-6 h-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {attachmentActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.type}
                  variant="ghost"
                  onClick={() => handleSelect(action.type)}
                  disabled={disabled}
                  className={cn(
                    "w-full h-auto p-3 flex items-center gap-3 justify-start rounded-xl transition-all",
                    action.bgColor,
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    action.color.replace('text-', 'bg-').replace('-600', '-100'),
                    action.color
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800 text-sm">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {action.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Tip */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Vous pouvez aussi utiliser le bouton micro pour parler directement
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ContextualAttachMenu;