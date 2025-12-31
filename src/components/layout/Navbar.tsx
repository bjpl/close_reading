/**
 * Navbar Component
 *
 * Modern responsive navigation bar with user menu and mobile support.
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  HStack,
  Text,
  Button,
  IconButton,
  Menu,
  Avatar,
  Flex,
  useDisclosure,
  VStack,
  Drawer,
} from '@chakra-ui/react';
import {
  FiMenu,
  FiX,
  FiHome,
  FiUser,
  FiLogOut,
  FiBook,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, children, isActive, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(to);
    onClick?.();
  };

  return (
    <Button
      variant={isActive ? 'solid' : 'ghost'}
      colorScheme={isActive ? 'blue' : 'gray'}
      size="sm"
      onClick={handleClick}
      display="flex"
      alignItems="center"
      gap={2}
    >
      {icon}
      {children}
    </Button>
  );
};

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { open: isOpen, onOpen, onClose } = useDisclosure();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
  ];

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Get user display name or email
  const userDisplayName = user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const userInitials = userDisplayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box
      as="nav"
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
      position="sticky"
      top={0}
      zIndex={100}
      shadow="sm"
    >
      <Flex
        maxW="7xl"
        mx="auto"
        px={{ base: 4, md: 6 }}
        h="16"
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Logo / Brand */}
        <HStack gap={3} cursor="pointer" onClick={() => navigate('/dashboard')}>
          <Box
            bg="blue.500"
            color="white"
            p={2}
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <FiBook size={20} />
          </Box>
          <Text
            fontSize="lg"
            fontWeight="bold"
            display={{ base: 'none', sm: 'block' }}
          >
            Close Reading
          </Text>
        </HStack>

        {/* Desktop Navigation */}
        <HStack gap={2} display={{ base: 'none', md: 'flex' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              isActive={isActivePath(item.to)}
            >
              {item.label}
            </NavLink>
          ))}
        </HStack>

        {/* User Menu (Desktop) */}
        <HStack gap={3} display={{ base: 'none', md: 'flex' }}>
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                p={1}
                borderRadius="full"
              >
                <HStack gap={2}>
                  <Avatar.Root size="sm">
                    <Avatar.Fallback>{userInitials}</Avatar.Fallback>
                  </Avatar.Root>
                  <Text fontSize="sm" fontWeight="medium">
                    {userDisplayName}
                  </Text>
                </HStack>
              </Button>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content minW="180px">
                <Menu.Item value="profile" onClick={() => navigate('/profile')}>
                  <HStack gap={2}>
                    <FiUser />
                    <Text>Profile</Text>
                  </HStack>
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item value="logout" onClick={handleSignOut}>
                  <HStack gap={2} color="red.500">
                    <FiLogOut />
                    <Text>Sign Out</Text>
                  </HStack>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </HStack>

        {/* Mobile Menu Button */}
        <IconButton
          aria-label="Open menu"
          display={{ base: 'flex', md: 'none' }}
          variant="ghost"
          onClick={onOpen}
        >
          <FiMenu size={24} />
        </IconButton>
      </Flex>

      {/* Mobile Drawer */}
      <Drawer.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="end">
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header borderBottomWidth="1px">
              <HStack justify="space-between" w="100%">
                <Text fontWeight="bold">Menu</Text>
                <IconButton
                  aria-label="Close menu"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <FiX size={20} />
                </IconButton>
              </HStack>
            </Drawer.Header>
            <Drawer.Body>
              <VStack align="stretch" gap={2} py={4}>
                {/* User Info */}
                <HStack p={3} bg="gray.50" borderRadius="md" mb={4}>
                  <Avatar.Root size="md">
                    <Avatar.Fallback>{userInitials}</Avatar.Fallback>
                  </Avatar.Root>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{userDisplayName}</Text>
                    <Text fontSize="sm" color="gray.500">{user?.email}</Text>
                  </VStack>
                </HStack>

                {/* Navigation Links */}
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    isActive={isActivePath(item.to)}
                    onClick={onClose}
                  >
                    {item.label}
                  </NavLink>
                ))}

                <NavLink
                  to="/profile"
                  icon={<FiUser />}
                  isActive={location.pathname === '/profile'}
                  onClick={onClose}
                >
                  Profile
                </NavLink>

                {/* Sign Out */}
                <Box pt={4} borderTopWidth="1px" mt={4}>
                  <Button
                    variant="outline"
                    colorScheme="red"
                    w="100%"
                    onClick={() => {
                      onClose();
                      handleSignOut();
                    }}
                  >
                    <FiLogOut style={{ marginRight: '8px' }} />
                    Sign Out
                  </Button>
                </Box>
              </VStack>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </Box>
  );
};
