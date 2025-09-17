# Business Profile Engagement Feature

## Overview
This document describes the implementation of the business profile engagement features including likes, comments, and pictures functionality. These features allow users to interact with business profiles in a social-media-like way, increasing engagement and providing valuable feedback to businesses.

## Features Implemented

### 1. Likes
- **Functionality**: Users can like/unlike business profiles
- **Display**: Like count is shown on business cards and within the profile
- **Icon**: Heart icon (filled when liked, outlined when not liked)
- **Access**: All authenticated users can like any business profile
- **Uniqueness**: Each user can only like a business once (enforced at database level)

### 2. Comments
- **Functionality**: Users can post comments on business profiles
- **Display**: Comments are shown in chronological order (newest first)
- **Features**:
  - Text input with 500 character limit
  - Shows commenter's full name
  - Displays relative timestamps (e.g., "2h ago", "3d ago")
  - Users can only edit/delete their own comments
- **Access**: All authenticated users can comment on any business profile

### 3. Pictures
- **Functionality**: Business owners can upload pictures to showcase their business
- **Display**: Horizontal scrolling gallery
- **Features**:
  - Image picker integration with Expo
  - Optional captions for each picture
  - Display ordering
  - Active/inactive status (soft delete)
- **Access**: Only business owners can upload pictures to their own profiles
- **Storage**: Images are stored in Supabase Storage bucket `business-pictures`
- **Limits**: 5MB per image, supports JPEG, PNG, and WebP formats

## Database Schema

### 1. business_profile_likes
```sql
CREATE TABLE business_profile_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);
```

**Indexes**:
- `idx_business_profile_likes_business_id` on `business_id`
- `idx_business_profile_likes_user_id` on `user_id`

**RLS Policies**:
- Users can view all likes
- Users can create their own likes
- Users can delete their own likes

### 2. business_profile_comments
```sql
CREATE TABLE business_profile_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**:
- `idx_business_profile_comments_business_id` on `business_id`
- `idx_business_profile_comments_user_id` on `user_id`
- `idx_business_profile_comments_created_at` on `created_at DESC`

**RLS Policies**:
- Users can view all comments
- Users can create their own comments
- Users can update their own comments
- Users can delete their own comments

**Triggers**:
- Automatically updates `updated_at` timestamp on UPDATE

### 3. business_profile_pictures
```sql
CREATE TABLE business_profile_pictures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**:
- `idx_business_profile_pictures_business_id` on `business_id`
- `idx_business_profile_pictures_uploaded_by` on `uploaded_by_user_id`
- `idx_business_profile_pictures_display_order` on `(business_id, display_order)`

**RLS Policies**:
- Users can view all active pictures
- Business owners can upload pictures to their own business
- Business owners can update their business pictures
- Business owners can delete their business pictures

**Triggers**:
- Automatically updates `updated_at` timestamp on UPDATE

## Storage Configuration

### Bucket: business-pictures
- **Public Access**: Yes (read-only)
- **File Size Limit**: 5MB
- **Allowed MIME Types**: image/jpeg, image/jpg, image/png, image/webp
- **Folder Structure**: `{business_id}/{timestamp}.jpg`

**Storage Policies**:
- Public can view all pictures
- Business owners can upload to their own folder
- Business owners can update pictures in their own folder
- Business owners can delete pictures from their own folder

## Component Architecture

### 1. BusinessProfileEngagement Component
**Location**: `components/BusinessProfileEngagement.js`

**Props**:
- `businessId` (required): The business profile ID
- `currentUserId` (required): The current authenticated user ID
- `isBusinessOwner` (optional, default: false): Whether the current user owns this business

**Features**:
- Like/unlike button with counter
- Comment input and display
- Picture gallery with upload capability
- Real-time data fetching from Supabase
- Optimistic UI updates
- Loading states and error handling

**State Management**:
- Local state for likes, comments, and pictures
- Real-time synchronization with database
- Efficient re-fetching on user interactions

### 2. Integration Points

#### BusinessProfileSlider
**Location**: `BusinessProfileSlider.js`

**Changes**:
- Imported `BusinessProfileEngagement` component
- Added engagement section before reviews
- Passes `businessId`, `userId`, and `isBusinessOwner` props

**Location in File**: Line ~1926

#### RecommendedBusinessesScreen
**Location**: `RecommendedBusinessesScreen.js`

**Changes**:
- Added `engagementMetrics` state
- Created `fetchEngagementMetrics()` function
- Integrated metric fetching into business loading flow
- Updated `BusinessCard` component to accept and display counters
- Added engagement metrics display below connection visualization

**Key Functions**:
- `fetchEngagementMetrics(businessIds)`: Fetches like and comment counts for multiple businesses
- Displays counters on business cards when counts > 0

**Styling**:
- Added `engagementMetrics`, `metricItem`, and `metricText` styles
- Consistent with existing design system

## User Experience Flow

### Viewing a Business Profile
1. User navigates to a business profile (via search, recommendations, etc.)
2. BusinessProfileSlider opens
3. Engagement section displays:
   - Picture gallery (if pictures exist)
   - Like button with count
   - Comment count indicator
   - Comment input field
   - List of existing comments

### Liking a Business
1. User taps the heart icon
2. Icon fills with red color
3. Like count increments
4. Database record created in `business_profile_likes`
5. Like appears in business card counters on listing screens

