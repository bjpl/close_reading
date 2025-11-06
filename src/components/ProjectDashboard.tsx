/**
 * ProjectDashboard Component
 *
 * Displays all projects and their documents with management capabilities.
 */
import React, { useState } from 'react';
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
  Badge,
  Textarea,
  Grid,
  useToast,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiFolder,
  FiFile,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { useProjectStore } from '../stores/projectStore';
import { Project } from '../types';

export const ProjectDashboard: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject, setCurrentProject } =
    useProjectStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const toast = useToast();

  const handleCreateProject = () => {
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

    const newProject: Project = {
      id: `project_${Date.now()}`,
      name: projectName,
      description: projectDescription,
      documents: [],
      userId: 'user_1', // TODO: Get from auth context
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addProject(newProject);

    toast({
      title: 'Project created',
      description: `Project "${projectName}" has been created.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    handleCloseModal();
  };

  const handleUpdateProject = () => {
    if (!editingProject || !projectName.trim()) return;

    updateProject(editingProject.id, {
      name: projectName,
      description: projectDescription,
      updatedAt: new Date(),
    });

    toast({
      title: 'Project updated',
      description: `Project "${projectName}" has been updated.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    handleCloseModal();
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      deleteProject(projectId);
      toast({
        title: 'Project deleted',
        description: `Project "${projectName}" has been deleted.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    // TODO: Navigate to project view
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
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
          <Button
            colorScheme="blue"
            leftIcon={<FiPlus />}
            onClick={onOpen}
          >
            New Project
          </Button>
        </HStack>

        {/* Projects Grid */}
        {projects.length === 0 ? (
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
                          {project.name}
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
                            handleDeleteProject(project.id, project.name)
                          }
                        />
                      </HStack>
                    </HStack>

                    {project.description && (
                      <Text fontSize="sm" color="gray.600" noOfLines={2}>
                        {project.description}
                      </Text>
                    )}

                    <HStack>
                      <Badge colorScheme="blue">
                        <HStack spacing={1}>
                          <FiFile size={12} />
                          <Text>{project.documents.length} documents</Text>
                        </HStack>
                      </Badge>
                    </HStack>

                    <Text fontSize="xs" color="gray.500">
                      Updated {project.updatedAt.toLocaleDateString()}
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
