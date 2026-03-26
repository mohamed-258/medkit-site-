export type UserRole = 'admin' | 'student' | 'owner';

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
  allowedSubjects?: string[];
  allowedDevices?: number;
  registeredDevices?: string[];
  createdAt?: string;
}

export interface Subject {
  id: string;
  nameAr?: string;
  nameEn?: string;
  icon: string;
  isLocked?: boolean;
}

export interface Section {
  id: string;
  subjectId: string;
  parentId?: string;
  nameAr?: string;
  nameEn?: string;
}

export interface Question {
  id: string;
  subjectId: string;
  sectionId?: string;
  title: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order?: number;
}

export interface QuizResult {
  id: string;
  userId: string;
  subjectId: string;
  sectionId?: string;
  score: number;
  totalQuestions: number;
  timestamp: string;
  questions?: Question[];
  selectedAnswers?: Record<number, number>;
}
