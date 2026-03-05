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
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem, ShoppingPayment } from '../types';
import {
  fetchShoppingItems,
  addShoppingItem,
  deleteShoppingItem,
  updateShoppingItem,
  addShoppingPayment,
  deleteShoppingPayment,
} from '../services/api';

const REFRESH_INTERVAL = 20000;

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export default function ShoppingListScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [category, setCategory] = useState<'compra' | 'contratacao'>('compra');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const versionRef = useRef(0);

  // Detail modal
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [dueDateText, setDueDateText] = useState('');

  // Payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');

  const loadItems = useCallback(async (silent = false) => {
    const v = versionRef.current;
    const data = await fetchShoppingItems();
    if (versionRef.current !== v) return;
    setItems(data);
    setSelectedItem((prev) => {
      if (!prev) return prev;
      const fresh = data.find((i: ShoppingItem) => i.id === prev.id);
      return fresh || null;
    });
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
      Alert.alert('Atenção', 'Digite um preço válido (ex: 3,75)');
      return;
    }
    versionRef.current++;
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
          versionRef.current++;
          const success = await deleteShoppingItem(id);
          if (success) {
            setItems((prev) => prev.filter((i) => i.id !== id));
            if (selectedItem?.id === id) {
              setDetailModalVisible(false);
              setSelectedItem(null);
            }
          }
        },
      },
    ]);
  };

  const handleOpenDetail = (item: ShoppingItem) => {
    setSelectedItem(item);
    setDueDateText(item.dueDate ? formatDate(item.dueDate) : '');
    setDetailModalVisible(true);
  };

  const handleSaveDueDate = async () => {
    if (!selectedItem) return;
    let isoDate: string | null = null;
    if (dueDateText.trim()) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(dueDateText.trim())) {
        Alert.alert('Atenção', 'Digite a data no formato DD/MM/AAAA');
        return;
      }
      const parts = dueDateText.trim().split('/');
      isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    versionRef.current++;
    const success = await updateShoppingItem(selectedItem.id, { dueDate: isoDate });
    if (success) {
      const updated = { ...selectedItem, dueDate: isoDate };
      setSelectedItem(updated);
      setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? updated : i)));
      Alert.alert('Sucesso', 'Data limite salva!');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedItem) return;
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Atenção', 'Digite um valor válido');
      return;
    }
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(payDate.trim())) {
      Alert.alert('Atenção', 'Digite a data no formato DD/MM/AAAA');
      return;
    }
    const parts = payDate.trim().split('/');
    const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    versionRef.current++;
    const payment = await addShoppingPayment(selectedItem.id, amount, isoDate);
    if (!payment) {
      Alert.alert('Erro', 'Não foi possível registrar o pagamento');
      return;
    }

    const newTotalPaid = (selectedItem.totalPaid || 0) + amount;
    const updatedItem = {
      ...selectedItem,
      totalPaid: newTotalPaid,
      payments: [...(selectedItem.payments || []), payment],
    };
    setSelectedItem(updatedItem);
    setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? updatedItem : i)));
    setPaymentModalVisible(false);
    setPayAmount('');
    setPayDate('');
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedItem) return;
    versionRef.current++;
    const success = await deleteShoppingPayment(paymentId);
    if (success) {
      const updatedPayments = (selectedItem.payments || []).filter((p) => p.id !== paymentId);
      const newTotalPaid = updatedPayments.reduce((s, p) => s + p.amount, 0);
      const updatedItem = { ...selectedItem, payments: updatedPayments, totalPaid: newTotalPaid };
      setSelectedItem(updatedItem);
      setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? updatedItem : i)));
    }
  };

  const compras = items.filter((i) => i.category === 'compra');
  const contratacoes = items.filter((i) => i.category === 'contratacao');
  const totalCompras = compras.reduce((s, i) => s + i.price, 0);
  const totalContratacoes = contratacoes.reduce((s, i) => s + i.price, 0);
  const total = totalCompras + totalContratacoes;

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const isCompra = item.category === 'compra';
    const remaining = item.price - (item.totalPaid || 0);
    const isPaidFull = remaining <= 0;
    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => handleOpenDetail(item)} activeOpacity={0.7}>
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
          {(item.totalPaid || 0) > 0 && (
            <Text style={[styles.itemPaidLabel, isPaidFull && { color: '#2E7D32' }]}>
              {isPaidFull ? 'Pago totalmente' : `Pago: ${formatCurrency(item.totalPaid)} / Falta: ${formatCurrency(remaining)}`}
            </Text>
          )}
        </View>
        <View style={styles.itemRightCol}>
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF5350" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
            placeholder="Preço (ex: 3,75)"
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

      {/* ============ DETAIL MODAL ============ */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { maxHeight: Dimensions.get('window').height * 0.85 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{selectedItem?.name}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={28} color="#5D4037" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedItem && (
                <>
                  {/* Payment Summary */}
                  <View style={styles.paySummaryCard}>
                    <Text style={styles.paySummaryTitle}>Resumo Financeiro</Text>
                    <View style={styles.paySummaryRow}>
                      <Text style={styles.paySummaryLabel}>Valor total:</Text>
                      <Text style={styles.paySummaryValue}>{formatCurrency(selectedItem.price)}</Text>
                    </View>
                    <View style={styles.paySummaryRow}>
                      <Text style={styles.paySummaryLabel}>Total pago:</Text>
                      <Text style={[styles.paySummaryValue, { color: '#2E7D32' }]}>{formatCurrency(selectedItem.totalPaid || 0)}</Text>
                    </View>
                    <View style={[styles.paySummaryRow, { borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 }]}>
                      <Text style={[styles.paySummaryLabel, { fontWeight: '700' }]}>Restante:</Text>
                      <Text style={[styles.paySummaryValue, { color: (selectedItem.price - (selectedItem.totalPaid || 0)) <= 0 ? '#2E7D32' : '#C62828', fontWeight: '800' }]}>
                        {formatCurrency(Math.max(0, selectedItem.price - (selectedItem.totalPaid || 0)))}
                      </Text>
                    </View>
                  </View>

                  {/* Due Date */}
                  <Text style={styles.sectionLabel}>Data Limite de Pagamento</Text>
                  <View style={styles.dueDateRow}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor="#A1887F"
                      value={dueDateText}
                      onChangeText={setDueDateText}
                      keyboardType="default"
                    />
                    <TouchableOpacity style={styles.saveDueDateBtn} onPress={handleSaveDueDate}>
                      <Ionicons name="save" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Payment History */}
                  <Text style={styles.sectionLabel}>Histórico de Pagamentos</Text>
                  {(!selectedItem.payments || selectedItem.payments.length === 0) ? (
                    <View style={styles.emptyPayments}>
                      <Ionicons name="receipt-outline" size={40} color="#D7CCC8" />
                      <Text style={styles.emptyPaymentsText}>Nenhum pagamento registrado</Text>
                    </View>
                  ) : (
                    selectedItem.payments.map((p) => (
                      <View key={p.id} style={styles.paymentEntry}>
                        <View style={styles.paymentEntryLeft}>
                          <Ionicons name="cash-outline" size={20} color="#2E7D32" />
                          <View>
                            <Text style={styles.paymentEntryAmount}>{formatCurrency(p.amount)}</Text>
                            <Text style={styles.paymentEntryDate}>{formatDate(p.paymentDate)}</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => {
                          Alert.alert('Remover pagamento', `Remover ${formatCurrency(p.amount)}?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Remover', style: 'destructive', onPress: () => handleDeletePayment(p.id) },
                          ]);
                        }}>
                          <Ionicons name="trash-outline" size={20} color="#EF5350" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  <TouchableOpacity
                    style={styles.addPaymentBtn}
                    onPress={() => {
                      setPayAmount('');
                      setPayDate('');
                      setPaymentModalVisible(true);
                    }}
                  >
                    <Ionicons name="add-circle" size={22} color="#FFF" />
                    <Text style={styles.addPaymentBtnText}>Registrar Pagamento</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============ PAYMENT MODAL ============ */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Pagamento</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={28} color="#5D4037" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <Text style={styles.modalSubtitle}>
                {selectedItem.name} — Faltam: {formatCurrency(Math.max(0, selectedItem.price - (selectedItem.totalPaid || 0)))}
              </Text>
            )}

            <Text style={styles.fieldLabel}>Valor (R$)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 1000,00"
              placeholderTextColor="#A1887F"
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Data do Pagamento (DD/MM/AAAA)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 15/03/2026"
              placeholderTextColor="#A1887F"
              value={payDate}
              onChangeText={setPayDate}
              keyboardType="default"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handlePaymentSubmit}>
              <Ionicons name="checkmark" size={24} color="#FFF" />
              <Text style={styles.submitBtnText}>Confirmar Pagamento</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  itemPaidLabel: { fontSize: 13, color: '#1565C0', marginTop: 3, fontWeight: '600' },
  itemRightCol: { alignItems: 'flex-end', gap: 4 },
  itemPrice: { fontSize: 17, fontWeight: '800', color: '#3E2723' },
  deleteBtn: { padding: 6 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 20, color: '#8D6E63', marginTop: 16, fontWeight: '700' },
  emptySubText: { fontSize: 16, color: '#A1887F', marginTop: 4 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.75,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3E2723',
    flex: 1,
    marginRight: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#5D4037',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#FAF3E0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    color: '#3E2723',
  },
  submitBtn: {
    backgroundColor: '#5D4037',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 20,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Detail modal
  paySummaryCard: {
    backgroundColor: '#FAF3E0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E0D8',
  },
  paySummaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 10,
  },
  paySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paySummaryLabel: {
    fontSize: 16,
    color: '#5D4037',
  },
  paySummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3E2723',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 10,
  },
  dueDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  saveDueDateBtn: {
    backgroundColor: '#5D4037',
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyPaymentsText: {
    fontSize: 15,
    color: '#A1887F',
    marginTop: 8,
  },
  paymentEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  paymentEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentEntryAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E7D32',
  },
  paymentEntryDate: {
    fontSize: 14,
    color: '#777',
  },
  addPaymentBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  addPaymentBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
