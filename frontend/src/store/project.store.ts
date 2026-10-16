import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectState {
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  clear: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      setActiveProject: (id) => set({ activeProjectId: id }),
      clear: () => set({ activeProjectId: null }),
    }),
    { name: 'epsay-active-project' },
  ),
);
