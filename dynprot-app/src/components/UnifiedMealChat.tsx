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

// Interface simplified - no more modals needed

// Messages d'accueil
const welcomeMessages: ChatMessageType[] = [
  {
    id: 'welcome-1',
    type: 'bot',
    content: "👋 Salut ! Je suis votre assistant nutritionnel. Décrivez votre repas ou utilisez les icônes pour prendre une photo, enregistrer votre voix ou scanner un produit.",
    timestamp: new Date(),
    data: {
      suggestions: [
        { label: "Prendre une photo", value: "photo", weight: 0 },
        { label: "Décrire à la voix", value: "voice", weight: 0 },
        { label: "Scanner un produit", value: "scan", weight: 0 }
      ]
    }
  }
];

interface UnifiedMealChatProps {
  className?: string;
}

export const UnifiedMealChat: React.FC<UnifiedMealChatProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user, addMeal } = useAppContext();
  const [state, setState] = useState<ChatState>({
    ...initialState,
    messages: welcomeMessages
  });
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
    <div className={cn("flex flex-col h-full max-w-4xl mx-auto", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Assistant Nutritionnel</h1>
            <p className="text-sm text-gray-500">Analysez vos repas facilement</p>
          </div>
        </div>

        {state.isLoading && (
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="w-3 h-3 mr-1" />
            Analyse en cours...
          </Badge>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <AnimatePresence>
          {state.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSuggestionClick={handleSuggestionClick}
              onActionClick={handleChatActionClick}
            />
          ))}
        </AnimatePresence>
        
        {/* Loading indicator */}
        {state.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200" />
                </div>
                <span className="text-sm text-gray-500">Analyse en cours...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatGPTInput
        value={state.currentInput}
        onChange={(value) => updateState({ currentInput: value })}
        onSend={handleUserMessage}
        onPhotoCapture={handlePhotoCapture}
        onVoiceTranscript={handleVoiceTranscript}
        onBarcodeDetected={handleBarcodeDetected}
        isLoading={state.isLoading}
        placeholder="Décrivez votre repas..."
      />

      {/* ChatGPT-like interface with integrated attachments and press-to-talk */}
    </div>
  );
};


export default UnifiedMealChat;