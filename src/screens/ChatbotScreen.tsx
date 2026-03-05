// ==========================================
// TELA - CHATBOT GEMINI (REDESIGNED)
// ==========================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../types';
import { sendMessage, resetChat } from '../services/gemini';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou sua assistente para a festa junina! Posso ajudar com sugestões de preços, locais para compras em Valinhos e Vinhedo, ideias para decoração e muito mais. Como posso te ajudar?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage(trimmed);
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    resetChat();
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Conversa reiniciada! Como posso te ajudar com a festa junina?',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const formatBold = (text: string, baseStyle: object) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={[baseStyle, { fontWeight: '700' }]}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="sparkles" size={18} color="#5D4037" />
          </View>
        )}
        <View
          style={[
            styles.messageContent,
            isUser ? styles.userContent : styles.assistantContent,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {isUser
              ? item.content
              : formatBold(item.content, styles.assistantText)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={20} color="#5D4037" />
          </View>
          <Text style={styles.headerTitle}>Assistente da Festa</Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color="#5D4037" />
          <Text style={styles.resetText}>Nova Conversa</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Loading */}
      {isLoading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#5D4037" />
          <Text style={styles.typingText}>Digitando...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Pergunte sobre a festa..."
          placeholderTextColor="#A1887F"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Ionicons name="send" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF3E0' },

  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFEBE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#3E2723' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EFEBE9',
  },
  resetText: { fontSize: 14, fontWeight: '700', color: '#5D4037' },

  messagesList: { padding: 14, paddingBottom: 8 },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFEBE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  messageContent: {
    maxWidth: '78%',
    borderRadius: 18,
    padding: 14,
  },
  userContent: {
    backgroundColor: '#5D4037',
    borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    elevation: 1,
  },
  messageText: { fontSize: 17, lineHeight: 24 },
  userText: { color: '#FFF' },
  assistantText: { color: '#3E2723' },

  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 10,
  },
  typingText: { fontSize: 15, color: '#8D6E63', fontWeight: '600' },

  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
    gap: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#FAF3E0',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 17,
    maxHeight: 120,
    color: '#3E2723',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  sendButton: {
    backgroundColor: '#5D4037',
    borderRadius: 22,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: { opacity: 0.4 },
});
