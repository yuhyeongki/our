'use client';

// src/context/student-context.tsx
import * as React from 'react';

export interface StudentProfile {
  id: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  name: string;
}

export interface StudentContextType {
  student: StudentProfile | null;
  isLoading: boolean;
  refreshStudent: () => Promise<void>;
  logout: () => Promise<void>;
}

export const StudentContext = React.createContext<StudentContextType>({
  student: null,
  isLoading: true,
  refreshStudent: async () => {},
  logout: async () => {},
});

export const useStudent = () => React.useContext(StudentContext);
