'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface ProjectTypeItem {
  id: string;
  name: string;
}

interface ProjectTypeContextType {
  projectTypes: ProjectTypeItem[];
  projectTypeNames: string[];
  loading: boolean;
  error: string | null;
  addProjectType: (name: string) => Promise<boolean>;
  renameProjectType: (id: string, name: string) => Promise<boolean>;
  removeProjectType: (id: string) => Promise<boolean>;
  refreshProjectTypes: () => void;
}

const ProjectTypeContext = createContext<ProjectTypeContextType | undefined>(undefined);

const DEFAULT_PROJECT_TYPES = ['Wordpress', 'Shopify', 'Designing', 'SEO', 'Marketing'];

export function ProjectTypeProvider({ children }: { children: React.ReactNode }) {
  const [projectTypes, setProjectTypes] = useState<ProjectTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/project-types', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch project types');
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const items: ProjectTypeItem[] = result.data.map((pt: { _id: string; name: string }) => ({
          id: pt._id,
          name: pt.name,
        }));
        setProjectTypes(items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch project types');
      }
    } catch (err) {
      console.error('Error fetching project types:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch project types');
      setProjectTypes(DEFAULT_PROJECT_TYPES.map(name => ({ id: name, name })));
    } finally {
      setLoading(false);
    }
  }, []);

  const addProjectType = useCallback(async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    try {
      const response = await fetch('/api/project-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add project type');
      }
      await fetchProjectTypes();
      return true;
    } catch (err) {
      console.error('Error adding project type:', err);
      setError(err instanceof Error ? err.message : 'Failed to add project type');
      return false;
    }
  }, [fetchProjectTypes]);

  const renameProjectType = useCallback(async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    try {
      const response = await fetch(`/api/project-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to rename project type');
      }
      await fetchProjectTypes();
      return true;
    } catch (err) {
      console.error('Error renaming project type:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename project type');
      return false;
    }
  }, [fetchProjectTypes]);

  const removeProjectType = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/project-types/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete project type');
      }
      await fetchProjectTypes();
      return true;
    } catch (err) {
      console.error('Error deleting project type:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete project type');
      return false;
    }
  }, [fetchProjectTypes]);

  const refreshProjectTypes = useCallback(() => {
    fetchProjectTypes();
  }, [fetchProjectTypes]);

  useEffect(() => {
    fetchProjectTypes();
  }, [fetchProjectTypes]);

  const value: ProjectTypeContextType = {
    projectTypes,
    projectTypeNames: projectTypes.map(pt => pt.name),
    loading,
    error,
    addProjectType,
    renameProjectType,
    removeProjectType,
    refreshProjectTypes,
  };

  return (
    <ProjectTypeContext.Provider value={value}>
      {children}
    </ProjectTypeContext.Provider>
  );
}

export function useProjectTypes() {
  const context = useContext(ProjectTypeContext);
  if (context === undefined) {
    throw new Error('useProjectTypes must be used within a ProjectTypeProvider');
  }
  return context;
}
