import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Camera, 
  Mic, 
  Scan, 
  Save, 
  Loader2, 
  X,
  Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ChatInputType, ChatInputAction } from '@/types/chat';
import InlineCamera from './InlineCamera';
import InlineVoiceRecorder from './InlineVoiceRecorder';
import InlineBarcodeScanner from './InlineBarcodeScanner';
import { ProductInfo } from '@/services/barcodeService';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  onPhotoCapture: (imageSrc: string) => void;
  onVoiceTranscript: (transcript: string) => void;
  onBarcodeDetected: (product: ProductInfo) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const defaultActions: ChatInputAction[] = [
  { type: 'photo', icon: 'Camera', label: 'Photo', primary: false },
  { type: 'voice', icon: 'Mic', label: 'Voix', primary: false },
  { type: 'scan', icon: 'Scan', label: 'Scanner', primary: false },
  { type: 'text', icon: 'Save', label: 'Sauvegarder', primary: false }
];

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onPhotoCapture,
  onVoiceTranscript,
  onBarcodeDetected,
  isLoading = false,
  disabled = false,
  placeholder = "Décrivez votre repas...",
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [activeMode, setActiveMode] = useState<ChatInputType | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading && !disabled) {
      onSend(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleActionClick = (actionType: ChatInputType) => {
    if (actionType === 'photo' || actionType === 'voice' || actionType === 'scan') {
      setActiveMode(actionType);
      setShowActions(false);
    }
  };

  const handleCloseActiveMode = () => {
    setActiveMode(null);
  };

  const handlePhotoComplete = (imageSrc: string) => {
    onPhotoCapture(imageSrc);
    setActiveMode(null);
  };

  const handleVoiceComplete = (transcript: string) => {
    onVoiceTranscript(transcript);
    setActiveMode(null);
  };

  const handleBarcodeComplete = (product: ProductInfo) => {
    onBarcodeDetected(product);
    setActiveMode(null);
  };

  const getActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Camera': return <Camera className="w-4 h-4" />;
      case 'Mic': return <Mic className="w-4 h-4" />;
      case 'Scan': return <Scan className="w-4 h-4" />;
      case 'Save': return <Save className="w-4 h-4" />;
      default: return null;
    }
  };

  const canSend = value.trim().length > 0 && !isLoading && !disabled;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      {/* Inline Components - Expanded above input */}
      <AnimatePresence>
        {activeMode === 'photo' && (
          <InlineCamera
            isActive={true}
            onCapture={handlePhotoComplete}
            onCancel={handleCloseActiveMode}
          />
        )}
        {activeMode === 'voice' && (
          <InlineVoiceRecorder
            isActive={true}
            onRecordingComplete={handleVoiceComplete}
            onCancel={handleCloseActiveMode}
          />
        )}
        {activeMode === 'scan' && (
          <InlineBarcodeScanner
            isActive={true}
            onDetected={handleBarcodeComplete}
            onCancel={handleCloseActiveMode}
          />
        )}
      </AnimatePresence>

      {/* Actions Panel */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2"
          >
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Actions</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActions(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {defaultActions.slice(0, 3).map((action) => (
                  <Button
                    key={action.type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleActionClick(action.type)}
                    className="flex items-center gap-2 justify-start h-auto py-2"
                  >
                    {getActionIcon(action.icon)}
                    <span className="text-sm">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Container */}
      <div className={cn(
        "relative flex items-end gap-2 p-4 bg-white border-t border-gray-200",
        isFocused && "border-blue-500/20 bg-blue-50/30",
        activeMode && "border-t-0" // Remove top border when expanded
      )}>
        {/* Actions Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowActions(!showActions)}
          className={cn(
            "flex-shrink-0 w-10 h-10 p-0 border-gray-300",
            showActions && "bg-gray-100 border-gray-400"
          )}
          disabled={disabled || !!activeMode}
        >
          <Plus className={cn(
            "w-4 h-4 transition-transform",
            showActions && "rotate-45"
          )} />
        </Button>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleActionClick('photo')}
            className={cn(
              "w-8 h-8 p-0 text-gray-500 hover:text-blue-500",
              activeMode === 'photo' && "bg-blue-100 text-blue-600"
            )}
            disabled={disabled || !!activeMode}
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleActionClick('voice')}
            className={cn(
              "w-8 h-8 p-0 text-gray-500 hover:text-green-500",
              activeMode === 'voice' && "bg-green-100 text-green-600"
            )}
            disabled={disabled || !!activeMode}
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleActionClick('scan')}
            className={cn(
              "w-8 h-8 p-0 text-gray-500 hover:text-purple-500",
              activeMode === 'scan' && "bg-purple-100 text-purple-600"
            )}
            disabled={disabled || !!activeMode}
          >
            <Scan className="w-4 h-4" />
          </Button>
        </div>

        {/* Text Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={activeMode ? `Mode ${activeMode} actif...` : placeholder}
              disabled={disabled || !!activeMode}
              className={cn(
                "min-h-[40px] max-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20",
                (disabled || activeMode) && "opacity-50 cursor-not-allowed"
              )}
              rows={1}
            />
            
            {/* Character count for longer messages */}
            {value.length > 100 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {value.length}/500
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!canSend}
            className={cn(
              "flex-shrink-0 w-10 h-10 p-0 transition-all",
              canSend 
                ? "bg-blue-500 hover:bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;