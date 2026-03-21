export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  fatherName?: string;
  dateOfBirth?: string;
  role: UserRole;
  points: number;
  completedQuizzes: number;
  sectionPoints?: Record<string, number>;
}

export interface Subject {
  id: string;
  nameAr?: string;
  nameEn?: string;
  icon: string;
}

export interface Section {
  id: string;
  subjectId: string;
  nameAr?: string;
  nameEn?: string;
}

export interface Question {
  id: string;
  subjectId: string;
  sectionId?: string;
  title: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizResult {
  id: string;
  userId: string;
  subjectId: string;
  sectionId?: string;
  score: number;
  totalQuestions: number;
  timestamp: string;
}
