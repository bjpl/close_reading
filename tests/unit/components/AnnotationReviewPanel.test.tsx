/**
 * AnnotationReviewPanel Component Tests
 *
 * Tests for the refactored AnnotationReviewPanel component with hooks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { AnnotationReviewPanel } from '../../../src/components/AnnotationReviewPanel';

// Mock all hooks and stores
vi.mock('../../../src/stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    currentDocument: {
      id: 'doc-1',
      title: 'Test Document',
      paragraphs: [
        {
          id: 'para-1',
          text: 'Paragraph 1',
          annotations: [
            {
              id: 'ann-1',
              text: 'Test annotation 1',
              type: 'highlight',
              color: 'yellow',
              note: 'Test note',
              created_at: new Date().toISOString(),
            },
          ],
        },
      ],
    },
    deleteAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
  })),
}));

vi.mock('../../../src/hooks/useAnnotations', () => ({
  useAnnotations: vi.fn(() => ({
    deleteAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    createAnnotation: vi.fn(),
    getAnnotations: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    loading: false,
    error: null,
  })),
}));

vi.mock('../../../src/hooks/useAnnotationFilters', () => ({
  useAnnotationFilters: vi.fn((annotations) => annotations),
}));

vi.mock('../../../src/hooks/useAnnotationGrouping', () => ({
  useAnnotationGrouping: vi.fn((annotations) => ({
    highlight: annotations.filter((a: any) => a.type === 'highlight'),
  })),
}));

vi.mock('../../../src/hooks/useAnnotationStatistics', () => ({
  useAnnotationStatistics: vi.fn(() => ({
    annotationCounts: { highlight: 1 },
    statistics: {
      total: 1,
      withNotes: 1,
      mostUsedColor: 'yellow',
      byType: { highlight: 1 },
    },
  })),
}));

vi.mock('../../../src/hooks/useAnnotationActions', () => ({
  useAnnotationActions: vi.fn(() => ({
    handleDelete: vi.fn(),
    handleUpdate: vi.fn(),
    handleJumpTo: vi.fn(),
  })),
}));

vi.mock('../../../src/hooks/useAnnotationExport', () => ({
  useAnnotationExport: vi.fn(() => ({
    handleExport: vi.fn(),
  })),
}));

// Mock child components
vi.mock('../../../src/components/AnnotationListItem', () => ({
  AnnotationListItem: ({ annotation }: any) => (
    <div data-testid={`annotation-item-${annotation.id}`}>{annotation.text}</div>
  ),
}));

vi.mock('../../../src/components/AnnotationFilterPanel', () => ({
  AnnotationFilterPanel: () => <div data-testid="filter-panel">Filter Panel</div>,
}));

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('AnnotationReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render panel with title', () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);
    expect(screen.getByText('Annotations')).toBeInTheDocument();
  });

  it('should render annotation count badge', () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render annotations', () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);
    expect(screen.getByTestId('annotation-item-ann-1')).toBeInTheDocument();
  });

  it('should have filter button', () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);
    expect(screen.getByLabelText('Filters')).toBeInTheDocument();
  });

  it('should have statistics button', () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);
    expect(screen.getByLabelText('Statistics')).toBeInTheDocument();
  });

  it('should have export button', () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);
    expect(screen.getByLabelText('Export')).toBeInTheDocument();
  });

  it('should toggle panel on button click', async () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);

    const toggleButton = screen.getByLabelText('Collapse panel');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Expand panel')).toBeInTheDocument();
    });
  });

  it('should show filter panel when filter button is clicked', async () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);

    const filterButton = screen.getByLabelText('Filters');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });
  });

  it('should show statistics when stats button is clicked', async () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);

    const statsButton = screen.getByLabelText('Statistics');
    fireEvent.click(statsButton);

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  it('should render group by selector', () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);
    const selector = screen.getByDisplayValue('Group by Type');
    expect(selector).toBeInTheDocument();
  });

  it('should change grouping when selector changes', async () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);

    const selector = screen.getByDisplayValue('Group by Type') as HTMLSelectElement;
    fireEvent.change(selector, { target: { value: 'color' } });

    await waitFor(() => {
      expect(selector.value).toBe('color');
    });
  });

  it('should show export menu when export button is clicked', async () => {
    renderWithChakra(<AnnotationReviewPanel documentId="doc-1" />);

    const exportButton = screen.getByLabelText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });
  });
});
