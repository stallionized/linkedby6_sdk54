# Social Slider UI Update - Business Profile Match

## Overview
Updated the SocialSlider component's business information section to match the layout and functionality of the BusinessProfileSlider, creating a consistent user experience across the app.

## Changes Made

### File: `components/SocialSlider.js`

#### 1. Added Navigation Import
```javascript
import { useNavigation } from '@react-navigation/native';
```

#### 2. Added Navigation Hook
```javascript
const SocialSlider = ({ isVisible, onClose, businessId, currentUserId }) => {
  const navigation = useNavigation();
  // ...
```

#### 3. Redesigned Business Info Section
**Before:**
- Simple centered layout with logo, name, industry, and description
- Basic contact buttons in a separate section

**After:**
- Card-based layout matching BusinessProfileSlider
- Logo at top with business info below
- Industry with briefcase icon
- Coverage area with appropriate location/map/globe icon
- Quick contact buttons integrated into the card

#### 4. Updated JSX Structure
```javascript
<View style={styles.mainInfoCard}>
  <BusinessLogoInitials
    businessName={businessData?.business_name}
    imageUrl={businessData?.image_url}
    backgroundColor={businessData?.logo_dominant_color}
    size={80}
    style={styles.logoContainer}
  />

  <View style={styles.businessInfoContainer}>
    <Text style={styles.businessName}>{businessData?.business_name}</Text>

    {/* Industry with icon */}
    {businessData?.industry && (
      <View style={styles.infoRow}>
        <Ionicons name="briefcase-outline" size={18} color={colors.textMedium} />
        <Text style={styles.industryText}>{businessData.industry}</Text>
      </View>
    )}

    {/* Coverage area with dynamic icon */}
    {businessData?.coverage_area && businessData.coverage_area.type && (
      <View style={styles.infoRow}>
        <Ionicons name={/* dynamic based on type */} size={18} color={colors.textMedium} />
        <Text style={styles.coverageText}>
          {/* Formatted coverage text with details */}
        </Text>
      </View>
    )}

    {/* Quick Contact Buttons */}
    <View style={styles.quickContactContainer}>
      <TouchableOpacity style={styles.quickContactButton} onPress={handlePhoneCall}>
        <Ionicons name="call-outline" size={20} color={colors.primaryBlue} />
        <Text style={styles.quickContactText}>Call</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickContactButton} onPress={handleEmail}>
        <Ionicons name="mail-outline" size={20} color={colors.primaryBlue} />
        <Text style={styles.quickContactText}>Email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickContactButton} onPress={handleWebsite}>
        <Ionicons name="globe-outline" size={20} color={colors.primaryBlue} />
        <Text style={styles.quickContactText}>Website</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickContactButton} onPress={handleMessage}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.primaryBlue} />
        <Text style={styles.quickContactText}>Message</Text>
      </TouchableOpacity>
    </View>
  </View>
</View>
```

#### 5. Added handleMessage Function
```javascript
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
```

#### 6. Updated Styles
**New Styles:**
- `mainInfoCard` - Card container with shadow and rounded corners
- `logoContainer` - Centers the logo
- `businessInfoContainer` - Container for business details
- `infoRow` - Row layout for icon + text items
- `infoIcon` - Spacing for icons
- `industryText` - Styling for industry text
- `coverageText` - Styling for coverage area text
- `quickContactContainer` - Container for contact buttons with top border
- `quickContactButton` - Pill-shaped buttons with background
- `quickContactText` - Button label styling

**Removed Styles:**
- `businessInfo` (old centered layout)
- `businessIndustry` (replaced by infoRow pattern)
- `businessDescription` (removed from this view)
- `contactSection` (merged into mainInfoCard)
- `contactButtons` (replaced by quickContactContainer)
- `contactButton` (replaced by quickContactButton)
- `contactButtonText` (replaced by quickContactText)

## Visual Layout

```
┌─────────────────────────────────────┐
│  Social Slider                    ✕ │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │        Business Card          │ │
│  │                               │ │
│  │         [Logo/Initials]       │ │
│  │                               │ │
│  │      Fast Lane Leasing        │ │
│  │                               │ │
│  │  💼 Car Broker                │ │
│  │  📍 Regional - NY/NJ          │ │
│  │                               │ │
│  │  ─────────────────────────    │ │
│  │  [Call] [Email] [Website]    │ │
│  │         [Message]             │ │
│  └───────────────────────────────┘ │
│                                     │
│  Photos section...                  │
│  Comments section...                │
│                                     │
└─────────────────────────────────────┘
```

## Features

### 1. Coverage Area Icons
Dynamic icons based on coverage type:
- **local** → `location-outline` (pin icon)
- **regional** → `map-outline` (map icon)
- **national** → `flag-outline` (flag icon)
- **global** → `globe-outline` (globe icon)

### 2. Coverage Area Details
Shows formatted text with additional details:
- Type name (capitalized)
- Radius for local businesses (e.g., "15 miles radius")
- Additional details if available

### 3. Contact Button Visibility
Buttons only show when data is available:
- Call button: requires `phone` field and not "Not specified"
- Email button: requires `contact_email` field and not "Not specified"
- Website button: requires `website` field
- Message button: always visible (requires business_id)

### 4. Message Navigation
When user taps Message button:
1. Social slider closes smoothly
2. Navigates to BusinessMessages screen
3. Passes businessId and businessName as parameters

## Database Fields Used

The component expects these fields from `business_profiles` table:
- `business_id` (UUID) - Primary key
- `business_name` (TEXT) - Business name
- `industry` (TEXT) - Business industry/category
- `image_url` (TEXT) - Logo image URL
- `logo_dominant_color` (TEXT) - Background color for logo
- `coverage_area` (JSONB) - Coverage area object with:
  - `type` (local/regional/national/global)
  - `radius` (number, for local only)
  - `details` (text, optional)
- `phone` (TEXT) - Contact phone number
- `contact_email` (TEXT) - Contact email address
- `website` (TEXT) - Website URL
- `user_id` (UUID) - Owner user ID

## Benefits

1. **Consistent UX**: Matches BusinessProfileSlider layout
2. **Better Information Hierarchy**: Clear visual structure with icons
3. **More Context**: Shows coverage area information
4. **Improved Navigation**: Direct message button
5. **Professional Appearance**: Card-based design with shadows
6. **Better Accessibility**: Icons + text labels for all actions
7. **Responsive Layout**: Adapts to content availability

## Testing Checklist

- [ ] Business info card displays correctly
- [ ] Logo/initials render properly
- [ ] Business name displays
- [ ] Industry shows with briefcase icon
- [ ] Coverage area displays with correct icon
- [ ] Coverage area details format correctly
- [ ] Call button works and shows only when phone available
- [ ] Email button works and shows only when email available
- [ ] Website button works and shows only when website available
- [ ] Message button always shows and navigates correctly
- [ ] Button styling matches screenshot
- [ ] Card has proper shadow/elevation
- [ ] Layout looks good on different screen sizes
- [ ] Swipe-to-close still works properly
