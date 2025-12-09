import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';

const colors = {
  primaryBlue: '#1E88E5',
  lightBlue: '#90CAF9',
  darkBlue: '#0D47A1',
  backgroundGray: '#F5F7FA',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textLight: '#90A4AE',
  borderLight: '#E0E7FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

const AccessCodeManagementScreen = ({ navigation }) => {
  const [accessCodes, setAccessCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New code form state
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState('');
  const [newCodeCount, setNewCodeCount] = useState('1');
  const [isCreating, setIsCreating] = useState(false);

  const fetchAccessCodes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching access codes:', error);
        Alert.alert('Error', 'Failed to load access codes');
        return;
      }

      setAccessCodes(data || []);
    } catch (error) {
      console.error('Exception fetching access codes:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccessCodes();
  }, [fetchAccessCodes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccessCodes();
  };

  // Generate random access code
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create new access code(s)
  const handleCreateCodes = async () => {
    const count = parseInt(newCodeCount) || 1;
    const maxUses = newCodeMaxUses ? parseInt(newCodeMaxUses) : null;

    if (count < 1 || count > 100) {
      Alert.alert('Error', 'Please enter a number between 1 and 100');
      return;
    }

    setIsCreating(true);
    try {
      const codes = [];
      for (let i = 0; i < count; i++) {
        codes.push({
          code: generateCode(),
          name: newCodeName || `Generated Code ${new Date().toLocaleDateString()}`,
          max_uses: maxUses,
          current_uses: 0,
          is_active: true,
        });
      }

      const { error } = await supabase.from('access_codes').insert(codes);

      if (error) {
        console.error('Error creating access codes:', error);
        Alert.alert('Error', 'Failed to create access codes');
        return;
      }

      Alert.alert('Success', `Created ${count} access code(s)`);
      setShowCreateModal(false);
      setNewCodeName('');
      setNewCodeMaxUses('');
      setNewCodeCount('1');
      fetchAccessCodes();
    } catch (error) {
      console.error('Exception creating codes:', error);
      Alert.alert('Error', 'Failed to create access codes');
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle code active status
  const toggleCodeStatus = async (codeId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('access_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId);

      if (error) {
        console.error('Error updating code status:', error);
        Alert.alert('Error', 'Failed to update code status');
        return;
      }

      fetchAccessCodes();
    } catch (error) {
      console.error('Exception updating code:', error);
    }
  };

  // Delete access code
  const handleDeleteCode = (codeId, codeName) => {
    Alert.alert(
      'Delete Access Code',
      `Are you sure you want to delete "${codeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('access_codes')
                .delete()
                .eq('id', codeId);

              if (error) {
                console.error('Error deleting code:', error);
                Alert.alert('Error', 'Failed to delete access code');
                return;
              }

              fetchAccessCodes();
            } catch (error) {
              console.error('Exception deleting code:', error);
            }
          },
        },
      ]
    );
  };

  const renderCodeItem = ({ item }) => {
    const usagePercent = item.max_uses
      ? Math.min((item.current_uses / item.max_uses) * 100, 100)
      : 0;
    const isExpired = item.valid_until && new Date(item.valid_until) < new Date();

    return (
      <View style={styles.codeCard}>
        <View style={styles.codeHeader}>
          <Text style={styles.codeText}>{item.code}</Text>
          <View style={[
            styles.statusBadge,
            !item.is_active && styles.statusInactive,
            isExpired && styles.statusExpired
          ]}>
            <Text style={styles.statusBadgeText}>
              {isExpired ? 'Expired' : item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <Text style={styles.codeName}>{item.name || 'Unnamed Code'}</Text>

        <View style={styles.usageContainer}>
          <Text style={styles.usageText}>
            Uses: {item.current_uses} {item.max_uses ? `/ ${item.max_uses}` : '(Unlimited)'}
          </Text>
          {item.max_uses && (
            <View style={styles.usageBar}>
              <View style={[styles.usageBarFill, { width: `${usagePercent}%` }]} />
            </View>
          )}
        </View>

        <View style={styles.codeActions}>
          <TouchableOpacity
            style={[styles.actionButton, item.is_active ? styles.deactivateButton : styles.activateButton]}
            onPress={() => toggleCodeStatus(item.id, item.is_active)}
          >
            <Ionicons
              name={item.is_active ? 'pause' : 'play'}
              size={16}
              color={colors.cardWhite}
            />
            <Text style={styles.actionButtonText}>
              {item.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteCode(item.id, item.name || item.code)}
          >
            <Ionicons name="trash" size={16} color={colors.cardWhite} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <MobileHeader navigation={navigation} title="Access Codes" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>Loading access codes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <MobileHeader navigation={navigation} title="Access Codes" />

      <View style={styles.content}>
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{accessCodes.length}</Text>
            <Text style={styles.statLabel}>Total Codes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {accessCodes.filter(c => c.is_active).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {accessCodes.reduce((sum, c) => sum + (c.current_uses || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total Uses</Text>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <LinearGradient
            colors={[colors.primaryBlue, colors.darkBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Ionicons name="add-circle" size={20} color={colors.cardWhite} />
            <Text style={styles.createButtonText}>Generate New Codes</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Codes List */}
        <FlatList
          data={accessCodes}
          renderItem={renderCodeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="key-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>No access codes yet</Text>
              <Text style={styles.emptySubtext}>
                Generate codes to control new user registrations
              </Text>
            </View>
          }
        />
      </View>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Access Codes</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={newCodeName}
                  onChangeText={setNewCodeName}
                  placeholder="e.g., Launch Party Codes"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Max Uses Per Code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={newCodeMaxUses}
                  onChangeText={setNewCodeMaxUses}
                  placeholder="Leave empty for unlimited"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Number of Codes to Generate</Text>
                <TextInput
                  style={styles.input}
                  value={newCodeCount}
                  onChangeText={setNewCodeCount}
                  placeholder="1"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCreateCodes}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color={colors.cardWhite} />
                ) : (
                  <>
                    <Ionicons name="add" size={20} color={colors.cardWhite} />
                    <Text style={styles.modalButtonText}>Generate Codes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MobileBottomNavigation navigation={navigation} activeRoute="Settings" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
  },
  content: {
    flex: 1,
    marginBottom: 70,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryBlue,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMedium,
    marginTop: 4,
  },
  createButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  createButtonText: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  codeCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    letterSpacing: 2,
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusInactive: {
    backgroundColor: colors.textLight,
  },
  statusExpired: {
    backgroundColor: colors.error,
  },
  statusBadgeText: {
    color: colors.cardWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  codeName: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 12,
  },
  usageContainer: {
    marginBottom: 12,
  },
  usageText: {
    fontSize: 14,
    color: colors.textDark,
    marginBottom: 6,
  },
  usageBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: colors.primaryBlue,
    borderRadius: 3,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activateButton: {
    backgroundColor: colors.success,
  },
  deactivateButton: {
    backgroundColor: colors.warning,
  },
  deleteButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 10,
  },
  actionButtonText: {
    color: colors.cardWhite,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMedium,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.textDark,
    backgroundColor: colors.backgroundGray,
  },
  modalButton: {
    backgroundColor: colors.primaryBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  modalButtonText: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccessCodeManagementScreen;
