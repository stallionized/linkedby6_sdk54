import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Modal, Dimensions, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { keepAwake, activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

export default function ADP({ onBack }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const videoRef = useRef(null);

  // Update screen dimensions when window size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  // Calculate 16:9 aspect ratio height based on current container width
  const videoContainerWidth = screenData.width - 40; // Account for padding
  const videoHeight = (videoContainerWidth * 9) / 16;

  const enterVideoFullscreen = async () => {
    setIsVideoFullscreen(true);
    if (Platform.OS !== 'web') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      activateKeepAwake();
    }
  };

  const exitVideoFullscreen = async () => {
    setIsVideoFullscreen(false);
    if (Platform.OS !== 'web') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      deactivateKeepAwake();
    }
  };

  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web') {
        deactivateKeepAwake();
      }
    };
  }, []);

  const slides = [
    {
      title: "Linked By Six",
      subtitle: "Connecting People to Businesses Through Their Network",
      content: "A Strategic Investment & Partnership Opportunity for ADP",
      type: "title"
    },
    {
      title: "The Problem",
      content: "Consumers struggle to find trustworthy businesses and service providers",
      bullets: [
        "Traditional directories lack personal trust signals",
        "Online reviews can be fake or manipulated (especially on email-based platforms)",
        "Word-of-mouth recommendations are powerful but limited to immediate contacts",
        "Businesses waste resources on broad, untargeted marketing",
        "Consumers often pay higher prices without personal connections"
      ],
      footer: "Result: Consumers make uninformed decisions and miss out on better service and pricing, while businesses lose qualified leads",
      slideNumber: "2 / 10"
    },
    {
      title: "The Linked By Six Solution",
      subtitle: "Leveraging the Power of Six Degrees of Separation",
      content: "Linked By Six is a C2B platform that connects consumers to businesses through their personal network relationships",
      bullets: [
        "Users discover businesses through trusted connections in their extended network",
        "Personal relationships unlock better service and better pricing for consumers",
        "Phone number authentication substantially reduces fake reviews (unlike email-based platforms)",
        "Businesses gain access to warm, qualified leads with built-in trust",
        "One-stop shop: Lead generation + business operations tools + customer service solutions",
        "Transform cold outreach into warm introductions"
      ],
      footer: "✓ Provisional Patent Secured",
      slideNumber: "3 / 10"
    },
    {
      title: "How It Works",
      boxes: [
        {
          title: "For Consumers",
          content: "Search for services they need and see which businesses connect to them through their network of friends, family, and colleagues"
        },
        {
          title: "For Businesses", 
          content: "Subscribe to appear in directory, access lead generation tools, and leverage operational efficiency features"
        }
      ],
      highlight: {
        title: "The Six Degrees Advantage",
        content: "Customers receive better service and better prices by leveraging personal relationships. Phone number authentication drastically reduces fake reviews compared to email-based review platforms. Every connection comes with built-in social proof and trust, dramatically increasing conversion rates compared to traditional directories"
      },
      slideNumber: "4 / 10"
    },
    {
      title: "Business Model",
      subtitle: "B2B SaaS Subscription Revenue",
      content: "Businesses pay recurring subscriptions for:",
      bullets: [
        "Directory placement based on personal relationships businesses create",
        "Employee seat licenses - allowing customers to leverage relationships with employees",
        "Lead generation and customer acquisition tools",
        "Business operations and efficiency solutions",
        "Enhanced customer service capabilities",
        "Analytics and insights on network connections"
      ],
      footer: "Scalable, predictable recurring revenue with low customer acquisition cost due to network effects and relationship-based placement model",
      slideNumber: "5 / 10"
    },
    {
      title: "Market Opportunity",
      content: "Massive addressable market at the intersection of multiple growing sectors:",
      bullets: [
        "Business directory and lead generation market",
        "Small and medium business software tools",
        "Social networking and trusted recommendation platforms",
        "Customer relationship management solutions"
      ],
      highlight: {
        title: "Key Market Dynamics",
        content: "SMBs increasingly need integrated solutions that combine marketing, operations, and customer service. Linked By Six delivers all three powered by trusted network connections."
      },
      slideNumber: "6 / 10"
    },
    {
      title: "Why ADP?",
      subtitle: "Perfect Strategic Alignment",
      boxes: [
        {
          title: "ADP's Assets",
          content: "Massive base of business clients already using ADP for payroll, HR, and workforce management"
        },
        {
          title: "Linked By Six's Value",
          content: "Lead generation and customer acquisition tools that drive business growth for ADP clients"
        }
      ],
      highlight: {
        title: "Value-Added Service for ADP",
        content: "Linked By Six becomes a premium value-added service ADP can offer to their current business portfolio - strengthening client relationships, increasing retention, and creating new revenue streams"
      },
      footer: "ADP clients need customers. Linked By Six delivers qualified leads through trusted networks.",
      slideNumber: "7 / 10"
    },
    {
      title: "Strategic Partnership Vision",
      subtitle: "Integrated Platform Approach",
      content: "Embed ADP services directly within Linked By Six:",
      bullets: [
        "ADP payroll tools integrated into Linked By Six business dashboard",
        "HR management features available to Linked By Six subscribers",
        "Workforce management solutions as premium add-ons",
        "Seamless experience: Find customers AND manage operations in one platform"
      ],
      highlight: {
        title: "Win-Win-Win Integration",
        content: "ADP expands its SMB reach and offers Linked By Six as a value-added service to existing clients. Linked By Six becomes a more complete business solution. Both platforms become stickier and more valuable. ADP clients gain a powerful new tool for business growth."
      },
      slideNumber: "8 / 10"
    },
    {
      title: "Traction & Validation",
      content: "Linked By Six has demonstrated product-market fit:",
      bullets: [
        "Provisional Patent secured - protecting our unique network-based business discovery technology",
        "Investor video showcasing user and business benefits completed",
        "Platform demonstrates clear value proposition for both sides of marketplace",
        "Ready to scale with strategic partner and investment"
      ],
      footer: "This is the ideal time for ADP to invest before Linked By Six achieves broader market penetration",
      slideNumber: "9 / 10"
    },
    {
      title: "The Ask",
      content: "We're seeking a comprehensive strategic partnership with ADP:",
      boxes: [
        {
          title: "💰 Investment",
          content: "Capital to accelerate growth and platform development"
        },
        {
          title: "🤝 Partnership",
          content: "Integration of ADP services within Linked By Six platform"
        }
      ],
      extraBox: {
        title: "👥 Client Access",
        content: "Introduction to ADP's business client base to rapidly scale Linked By Six adoption"
      },
      cta: {
        title: "Let's Build the Future Together",
        content: "Linked By Six + ADP: Connecting businesses to customers and empowering operations"
      },
      slideNumber: "10 / 10"
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const PresentationViewer = ({ isFullscreen = false }) => {
    const slide = slides[currentSlide];
    const containerStyle = isFullscreen ? styles.fullscreenPresentation : styles.embeddedPresentation;
    
    return (
      <View style={containerStyle}>
        <View style={isFullscreen ? styles.fullscreenSlide : styles.embeddedSlide}>
          <ScrollView contentContainerStyle={styles.slideContent}>
            <View style={styles.textContainer}>
              <Text style={isFullscreen ? styles.fullscreenTitle : styles.embeddedTitle}>
                {slide.title}
              </Text>
            </View>
            
            {slide.subtitle && (
              <View style={styles.textContainer}>
                <Text style={isFullscreen ? styles.fullscreenSubtitle : styles.embeddedSubtitle}>
                  {slide.subtitle}
                </Text>
              </View>
            )}
            
            {slide.content && (
              <View style={styles.textContainer}>
                <Text style={isFullscreen ? styles.fullscreenContent : styles.embeddedContent}>
                  {slide.content}
                </Text>
              </View>
            )}
            
            {slide.bullets && (
              <View style={styles.textContainer}>
                <View style={styles.bulletContainer}>
                  {slide.bullets.map((bullet, index) => (
                    <Text key={index} style={isFullscreen ? styles.fullscreenBullet : styles.embeddedBullet}>
                      → {bullet}
                    </Text>
                  ))}
                </View>
              </View>
            )}
            
            {slide.boxes && (
              <View style={styles.textContainer}>
                <View style={styles.boxContainer}>
                  {slide.boxes.map((box, index) => (
                    <View key={index} style={styles.box}>
                      <Text style={styles.boxTitle}>{box.title}</Text>
                      <Text style={styles.boxContent}>{box.content}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {slide.highlight && (
              <View style={styles.textContainer}>
                <View style={styles.highlight}>
                  <Text style={styles.highlightTitle}>{slide.highlight.title}</Text>
                  <Text style={styles.highlightContent}>{slide.highlight.content}</Text>
                </View>
              </View>
            )}
            
            {slide.extraBox && (
              <View style={styles.textContainer}>
                <View style={[styles.box, { flex: 1, marginTop: 10 }]}>
                  <Text style={styles.boxTitle}>{slide.extraBox.title}</Text>
                  <Text style={styles.boxContent}>{slide.extraBox.content}</Text>
                </View>
              </View>
            )}
            
            {slide.cta && (
              <View style={styles.textContainer}>
                <View style={styles.cta}>
                  <Text style={styles.ctaTitle}>{slide.cta.title}</Text>
                  <Text style={styles.ctaContent}>{slide.cta.content}</Text>
                </View>
              </View>
            )}
            
            {slide.footer && (
              <View style={styles.textContainer}>
                <Text style={isFullscreen ? styles.fullscreenFooter : styles.embeddedFooter}>
                  {slide.footer}
                </Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.navigation}>
            <TouchableOpacity 
              style={[styles.navButton, currentSlide === 0 && styles.navButtonDisabled]}
              onPress={prevSlide}
              disabled={currentSlide === 0}
            >
              <Text style={styles.navButtonText}>← Previous</Text>
            </TouchableOpacity>
            
            <Text style={styles.slideCounter}>
              {currentSlide + 1} / {slides.length}
            </Text>
            
            <TouchableOpacity 
              style={[styles.navButton, currentSlide === slides.length - 1 && styles.navButtonDisabled]}
              onPress={nextSlide}
              disabled={currentSlide === slides.length - 1}
            >
              <Text style={styles.navButtonText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Image 
          source={require('./assets/logo.png')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerText}>Linked By Six</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome ADP</Text>
          <Text style={styles.description}>
            We’re excited to explore how Linked By Six and ADP can work together to innovate the way people and businesses connect through trust and technology.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Concept Video</Text>
          <Text style={styles.description}>
            Watch our concept video to see how Linked By Six transforms the way people discover and connect with businesses through their trusted network.
          </Text>
          
          <View style={[styles.videoContainer, { height: videoHeight }]}>
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: '/11_04_25_Linked_By_Six_Concept_329pm.mp4' }}
              controls={true}
              resizeMode="contain"
              paused={true}
              onFullscreenPlayerWillPresent={enterVideoFullscreen}
              onFullscreenPlayerWillDismiss={exitVideoFullscreen}
              fullscreen={isVideoFullscreen}
              poster="https://via.placeholder.com/640x360/000000/FFFFFF?text=Linked+By+Six+Concept+Video" // Optional poster image
            />
            
            <TouchableOpacity 
              style={styles.videoFullscreenButton}
              onPress={enterVideoFullscreen}
            >
              <Ionicons name="expand" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strategy & Partnership</Text>
          <Text style={styles.description}>
            The strategy deck highlights multiple ways we can collaborate, designed to stay flexible and evolve with ADP's vision for how we move forward together. We also welcome any additional directions or ideas ADP would like to explore as part of this partnership.
          </Text>
          <View style={[styles.webViewContainer, { height: videoHeight, marginTop: 20 }]}>
            <PresentationViewer isFullscreen={false} />
            <TouchableOpacity 
              style={styles.fullscreenButton}
              onPress={() => setIsFullscreen(true)}
            >
              <Text style={styles.fullscreenButtonText}>⛶ Fullscreen</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Presentation Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity 
            style={styles.exitFullscreenButtonOverlay}
            onPress={() => setIsFullscreen(false)}
          >
            <Text style={styles.exitFullscreenButtonText}>✕ Exit Fullscreen</Text>
          </TouchableOpacity>
          <PresentationViewer isFullscreen={true} />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBar: {
    backgroundColor: '#ffffff',
    paddingLeft: 25, // Increased left padding to move elements further right
    paddingRight: 20,
    paddingTop: 15, // Reduced top padding
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 60, // Reduced minimum height
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginLeft: 0, // Removed negative margin
    marginRight: 10, // Increased margin for better spacing
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  metric: {
    alignItems: 'center',
    marginBottom: 15,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  metricLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  highlightsList: {
    paddingLeft: 10,
  },
  highlight: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webViewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // Height will be set dynamically via inline style to match video player
  },
  webView: {
    flex: 1,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  fullscreenButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0066cc',
  },
  exitFullscreenButtonOverlay: {
    position: 'absolute',
    top: 10,
    right: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    zIndex: 1000,
  },
  exitFullscreenButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fullscreenWebView: {
    flex: 1,
  },
  // Presentation Styles
  embeddedPresentation: {
    flex: 1,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPresentation: {
    flex: 1,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  embeddedSlide: {
    backgroundColor: 'white',
    width: '55%',
    height: '85%',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },
  fullscreenSlide: {
    backgroundColor: 'white',
    width: '80%',
    height: '85%',
    borderRadius: 25,
    paddingHorizontal: 50,
    paddingVertical: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 35,
    elevation: 18,
  },
  slideContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  textContainer: {
    width: '100%',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    marginLeft: 0,
  },
  embeddedTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 15,
    textAlign: 'left',
  },
  fullscreenTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 25,
    textAlign: 'left',
  },
  embeddedSubtitle: {
    fontSize: 22,
    color: '#0066cc',
    fontWeight: '500',
    marginBottom: 15,
    textAlign: 'left',
  },
  fullscreenSubtitle: {
    fontSize: 28,
    color: '#0066cc',
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'left',
  },
  embeddedContent: {
    fontSize: 18,
    color: '#555',
    marginBottom: 15,
    textAlign: 'left',
    lineHeight: 26,
  },
  fullscreenContent: {
    fontSize: 24,
    color: '#555',
    marginBottom: 20,
    textAlign: 'left',
    lineHeight: 32,
  },
  bulletContainer: {
    marginVertical: 15,
  },
  embeddedBullet: {
    fontSize: 16,
    color: '#555',
    marginVertical: 5,
    lineHeight: 24,
  },
  fullscreenBullet: {
    fontSize: 20,
    color: '#555',
    marginVertical: 7,
    lineHeight: 28,
  },
  boxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  box: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    flex: 0.48,
    borderLeftWidth: 5,
    borderLeftColor: '#0066cc',
  },
  boxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 10,
  },
  boxContent: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  highlight: {
    backgroundColor: '#e3f2fd',
    padding: 25,
    borderRadius: 15,
    marginVertical: 15,
  },
  highlightTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  highlightContent: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  embeddedFooter: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'left',
    lineHeight: 24,
  },
  fullscreenFooter: {
    fontSize: 20,
    color: '#0066cc',
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'left',
    lineHeight: 28,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0066cc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#0066cc',
    fontWeight: '600',
    fontSize: 12,
  },
  slideCounter: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  cta: {
    backgroundColor: '#0066cc',
    padding: 20,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaContent: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Video Styles
  videoContainer: {
    position: 'relative',
    marginTop: 15,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // Height will be set dynamically via inline style
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoFullscreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    zIndex: 1,
  },
  videoFullscreenButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoInfo: {
    marginTop: 15,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  videoDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
});
