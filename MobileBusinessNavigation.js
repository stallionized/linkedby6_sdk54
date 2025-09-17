import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

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

const MobileBusinessNavigation = ({ 
  navigation, 
  activeRoute, 
  visible = false // Initially hidden as requested
}) => {
  const insets = useSafeAreaInsets();

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  const navigateToScreen = (screenName) => {
    try {
      navigation.navigate(screenName);
    } catch (navError) {
      console.error(`Navigation error to ${screenName}:`, navError);
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: screenName }],
        });
      } catch (resetError) {
        console.error(`Reset navigation error to ${screenName}:`, resetError);
        Alert.alert('Navigation Error', `Could not navigate to ${screenName}`);
      }
    }
  };

  // Define business navigation tabs
  const getBusinessNavigationTabs = () => {
    return [
      {
        id: 'Analytics',
        icon: 'analytics',
        iconType: 'MaterialIcons',
        route: 'BusinessAnalytics',
        label: 'Analytics'
      },
      {
        id: 'Contacts',
        icon: 'people',
        iconType: 'MaterialIcons',
        route: 'BusinessConnections',
        label: 'Contacts'
      },
      {
        id: 'Dashboard',
        icon: 'dashboard',
        iconType: 'MaterialIcons',
        route: 'BusinessDashboard',
        label: 'Dashboard'
      },
      {
        id: 'Messages',
        icon: 'message',
        iconType: 'MaterialIcons',
        route: 'BusinessMessages',
        label: 'Messages'
      }
    ];
  };

  const handleTabPress = (tab) => {
    navigateToScreen(tab.route);
  };

  const tabs = getBusinessNavigationTabs();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeRoute === tab.route || activeRoute === tab.id;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.tabContent,
                isActive && styles.activeTabContent
              ]}>
                {tab.iconType === 'MaterialIcons' ? (
                  <MaterialIcons
                    name={tab.icon}
                    size={28}
                    color={colors.cardWhite}
                  />
                ) : (
                  <Ionicons
                    name={tab.icon}
                    size={28}
                    color={colors.cardWhite}
                  />
                )}
              </View>
              
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primaryBlue,
    borderTopWidth: 1,
    borderTopColor: colors.darkBlue,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: colors.primaryBlue,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 50,
    minHeight: 50,
  },
  activeTabContent: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    color: colors.cardWhite,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 30,
    height: 3,
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});

export default MobileBusinessNavigation;
