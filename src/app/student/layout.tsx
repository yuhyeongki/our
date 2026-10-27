import * as React from 'react';
import { StudentProvider } from './StudentContext';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentProvider>{children}</StudentProvider>;
}
