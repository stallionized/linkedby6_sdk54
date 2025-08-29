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
import { signOut, getSession } from './Auth';
import { supabase } from './supabaseClient';

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

const MobileBottomNavigation = ({ navigation, activeRoute }) => {
  const insets = useSafeAreaInsets();
  const [businessIdExists, setBusinessIdExists] = useState(false);

  // Check if user has business profile on mount (matching CustomSidebar logic)
  useEffect(() => {
    const checkBusinessId = async () => {
      try {
        const session = await getSession();
        if (!session || !session.user) {
          console.log('useEffect: No session or user, assuming no business_id.');
          setBusinessIdExists(false);
          return;
        }
        const userId = session.user.id;
        console.log('useEffect: Checking business association for user_id:', userId);

        // Check 1: Direct link in business_profiles (owner/creator)
        const { data: directProfileData, error: directProfileError } = await supabase
          .from('business_profiles')
          .select('business_id') 
          .eq('user_id', userId)
          .limit(1);

        if (directProfileError) {
          console.error('useEffect: Error fetching from business_profiles:', directProfileError.message);
        } else if (directProfileData && directProfileData.length > 0 && directProfileData[0].business_id) {
          console.log('useEffect: User directly linked in business_profiles table.');
          setBusinessIdExists(true);
          return;
        }

        // Check 2: Link in business_employees
        const { data: employeeProfileData, error: employeeProfileError } = await supabase
          .from('business_employees')
          .select('business_id')
          .eq('user_id', userId)
          .limit(1);

        if (employeeProfileError) {
          console.error('useEffect: Error fetching from business_employees:', employeeProfileError.message);
        } else if (employeeProfileData && employeeProfileData.length > 0 && employeeProfileData[0].business_id) {
          console.log('useEffect: User linked in business_employees table.');
          setBusinessIdExists(true);
          return;
        }
        
        // Check 3: Fallback to master_neo4j via phone number
        let userPhone = null;
        if (session.user.phone) {
          userPhone = session.user.phone;
        } else if (session.user.user_metadata && session.user.user_metadata.phone) {
          userPhone = session.user.user_metadata.phone;
        }

        if (userPhone) {
          console.log('useEffect: Fallback check - master_neo4j for phone:', userPhone);
          const { data: masterNeo4jData, error: masterNeo4jError } = await supabase
            .from('master_neo4j')
            .select('business_id')
            .eq('user_phone_number', userPhone)
            .maybeSingle();

          if (masterNeo4jError) {
            console.error('useEffect: Error fetching from master_neo4j:', masterNeo4jError.message);
          } else if (masterNeo4jData && masterNeo4jData.business_id && String(masterNeo4jData.business_id).trim() !== "") {
            console.log('useEffect: User linked via master_neo4j table.');
            setBusinessIdExists(true);
            return;
          }
        }
        
        // No business_id association found
        setBusinessIdExists(false);
      } catch (e) {
        console.error('useEffect: Unexpected error in checkBusinessId:', e.message);
        setBusinessIdExists(false); 
      }
    };
    checkBusinessId();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const navigateToScreen = (screenName) => {
    try {
      if (screenName === 'Logout') {
        handleLogout();
        return;
      }

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

  // Define navigation tabs based on CustomSidebar schema
  const getNavigationTabs = () => {
    const baseTabs = [
      {
        id: 'Search',
        icon: 'search',
        iconType: 'MaterialIcons',
        route: 'Search',
      },
      {
        id: 'Recommended',
        icon: 'favorite-border',
        iconType: 'MaterialIcons',
        route: 'RecommendedBusinesses',
      },
      {
        id: 'Queue',
        icon: 'playlist-add',
        iconType: 'MaterialIcons',
        route: 'ProjectQueue',
      },
      {
        id: 'Messages',
        icon: 'message',
        iconType: 'MaterialIcons',
        route: 'Messages',
      }
    ];

    return baseTabs;
  };

  const handleTabPress = (tab) => {
    if (tab.isMoreButton) {
      showMoreMenu();
    } else {
      navigateToScreen(tab.route);
    }
  };

  const showMoreMenu = () => {
    // Updated more options to include Settings and reorganize the menu
    const moreOptions = [
      {
        title: 'Connections',
        route: 'Connections',
        icon: 'people',
      },
      {
        title: businessIdExists ? 'Business Profile' : 'Business Pricing',
        route: businessIdExists ? 'BusinessProfile' : 'BusinessPricing',
        icon: businessIdExists ? 'work' : 'monetization-on',
      },
      ...(businessIdExists ? [{
        title: 'Analytics',
        route: 'BusinessAnalytics',
        icon: 'analytics',
      }] : []),
      {
        title: 'Settings',
        route: 'Settings',
        icon: 'settings',
      },
      {
        title: 'Sign Out',
        route: 'Logout',
        icon: 'logout',
        isDestructive: true,
      },
    ];

    Alert.alert(
      'More Options',
      'Choose an option:',
      [
        ...moreOptions.map(option => ({
          text: option.title,
          style: option.isDestructive ? 'destructive' : 'default',
          onPress: () => {
            if (option.route === 'Logout') {
              handleLogout();
            } else {
              navigateToScreen(option.route);
            }
          },
        })),
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const tabs = getNavigationTabs();

  // Check if current route should show active state for More button
  const isMoreMenuActive = () => {
    const moreMenuRoutes = [
      'Connections',
      'BusinessProfile',
      'BusinessPricing', 
      'BusinessAnalytics',
      'Settings'
    ];
    return moreMenuRoutes.includes(activeRoute);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          let isActive;
          if (tab.isMoreButton) {
            isActive = isMoreMenuActive();
          } else {
            isActive = activeRoute === tab.route || activeRoute === tab.id;
          }
          
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

export default MobileBottomNavigation;
