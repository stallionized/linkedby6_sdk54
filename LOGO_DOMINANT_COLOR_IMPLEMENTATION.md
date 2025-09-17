# Logo Dominant Color Implementation

## Summary
Implemented support for displaying business logos in rounded rectangles with their dominant background color filling the container, similar to Instagram's profile picture functionality.

## Changes Made

### 1. Component Updates
- **BusinessLogoInitials.js**: Already supports `backgroundColor` prop
  - Logos displayed in rounded rectangles (borderRadius: 8)
  - Uses `resizeMode="contain"` to fit logos properly
  - Accepts optional `backgroundColor` prop for logo containers
  - When initials are shown (no logo), keeps the blue background (#4A90E2)

### 2. Database Migration
- **Created**: `supabase/migrations/006_add_logo_dominant_color.sql`
  - Adds `logo_dominant_color` column to `business_profiles` table
  - Stores hex color codes (e.g., #FFFFFF)

### 3. Edge Function
- **Created**: `supabase/functions/extract_logo_color/index.ts`
  - Extracts dominant background color from business logos
  - Can process single businesses or batch process
  - Stores color in database for use by the app

### 4. Component Usage Updates
Updated all files using BusinessLogoInitials to pass the dominant color:
- **SearchScreen.js**: Added `backgroundColor={business.logo_dominant_color}`
- **RecommendedBusinessesScreen.js**: Added `backgroundColor={business.logo_dominant_color}`
- **ConnectionRecommendationsSlider.js**: Added `backgroundColor={business.logo_dominant_color}`
- **BusinessProfileSlider.js**: Added `backgroundColor={profileData.logoDominantColor}` (2 locations)

## How It Works

1. **Logo Display**: When a business has a logo:
   - Logo is displayed in a rounded rectangle container
   - Container background uses the stored `logo_dominant_color`
   - Logo scales to fit using `contain` mode with 4px padding
   - Falls back to white (#ffffff) if no color is stored

2. **Initials Display**: When no logo exists:
   - Shows first 2 letters of business name
   - Uses blue background (#4A90E2)
   - White text for contrast

## Next Steps

To populate dominant colors for existing businesses:

1. **Apply the migration**:
   ```bash
   npx supabase db push
   ```

2. **Deploy the edge function**:
   ```bash
   npx supabase functions deploy extract_logo_color
   ```

3. **Extract colors for existing logos**:
   ```javascript
   // Call the edge function to process all businesses without colors
   await fetch('https://your-project.supabase.co/functions/v1/extract_logo_color', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_ANON_KEY'
     },
     body: JSON.stringify({ batch_size: 50 })
   });
   ```

## Note on Color Extraction

The edge function currently includes placeholder logic for color extraction. For production use, you'll need to:

1. Install an image processing library in the edge function (e.g., using npm specifiers)
2. Implement proper image decoding and pixel sampling
3. Calculate the dominant color from edge pixels
4. Return the hex color code

Alternatively, you can:
- Extract colors client-side when businesses upload logos
- Use a third-party API for color extraction
- Pre-process logos during the upload flow
