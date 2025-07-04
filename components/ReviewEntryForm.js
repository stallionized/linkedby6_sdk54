import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const ReviewEntryForm = ({ businessId, userId, onSubmitSuccess, onCancel }) => {
  const [recommendation, setRecommendation] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTags = [
    'Quality Service',
    'Professional',
    'Responsive',
    'Fair Pricing',
    'Reliable',
    'Experienced',
    'Friendly',
    'Efficient',
    'Trustworthy',
    'Recommended'
  ];

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (!recommendation) {
      Alert.alert('Error', 'Please select a recommendation type');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Please add a comment about your experience');
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewData = {
        business_id: businessId,
        user_id: userId,
        recommendation: recommendation,
        comment: comment.trim(),
        tags: selectedTags,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('reviews')
        .insert([reviewData])
        .select()
        .single();

      if (error) {
        console.error('Error submitting review:', error);
        Alert.alert('Error', 'Failed to submit review. Please try again.');
      } else {
        Alert.alert('Success', 'Your review has been submitted!');
        onSubmitSuccess(data);
      }
    } catch (error) {
      console.error('Exception submitting review:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Your Recommendation</Text>
        <View style={styles.recommendationContainer}>
          <TouchableOpacity
            style={[
              styles.recommendationButton,
              recommendation === 'positive' && styles.recommendationButtonSelected,
              recommendation === 'positive' && styles.positiveSelected
            ]}
            onPress={() => setRecommendation('positive')}
          >
            <Text style={styles.recommendationIcon}>👍</Text>
            <Text style={[
              styles.recommendationText,
              recommendation === 'positive' && styles.recommendationTextSelected
            ]}>
              Positive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recommendationButton,
              recommendation === 'positive_with_concerns' && styles.recommendationButtonSelected,
              recommendation === 'positive_with_concerns' && styles.concernsSelected
            ]}
            onPress={() => setRecommendation('positive_with_concerns')}
          >
            <Text style={styles.recommendationIcon}>⚠️</Text>
            <Text style={[
              styles.recommendationText,
              recommendation === 'positive_with_concerns' && styles.recommendationTextSelected
            ]}>
              Positive with Concerns
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recommendationButton,
              recommendation === 'negative' && styles.recommendationButtonSelected,
              recommendation === 'negative' && styles.negativeSelected
            ]}
            onPress={() => setRecommendation('negative')}
          >
            <Text style={styles.recommendationIcon}>👎</Text>
            <Text style={[
              styles.recommendationText,
              recommendation === 'negative' && styles.recommendationTextSelected
            ]}>
              Negative
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Your Experience</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Share your experience with this business..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionTitle}>Tags (Optional)</Text>
        <View style={styles.tagsContainer}>
          {availableTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                selectedTags.includes(tag) && styles.tagButtonSelected
              ]}
              onPress={() => handleTagToggle(tag)}
            >
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.tagTextSelected
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!recommendation || !comment.trim() || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!recommendation || !comment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  recommendationContainer: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  recommendationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  recommendationButtonSelected: {
    borderWidth: 2,
  },
  positiveSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  concernsSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  negativeSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  recommendationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  recommendationText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  recommendationTextSelected: {
    color: '#111827',
    fontWeight: 'bold',
  },
  commentInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
    color: '#111827',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  tagButtonSelected: {
    backgroundColor: '#0D47A1',
    borderColor: '#0D47A1',
  },
  tagText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#0D47A1',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default ReviewEntryForm;
