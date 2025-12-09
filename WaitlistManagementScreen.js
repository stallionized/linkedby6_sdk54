import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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

const WaitlistManagementScreen = ({ navigation }) => {
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, converted

  const fetchWaitlist = useCallback(async () => {
    try {
      let query = supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('is_converted', false);
      } else if (filter === 'converted') {
        query = query.eq('is_converted', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching waitlist:', error);
        Alert.alert('Error', 'Failed to load waitlist');
        return;
      }

      setWaitlistEntries(data || []);
    } catch (error) {
      console.error('Exception fetching waitlist:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWaitlist();
  };

  // Delete waitlist entry
  const handleDeleteEntry = (entryId, email) => {
    Alert.alert(
      'Remove from Waitlist',
      `Remove ${email} from the waitlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('waitlist')
                .delete()
                .eq('id', entryId);

              if (error) {
                console.error('Error deleting entry:', error);
                Alert.alert('Error', 'Failed to remove entry');
                return;
              }

              fetchWaitlist();
            } catch (error) {
              console.error('Exception deleting entry:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getIntentBadge = (intent) => {
    if (intent === 'consumer_and_business') {
      return { text: 'Consumer + Business', color: colors.warning };
    }
    return { text: 'Consumer', color: colors.primaryBlue };
  };

  const getReasonText = (reason) => {
    switch (reason) {
      case 'outside_service_area':
        return 'Outside Service Area';
      case 'no_access_code':
        return 'No Access Code';
      default:
        return reason || 'Unknown';
    }
  };

  const renderEntry = ({ item }) => {
    const intentBadge = getIntentBadge(item.signup_intent);

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryInfo}>
            <Text style={styles.emailText}>{item.email}</Text>
            {item.phone && (
              <Text style={styles.phoneText}>{item.phone}</Text>
            )}
          </View>
          {item.is_converted && (
            <View style={styles.convertedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.cardWhite} />
              <Text style={styles.convertedText}>Converted</Text>
            </View>
          )}
        </View>

        <View style={styles.entryMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMedium} />
            <Text style={styles.metaText}>ZIP: {item.zip_code}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMedium} />
            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.entryBadges}>
          <View style={[styles.badge, { backgroundColor: intentBadge.color }]}>
            <Text style={styles.badgeText}>{intentBadge.text}</Text>
          </View>
          <View style={[styles.badge, styles.reasonBadge]}>
            <Text style={styles.reasonBadgeText}>{getReasonText(item.waitlist_reason)}</Text>
          </View>
          {item.sms_consent && (
            <View style={[styles.badge, styles.smsBadge]}>
              <Ionicons name="chatbubble" size={12} color={colors.success} />
              <Text style={styles.smsBadgeText}>SMS OK</Text>
            </View>
          )}
        </View>

        {!item.is_converted && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteEntry(item.id, item.email)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const FilterButton = ({ value, label, count }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterButtonText, filter === value && styles.filterButtonTextActive]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <MobileHeader navigation={navigation} title="Waitlist" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>Loading waitlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = waitlistEntries.filter(e => !e.is_converted).length;
  const convertedCount = waitlistEntries.filter(e => e.is_converted).length;
  const totalCount = waitlistEntries.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <MobileHeader navigation={navigation} title="Waitlist" />

      <View style={styles.content}>
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={colors.primaryBlue} />
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color={colors.warning} />
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.statValue}>{convertedCount}</Text>
            <Text style={styles.statLabel}>Converted</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <FilterButton value="all" label="All" count={totalCount} />
          <FilterButton value="pending" label="Pending" count={pendingCount} />
          <FilterButton value="converted" label="Converted" count={convertedCount} />
        </View>

        {/* Entries List */}
        <FlatList
          data={waitlistEntries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>No waitlist entries</Text>
              <Text style={styles.emptySubtext}>
                Users outside the service area will appear here
              </Text>
            </View>
          }
        />
      </View>

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
    color: colors.textDark,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMedium,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.cardWhite,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMedium,
  },
  filterButtonTextActive: {
    color: colors.cardWhite,
  },
  listContent: {
    paddingBottom: 16,
  },
  entryCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryInfo: {
    flex: 1,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  phoneText: {
    fontSize: 14,
    color: colors.textMedium,
    marginTop: 4,
  },
  convertedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  convertedText: {
    color: colors.cardWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  entryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: colors.textMedium,
  },
  entryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.cardWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  reasonBadge: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reasonBadgeText: {
    color: colors.textMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  smsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: colors.success,
    gap: 4,
  },
  smsBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
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
});

export default WaitlistManagementScreen;
