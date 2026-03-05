// ==========================================
// TELA - LISTA DE COMPRAS E CONTRATAÇÕES (REDESIGNED)
// ==========================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../types';
import { fetchShoppingItems, addShoppingItem, deleteShoppingItem } from '../services/api';

const REFRESH_INTERVAL = 20000;

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function ShoppingListScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [category, setCategory] = useState<'compra' | 'contratacao'>('compra');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadItems = useCallback(async (silent = false) => {
    const data = await fetchShoppingItems();
    setItems(data);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadItems(true);
    }, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadItems]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    const price = parseFloat(newPrice.replace(',', '.'));
    if (!trimmed) {
      Alert.alert('Atenção', 'Digite o nome do item');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Atenção', 'Digite um preço válido');
      return;
    }
    const item = await addShoppingItem(trimmed, price, category);
    if (item) {
      setItems((prev) => [...prev, item]);
      setNewName('');
      setNewPrice('');
    } else {
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remover Item', `Deseja remover "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteShoppingItem(id);
          if (success) {
            setItems((prev) => prev.filter((i) => i.id !== id));
          }
        },
      },
    ]);
  };

  const compras = items.filter((i) => i.category === 'compra');
  const contratacoes = items.filter((i) => i.category === 'contratacao');
  const totalCompras = compras.reduce((s, i) => s + i.price, 0);
  const totalContratacoes = contratacoes.reduce((s, i) => s + i.price, 0);
  const total = totalCompras + totalContratacoes;

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const isCompra = item.category === 'compra';
    return (
      <View style={styles.itemCard}>
        <View style={[styles.itemIcon, { backgroundColor: isCompra ? '#FFF3E0' : '#F3E5F5' }]}>
          <Ionicons
            name={isCompra ? 'cart' : 'briefcase'}
            size={22}
            color={isCompra ? '#E65100' : '#6A1B9A'}
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{isCompra ? 'Compra' : 'Contratação'}</Text>
        </View>
        <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={22} color="#EF5350" />
        </TouchableOpacity>
      </View>
    );
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="cart" size={20} color="#E65100" />
          <Text style={styles.summaryValue}>{formatCurrency(totalCompras)}</Text>
          <Text style={styles.summaryLabel}>Compras</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
          <Ionicons name="briefcase" size={20} color="#6A1B9A" />
          <Text style={styles.summaryValue}>{formatCurrency(totalContratacoes)}</Text>
          <Text style={styles.summaryLabel}>Contratações</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="calculator" size={20} color="#C62828" />
          <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Category Selector */}
      <View style={styles.categoryRow}>
        <TouchableOpacity
          style={[styles.categoryBtn, category === 'compra' && styles.categoryBtnActiveOrange]}
          onPress={() => setCategory('compra')}
        >
          <Ionicons name="cart-outline" size={20} color={category === 'compra' ? '#FFF' : '#E65100'} />
          <Text style={[styles.categoryBtnText, category === 'compra' && styles.categoryBtnTextActive]}>
            Compra
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryBtn, category === 'contratacao' && styles.categoryBtnActivePurple]}
          onPress={() => setCategory('contratacao')}
        >
          <Ionicons name="briefcase-outline" size={20} color={category === 'contratacao' ? '#FFF' : '#6A1B9A'} />
          <Text style={[styles.categoryBtnText, category === 'contratacao' && styles.categoryBtnTextActive]}>
            Contratação
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input */}
      <View style={styles.inputSection}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Nome do item..."
            placeholderTextColor="#A1887F"
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Preço"
            placeholderTextColor="#A1887F"
            value={newPrice}
            onChangeText={setNewPrice}
            keyboardType="decimal-pad"
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Ionicons name="add-circle" size={22} color="#FFF" />
          <Text style={styles.addButtonText}>Adicionar Item</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color="#D7CCC8" />
            <Text style={styles.emptyText}>Nenhum item adicionado</Text>
            <Text style={styles.emptySubText}>Adicione compras ou contratações acima</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF3E0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF3E0' },
  loadingText: { marginTop: 12, fontSize: 18, color: '#5D4037' },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 14,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryValue: { fontSize: 17, fontWeight: '800', color: '#3E2723' },
  summaryLabel: { fontSize: 13, color: '#5D4037', fontWeight: '600' },

  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
  },
  categoryBtnActiveOrange: {
    backgroundColor: '#E65100',
    borderColor: '#E65100',
  },
  categoryBtnActivePurple: {
    backgroundColor: '#6A1B9A',
    borderColor: '#6A1B9A',
  },
  categoryBtnText: { fontSize: 16, fontWeight: '700', color: '#5D4037' },
  categoryBtnTextActive: { color: '#FFF' },

  inputSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    color: '#3E2723',
  },
  addButton: {
    backgroundColor: '#5D4037',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },

  list: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 30 },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
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
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700', color: '#3E2723' },
  itemCategory: { fontSize: 14, color: '#8D6E63', marginTop: 2 },
  itemPrice: { fontSize: 17, fontWeight: '800', color: '#3E2723', marginRight: 8 },
  deleteBtn: { padding: 10 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 20, color: '#8D6E63', marginTop: 16, fontWeight: '700' },
  emptySubText: { fontSize: 16, color: '#A1887F', marginTop: 4 },
});
