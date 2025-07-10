import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Camera, 
  Mic, 
  Scan, 
  Image,
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import PressToTalkButton from './PressToTalkButton';
import InlineCamera from './InlineCamera';
import InlineBarcodeScanner from './InlineBarcodeScanner';
import { ProductInfo } from '@/services/barcodeService';

type AttachmentMode = 'photo' | 'scan' | null;

interface ChatGPTInputProps {
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

interface AttachmentAction {
  type: 'photo' | 'scan';
  icon: React.ComponentType<any>;
  label: string;
  color: string;
}

const attachmentActions: AttachmentAction[] = [
  { 
    type: 'photo', 
    icon: Camera, 
    label: 'Photo', 
    color: 'text-blue-600 hover:bg-blue-100 hover:text-blue-700' 
  },
  { 
    type: 'scan', 
    icon: Scan, 
    label: 'Scanner', 
    color: 'text-purple-600 hover:bg-purple-100 hover:text-purple-700' 
  }
];

export const ChatGPTInput: React.FC<ChatGPTInputProps> = ({
  value,
  onChange,
  onSend,
  onPhotoCapture,
  onVoiceTranscript,
  onBarcodeDetected,
  isLoading = false,
  disabled = false,
  placeholder = "Message...",
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<AttachmentMode>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasText = value.trim().length > 0;
  const canSend = hasText && !isLoading && !disabled;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (canSend) {
      onSend(value.trim());
      onChange('');
    }
  }, [canSend, onSend, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleAttachmentClick = useCallback((type: AttachmentMode) => {
    setActiveAttachment(type);
  }, []);

  const handleCloseAttachment = useCallback(() => {
    setActiveAttachment(null);
  }, []);

  const handlePhotoComplete = useCallback((imageSrc: string) => {
    onPhotoCapture(imageSrc);
    setActiveAttachment(null);
  }, [onPhotoCapture]);

  const handleBarcodeComplete = useCallback((product: ProductInfo) => {
    onBarcodeDetected(product);
    setActiveAttachment(null);
  }, [onBarcodeDetected]);

  const handleVoiceComplete = useCallback((transcript: string) => {
    onVoiceTranscript(transcript);
  }, [onVoiceTranscript]);

  const handleSendOrVoice = useCallback(() => {
    if (hasText) {
      handleSubmit();
    }
  }, [hasText, handleSubmit]);

  return (
    <div className={cn("relative", className)}>
      {/* Attachment Components - Expanded above input */}
      <AnimatePresence>
        {activeAttachment === 'photo' && (
          <InlineCamera
            isActive={true}
            onCapture={handlePhotoComplete}
            onCancel={handleCloseAttachment}
          />
        )}
        {activeAttachment === 'scan' && (
          <InlineBarcodeScanner
            isActive={true}
            onDetected={handleBarcodeComplete}
            onCancel={handleCloseAttachment}
          />
        )}
      </AnimatePresence>


      {/* Main Input Container - iOS Style */}
      <div className={cn(
        "flex items-end gap-3 p-4 bg-white/95 backdrop-blur-xl rounded-3xl border border-gray-200/80 transition-all duration-300 shadow-lg shadow-black/5",
        isFocused && "border-blue-400/60 shadow-blue-500/20 shadow-xl bg-white",
        activeAttachment && "border-t-0 rounded-t-none",
        disabled && "opacity-50"
      )}>
        {/* Direct Action Buttons - iOS Style */}
        <div className="flex items-center gap-2">
          {attachmentActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.type}
                onClick={() => handleAttachmentClick(action.type)}
                disabled={disabled || !!activeAttachment}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                  "bg-gray-100/80 hover:bg-gray-200/80 active:scale-95 active:bg-gray-300/80",
                  action.type === 'photo' && "text-blue-600",
                  action.type === 'scan' && "text-purple-600",
                  (disabled || activeAttachment) && "opacity-40 cursor-not-allowed"
                )}
                title={action.label}
              >
                <Icon className="w-5 h-5" strokeWidth={2.5} />
              </button>
            );
          })}
        </div>

        {/* Text Input - iOS Style */}
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={activeAttachment ? `Mode ${activeAttachment} actif...` : placeholder}
            disabled={disabled || !!activeAttachment}
            className={cn(
              "min-h-[20px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-[16px] leading-5",
              "focus:ring-0 focus:border-0 placeholder:text-gray-400/80 text-gray-900",
              "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
              "font-medium tracking-tight",
              (disabled || activeAttachment) && "cursor-not-allowed"
            )}
            rows={1}
          />
        </div>

        {/* Voice/Send Button - Updated for iOS Style */}
        <div className="flex-shrink-0">
          <PressToTalkButton
            onTranscript={handleVoiceComplete}
            disabled={disabled || !!activeAttachment}
            hasText={hasText}
            onSend={handleSendOrVoice}
          />
        </div>
      </div>

      {/* Character count for longer messages - iOS Style */}
      {value.length > 100 && (
        <div className="absolute bottom-3 right-14 text-xs text-gray-400/70 pointer-events-none font-medium">
          {value.length}/500
        </div>
      )}
    </div>
  );
};

export default ChatGPTInput;