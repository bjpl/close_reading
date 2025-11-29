/**
 * ProjectDashboard Component Tests
 *
 * Tests for the ProjectDashboard component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { ProjectDashboard } from '../../../src/components/ProjectDashboard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../src/stores/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    projects: [
      {
        id: 'proj-1',
        title: 'Research Project',
        description: 'A research project',
        updated_at: '2024-01-15T00:00:00Z',
      },
    ],
    setCurrentProject: vi.fn(),
  })),
}));

vi.mock('../../../src/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    isLoading: false,
    createProject: vi.fn().mockResolvedValue({}),
    updateProject: vi.fn().mockResolvedValue({}),
    deleteProject: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    signOut: vi.fn().mockResolvedValue(undefined),
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>{component}</BrowserRouter>
    </ChakraProvider>
  );
};

describe('ProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    renderWithProviders(<ProjectDashboard />);
    expect(screen.getByText('My Projects')).toBeInTheDocument();
  });

  it('should render page description', () => {
    renderWithProviders(<ProjectDashboard />);
    expect(screen.getByText('Organize your documents into projects')).toBeInTheDocument();
  });

  it('should render New Project button', () => {
    renderWithProviders(<ProjectDashboard />);
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  it('should render sign out button', () => {
    renderWithProviders(<ProjectDashboard />);
    expect(screen.getByLabelText('Sign out')).toBeInTheDocument();
  });

  it('should render project cards', () => {
    renderWithProviders(<ProjectDashboard />);
    expect(screen.getByText('Research Project')).toBeInTheDocument();
    expect(screen.getByText('A research project')).toBeInTheDocument();
  });

  it('should open modal when New Project is clicked', async () => {
    renderWithProviders(<ProjectDashboard />);

    const newProjectButton = screen.getByText('New Project');
    fireEvent.click(newProjectButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });
  });

  it('should render edit and delete buttons for projects', () => {
    renderWithProviders(<ProjectDashboard />);
    expect(screen.getByLabelText('Edit project')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete project')).toBeInTheDocument();
  });

  it('should show project name input in modal', async () => {
    renderWithProviders(<ProjectDashboard />);

    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter project name')).toBeInTheDocument();
    });
  });

  it('should show project description textarea in modal', async () => {
    renderWithProviders(<ProjectDashboard />);

    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter project description (optional)')).toBeInTheDocument();
    });
  });

  it('should have Create and Cancel buttons in modal', async () => {
    renderWithProviders(<ProjectDashboard />);

    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });
});
