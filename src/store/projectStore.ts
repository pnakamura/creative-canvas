import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { FlowNode, NodeData } from './flowStore';
import { Edge } from '@xyflow/react';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loadProject: (id: string) => Promise<{ nodes: FlowNode[]; edges: Edge[] } | null>;
  saveProject: (projectId: string, nodes: FlowNode[], edges: Edge[]) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ projects: data || [] });
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (name: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          description: description || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({
        projects: [data, ...state.projects],
      }));
      
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  },

  updateProject: async (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        currentProject: state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
      }));
    } catch (error) {
      console.error('Error updating project:', error);
    }
  },

  deleteProject: async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      }));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  },

  loadProject: async (id: string) => {
    set({ isLoading: true });
    try {
      // Fetch project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      // Fetch nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from('project_nodes')
        .select('*')
        .eq('project_id', id);

      if (nodesError) throw nodesError;

      // Fetch edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('project_edges')
        .select('*')
        .eq('project_id', id);

      if (edgesError) throw edgesError;

      // Transform nodes to FlowNode format
      const nodes: FlowNode[] = (nodesData || []).map((n) => ({
        id: n.node_id,
        type: n.node_type,
        position: n.position as { x: number; y: number },
        data: n.data as NodeData,
      }));

      // Transform edges to Edge format
      const edges: Edge[] = (edgesData || []).map((e) => ({
        id: e.edge_id,
        source: e.source,
        target: e.target,
        sourceHandle: e.source_handle || undefined,
        targetHandle: e.target_handle || undefined,
      }));

      set({ currentProject: project, hasUnsavedChanges: false });
      return { nodes, edges };
    } catch (error) {
      console.error('Error loading project:', error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  saveProject: async (projectId: string, nodes: FlowNode[], edges: Edge[]) => {
    set({ isSaving: true });
    try {
      // Delete existing nodes and edges
      await supabase.from('project_nodes').delete().eq('project_id', projectId);
      await supabase.from('project_edges').delete().eq('project_id', projectId);

      // Insert new nodes
      if (nodes.length > 0) {
        const nodesInsert = nodes.map((n) => ({
          project_id: projectId,
          node_id: n.id,
          node_type: n.type || 'textNode',
          position: JSON.parse(JSON.stringify(n.position)),
          data: JSON.parse(JSON.stringify(n.data)),
        }));

        const { error: nodesError } = await supabase
          .from('project_nodes')
          .insert(nodesInsert);

        if (nodesError) throw nodesError;
      }

      // Insert new edges
      if (edges.length > 0) {
        const edgesInsert = edges.map((e) => ({
          project_id: projectId,
          edge_id: e.id,
          source: e.source,
          target: e.target,
          source_handle: e.sourceHandle || null,
          target_handle: e.targetHandle || null,
        }));

        const { error: edgesError } = await supabase
          .from('project_edges')
          .insert(edgesInsert);

        if (edgesError) throw edgesError;
      }

      // Update project timestamp
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);

      set({ hasUnsavedChanges: false });
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
}));
