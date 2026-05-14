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
  totalQuestionsAnswered?: number;
  totalCorrectAnswers?: number;
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
  order?: number;
  createdAt?: string;
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
  createdAt?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  is_active: boolean;
  created_at: string;
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
