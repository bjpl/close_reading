/**
 * Supabase Database Types
 *
 * Auto-generated types for type-safe database operations
 * Generated from database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          color: string
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          color?: string
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          color?: string
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: string
          project_id: string
          user_id: string
          title: string
          file_url: string
          file_type: string
          file_size: number | null
          page_count: number | null
          metadata: Json
          processing_status: string
          processing_error: string | null
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          title: string
          file_url: string
          file_type: string
          file_size?: number | null
          page_count?: number | null
          metadata?: Json
          processing_status?: string
          processing_error?: string | null
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          title?: string
          file_url?: string
          file_type?: string
          file_size?: number | null
          page_count?: number | null
          metadata?: Json
          processing_status?: string
          processing_error?: string | null
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      paragraphs: {
        Row: {
          id: string
          document_id: string
          user_id: string
          content: string
          position: number
          page_number: number | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          content: string
          position: number
          page_number?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          content?: string
          position?: number
          page_number?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paragraphs_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paragraphs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sentences: {
        Row: {
          id: string
          paragraph_id: string
          document_id: string
          user_id: string
          content: string
          position: number
          start_offset: number
          end_offset: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          paragraph_id: string
          document_id: string
          user_id: string
          content: string
          position: number
          start_offset: number
          end_offset: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          paragraph_id?: string
          document_id?: string
          user_id?: string
          content?: string
          position?: number
          start_offset?: number
          end_offset?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentences_paragraph_id_fkey"
            columns: ["paragraph_id"]
            referencedRelation: "paragraphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentences_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      annotations: {
        Row: {
          id: string
          user_id: string
          document_id: string
          paragraph_id: string | null
          sentence_id: string | null
          annotation_type: string
          content: string | null
          highlight_color: string | null
          start_offset: number | null
          end_offset: number | null
          position: Json | null
          metadata: Json
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          paragraph_id?: string | null
          sentence_id?: string | null
          annotation_type: string
          content?: string | null
          highlight_color?: string | null
          start_offset?: number | null
          end_offset?: number | null
          position?: Json | null
          metadata?: Json
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          paragraph_id?: string | null
          sentence_id?: string | null
          annotation_type?: string
          content?: string | null
          highlight_color?: string | null
          start_offset?: number | null
          end_offset?: number | null
          position?: Json | null
          metadata?: Json
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotations_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotations_paragraph_id_fkey"
            columns: ["paragraph_id"]
            referencedRelation: "paragraphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotations_sentence_id_fkey"
            columns: ["sentence_id"]
            referencedRelation: "sentences"
            referencedColumns: ["id"]
          }
        ]
      }
      paragraph_links: {
        Row: {
          id: string
          user_id: string
          source_paragraph_id: string
          target_paragraph_id: string
          link_type: string
          note: string | null
          strength: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_paragraph_id: string
          target_paragraph_id: string
          link_type: string
          note?: string | null
          strength?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_paragraph_id?: string
          target_paragraph_id?: string
          link_type?: string
          note?: string | null
          strength?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paragraph_links_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paragraph_links_source_paragraph_id_fkey"
            columns: ["source_paragraph_id"]
            referencedRelation: "paragraphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paragraph_links_target_paragraph_id_fkey"
            columns: ["target_paragraph_id"]
            referencedRelation: "paragraphs"
            referencedColumns: ["id"]
          }
        ]
      }
      ml_cache: {
        Row: {
          id: string
          model_name: string
          model_version: string
          input_type: string
          input_hash: string
          input_data: Json
          output_data: Json
          processing_time_ms: number | null
          metadata: Json
          created_at: string
          accessed_at: string
          access_count: number
        }
        Insert: {
          id?: string
          model_name: string
          model_version: string
          input_type: string
          input_hash: string
          input_data: Json
          output_data: Json
          processing_time_ms?: number | null
          metadata?: Json
          created_at?: string
          accessed_at?: string
          access_count?: number
        }
        Update: {
          id?: string
          model_name?: string
          model_version?: string
          input_type?: string
          input_hash?: string
          input_data?: Json
          output_data?: Json
          processing_time_ms?: number | null
          metadata?: Json
          created_at?: string
          accessed_at?: string
          access_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_paragraphs: {
        Args: {
          search_query: string
          user_uuid: string
        }
        Returns: {
          paragraph_id: string
          document_id: string
          content: string
          position: number
          rank: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
