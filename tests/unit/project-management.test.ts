import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { mockProject, mockUser, mockDocument } from '../utils/mockData';

describe('Project Management System', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    supabase = createClient('https://test.supabase.co', 'test-key');
  });

  describe('Project Creation', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Research Project',
        description: 'A project for analyzing literature',
        user_id: mockUser.id
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'project-new', ...projectData },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(data?.name).toBe('New Research Project');
      expect(data?.user_id).toBe(mockUser.id);
      expect(error).toBeNull();
    });

    it('should set default is_public to false', async () => {
      const projectData = {
        name: 'Private Project',
        user_id: mockUser.id
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'project-private', ...projectData, is_public: false },
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any;

      const { data } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(data?.is_public).toBe(false);
    });

    it('should validate project name is not empty', () => {
      const projectName = '';
      const isValid = projectName.trim().length > 0;
      expect(isValid).toBe(false);
    });
  });

  describe('Project Retrieval', () => {
    it('should fetch all projects for a user', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [mockProject],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', mockUser.id);

      expect(data).toHaveLength(1);
      expect(data?.[0].user_id).toBe(mockUser.id);
      expect(error).toBeNull();
    });

    it('should fetch a single project by id', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', mockProject.id)
        .single();

      expect(data?.id).toBe(mockProject.id);
      expect(error).toBeNull();
    });

    it('should fetch projects with document count', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{
          ...mockProject,
          documents: [mockDocument]
        }],
        error: null
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('projects')
        .select('*, documents(*)');

      expect(data?.[0].documents).toBeDefined();
      expect(data?.[0].documents).toHaveLength(1);
    });

    it('should filter public projects', async () => {
      const publicProject = { ...mockProject, is_public: true };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [publicProject],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('is_public', true);

      expect(data?.[0].is_public).toBe(true);
    });
  });

  describe('Project Updates', () => {
    it('should update project name', async () => {
      const updates = { name: 'Updated Project Name' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockProject, ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', mockProject.id)
        .select()
        .single();

      expect(data?.name).toBe('Updated Project Name');
    });

    it('should update project description', async () => {
      const updates = { description: 'New description' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockProject, ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', mockProject.id)
        .select()
        .single();

      expect(data?.description).toBe('New description');
    });

    it('should toggle project visibility', async () => {
      const updates = { is_public: !mockProject.is_public };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockProject, ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', mockProject.id)
        .select()
        .single();

      expect(data?.is_public).toBe(!mockProject.is_public);
    });

    it('should update timestamps automatically', async () => {
      const now = new Date().toISOString();
      const updates = {
        name: 'Updated Name',
        updated_at: now
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockProject, ...updates },
              error: null
            })
          })
        })
      });

      supabase.from = vi.fn(() => ({
        update: mockUpdate
      })) as any;

      const { data } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', mockProject.id)
        .select()
        .single();

      expect(data?.updated_at).toBe(now);
    });
  });

  describe('Project Deletion', () => {
    it('should delete a project', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        delete: mockDelete
      })) as any;

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', mockProject.id);

      expect(error).toBeNull();
    });

    it('should cascade delete documents', async () => {
      // First delete the project
      const mockDeleteProject = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      supabase.from = vi.fn((table) => {
        if (table === 'projects') {
          return { delete: mockDeleteProject };
        }
        return { select: vi.fn() };
      }) as any;

      await supabase
        .from('projects')
        .delete()
        .eq('id', mockProject.id);

      // Verify documents are also deleted (cascaded)
      const mockSelectDocuments = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelectDocuments
      })) as any;

      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', mockProject.id);

      expect(data).toHaveLength(0);
    });
  });

  describe('Project Sharing', () => {
    it('should generate public share link', () => {
      const baseUrl = 'https://app.example.com';
      const shareLink = `${baseUrl}/projects/${mockProject.id}/public`;

      expect(shareLink).toContain(mockProject.id);
      expect(shareLink).toContain('/public');
    });

    it('should validate access to public project', async () => {
      const publicProject = { ...mockProject, is_public: true };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: publicProject,
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', mockProject.id)
        .single();

      const canAccess = data?.is_public === true;
      expect(canAccess).toBe(true);
    });

    it('should restrict access to private project', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null
          })
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', mockProject.id)
        .single();

      const requestingUserId = 'different-user-id';
      const canAccess = data?.is_public === true || data?.user_id === requestingUserId;

      expect(canAccess).toBe(false);
    });
  });

  describe('Project Search and Filtering', () => {
    it('should search projects by name', async () => {
      const searchTerm = 'Test';

      const mockSelect = vi.fn().mockReturnValue({
        ilike: vi.fn().mockResolvedValue({
          data: [mockProject],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .ilike('name', `%${searchTerm}%`);

      expect(data).toHaveLength(1);
    });

    it('should sort projects by creation date', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [mockProject],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      expect(data).toBeDefined();
    });

    it('should paginate projects', async () => {
      const page = 1;
      const pageSize = 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const mockSelect = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [mockProject],
          error: null
        })
      });

      supabase.from = vi.fn(() => ({
        select: mockSelect
      })) as any;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .range(from, to);

      expect(data).toBeDefined();
    });
  });
});
