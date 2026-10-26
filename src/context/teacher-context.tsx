'use client';

// src/context/teacher-context.tsx
import * as React from 'react';
import type { TeacherSession } from '@/types/models';

export interface TeacherContextType {
  teacher: TeacherSession | null;
  isLoading: boolean;
  refreshTeacher: () => Promise<void>;
  logout: () => Promise<void>;
}

export const TeacherContext = React.createContext<TeacherContextType>({
  teacher: null,
  isLoading: true,
  refreshTeacher: async () => {},
  logout: async () => {},
});

export const useTeacher = () => React.useContext(TeacherContext);
