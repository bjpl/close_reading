// Core type definitions for the Close-Reading Platform

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  title: string;
  description: string | null;
  user_id: string;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
}

export interface Document {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  author?: string;
  content: string;
  file_type: 'txt' | 'md' | 'docx' | 'pdf';
  file_url: string;
  paragraphs?: Paragraph[];
  sentences?: Sentence[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Paragraph {
  id: string;
  document_id: string;
  content: string;
  position: number;
  order?: number;
  annotations?: Annotation[];
  linkedParagraphs?: string[];
  created_at: string;
}

export interface Sentence {
  id: string;
  paragraph_id: string;
  content: string;
  position: number;
  order: number;
  annotations?: Annotation[];
  created_at: string;
}

export type AnnotationType = 'highlight' | 'note' | 'main_idea' | 'citation' | 'question';

export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface Annotation {
  id: string;
  document_id: string;
  paragraph_id: string;
  user_id: string;
  type: AnnotationType;
  content: string;
  text?: string;
  note_text?: string;
  note?: string; // UI alias for note_text
  citation_text?: string;
  color?: AnnotationColor;
  start_offset: number;
  startOffset: number; // UI alias for start_offset
  end_offset: number;
  endOffset: number; // UI alias for end_offset
  created_at: string;
  updated_at: string;
}

export type RelationshipType = 'related' | 'contrasts' | 'supports' | 'elaborates' | 'quotes';

export interface ParagraphLink {
  id: string;
  source_paragraph_id: string;
  target_paragraph_id: string;
  relationship_type: RelationshipType;
  note?: string;
  created_at: string;
  updated_at?: string;
}

// Legacy citation type - kept for database compatibility
export type CitationType = 'bibtex' | 'ris' | 'json';

export interface Citation {
  id: string;
  document_id: string;
  citation_type: CitationType;
  citation_text: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

// Export new citation types
export * from './citation';

export type ViewMode = 'original' | 'sentence';

export interface AppError {
  code: string;
  message: string;
  details?: any;
}
