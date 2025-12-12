import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { supabase } from '../supabaseClient';
import BusinessLogoInitials from './BusinessLogoInitials';
import { useSliderGesture } from '../hooks/useSliderGesture';

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
  const insets = useSafeAreaInsets();

  // Use the reusable slider gesture hook for smooth, natural swipe-to-close
  const { animatedStyle, panGesture, animateClose } = useSliderGesture({
    isVisible,
    onClose,
    sliderWidth: screenWidth,
    direction: 'right',
  });

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

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null); // {commentId, userName}
  const [expandedReplies, setExpandedReplies] = useState({}); // {commentId: boolean}

  // Edit/Delete state
  const [editingComment, setEditingComment] = useState(null); // comment object
  const [editText, setEditText] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);

  // Comment likes state
  const [commentLikes, setCommentLikes] = useState({}); // {commentId: {count, liked}}
  const [likingComment, setLikingComment] = useState(null);

  // Pictures state
  const [pictures, setPictures] = useState([]);
  const [picturesLoading, setPicturesLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Check if current user is business owner
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Load data
      loadBusinessData();
      loadComments();
      loadPictures();
    } else {
      // Reset state when closing
      setReplyingTo(null);
      setEditingComment(null);
      setSelectedComment(null);
      setShowOptionsModal(false);
      setExpandedReplies({});
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

      // Get all comments including replies
      const { data: commentsData, error: commentsError } = await supabase
        .from('business_profile_comments')
        .select('id, comment_text, created_at, updated_at, user_id, parent_comment_id')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const commentIds = commentsData.map(c => c.id);

        // Fetch user profiles and comment likes in parallel
        const [usersResult, likesResult, userLikesResult] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('user_id, full_name, profile_image_url')
            .in('user_id', userIds),
          supabase
            .from('business_profile_comment_likes')
            .select('comment_id')
            .in('comment_id', commentIds),
          currentUserId ? supabase
            .from('business_profile_comment_likes')
            .select('comment_id')
            .in('comment_id', commentIds)
            .eq('user_id', currentUserId) : { data: [] }
        ]);

        const usersData = usersResult.data || [];
        const likesData = likesResult.data || [];
        const userLikesData = userLikesResult.data || [];

        // Count likes per comment
        const likesCount = {};
        likesData.forEach(like => {
          likesCount[like.comment_id] = (likesCount[like.comment_id] || 0) + 1;
        });

        // Track which comments the current user has liked
        const userLikedComments = new Set(userLikesData.map(l => l.comment_id));

        // Build likes state
        const newCommentLikes = {};
        commentIds.forEach(id => {
          newCommentLikes[id] = {
            count: likesCount[id] || 0,
            liked: userLikedComments.has(id)
          };
        });
        setCommentLikes(newCommentLikes);

        // Combine comments with user data
        const commentsWithUsers = commentsData.map(comment => ({
          ...comment,
          user_profiles: usersData.find(u => u.user_id === comment.user_id) || { full_name: 'Anonymous' },
          replies: []
        }));

        // Organize into threaded structure (top-level comments with nested replies)
        const topLevelComments = [];
        const repliesMap = {};

        commentsWithUsers.forEach(comment => {
          if (!comment.parent_comment_id) {
            topLevelComments.push(comment);
          } else {
            if (!repliesMap[comment.parent_comment_id]) {
              repliesMap[comment.parent_comment_id] = [];
            }
            repliesMap[comment.parent_comment_id].push(comment);
          }
        });

        // Attach replies to their parent comments
        topLevelComments.forEach(comment => {
          comment.replies = repliesMap[comment.id] || [];
        });

        // Sort top-level comments by newest first
        topLevelComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setComments(topLevelComments);
        // Count all comments including replies
        setCommentCount(commentsData.length);
      } else {
        setComments([]);
        setCommentCount(0);
        setCommentLikes({});
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

      const commentData = {
        business_id: businessId,
        user_id: currentUserId,
        comment_text: newComment.trim(),
      };

      // If replying to a comment, add the parent_comment_id
      if (replyingTo) {
        commentData.parent_comment_id = replyingTo.commentId;
      }

      const { error } = await supabase
        .from('business_profile_comments')
        .insert([commentData])
        .select();

      if (error) throw error;

      // Clear input and reload comments
      setNewComment('');
      setCommentAttachment(null);
      setReplyingTo(null);

      // Auto-expand replies for the parent comment
      if (replyingTo) {
        setExpandedReplies(prev => ({ ...prev, [replyingTo.commentId]: true }));
      }

      await loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Like/unlike a comment
  const toggleCommentLike = async (commentId) => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to like comments');
      return;
    }

    if (likingComment === commentId) return;

    try {
      setLikingComment(commentId);
      const currentLike = commentLikes[commentId];

      if (currentLike?.liked) {
        // Unlike
        const { error } = await supabase
          .from('business_profile_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId);

        if (error) throw error;

        setCommentLikes(prev => ({
          ...prev,
          [commentId]: {
            count: Math.max(0, (prev[commentId]?.count || 1) - 1),
            liked: false
          }
        }));
      } else {
        // Like
        const { error } = await supabase
          .from('business_profile_comment_likes')
          .insert([{ comment_id: commentId, user_id: currentUserId }]);

        if (error) throw error;

        setCommentLikes(prev => ({
          ...prev,
          [commentId]: {
            count: (prev[commentId]?.count || 0) + 1,
            liked: true
          }
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLikingComment(null);
    }
  };

  // Edit a comment
  const handleEditComment = async () => {
    if (!editingComment || !editText.trim()) return;

    try {
      const { error } = await supabase
        .from('business_profile_comments')
        .update({
          comment_text: editText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingComment.id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      setEditingComment(null);
      setEditText('');
      await loadComments();
    } catch (error) {
      console.error('Error editing comment:', error);
      Alert.alert('Error', 'Failed to edit comment. Please try again.');
    }
  };

  // Delete a comment
  const handleDeleteComment = async (comment) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?' + (comment.replies?.length > 0 ? ' This will also delete all replies.' : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('business_profile_comments')
                .delete()
                .eq('id', comment.id)
                .eq('user_id', currentUserId);

              if (error) throw error;

              setShowOptionsModal(false);
              setSelectedComment(null);
              await loadComments();
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Open comment options (edit/delete)
  const openCommentOptions = (comment) => {
    if (comment.user_id !== currentUserId) return;
    setSelectedComment(comment);
    setShowOptionsModal(true);
  };

  // Start editing a comment
  const startEditing = (comment) => {
    setEditingComment(comment);
    setEditText(comment.comment_text);
    setShowOptionsModal(false);
    setSelectedComment(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingComment(null);
    setEditText('');
  };

  // Toggle replies visibility
  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // Start replying to a comment
  const startReply = (comment) => {
    setReplyingTo({
      commentId: comment.id,
      userName: comment.user_profiles?.full_name || 'Anonymous'
    });
  };

  // Cancel replying
  const cancelReply = () => {
    setReplyingTo(null);
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
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Social</Text>
            <TouchableOpacity onPress={animateClose} style={styles.closeButton}>
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

                {/* Comments Section - Instagram Style */}
                <View style={styles.commentsSection}>
                  <Text style={styles.sectionTitle}>
                    Comments ({commentCount})
                  </Text>

                  {commentsLoading ? (
                    <ActivityIndicator size="small" color={colors.primaryBlue} />
                  ) : comments.length > 0 ? (
                    <View style={styles.commentsList}>
                      {comments.map((comment) => (
                        <View key={comment.id} style={styles.commentThread}>
                          {/* Main Comment */}
                          {editingComment?.id === comment.id ? (
                            // Edit mode for this comment
                            <View style={styles.editCommentContainer}>
                              <TextInput
                                style={styles.editCommentInput}
                                value={editText}
                                onChangeText={setEditText}
                                multiline
                                autoFocus
                                maxLength={500}
                              />
                              <View style={styles.editActions}>
                                <TouchableOpacity onPress={cancelEditing} style={styles.editCancelBtn}>
                                  <Text style={styles.editCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleEditComment} style={styles.editSaveBtn}>
                                  <Text style={styles.editSaveText}>Save</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            // Normal comment view
                            <TouchableOpacity
                              style={styles.commentCard}
                              onLongPress={() => openCommentOptions(comment)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.commentMainRow}>
                                {/* Avatar */}
                                <View style={styles.commentAvatar}>
                                  {comment.user_profiles?.profile_image_url ? (
                                    <Image
                                      source={{ uri: comment.user_profiles.profile_image_url }}
                                      style={styles.avatarImage}
                                    />
                                  ) : (
                                    <View style={styles.avatarPlaceholder}>
                                      <Text style={styles.avatarInitial}>
                                        {(comment.user_profiles?.full_name || 'A').charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                {/* Comment Content */}
                                <View style={styles.commentContent}>
                                  <View style={styles.commentTextRow}>
                                    <Text style={styles.commentAuthor}>
                                      {comment.user_profiles?.full_name || 'Anonymous'}
                                    </Text>
                                    <Text style={styles.commentText}> {comment.comment_text}</Text>
                                  </View>

                                  {/* Comment Meta Row */}
                                  <View style={styles.commentMeta}>
                                    <Text style={styles.commentTimestamp}>{formatDate(comment.created_at)}</Text>
                                    {comment.updated_at && comment.updated_at !== comment.created_at && (
                                      <Text style={styles.editedLabel}>(edited)</Text>
                                    )}
                                    {commentLikes[comment.id]?.count > 0 && (
                                      <Text style={styles.likesCount}>
                                        {commentLikes[comment.id].count} {commentLikes[comment.id].count === 1 ? 'like' : 'likes'}
                                      </Text>
                                    )}
                                    <TouchableOpacity onPress={() => startReply(comment)}>
                                      <Text style={styles.replyButton}>Reply</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {/* Like Button */}
                                <TouchableOpacity
                                  style={styles.likeButton}
                                  onPress={() => toggleCommentLike(comment.id)}
                                  disabled={likingComment === comment.id}
                                >
                                  <Ionicons
                                    name={commentLikes[comment.id]?.liked ? 'heart' : 'heart-outline'}
                                    size={16}
                                    color={commentLikes[comment.id]?.liked ? colors.error : colors.textLight}
                                  />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          )}

                          {/* Replies Section */}
                          {comment.replies && comment.replies.length > 0 && (
                            <View style={styles.repliesContainer}>
                              {/* View Replies Toggle */}
                              <TouchableOpacity
                                style={styles.viewRepliesBtn}
                                onPress={() => toggleReplies(comment.id)}
                              >
                                <View style={styles.repliesLine} />
                                <Text style={styles.viewRepliesText}>
                                  {expandedReplies[comment.id]
                                    ? 'Hide replies'
                                    : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
                                </Text>
                              </TouchableOpacity>

                              {/* Expanded Replies */}
                              {expandedReplies[comment.id] && (
                                <View style={styles.repliesList}>
                                  {comment.replies.map((reply) => (
                                    <View key={reply.id}>
                                      {editingComment?.id === reply.id ? (
                                        // Edit mode for reply
                                        <View style={styles.editCommentContainer}>
                                          <TextInput
                                            style={styles.editCommentInput}
                                            value={editText}
                                            onChangeText={setEditText}
                                            multiline
                                            autoFocus
                                            maxLength={500}
                                          />
                                          <View style={styles.editActions}>
                                            <TouchableOpacity onPress={cancelEditing} style={styles.editCancelBtn}>
                                              <Text style={styles.editCancelText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={handleEditComment} style={styles.editSaveBtn}>
                                              <Text style={styles.editSaveText}>Save</Text>
                                            </TouchableOpacity>
                                          </View>
                                        </View>
                                      ) : (
                                        <TouchableOpacity
                                          style={styles.replyCard}
                                          onLongPress={() => openCommentOptions(reply)}
                                          activeOpacity={0.8}
                                        >
                                          <View style={styles.commentMainRow}>
                                            {/* Reply Avatar */}
                                            <View style={styles.replyAvatar}>
                                              {reply.user_profiles?.profile_image_url ? (
                                                <Image
                                                  source={{ uri: reply.user_profiles.profile_image_url }}
                                                  style={styles.replyAvatarImage}
                                                />
                                              ) : (
                                                <View style={styles.replyAvatarPlaceholder}>
                                                  <Text style={styles.replyAvatarInitial}>
                                                    {(reply.user_profiles?.full_name || 'A').charAt(0).toUpperCase()}
                                                  </Text>
                                                </View>
                                              )}
                                            </View>

                                            {/* Reply Content */}
                                            <View style={styles.commentContent}>
                                              <View style={styles.commentTextRow}>
                                                <Text style={styles.commentAuthor}>
                                                  {reply.user_profiles?.full_name || 'Anonymous'}
                                                </Text>
                                                <Text style={styles.commentText}> {reply.comment_text}</Text>
                                              </View>

                                              <View style={styles.commentMeta}>
                                                <Text style={styles.commentTimestamp}>{formatDate(reply.created_at)}</Text>
                                                {reply.updated_at && reply.updated_at !== reply.created_at && (
                                                  <Text style={styles.editedLabel}>(edited)</Text>
                                                )}
                                                {commentLikes[reply.id]?.count > 0 && (
                                                  <Text style={styles.likesCount}>
                                                    {commentLikes[reply.id].count} {commentLikes[reply.id].count === 1 ? 'like' : 'likes'}
                                                  </Text>
                                                )}
                                              </View>
                                            </View>

                                            {/* Like Button for Reply */}
                                            <TouchableOpacity
                                              style={styles.likeButton}
                                              onPress={() => toggleCommentLike(reply.id)}
                                              disabled={likingComment === reply.id}
                                            >
                                              <Ionicons
                                                name={commentLikes[reply.id]?.liked ? 'heart' : 'heart-outline'}
                                                size={14}
                                                color={commentLikes[reply.id]?.liked ? colors.error : colors.textLight}
                                              />
                                            </TouchableOpacity>
                                          </View>
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
                  )}
                </View>

                {/* Comment Options Modal */}
                <Modal
                  visible={showOptionsModal}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowOptionsModal(false)}
                >
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowOptionsModal(false)}
                  >
                    <View style={styles.optionsModal}>
                      <TouchableOpacity
                        style={styles.optionItem}
                        onPress={() => startEditing(selectedComment)}
                      >
                        <Ionicons name="pencil-outline" size={22} color={colors.textDark} />
                        <Text style={styles.optionText}>Edit Comment</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.optionItem, styles.optionDelete]}
                        onPress={() => handleDeleteComment(selectedComment)}
                      >
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                        <Text style={[styles.optionText, styles.optionDeleteText]}>Delete Comment</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.optionCancel}
                        onPress={() => setShowOptionsModal(false)}
                      >
                        <Text style={styles.optionCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Modal>

                {/* Spacer for fixed input */}
                <View style={styles.inputSpacer} />
              </ScrollView>

            </>
          )}
        </KeyboardAvoidingView>

        {/* Comment Input - absolutely positioned at bottom */}
        {!loading && (
          <View style={[
            styles.commentInputContainer,
            { bottom: insets.bottom > 0 ? insets.bottom : 12 }
          ]}>
            {/* Reply Indicator */}
            {replyingTo && (
              <View style={styles.replyIndicator}>
                <Text style={styles.replyIndicatorText}>
                  Replying to <Text style={styles.replyIndicatorName}>{replyingTo.userName}</Text>
                </Text>
                <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyBtn}>
                  <Ionicons name="close" size={18} color={colors.textMedium} />
                </TouchableOpacity>
              </View>
            )}
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
                placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Write a comment..."}
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
        )}
      </Animated.View>
    </GestureDetector>
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
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 12,
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
    marginTop: 8,
  },
  commentThread: {
    marginBottom: 16,
  },
  commentCard: {
    paddingVertical: 4,
  },
  commentMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
    marginRight: 8,
  },
  commentTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
  },
  commentText: {
    fontSize: 13,
    color: colors.textDark,
    lineHeight: 18,
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 12,
  },
  commentTimestamp: {
    fontSize: 12,
    color: colors.textLight,
  },
  editedLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  likesCount: {
    fontSize: 12,
    color: colors.textMedium,
    fontWeight: '500',
  },
  replyButton: {
    fontSize: 12,
    color: colors.textMedium,
    fontWeight: '600',
  },
  likeButton: {
    padding: 4,
    marginTop: 4,
  },
  // Replies styles
  repliesContainer: {
    marginLeft: 48,
    marginTop: 4,
  },
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  repliesLine: {
    width: 24,
    height: 1,
    backgroundColor: colors.textLight,
    marginRight: 8,
  },
  viewRepliesText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  repliesList: {
    marginTop: 4,
  },
  replyCard: {
    paddingVertical: 6,
  },
  replyAvatar: {
    marginRight: 10,
  },
  replyAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  replyAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyAvatarInitial: {
    color: colors.darkBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  // Edit comment styles
  editCommentContainer: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  editCommentInput: {
    fontSize: 14,
    color: colors.textDark,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
  },
  editCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editCancelText: {
    fontSize: 14,
    color: colors.textMedium,
  },
  editSaveBtn: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  editSaveText: {
    fontSize: 14,
    color: colors.cardWhite,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: colors.textDark,
  },
  optionDelete: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  optionDeleteText: {
    color: colors.error,
  },
  optionCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  optionCancelText: {
    fontSize: 16,
    color: colors.textMedium,
    fontWeight: '500',
  },
  // Reply indicator styles
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyIndicatorText: {
    fontSize: 13,
    color: colors.textMedium,
  },
  replyIndicatorName: {
    fontWeight: '600',
    color: colors.textDark,
  },
  cancelReplyBtn: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  inputSpacer: {
    height: 100,
  },
  commentInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.cardWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
