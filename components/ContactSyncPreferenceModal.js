import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ContactSyncPreferenceModal = ({
  isVisible,
  onClose,
  onSelect,
  contactCount = 0,
}) => {
  const [selectedOption, setSelectedOption] = useState('one-time');

  const handleContinue = () => {
    onSelect(selectedOption);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="contacts" size={32} color="#1E88E5" />
            <Text style={styles.title}>How would you like to sync contacts?</Text>
            <Text style={styles.subtitle}>
              Found {contactCount} contacts on your device
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* One-time import option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === 'one-time' && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedOption('one-time')}
              activeOpacity={0.7}
            >
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radio,
                  selectedOption === 'one-time' && styles.radioSelected,
                ]}>
                  {selectedOption === 'one-time' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <MaterialCommunityIcons
                    name="cloud-upload-outline"
                    size={24}
                    color={selectedOption === 'one-time' ? '#1E88E5' : '#666'}
                  />
                  <Text style={[
                    styles.optionTitle,
                    selectedOption === 'one-time' && styles.optionTitleSelected,
                  ]}>
                    One-time import
                  </Text>
                </View>
                <Text style={styles.optionDescription}>
                  Import your current contacts now. New contacts won't be added automatically.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Continuous sync option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === 'continuous' && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedOption('continuous')}
              activeOpacity={0.7}
            >
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radio,
                  selectedOption === 'continuous' && styles.radioSelected,
                ]}>
                  {selectedOption === 'continuous' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <MaterialCommunityIcons
                    name="sync"
                    size={24}
                    color={selectedOption === 'continuous' ? '#1E88E5' : '#666'}
                  />
                  <Text style={[
                    styles.optionTitle,
                    selectedOption === 'continuous' && styles.optionTitleSelected,
                  ]}>
                    Keep contacts synced
                  </Text>
                </View>
                <Text style={styles.optionDescription}>
                  Import now and automatically add new contacts in the future. You can change this in Settings.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  optionCardSelected: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  radioContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9E9E9E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#1E88E5',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E88E5',
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  optionTitleSelected: {
    color: '#1E88E5',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginLeft: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1E88E5',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ContactSyncPreferenceModal;
