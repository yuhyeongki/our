import * as React from 'react';
import { TeacherProvider } from './TeacherContext';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TeacherProvider>{children}</TeacherProvider>;
}
