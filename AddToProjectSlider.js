import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabaseClient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const colors = {
  primaryBlue: '#1E88E5',
  lightBlue: '#90CAF9',
  darkBlue: '#0D47A1',
  backgroundGray: '#F5F7FA',
  cardWhite: '#FFFFFF',
  textDark: '#263238',
  textMedium: '#546E7A',
  textLight: '#90A4AE',
  borderLight: '#E0E7FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

const AddToProjectSlider = ({ 
  isVisible, 
  onClose, 
  businessId, 
  userId 
}) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [addingToProjects, setAddingToProjects] = useState(false);

  useEffect(() => {
    if (isVisible && userId) {
      fetchUserProjects();
      fetchExistingProjectMemberships();
    }
  }, [isVisible, userId, businessId]);

  const fetchUserProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingProjectMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('project_businesses')
        .select('project_id')
        .eq('business_id', businessId);

      if (error) {
        throw error;
      }

      const existingProjectIds = data.map(item => item.project_id);
      setSelectedProjects(existingProjectIds);
    } catch (err) {
      console.error('Error fetching existing memberships:', err);
    }
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  const createNewProject = async () => {
    if (!newProjectName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    try {
      setCreatingProject(true);

      const { data, error } = await supabase
        .from('projects')
        .insert([{
          user_id: userId,
          name: newProjectName.trim(),
          description: newProjectDescription.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the new project to the list
      setProjects(prev => [data, ...prev]);
      
      // Select the new project
      setSelectedProjects(prev => [...prev, data.project_id]);

      // Close the modal and reset form
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectDescription('');

      Alert.alert('Success', 'Project created successfully!');
    } catch (err) {
      console.error('Error creating project:', err);
      Alert.alert('Error', err.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const saveProjectMemberships = async () => {
    try {
      setAddingToProjects(true);

      // First, get current memberships
      const { data: currentMemberships, error: fetchError } = await supabase
        .from('project_businesses')
        .select('project_id')
        .eq('business_id', businessId);

      if (fetchError) {
        throw fetchError;
      }

      const currentProjectIds = currentMemberships.map(item => item.project_id);

      // Find projects to add and remove
      const projectsToAdd = selectedProjects.filter(id => !currentProjectIds.includes(id));
      const projectsToRemove = currentProjectIds.filter(id => !selectedProjects.includes(id));

      // Remove from projects
      if (projectsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('project_businesses')
          .delete()
          .eq('business_id', businessId)
          .in('project_id', projectsToRemove);

        if (removeError) {
          throw removeError;
        }
      }

      // Add to projects
      if (projectsToAdd.length > 0) {
        const insertData = projectsToAdd.map(projectId => ({
          project_id: projectId,
          business_id: businessId,
          added_at: new Date().toISOString()
        }));

        const { error: addError } = await supabase
          .from('project_businesses')
          .insert(insertData);

        if (addError) {
          throw addError;
        }
      }

      const actionCount = projectsToAdd.length + projectsToRemove.length;
      if (actionCount > 0) {
        Alert.alert('Success', 'Project memberships updated successfully!');
      }

      onClose();
    } catch (err) {
      console.error('Error saving project memberships:', err);
      Alert.alert('Error', err.message || 'Failed to update project memberships');
    } finally {
      setAddingToProjects(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add to Projects</Text>
          <TouchableOpacity 
            style={[styles.saveButton, addingToProjects && styles.saveButtonDisabled]} 
            onPress={saveProjectMemberships}
            disabled={addingToProjects}
          >
            {addingToProjects ? (
              <ActivityIndicator size="small" color={colors.cardWhite} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primaryBlue} />
              <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchUserProjects}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Create New Project Button */}
              <TouchableOpacity 
                style={styles.createProjectButton}
                onPress={() => setShowNewProjectModal(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.primaryBlue} />
                <Text style={styles.createProjectText}>Create New Project</Text>
              </TouchableOpacity>

              {/* Projects List */}
              <ScrollView style={styles.projectsList} showsVerticalScrollIndicator={false}>
                {projects.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="folder-outline" size={64} color={colors.textLight} />
                    <Text style={styles.emptyStateText}>No projects yet</Text>
                    <Text style={styles.emptyStateSubtext}>Create your first project to get started</Text>
                  </View>
                ) : (
                  projects.map((project) => {
                    const isSelected = selectedProjects.includes(project.project_id);
                    
                    return (
                      <TouchableOpacity
                        key={project.project_id}
                        style={[styles.projectItem, isSelected && styles.projectItemSelected]}
                        onPress={() => toggleProjectSelection(project.project_id)}
                      >
                        <View style={styles.projectInfo}>
                          <Text style={[styles.projectName, isSelected && styles.projectNameSelected]}>
                            {project.name}
                          </Text>
                          {project.description && (
                            <Text style={[styles.projectDescription, isSelected && styles.projectDescriptionSelected]}>
                              {project.description}
                            </Text>
                          )}
                          <Text style={[styles.projectDate, isSelected && styles.projectDateSelected]}>
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={18} color={colors.cardWhite} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}
        </View>

        {/* New Project Modal */}
        <Modal
          visible={showNewProjectModal}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowNewProjectModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewProjectModal(false)}>
                <Text style={styles.modalCancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Project</Text>
              <TouchableOpacity 
                onPress={createNewProject}
                disabled={creatingProject || !newProjectName.trim()}
              >
                {creatingProject ? (
                  <ActivityIndicator size="small" color={colors.primaryBlue} />
                ) : (
                  <Text style={[
                    styles.modalCreateButton,
                    (!newProjectName.trim()) && styles.modalCreateButtonDisabled
                  ]}>
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Project Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                  placeholder="Enter project name"
                  maxLength={100}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={newProjectDescription}
                  onChangeText={setNewProjectDescription}
                  placeholder="Enter project description"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.primaryBlue,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  saveButton: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMedium,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.cardWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  createProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  createProjectText: {
    fontSize: 16,
    color: colors.primaryBlue,
    fontWeight: '600',
    marginLeft: 8,
  },
  projectsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMedium,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  projectItemSelected: {
    borderColor: colors.primaryBlue,
    backgroundColor: '#F0F9FF',
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  projectNameSelected: {
    color: colors.primaryBlue,
  },
  projectDescription: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 6,
    lineHeight: 20,
  },
  projectDescriptionSelected: {
    color: colors.textDark,
  },
  projectDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  projectDateSelected: {
    color: colors.textMedium,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardWhite,
  },
  checkboxSelected: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalCancelButton: {
    fontSize: 16,
    color: colors.primaryBlue,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  modalCreateButton: {
    fontSize: 16,
    color: colors.primaryBlue,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalCreateButtonDisabled: {
    color: colors.textLight,
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textDark,
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default AddToProjectSlider;