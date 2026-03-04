// ==========================================
// TELA - LISTA DE CONVIDADOS
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Guest, GuestStatus } from '../types';
import { fetchGuests, addGuest, updateGuestStatus, deleteGuest } from '../services/api';

const STATUS_CONFIG: Record<GuestStatus, { label: string; color: string; icon: string }> = {
  pendente: { label: 'Pendente', color: '#FFA726', icon: 'time-outline' },
  confirmado: { label: 'Confirmado', color: '#66BB6A', icon: 'checkmark-circle-outline' },
  nao_vem: { label: 'Não Vem', color: '#EF5350', icon: 'close-circle-outline' },
  pago: { label: 'Pago', color: '#42A5F5', icon: 'cash-outline' },
};

export default function GuestListScreen() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGuests = useCallback(async () => {
    const data = await fetchGuests();
    setGuests(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const handleAddGuest = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Erro', 'Digite o nome do convidado');
      return;
    }
    const guest = await addGuest(trimmed);
    if (guest) {
      setGuests((prev) => [...prev, guest]);
      setNewName('');
    } else {
      Alert.alert('Erro', 'Não foi possível adicionar o convidado');
    }
  };

  const handleStatusChange = async (id: string, status: GuestStatus) => {
    const success = await updateGuestStatus(id, status);
    if (success) {
      setGuests((prev) =>
        prev.map((g) => (g.id === id ? { ...g, status } : g))
      );
    }
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
          }
        },
      },
    ]);
  };

  const counts = {
    total: guests.length,
    confirmado: guests.filter((g) => g.status === 'confirmado').length,
    pago: guests.filter((g) => g.status === 'pago').length,
    nao_vem: guests.filter((g) => g.status === 'nao_vem').length,
    pendente: guests.filter((g) => g.status === 'pendente').length,
  };

  const renderGuest = ({ item }: { item: Guest }) => {
    const config = STATUS_CONFIG[item.status];
    return (
      <View style={styles.guestCard}>
        <View style={styles.guestInfo}>
          <Text style={styles.guestName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: STATUS_CONFIG.confirmado.color }]}
            onPress={() => handleStatusChange(item.id, 'confirmado')}
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: STATUS_CONFIG.pago.color }]}
            onPress={() => handleStatusChange(item.id, 'pago')}
          >
            <Ionicons name="cash" size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: STATUS_CONFIG.nao_vem.color }]}
            onPress={() => handleStatusChange(item.id, 'nao_vem')}
          >
            <Ionicons name="close" size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn]}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={16} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
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
      {/* Resumo */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.summaryNumber}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.summaryNumber}>{counts.confirmado}</Text>
          <Text style={styles.summaryLabel}>Confirmados</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.summaryNumber}>{counts.pago}</Text>
          <Text style={styles.summaryLabel}>Pagos</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
          <Text style={styles.summaryNumber}>{counts.nao_vem}</Text>
          <Text style={styles.summaryLabel}>Não Vem</Text>
        </View>
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nome do convidado..."
          placeholderTextColor="#999"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAddGuest}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddGuest}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={guests}
        keyExtractor={(item) => item.id}
        renderItem={renderGuest}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGuests(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Nenhum convidado adicionado</Text>
          </View>
        }
      />
    </View>
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
  summaryNumber: { fontSize: 20, fontWeight: '700', color: '#333' },
  summaryLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
  guestCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  guestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  guestName: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
});
