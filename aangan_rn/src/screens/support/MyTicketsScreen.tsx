import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useSupport, CATEGORY_META, STATUS_META } from '../../stores/supportStore';
import { Colors } from '../../theme/colors';
import type { SupportTicket } from '../../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'MyTickets'>;

export default function MyTicketsScreen({ navigation }: Props) {
  const { tickets, isLoading, fetchMyTickets } = useSupport();

  useEffect(() => { fetchMyTickets(); }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderTicket({ item }: { item: SupportTicket }) {
    const cat = CATEGORY_META[item.category];
    const status = STATUS_META[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <Text style={styles.ticketNum}>{item.ticket_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '22' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.hi}</Text>
          </View>
        </View>
        <Text style={styles.subject} numberOfLines={2}>{item.subject}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.category}>{cat.emoji} {cat.hi}</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>मेरी शिकायतें / My Tickets</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('SupportChat')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={Colors.haldiGold} size="large" />
      ) : tickets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤝</Text>
          <Text style={styles.emptyTitle}>कोई शिकायत नहीं</Text>
          <Text style={styles.emptySubtitle}>No tickets yet. Need help?</Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => navigation.navigate('SupportChat')}
          >
            <Text style={styles.startBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.brown, paddingHorizontal: 16,
    paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 52 : 16,
    gap: 12,
  },
  backBtn: { padding: 8 },
  backIcon: { color: Colors.cream, fontSize: 22, fontWeight: '600' },
  headerTitle: { flex: 1, color: Colors.haldiGold, fontSize: 16, fontWeight: '700' },
  newBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.haldiGold, borderRadius: 8,
  },
  newBtnText: { color: Colors.brown, fontSize: 13, fontWeight: '700' },

  list: { padding: 16 },

  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketNum: { fontSize: 12, color: Colors.gray500, fontWeight: '600', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  subject: { fontSize: 15, color: Colors.brown, fontWeight: '600', marginBottom: 10, lineHeight: 20 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 12, color: Colors.gray500 },
  date: { fontSize: 11, color: Colors.gray400 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.brown, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: Colors.gray500, marginBottom: 24 },
  startBtn: {
    backgroundColor: Colors.haldiGold, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  startBtnText: { color: Colors.brown, fontSize: 16, fontWeight: '700' },
});
