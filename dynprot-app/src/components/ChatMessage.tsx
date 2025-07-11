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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] gap-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <motion.div 
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-ios",
            isUser 
              ? "bg-gradient-to-br from-primary to-primary/80" 
              : "bg-gradient-to-br from-muted to-muted/60"
          )}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          {isUser ? (
            <User className="w-6 h-6 text-white" strokeWidth={2.5} />
          ) : (
            <Bot className="w-6 h-6 text-foreground" strokeWidth={2.5} />
          )}
        </motion.div>

        {/* Message Content */}
        <div className={cn(
          "flex flex-col",
          isUser ? "items-end" : "items-start"
        )}>
          {/* Message Bubble */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Card className={cn(
              "relative border-0 shadow-ios backdrop-blur-xl",
              isUser 
                ? "bg-gradient-to-br from-primary to-primary/90 text-white" 
                : "bg-card/95 border border-border/20"
            )}>
            <CardContent className="p-5">
              {/* Attachment indicator */}
              {hasAttachment && (
                <motion.div 
                  className={cn(
                    "flex items-center gap-3 mb-3 p-2 rounded-xl",
                    isUser ? "bg-white/10 text-white/90" : "bg-muted/50 text-muted-foreground"
                  )}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {getAttachmentIcon(hasAttachment.type)}
                  <span className="capitalize text-base font-medium">{hasAttachment.type}</span>
                </motion.div>
              )}

              {/* Message text */}
              <div className="text-lg leading-relaxed font-medium">
                {message.content}
              </div>

              {/* Analysis Results */}
              {hasAnalysis && (
                <motion.div 
                  className="mt-4 p-5 bg-muted/30 backdrop-blur-xl rounded-2xl border border-border/20 shadow-ios-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-ios-green" strokeWidth={2.5} />
                    <span className="font-bold text-foreground text-lg">
                      {message.data!.analysis!.description}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <motion.div 
                      className="text-center p-3 bg-primary/10 rounded-xl border border-primary/20"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-2xl font-bold text-primary block">
                        {message.data!.analysis!.protein}g
                      </span>
                      <span className="text-base text-muted-foreground font-medium">protéines</span>
                    </motion.div>
                    <motion.div 
                      className="text-center p-3 bg-ios-green/10 rounded-xl border border-ios-green/20"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-2xl font-bold text-ios-green block">
                        {message.data!.analysis!.calories}
                      </span>
                      <span className="text-base text-muted-foreground font-medium">calories</span>
                    </motion.div>
                  </div>

                  {message.data!.analysis!.confidence && (
                    <div className="mt-4 flex justify-center">
                      <Badge variant="secondary" className="px-4 py-2 rounded-xl bg-accent/10 text-accent border-accent/20 text-base font-semibold">
                        {Math.round(message.data!.analysis!.confidence * 100)}% confiance
                      </Badge>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Quantity Suggestions */}
              {hasSuggestions && (
                <motion.div 
                  className="mt-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-lg font-semibold text-foreground mb-4">
                    Quelle quantité ?
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {message.data!.suggestions!.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Button
                          variant={suggestion.isDefault ? "ios" : "outline"}
                          size="lg"
                          onClick={() => onSuggestionClick?.(suggestion)}
                          className="text-base font-semibold px-6 py-3 rounded-2xl shadow-ios"
                        >
                          {suggestion.label}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              {hasActions && (
                <motion.div 
                  className="mt-5 flex flex-wrap gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {message.data!.actions!.map((action, index) => (
                    <motion.div
                      key={action.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Button
                        variant={action.variant === 'primary' ? 'ios' : 'outline'}
                        size="lg"
                        onClick={() => onActionClick?.(action)}
                        className="text-base font-semibold px-6 py-3 rounded-2xl shadow-ios"
                      >
                        {action.label}
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
            </Card>
          </motion.div>

          {/* Timestamp */}
          <motion.div 
            className="text-sm text-muted-foreground mt-2 px-2 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {formatTime(message.timestamp)}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;