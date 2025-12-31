/**
 * AppLayout Component
 *
 * Main layout wrapper for authenticated pages.
 * Provides consistent navigation and structure across the app.
 */
import React from 'react';
import { Box } from '@chakra-ui/react';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar />
      <Box as="main" id="main-content">
        {children}
      </Box>
    </Box>
  );
};
