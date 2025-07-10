// Types pour le système de chat unifié
export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  data?: ChatMessageData;
}

export interface ChatMessageData {
  // Données d'analyse nutritionnelle
  analysis?: {
    description: string;
    protein: number;
    calories: number;
    confidence: number;
    estimatedWeight?: number;
  };
  
  // Suggestions de quantité
  suggestions?: QuantitySuggestion[];
  
  // Actions disponibles
  actions?: ChatAction[];
  
  // Données brutes (photo, voice, etc.)
  attachments?: {
    photo?: string;
    audio?: string;
    type?: 'photo' | 'voice' | 'scan';
  };
}

export interface QuantitySuggestion {
  label: string;
  value: string;
  weight: number;
  isDefault?: boolean;
}

export interface ChatAction {
  id: string;
  label: string;
  type: 'modify' | 'save' | 'retry' | 'cancel';
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ChatState {
  messages: ChatMessage[];
  currentInput: string;
  isLoading: boolean;
  awaitingQuantity: boolean;
  currentAnalysis: any | null;
  conversationContext: ConversationContext;
}

export interface ConversationContext {
  lastAction?: 'text' | 'photo' | 'voice' | 'scan';
  currentProduct?: string;
  lastQuantity?: string;
  pendingAnalysis?: any;
}

export type ChatInputType = 'text' | 'photo' | 'voice' | 'scan';

export interface ChatInputAction {
  type: ChatInputType;
  icon: string;
  label: string;
  primary?: boolean;
}