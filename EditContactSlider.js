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
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const SLIDER_WIDTH = Math.min(screenWidth * 0.85, 350);

const EditContactSlider = ({ isVisible, onClose, onSave, contact }) => {
  const slideAnim = useRef(new Animated.Value(SLIDER_WIDTH)).current;
  const debounceTimeoutRef = useRef(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('(   )    -    ');
  const [selection, setSelection] = useState({ start: 1, end: 1 });
  const [relationship, setRelationship] = useState('');
  const [familyRelation, setFamilyRelation] = useState('');
  const [friendDetails, setFriendDetails] = useState('');
  
  const [originalPhone, setOriginalPhone] = useState('');
  
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [existingUserFullName, setExistingUserFullName] = useState('');

  // Initialize form with contact data when it changes
  useEffect(() => {
    if (contact) {
      setName(contact.name || '');
      const initialPhone = contact.phone ? formatPhoneForEditing(contact.phone) : '(   )    -    ';
      setPhone(initialPhone);
      setOriginalPhone(contact.phone || ''); 
      setRelationship(contact.relationship || '');
      setFamilyRelation(contact.familyRelation || '');
      setFriendDetails(contact.friendDetails || '');
    } else {
      setName('');
      setPhone('(   )    -    ');
      setOriginalPhone('');
      setRelationship('');
      setFamilyRelation('');
      setFriendDetails('');
      setIsExistingUser(false);
      setExistingUserFullName('');
    }
  }, [contact]);

  // Check existing users based on phone number
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

  // Animation effect
  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SLIDER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  if (!contact) {
    return null;
  }

  // Format phone number for display and editing
  const formatPhoneForEditing = (phoneStr) => {
    if (!phoneStr || phoneStr === '(   )    -    ') return '(   )    -    ';
    
    const digits = phoneStr.replace(/\D/g, '').slice(0, 10);
    let masked = '(   )    -    '.split('');
    const digitSlots = [1, 2, 3, 6, 7, 8, 10, 11, 12, 13];
    
    for (let i = 0; i < Math.min(digits.length, digitSlots.length); i++) {
      const pos = digitSlots[i];
      masked[pos] = digits[i] || ' ';
    }
    
    return masked.join('');
  };

  const formatPhoneInput = (text) => {
    const cursorPosition = selection.start;
    const prevPhone = phone;
    
    const specialPositions = [0, 4, 5, 9];
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

  const validateAndUpdate = async () => {
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
    const phoneRegex = /^[0-9()+\-\s]+$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid phone number.');
      return;
    }
    
    try {
      const session = await getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        Alert.alert('Authentication Error', 'You must be logged in to update contacts.');
        return;
      }
      
      let updatedFamilyRelation = null;
      let updatedFriendDetails = null;
      
      if (relationship === 'Family') {
        updatedFamilyRelation = familyRelation || null;
      }
      
      if (relationship === 'Friend') {
        updatedFriendDetails = friendDetails.trim() || null;
      }
      
      const contactData = {
        name: isExistingUser ? existingUserFullName : name.trim(),
        phone: phone.trim(),
        relationship,
        family_relation: updatedFamilyRelation,
        friend_details: updatedFriendDetails,
        is_existing_user: isExistingUser
      };
      
      console.log('EditContactSlider - contactData for update:', contactData);
      
      const { data, error } = await supabase
        .from('connections')
        .update(contactData)
        .eq('contact_id', contact.id)
        .select();
        
      if (error) {
        console.error('Error updating contact:', error);
        Alert.alert('Error', 'Failed to update contact. Please try again.');
        return;
      }
      
      const updatedContact = {
        id: data[0].id,
        name: data[0].name,
        phone: data[0].phone,
        relationship: data[0].relationship,
        familyRelation: data[0].family_relation,
        friendDetails: data[0].friend_details,
        isExistingUser: isExistingUser
      };
      
      console.log('Contact updated in Supabase, Neo4j sync will be handled by triggers');
      
      onSave && onSave(updatedContact);
      onClose && onClose();
    } catch (error) {
      console.error('Error in validateAndUpdate:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
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
            <Text style={styles.headerText}>Edit Contact</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>
              Contact Name {isExistingUser && <Text style={{color: '#4CAF50'}}>(Existing User)</Text>}
            </Text>
            <TextInput
              style={[styles.input, isExistingUser && {backgroundColor: '#E8F5E9'}]}
              placeholder="Enter contact name"
              value={name}
              onChangeText={setName}
              editable={!isExistingUser}
              placeholderTextColor="#999"
            />
            {isExistingUser && (
              <Text style={styles.existingUserNote}>
                This phone number belongs to an existing user. Their name will be used.
              </Text>
            )}

            <Text style={styles.label}>Contact Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={phone}
              onChangeText={formatPhoneInput}
              onFocus={() => {
                const digits = phone.replace(/\D/g, '');
                const digitSlots = [1, 2, 3, 6, 7, 8, 10, 11, 12, 13];
                
                if (digits.length < digitSlots.length) {
                  setSelection({ start: digitSlots[digits.length], end: digitSlots[digits.length] });
                } else {
                  setSelection({ start: 1, end: 1 });
                }
              }}
              selection={selection}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                />
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={validateAndUpdate}>
              <Text style={styles.saveButtonText}>Update Contact</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    paddingBottom: 50,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
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
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 20,
    alignItems: 'center',
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

export default EditContactSlider;