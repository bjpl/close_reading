/**
 * Type definitions for the Close-Reading Platform
 */

/**
 * Annotation types supported by the platform
 */
export type AnnotationType = 'highlight' | 'note' | 'main_idea' | 'citation';

/**
 * Annotation color options
 */
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

/**
 * Document view modes
 */
export type ViewMode = 'original' | 'sentence';

/**
 * Represents a single annotation on the document
 */
export interface Annotation {
  id: string;
  type: AnnotationType;
  text: string;
  note?: string;
  color: AnnotationColor;
  startOffset: number;
  endOffset: number;
  paragraphId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a paragraph in the document
 */
export interface Paragraph {
  id: string;
  content: string;
  order: number;
  annotations: Annotation[];
  linkedParagraphs: string[]; // IDs of linked paragraphs
}

/**
 * Represents a sentence in sentence view
 */
export interface Sentence {
  id: string;
  content: string;
  paragraphId: string;
  order: number;
  annotations: Annotation[];
}

/**
 * Represents an uploaded document
 */
export interface Document {
  id: string;
  title: string;
  content: string;
  paragraphs: Paragraph[];
  sentences: Sentence[];
  userId: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a project containing multiple documents
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  documents: Document[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Citation format options
 */
export type CitationFormat = 'mla' | 'apa' | 'chicago';

/**
 * Represents a citation for export
 */
export interface Citation {
  id: string;
  text: string;
  note: string;
  pageNumber?: number;
  documentTitle: string;
  format: CitationFormat;
}

/**
 * Share link configuration
 */
export interface ShareLink {
  id: string;
  documentId: string;
  token: string;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * User profile
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}
