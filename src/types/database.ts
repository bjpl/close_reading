/**
 * Database Types
 *
 * TypeScript types for Supabase database schema.
 * Generated types based on the database migration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          color: string;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          color?: string;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          color?: string;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          file_url: string;
          file_type: string;
          file_size: number | null;
          page_count: number | null;
          metadata: Json;
          processing_status: 'pending' | 'processing' | 'completed' | 'failed';
          processing_error: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          file_url: string;
          file_type: string;
          file_size?: number | null;
          page_count?: number | null;
          metadata?: Json;
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
          processing_error?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          title?: string;
          file_url?: string;
          file_type?: string;
          file_size?: number | null;
          page_count?: number | null;
          metadata?: Json;
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
          processing_error?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      paragraphs: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          content: string;
          position: number;
          page_number: number | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          content: string;
          position: number;
          page_number?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          content?: string;
          position?: number;
          page_number?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      sentences: {
        Row: {
          id: string;
          paragraph_id: string;
          document_id: string;
          user_id: string;
          content: string;
          position: number;
          start_offset: number;
          end_offset: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          paragraph_id: string;
          document_id: string;
          user_id: string;
          content: string;
          position: number;
          start_offset: number;
          end_offset: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          paragraph_id?: string;
          document_id?: string;
          user_id?: string;
          content?: string;
          position?: number;
          start_offset?: number;
          end_offset?: number;
          metadata?: Json;
          created_at?: string;
        };
      };
      annotations: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          paragraph_id: string | null;
          sentence_id: string | null;
          annotation_type: 'highlight' | 'note' | 'main_idea' | 'citation' | 'question';
          content: string | null;
          highlight_color: string | null;
          start_offset: number | null;
          end_offset: number | null;
          position: Json | null;
          metadata: Json;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          paragraph_id?: string | null;
          sentence_id?: string | null;
          annotation_type: 'highlight' | 'note' | 'main_idea' | 'citation' | 'question';
          content?: string | null;
          highlight_color?: string | null;
          start_offset?: number | null;
          end_offset?: number | null;
          position?: Json | null;
          metadata?: Json;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_id?: string;
          paragraph_id?: string | null;
          sentence_id?: string | null;
          annotation_type?: 'highlight' | 'note' | 'main_idea' | 'citation' | 'question';
          content?: string | null;
          highlight_color?: string | null;
          start_offset?: number | null;
          end_offset?: number | null;
          position?: Json | null;
          metadata?: Json;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      paragraph_links: {
        Row: {
          id: string;
          user_id: string;
          source_paragraph_id: string;
          target_paragraph_id: string;
          link_type: 'related' | 'contradicts' | 'supports' | 'elaborates' | 'custom';
          note: string | null;
          strength: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_paragraph_id: string;
          target_paragraph_id: string;
          link_type: 'related' | 'contradicts' | 'supports' | 'elaborates' | 'custom';
          note?: string | null;
          strength?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_paragraph_id?: string;
          target_paragraph_id?: string;
          link_type?: 'related' | 'contradicts' | 'supports' | 'elaborates' | 'custom';
          note?: string | null;
          strength?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
