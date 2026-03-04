// ==========================================
// TELA - GASTOS E RECEBIMENTOS
// ==========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Guest, ShoppingItem } from '../types';
import { fetchGuests, fetchShoppingItems } from '../services/api';

const PRICE_PER_GUEST = 150;

export default function FinancesScreen() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [guestsData, itemsData] = await Promise.all([
      fetchGuests(),
      fetchShoppingItems(),
    ]);
    setGuests(guestsData);
    setItems(itemsData);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paidGuests = guests.filter((g) => g.status === 'pago');
  const totalExpenses = items.reduce((sum, item) => sum + item.price, 0);
  const totalReceived = paidGuests.length * PRICE_PER_GUEST;
  const netBalance = totalReceived - totalExpenses;

  const formatCurrency = (value: number) =>
    `R$ ${value.toFixed(2).replace('.', ',')}`;

  type ListEntry =
    | { type: 'header'; title: string }
    | { type: 'expense'; item: ShoppingItem }
    | { type: 'receipt'; guest: Guest }
    | { type: 'empty'; message: string };

  const listData: ListEntry[] = [];

  // Seção de Gastos
  listData.push({ type: 'header', title: 'Gastos (Lista de Compras)' });
  if (items.length === 0) {
    listData.push({ type: 'empty', message: 'Nenhum gasto registrado' });
  } else {
    items.forEach((item) => listData.push({ type: 'expense', item }));
  }

  // Seção de Recebimentos
  listData.push({ type: 'header', title: 'Recebimentos (Convidados Pagos)' });
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
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
        );
      case 'expense':
        return (
          <View style={styles.entryCard}>
            <View style={styles.entryIcon}>
              <Ionicons
                name={item.item.category === 'compra' ? 'cart' : 'briefcase'}
                size={18}
                color="#EF5350"
              />
            </View>
            <Text style={styles.entryName}>{item.item.name}</Text>
            <Text style={[styles.entryAmount, { color: '#EF5350' }]}>
              - {formatCurrency(item.item.price)}
            </Text>
          </View>
        );
      case 'receipt':
        return (
          <View style={styles.entryCard}>
            <View style={[styles.entryIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="person" size={18} color="#66BB6A" />
            </View>
            <Text style={styles.entryName}>{item.guest.name}</Text>
            <Text style={[styles.entryAmount, { color: '#66BB6A' }]}>
              + {formatCurrency(PRICE_PER_GUEST)}
            </Text>
          </View>
        );
      case 'empty':
        return (
          <View style={styles.emptyRow}>
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
        <ActivityIndicator size="large" color="#E65100" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cards de resumo */}
      <View style={styles.summaryContainer}>
        <View style={[styles.bigCard, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="trending-down" size={28} color="#EF5350" />
          <Text style={styles.bigCardLabel}>Total de Gastos</Text>
          <Text style={[styles.bigCardValue, { color: '#EF5350' }]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>
        <View style={[styles.bigCard, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="trending-up" size={28} color="#66BB6A" />
          <Text style={styles.bigCardLabel}>Total Recebido</Text>
          <Text style={[styles.bigCardValue, { color: '#66BB6A' }]}>
            {formatCurrency(totalReceived)}
          </Text>
          <Text style={styles.bigCardSubLabel}>
            {paidGuests.length} convidado{paidGuests.length !== 1 ? 's' : ''} × {formatCurrency(PRICE_PER_GUEST)}
          </Text>
        </View>
      </View>

      {/* Saldo Líquido */}
      <View
        style={[
          styles.balanceCard,
          { backgroundColor: netBalance >= 0 ? '#E8F5E9' : '#FFEBEE' },
        ]}
      >
        <Ionicons
          name={netBalance >= 0 ? 'wallet' : 'warning'}
          size={24}
          color={netBalance >= 0 ? '#2E7D32' : '#C62828'}
        />
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

      {/* Detalhamento */}
      <FlatList
        data={listData}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  bigCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  bigCardLabel: { fontSize: 12, color: '#666' },
  bigCardValue: { fontSize: 22, fontWeight: '800' },
  bigCardSubLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  balanceLabel: { fontSize: 13, color: '#666' },
  balanceValue: { fontSize: 24, fontWeight: '800' },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  entryName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#333' },
  entryAmount: { fontSize: 14, fontWeight: '700' },
  emptyRow: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
});
