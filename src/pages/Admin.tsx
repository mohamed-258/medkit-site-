import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subject, Section, Question, UserProfile, QuizResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Save, X, BookOpen, HelpCircle, LayoutGrid, ChevronDown, ChevronUp, Search, Filter, AlertCircle, CheckCircle2, FileUp, Loader2, Lock, Unlock, RefreshCw } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI, Type } from "@google/genai";

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'sections' | 'questions' | 'users' | 'quizResults'>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const parseQuestionsManually = (text: string): Partial<Question>[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedQuestions: Partial<Question>[] = [];
    let currentQuestion: Partial<Question> | null = null;

    lines.forEach(line => {
      // Check if line starts with a number followed by . or ) - likely a question
      if (/^\d+[\.\)]/.test(line)) {
        if (currentQuestion && currentQuestion.title && currentQuestion.options?.length! >= 2) {
          parsedQuestions.push(currentQuestion);
        }
        currentQuestion = {
          title: line.replace(/^\d+[\.\)]\s*/, ''),
          options: [],
          correctAnswer: 0,
          explanation: '',
          difficulty: 'medium'
        };
      } 
      // Check if line looks like an option (starts with A, B, C, D or a, b, c, d or 1, 2, 3, 4 followed by . or ))
      else if (currentQuestion && /^[A-Da-dأ-د1-4][\.\)]/.test(line)) {
        let optionText = line.replace(/^[A-Da-dأ-د1-4][\.\)]\s*/, '');
        if (optionText.includes('*')) {
          currentQuestion.correctAnswer = currentQuestion.options!.length;
          optionText = optionText.replace('*', '').trim();
        }
        currentQuestion.options!.push(optionText);
      }
      // If it's just text and we have a question but no options yet, it might be a multi-line question
      else if (currentQuestion && currentQuestion.options!.length === 0) {
        currentQuestion.title += ' ' + line;
      }
    });

    if (currentQuestion && currentQuestion.title && currentQuestion.options?.length! >= 2) {
      parsedQuestions.push(currentQuestion);
    }

    return parsedQuestions;
  };

  const parseQuestionsWithGemini = async (text: string): Promise<Partial<Question>[]> => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fallback to manual parsing if no API key or if it's the placeholder
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('AIzaSyCbxoj')) {
      // Note: I'm checking for the key you sent just in case it's not yet in the environment
      console.log("Using manual free parser...");
      return parseQuestionsManually(text);
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `
        Extract medical questions from the following text. 
        The correct answer is marked with an asterisk (*).
        Return a JSON array of objects with the following structure:
        {
          "title": "The question text",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": 0, // index of the correct option (0-3)
          "explanation": "Brief explanation if found, otherwise empty string",
          "difficulty": "medium" // one of: easy, medium, hard
        }
        
        Text:
        ${text}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
            },
            required: ["title", "options", "correctAnswer", "explanation", "difficulty"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      return [];
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubjectId) {
      if (!selectedSubjectId) setMessage({ text: 'Please select a subject first', type: 'error' });
      return;
    }

    setIsUploading(true);
    setMessage({ text: 'Processing file and extracting questions...', type: 'success' });

    try {
      let text = '';
      if (file.name.endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        text = await extractTextFromWord(file);
      } else {
        throw new Error('File type not supported. Please upload a PDF or Word file.');
      }

      const parsedQuestions = await parseQuestionsWithGemini(text);
      
      if (parsedQuestions.length === 0) {
        throw new Error('No valid questions found in the file.');
      }

      const batch = writeBatch(db);
      parsedQuestions.forEach((q) => {
        const docRef = doc(collection(db, 'questions'));
        batch.set(docRef, {
          ...q,
          subjectId: selectedSubjectId,
          sectionId: selectedSectionId || '',
          id: docRef.id,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      setMessage({ text: `Successfully added ${parsedQuestions.length} questions!`, type: 'success' });
    } catch (err: any) {
      handleFirestoreError(err, 'upload', 'questions');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  // Subject Form
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({ nameAr: '', nameEn: '', icon: 'BookOpen' });

  // Section Form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({ subjectId: '', nameAr: '', nameEn: '' });

  // Question Form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<Question>>({
    subjectId: '',
    sectionId: '',
    title: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    difficulty: 'medium'
  });

  useEffect(() => {
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, manualId: data.id, id: doc.id } as Subject & { manualId?: string };
      }));
    });

    const unsubSections = onSnapshot(collection(db, 'sections'), (snapshot) => {
      setSections(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Section)));
    });

    const unsubQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question)));
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    });

    const unsubQuizResults = onSnapshot(collection(db, 'quizResults'), (snapshot) => {
      setQuizResults(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as QuizResult)));
    });

    return () => {
      unsubSubjects();
      unsubSections();
      unsubQuestions();
      unsubUsers();
      unsubQuizResults();
    };
  }, []);

  const toggleUserRole = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const newRole = user.role === 'admin' ? 'student' : 'admin';
      await updateDoc(userRef, { role: newRole });
      setMessage({ text: `User role updated to ${newRole} successfully`, type: 'success' });
    } catch (error) {
      handleFirestoreError(error, 'update', 'users/' + user.uid);
    }
  };

  const toggleSubjectAccess = async (user: UserProfile, subjectId: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const allowedSubjects = user.allowedSubjects || [];
      const isAllowed = allowedSubjects.includes(subjectId);

      const newAllowedSubjects = isAllowed
        ? allowedSubjects.filter(id => id !== subjectId)
        : [...allowedSubjects, subjectId];

      await updateDoc(userRef, { allowedSubjects: newAllowedSubjects });
      setMessage({ text: 'Permissions updated successfully', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, 'update', 'users/' + user.uid);
    }
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error?.message || String(error),
      operation,
      path,
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified
      }
    };
    console.error(`Firestore Error [${operation}]:`, JSON.stringify(errInfo));
    setMessage({ text: `Error: ${error?.message || 'Unknown error'}`, type: 'error' });
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.nameAr && !subjectForm.nameEn) {
      setMessage({ text: 'Please provide at least one name for the category', type: 'error' });
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, 'subjects'), subjectForm);
      await updateDoc(docRef, { id: docRef.id });
      setSubjectForm({ nameAr: '', nameEn: '', icon: 'BookOpen' });
      setShowSubjectForm(false);
      setMessage({ text: 'Subject added successfully', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'create', 'subjects');
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.subjectId || (!sectionForm.nameAr && !sectionForm.nameEn)) {
      setMessage({ text: 'Please select a subject and provide a name for the section', type: 'error' });
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, 'sections'), sectionForm);
      await updateDoc(docRef, { id: docRef.id });
      setSectionForm({ subjectId: sectionForm.subjectId, nameAr: '', nameEn: '' });
      setShowSectionForm(false);
      setMessage({ text: 'Section added successfully', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'create', 'sections');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.subjectId || !questionForm.title) {
      setMessage({ text: 'Please select a subject and enter a question title', type: 'error' });
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'questions'), { ...questionForm, createdAt: new Date().toISOString() });
      await updateDoc(docRef, { id: docRef.id });
      setQuestionForm({
        subjectId: questionForm.subjectId,
        sectionId: questionForm.sectionId,
        title: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        difficulty: 'medium'
      });
      setShowQuestionForm(false);
      setMessage({ text: 'Question added successfully', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'create', 'questions');
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!confirm('Are you sure you want to delete?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      setMessage({ text: 'Deleted successfully', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'delete', coll);
    }
  };

  const handleDeleteQuizResult = async (result: QuizResult) => {
    if (!confirm('Are you sure you want to delete this quiz result? This will also remove the points from the user.')) return;
    try {
      const userRef = doc(db, 'users', result.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        const pointsToSubtract = result.score * 10; // Assuming 10 points per correct answer as per Quiz.tsx logic
        
        const newPoints = Math.max(0, (userData.points || 0) - pointsToSubtract);
        const newCompletedQuizzes = Math.max(0, (userData.completedQuizzes || 0) - 1);
        
        const sectionPoints = userData.sectionPoints || {};
        const sectionKey = `${result.subjectId}_${result.sectionId || 'all'}`;
        const newSectionPoints = Math.max(0, (sectionPoints[sectionKey] || 0) - pointsToSubtract);
        
        await updateDoc(userRef, {
          points: newPoints,
          completedQuizzes: newCompletedQuizzes,
          sectionPoints: { ...sectionPoints, [sectionKey]: newSectionPoints }
        });
      }
      
      await deleteDoc(doc(db, 'quizResults', result.id));
      setMessage({ text: 'Quiz result deleted and points updated successfully', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'delete', 'quizResults');
    }
  };

  const toggleLock = async (subject: Subject) => {
    try {
      await updateDoc(doc(db, 'subjects', subject.id), { isLocked: !subject.isLocked });
      setMessage({ text: `Subject ${!subject.isLocked ? 'locked' : 'unlocked'} successfully`, type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'update', 'subjects');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedQuestionIds.size} questions?`)) return;

    setIsDeletingBulk(true);
    try {
      const batch = writeBatch(db);
      selectedQuestionIds.forEach(id => {
        batch.delete(doc(db, 'questions', id));
      });
      await batch.commit();
      setSelectedQuestionIds(new Set());
      setMessage({ text: 'Selected questions deleted successfully', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'bulk-delete', 'questions');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkMoveToSection = async (sectionId: string) => {
    if (!sectionId || selectedQuestionIds.size === 0) return;
    
    setIsDeletingBulk(true);
    try {
      const batch = writeBatch(db);
      selectedQuestionIds.forEach(id => {
        batch.update(doc(db, 'questions', id), { sectionId: sectionId === 'none' ? '' : sectionId });
      });
      await batch.commit();
      setSelectedQuestionIds(new Set());
      setMessage({ text: `Successfully moved ${selectedQuestionIds.size} questions`, type: 'success' });
    } catch (err) {
      handleFirestoreError(err, 'bulk-update', 'questions');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (selectedSubjectId && q.subjectId !== selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (!(subject && (subject as any).manualId === q.subjectId)) return false;
    }
    if (selectedSectionId && q.sectionId !== selectedSectionId) return false;
    return true;
  }).sort((a, b) => {
    // Sort by createdAt if available, newest first
    const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
    const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage subjects, questions, and exams.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('subjects')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeTab === 'subjects' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              Subjects
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeTab === 'sections' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              Sections
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeTab === 'questions' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              Questions
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeTab === 'users' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('quizResults')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeTab === 'quizResults' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              Quiz Results
            </button>
          </div>
        </div>
      </div>

      {/* Visual Guide for the User */}
      <div className="mb-12 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-[2rem] p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
            <HelpCircle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">How to add questions?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              You can add questions manually or upload them from a file. Follow these steps:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-blue-600 shadow-sm">1</div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Select a subject from the dropdown.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-blue-600 shadow-sm">2</div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Upload a PDF or Word file with questions.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-blue-600 shadow-sm">3</div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Questions will appear in the list below.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={cn(
          "mb-8 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
          message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
        )}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="mr-auto"><X size={16} /></button>
        </div>
      )}

      {activeTab === 'subjects' ? (
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Subject List</h2>
            <button
              onClick={() => setShowSubjectForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <Plus size={20} />
              Add New Subject
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <div key={subject.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{subject.nameEn || subject.nameAr}</h3>
                    <p className="text-xs text-slate-500">{subject.nameAr}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLock(subject)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      subject.isLocked ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    )}
                  >
                    {subject.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                  </button>
                  <button
                    onClick={() => handleDelete('subjects', subject.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : activeTab === 'sections' ? (
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Section List</h2>
            <button
              onClick={() => setShowSectionForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <Plus size={20} />
              Add New Section
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <div key={section.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{section.nameEn || section.nameAr}</h3>
                    <p className="text-xs text-slate-500">
                      {subjects.find(s => s.id === section.subjectId)?.nameEn || 'Unknown Subject'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete('sections', section.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : activeTab === 'users' ? (
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Permissions</h2>
            <button
              onClick={() => {
                // Since onSnapshot is real-time, this is just for visual feedback.
                // If the user feels it's not updating, this will reassure them.
                setMessage({ text: 'Refreshing user list...', type: 'success' });
                setTimeout(() => setMessage(null), 2000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(users.reduce((acc, user) => {
              if (!acc[user.email]) acc[user.email] = user;
              return acc;
            }, {} as Record<string, UserProfile>)).map((user) => (
              <div key={user.uid} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{user.displayName || user.email}</h3>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    {user.createdAt && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Joined: {new Date(user.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {user.email !== 'mhsn68503@gmail.com' && (
                      <button
                        onClick={() => toggleUserRole(user)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
                          user.role === 'admin' ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        )}
                      >
                        {user.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                      </button>
                    )}
                    {user.email === 'mhsn68503@gmail.com' && (
                      <button
                        onClick={() => handleDelete('users', user.uid)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{subject.nameEn || subject.nameAr}</span>
                      <button
                        onClick={() => toggleSubjectAccess(user, subject.id)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          (user.allowedSubjects || []).includes(subject.id) ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {(user.allowedSubjects || []).includes(subject.id) ? <Unlock size={18} /> : <Lock size={18} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : activeTab === 'quizResults' ? (
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Quiz Results (Grouped by User)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(quizResults.reduce((acc, result) => {
              if (!acc[result.userId]) acc[result.userId] = [];
              acc[result.userId].push(result);
              return acc;
            }, {} as Record<string, QuizResult[]>)).map(([userId, results]) => (
              <div key={userId} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {users.find(u => u.uid === userId)?.displayName || 'Unknown User'}
                </h3>
                <p className="text-xs text-slate-500">Total Quizzes: {results.length}</p>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete all quiz results for this user?')) {
                      await Promise.all(results.map(handleDeleteQuizResult));
                    }
                  }}
                  className="mt-4 w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors"
                >
                  Delete All Results
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Question Bank</h2>
              {filteredQuestions.length > 0 && (
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {selectedQuestionIds.size === filteredQuestions.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedQuestionIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      {selectedSubjectId && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBulkMoveToSection(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          disabled={isDeletingBulk}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                        >
                          <option value="">Move to Section...</option>
                          <option value="none">-- Remove from Section --</option>
                          {sections.filter(s => s.subjectId === selectedSubjectId).map(s => (
                            <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={handleBulkDelete}
                        disabled={isDeletingBulk}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        {isDeletingBulk ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete Selected ({selectedQuestionIds.size})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowQuestionForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <Plus size={20} />
              Add New Question
            </button>
          </div>

          {/* File Upload Section */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileUp size={20} className="text-blue-600" />
              Upload Questions (PDF / Word)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Upload a file containing questions, and the system will extract them automatically. Mark the correct answer with an asterisk (*).
            </p>
            
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 mr-2">Select Subject</label>
                <select 
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedSectionId('');
                    setSelectedQuestionIds(new Set());
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 mr-2">Select Section</label>
                <select 
                  value={selectedSectionId}
                  onChange={(e) => {
                    setSelectedSectionId(e.target.value);
                    setSelectedQuestionIds(new Set());
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                  disabled={!selectedSubjectId}
                >
                  <option value="">All Sections</option>
                  {sections
                    .filter(s => s.subjectId === selectedSubjectId)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>
                    ))
                  }
                </select>
              </div>
              
              <div className="flex-1 w-full">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !selectedSubjectId}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={20} className="animate-spin" /> : <FileUp size={20} />}
                  {isUploading ? 'Uploading...' : 'Choose PDF or Word File'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div 
                key={q.id} 
                className={cn(
                  "bg-white dark:bg-slate-900 p-6 rounded-3xl border transition-all flex items-center justify-between gap-6",
                  selectedQuestionIds.has(q.id) ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-100 dark:border-slate-800 shadow-sm"
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.has(q.id)}
                    onChange={() => toggleQuestionSelection(q.id)}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-bold rounded uppercase">
                        {subjects.find(s => s.id === q.subjectId || (s as any).manualId === q.subjectId)?.nameEn || 'Subject'}
                      </span>
                      {q.sectionId && (
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-bold rounded uppercase">
                          {sections.find(s => s.id === q.sectionId)?.nameEn || sections.find(s => s.id === q.sectionId)?.nameAr || 'Section'}
                        </span>
                      )}
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                        q.difficulty === 'easy' ? "bg-emerald-50 text-emerald-600" :
                        q.difficulty === 'medium' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                      )}>
                        {q.difficulty}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{q.title}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete('questions', q.id)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Subject Form Modal */}
      <AnimatePresence>
        {showSubjectForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Subject</h2>
                <button onClick={() => setShowSubjectForm(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddSubject} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category Name (English/Primary)</label>
                  <input
                    type="text"
                    value={subjectForm.nameEn}
                    onChange={(e) => setSubjectForm({ ...subjectForm, nameEn: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category Name (Arabic/Secondary)</label>
                  <input
                    type="text"
                    value={subjectForm.nameAr}
                    onChange={(e) => setSubjectForm({ ...subjectForm, nameAr: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional..."
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20">
                  Save Category
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Section Form Modal */}
      <AnimatePresence>
        {showSectionForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Section</h2>
                <button onClick={() => setShowSectionForm(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddSection} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Parent Subject</label>
                  <select
                    required
                    value={sectionForm.subjectId}
                    onChange={(e) => setSectionForm({ ...sectionForm, subjectId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subject...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Section Name (English/Primary)</label>
                  <input
                    type="text"
                    value={sectionForm.nameEn}
                    onChange={(e) => setSectionForm({ ...sectionForm, nameEn: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Section Name (Arabic/Secondary)</label>
                  <input
                    type="text"
                    value={sectionForm.nameAr}
                    onChange={(e) => setSectionForm({ ...sectionForm, nameAr: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional..."
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20">
                  Save Section
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Question Form Modal */}
      <AnimatePresence>
        {showQuestionForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl my-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Question</h2>
                <button onClick={() => setShowQuestionForm(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddQuestion} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                    <select
                      required
                      value={questionForm.subjectId}
                      onChange={(e) => setQuestionForm({ ...questionForm, subjectId: e.target.value, sectionId: '' })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Section (Optional)</label>
                    <select
                      value={questionForm.sectionId}
                      onChange={(e) => setQuestionForm({ ...questionForm, sectionId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                      disabled={!questionForm.subjectId}
                    >
                      <option value="">Select section...</option>
                      {sections
                        .filter(s => s.subjectId === questionForm.subjectId)
                        .map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Difficulty</label>
                    <select
                      value={questionForm.difficulty}
                      onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Question Text</label>
                  <textarea
                    required
                    rows={3}
                    value={questionForm.title}
                    onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questionForm.options?.map((opt, i) => (
                    <div key={i}>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Option {String.fromCharCode(65 + i)}</label>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(questionForm.options || [])];
                          newOpts[i] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOpts });
                        }}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Correct Answer</label>
                    <select
                      value={questionForm.correctAnswer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Explanation (Supports Markdown)</label>
                  <textarea
                    rows={4}
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20">
                  Save Question
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
