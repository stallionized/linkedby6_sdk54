import React, { useRef, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { getSession } from './Auth';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  TextInput,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const SLIDER_WIDTH = Math.min(screenWidth * 0.85, 350);

const CreateProjectSlider = ({ isVisible, onClose, onSave, project = null }) => {
  const slideAnim = useRef(new Animated.Value(SLIDER_WIDTH)).current;

  const [projectName, setProjectName] = useState(project ? project.name : '');
  const [projectDescription, setProjectDescription] = useState(project ? project.description : '');
  const [isEditing, setIsEditing] = useState(!!project);
  
  // Update state when project prop changes
  useEffect(() => {
    if (project) {
      setProjectName(project.name);
      setProjectDescription(project.description || '');
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [project]);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SLIDER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const validateAndSave = async () => {
    if (!projectName.trim()) {
      Alert.alert('Validation Error', 'Project Name is required.');
      return;
    }
    
    try {
      // Get the current user's session
      const session = await getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        Alert.alert('Authentication Error', 'You must be logged in to create projects.');
        return;
      }
      
      // Determine if we're creating a new project or updating an existing one
      const projectId = isEditing && project ? project.id : `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Prepare the project data
      const projectData = {
        user_id: userId,
        project_id: projectId,
        project_name: projectName.trim(),
        project_description: projectDescription.trim(),
        updated_at: new Date().toISOString()
      };
      
      // Add created_at only for new projects
      if (!isEditing) {
        projectData.created_at = new Date().toISOString();
      }
      
      let result;
      
      if (isEditing && project) {
        // Update existing project in Supabase
        result = await supabase
          .from('user_projects')
          .update(projectData)
          .eq('project_id', projectId)
          .select();
          
        if (result.error) {
          console.error('Error updating project:', result.error);
          Alert.alert('Error', 'Failed to update project. Please try again.');
          return;
        }
      } else {
        // Create new project in Supabase
        result = await supabase
          .from('user_projects')
          .insert(projectData)
          .select();
          
        if (result.error) {
          console.error('Error creating project:', result.error);
          Alert.alert('Error', 'Failed to create project. Please try again.');
          return;
        }
      }
      
      // Create a project object for the local state
      const updatedProject = {
        id: projectId,
        name: projectName.trim(),
        description: projectDescription.trim(),
        businesses: isEditing && project ? project.businesses || [] : [],
        createdAt: isEditing && project ? project.createdAt : new Date().toISOString(),
        status: 'Active'
      };
      
      // Call the onSave callback with the project data
      onSave && onSave(updatedProject);
      onClose && onClose();
      
      // Reset form fields
      setProjectName('');
      setProjectDescription('');
    } catch (error) {
      console.error('Error in validateAndSave:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.slider,
            {
              transform: [{ translateX: slideAnim }],
              width: SLIDER_WIDTH
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>{isEditing ? 'Edit Project' : 'Create New Project'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Project Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter project name"
              value={projectName}
              onChangeText={setProjectName}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Project Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter project description"
              value={projectDescription}
              onChangeText={setProjectDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />

            <TouchableOpacity style={styles.saveButton} onPress={validateAndSave}>
              <Text style={styles.saveButtonText}>{isEditing ? 'Update Project' : 'Create Project'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  slider: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 50, // Account for safe area
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateProjectSlider;