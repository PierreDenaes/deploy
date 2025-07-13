import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { useTimeContext } from '@/hooks/useTimeContext';
import ChatMessage from './ChatMessage';
import ChatGPTInput from './ChatGPTInput';
import ChatProcessor from '@/services/ChatProcessor';
import { ProductInfo } from '@/services/barcodeService';
import { 
  ChatMessage as ChatMessageType, 
  ChatState, 
  ChatInputType, 
  QuantitySuggestion,
  ChatAction,
  ConversationContext 
} from '@/types/chat';

const initialState: ChatState = {
  messages: [],
  currentInput: '',
  isLoading: false,
  awaitingQuantity: false,
  currentAnalysis: null,
  conversationContext: {}
};

interface UnifiedMealChatProps {
  className?: string;
}

export const UnifiedMealChat: React.FC<UnifiedMealChatProps> = ({ className }) => {
  const navigate = useNavigate();
  const { state: appState, addMeal } = useAppContext();
  const timeContext = useTimeContext(appState.user.name);
  const [state, setState] = useState<ChatState>(initialState);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatProcessor = useRef(ChatProcessor.getInstance());

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  // Mise à jour de l'état
  const updateState = useCallback((updates: Partial<ChatState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Ajout d'un message
  const addMessage = useCallback((message: Omit<ChatMessageType, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessageType = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));

    return newMessage;
  }, []);

  // Gestion des messages utilisateur
  const handleUserMessage = useCallback(async (content: string) => {
    // Ajouter le message utilisateur
    addMessage({
      type: 'user',
      content
    });

    // Réinitialiser l'input
    updateState({ currentInput: '', isLoading: true });

    try {
      // Utiliser le ChatProcessor pour analyser le contenu
      const response = await chatProcessor.current.processInput(
        content,
        'text',
        state.conversationContext
      );
      
      // Ajouter la réponse du bot
      addMessage({
        type: 'bot',
        content: response.message,
        data: response.data
      });

      // Mettre à jour le contexte
      updateState({
        isLoading: false,
        awaitingQuantity: response.awaitingQuantity,
        currentAnalysis: response.analysis,
        conversationContext: {
          ...state.conversationContext,
          ...response.updateContext
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      
      addMessage({
        type: 'bot',
        content: "Désolé, je n'ai pas pu analyser votre repas. Pouvez-vous réessayer ?",
        data: {
          actions: [
            { id: 'retry', label: 'Réessayer', type: 'retry', variant: 'primary' }
          ]
        }
      });

      updateState({ isLoading: false });
    }
  }, [addMessage, updateState, state.conversationContext]);

  // Direct handlers for inline components - no more modals needed

  // Gestion de la capture photo
  const handlePhotoCapture = useCallback(async (imageSrc: string) => {
    // Ajouter le message utilisateur avec photo
    addMessage({
      type: 'user',
      content: "📷 Photo prise",
      data: {
        attachments: { type: 'photo' }
      }
    });

    updateState({ isLoading: true });

    try {
      const response = await chatProcessor.current.processInput(
        '',
        'photo',
        state.conversationContext,
        { photo: imageSrc }
      );

      // Ajouter la réponse du bot
      addMessage({
        type: 'bot',
        content: response.message,
        data: response.data
      });

      // Mettre à jour le contexte
      updateState({
        isLoading: false,
        awaitingQuantity: response.awaitingQuantity,
        currentAnalysis: response.analysis,
        conversationContext: {
          ...state.conversationContext,
          ...response.updateContext
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'analyse photo:', error);
      
      addMessage({
        type: 'bot',
        content: "Désolé, je n'ai pas pu analyser cette photo. Pouvez-vous réessayer ?",
        data: {
          actions: [
            { id: 'retry-photo', label: 'Reprendre une photo', type: 'retry' }
          ]
        }
      });

      updateState({ isLoading: false });
    }
  }, [addMessage, updateState, state.conversationContext]);

  // Gestion de la transcription vocale
  const handleVoiceTranscript = useCallback(async (transcript: string) => {
    // Ajouter le message utilisateur avec transcription
    addMessage({
      type: 'user',
      content: transcript,
      data: {
        attachments: { type: 'voice' }
      }
    });

    updateState({ isLoading: true });

    try {
      const response = await chatProcessor.current.processInput(
        transcript,
        'voice',
        state.conversationContext
      );

      // Ajouter la réponse du bot
      addMessage({
        type: 'bot',
        content: response.message,
        data: response.data
      });

      // Mettre à jour le contexte
      updateState({
        isLoading: false,
        awaitingQuantity: response.awaitingQuantity,
        currentAnalysis: response.analysis,
        conversationContext: {
          ...state.conversationContext,
          ...response.updateContext
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'analyse vocale:', error);
      
      addMessage({
        type: 'bot',
        content: "Désolé, je n'ai pas pu analyser votre description vocale. Pouvez-vous réessayer ?",
        data: {
          actions: [
            { id: 'retry-voice', label: 'Réenregistrer', type: 'retry' }
          ]
        }
      });

      updateState({ isLoading: false });
    }
  }, [addMessage, updateState, state.conversationContext]);

  // Gestionnaire pour la détection de code-barres
  const handleBarcodeDetected = useCallback(async (product: ProductInfo) => {
    try {
      // Ajouter le message utilisateur
      addMessage({
        type: 'user',
        content: `📱 Code-barres scanné : ${product.name}${product.brand ? ` (${product.brand})` : ''}`,
        data: {
          attachments: { type: 'scan' }
        }
      });

      updateState({ isLoading: true });

      // Utiliser le ChatProcessor pour traiter le produit scanné
      const response = await chatProcessor.current.processInput(
        '',
        'scan',
        state.conversationContext,
        { productData: product }
      );

      // Ajouter la réponse du bot
      addMessage({
        type: 'bot',
        content: response.message,
        data: response.data
      });

      // Mettre à jour le contexte
      updateState({
        isLoading: false,
        awaitingQuantity: response.awaitingQuantity,
        currentAnalysis: response.analysis,
        conversationContext: {
          ...state.conversationContext,
          ...response.updateContext
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'analyse du produit scanné:', error);
      
      addMessage({
        type: 'bot',
        content: "Désolé, je n'ai pas pu analyser ce produit. Pouvez-vous réessayer ?",
        data: {
          actions: [
            { id: 'retry-scan', label: 'Scanner à nouveau', type: 'retry' }
          ]
        }
      });

      updateState({ isLoading: false });
    }
  }, [addMessage, updateState, state.conversationContext]);

  // Utility functions removed - no longer needed with inline components

  // Sauvegarde du repas
  const handleSaveMeal = useCallback(async () => {
    const lastAnalysis = state.currentAnalysis;
    
    if (!lastAnalysis) {
      toast.error('Aucune analyse de repas à sauvegarder');
      return;
    }

    try {
      updateState({ isLoading: true });

      const mealData = {
        description: lastAnalysis.description || 'Repas analysé',
        timestamp: new Date().toISOString(),
        protein: lastAnalysis.protein || 0,
        calories: lastAnalysis.calories || 0,
        source: state.conversationContext.lastAction === 'photo' ? 'image' : 
                state.conversationContext.lastAction === 'voice' ? 'voice' : 'text',
        tags: []
      };

      await addMeal(mealData);
      
      toast.success('Repas sauvegardé !');
      navigate('/');
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde du repas');
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.currentAnalysis, state.conversationContext, updateState, navigate, addMeal]);

  // Gestion des clics sur les suggestions
  const handleSuggestionClick = useCallback((suggestion: QuantitySuggestion) => {
    if (suggestion.value === 'photo' || suggestion.value === 'voice' || suggestion.value === 'scan') {
      // Ces actions sont maintenant gérées directement par les composants inline
      // Plus besoin de handleActionClick
      console.log(`Action ${suggestion.value} should be handled via ChatInput inline components`);
    } else {
      // Traiter comme une quantité
      handleUserMessage(suggestion.value);
    }
  }, [handleUserMessage]);

  // Gestion des clics sur les actions
  const handleChatActionClick = useCallback(async (action: ChatAction) => {
    switch (action.type) {
      case 'save':
        await handleSaveMeal();
        break;
      case 'modify':
        addMessage({
          type: 'bot',
          content: "Que souhaitez-vous modifier ? Vous pouvez ajuster la quantité ou me donner plus de précisions.",
        });
        break;
      case 'retry':
        addMessage({
          type: 'bot',
          content: "Pas de problème ! Redécrivez votre repas ou utilisez une autre méthode.",
        });
        break;
      default:
        break;
    }
  }, [addMessage, navigate, handleSaveMeal]);


  return (
    <div className={cn("flex flex-col h-full max-w-4xl mx-auto bg-gradient-to-br from-background via-secondary/10 to-accent/5", className)}>
      {/* Header */}
      <motion.div 
        className="glass border-b border-border/30 backdrop-blur-xl px-4 sm:px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-2xl h-10 w-10 sm:h-12 sm:w-12 hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </Button>
          </motion.div>

          {state.isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Badge variant="secondary" className="px-4 py-2 rounded-2xl bg-primary/10 text-primary border-primary/20 shadow-ios">
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" strokeWidth={2} />
                Analyse en cours...
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Personalized Greeting with Timeline Icon */}
        <motion.div 
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Time Period Icon */}
          <motion.div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${timeContext.bgGradient} shadow-sm`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <timeContext.icon className={`w-6 h-6 ${timeContext.iconColor}`} strokeWidth={2.5} />
          </motion.div>
          
          {/* Greeting Text */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {timeContext.greeting}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {timeContext.timeInfo}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages Area */}
        {state.messages.length > 0 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {state.messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.4,
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                >
                  <ChatMessage
                    message={message}
                    onSuggestionClick={handleSuggestionClick}
                    onActionClick={handleChatActionClick}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Loading indicator */}
            {state.isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-start"
              >
                <div className="glass rounded-3xl p-6 shadow-ios border border-border/20">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <motion.div 
                        className="w-3 h-3 bg-primary rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div 
                        className="w-3 h-3 bg-accent rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div 
                        className="w-3 h-3 bg-primary rounded-full"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                    <span className="text-lg text-muted-foreground font-medium">Analyse en cours...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Bottom Input Area - Always present when messages exist */}
        {state.messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-xl border-t border-border/30 p-4"
          >
            <ChatGPTInput
              value={state.currentInput}
              onChange={(value) => updateState({ currentInput: value })}
              onSend={handleUserMessage}
              onPhotoCapture={handlePhotoCapture}
              onVoiceTranscript={handleVoiceTranscript}
              onBarcodeDetected={handleBarcodeDetected}
              isLoading={state.isLoading}
              placeholder="Continuez la conversation..."
            />
          </motion.div>
        )}

        {/* Empty State with Unified Input */}
        {state.messages.length === 0 && (
          <div className="flex-1 flex flex-col justify-center p-6">
            <motion.div
              className="w-full max-w-2xl mx-auto space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {/* Unified Input Area */}
              <div className="space-y-6">
                <ChatGPTInput
                  value={state.currentInput}
                  onChange={(value) => updateState({ currentInput: value })}
                  onSend={handleUserMessage}
                  onPhotoCapture={handlePhotoCapture}
                  onVoiceTranscript={handleVoiceTranscript}
                  onBarcodeDetected={handleBarcodeDetected}
                  isLoading={state.isLoading}
                  placeholder={timeContext.mealSuggestion}
                />
              </div>

            </motion.div>
          </div>
        )}
      </div>


      {/* ChatGPT-like interface with integrated attachments and press-to-talk */}
    </div>
  );
};


export default UnifiedMealChat;