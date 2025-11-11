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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Card,
  CardBody,
  IconButton,
  Textarea,
  Grid,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiFolder,
  FiEdit2,
  FiTrash2,
  FiLogOut,
} from 'react-icons/fi';
import { useProjectStore } from '../stores/projectStore';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import type { Database } from '../types/database';
import { formatSimpleDate } from '../utils/dateUtils';

type Project = Database['public']['Tables']['projects']['Row'];

export const ProjectDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { projects, setCurrentProject } = useProjectStore();
  const { isLoading, createProject, updateProject, deleteProject } = useProjects(
    user?.id
  );
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const toast = useToast();

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: 'Project name required',
        description: 'Please enter a project name.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await createProject({
        title: projectName,
        description: projectDescription || null,
      });

      toast({
        title: 'Project created',
        description: `Project "${projectName}" has been created.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
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

      toast({
        title: 'Project updated',
        description: `Project "${projectName}" has been updated.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
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
        toast({
          title: 'Project deleted',
          description: `Project "${projectTitle}" has been deleted.`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        // Error already handled by hook
      }
    }
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project as any);
    navigate(`/project/${project.id}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontSize="3xl" fontWeight="bold">
              My Projects
            </Text>
            <Text color="gray.600">
              Organize your documents into projects
            </Text>
          </VStack>
          <HStack>
            <Button
              colorScheme="blue"
              leftIcon={<FiPlus />}
              onClick={onOpen}
            >
              New Project
            </Button>
            <IconButton
              aria-label="Sign out"
              icon={<FiLogOut />}
              variant="ghost"
              onClick={handleSignOut}
            />
          </HStack>
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
              <Card
                key={project.id}
                cursor="pointer"
                _hover={{ shadow: 'md' }}
                transition="all 0.2s"
                onClick={() => handleOpenProject(project)}
              >
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <HStack>
                        <FiFolder color="#3182CE" />
                        <Text fontWeight="bold" fontSize="lg">
                          {project.title}
                        </Text>
                      </HStack>
                      <HStack
                        onClick={(e) => e.stopPropagation()}
                        spacing={1}
                      >
                        <IconButton
                          aria-label="Edit project"
                          icon={<FiEdit2 />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditProject(project)}
                        />
                        <IconButton
                          aria-label="Delete project"
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() =>
                            handleDeleteProject(project.id, project.title)
                          }
                        />
                      </HStack>
                    </HStack>

                    {project.description && (
                      <Text fontSize="sm" color="gray.600" noOfLines={2}>
                        {project.description}
                      </Text>
                    )}

                    <Text fontSize="xs" color="gray.500">
                      Updated {formatSimpleDate(project.updated_at)}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </Grid>
        )}
      </VStack>

      {/* Create/Edit Project Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
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
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={editingProject ? handleUpdateProject : handleCreateProject}
            >
              {editingProject ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
