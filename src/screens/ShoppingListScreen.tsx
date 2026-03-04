// ==========================================
// TELA - LISTA DE COMPRAS E CONTRATAÇÕES
// ==========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../types';
import { fetchShoppingItems, addShoppingItem, deleteShoppingItem } from '../services/api';

export default function ShoppingListScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [category, setCategory] = useState<'compra' | 'contratacao'>('compra');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    const data = await fetchShoppingItems();
    setItems(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    const price = parseFloat(newPrice.replace(',', '.'));
    if (!trimmed) {
      Alert.alert('Erro', 'Digite o nome do item');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Erro', 'Digite um preço válido');
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

  const formatCurrency = (value: number) =>
    `R$ ${value.toFixed(2).replace('.', ',')}`;

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Ionicons
            name={item.category === 'compra' ? 'cart-outline' : 'briefcase-outline'}
            size={18}
            color={item.category === 'compra' ? '#E65100' : '#6A1B9A'}
          />
          <Text style={styles.itemName}>{item.name}</Text>
        </View>
        <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id, item.name)}
      >
        <Ionicons name="trash-outline" size={18} color="#EF5350" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E65100" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Resumo */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.summaryNumber}>{formatCurrency(totalCompras)}</Text>
          <Text style={styles.summaryLabel}>Compras</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
          <Text style={styles.summaryNumber}>{formatCurrency(totalContratacoes)}</Text>
          <Text style={styles.summaryLabel}>Contratações</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
          <Text style={styles.summaryNumber}>{formatCurrency(total)}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Filtro de Categoria */}
      <View style={styles.categoryRow}>
        <TouchableOpacity
          style={[
            styles.categoryBtn,
            category === 'compra' && styles.categoryBtnActive,
          ]}
          onPress={() => setCategory('compra')}
        >
          <Ionicons name="cart-outline" size={16} color={category === 'compra' ? '#FFF' : '#E65100'} />
          <Text
            style={[
              styles.categoryBtnText,
              category === 'compra' && styles.categoryBtnTextActive,
            ]}
          >
            Compra
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.categoryBtn,
            category === 'contratacao' && styles.categoryBtnActivePurple,
          ]}
          onPress={() => setCategory('contratacao')}
        >
          <Ionicons
            name="briefcase-outline"
            size={16}
            color={category === 'contratacao' ? '#FFF' : '#6A1B9A'}
          />
          <Text
            style={[
              styles.categoryBtnText,
              category === 'contratacao' && styles.categoryBtnTextActive,
            ]}
          >
            Contratação
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Nome do item..."
          placeholderTextColor="#999"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Preço"
          placeholderTextColor="#999"
          value={newPrice}
          onChangeText={setNewPrice}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Nenhum item adicionado</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  summaryNumber: { fontSize: 14, fontWeight: '700', color: '#333' },
  summaryLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryBtnActive: {
    backgroundColor: '#E65100',
    borderColor: '#E65100',
  },
  categoryBtnActivePurple: {
    backgroundColor: '#6A1B9A',
    borderColor: '#6A1B9A',
  },
  categoryBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  categoryBtnTextActive: { color: '#FFF' },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addButton: {
    backgroundColor: '#E65100',
    borderRadius: 12,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  itemInfo: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemPrice: { fontSize: 14, color: '#666', marginLeft: 26 },
  deleteBtn: { padding: 8 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
});
