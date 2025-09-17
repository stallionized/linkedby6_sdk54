const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Resolve to empty modules for native-only packages on web
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // List of native-only modules that should be mocked on web
    const nativeOnlyModules = [
      'react-native-maps',
      'expo-location',
    ];

    // If we're on web and trying to import a native-only module, return an empty module
    if (platform === 'web' && nativeOnlyModules.some(mod => moduleName.includes(mod))) {
      return {
        type: 'empty',
      };
    }

    // Otherwise, use the default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
