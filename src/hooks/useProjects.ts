/**
 * Projects Hook
 *
 * Manages project CRUD operations with Supabase.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import { useProjectStore } from '../stores/projectStore';

type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export const useProjects = (userId?: string) => {
  const { setProjects, setLoading, setError } = useProjectStore();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch projects
  const fetchProjects = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  // Create project
  const createProject = async (project: Omit<ProjectInsert, 'user_id'>) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...project,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchProjects();
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  // Update project
  const updateProject = async (id: string, updates: ProjectUpdate) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await fetchProjects();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  // Delete project (soft delete)
  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ archived: true })
        .eq('id', id);

      if (error) throw error;
      await fetchProjects();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchProjects();

    // Set up real-time subscription
    const channel = supabase
      .channel('projects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};
