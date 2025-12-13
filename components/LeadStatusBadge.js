import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Lead stage configuration with colors and icons
const LEAD_STAGES = {
  new: {
    label: 'New',
    color: '#3B82F6', // Blue
    bgColor: '#EFF6FF',
    icon: 'sparkles',
  },
  contacted: {
    label: 'Contacted',
    color: '#F59E0B', // Yellow/Amber
    bgColor: '#FFFBEB',
    icon: 'chatbubble-ellipses',
  },
  qualified: {
    label: 'Qualified',
    color: '#F97316', // Orange
    bgColor: '#FFF7ED',
    icon: 'checkmark-circle',
  },
  proposal: {
    label: 'Proposal',
    color: '#8B5CF6', // Purple
    bgColor: '#F5F3FF',
    icon: 'document-text',
  },
  won: {
    label: 'Won',
    color: '#10B981', // Green
    bgColor: '#ECFDF5',
    icon: 'trophy',
  },
  lost: {
    label: 'Lost',
    color: '#EF4444', // Red
    bgColor: '#FEF2F2',
    icon: 'close-circle',
  },
  no_response: {
    label: 'No Response',
    color: '#6B7280', // Gray
    bgColor: '#F3F4F6',
    icon: 'time',
  },
};

const LeadStatusBadge = ({
  stage = 'new',
  size = 'medium', // 'small', 'medium', 'large'
  showIcon = true,
  showLabel = true,
  style,
}) => {
  const config = LEAD_STAGES[stage] || LEAD_STAGES.new;

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
      iconSize: 10,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
      iconSize: 12,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
      iconSize: 16,
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.medium;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={config.icon}
          size={currentSize.iconSize}
          color={config.color}
          style={showLabel ? styles.icon : null}
        />
      )}
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: config.color,
              fontSize: currentSize.fontSize,
            },
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  );
};

// Export stage configuration for use in other components
export const getLeadStageConfig = (stage) => LEAD_STAGES[stage] || LEAD_STAGES.new;
export const getAllLeadStages = () => Object.keys(LEAD_STAGES);
export const getActiveLeadStages = () => ['new', 'contacted', 'qualified', 'proposal'];
export const getClosedLeadStages = () => ['won', 'lost', 'no_response'];

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '600',
  },
});

export default LeadStatusBadge;
