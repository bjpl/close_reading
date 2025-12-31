/**
 * ProjectDashboard Component
 *
 * Displays all projects and their documents with management capabilities.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Dialog,
  useDisclosure,
  Card,
  IconButton,
  Textarea,
  Grid,
  createToaster,
  Spinner,
} from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
import {
  FiPlus,
  FiFolder,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { useProjectStore } from '../stores/projectStore';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import type { Database } from '../types/database';
import { formatSimpleDate } from '../utils/dateUtils';

type Project = Database['public']['Tables']['projects']['Row'];

export const ProjectDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, setCurrentProject } = useProjectStore();
  const { isLoading, createProject, updateProject, deleteProject } = useProjects(
    user?.id
  );
  const { open: isOpen, onOpen, onClose } = useDisclosure();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toaster.create({
        title: 'Project name required',
        description: 'Please enter a project name.',
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      await createProject({
        title: projectName,
        description: projectDescription || null,
      });

      toaster.create({
        title: 'Project created',
        description: `Project "${projectName}" has been created.`,
        type: 'success',
        duration: 3000,
      });

      handleCloseModal();
    } catch (error) {
      // Error already handled by hook
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !projectName.trim()) return;

    try {
      await updateProject(editingProject.id, {
        title: projectName,
        description: projectDescription || null,
      });

      toaster.create({
        title: 'Project updated',
        description: `Project "${projectName}" has been updated.`,
        type: 'success',
        duration: 3000,
      });

      handleCloseModal();
    } catch (error) {
      // Error already handled by hook
    }
  };

  const handleDeleteProject = async (projectId: string, projectTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectTitle}"?`)) {
      try {
        await deleteProject(projectId);
        toaster.create({
          title: 'Project deleted',
          description: `Project "${projectTitle}" has been deleted.`,
          type: 'info',
          duration: 3000,
        });
      } catch (error) {
        // Error already handled by hook
      }
    }
  };

  const handleOpenProject = (project: Project) => {
    // Type assertion needed for database row to app type compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCurrentProject(project as any);
    navigate(`/project/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.title);
    setProjectDescription(project.description || '');
    onOpen();
  };

  const handleCloseModal = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDescription('');
    onClose();
  };

  return (
    <Box p={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" gap={1}>
            <Text fontSize="3xl" fontWeight="bold">
              My Projects
            </Text>
            <Text color="gray.600">
              Organize your documents into projects
            </Text>
          </VStack>
          <Button
            colorScheme="blue"
            onClick={onOpen}
          >
            <FiPlus /> New Project
          </Button>
        </HStack>

        {/* Projects Grid */}
        {isLoading ? (
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
          </Box>
        ) : projects.length === 0 ? (
          <Box
            p={12}
            textAlign="center"
            borderWidth={2}
            borderRadius="lg"
            borderStyle="dashed"
            borderColor="gray.300"
          >
            <FiFolder size={48} style={{ margin: '0 auto', color: '#A0AEC0' }} />
            <Text mt={4} fontSize="lg" color="gray.600">
              No projects yet
            </Text>
            <Text fontSize="sm" color="gray.500">
              Create your first project to get started
            </Text>
          </Box>
        ) : (
          <Grid
            templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
            gap={4}
          >
            {projects.map((project) => (
              <Card.Root
                key={project.id}
                cursor="pointer"
                _hover={{ shadow: 'md' }}
                transition="all 0.2s"
                onClick={() => handleOpenProject(project)}
              >
                <Card.Body>
                  <VStack align="stretch" gap={3}>
                    <HStack justify="space-between">
                      <HStack>
                        <FiFolder color="#3182CE" />
                        <Text fontWeight="bold" fontSize="lg">
                          {project.title}
                        </Text>
                      </HStack>
                      <HStack
                        onClick={(e) => e.stopPropagation()}
                        gap={1}
                      >
                        <IconButton
                          aria-label="Edit project"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditProject(project)}
                        >
                          <FiEdit2 />
                        </IconButton>
                        <IconButton
                          aria-label="Delete project"
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() =>
                            handleDeleteProject(project.id, project.title)
                          }
                        >
                          <FiTrash2 />
                        </IconButton>
                      </HStack>
                    </HStack>

                    {project.description && (
                      <Text fontSize="sm" color="gray.600" lineClamp={2}>
                        {project.description}
                      </Text>
                    )}

                    <Text fontSize="xs" color="gray.500">
                      Updated {formatSimpleDate(project.updated_at)}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        )}
      </VStack>

      {/* Create/Edit Project Modal */}
      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleCloseModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <VStack gap={4}>
                <Box w="100%">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Project Name *
                  </Text>
                  <Input
                    placeholder="Enter project name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </Box>
                <Box w="100%">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Description
                  </Text>
                  <Textarea
                    placeholder="Enter project description (optional)"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={4}
                  />
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" mr={3} onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={editingProject ? handleUpdateProject : handleCreateProject}
              >
                {editingProject ? 'Update' : 'Create'}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
};
