// ==========================================
// TELA - GASTOS E RECEBIMENTOS (REDESIGNED)
// ==========================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Guest, ShoppingItem } from '../types';
import { fetchGuests, fetchShoppingItems } from '../services/api';

const PRICE_PER_GUEST = 150;
const PRICE_PER_CHILD = 75;
const REFRESH_INTERVAL = 20000;

const { width: screenWidth } = Dimensions.get('window');
const isSmall = screenWidth <= 414;

function getGuestPrice(guest: Guest): number {
  return guest.isChild ? PRICE_PER_CHILD : PRICE_PER_GUEST;
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function FinancesScreen() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    const [guestsData, itemsData] = await Promise.all([
      fetchGuests(),
      fetchShoppingItems(),
    ]);
    setGuests(guestsData);
    setItems(itemsData);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when screen gains focus (tab switch)
  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  // Auto-refresh every 20 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadData(true);
    }, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const paidGuests = guests.filter((g) => g.status === 'pago_total' || g.status === 'pago_parcial');
  const totalExpenses = items.reduce((sum, item) => sum + item.price, 0);
  const totalReceived = guests.reduce((sum, g) => sum + (g.totalPaid || 0), 0);
  const netBalance = totalReceived - totalExpenses;

  type ListEntry =
    | { type: 'header'; title: string; icon: string; color: string }
    | { type: 'expense'; item: ShoppingItem }
    | { type: 'receipt'; guest: Guest }
    | { type: 'empty'; message: string };

  const listData: ListEntry[] = [];

  listData.push({ type: 'header', title: 'Gastos (Compras e Contratações)', icon: 'trending-down', color: '#C62828' });
  if (items.length === 0) {
    listData.push({ type: 'empty', message: 'Nenhum gasto registrado' });
  } else {
    items.forEach((item) => listData.push({ type: 'expense', item }));
  }

  listData.push({ type: 'header', title: 'Recebimentos (Pagamentos)', icon: 'trending-up', color: '#2E7D32' });
  if (paidGuests.length === 0) {
    listData.push({ type: 'empty', message: 'Nenhum pagamento recebido' });
  } else {
    paidGuests.forEach((guest) => listData.push({ type: 'receipt', guest }));
  }

  const renderItem = ({ item }: { item: ListEntry }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.sectionHeader}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
            <Text style={[styles.sectionTitle, { color: item.color }]}>{item.title}</Text>
          </View>
        );
      case 'expense':
        return (
          <View style={styles.entryCard}>
            <View style={[styles.entryIcon, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons
                name={item.item.category === 'compra' ? 'cart' : 'briefcase'}
                size={20}
                color="#C62828"
              />
            </View>
            <View style={styles.entryInfo}>
              <Text style={styles.entryName}>{item.item.name}</Text>
              <Text style={styles.entryCategory}>
                {item.item.category === 'compra' ? 'Compra' : 'Contratação'}
              </Text>
            </View>
            <Text style={[styles.entryAmount, { color: '#C62828' }]}>
              - {formatCurrency(item.item.price)}
            </Text>
          </View>
        );
      case 'receipt':
        return (
          <View style={styles.entryCard}>
            <View style={[styles.entryIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="person" size={20} color="#2E7D32" />
            </View>
            <View style={styles.entryInfo}>
              <Text style={styles.entryName}>{item.guest.name}{item.guest.isChild ? ' (Criança)' : ''}</Text>
              <Text style={styles.entryCategory}>
                {item.guest.status === 'pago_total' ? 'Pago totalmente' : `Parcial`}
              </Text>
            </View>
            <Text style={[styles.entryAmount, { color: '#2E7D32' }]}>
              + {formatCurrency(item.guest.totalPaid || 0)}
            </Text>
          </View>
        );
      case 'empty':
        return (
          <View style={styles.emptyRow}>
            <Ionicons name="document-text-outline" size={24} color="#D7CCC8" />
            <Text style={styles.emptyText}>{item.message}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D4037" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.bigCard, { backgroundColor: '#FFEBEE' }]}>
          <View style={styles.bigCardIcon}>
            <Ionicons name="trending-down" size={28} color="#C62828" />
          </View>
          <Text style={styles.bigCardLabel}>Total de Gastos</Text>
          <Text style={[styles.bigCardValue, { color: '#C62828' }]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>
        <View style={[styles.bigCard, { backgroundColor: '#E8F5E9' }]}>
          <View style={styles.bigCardIcon}>
            <Ionicons name="trending-up" size={28} color="#2E7D32" />
          </View>
          <Text style={styles.bigCardLabel}>Total Recebido</Text>
          <Text style={[styles.bigCardValue, { color: '#2E7D32' }]}>
            {formatCurrency(totalReceived)}
          </Text>
          <Text style={styles.bigCardSubLabel}>
            {paidGuests.length} convidado{paidGuests.length !== 1 ? 's' : ''} pagaram
          </Text>
        </View>
      </View>

      {/* Net Balance */}
      <View
        style={[
          styles.balanceCard,
          { backgroundColor: netBalance >= 0 ? '#E8F5E9' : '#FFEBEE' },
        ]}
      >
        <View style={[styles.balanceIcon, { backgroundColor: netBalance >= 0 ? '#C8E6C9' : '#FFCDD2' }]}>
          <Ionicons
            name={netBalance >= 0 ? 'wallet' : 'warning'}
            size={28}
            color={netBalance >= 0 ? '#2E7D32' : '#C62828'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.balanceLabel}>Saldo Líquido</Text>
          <Text
            style={[
              styles.balanceValue,
              { color: netBalance >= 0 ? '#2E7D32' : '#C62828' },
            ]}
          >
            {formatCurrency(netBalance)}
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={listData}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF3E0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF3E0' },
  loadingText: { marginTop: 12, fontSize: 18, color: '#5D4037' },

  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 14,
    gap: 10,
  },
  bigCard: {
    flex: 1,
    borderRadius: isSmall ? 14 : 18,
    padding: isSmall ? 12 : 18,
    alignItems: 'center',
    gap: isSmall ? 4 : 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bigCardIcon: {
    marginBottom: 4,
  },
  bigCardLabel: { fontSize: isSmall ? 12 : 14, color: '#5D4037', fontWeight: '600' },
  bigCardValue: { fontSize: isSmall ? 19 : 24, fontWeight: '800' },
  bigCardSubLabel: { fontSize: isSmall ? 11 : 13, color: '#8D6E63', marginTop: 2 },

  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: isSmall ? 14 : 18,
    padding: isSmall ? 14 : 18,
    gap: isSmall ? 10 : 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  balanceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceLabel: { fontSize: isSmall ? 13 : 15, color: '#5D4037', fontWeight: '600' },
  balanceValue: { fontSize: isSmall ? 22 : 28, fontWeight: '800' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: isSmall ? 15 : 18, fontWeight: '800' },

  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: isSmall ? 12 : 14,
    padding: isSmall ? 10 : 14,
    marginBottom: isSmall ? 6 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D8',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  entryIcon: {
    width: isSmall ? 36 : 42,
    height: isSmall ? 36 : 42,
    borderRadius: isSmall ? 10 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: isSmall ? 14 : 17, fontWeight: '700', color: '#3E2723' },
  entryCategory: { fontSize: isSmall ? 12 : 14, color: '#8D6E63', marginTop: 2 },
  entryAmount: { fontSize: isSmall ? 14 : 17, fontWeight: '800' },

  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: { fontSize: 16, color: '#A1887F' },

  list: { paddingHorizontal: 12, paddingBottom: 30 },
});
