import { Document, Project, Annotation, Paragraph } from '@types';

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z'
};

export const mockProject: Project = {
  id: 'project-123',
  name: 'Test Project',
  description: 'A test project for unit testing',
  user_id: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_public: false
};

export const mockDocument: Document = {
  id: 'doc-123',
  project_id: mockProject.id,
  title: 'Test Document',
  content: 'This is a test document. It has multiple sentences. Each sentence is parsed separately.',
  file_type: 'txt',
  file_url: 'https://storage.example.com/doc-123.txt',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

export const mockParagraphs: Paragraph[] = [
  {
    id: 'para-1',
    document_id: mockDocument.id,
    content: 'This is the first paragraph.',
    position: 0,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'para-2',
    document_id: mockDocument.id,
    content: 'This is the second paragraph.',
    position: 1,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockAnnotations: Annotation[] = [
  {
    id: 'anno-1',
    document_id: mockDocument.id,
    paragraph_id: 'para-1',
    user_id: mockUser.id,
    type: 'highlight',
    content: 'This is a highlight',
    start_offset: 0,
    end_offset: 10,
    color: '#ffeb3b',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'anno-2',
    document_id: mockDocument.id,
    paragraph_id: 'para-1',
    user_id: mockUser.id,
    type: 'note',
    content: 'This is a note annotation',
    note_text: 'Important concept to remember',
    start_offset: 15,
    end_offset: 25,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockParagraphLink = {
  id: 'link-1',
  source_paragraph_id: 'para-1',
  target_paragraph_id: 'para-2',
  relationship_type: 'related',
  note: 'These paragraphs discuss related concepts',
  created_at: '2024-01-01T00:00:00Z'
};

export const mockCitation = {
  id: 'cite-1',
  document_id: mockDocument.id,
  citation_type: 'bibtex',
  citation_text: '@article{test2024,\n  title={Test Document},\n  author={Test Author},\n  year={2024}\n}',
  metadata: {
    author: 'Test Author',
    year: '2024',
    title: 'Test Document'
  },
  created_at: '2024-01-01T00:00:00Z'
};
