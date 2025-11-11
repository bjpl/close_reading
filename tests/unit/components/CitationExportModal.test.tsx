/**
 * CitationExportModal Component Tests
 *
 * Tests for the CitationExportModal component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { CitationExportModal } from '../../../src/components/CitationExportModal';

vi.mock('../../../src/stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    currentDocument: {
      id: 'doc-1',
      title: 'Research Paper',
      paragraphs: [],
    },
  })),
}));

vi.mock('../../../src/services/citationExport', () => ({
  exportCitations: vi.fn(() => 'Formatted citations'),
  getMimeType: vi.fn(() => 'text/plain'),
  getFileExtension: vi.fn(() => 'txt'),
}));

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('CitationExportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Export Citations')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    renderWithChakra(<CitationExportModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Export Citations')).not.toBeInTheDocument();
  });

  it('should render format selector', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Citation Format:')).toBeInTheDocument();
  });

  it('should render copy button', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Copy citations')).toBeInTheDocument();
  });

  it('should render download button', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Download citations')).toBeInTheDocument();
  });

  it('should render close button', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should show citation count', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/0 citations? found/)).toBeInTheDocument();
  });

  it('should show empty state message', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/No citations found/)).toBeInTheDocument();
  });

  it('should disable buttons when no citations', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Copy citations')).toBeDisabled();
    expect(screen.getByLabelText('Download citations')).toBeDisabled();
  });

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    renderWithChakra(<CitationExportModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should render all format options', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('MLA')).toBeInTheDocument();
    expect(screen.getByText('APA')).toBeInTheDocument();
    expect(screen.getByText('Chicago')).toBeInTheDocument();
    expect(screen.getByText('BibTeX')).toBeInTheDocument();
    expect(screen.getByText('RIS')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should change format when selector changes', async () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);

    const selector = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(selector, { target: { value: 'apa' } });

    await waitFor(() => {
      expect(selector.value).toBe('apa');
    });
  });

  it('should show format guide', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Format Guide:')).toBeInTheDocument();
  });

  it('should display appropriate format guide text', () => {
    renderWithChakra(<CitationExportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/MLA: In-text citation/)).toBeInTheDocument();
  });
});
