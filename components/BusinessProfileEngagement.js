import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabaseClient';

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

const BusinessProfileEngagement = ({ businessId, currentUserId, isBusinessOwner = false }) => {
  // State for likes
  const [likes, setLikes] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);

  // State for comments
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // State for pictures
  const [pictures, setPictures] = useState([]);
  const [picturesLoading, setPicturesLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (businessId && currentUserId) {
      loadLikes();
      loadComments();
      loadPictures();
    }
  }, [businessId, currentUserId]);

  // Fetch likes
  const loadLikes = async () => {
    try {
      setLikesLoading(true);

      // Get all likes for this business
      const { data: likesData, error: likesError } = await supabase
        .from('business_profile_likes')
        .select('id, user_id, created_at')
        .eq('business_id', businessId);

      if (likesError) throw likesError;

      setLikes(likesData || []);
      setLikeCount(likesData?.length || 0);

      // Check if current user has liked
      const userLike = likesData?.find(like => like.user_id === currentUserId);
      setUserHasLiked(!!userLike);
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setLikesLoading(false);
    }
  };

  // Toggle like
  const toggleLike = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to like a business profile');
      return;
    }

    try {
      if (userHasLiked) {
        // Unlike
        const { error } = await supabase
          .from('business_profile_likes')
          .delete()
          .eq('business_id', businessId)
          .eq('user_id', currentUserId);

        if (error) throw error;

        setUserHasLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        const { error } = await supabase
          .from('business_profile_likes')
          .insert([
            {
              business_id: businessId,
              user_id: currentUserId,
            }
          ]);

        if (error) throw error;

        setUserHasLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  // Fetch comments
  const loadComments = async () => {
    try {
      setCommentsLoading(true);

      // Get all comments with user profile info
      const { data: commentsData, error: commentsError } = await supabase
        .from('business_profile_comments')
        .select(`
          id,
          comment_text,
          created_at,
          updated_at,
          user_id,
          user_profiles!inner(full_name)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      setComments(commentsData || []);
      setCommentCount(commentsData?.length || 0);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Submit comment
  const submitComment = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      setSubmittingComment(true);

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
      await loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Fetch pictures
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

  // Upload picture
  const uploadPicture = async () => {
    if (!isBusinessOwner) {
      Alert.alert('Permission Denied', 'Only the business owner can upload pictures');
      return;
    }

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload pictures');
        return;
      }

      // Pick image
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

      // Convert image to blob
      const imageUri = result.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create a file name
      const fileName = `${businessId}/${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-pictures')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-pictures')
        .getPublicUrl(fileName);

      // Save to database
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

      // Reload pictures
      await loadPictures();
      Alert.alert('Success', 'Picture uploaded successfully!');
    } catch (error) {
      console.error('Error uploading picture:', error);
      Alert.alert('Error', 'Failed to upload picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  // Format date
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

  return (
    <View style={styles.container}>
      {/* Pictures Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pictures</Text>
          {isBusinessOwner && (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={uploadPicture}
              disabled={uploadingPicture}
            >
              {uploadingPicture ? (
                <ActivityIndicator size="small" color={colors.primaryBlue} />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primaryBlue} />
                  <Text style={styles.uploadButtonText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {picturesLoading ? (
          <ActivityIndicator size="small" color={colors.primaryBlue} />
        ) : pictures.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.picturesScroll}
          >
            {pictures.map((picture) => (
              <View key={picture.id} style={styles.pictureContainer}>
                <Image
                  source={{ uri: picture.image_url }}
                  style={styles.picture}
                  resizeMode="cover"
                />
                {picture.caption && (
                  <Text style={styles.pictureCaption} numberOfLines={2}>
                    {picture.caption}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>
            {isBusinessOwner ? 'Add photos to showcase your business' : 'No pictures available'}
          </Text>
        )}
      </View>

      {/* Likes and Comments Section */}
      <View style={styles.section}>
        <View style={styles.engagementBar}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={toggleLike}
            disabled={likesLoading}
          >
            <Ionicons
              name={userHasLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={userHasLiked ? colors.error : colors.textMedium}
            />
            <Text style={[styles.engagementCount, userHasLiked && styles.likedText]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <View style={styles.commentInfo}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMedium} />
            <Text style={styles.engagementCount}>{commentCount}</Text>
          </View>
        </View>
      </View>

      {/* Comments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comments</Text>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
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
              styles.submitCommentButton,
              !newComment.trim() && styles.submitCommentButtonDisabled,
            ]}
            onPress={submitComment}
            disabled={submittingComment || !newComment.trim()}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={colors.cardWhite} />
            ) : (
              <Ionicons name="send" size={20} color={colors.cardWhite} />
            )}
          </TouchableOpacity>
        </View>

        {/* Comments List */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.backgroundGray,
    borderRadius: 20,
  },
  uploadButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryBlue,
  },
  picturesScroll: {
    marginTop: 8,
  },
  pictureContainer: {
    marginRight: 12,
    width: 200,
  },
  picture: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.backgroundGray,
  },
  pictureCaption: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMedium,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  commentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementCount: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  likedText: {
    color: colors.error,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 16,
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
  submitCommentButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  submitCommentButtonDisabled: {
    backgroundColor: colors.textLight,
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
});

export default BusinessProfileEngagement;
