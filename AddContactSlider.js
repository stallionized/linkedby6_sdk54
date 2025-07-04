import React, { useRef, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  TextInput,
  Platform,
  ScrollView,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH * 0.85;

const AddContactSlider = ({ isVisible, onClose, onSave }) => {
  const slideAnim = useRef(new Animated.Value(SLIDER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const debounceTimeoutRef = useRef(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('(   )    -    ');
  const [selection, setSelection] = useState({ start: 1, end: 1 });
  const [relationship, setRelationship] = useState('');
  const [familyRelation, setFamilyRelation] = useState('');
  const [friendDetails, setFriendDetails] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [existingUserFullName, setExistingUserFullName] = useState('');

  // Animation useEffect
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SLIDER_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible, slideAnim, fadeAnim]);

  // Phone number checking useEffect
  useEffect(() => {
    const rawPhone = phone.replace(/\D/g, '');

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (rawPhone.length !== 10) {
      if (isExistingUser) {
        setName('');
      }
      setIsExistingUser(false);
      setExistingUserFullName('');
      return;
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const formattedPhone = rawPhone;
        const { data: masterRecord, error: masterError } = await supabase
          .from('master_neo4j')
          .select('node_full_name')
          .eq('user_phone_number', formattedPhone)
          .maybeSingle();

        if (masterError) {
          console.error('Error searching master_neo4j by phone:', masterError);
          if (isExistingUser) {
            setName('');
          }
          setIsExistingUser(false);
          setExistingUserFullName('');
          return;
        }

        if (masterRecord && masterRecord.node_full_name) {
          setName(masterRecord.node_full_name);
          setIsExistingUser(true);
          setExistingUserFullName(masterRecord.node_full_name);
        } else {
          if (isExistingUser) {
            setName('');
          }
          setIsExistingUser(false);
          setExistingUserFullName('');
        }
      } catch (error) {
        console.error('Error in phone useEffect:', error);
        if (isExistingUser) {
          setName('');
        }
        setIsExistingUser(false);
        setExistingUserFullName('');
      }
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [phone, isExistingUser]);

  const validateAndSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Contact Name is required.');
      return;
    }
    if (!phone.trim() || phone === '(   )    -    ') {
      Alert.alert('Validation Error', 'Contact Phone Number is required.');
      return;
    }
    if (!relationship) {
      Alert.alert('Validation Error', 'Please select a relationship.');
      return;
    }
    
    try {
      const session = await getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        Alert.alert('Authentication Error', 'You must be logged in to save contacts.');
        return;
      }
      
      // Get user's phone number from profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_phone_number')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        Alert.alert('Error', 'Failed to retrieve your profile information.');
        return;
      }

      const formattedContactPhone = phone.replace(/\D/g, '');

      let contactData = {
        user_id: userId,
        name: isExistingUser ? existingUserFullName : name.trim(),
        contact_phone_number: phone,
        relationship,
        family_relation: relationship === 'Family' && familyRelation ? familyRelation : null,
        friend_details: relationship === 'Friend' && friendDetails ? friendDetails.trim() : null,
        user_phone_number: userProfile?.user_phone_number || null
      };

      // Check for existing contacts
      const { data: existingContacts, error: existingContactsError } = await supabase
        .from('connections')
        .select('contact_id, name')
        .eq('user_id', userId)
        .eq('contact_phone_number', formattedContactPhone)
        .limit(1);
        
      if (existingContactsError) {
        console.error('Error checking for existing contact:', existingContactsError);
      } else if (existingContacts && existingContacts.length > 0) {
        Alert.alert(
          'Contact Already Exists',
          `You've already added ${existingContacts[0].name} with this phone number.`,
          [{ text: 'OK', onPress: () => onClose && onClose() }]
        );
        return;
      }

      console.log('Inserting contact with data:', JSON.stringify(contactData, null, 2));

      // Insert into connections table
      const { data, error } = await supabase
        .from('connections')
        .insert(contactData)
        .select();
        
      if (error) {
        console.error('Error saving contact:', error);
        
        // Try using the RPC function as fallback
        const { data: rpcData, error: rpcError } = await supabase.rpc('insert_connection_safely', {
          p_user_id: userId,
          p_name: isExistingUser ? existingUserFullName : name.trim(),
          p_contact_phone_number: phone,
          p_relationship: relationship,
          p_family_relation: relationship === 'Family' && familyRelation ? familyRelation : null,
          p_friend_details: relationship === 'Friend' && friendDetails ? friendDetails.trim() : null
        });
        
        if (rpcError) {
          console.error('RPC fallback also failed:', rpcError);
          Alert.alert('Error', 'Failed to save contact. Please try again.');
          return;
        }
        
        console.log('Contact saved via RPC fallback');
        
        const contact = {
          id: rpcData[0].contact_id,
          name: rpcData[0].name,
          phone: phone,
          relationship,
          familyRelation: relationship === 'Family' && familyRelation ? familyRelation : null,
          friendDetails: relationship === 'Friend' && friendDetails ? friendDetails.trim() : null
        };
        
        onSave && onSave(contact);
        onClose && onClose();
        
        // Reset form fields
        setName('');
        setPhone('(   )    -    ');
        setRelationship('');
        setFamilyRelation('');
        setFriendDetails('');
        return;
      }
      
      console.log('Contact saved successfully');
      
      // Create contact object for UI update
      const contact = {
        id: data[0].contact_id,
        name: data[0].name,
        phone: phone,
        relationship,
        familyRelation: relationship === 'Family' && familyRelation ? familyRelation : null,
        friendDetails: relationship === 'Friend' && friendDetails ? friendDetails.trim() : null
      };
      
      onSave && onSave(contact);
      onClose && onClose();
      
      // Reset form fields
      setName('');
      setPhone('(   )    -    ');
      setRelationship('');
      setFamilyRelation('');
      setFriendDetails('');
    } catch (error) {
      console.error('Error in validateAndSave:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handlePhoneChange = (text) => {
    const cursorPosition = selection.start;
    const prevPhone = phone;
    
    const specialPositions = [0, 4, 5, 9]; // '(', ')', ' ', '-'
    const digitSlots = [1, 2, 3, 6, 7, 8, 10, 11, 12, 13];
    
    const isBackspaceAtSpecial = 
      text.length < prevPhone.length && 
      specialPositions.includes(cursorPosition);
    
    if (isBackspaceAtSpecial) {
      const prevDigitPos = Math.max(...digitSlots.filter(pos => pos < cursorPosition));
      
      let newPhoneChars = prevPhone.split('');
      newPhoneChars[prevDigitPos] = ' ';
      
      const digits = newPhoneChars.join('').replace(/\D/g, '');
      
      let masked = '(   )    -    '.split('');
      for (let i = 0; i < digits.length; i++) {
        masked[digitSlots[i]] = digits[i];
      }
      
      setPhone(masked.join(''));
      setSelection({ start: prevDigitPos, end: prevDigitPos });
      return;
    }
    
    const digits = text.replace(/\D/g, '').slice(0, 10);
    let masked = '(   )    -    '.split('');
    
    for (let i = 0; i < digits.length; i++) {
      masked[digitSlots[i]] = digits[i];
    }
    
    for (let i = digits.length; i < digitSlots.length; i++) {
      masked[digitSlots[i]] = ' ';
    }
    
    setPhone(masked.join(''));
    
    if (digits.length < prevPhone.replace(/\D/g, '').length) {
      if (digits.length > 0) {
        const lastDigitPos = digitSlots[digits.length - 1];
        setSelection({ start: lastDigitPos + 1, end: lastDigitPos + 1 });
      } else {
        setSelection({ start: digitSlots[0], end: digitSlots[0] });
      }
    } else {
      if (digits.length > 0) {
        const newPos = digitSlots[digits.length - 1] + 1;
        
        if (newPos === 4) {
          setSelection({ start: 6, end: 6 });
        } else if (newPos === 9) {
          setSelection({ start: 10, end: 10 });
        } else {
          setSelection({ start: newPos, end: newPos });
        }
      } else {
        setSelection({ start: digitSlots[0], end: digitSlots[0] });
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />
        
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.slider,
            {
              transform: [{ translateX: slideAnim }],
              width: SLIDER_WIDTH
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>Add Contact</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>
              Contact Name {isExistingUser && <Text style={{color: '#4CAF50'}}>(Existing User)</Text>}
            </Text>
            <TextInput
              style={[styles.input, isExistingUser && {backgroundColor: '#E8F5E9'}]}
              placeholder="Enter contact name"
              value={name}
              onChangeText={setName}
              editable={!isExistingUser}
            />
            {isExistingUser && (
              <Text style={styles.existingUserNote}>
                This phone number belongs to an existing user. Their name will be used.
              </Text>
            )}

            <Text style={styles.label}>Contact Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="(   )    -    "
              value={phone}
              onChangeText={handlePhoneChange}
              selection={selection}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <Text style={styles.label}>Relationship</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={relationship}
                style={styles.relationshipPicker}
                onValueChange={(value) => setRelationship(value)}
              >
                <Picker.Item label="Select..." value="" />
                <Picker.Item label="Family" value="Family" />
                <Picker.Item label="Romantic Partner" value="Partner" />
                <Picker.Item label="Friend" value="Friend" />
                <Picker.Item label="Colleague" value="Colleague" />
                <Picker.Item label="Customer" value="Customer" />
              </Picker>
            </View>

            {relationship === 'Family' && (
              <>
                <Text style={styles.label}>Family Relation (optional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={familyRelation}
                    style={styles.relationshipPicker}
                    onValueChange={(value) => setFamilyRelation(value)}
                  >
                    <Picker.Item label="Select..." value="" />
                    <Picker.Item label="Aunt" value="Aunt" />
                    <Picker.Item label="Brother" value="Brother" />
                    <Picker.Item label="Cousin" value="Cousin" />
                    <Picker.Item label="Daughter" value="Daughter" />
                    <Picker.Item label="Father" value="Father" />
                    <Picker.Item label="Grandfather" value="Grandfather" />
                    <Picker.Item label="Grandmother" value="Grandmother" />
                    <Picker.Item label="Husband" value="Husband" />
                    <Picker.Item label="Nephew" value="Nephew" />
                    <Picker.Item label="Niece" value="Niece" />
                    <Picker.Item label="Son" value="Son" />
                    <Picker.Item label="Sister" value="Sister" />
                    <Picker.Item label="Uncle" value="Uncle" />
                    <Picker.Item label="Wife" value="Wife" />
                  </Picker>
                </View>
              </>
            )}

            {relationship === 'Friend' && (
              <>
                <Text style={styles.label}>Details (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Add details about this friend"
                  value={friendDetails}
                  onChangeText={(text) => {
                    if (text.length <= 50) setFriendDetails(text);
                  }}
                  maxLength={50}
                  multiline={true}
                  numberOfLines={2}
                />
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={validateAndSave}>
              <Text style={styles.saveButtonText}>Save Contact</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  slider: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    marginTop: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
    backgroundColor: '#fff',
  },
  relationshipPicker: {
    width: '100%',
    height: 50,
  },
  saveButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  existingUserNote: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default AddContactSlider;
