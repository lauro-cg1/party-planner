// ==========================================
// TELA - LISTA DE CONVIDADOS (REDESIGNED)
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
  Modal,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Guest, GuestStatus, GuestPayment } from '../types';
import { fetchGuests, addGuest, updateGuest, deleteGuest, addPayment, deletePayment } from '../services/api';

const PRICE_PER_GUEST = 150;
const PRICE_PER_CHILD = 75;
const REFRESH_INTERVAL = 20000;

function getGuestPrice(guest: Guest): number {
  return guest.isChild ? PRICE_PER_CHILD : PRICE_PER_GUEST;
}

const STATUS_CONFIG: Record<GuestStatus, { label: string; color: string; bg: string; icon: string }> = {
  pendente: { label: 'Pendente', color: '#F57C00', bg: '#FFF3E0', icon: 'time-outline' },
  confirmado: { label: 'Confirmado', color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle' },
  nao_vem: { label: 'Não Vem', color: '#C62828', bg: '#FFEBEE', icon: 'close-circle' },
  pago_parcial: { label: 'Parcial', color: '#1565C0', bg: '#E3F2FD', icon: 'wallet-outline' },
  pago_total: { label: 'Pago Total', color: '#00695C', bg: '#E0F2F1', icon: 'checkmark-done-circle' },
};

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export default function GuestListScreen() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newName, setNewName] = useState('');
  const [newFamily, setNewFamily] = useState('');
  const [newIsChild, setNewIsChild] = useState(false);
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);

  // Guest detail modal
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [obsText, setObsText] = useState('');

  // Payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState<'parcial' | 'total'>('total');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentIsChild, setPaymentIsChild] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadGuests = useCallback(async (silent = false) => {
    const data = await fetchGuests();
    setGuests(data);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadGuests(true);
    }, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadGuests]);

  const handleAddGuest = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'Digite o nome do convidado');
      return;
    }
    const guest = await addGuest(trimmed, newFamily.trim(), newIsChild);
    if (guest) {
      setGuests((prev) => [...prev, guest]);
      setNewName('');
      setNewFamily('');
      setNewIsChild(false);
    } else {
      Alert.alert('Erro', 'Não foi possível adicionar o convidado');
    }
  };

  const handleStatusChange = async (guest: Guest, status: GuestStatus) => {
    if (status === 'pago_parcial' || status === 'pago_total') {
      setSelectedGuest(guest);
      setPaymentIsChild(!!guest.isChild);
      const guestPrice = getGuestPrice(guest);
      setPaymentType(status === 'pago_total' ? 'total' : 'parcial');
      const remaining = guestPrice - (guest.totalPaid || 0);
      if (status === 'pago_total') {
        setPaymentAmount(remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '');
      } else {
        setPaymentAmount('');
      }
      setPaymentDate('');
      setPaymentModalVisible(true);
      return;
    }
    const success = await updateGuest(guest.id, { status });
    if (success) {
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? { ...g, status } : g))
      );
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedGuest) return;
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Atenção', 'Digite um valor válido');
      return;
    }
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(paymentDate.trim())) {
      Alert.alert('Atenção', 'Digite a data no formato DD/MM/AAAA');
      return;
    }
    const parts = paymentDate.trim().split('/');
    const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    // Update isChild if changed in payment modal
    if (!!selectedGuest.isChild !== paymentIsChild) {
      await updateGuest(selectedGuest.id, { isChild: paymentIsChild });
    }

    const payment = await addPayment(selectedGuest.id, amount, isoDate);
    if (!payment) {
      Alert.alert('Erro', 'Não foi possível registrar o pagamento');
      return;
    }

    const guestPrice = paymentIsChild ? PRICE_PER_CHILD : PRICE_PER_GUEST;
    const newTotalPaid = (selectedGuest.totalPaid || 0) + amount;
    const newStatus: GuestStatus = newTotalPaid >= guestPrice ? 'pago_total' : 'pago_parcial';
    await updateGuest(selectedGuest.id, { status: newStatus });

    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== selectedGuest.id) return g;
        return {
          ...g,
          isChild: paymentIsChild ? 1 : 0,
          status: newStatus,
          totalPaid: newTotalPaid,
          payments: [...(g.payments || []), payment],
        };
      })
    );
    setPaymentModalVisible(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remover Convidado', `Deseja remover ${name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteGuest(id);
          if (success) {
            setGuests((prev) => prev.filter((g) => g.id !== id));
            if (selectedGuest?.id === id) {
              setDetailModalVisible(false);
              setSelectedGuest(null);
            }
          }
        },
      },
    ]);
  };

  const handleOpenDetail = (guest: Guest) => {
    setSelectedGuest(guest);
    setObsText(guest.observations || '');
    setDetailModalVisible(true);
  };

  const handleSaveObservations = async () => {
    if (!selectedGuest) return;
    const success = await updateGuest(selectedGuest.id, { observations: obsText });
    if (success) {
      setGuests((prev) =>
        prev.map((g) => (g.id === selectedGuest.id ? { ...g, observations: obsText } : g))
      );
      setSelectedGuest((prev) => prev ? { ...prev, observations: obsText } : prev);
      Alert.alert('Sucesso', 'Observações salvas!');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedGuest) return;
    const success = await deletePayment(paymentId);
    if (success) {
      const updatedPayments = (selectedGuest.payments || []).filter((p) => p.id !== paymentId);
      const newTotalPaid = updatedPayments.reduce((s, p) => s + p.amount, 0);
      const guestPrice = getGuestPrice(selectedGuest);
      let newStatus: GuestStatus;
      if (newTotalPaid >= guestPrice) {
        newStatus = 'pago_total';
      } else if (newTotalPaid > 0) {
        newStatus = 'pago_parcial';
      } else if (selectedGuest.status === 'pago_parcial' || selectedGuest.status === 'pago_total') {
        newStatus = 'pendente';
      } else {
        newStatus = selectedGuest.status;
      }
      await updateGuest(selectedGuest.id, { status: newStatus });

      const updatedGuest = { ...selectedGuest, payments: updatedPayments, totalPaid: newTotalPaid, status: newStatus };
      setSelectedGuest(updatedGuest);
      setGuests((prev) =>
        prev.map((g) => (g.id === selectedGuest.id ? updatedGuest : g))
      );
    }
  };

  // Families for filter
  const families = Array.from(new Set(guests.map((g) => g.family).filter(Boolean))).sort();

  const filteredGuests = familyFilter
    ? guests.filter((g) => g.family === familyFilter)
    : guests;

  const counts = {
    total: guests.length,
    confirmado: guests.filter((g) => g.status === 'confirmado').length,
    pago: guests.filter((g) => g.status === 'pago_total' || g.status === 'pago_parcial').length,
    nao_vem: guests.filter((g) => g.status === 'nao_vem').length,
    pendente: guests.filter((g) => g.status === 'pendente').length,
  };

  const getStatusLabel = (guest: Guest) => {
    const guestPrice = getGuestPrice(guest);
    if (guest.status === 'pago_parcial') {
      const remaining = guestPrice - (guest.totalPaid || 0);
      return `Parcial - Faltam ${formatCurrency(remaining > 0 ? remaining : 0)}`;
    }
    if (guest.status === 'pago_total') return 'Pago totalmente';
    return STATUS_CONFIG[guest.status].label;
  };

  const groupedGuests = () => {
    const sorted = [...filteredGuests].sort((a, b) => {
      const fa = (a.family || '').toLowerCase();
      const fb = (b.family || '').toLowerCase();
      if (fa < fb) return -1;
      if (fa > fb) return 1;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  };

  const renderGuest = ({ item }: { item: Guest }) => {
    const config = STATUS_CONFIG[item.status];
    return (
      <View style={styles.guestCard}>
        <TouchableOpacity style={styles.guestInfoArea} onPress={() => handleOpenDetail(item)} activeOpacity={0.7}>
          <View style={styles.guestHeader}>
            <View style={styles.guestNameRow}>
              <Ionicons name="person" size={22} color="#5D4037" />
              <Text style={styles.guestName}>{item.name}</Text>
            </View>
            <View style={styles.guestRightCol}>
              {item.isChild ? (
                <View style={[styles.familyBadge, { backgroundColor: '#FFF8E1' }]}>
                  <Ionicons name="happy" size={14} color="#F57C00" />
                  <Text style={[styles.familyBadgeText, { color: '#F57C00' }]}>Criança</Text>
                </View>
              ) : null}
              {item.family ? (
                <View style={styles.familyBadge}>
                  <Ionicons name="people" size={14} color="#6D4C41" />
                  <Text style={styles.familyBadgeText}>{item.family}</Text>
                </View>
              ) : null}
              <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon as any} size={18} color={config.color} />
                <Text style={[styles.statusText, { color: config.color }]}>{getStatusLabel(item)}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: STATUS_CONFIG.confirmado.bg }]}
            onPress={() => handleStatusChange(item, 'confirmado')}
          >
            <Ionicons name="checkmark-circle" size={22} color={STATUS_CONFIG.confirmado.color} />
            <Text style={[styles.actionLabel, { color: STATUS_CONFIG.confirmado.color }]}>Confirmado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#E3F2FD' }]}
            onPress={() => handleStatusChange(item, 'pago_parcial')}
          >
            <Ionicons name="wallet-outline" size={22} color="#1565C0" />
            <Text style={[styles.actionLabel, { color: '#1565C0' }]}>Pago</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: STATUS_CONFIG.nao_vem.bg }]}
            onPress={() => handleStatusChange(item, 'nao_vem')}
          >
            <Ionicons name="close-circle" size={22} color={STATUS_CONFIG.nao_vem.color} />
            <Text style={[styles.actionLabel, { color: STATUS_CONFIG.nao_vem.color }]}>Não Vem</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.trashBtn]}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={22} color="#999" />
          </TouchableOpacity>
        </View>
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
    <View style={styles.container}>
      {/* Summary Cards 2x2 */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFF8E1' }]}>
            <Text style={styles.summaryNumber}>{counts.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.summaryNumber}>{counts.confirmado}</Text>
            <Text style={styles.summaryLabel}>Confirmados</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.summaryNumber}>{counts.pago}</Text>
            <Text style={styles.summaryLabel}>Pagos</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={styles.summaryNumber}>{counts.nao_vem}</Text>
            <Text style={styles.summaryLabel}>Não Vem</Text>
          </View>
        </View>
      </View>

      {/* Family Filter */}
      {families.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !familyFilter && styles.filterChipActive]}
              onPress={() => setFamilyFilter(null)}
            >
              <Text style={[styles.filterChipText, !familyFilter && styles.filterChipTextActive]}>Todas</Text>
            </TouchableOpacity>
            {families.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, familyFilter === f && styles.filterChipActive]}
                onPress={() => setFamilyFilter(familyFilter === f ? null : f)}
              >
                <Text style={[styles.filterChipText, familyFilter === f && styles.filterChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputSection}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Nome do convidado..."
            placeholderTextColor="#A1887F"
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Família"
            placeholderTextColor="#A1887F"
            value={newFamily}
            onChangeText={setNewFamily}
          />
        </View>
        <View style={styles.childToggleRow}>
          <Text style={styles.childToggleLabel}>É criança? (R$ 75,00)</Text>
          <Switch
            value={newIsChild}
            onValueChange={setNewIsChild}
            trackColor={{ false: '#D7CCC8', true: '#A5D6A7' }}
            thumbColor={newIsChild ? '#2E7D32' : '#BDBDBD'}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddGuest}>
          <Ionicons name="person-add" size={22} color="#FFF" />
          <Text style={styles.addButtonText}>Adicionar Convidado</Text>
        </TouchableOpacity>
      </View>

      {/* Guest List */}
      <FlatList
        data={groupedGuests()}
        keyExtractor={(item) => item.id}
        renderItem={renderGuest}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#D7CCC8" />
            <Text style={styles.emptyText}>Nenhum convidado adicionado</Text>
            <Text style={styles.emptySubText}>Adicione convidados usando o campo acima</Text>
          </View>
        }
      />

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

            {selectedGuest && (
              <Text style={styles.modalSubtitle}>
                {selectedGuest.name} — Já pago: {formatCurrency(selectedGuest.totalPaid || 0)} de {formatCurrency(paymentIsChild ? PRICE_PER_CHILD : PRICE_PER_GUEST)}
              </Text>
            )}

            {/* Child toggle */}
            <View style={styles.childToggleRow}>
              <Text style={styles.childToggleLabel}>É criança? (R$ 75,00)</Text>
              <Switch
                value={paymentIsChild}
                onValueChange={(val) => {
                  setPaymentIsChild(val);
                  if (paymentType === 'total' && selectedGuest) {
                    const price = val ? PRICE_PER_CHILD : PRICE_PER_GUEST;
                    const rest = price - (selectedGuest.totalPaid || 0);
                    setPaymentAmount(rest > 0 ? rest.toFixed(2).replace('.', ',') : '');
                  }
                }}
                trackColor={{ false: '#D7CCC8', true: '#A5D6A7' }}
                thumbColor={paymentIsChild ? '#2E7D32' : '#BDBDBD'}
              />
            </View>

            <View style={styles.paymentTypeRow}>
              <TouchableOpacity
                style={[styles.paymentTypeBtn, paymentType === 'parcial' && styles.paymentTypeBtnActive]}
                onPress={() => {
                  setPaymentType('parcial');
                  setPaymentAmount('');
                }}
              >
                <Ionicons name="wallet-outline" size={22} color={paymentType === 'parcial' ? '#FFF' : '#1565C0'} />
                <Text style={[styles.paymentTypeText, paymentType === 'parcial' && { color: '#FFF' }]}>Parcialmente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentTypeBtn, paymentType === 'total' && styles.paymentTypeBtnActiveGreen]}
                onPress={() => {
                  setPaymentType('total');
                  if (selectedGuest) {
                    const price = paymentIsChild ? PRICE_PER_CHILD : PRICE_PER_GUEST;
                    const rest = price - (selectedGuest.totalPaid || 0);
                    setPaymentAmount(rest > 0 ? rest.toFixed(2).replace('.', ',') : '');
                  }
                }}
              >
                <Ionicons name="checkmark-done-circle" size={22} color={paymentType === 'total' ? '#FFF' : '#00695C'} />
                <Text style={[styles.paymentTypeText, paymentType === 'total' && { color: '#FFF' }]}>Totalmente</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Valor (R$)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 50,00"
              placeholderTextColor="#A1887F"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Data do Pagamento (DD/MM/AAAA)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 15/03/2026"
              placeholderTextColor="#A1887F"
              value={paymentDate}
              onChangeText={setPaymentDate}
              keyboardType="default"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handlePaymentSubmit}>
              <Ionicons name="checkmark" size={24} color="#FFF" />
              <Text style={styles.submitBtnText}>Confirmar Pagamento</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============ GUEST DETAIL MODAL ============ */}
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
              <Text style={styles.modalTitle}>{selectedGuest?.name}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={28} color="#5D4037" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedGuest && (
                <>
                  {/* Status & Info */}
                  <View style={styles.detailInfoRow}>
                    <View style={[styles.detailInfoCard, { backgroundColor: STATUS_CONFIG[selectedGuest.status].bg }]}>
                      <Ionicons name={STATUS_CONFIG[selectedGuest.status].icon as any} size={24} color={STATUS_CONFIG[selectedGuest.status].color} />
                      <Text style={[styles.detailInfoLabel, { color: STATUS_CONFIG[selectedGuest.status].color }]}>{getStatusLabel(selectedGuest)}</Text>
                    </View>
                    {selectedGuest.family ? (
                      <View style={[styles.detailInfoCard, { backgroundColor: '#EFEBE9' }]}>
                        <Ionicons name="people" size={24} color="#5D4037" />
                        <Text style={[styles.detailInfoLabel, { color: '#5D4037' }]}>{selectedGuest.family}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Payment Summary */}
                  <View style={styles.paymentSummaryCard}>
                    <Text style={styles.paymentSummaryTitle}>Resumo de Pagamento</Text>
                    <View style={styles.paymentSummaryRow}>
                      <Text style={styles.paymentSummaryLabel}>Valor do convite{selectedGuest.isChild ? ' (criança)' : ''}:</Text>
                      <Text style={styles.paymentSummaryValue}>{formatCurrency(getGuestPrice(selectedGuest))}</Text>
                    </View>
                    <View style={styles.paymentSummaryRow}>
                      <Text style={styles.paymentSummaryLabel}>Total pago:</Text>
                      <Text style={[styles.paymentSummaryValue, { color: '#2E7D32' }]}>{formatCurrency(selectedGuest.totalPaid || 0)}</Text>
                    </View>
                    <View style={[styles.paymentSummaryRow, { borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 }]}>
                      <Text style={[styles.paymentSummaryLabel, { fontWeight: '700' }]}>Restante:</Text>
                      <Text style={[styles.paymentSummaryValue, { color: '#C62828', fontWeight: '800' }]}>
                        {formatCurrency(Math.max(0, getGuestPrice(selectedGuest) - (selectedGuest.totalPaid || 0)))}
                      </Text>
                    </View>
                  </View>

                  {/* Payment History */}
                  <Text style={styles.sectionTitle}>Histórico de Pagamentos</Text>
                  {(!selectedGuest.payments || selectedGuest.payments.length === 0) ? (
                    <View style={styles.emptyPayments}>
                      <Ionicons name="receipt-outline" size={40} color="#D7CCC8" />
                      <Text style={styles.emptyPaymentsText}>Nenhum pagamento registrado</Text>
                    </View>
                  ) : (
                    selectedGuest.payments.map((p) => (
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
                      setDetailModalVisible(false);
                      setTimeout(() => {
                        setPaymentType('parcial');
                        setPaymentAmount('');
                        setPaymentDate('');
                        setPaymentIsChild(!!selectedGuest.isChild);
                        setPaymentModalVisible(true);
                      }, 300);
                    }}
                  >
                    <Ionicons name="add-circle" size={22} color="#FFF" />
                    <Text style={styles.addPaymentBtnText}>Novo Pagamento</Text>
                  </TouchableOpacity>

                  {/* Observations */}
                  <Text style={styles.sectionTitle}>Observações</Text>
                  <TextInput
                    style={styles.obsInput}
                    placeholder="Anotações sobre este convidado..."
                    placeholderTextColor="#A1887F"
                    value={obsText}
                    onChangeText={setObsText}
                    multiline
                    numberOfLines={4}
                  />
                  <TouchableOpacity style={styles.saveObsBtn} onPress={handleSaveObservations}>
                    <Ionicons name="save" size={20} color="#FFF" />
                    <Text style={styles.saveObsBtnText}>Salvar Observações</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF3E0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF3E0' },
  loadingText: { marginTop: 12, fontSize: 18, color: '#5D4037' },

  // Summary
  summaryGrid: {
    paddingHorizontal: 12,
    paddingTop: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryNumber: { fontSize: 26, fontWeight: '800', color: '#3E2723' },
  summaryLabel: { fontSize: 13, color: '#5D4037', marginTop: 2, fontWeight: '600' },

  // Filter
  filterSection: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EFEBE9',
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
  },
  filterChipActive: {
    backgroundColor: '#5D4037',
    borderColor: '#5D4037',
  },
  filterChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5D4037',
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  // Input
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

  // List
  list: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 30 },
  guestCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  guestInfoArea: {
    marginBottom: 12,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  guestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingTop: 4,
  },
  guestName: { fontSize: 19, fontWeight: '700', color: '#3E2723', flexShrink: 1 },
  guestRightCol: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  familyBadgeText: { fontSize: 13, fontWeight: '600', color: '#6D4C41' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: { fontSize: 15, fontWeight: '700' },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  trashBtn: {
    flex: 0,
    width: 44,
    backgroundColor: '#F5F5F5',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 20, color: '#8D6E63', marginTop: 16, fontWeight: '700' },
  emptySubText: { fontSize: 16, color: '#A1887F', marginTop: 4 },

  // Modal common
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

  // Payment type
  paymentTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    backgroundColor: '#E3F2FD',
    borderWidth: 1.5,
    borderColor: '#BBDEFB',
  },
  paymentTypeBtnActive: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  paymentTypeBtnActiveGreen: {
    backgroundColor: '#00695C',
    borderColor: '#00695C',
  },
  paymentTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
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

  childToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FFE082',
  },
  childToggleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
  },

  // Detail modal
  detailInfoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  detailInfoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
  },
  detailInfoLabel: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },

  paymentSummaryCard: {
    backgroundColor: '#FAF3E0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E0D8',
  },
  paymentSummaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 10,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentSummaryLabel: {
    fontSize: 16,
    color: '#5D4037',
  },
  paymentSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3E2723',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 10,
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

  obsInput: {
    backgroundColor: '#FAF3E0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    color: '#3E2723',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveObsBtn: {
    backgroundColor: '#5D4037',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  saveObsBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
