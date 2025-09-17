import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function ADP() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Image 
          source={require('../assets/logos/logo.png')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerText}>Linked By Six</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Overview</Text>
          <Text style={styles.description}>
            ADP is a leading global technology company providing human capital management 
            solutions that unite HR, payroll, talent, time, tax and benefits administration.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>$16.2B</Text>
              <Text style={styles.metricLabel}>Annual Revenue</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>57,000+</Text>
              <Text style={styles.metricLabel}>Employees</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>920,000+</Text>
              <Text style={styles.metricLabel}>Clients</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Highlights</Text>
          <View style={styles.highlightsList}>
            <Text style={styles.highlight}>• Market leader in HR technology solutions</Text>
            <Text style={styles.highlight}>• Strong recurring revenue model</Text>
            <Text style={styles.highlight}>• Consistent dividend growth</Text>
            <Text style={styles.highlight}>• Digital transformation opportunities</Text>
            <Text style={styles.highlight}>• Global expansion potential</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>View Detailed Analysis</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingLeft: 0, // No left padding - icon at absolute edge
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
    marginLeft: -10, // Increased negative margin to push icon further left
    marginRight: 5, // Further reduced margin for minimal spacing
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
});
