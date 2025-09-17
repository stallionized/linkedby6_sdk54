import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import BusinessLogoInitials from './BusinessLogoInitials';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

const SocialSlider = ({ isVisible, onClose, businessId, currentUserId }) => {
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  // PanResponder for swipe-to-close gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes that are more horizontal than vertical
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        // Set the current pan value to 0 when gesture starts
        pan.setOffset({
          x: pan.x._value,
          y: 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow rightward swipes (positive dx)
        if (gestureState.dx > 0) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();

        // Close if user swiped more than 40% of screen width or with high velocity
        if (gestureState.dx > screenWidth * 0.4 || gestureState.vx > 0.5) {
          // Trigger close animation
          onClose();
        } else {
          // Spring back to original position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Business profile state
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Engagement state
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [commentAttachment, setCommentAttachment] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Pictures state
  const [pictures, setPictures] = useState([]);
  const [picturesLoading, setPicturesLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Check if current user is business owner
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Reset pan position
      pan.setValue({ x: 0, y: 0 });

      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Load data
      loadBusinessData();
      loadComments();
      loadPictures();
    } else {
      // Slide out
      Animated.spring(slideAnim, {
        toValue: screenWidth,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error) throw error;

      setBusinessData(data);
      setIsBusinessOwner(data.user_id === currentUserId);
    } catch (error) {
      console.error('Error loading business data:', error);
      Alert.alert('Error', 'Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setCommentsLoading(true);

      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('business_profile_comments')
        .select('id, comment_text, created_at, updated_at, user_id')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Then get user profiles for those comments
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];

        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (usersError) {
          console.error('Error fetching user profiles:', usersError);
        }

        // Combine comments with user data
        const commentsWithUsers = commentsData.map(comment => ({
          ...comment,
          user_profiles: usersData?.find(u => u.user_id === comment.user_id) || { full_name: 'Anonymous' }
        }));

        setComments(commentsWithUsers);
        setCommentCount(commentsWithUsers.length);
      } else {
        setComments([]);
        setCommentCount(0);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadPictures = async () => {
    try {
      setPicturesLoading(true);

      const { data: picturesData, error: picturesError } = await supabase
        .from('business_profile_pictures')
        .select('id, image_url, caption, display_order, created_at')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (picturesError) throw picturesError;

      setPictures(picturesData || []);
    } catch (error) {
      console.error('Error loading pictures:', error);
    } finally {
      setPicturesLoading(false);
    }
  };

  const submitComment = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    if (!newComment.trim() && !commentAttachment) {
      Alert.alert('Error', 'Please enter a comment or attach an image');
      return;
    }

    try {
      setSubmittingComment(true);

      // TODO: If there's an attachment, upload it to storage first
      // For now, just saving the text comment

      const { data, error } = await supabase
        .from('business_profile_comments')
        .insert([
          {
            business_id: businessId,
            user_id: currentUserId,
            comment_text: newComment.trim(),
          }
        ])
        .select();

      if (error) throw error;

      // Clear input and reload comments
      setNewComment('');
      setCommentAttachment(null);
      await loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const pickCommentImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCommentAttachment(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadPicture = async () => {
    if (!isBusinessOwner) {
      Alert.alert('Permission Denied', 'Only the business owner can upload pictures');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      setUploadingPicture(true);

      const imageUri = result.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const fileName = `${businessId}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-pictures')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-pictures')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('business_profile_pictures')
        .insert([
          {
            business_id: businessId,
            uploaded_by_user_id: currentUserId,
            image_url: publicUrl,
            display_order: pictures.length,
          }
        ]);

      if (dbError) throw dbError;

      await loadPictures();
      Alert.alert('Success', 'Picture uploaded successfully!');
    } catch (error) {
      console.error('Error uploading picture:', error);
      Alert.alert('Error', 'Failed to upload picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const handlePhoneCall = () => {
    if (businessData?.phone) {
      Linking.openURL(`tel:${businessData.phone}`);
    }
  };

  const handleEmail = () => {
    if (businessData?.contact_email) {
      Linking.openURL(`mailto:${businessData.contact_email}`);
    }
  };

  const handleWebsite = () => {
    if (businessData?.website) {
      Linking.openURL(businessData.website);
    }
  };

  const handleMessage = () => {
    if (businessData?.business_id) {
      // Close the social slider first
      onClose();
      // Navigate to business messages screen
      navigation.navigate('BusinessMessages', {
        businessId: businessData.business_id,
        businessName: businessData.business_name,
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: Animated.add(slideAnim, pan.x) }
          ]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Social</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.textDark} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryBlue} />
          </View>
        ) : (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Business Info Card */}
              <View style={styles.mainInfoCard}>
                <View style={styles.topRow}>
                  <View style={styles.logoContainer}>
                    <BusinessLogoInitials
                      businessName={businessData?.business_name}
                      imageUrl={businessData?.image_url}
                      backgroundColor={businessData?.logo_dominant_color}
                      size={80}
                    />
                  </View>

                  <View style={styles.businessInfoContainer}>
                    <Text style={styles.businessName}>{businessData?.business_name}</Text>

                    {businessData?.industry && (
                      <View style={styles.infoRow}>
                        <Ionicons name="briefcase-outline" size={18} color="#666" style={styles.infoIcon} />
                        <Text style={styles.industryText}>{businessData.industry}</Text>
                      </View>
                    )}

                    {businessData?.coverage_type && businessData.coverage_type !== 'Not specified' && (
                      <View style={styles.infoRow}>
                        <Ionicons
                          name={
                            businessData.coverage_type === 'local' ? 'location-outline' :
                            businessData.coverage_type === 'regional' ? 'map-outline' :
                            businessData.coverage_type === 'national' ? 'flag-outline' :
                            'globe-outline'
                          }
                          size={18}
                          color="#666"
                          style={styles.infoIcon}
                        />
                        <Text style={styles.coverageText}>
                          {businessData.coverage_type.charAt(0).toUpperCase() + businessData.coverage_type.slice(1)}
                          {businessData.coverage_type === 'local' && businessData.coverage_radius &&
                            ` (${businessData.coverage_radius} miles radius)`}
                          {businessData.coverage_details && ` - ${businessData.coverage_details}`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Quick Contact Buttons - aligned with logo */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickContactContainer}
                  contentContainerStyle={styles.quickContactContent}
                >
                  {businessData?.phone && businessData.phone !== 'Not specified' && (
                    <TouchableOpacity
                      style={styles.quickContactButton}
                      onPress={handlePhoneCall}
                    >
                      <Ionicons name="call-outline" size={20} color={colors.primaryBlue} />
                      <Text style={styles.quickContactText}>Call</Text>
                    </TouchableOpacity>
                  )}

                  {businessData?.website && (
                    <TouchableOpacity
                      style={styles.quickContactButton}
                      onPress={handleWebsite}
                    >
                      <Ionicons name="globe-outline" size={20} color={colors.primaryBlue} />
                      <Text style={styles.quickContactText}>Website</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.quickContactButton}
                    onPress={handleMessage}
                  >
                    <Ionicons name="mail-outline" size={20} color={colors.primaryBlue} />
                    <Text style={styles.quickContactText}>Message</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickContactButton}
                    onPress={() => {
                      onClose();
                      navigation.navigate('ReviewEntry', {
                        businessId: businessData.business_id,
                        businessName: businessData.business_name,
                      });
                    }}
                  >
                    <Ionicons name="star-outline" size={20} color={colors.primaryBlue} />
                    <Text style={styles.quickContactText}>Review</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Pictures Gallery */}
              {(pictures.length > 0 || isBusinessOwner) && (
                <View style={styles.picturesSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Photos</Text>
                    {isBusinessOwner && (
                      <TouchableOpacity onPress={uploadPicture} disabled={uploadingPicture}>
                        {uploadingPicture ? (
                          <ActivityIndicator size="small" color={colors.primaryBlue} />
                        ) : (
                          <Ionicons name="add-circle" size={24} color={colors.primaryBlue} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  {pictures.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picturesScroll}>
                      {pictures.map((picture) => (
                        <Image
                          key={picture.id}
                          source={{ uri: picture.image_url }}
                          style={styles.picture}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Comments Section */}
              <View style={styles.commentsSection}>
                <Text style={styles.sectionTitle}>
                  Comments ({commentCount})
                </Text>

                {commentsLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryBlue} />
                ) : comments.length > 0 ? (
                  <View style={styles.commentsList}>
                    {comments.map((comment) => (
                      <View key={comment.id} style={styles.commentCard}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>
                            {comment.user_profiles?.full_name || 'Anonymous'}
                          </Text>
                          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                        </View>
                        <Text style={styles.commentText}>{comment.comment_text}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
                )}
              </View>

              {/* Spacer for fixed input */}
              <View style={styles.inputSpacer} />
            </ScrollView>

            {/* Fixed Comment Input */}
            <View style={styles.commentInputContainer}>
              {commentAttachment && (
                <View style={styles.attachmentPreview}>
                  <Image source={{ uri: commentAttachment.uri }} style={styles.attachmentImage} />
                  <TouchableOpacity
                    style={styles.removeAttachment}
                    onPress={() => setCommentAttachment(null)}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputRow}>
                <TouchableOpacity style={styles.attachButton} onPress={pickCommentImage}>
                  <Ionicons name="camera" size={24} color={colors.textMedium} />
                </TouchableOpacity>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  placeholderTextColor={colors.textLight}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!newComment.trim() && !commentAttachment) && styles.sendButtonDisabled,
                  ]}
                  onPress={submitComment}
                  disabled={submittingComment || (!newComment.trim() && !commentAttachment)}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color={colors.cardWhite} />
                  ) : (
                    <Ionicons name="send" size={20} color={colors.cardWhite} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: colors.cardWhite,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  mainInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  businessInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  industryText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  coverageText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  quickContactContainer: {
    marginTop: 12,
  },
  quickContactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  quickContactText: {
    color: '#0D47A1',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  picturesSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  picturesScroll: {
    marginTop: 8,
  },
  picture: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: colors.backgroundGray,
  },
  commentsSection: {
    padding: 16,
  },
  commentsList: {
    marginTop: 12,
  },
  commentCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  commentDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  commentText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  inputSpacer: {
    height: 120,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  attachmentPreview: {
    position: 'relative',
    marginBottom: 8,
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeAttachment: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.cardWhite,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    color: colors.textDark,
  },
  sendButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textLight,
  },
});

export default SocialSlider;
