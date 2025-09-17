# ADP Deep Link Guide

## Overview
You now have multiple ways to share your ADP.js React Native presentation with investors through deep links.

## Available Deep Links

### 1. Web Deep Link Page
**URL:** `https://your-netlify-domain.com/adp`
- **What it does:** Opens a professional landing page with options to view the ADP presentation
- **Best for:** Sharing with investors via email, text, or any communication method
- **Features:**
  - Automatically detects mobile vs desktop
  - Provides "Open in App" button for mobile users
  - Fallback to web version if app isn't installed
  - Professional presentation with instructions

### 2. Direct App Deep Link
**URL:** `linkedbysix://adp`
- **What it does:** Opens directly to the ADP.js React Native screen in your app
- **Best for:** Users who already have your app installed
- **Note:** Only works if the Linked By Six app is installed on the device

### 3. Alternative Web Access
**URL:** `https://your-netlify-domain.com/adp-app`
- **What it does:** Same as the main web deep link page
- **Best for:** Having multiple entry points or A/B testing

## How It Works

### For Mobile Users:
1. Click the deep link → Opens landing page
2. Click "📱 Open in App" → Launches your React Native ADP.js screen
3. If app not installed → Automatically offers web version fallback

### For Desktop Users:
1. Click the deep link → Opens landing page with desktop-optimized instructions
2. Click "🌐 View Web Version" → Opens the HTML version of ADP presentation
3. Gets notification that mobile experience is optimized for the React Native version

## Technical Implementation

### App Configuration:
- **Scheme:** `linkedbysix`
- **Deep Link Route:** `/adp`
- **Full Deep Link:** `linkedbysix://adp`

### Files Modified:
- `MyExpoApp/app.json` - Added deep linking scheme
- `MyExpoApp/App.js` - Added deep link handling logic
- `MyExpoApp/dist/adp-deeplink.html` - Created landing page
- `netlify.toml` - Added URL redirects

### Dependencies Added:
- `expo-linking` - Handles deep link navigation in React Native

## Sharing with Investors

### Recommended Approach:
1. **Primary Link:** Share `https://your-netlify-domain.com/adp`
2. **Email Template:**
   ```
   Hi [Investor Name],
   
   Please review our ADP analysis presentation:
   https://your-netlify-domain.com/adp
   
   This link works on both mobile and desktop devices, with an optimized 
   mobile app experience available.
   
   Best regards,
   Linked By Six Team
   ```

### For Mobile-First Sharing:
- Text message: "Check out our ADP analysis: https://your-netlify-domain.com/adp"
- The landing page will automatically optimize for mobile users

## Testing Your Deep Links

### Before Sharing:
1. **Test Web Version:** Visit `https://your-netlify-domain.com/adp` in browser
2. **Test Mobile App:** 
   - Install your Expo app on a mobile device
   - Click "Open in App" from the web page
   - Verify it opens the ADP.js screen
3. **Test Fallback:** Try the deep link without the app installed

### Troubleshooting:
- If deep link doesn't work: Check that expo-linking is properly installed
- If app doesn't open: Verify the scheme "linkedbysix" is correctly configured
- If web version fails: Check netlify.toml redirects are deployed

## Next Steps

1. **Deploy to Netlify:** Make sure all changes are pushed and deployed
2. **Test End-to-End:** Verify the complete investor experience
3. **Share:** Use the web deep link as your primary sharing method
4. **Monitor:** Track which version (app vs web) investors prefer

Your ADP.js React Native screen is now accessible via shareable deep links! 🚀
