import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeadStatusBadge, { getLeadStageConfig, getAllLeadStages } from './LeadStatusBadge';

const { height: screenHeight } = Dimensions.get('window');

const colors = {
  primaryBlue: '#1E88E5',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textLight: '#90A4AE',
  borderLight: '#E0E7FF',
  success: '#10B981',
  error: '#EF4444',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Reason options for won/lost outcomes
const WON_REASONS = [
  { value: 'service_completed', label: 'Service Completed' },
  { value: 'booking_made', label: 'Booking Made' },
  { value: 'purchase_completed', label: 'Purchase Completed' },
  { value: 'ongoing_client', label: 'Ongoing Client' },
];

const LOST_REASONS = [
  { value: 'price_too_high', label: 'Price Too High' },
  { value: 'chose_competitor', label: 'Chose Competitor' },
  { value: 'timing_not_right', label: 'Timing Not Right' },
  { value: 'not_qualified', label: 'Not Qualified' },
  { value: 'no_response', label: 'No Response' },
  { value: 'other', label: 'Other' },
];

const LeadStatusSelector = ({
  visible,
  onClose,
  currentStage,
  onStageChange,
  onSaveNotes,
  initialNotes = '',
}) => {
  const [selectedStage, setSelectedStage] = useState(currentStage);
  const [selectedReason, setSelectedReason] = useState(null);
  const [notes, setNotes] = useState(initialNotes);
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  useEffect(() => {
    setSelectedStage(currentStage);
    setNotes(initialNotes);
    setSelectedReason(null);
    setShowReasonPicker(false);
  }, [currentStage, initialNotes, visible]);

  const handleStageSelect = (stage) => {
    setSelectedStage(stage);
    // Show reason picker for won/lost stages
    if (stage === 'won' || stage === 'lost') {
      setShowReasonPicker(true);
    } else {
      setShowReasonPicker(false);
      setSelectedReason(null);
    }
  };

  const handleConfirm = () => {
    if ((selectedStage === 'won' || selectedStage === 'lost') && !selectedReason) {
      // Require reason for won/lost
      return;
    }

    onStageChange(selectedStage, selectedReason, notes);
    onClose();
  };

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(notes);
    }
  };

  const allStages = getAllLeadStages();
  const reasonOptions = selectedStage === 'won' ? WON_REASONS : LOST_REASONS;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.bottomSheetContainer}
            >
              <View style={styles.bottomSheet}>
                {/* Handle */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Lead Status</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.textMedium} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                  {/* Current Status */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Status</Text>
                    <LeadStatusBadge stage={currentStage} size="large" />
                  </View>

                  {/* Stage Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Change Status</Text>
                    <View style={styles.stageGrid}>
                      {allStages.map((stage) => {
                        const config = getLeadStageConfig(stage);
                        const isSelected = selectedStage === stage;
                        return (
                          <TouchableOpacity
                            key={stage}
                            style={[
                              styles.stageOption,
                              isSelected && styles.stageOptionSelected,
                              isSelected && { borderColor: config.color },
                            ]}
                            onPress={() => handleStageSelect(stage)}
                          >
                            <Ionicons
                              name={config.icon}
                              size={20}
                              color={isSelected ? config.color : colors.textMedium}
                            />
                            <Text
                              style={[
                                styles.stageOptionText,
                                isSelected && { color: config.color },
                              ]}
                            >
                              {config.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Reason Picker (for won/lost) */}
                  {showReasonPicker && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        {selectedStage === 'won' ? 'Outcome Type' : 'Reason for Loss'}
                      </Text>
                      <View style={styles.reasonList}>
                        {reasonOptions.map((reason) => (
                          <TouchableOpacity
                            key={reason.value}
                            style={[
                              styles.reasonOption,
                              selectedReason === reason.value && styles.reasonOptionSelected,
                            ]}
                            onPress={() => setSelectedReason(reason.value)}
                          >
                            <View style={styles.radioButton}>
                              {selectedReason === reason.value && (
                                <View style={styles.radioButtonInner} />
                              )}
                            </View>
                            <Text style={styles.reasonOptionText}>{reason.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Notes */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      {notes !== initialNotes && (
                        <TouchableOpacity onPress={handleSaveNotes}>
                          <Text style={styles.saveNotesText}>Save</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add notes about this lead..."
                      placeholderTextColor={colors.textLight}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </ScrollView>

                {/* Confirm Button */}
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      ((selectedStage === 'won' || selectedStage === 'lost') && !selectedReason) &&
                        styles.confirmButtonDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={
                      (selectedStage === 'won' || selectedStage === 'lost') && !selectedReason
                    }
                  >
                    <Text style={styles.confirmButtonText}>
                      {selectedStage === currentStage ? 'Done' : 'Update Status'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    maxHeight: screenHeight * 0.85,
  },
  bottomSheet: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    maxHeight: screenHeight * 0.5,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveNotesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryBlue,
    marginBottom: 12,
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardWhite,
    margin: 4,
  },
  stageOptionSelected: {
    borderWidth: 2,
    backgroundColor: '#F8FAFC',
  },
  stageOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMedium,
    marginLeft: 6,
  },
  reasonList: {
    marginTop: -4,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  reasonOptionSelected: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textLight,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryBlue,
  },
  reasonOptionText: {
    fontSize: 15,
    color: colors.textDark,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.textDark,
    minHeight: 80,
    backgroundColor: '#F8FAFC',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 20,
  },
  confirmButton: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  confirmButtonText: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LeadStatusSelector;
