/**
 * DocumentViewer Component Tests
 *
 * Tests for the DocumentViewer component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { DocumentViewer } from '../../../src/components/DocumentViewer';

vi.mock('../../../src/stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    currentDocument: {
      id: 'doc-1',
      title: 'Test Document',
      paragraphs: [
        {
          id: 'para-1',
          text: 'First paragraph',
          annotations: [],
        },
      ],
      sentences: [
        { id: 'sent-1', text: 'First sentence.' },
      ],
    },
    viewMode: 'original',
    setViewMode: vi.fn(),
    addAnnotation: vi.fn(),
  })),
}));

vi.mock('../../../src/stores/annotationStore', () => ({
  useAnnotationStore: vi.fn(() => ({
    activeToolType: null,
    activeColor: 'yellow',
    setSelectedText: vi.fn(),
    setSelectionRange: vi.fn(),
  })),
}));

vi.mock('../../../src/hooks/useAnnotations', () => ({
  useAnnotations: vi.fn(() => ({
    createAnnotation: vi.fn().mockResolvedValue({}),
    isLoading: false,
    error: null,
  })),
}));

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

vi.mock('../../../src/components/Paragraph', () => ({
  Paragraph: ({ paragraph }: any) => (
    <div data-testid={`paragraph-${paragraph.id}`}>{paragraph.text}</div>
  ),
}));

vi.mock('../../../src/components/SentenceView', () => ({
  SentenceView: ({ sentences }: any) => (
    <div data-testid="sentence-view">
      {sentences.map((s: any) => <div key={s.id}>{s.text}</div>)}
    </div>
  ),
}));

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('DocumentViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render document title', () => {
    renderWithChakra(<DocumentViewer />);
    expect(screen.getByText('Test Document')).toBeInTheDocument();
  });

  it('should render view mode buttons', () => {
    renderWithChakra(<DocumentViewer />);
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Sentence by Sentence')).toBeInTheDocument();
  });

  it('should render paragraphs in original mode', () => {
    renderWithChakra(<DocumentViewer />);
    expect(screen.getByTestId('paragraph-para-1')).toBeInTheDocument();
    expect(screen.getByText('First paragraph')).toBeInTheDocument();
  });

  it('should render view label', () => {
    renderWithChakra(<DocumentViewer />);
    expect(screen.getByText('View:')).toBeInTheDocument();
  });

  it('should have clickable view mode buttons', () => {
    renderWithChakra(<DocumentViewer />);
    const originalButton = screen.getByText('Original');
    const sentenceButton = screen.getByText('Sentence by Sentence');

    expect(originalButton).toBeInTheDocument();
    expect(sentenceButton).toBeInTheDocument();

    // Buttons should be clickable
    fireEvent.click(originalButton);
    fireEvent.click(sentenceButton);
  });
});
