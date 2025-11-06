/**
 * Dashboard Page
 *
 * Main dashboard showing all projects.
 */
import React from 'react';
import { Box } from '@chakra-ui/react';
import { ProjectDashboard } from '../components/ProjectDashboard';

export const DashboardPage: React.FC = () => {
  return (
    <Box minH="100vh" bg="gray.50">
      <ProjectDashboard />
    </Box>
  );
};
