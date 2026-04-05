import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useSupport, CATEGORY_META, STATUS_META } from '../../stores/supportStore';
import { Colors } from '../../theme/colors';
import type { SupportMessage } from '../../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketDetail'>;

export default function TicketDetailScreen({ navigation, route }: Props) {
  const { ticketId } = route.params;
  const { activeTicket, messages, isLoading, isSending, fetchMessages, sendMessage } = useSupport();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => { fetchMessages(ticketId); }, [ticketId]);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
  }
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
  }

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    const resolved = activeTicket?.status === 'resolved' || activeTicket?.status === 'closed';
    if (resolved) return;
    setDraft('');
    await sendMessage(ticketId, trimmed);
    listRef.current?.scrollToEnd({ animated: true });
  }

  function renderMessage({ item, index }: { item: SupportMessage; index: number }) {
    const isSupport = item.is_from_support;
    const prev = messages[index - 1];
    const showDate = !prev || formatDate(prev.created_at) !== formatDate(item.created_at);

    return (
      <>
        {showDate && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateLabel}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isSupport ? styles.msgRowLeft : styles.msgRowRight]}>
          <View style={[styles.msgBubble, isSupport ? styles.msgBubbleSupport : styles.msgBubbleUser]}>
            {isSupport && (
              <Text style={styles.senderName}>
                {item.sender?.display_name ?? 'Support Team'}
              </Text>
            )}
            <Text style={[styles.msgText, isSupport ? styles.msgTextSupport : styles.msgTextUser]}>
              {item.message}
            </Text>
            <Text style={[styles.msgTime, isSupport ? styles.msgTimeSupport : styles.msgTimeUser]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </>
    );
  }

  const isClosed = activeTicket?.status === 'resolved' || activeTicket?.status === 'closed';
  const status = activeTicket ? STATUS_META[activeTicket.status] : null;
  const cat = activeTicket ? CATEGORY_META[activeTicket.category] : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.ticketNum}>{activeTicket?.ticket_number ?? '...'}</Text>
          <Text style={styles.subject} numberOfLines={1}>{activeTicket?.subject ?? ''}</Text>
        </View>
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: status.color + '22' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.hi}</Text>
          </View>
        )}
      </View>

      {/* Category bar */}
      {cat && (
        <View style={styles.catBar}>
          <Text style={styles.catText}>{cat.emoji} {cat.hi} • {cat.en}</Text>
        </View>
      )}

      {/* Messages */}
      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.haldiGold} size="large" />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMsg}>
              <Text style={styles.emptyMsgText}>आपका संदेश भेजा गया है।{'\n'}Our team will respond soon.</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      {isClosed ? (
        <View style={styles.closedBar}>
          <Text style={styles.closedText}>
            {activeTicket?.status === 'resolved' ? '✅ यह टिकट हल हो गई है।' : '🔒 यह टिकट बंद है।'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SupportChat')}>
            <Text style={styles.newTicketLink}>New Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="अपना संदेश लिखें... / Type a message..."
            placeholderTextColor={Colors.gray400}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.sendBtnText}>→</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.brown, paddingHorizontal: 16,
    paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 52 : 16, gap: 10,
  },
  backBtn: { padding: 8 },
  backIcon: { color: Colors.cream, fontSize: 22, fontWeight: '600' },
  headerInfo: { flex: 1 },
  ticketNum: { color: Colors.cream, fontSize: 11, opacity: 0.7, fontWeight: '600' },
  subject: { color: Colors.haldiGold, fontSize: 14, fontWeight: '700', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  catBar: { backgroundColor: Colors.cream, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray200 },
  catText: { fontSize: 12, color: Colors.gray500 },

  messageList: { padding: 16, paddingBottom: 12 },

  dateDivider: { alignItems: 'center', marginVertical: 12 },
  dateLabel: {
    fontSize: 11, color: Colors.gray500, backgroundColor: Colors.gray200,
    paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10,
  },

  msgRow: { marginBottom: 8, maxWidth: '82%' },
  msgRowLeft: { alignSelf: 'flex-start' },
  msgRowRight: { alignSelf: 'flex-end' },
  msgBubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  msgBubbleSupport: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 1 },
  msgBubbleUser: { backgroundColor: Colors.haldiGold, borderBottomRightRadius: 4 },
  senderName: { fontSize: 10, color: Colors.haldiGold, fontWeight: '700', marginBottom: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextSupport: { color: Colors.brown },
  msgTextUser: { color: Colors.white },
  msgTime: { fontSize: 10, marginTop: 4 },
  msgTimeSupport: { color: Colors.gray400, textAlign: 'left' },
  msgTimeUser: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

  emptyMsg: { alignItems: 'center', marginTop: 60, padding: 24 },
  emptyMsgText: { color: Colors.gray500, textAlign: 'center', lineHeight: 22 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: Colors.white, padding: 12, borderTopWidth: 1, borderTopColor: Colors.gray200,
  },
  input: {
    flex: 1, backgroundColor: Colors.cream, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: Colors.brown, borderWidth: 1, borderColor: Colors.gray200,
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.haldiGold, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: Colors.white, fontSize: 20, fontWeight: '700' },

  closedBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, padding: 16, borderTopWidth: 1, borderTopColor: Colors.gray200,
  },
  closedText: { fontSize: 13, color: Colors.gray500, flex: 1 },
  newTicketLink: { fontSize: 13, color: Colors.haldiGold, fontWeight: '700', marginLeft: 12 },
});
