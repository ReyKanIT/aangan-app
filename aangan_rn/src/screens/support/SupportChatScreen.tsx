/**
 * SupportChatScreen — guided ticket creation chatbot
 * Step 1 → category, Step 2 → subject, Step 3 → describe issue → Submit
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useSupport, CATEGORY_META } from '../../stores/supportStore';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import type { SupportTicketCategory } from '../../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportChat'>;

type Step = 'category' | 'subject' | 'message' | 'submitting';

interface BotMessage {
  id: string;
  from: 'bot' | 'user';
  text: string;
}

const CATEGORIES = Object.entries(CATEGORY_META) as [SupportTicketCategory, typeof CATEGORY_META[SupportTicketCategory]][];

export default function SupportChatScreen({ navigation }: Props) {
  const { createTicket } = useSupport();

  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<SupportTicketCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [chat, setChat] = useState<BotMessage[]>([
    { id: '0', from: 'bot', text: 'नमस्ते! 🙏 मैं आपकी मदद करने के लिए यहाँ हूँ।\nHello! I\'m here to help you.\n\nकृपया विषय चुनें / Please select a topic:' },
  ]);

  const scrollRef = useRef<ScrollView>(null);

  function addMessage(from: 'bot' | 'user', text: string) {
    setChat((prev) => [...prev, { id: Date.now().toString(), from, text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function handleCategorySelect(cat: SupportTicketCategory) {
    setCategory(cat);
    const meta = CATEGORY_META[cat];
    addMessage('user', `${meta.emoji} ${meta.hi} / ${meta.en}`);
    setTimeout(() => {
      addMessage('bot', `समझ गया! ${meta.emoji}\nPlease enter a short subject/title for your issue:`);
      setStep('subject');
    }, 400);
  }

  function handleSubjectSubmit() {
    const trimmed = subject.trim();
    if (trimmed.length < 5) {
      Alert.alert('', 'Please enter at least 5 characters for the subject.');
      return;
    }
    addMessage('user', trimmed);
    setTimeout(() => {
      addMessage('bot', 'धन्यवाद! 👍\nNow please describe your issue in detail. More details help us resolve it faster:');
      setStep('message');
    }, 400);
  }

  function handleMessageSubmit() {
    const trimmed = messageText.trim();
    if (trimmed.length < 10) {
      Alert.alert('', 'Please describe your issue in at least 10 characters.');
      return;
    }
    addMessage('user', trimmed);
    setStep('submitting');
    submitTicket(trimmed);
  }

  async function submitTicket(msg: string) {
    addMessage('bot', 'जमा कर रहे हैं... / Submitting your ticket...');
    const ticket = await createTicket({ category: category!, subject: subject.trim(), message: msg });
    if (ticket) {
      addMessage('bot', `✅ आपकी शिकायत दर्ज हो गई!\nTicket #${ticket.ticket_number} has been created.\n\nहमारी टीम जल्द जवाब देगी। / Our team will respond shortly.`);
      setTimeout(() => {
        navigation.replace('TicketDetail', { ticketId: ticket.id });
      }, 1500);
    } else {
      addMessage('bot', '❌ कुछ गड़बड़ हो गई। / Something went wrong. Please try again.');
      setStep('message');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Aangan Support</Text>
          <Text style={styles.headerSub}>हम यहाँ हैं • We're here to help</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MyTickets')} style={styles.ticketsBtn}>
          <Text style={styles.ticketsBtnText}>My Tickets</Text>
        </TouchableOpacity>
      </View>

      {/* Chat */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {chat.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubble, msg.from === 'bot' ? styles.bubbleBot : styles.bubbleUser]}
          >
            {msg.from === 'bot' && (
              <Text style={styles.botLabel}>Aangan Support</Text>
            )}
            <Text style={[styles.bubbleText, msg.from === 'user' && styles.bubbleTextUser]}>
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        {step === 'category' && (
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(([key, meta]) => (
              <TouchableOpacity
                key={key}
                style={styles.categoryChip}
                onPress={() => handleCategorySelect(key)}
              >
                <Text style={styles.categoryEmoji}>{meta.emoji}</Text>
                <Text style={styles.categoryHi}>{meta.hi}</Text>
                <Text style={styles.categoryEn}>{meta.en}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 'subject' && (
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.textInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Subject / विषय"
              placeholderTextColor={Colors.gray400}
              maxLength={100}
              returnKeyType="send"
              onSubmitEditing={handleSubjectSubmit}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSubjectSubmit}>
              <Text style={styles.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'message' && (
          <View style={styles.textInputRow}>
            <TextInput
              style={[styles.textInput, styles.textInputMulti]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Describe your issue... / समस्या बताएँ..."
              placeholderTextColor={Colors.gray400}
              maxLength={1000}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleMessageSubmit}>
              <Text style={styles.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'submitting' && (
          <View style={styles.submittingRow}>
            <ActivityIndicator color={Colors.haldiGold} />
            <Text style={styles.submittingText}>Submitting...</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.brown, paddingHorizontal: 16,
    paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 52 : 16,
  },
  backBtn: { padding: 8, marginRight: 4 },
  backIcon: { color: Colors.cream, fontSize: 22, fontWeight: '600' },
  headerInfo: { flex: 1 },
  headerTitle: { color: Colors.haldiGold, fontSize: 16, fontWeight: '700' },
  headerSub: { color: Colors.cream, fontSize: 11, marginTop: 1, opacity: 0.8 },
  ticketsBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.haldiGold, borderRadius: 8 },
  ticketsBtnText: { color: Colors.brown, fontSize: 12, fontWeight: '600' },

  chat: { flex: 1 },
  chatContent: { padding: 16, gap: 10, paddingBottom: 24 },

  bubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4,
    elevation: 1,
  },
  bubbleBot: { backgroundColor: Colors.white, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: Colors.haldiGold, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  botLabel: { fontSize: 10, color: Colors.gray500, marginBottom: 4, fontWeight: '600', letterSpacing: 0.3 },
  bubbleText: { fontSize: 14, color: Colors.brown, lineHeight: 20 },
  bubbleTextUser: { color: Colors.white },

  inputArea: {
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray200,
    padding: 12,
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.cream, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.gray200,
  },
  categoryEmoji: { fontSize: 18 },
  categoryHi: { fontSize: 14, color: Colors.brown, fontWeight: '600' },
  categoryEn: { fontSize: 11, color: Colors.gray500 },

  textInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: {
    flex: 1, backgroundColor: Colors.cream, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.brown, borderWidth: 1, borderColor: Colors.gray200,
    minHeight: 48,
  },
  textInputMulti: { maxHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.haldiGold, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: Colors.white, fontSize: 22, fontWeight: '700' },

  submittingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  submittingText: { color: Colors.brown, fontSize: 14 },
});
