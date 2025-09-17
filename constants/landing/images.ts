// Local image assets
// For React Native, local images need to be required/imported statically

export const LocalImages = {
  logo: require("../../assets/landing/images/logo.png"),
  foundersPhoto: require("../../assets/landing/images/founders_photo.jpg"),
  networkEffect: require("../../assets/landing/images/network_effect.png"),
  heroBusinessBg: require("../../assets/landing/images/hero-business-bg.png"),
  growthBusinessSite: require("../../assets/landing/images/Growth_Business_Site.png"),
  searchResultsBusinessSite: require("../../assets/landing/images/Search_Results_Business_Site.png"),
} as const;

// Helper function to resolve local paths to actual assets
export const resolveImageSource = (path: string) => {
  if (path.startsWith("/")) {
    // Local path
    switch (path) {
      case "/founders_photo.jpg":
        return LocalImages.foundersPhoto;
      case "/network_effect.png":
        return LocalImages.networkEffect;
      case "/hero-business-bg.png":
        return LocalImages.heroBusinessBg;
      case "/Growth_Business_Site.png":
        return LocalImages.growthBusinessSite;
      case "/Search_Results_Business_Site.png":
        return LocalImages.searchResultsBusinessSite;
      default:
        // Return as URI if not found in local assets
        return { uri: path };
    }
  }
  // Remote URL
  return { uri: path };
};
