// BusinessLogoInitials Component
// Displays business logo if available, otherwise shows initials fallback
// Initials: First 2 letters of business name in white on medium blue background

import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

/**
 * BusinessLogoInitials Component
 * @param {string} businessName - The business name
 * @param {string} imageUrl - The logo image URL (optional)
 * @param {string} backgroundColor - Background color for logo container (optional)
 * @param {number} size - Size of the logo/initials container (default: 50)
 * @param {object} style - Additional styles to apply
 */
const BusinessLogoInitials = ({ businessName, imageUrl, backgroundColor, size = 50, style }) => {
  // Generate initials from business name
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';

    const trimmed = name.trim();
    if (trimmed.length === 0) return '??';

    // Get first two characters, convert to uppercase
    const initials = trimmed.substring(0, 2).toUpperCase();
    return initials;
  };

  // Generate a vibrant background color based on business name if no explicit color provided
  const generateBackgroundColor = (name) => {
    if (!name) return '#F5F5F5';

    // Use rich, vibrant colors similar to the old implementation
    const vibrantColors = [
      '#1E3A8A', '#DC2626', '#059669', '#7C2D12', '#7C3AED',
      '#0F172A', '#374151', '#92400E', '#1E40AF', '#BE185D',
      '#DB2777', '#EA580C', '#0891B2', '#4338CA', '#6366F1'
    ];

    // Generate consistent hash for the business name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % vibrantColors.length;
    return vibrantColors[index];
  };

  const initials = getInitials(businessName);
  const fontSize = size * 0.4; // Font size proportional to container size

  // If logo image exists, display it
  if (imageUrl) {
    // Use provided backgroundColor, or generate one based on business name, or fallback to white
    const bgColor = backgroundColor || generateBackgroundColor(businessName);

    return (
      <View
        style={[
          styles.logoContainer,
          {
            width: size,
            height: size,
            borderRadius: 16,
            backgroundColor: bgColor,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Otherwise, display initials fallback
  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius: 12,
        },
        style,
      ]}
    >
      <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    backgroundColor: '#4A90E2', // Medium blue background
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF', // White text
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BusinessLogoInitials;
