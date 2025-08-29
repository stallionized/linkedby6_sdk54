import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Platform, 
  Modal, 
  Image, 
  ScrollView, 
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Contacts from 'expo-contacts';
// import { generateQRCode } from './utils/qrCodeUtils'; // You'll need to create this utility
import AddContactSlider from './AddContactSlider';
import EditContactSlider from './EditContactSlider';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';

const relationshipOptions = ['Customer', 'Friend', 'Colleague', 'Family', 'Partner'];

const ConnectionsScreen = ({ navigation, route }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  
  // State for bulk operations
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [bulkRelationship, setBulkRelationship] = useState('Customer');
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // State for edit contact slider
  const [showEditContactSlider, setShowEditContactSlider] = useState(false);
  const [currentEditContact, setCurrentEditContact] = useState(null);
  
  // State for add contact slider
  const [showAddContactSlider, setShowAddContactSlider] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');

  // Utility function to sync a contact to Neo4j
  const syncContactToNeo4j = async (contact) => {
    try {
      // For mobile, you might want to use a different approach or skip Neo4j sync
      // Since Neo4j driver doesn't work well in React Native
      console.log('Syncing contact to Neo4j:', contact);
      
      // You could implement an API call to your backend here instead
      // const response = await fetch(`${API_BASE_URL}/sync-contact`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(contact),
      // });
      
      return true;
    } catch (syncError) {
      console.warn('Error syncing contact to Neo4j:', syncError);
      return false;
    }
  };

  const ContactRowCard = ({ contact, onEdit }) => {
    const { id, name, phone, relationship, familyRelation, friendDetails, isExistingUser } = contact;
    const initial = name?.charAt(0).toUpperCase() || '?';

    const formattedRelationship = relationship
      ? relationship.charAt(0).toUpperCase() + relationship.slice(1).toLowerCase()
      : '';

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
          <Text style={[contactCardStyles.logoText, { color: '#fff' }]}>{initial}</Text>
        </LinearGradient>
        <View style={contactCardStyles.infoContainer}>
          <View style={contactCardStyles.nameRelationshipContainer}>
            <Text style={contactCardStyles.name}>{name}</Text>
            <Text style={contactCardStyles.relationship}>
              {formattedRelationship}
              {formattedRelationship === 'Family' && familyRelation ? ` ${familyRelation}` : ''}
              {formattedRelationship === 'Friend' && friendDetails ? ` ${friendDetails}` : ''}
            </Text>
          </View>
          <Text style={contactCardStyles.phone}>{phone}</Text>
          {isExistingUser && (
            <Text style={contactCardStyles.existingUserLabel}>Existing User</Text>
          )}
        </View>
        <View style={contactCardStyles.actionsContainer}>
          <TouchableOpacity 
            style={contactCardStyles.editButton}
            onPress={() => onEdit(contact)}
          >
            <Text style={contactCardStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Function to toggle contact selection for bulk operations
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

  // Function to handle editing a contact
  const handleEditContact = (contact) => {
    setCurrentEditContact(contact);
    setShowEditContactSlider(true);
  };

  // Function to handle saving edited contact
  const handleSaveEditedContact = (updatedContact) => {
    setContacts(contacts.map(c => 
      c.id === updatedContact.id ? updatedContact : c
    ));
  };

  const handleSaveContact = (contact) => {
    setContacts(prev => [...prev, contact]);
  };

  // Import contacts from device
  const importDeviceContacts = async () => {
    try {
      // Request permission
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant contacts permission to import contacts.');
        return;
      }

      // Get contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      if (data.length > 0) {
        // Show contact selection or import all
        Alert.alert(
          'Import Contacts',
          `Found ${data.length} contacts. Import all?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Import All', onPress: () => processImportedContacts(data) }
          ]
        );
      } else {
        Alert.alert('No Contacts', 'No contacts found on device.');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      Alert.alert('Error', 'Failed to import contacts.');
    }
  };

  const processImportedContacts = async (deviceContacts) => {
    try {
      const session = await getSession();
      const currentUserId = session?.user?.id;
      
      if (!currentUserId) {
        Alert.alert('Authentication Error', 'You must be logged in to import contacts.');
        return;
      }

      const contactsToInsert = deviceContacts
        .filter(contact => contact.name && contact.phoneNumbers?.length > 0)
        .map(contact => ({
          user_id: currentUserId,
          business_id: businessId,
          name: contact.name,
          phone: contact.phoneNumbers[0].number || '',
          relationship: 'Customer',
          family_relation: null,
          friend_details: null
        }));

      if (contactsToInsert.length === 0) {
        Alert.alert('No Valid Contacts', 'No contacts with both name and phone number found.');
        return;
      }

      const { data, error } = await supabase
        .from('connections')
        .insert(contactsToInsert)
        .select();
        
      if (error) {
        console.error('Error saving imported contacts:', error);
        Alert.alert('Error', 'Failed to save imported contacts.');
        return;
      }

      const formattedContacts = data.map(conn => ({
        id: conn.id,
        name: conn.name,
        phone: conn.phone,
        relationship: conn.relationship,
        familyRelation: conn.family_relation,
        friendDetails: conn.friend_details
      }));

      // Sync to Neo4j
      for (const contact of data) {
        await syncContactToNeo4j(contact);
      }

      setContacts(prev => [...prev, ...formattedContacts]);
      Alert.alert('Success', `${formattedContacts.length} contacts imported successfully.`);
    } catch (error) {
      console.error('Error processing imported contacts:', error);
      Alert.alert('Error', 'An error occurred while importing contacts.');
    }
  };

  // Fetch user session, business profile, and connections on component mount
  useEffect(() => {
    const fetchUserAndConnections = async () => {
      try {
        setLoading(true);
        
        const session = await getSession();
        const currentUserId = session?.user?.id;
        
        if (!currentUserId) {
          console.error('No user is logged in');
          setLoading(false);
          return;
        }
        
        setUserId(currentUserId);
        
        // Fetch business profile
        const { data: profileData, error: profileError } = await supabase
          .from('business_profiles')
          .select('business_id')
          .eq('user_id', currentUserId)
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
          .eq('user_id', currentUserId);
        
        if (error) {
          console.error('Error fetching connections:', error);
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
        console.error('Error in fetchUserAndConnections:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndConnections();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <MobileHeader 
        navigation={navigation} 
        title="Connections" 
        showBackButton={false}
        rightActions={[
          { icon: 'add', onPress: () => setShowAddContactSlider(true) },
          { icon: 'cloud-upload-outline', onPress: importDeviceContacts }
        ]}
      />
      <View style={styles.contentContainer}>
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id || item.name + item.phone}
          renderItem={({ item }) => (
            <ContactRowCard
              contact={item}
              onEdit={handleEditContact}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Relationship Tallies */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tallyScrollContainer}>
                <View style={styles.tallyContainer}>
                  {(() => {
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
                      <>
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
                      </>
                    );
                  })()}
                </View>
              </ScrollView>

              {/* Bulk Actions */}
              {showBulkActions && selectedContacts.length > 0 && (
                <View style={styles.bulkActionsContainer}>
                  <Text style={styles.bulkActionsTitle}>
                    {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                  </Text>
                  
                  <View style={styles.bulkActionsControls}>
                    <View style={styles.bulkRelationshipContainer}>
                      <Text style={styles.bulkActionLabel}>Change to:</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={bulkRelationship}
                          style={styles.relationshipPicker}
                          onValueChange={(value) => setBulkRelationship(value)}
                        >
                          {relationshipOptions.map(option => (
                            <Picker.Item key={option} label={option} value={option} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    
                    <View style={styles.bulkActionButtons}>
                      <TouchableOpacity
                        style={[styles.bulkActionButton, { backgroundColor: '#1E88E5' }]}
                        onPress={() => {/* Apply bulk relationship logic */}}
                      >
                        <Text style={styles.bulkActionButtonText}>Apply</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.bulkActionButton, { backgroundColor: '#F44336' }]}
                        onPress={() => {/* Delete bulk contacts logic */}}
                      >
                        <Text style={styles.bulkActionButtonText}>Delete</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.bulkActionButton, { backgroundColor: '#9E9E9E' }]}
                        onPress={() => {
                          setSelectedContacts([]);
                          setShowBulkActions(false);
                        }}
                      >
                        <Text style={styles.bulkActionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </>
          }
        />
      </View>

      {/* Add Contact Slider */}
      <AddContactSlider
        isVisible={showAddContactSlider}
        onClose={() => setShowAddContactSlider(false)}
        onSave={handleSaveContact}
        businessId={businessId}
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
      <MobileBottomNavigation navigation={navigation} activeRoute="Connections" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  tallyScrollContainer: {
    marginVertical: 10,
  },
  tallyContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  tallyBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallyText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  bulkActionsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  bulkActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  bulkActionsControls: {
    gap: 10,
  },
  bulkRelationshipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulkActionLabel: {
    fontSize: 14,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
  },
  relationshipPicker: {
    height: 40,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  bulkActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkActionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});

const contactCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#1E88E5',
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  nameRelationshipContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 4,
    marginTop: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d6efd',
    marginBottom: 2,
    lineHeight: 20,
  },
  relationship: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
    lineHeight: 16,
  },
  phone: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
    marginTop: 2,
  },
  existingUserLabel: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionsContainer: {
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default ConnectionsScreen;