### Commenting on a Business
1. User types comment in input field (max 500 characters)
2. User taps send button
3. Comment appears immediately in the list
4. Database record created in `business_profile_comments`
5. Comment count updates on business cards

### Uploading Pictures (Business Owners Only)
1. Business owner taps "Add Photo" button
2. System requests photo library permissions (if needed)
3. Image picker opens
4. User selects photo and optionally edits (4:3 aspect ratio)
5. Image uploads to Supabase Storage
6. Database record created in `business_profile_pictures`
7. Picture appears in gallery immediately

## Permissions & Security

### Authentication Required
All engagement features require the user to be authenticated (logged in).

### Role-Based Access Control
- **Likes**: Any authenticated user can like any business
- **Comments**: Any authenticated user can comment on any business
- **Pictures**: Only business owners can upload pictures to their own business

### Data Security
- Row Level Security (RLS) enabled on all tables
- Storage policies restrict uploads to business owners
- Foreign key constraints ensure data integrity
- Cascade deletes maintain referential integrity

## Performance Considerations

### Optimization Strategies
1. **Batch Fetching**: Engagement metrics for multiple businesses fetched in single queries
2. **Indexes**: Database indexes on frequently queried columns
3. **Pagination**: Comments can be paginated if needed (currently showing all)
4. **Image Optimization**:
   - Images compressed to 80% quality
   - 5MB size limit enforced
   - Lazy loading in galleries

### Caching
- Local state caching within components
- Re-fetching on user interactions
- Optimistic UI updates for better UX

## Future Enhancements

### Potential Additions
1. **Reactions**: Multiple reaction types (like, love, wow, etc.)
2. **Comment Replies**: Threaded comment discussions
3. **Picture Captions**: Add/edit captions after upload
4. **Picture Reordering**: Drag-and-drop picture ordering
5. **Notifications**: Notify business owners of new likes/comments
6. **Moderation**: Report inappropriate comments
7. **Analytics**: Track engagement metrics over time
8. **Pagination**: Implement pagination for comments on popular profiles
9. **Image Editing**: Crop, rotate, and filter tools
10. **Video Support**: Allow video uploads in addition to pictures

## Testing Checklist

### Likes
- [ ] Can like a business profile
- [ ] Can unlike a business profile
- [ ] Like count updates correctly
- [ ] Unique constraint prevents duplicate likes
- [ ] Like count displays on business cards
- [ ] Like persists after app restart

### Comments
- [ ] Can post a comment
- [ ] Comment appears in the list
- [ ] Character limit enforced (500 chars)
- [ ] Cannot post empty comments
- [ ] Comments sorted by newest first
- [ ] Commenter name displayed correctly
- [ ] Timestamps display correctly
- [ ] Comment count displays on business cards

### Pictures
- [ ] Business owner can upload pictures
- [ ] Non-owners cannot upload pictures
- [ ] Permission request works correctly
- [ ] Image picker opens and works
- [ ] Image uploads successfully
- [ ] Picture appears in gallery
- [ ] Gallery scrolls horizontally
- [ ] 5MB size limit enforced
- [ ] Supported formats work (JPEG, PNG, WebP)

### Security
- [ ] Unauthenticated users cannot like/comment/upload
- [ ] RLS policies enforced correctly
- [ ] Users can only delete their own comments
- [ ] Business owners can only upload to their business
- [ ] Cascade deletes work properly

### Performance
- [ ] Engagement metrics load quickly
- [ ] Large comment lists render smoothly
- [ ] Image gallery scrolls smoothly
- [ ] No memory leaks on component unmount

## Troubleshooting

### Common Issues

**Issue**: Pictures not uploading
- **Check**: Permissions granted for photo library
- **Check**: Image size under 5MB
- **Check**: User is the business owner
- **Check**: Storage bucket exists and policies are correct

**Issue**: Likes/Comments not appearing
- **Check**: User is authenticated
- **Check**: RLS policies enabled and correct
- **Check**: Foreign key references valid

**Issue**: Counters not updating
- **Check**: `fetchEngagementMetrics()` being called
- **Check**: Business IDs passed correctly
- **Check**: State updating properly

## Migration Files

### Applied Migrations
1. `create_business_profile_likes` - Creates likes table with RLS policies
2. `create_business_profile_comments` - Creates comments table with RLS policies and triggers
3. `create_business_profile_pictures` - Creates pictures table with RLS policies and triggers

### Storage Setup
- Storage bucket `business-pictures` created with public read access
- Storage policies configured for business owner uploads

## Files Modified

### New Files
- `components/BusinessProfileEngagement.js` - Main engagement component

### Modified Files
- `BusinessProfileSlider.js` - Added engagement component integration
- `RecommendedBusinessesScreen.js` - Added engagement counters to business cards

## Dependencies

### Required Packages
- `expo-image-picker` - For selecting images from device library
- `@expo/vector-icons` - For icons (Ionicons)
- All other dependencies already exist in the project

### Expo Permissions
- `expo-image-picker` requires media library permissions
- Permissions requested at runtime when needed

## Conclusion

The business profile engagement feature successfully adds social interaction capabilities to business profiles, enhancing user engagement and providing valuable feedback mechanisms. The implementation follows best practices for security, performance, and user experience while maintaining consistency with the existing application design.
