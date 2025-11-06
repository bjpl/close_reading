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
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

export interface Document {
  id: string;
  project_id: string;
  title: string;
  content: string;
  file_type: 'txt' | 'md' | 'docx' | 'pdf';
  file_url: string;
  created_at: string;
  updated_at: string;
}

export interface Paragraph {
  id: string;
  document_id: string;
  content: string;
  position: number;
  created_at: string;
}

export interface Sentence {
  id: string;
  paragraph_id: string;
  content: string;
  position: number;
  created_at: string;
}

export type AnnotationType = 'highlight' | 'note' | 'main_idea' | 'citation';

export interface Annotation {
  id: string;
  document_id: string;
  paragraph_id: string;
  user_id: string;
  type: AnnotationType;
  content: string;
  note_text?: string;
  citation_text?: string;
  color?: string;
  start_offset: number;
  end_offset: number;
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

export interface ViewMode {
  type: 'original' | 'sentence';
}

export interface AppError {
  code: string;
  message: string;
  details?: any;
}
