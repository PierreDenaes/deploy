import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, CheckCircle, Clock, Camera, Mic, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType, QuantitySuggestion, ChatAction } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  onSuggestionClick?: (suggestion: QuantitySuggestion) => void;
  onActionClick?: (action: ChatAction) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onSuggestionClick,
  onActionClick
}) => {
  const isUser = message.type === 'user';
  const hasAnalysis = message.data?.analysis;
  const hasSuggestions = message.data?.suggestions && message.data.suggestions.length > 0;
  const hasActions = message.data?.actions && message.data.actions.length > 0;
  const hasAttachment = message.data?.attachments;

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  const getAttachmentIcon = (type?: string) => {
    switch (type) {
      case 'photo': return <Camera className="w-4 h-4" />;
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'scan': return <Scan className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[80%] gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-500" : "bg-gray-200"
        )}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-gray-600" />
          )}
        </div>

        {/* Message Content */}
        <div className={cn(
          "flex flex-col",
          isUser ? "items-end" : "items-start"
        )}>
          {/* Message Bubble */}
          <Card className={cn(
            "relative",
            isUser 
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white border-gray-200"
          )}>
            <CardContent className="p-3">
              {/* Attachment indicator */}
              {hasAttachment && (
                <div className={cn(
                  "flex items-center gap-2 mb-2 text-sm",
                  isUser ? "text-blue-100" : "text-gray-500"
                )}>
                  {getAttachmentIcon(hasAttachment.type)}
                  <span className="capitalize">{hasAttachment.type}</span>
                </div>
              )}

              {/* Message text */}
              <div className="text-sm leading-relaxed">
                {message.content}
              </div>

              {/* Analysis Results */}
              {hasAnalysis && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-gray-900">
                      {message.data!.analysis!.description}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-600">
                        {message.data!.analysis!.protein}g
                      </span>
                      <span className="text-gray-600 ml-1">protéines</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">
                        {message.data!.analysis!.calories}
                      </span>
                      <span className="text-gray-600 ml-1">calories</span>
                    </div>
                  </div>

                  {message.data!.analysis!.confidence && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(message.data!.analysis!.confidence * 100)}% confiance
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity Suggestions */}
              {hasSuggestions && (
                <div className="mt-3">
                  <div className="text-sm text-gray-600 mb-2">
                    Quelle quantité ?
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.data!.suggestions!.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant={suggestion.isDefault ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSuggestionClick?.(suggestion)}
                        className="text-xs"
                      >
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {hasActions && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.data!.actions!.map((action) => (
                    <Button
                      key={action.id}
                      variant={action.variant === 'primary' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onActionClick?.(action)}
                      className="text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 mt-1 px-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;