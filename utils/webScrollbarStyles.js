import { Platform } from 'react-native';

/**
 * Inject custom scrollbar styles for web browsers
 * This needs to be called once when the app initializes on web
 */
export const injectWebScrollbarStyles = () => {
  if (Platform.OS !== 'web') return;

  // Check if styles are already injected
  if (document.getElementById('custom-scrollbar-styles')) {
    console.log('⚠️ Scrollbar styles already injected');
    return;
  }

  const style = document.createElement('style');
  style.id = 'custom-scrollbar-styles';
  style.textContent = `
    /* Force scrollbar to always be visible on all scrollable elements */
    * {
      scrollbar-width: thin !important;
      scrollbar-color: rgba(0, 0, 0, 0.4) rgba(0, 0, 0, 0.1) !important;
    }

    /* Webkit browsers (Chrome, Safari, Edge) - More specific and forceful */
    *::-webkit-scrollbar {
      width: 14px !important;
      height: 14px !important;
      -webkit-appearance: none !important;
    }

    *::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05) !important;
      border-radius: 8px !important;
    }

    *::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.4) !important;
      border-radius: 8px !important;
      border: 3px solid transparent !important;
      background-clip: content-box !important;
      min-height: 40px !important;
    }

    *::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.6) !important;
      background-clip: content-box !important;
    }

    *::-webkit-scrollbar-thumb:active {
      background: rgba(0, 0, 0, 0.7) !important;
      background-clip: content-box !important;
    }

    /* Ensure scrollbars are always shown, not just on hover */
    *::-webkit-scrollbar-track,
    *::-webkit-scrollbar-thumb {
      visibility: visible !important;
    }

    /* Target specific div elements that React Native Web creates */
    div[style*="overflow"] {
      overflow: auto !important;
    }

    /* Remove any overflow hidden from body and root */
    html, body, #root {
      overflow: visible !important;
    }

    /* Specific targeting for common React Native Web patterns */
    [class*="ScrollView"],
    [data-focusable="true"],
    div[style*="flex"],
    div[style*="height: 100%"] {
      scrollbar-width: thin !important;
      scrollbar-color: rgba(0, 0, 0, 0.4) rgba(0, 0, 0, 0.1) !important;
    }
  `;

  document.head.appendChild(style);
  console.log('✅ Custom scrollbar styles injected with', style.textContent.length, 'characters');

  // Force a reflow to ensure styles are applied
  setTimeout(() => {
    document.body.offsetHeight;
    console.log('✅ Forced browser reflow');
  }, 100);
};
