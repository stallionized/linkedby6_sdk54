import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import MobileHeader from './MobileHeader';
import MobileBusinessNavigation from './MobileBusinessNavigation';
import LeadStatusBadge, { getLeadStageConfig } from './components/LeadStatusBadge';

const { width: screenWidth } = Dimensions.get('window');

const colors = {
  primaryBlue: '#1E88E5',
  primaryGreen: '#10B981',
  lightGreen: '#6EE7B7',
  darkGreen: '#047857',
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

const BusinessAnalyticsScreen = ({ navigation, isBusinessMode, onBusinessModeToggle }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [leadMetrics, setLeadMetrics] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal: 0,
    won: 0,
    lost: 0,
    no_response: 0,
  });
  const [conversionRate, setConversionRate] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(null);
  const [lostReasons, setLostReasons] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (user) {
      fetchBusinessProfile();
    }
  }, [user]);

  useEffect(() => {
    if (businessProfile?.business_id) {
      fetchAllMetrics();
    }
  }, [businessProfile]);

  const fetchBusinessProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile && !error) {
        setBusinessProfile(profile);
      }
    } catch (error) {
      console.log('No business profile found');
    }
  };

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeadFunnel(),
        fetchConversionRate(),
        fetchLostReasons(),
        fetchRecentActivity(),
      ]);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadFunnel = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('lead_stage')
        .eq('business_id', businessProfile.business_id);

      if (error) throw error;

      const counts = {
        total: data.length,
        new: 0,
        contacted: 0,
        qualified: 0,
        proposal: 0,
        won: 0,
        lost: 0,
        no_response: 0,
      };

      data.forEach(conv => {
        const stage = conv.lead_stage || 'new';
        if (counts[stage] !== undefined) {
          counts[stage]++;
        }
      });

      setLeadMetrics(counts);
    } catch (error) {
      console.error('Error fetching lead funnel:', error);
    }
  };

  const fetchConversionRate = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('lead_stage')
        .eq('business_id', businessProfile.business_id)
        .in('lead_stage', ['won', 'lost', 'no_response']);

      if (error) throw error;

      const wonCount = data.filter(c => c.lead_stage === 'won').length;
      const totalClosed = data.length;

      const rate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;
      setConversionRate(rate);
    } catch (error) {
      console.error('Error fetching conversion rate:', error);
    }
  };

  const fetchLostReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('lead_outcome_reason')
        .eq('business_id', businessProfile.business_id)
        .eq('lead_stage', 'lost')
        .not('lead_outcome_reason', 'is', null);

      if (error) throw error;

      // Count reasons
      const reasonCounts = {};
      data.forEach(conv => {
        const reason = conv.lead_outcome_reason;
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      // Convert to array and sort
      const reasonsArray = Object.entries(reasonCounts)
        .map(([reason, count]) => ({
          reason: formatReason(reason),
          count,
          percentage: data.length > 0 ? Math.round((count / data.length) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setLostReasons(reasonsArray);
    } catch (error) {
      console.error('Error fetching lost reasons:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_lead_history')
        .select(`
          id,
          previous_stage,
          new_stage,
          reason,
          created_at,
          conversation_id
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get conversation details for each activity
      if (data && data.length > 0) {
        const conversationIds = [...new Set(data.map(a => a.conversation_id))];
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, user_id')
          .in('id', conversationIds)
          .eq('business_id', businessProfile.business_id);

        const validConvIds = new Set(conversations?.map(c => c.id) || []);
        const filteredActivity = data.filter(a => validConvIds.has(a.conversation_id));

        // Get user names
        const userIds = [...new Set(conversations?.map(c => c.user_id) || [])];
        const { data: users } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const userMap = {};
        users?.forEach(u => { userMap[u.user_id] = u.full_name; });

        const convUserMap = {};
        conversations?.forEach(c => { convUserMap[c.id] = userMap[c.user_id] || 'Unknown'; });

        const activityWithNames = filteredActivity.map(a => ({
          ...a,
          customerName: convUserMap[a.conversation_id] || 'Unknown Customer',
        }));

        setRecentActivity(activityWithNames);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const formatReason = (reason) => {
    const reasonLabels = {
      price_too_high: 'Price Too High',
      chose_competitor: 'Chose Competitor',
      timing_not_right: 'Timing Not Right',
      not_qualified: 'Not Qualified',
      no_response: 'No Response',
      other: 'Other',
    };
    return reasonLabels[reason] || reason;
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllMetrics();
    setRefreshing(false);
  }, [businessProfile]);

  const renderLeadFunnelCard = () => {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'won'];
    const maxCount = Math.max(...stages.map(s => leadMetrics[s])) || 1;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="funnel" size={24} color={colors.primaryBlue} />
          <Text style={styles.cardTitle}>Lead Funnel</Text>
        </View>
        <View style={styles.funnelContainer}>
          {stages.map((stage) => {
            const config = getLeadStageConfig(stage);
            const count = leadMetrics[stage] || 0;
            const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <View key={stage} style={styles.funnelRow}>
                <View style={styles.funnelLabel}>
                  <LeadStatusBadge stage={stage} size="small" showLabel={true} />
                </View>
                <View style={styles.funnelBarContainer}>
                  <View
                    style={[
                      styles.funnelBar,
                      { width: `${Math.max(width, 5)}%`, backgroundColor: config.color },
                    ]}
                  />
                </View>
                <Text style={styles.funnelCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMetricsRow = () => (
    <View style={styles.metricsRow}>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{leadMetrics.total}</Text>
        <Text style={styles.metricLabel}>Total Leads</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={[styles.metricValue, { color: colors.success }]}>{conversionRate}%</Text>
        <Text style={styles.metricLabel}>Conversion Rate</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={[styles.metricValue, { color: colors.primaryBlue }]}>{leadMetrics.new}</Text>
        <Text style={styles.metricLabel}>New Leads</Text>
      </View>
    </View>
  );

  const renderOutcomesCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="pie-chart" size={24} color={colors.primaryBlue} />
        <Text style={styles.cardTitle}>Lead Outcomes</Text>
      </View>
      <View style={styles.outcomesContainer}>
        <View style={styles.outcomeItem}>
          <View style={[styles.outcomeIndicator, { backgroundColor: colors.success }]} />
          <Text style={styles.outcomeLabel}>Won</Text>
          <Text style={styles.outcomeValue}>{leadMetrics.won}</Text>
        </View>
        <View style={styles.outcomeItem}>
          <View style={[styles.outcomeIndicator, { backgroundColor: colors.error }]} />
          <Text style={styles.outcomeLabel}>Lost</Text>
          <Text style={styles.outcomeValue}>{leadMetrics.lost}</Text>
        </View>
        <View style={styles.outcomeItem}>
          <View style={[styles.outcomeIndicator, { backgroundColor: colors.textLight }]} />
          <Text style={styles.outcomeLabel}>No Response</Text>
          <Text style={styles.outcomeValue}>{leadMetrics.no_response}</Text>
        </View>
      </View>
    </View>
  );

  const renderLostReasonsCard = () => {
    if (lostReasons.length === 0) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="analytics" size={24} color={colors.error} />
          <Text style={styles.cardTitle}>Lost Lead Reasons</Text>
        </View>
        <View style={styles.reasonsContainer}>
          {lostReasons.map((item, index) => (
            <View key={index} style={styles.reasonItem}>
              <View style={styles.reasonBar}>
                <View
                  style={[
                    styles.reasonBarFill,
                    { width: `${item.percentage}%` },
                  ]}
                />
              </View>
              <View style={styles.reasonInfo}>
                <Text style={styles.reasonLabel}>{item.reason}</Text>
                <Text style={styles.reasonCount}>{item.count} ({item.percentage}%)</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRecentActivityCard = () => {
    if (recentActivity.length === 0) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time" size={24} color={colors.primaryBlue} />
          <Text style={styles.cardTitle}>Recent Activity</Text>
        </View>
        <View style={styles.activityList}>
          {recentActivity.slice(0, 5).map((activity, index) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityName}>{activity.customerName}</Text>
                  {' moved from '}
                  <Text style={styles.activityStage}>{activity.previous_stage || 'new'}</Text>
                  {' to '}
                  <Text style={styles.activityStage}>{activity.new_stage}</Text>
                </Text>
                <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="analytics-outline" size={64} color={colors.textLight} />
      <Text style={styles.emptyTitle}>No Data Yet</Text>
      <Text style={styles.emptyText}>
        Start receiving leads to see your analytics dashboard populate with insights.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <MobileHeader
        navigation={navigation}
        title="Lead Analytics"
        showBackButton={false}
        isBusinessMode={isBusinessMode}
        onBusinessModeToggle={onBusinessModeToggle}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : leadMetrics.total === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {renderMetricsRow()}
            {renderLeadFunnelCard()}
            {renderOutcomesCard()}
            {renderLostReasonsCard()}
            {renderRecentActivityCard()}
          </>
        )}
      </ScrollView>

      <MobileBusinessNavigation navigation={navigation} activeRoute="BusinessAnalytics" visible={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMedium,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textMedium,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginLeft: 12,
  },
  funnelContainer: {
    gap: 12,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  funnelLabel: {
    width: 100,
  },
  funnelBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  funnelBar: {
    height: '100%',
    borderRadius: 4,
  },
  funnelCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  outcomesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  outcomeItem: {
    alignItems: 'center',
  },
  outcomeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  outcomeLabel: {
    fontSize: 12,
    color: colors.textMedium,
    marginBottom: 4,
  },
  outcomeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  reasonsContainer: {
    gap: 12,
  },
  reasonItem: {
    gap: 8,
  },
  reasonBar: {
    height: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  reasonBarFill: {
    height: '100%',
    backgroundColor: colors.error,
    borderRadius: 4,
  },
  reasonInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reasonLabel: {
    fontSize: 14,
    color: colors.textDark,
  },
  reasonCount: {
    fontSize: 14,
    color: colors.textMedium,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryBlue,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 20,
  },
  activityName: {
    fontWeight: '600',
    color: colors.textDark,
  },
  activityStage: {
    fontWeight: '500',
    color: colors.primaryBlue,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default BusinessAnalyticsScreen;
