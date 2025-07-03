import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert, 
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileHeader from './MobileHeader';
import AddContactSlider from './AddContactSlider';
import EditContactSlider from './EditContactSlider';

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

const relationshipOptions = ['Customer', 'Friend', 'Colleague', 'Family', 'Partner'];

const ConnectionsScreen = ({ navigation, route }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // State for bulk operations
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [bulkRelationship, setBulkRelationship] = useState('Customer');
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // State for sliders
  const [showAddContactSlider, setShowAddContactSlider] = useState(false);
  const [showEditContactSlider, setShowEditContactSlider] = useState(false);
  const [currentEditContact, setCurrentEditContact] = useState(null);

  // Function to generate a consistent color from a business name
  const getColorFromName = (name) => {
    const colors = [
      '#FF5733', '#33A8FF', '#FF33A8', '#A833FF', '#33FF57', 
      '#FFD433', '#FF8333', '#3357FF', '#33FFEC', '#8CFF33'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Contact card component
  const ContactRowCard = ({ contact, onEdit }) => {
    const { id, name, phone, relationship, familyRelation, friendDetails, isExistingUser } = contact;
    const initial = name?.charAt(0).toUpperCase() || '?';

    const formattedRelationship = relationship
      ? relationship.charAt(0).toUpperCase() + relationship.slice(1).toLowerCase()
      : '';

    const relationshipColors = {
      Family: '#800000',
      Partner: '#C62828',
      Friend: '#43A047',
      Colleague: '#E65100',
      Customer: '#8E24AA',
    };

    const gradientMap = {
      Family: ['#A52A2A', '#800000'],
      Partner: ['#E53935', '#C62828'],
      Friend: ['#66BB6A', '#43A047'],
      Colleague: ['#FB8C00', '#E65100'],
      Customer: ['#BA68C8', '#8E24AA'],
    };

    const gradientColors = gradientMap[formattedRelationship] || ['#000', '#000'];
    const isSelected = selectedContacts.includes(id);

    return (
      <TouchableOpacity 
        style={[
          contactCardStyles.card,
          isSelected && contactCardStyles.selectedCard
        ]}
        onPress={() => toggleSelectContact(id)}
        onLongPress={() => onEdit(contact)}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={contactCardStyles.logoContainer}
        >
          <Text style={contactCardStyles.logoText}>{initial}</Text>
        </LinearGradient>
        
        <View style={contactCardStyles.infoContainer}>
          <Text style={contactCardStyles.name} numberOfLines={1}>{name}</Text>
          <Text style={contactCardStyles.phone} numberOfLines={1}>{phone}</Text>
          {isExistingUser && (
            <Text style={contactCardStyles.existingUserLabel}>Existing User</Text>
          )}
        </View>
        
        <View style={contactCardStyles.relationshipContainer}>
          <Text style={contactCardStyles.relationship} numberOfLines={2}>
            {formattedRelationship}
            {formattedRelationship === 'Family' && familyRelation ? `\n${familyRelation}` : ''}
            {formattedRelationship === 'Friend' && friendDetails ? `\n${friendDetails}` : ''}
          </Text>
        </View>
        
        <View style={contactCardStyles.actionsContainer}>
          <TouchableOpacity 
            style={contactCardStyles.editButton}
            onPress={() => onEdit(contact)}
          >
            <MaterialIcons name="edit" size={16} color={colors.cardWhite} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Load data
  const loadUserData = async () => {
    try {
      const session = await getSession();
      if (!session) {
        console.error('No user is logged in');
        return;
      }
      
      const userId = session.user.id;
      setCurrentUserId(userId);
      setUserId(userId);
      
      // Fetch business profile
      const { data: profileData, error: profileError } = await supabase
        .from('business_profiles')
        .select('business_id')
        .eq('user_id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching business profile:', profileError);
      }
      
      const currentBusinessId = profileData?.business_id || null;
      setBusinessId(currentBusinessId);
      
      // Fetch connections
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching connections:', error);
        Alert.alert('Error', 'Failed to load contacts');
      } else {
        const formattedContacts = data.map(conn => ({
          id: conn.id,
          name: conn.name,
          phone: conn.phone,
          relationship: conn.relationship,
          familyRelation: conn.family_relation,
          friendDetails: conn.friend_details
        }));
        
        setContacts(formattedContacts);
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
      Alert.alert('Error', 'Failed to load data');
    }
  };

  // Focus effect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadUserData().finally(() => setLoading(false));
    }, [])
  );

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  }, []);

  // Handle contact selection for bulk operations
  const toggleSelectContact = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(cid => cid !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
    
    if (selectedContacts.length > 0 || !selectedContacts.includes(contactId)) {
      setShowBulkActions(true);
    } else if (selectedContacts.length === 1 && selectedContacts.includes(contactId)) {
      setShowBulkActions(false);
    }
  };

  // Delete contacts in bulk
  const deleteBulkContacts = async () => {
    if (selectedContacts.length === 0) return;
    
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${selectedContacts.length} contact(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performBulkDelete }
      ]
    );
  };
  
  const performBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .in('id', selectedContacts);
        
      if (error) {
        console.error('Error deleting contacts:', error);
        Alert.alert('Error', 'Failed to delete contacts. Please try again.');
        return;
      }
      
      setContacts(contacts.filter(c => !selectedContacts.includes(c.id)));
      setSelectedContacts([]);
      setShowBulkActions(false);
      
      Alert.alert('Success', `${selectedContacts.length} contact(s) deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteBulkContacts:', error);
      Alert.alert('Error', 'An error occurred while deleting contacts.');
    }
  };

  // Apply bulk relationship change
  const applyBulkRelationship = async () => {
    try {
      for (const contactId of selectedContacts) {
        const currentContact = contacts.find(c => c.id === contactId);
        if (!currentContact) continue;
        
        const updateData = {
          relationship: bulkRelationship,
          family_relation: bulkRelationship === 'Family' ? currentContact.familyRelation : null,
          friend_details: bulkRelationship === 'Friend' ? currentContact.friendDetails : null
        };
        
        await supabase
          .from('connections')
          .update(updateData)
          .eq('id', contactId);
      }
      
      setContacts(contacts.map(c => {
        if (selectedContacts.includes(c.id)) {
          return { 
            ...c, 
            relationship: bulkRelationship,
            familyRelation: bulkRelationship === 'Family' ? c.familyRelation : null,
            friendDetails: bulkRelationship === 'Friend' ? c.friendDetails : null
          };
        }
        return c;
      }));
      
      setSelectedContacts([]);
      setShowBulkActions(false);
      
      Alert.alert('Success', `Updated ${selectedContacts.length} contact(s) to ${bulkRelationship} relationship.`);
    } catch (error) {
      console.error('Error in applyBulkRelationship:', error);
      Alert.alert('Error', 'An error occurred while updating relationships.');
    }
  };

  // Handle editing a contact
  const handleEditContact = (contact) => {
    setCurrentEditContact(contact);
    setShowEditContactSlider(true);
  };
  
  // Handle saving edited contact
  const handleSaveEditedContact = (updatedContact) => {
    setContacts(contacts.map(c => 
      c.id === updatedContact.id ? updatedContact : c
    ));
  };

  // Handle saving new contact
  const handleSaveContact = (contact) => {
    setContacts(prev => [...prev, contact]);
  };

  // Import contacts from device
  const importContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant contacts permission to import contacts.');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      if (data.length > 0) {
        // Show selection dialog or import all
        Alert.alert(
          'Import Contacts',
          `Found ${data.length} contacts. Import all as "Customer" relationship?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Import All', 
              onPress: () => processImportedContacts(data)
            }
          ]
        );
      } else {
        Alert.alert('No Contacts', 'No contacts found on this device.');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      Alert.alert('Error', 'Failed to import contacts.');
    }
  };

  const processImportedContacts = async (deviceContacts) => {
    try {
      if (!currentUserId) {
        Alert.alert('Authentication Error', 'You must be logged in to import contacts.');
        return;
      }
      
      const contactsToInsert = deviceContacts
        .filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
        .map(c => ({
          user_id: currentUserId,
          name: c.name,
          contact_phone_number: c.phoneNumbers[0].number,
          relationship: 'Customer',
          family_relation: null,
          friend_details: null
        }));
      
      if (contactsToInsert.length === 0) {
        Alert.alert('No Valid Contacts', 'No contacts with names and phone numbers found.');
        return;
      }
      
      const { data, error } = await supabase
        .from('connections')
        .insert(contactsToInsert)
        .select();
        
      if (error) {
        console.error('Error saving imported contacts:', error);
        Alert.alert('Error', 'Failed to save imported contacts. Please try again.');
        return;
      }
      
      const formattedContacts = data.map(conn => ({
        id: conn.id,
        name: conn.name,
        phone: conn.contact_phone_number,
        relationship: conn.relationship,
        familyRelation: conn.family_relation,
        friendDetails: conn.friend_details
      }));
      
      setContacts(prev => [...prev, ...formattedContacts]);
      Alert.alert('Success', `${formattedContacts.length} contacts imported successfully.`);
    } catch (error) {
      console.error('Error in processImportedContacts:', error);
      Alert.alert('Error', 'An error occurred while importing contacts.');
    }
  };

  // Render relationship tallies
  const renderTallies = () => {
    const counts = {};
    contacts.forEach(c => {
      const rel = (c.relationship || '').toLowerCase();
      counts[rel] = (counts[rel] || 0) + 1;
    });
    
    const categories = ['customer', 'friend', 'colleague', 'family', 'partner'];
    const total = contacts.length;
    
    const gradientMap = {
      family: ['#A52A2A', '#800000'],
      partner: ['#E53935', '#C62828'],
      friend: ['#66BB6A', '#43A047'],
      colleague: ['#FB8C00', '#E65100'],
      customer: ['#BA68C8', '#8E24AA'],
    };
    
    return (
      <View style={styles.tallyContainer}>
        <LinearGradient
          colors={['#1565C0', '#0D47A1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tallyBadge}
        >
          <Text style={styles.tallyText}>Total: {total}</Text>
        </LinearGradient>
        
        {categories.map(cat => {
          const gradientColors = gradientMap[cat] || ['#999', '#999'];
          return (
            <LinearGradient
              key={cat}
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tallyBadge}
            >
              <Text style={styles.tallyText}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}: {counts[cat] || 0}
              </Text>
            </LinearGradient>
          );
        })}
      </View>
    );
  };

  // Render bulk actions
  const renderBulkActions = () => {
    if (!showBulkActions || selectedContacts.length === 0) return null;
    
    return (
      <View style={styles.bulkActionsContainer}>
        <Text style={styles.bulkActionsTitle}>
          {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
        </Text>
        
        <View style={styles.bulkActionsControls}>
          <TouchableOpacity
            style={[styles.bulkActionButton, { backgroundColor: colors.primaryBlue }]}
            onPress={applyBulkRelationship}
          >
            <Text style={styles.bulkActionButtonText}>Change to {bulkRelationship}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.bulkActionButton, { backgroundColor: colors.error }]}
            onPress={deleteBulkContacts}
          >
            <Text style={styles.bulkActionButtonText}>Delete Selected</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.bulkActionButton, { backgroundColor: colors.textMedium }]}
            onPress={() => {
              setSelectedContacts([]);
              setShowBulkActions(false);
            }}
          >
            <Text style={styles.bulkActionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Mobile Header */}
      <MobileHeader 
        navigation={navigation}
        title="Connections"
        showBackButton={false}
        rightActions={[
          {
            icon: 'refresh',
            onPress: onRefresh
          }
        ]}
      />
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      )}
      
      {/* Content */}
      {!loading && (
        <View style={styles.contentContainer}>
          {/* Action buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAddContactSlider(true)}
            >
              <MaterialIcons name="person-add" size={20} color={colors.primaryBlue} />
              <Text style={styles.actionButtonText}>Add Contact</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={importContacts}
            >
              <MaterialIcons name="contacts" size={20} color={colors.primaryBlue} />
              <Text style={styles.actionButtonText}>Import Contacts</Text>
            </TouchableOpacity>
          </View>

          {/* Relationship tallies */}
          {renderTallies()}
          
          {/* Bulk actions */}
          {renderBulkActions()}

          {/* Contacts list */}
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id?.toString() || item.name + item.phone}
            renderItem={({ item }) => (
              <ContactRowCard
                contact={item}
                onEdit={handleEditContact}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primaryBlue]}
              />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Add Contact Slider */}
      <AddContactSlider
        isVisible={showAddContactSlider}
        onClose={() => setShowAddContactSlider(false)}
        onSave={handleSaveContact}
      />
      
      {/* Edit Contact Slider */}
      <EditContactSlider
        isVisible={showEditContactSlider}
        onClose={() => {
          setShowEditContactSlider(false);
          setCurrentEditContact(null);
        }}
        onSave={handleSaveEditedContact}
        contact={currentEditContact}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation 
        navigation={navigation}
        activeRoute="Connections"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.primaryBlue,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 90, // Account for bottom navigation
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.primaryBlue,
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 14,
  },
  tallyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  tallyBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallyText: {
    color: colors.cardWhite,
    fontWeight: '600',
    fontSize: 12,
  },
  bulkActionsContainer: {
    backgroundColor: colors.backgroundGray,
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bulkActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textDark,
  },
  bulkActionsControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bulkActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  bulkActionButtonText: {
    color: colors.cardWhite,
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 20,
  },
});

const contactCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectedCard: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: colors.primaryBlue,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.cardWhite,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryBlue,
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 2,
  },
  existingUserLabel: {
    color: colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  relationshipContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: 10,
  },
  relationship: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.primaryBlue,
    padding: 8,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConnectionsScreen;
