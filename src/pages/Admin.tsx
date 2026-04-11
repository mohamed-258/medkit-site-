import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs, writeBatch, setDoc, getDoc, increment, getCountFromServer, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Subject, Section, Question, UserProfile, QuizResult } from '../types';
import { Plus, Trash2, Edit2, Save, X, BookOpen, HelpCircle, LayoutGrid, ChevronDown, ChevronUp, Search, Filter, AlertCircle, CheckCircle2, FileUp, Loader2, Lock, Unlock, RefreshCw, Wand2, MonitorSmartphone } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI, Type } from "@google/genai";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { lazy, Suspense } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminAnalytics from '../components/admin/AdminAnalytics';

import ManageUsersPanel from '../components/admin/ManageUsersPanel';

const QuizBuilder = lazy(() => import('../components/admin/QuizBuilder'));

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function UserSubjectItem({ subject, sections, isAllowed, onToggleAccess }: { subject: Subject, sections: Section[], isAllowed: boolean, onToggleAccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn(
      "group bg-white dark:bg-slate-800 border rounded-[2rem] overflow-hidden transition-all duration-300",
      isAllowed ? "border-emerald-100 dark:border-emerald-900/30 shadow-sm" : "border-slate-100 dark:border-slate-700 opacity-70 hover:opacity-100"
    )}>
      <div className="flex items-center justify-between p-4 cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300",
            isAllowed ? "bg-emerald-500 shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
          )}>
            <BookOpen size={18} />
          </div>
          <span className="font-black text-sm text-slate-900 dark:text-slate-100 line-clamp-1">{subject.nameEn || subject.nameAr}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAccess();
            }}
            className={cn(
              "p-2 rounded-xl transition-all duration-300",
              isAllowed 
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400" 
                : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
            )}
            title={isAllowed ? "Revoke Access" : "Grant Access"}
          >
            {isAllowed ? <Unlock size={16} /> : <Lock size={16} />}
          </button>
          <div className={cn(
            "p-1.5 rounded-lg text-slate-300 group-hover:text-slate-400 transition-all duration-300",
            isOpen && "rotate-180 text-blue-500"
          )}>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-700/50 p-4 animate-in slide-in-from-top-2 duration-300">
          {sections.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {sections.map(section => (
                <div key={section.id} className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className="line-clamp-1">{section.nameEn || section.nameAr}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-slate-400">
              <AlertCircle size={20} className="mb-2 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-wider">No sections found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SortableSubSection({ sub, subQuestions, onEdit, onDelete }: { sub: Section, subQuestions: Question[], onEdit: (sub: Section) => void, onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 10,
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isDragging ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm relative cursor-grab active:cursor-grabbing touch-none transition-colors", isDragging ? "border-indigo-500 dark:border-indigo-500" : "border-slate-100 dark:border-slate-700")}>
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <h4 className="font-bold text-slate-700 dark:text-slate-300">{sub.nameEn || sub.nameAr}</h4>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Questions</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{subQuestions.length}</p>
        </div>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(sub)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(sub.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'sections' | 'questions' | 'users' | 'quizResults' | 'analytics'>('subjects');
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
  const [questionSearchQuery, setQuestionSearchQuery] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedAdminSection, setExpandedAdminSection] = useState<string | null>(null);
  const [questionsPage, setQuestionsPage] = useState(1);
  const QUESTIONS_PER_PAGE = 50;

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingDevices, setEditingDevices] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const parentId = sections[oldIndex].parentId;
        if (!parentId) return; // Only reorder subsections

        const subSections = sections.filter(s => s.parentId === parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const oldSubIndex = subSections.findIndex(s => s.id === active.id);
        const newSubIndex = subSections.findIndex(s => s.id === over.id);

        if (oldSubIndex !== -1 && newSubIndex !== -1) {
          const newSubSections = arrayMove(subSections, oldSubIndex, newSubIndex);
          
          // Optimistic update
          const newSections = [...sections];
          newSubSections.forEach((sub, index) => {
            const sectionIndex = newSections.findIndex(s => s.id === sub.id);
            if (sectionIndex !== -1) {
              newSections[sectionIndex] = { ...newSections[sectionIndex], order: index };
            }
          });
          setSections(newSections);

          // Update in Firestore
          try {
            const batch = writeBatch(db);
            newSubSections.forEach((sub, index) => {
              const docRef = doc(db, 'sections', sub.id);
              batch.update(docRef, { order: index });
            });
            await batch.commit();
          } catch (error) {
            console.error("Error updating order:", error);
            setMessage({ text: "Failed to save new order", type: "error" });
            // Revert optimistic update by refetching or just relying on onSnapshot
          }
        }
      }
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      let lastY = -1;
      let pageText = '';
      for (const item of textContent.items as any[]) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
      fullText += pageText + '\n\n';
    }
    return fullText;
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // Use convertToHtml to preserve list structures which extractRawText strips out
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    // Create a temporary div to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = result.value;
    
    let fullText = '';
    let listCounter = 1;
    let isOrderedList = false;

    // Recursively process nodes to extract text with list numbers
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        fullText += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        
        if (el.tagName === 'P') {
          fullText += '\n';
        } else if (el.tagName === 'OL') {
          isOrderedList = true;
          listCounter = 1;
        } else if (el.tagName === 'UL') {
          isOrderedList = false;
        } else if (el.tagName === 'LI') {
          if (isOrderedList) {
            fullText += `\n${listCounter}. `;
            listCounter++;
          } else {
            // For unordered lists, we'll use letters A, B, C, D if it's a short list (likely options)
            // But to be safe, we'll just use a bullet and let the parser handle it, or use A, B, C, D
            fullText += `\n- `;
          }
        } else if (el.tagName === 'BR') {
          fullText += '\n';
        }
        
        for (let i = 0; i < el.childNodes.length; i++) {
          processNode(el.childNodes[i]);
        }
        
        if (el.tagName === 'P' || el.tagName === 'LI') {
          fullText += '\n';
        }
      }
    };
    
    processNode(div);
    
    // Fallback if HTML parsing yielded nothing useful
    if (fullText.trim().length < 10) {
      const rawResult = await mammoth.extractRawText({ arrayBuffer });
      return rawResult.value;
    }
    
    return fullText;
  };

  const parseQuestionsManually = (text: string): Partial<Question>[] => {
    const parsedQuestions: Partial<Question>[] = [];

    // ── 1. نظف النص وقسمه لأسطر ─────────────────────────────────────
    const lines = text
      .split('\n')
      .map(l => l.replace(/\r/g, '').trim())
      .filter(l => l.length > 0);

    // ── 2. Pattern يكشف بداية سؤال جديد ──────────────────────────────
    // يدعم:  1.  1)  1-  Q1.  Q.1  السؤال1  ١.  (١)
    const QUESTION_START = /^(?:Q\.?\s*)?(?:[٠-٩\d]+)[.)،\-\s]/i;

    // ── 3. Pattern يكشف الخيارات ─────────────────────────────────────
    // يدعم:  A.  A)  a.  أ.  أ)  ب.  ج-  1.  1)  (A)  (أ)
    const OPTION_PATTERN =
      /^(?:\(?\s*(?:[A-Da-dأ-دA-Da-d]|[1-4])\s*[.)،\-\)]\s*)/;

    // ── 4. Pattern يكشف الإجابة في السطر الأخير ──────────────────────
    // يدعم:  Answer: C   الإجابة: ب   Ans: 2   correct: a
    const ANSWER_LINE =
      /^(?:answer|ans|correct|الإجابة|الجواب|الصحيح)\s*[:=]\s*([A-Da-dأ-دA-Da-d1-4])/i;

    // ── 5. تعريف ترتيب الحروف لمعرفة index الإجابة ───────────────────
    const OPTION_INDEX: Record<string, number> = {
      a: 0, b: 1, c: 2, d: 3,
      A: 0, B: 1, C: 2, D: 3,
      'أ': 0, 'ب': 1, 'ج': 2, 'د': 3,
      '1': 0, '2': 1, '3': 2, '4': 3,
    };

    let current: Partial<Question> | null = null;

    const pushCurrent = () => {
      if (
        current &&
        current.title &&
        current.title.trim().length > 3 &&
        current.options &&
        current.options.length >= 2
      ) {
        // تأكد أن correctAnswer منطقية
        if (
          current.correctAnswer === undefined ||
          current.correctAnswer < 0 ||
          current.correctAnswer >= (current.options?.length ?? 0)
        ) {
          current.correctAnswer = 0;
        }
        parsedQuestions.push(current);
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ── كشف سطر الإجابة (Answer: C) ─────────────────────────────
      const ansMatch = line.match(ANSWER_LINE);
      if (ansMatch && current) {
        const key = ansMatch[1].trim();
        const idx = OPTION_INDEX[key] ?? OPTION_INDEX[key.toLowerCase()] ?? -1;
        if (idx !== -1) current.correctAnswer = idx;
        continue;
      }

      // ── كشف بداية سؤال جديد ─────────────────────────────────────
      if (QUESTION_START.test(line)) {
        pushCurrent();
        const questionText = line.replace(QUESTION_START, '').trim();
        current = {
          title: questionText,
          options: [],
          correctAnswer: 0,
          explanation: '',
          difficulty: 'medium',
        };
        continue;
      }

      // ── كشف خيار ────────────────────────────────────────────────
      if (current && OPTION_PATTERN.test(line)) {
        let optionText = line.replace(OPTION_PATTERN, '').trim();

        // هل فيه * في نهاية أو بداية الخيار = إجابة صحيحة؟
        if (optionText.includes('*')) {
          current.correctAnswer = current.options!.length;
          optionText = optionText.replace(/\*/g, '').trim();
        }

        // هل الخيار نفسه مكتوب بعده ✓ أو (صح) ؟
        if (/[✓✔☑]|صح|صحيح/.test(optionText)) {
          current.correctAnswer = current.options!.length;
          optionText = optionText.replace(/[✓✔☑]|صح|صحيح/g, '').trim();
        }

        current.options!.push(optionText);
        continue;
      }

      // ── سطر الشرح / التفسير ──────────────────────────────────────
      if (
        current &&
        /^(?:explanation|explain|تفسير|شرح|ملاحظة)\s*[:=]/i.test(line)
      ) {
        current.explanation = line
          .replace(/^(?:explanation|explain|تفسير|شرح|ملاحظة)\s*[:=]\s*/i, '')
          .trim();
        continue;
      }

      // ── سطر الصعوبة ───────────────────────────────────────────────
      if (
        current &&
        /^(?:difficulty|صعوبة)\s*[:=]\s*(easy|medium|hard|سهل|متوسط|صعب)/i.test(
          line
        )
      ) {
        const m = line.match(
          /^(?:difficulty|صعوبة)\s*[:=]\s*(easy|medium|hard|سهل|متوسط|صعب)/i
        )!;
        const d = m[1].toLowerCase();
        current.difficulty =
          d === 'easy' || d === 'سهل'
            ? 'easy'
            : d === 'hard' || d === 'صعب'
            ? 'hard'
            : 'medium';
        continue;
      }

      // ── سطر نص إضافي للسؤال (قبل الخيارات) ──────────────────────
      if (current && current.options!.length === 0 && line.length > 2) {
        // يضيف سطر إضافي لنص السؤال لو السؤال على أكثر من سطر
        current.title += ' ' + line;
      }
    }

    // لا تنسى آخر سؤال
    pushCurrent();

    return parsedQuestions;
  };

  const parseQuestionsWithGemini = async (text: string): Promise<Partial<Question>[]> => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fallback to manual parsing if no API key or if it's the placeholder
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('AIzaSyCbxoj')) {
      console.log("Using manual free parser...");
      return parseQuestionsManually(text);
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Chunk the text to prevent Gemini from truncating long files
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const line of lines) {
      // Break chunks safely around 10,000 characters to stay well within output token limits
      if (currentChunk.length > 10000 && (/^\d+[\.\-\)]/.test(line.trim()) || /^(Q|Question|س|سؤال)\s*\d*[\.\-\:\)]/i.test(line.trim()))) {
        chunks.push(currentChunk);
        currentChunk = '';
      } else if (currentChunk.length > 15000 && line.trim() === '') {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      currentChunk += line + '\n';
    }
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }

    let allQuestions: Partial<Question>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `
            Extract ALL multiple-choice questions from the following text. 
            
            RULES:
            1. The text contains questions followed by choices (A, B, C, D or أ، ب، ج، د).
            2. The correct answer is marked with an asterisk (*) in the original text.
            3. You MUST identify the correct answer based on this asterisk.
            4. REMOVE the asterisk (*) from the final text of the option.
            5. If a question has NO asterisk, skip it or mark it as invalid.
            6. If a question has MULTIPLE asterisks, skip it or mark it as invalid.
            7. Support both Arabic and English questions.
            8. Return a JSON array of objects.

            Structure:
            [
              {
                "title": "The question text",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correctAnswer": 0, // Index of the correct option (0 to 3)
                "explanation": "Brief explanation if found, otherwise empty string",
                "difficulty": "medium"
              }
            ]
            
            Text:
            ${chunk}
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

        let responseText = response.text || '[]';
        // Strip markdown code blocks if the model returns them despite responseMimeType
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed)) {
          allQuestions = [...allQuestions, ...parsed];
        }
      } catch (e) {
        console.error(`Failed to parse Gemini response for chunk ${i}:`, e);
        // Fallback to manual parsing for this specific chunk if Gemini fails
        const manualParsed = parseQuestionsManually(chunk);
        allQuestions = [...allQuestions, ...manualParsed];
      }
    }
    
    return allQuestions;
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

      // Commit in chunks of 500 (Firestore batch limit)
      const chunkSize = 500;
      for (let i = 0; i < parsedQuestions.length; i += chunkSize) {
        const chunk = parsedQuestions.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((q) => {
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
      }

      setMessage({ text: `Successfully added ${parsedQuestions.length} questions!`, type: 'success' });
    } catch (err: any) {
      if (err instanceof Error && (err.message === 'No valid questions found in the file.' || err.message.includes('File type not supported'))) {
        setMessage({ text: err.message, type: 'error' });
      } else if (err?.name === 'FirebaseError' || err?.code?.includes('permission-denied') || err?.message?.includes('Missing or insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'questions');
        } catch (firestoreErr: any) {
          if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
            setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
            throw firestoreErr; // Rethrow for the system to diagnose security rules
          }
          setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Failed to upload questions due to a database error.', type: 'error' });
        }
      } else {
        setMessage({ text: err instanceof Error ? err.message : 'An unexpected error occurred while processing the file.', type: 'error' });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const refreshAllPoints = async () => {
    setLoading(true);
    setMessage({ text: 'Recalculating all user points...', type: 'success' });
    try {
      const resultsSnap = await getDocs(collection(db, 'quizResults'));
      const allResults = resultsSnap.docs.map(d => d.data() as QuizResult);
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));

      let batch = writeBatch(db);
      let updatedCount = 0;

      for (const user of allUsers) {
        const userResults = allResults.filter(r => r.userId === user.uid);
        
        let totalPoints = 0;
        let sectionPoints: Record<string, number> = {};
        let completedQuizzes = userResults.length;

        if (userResults.length > 0) {
          userResults.forEach(r => {
            const sectionKey = r.sectionId || `${r.subjectId}_all`;
            const points = (r.score || 0);
            if (!sectionPoints[sectionKey] || points > sectionPoints[sectionKey]) {
              sectionPoints[sectionKey] = points;
            }
          });
          totalPoints = Object.values(sectionPoints).reduce((acc, p) => acc + p, 0);
        }

        // Check if data actually changed before adding to batch
        const hasChanged = 
          user.points !== totalPoints || 
          user.completedQuizzes !== completedQuizzes ||
          JSON.stringify(user.sectionPoints || {}) !== JSON.stringify(sectionPoints);

        if (hasChanged) {
          const userRef = doc(db, 'users', user.uid);
          batch.update(userRef, {
            points: totalPoints,
            sectionPoints: sectionPoints,
            completedQuizzes: completedQuizzes
          });
          updatedCount++;

          // Commit in chunks of 500 (Firestore batch limit)
          if (updatedCount % 500 === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
      }

      // Commit any remaining updates
      if (updatedCount % 500 !== 0) {
        await batch.commit();
      }
      setMessage({ text: `Successfully refreshed points for ${allUsers.length} users!`, type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Failed to refresh points. See console for details.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
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
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
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
    }, (error) => console.error("Subjects snapshot error:", error));

    const unsubSections = onSnapshot(collection(db, 'sections'), (snapshot) => {
      setSections(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Section)));
    }, (error) => console.error("Sections snapshot error:", error));

    // Initial load for analytics counts
    const loadInitialCounts = async () => {
      setLoading(true);
      try {
        // We only need counts for the initial view
        const [qCount, uCount, rCount] = await Promise.all([
          getCountFromServer(collection(db, 'questions')),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'quizResults'))
        ]);
        // These are just for display if needed, but the actual data will be fetched per tab
        setLoading(false);
      } catch (err) {
        console.error("Error loading initial counts:", err);
        setLoading(false);
      }
    };
    loadInitialCounts();

    return () => {
      unsubSubjects();
      unsubSections();
    };
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    const fetchDataForTab = async () => {
      if (activeTab === 'questions' && questions.length === 0) {
        setLoading(true);
        const qSnap = await getDocs(query(collection(db, 'questions'), limit(1000))); // Limit to 1000 for safety
        setQuestions(qSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question)));
        setLoading(false);
      } else if (activeTab === 'users' && users.length === 0) {
        setLoading(true);
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        setLoading(false);
      } else if (activeTab === 'quizResults' && quizResults.length === 0) {
        setLoading(true);
        const rSnap = await getDocs(query(collection(db, 'quizResults'), limit(500), orderBy('timestamp', 'desc')));
        setQuizResults(rSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as QuizResult)));
        setLoading(false);
      }
    };
    fetchDataForTab();
  }, [activeTab]);

  const toggleUserRole = async (user: UserProfile) => {
    try {
      if (user.email === 'mhsn68503@gmail.com') return; // Owner role cannot be toggled
      const userRef = doc(db, 'users', user.uid);
      const newRole = user.role === 'admin' ? 'student' : 'admin';
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
      
      setMessage({ text: `User role updated to ${newRole} successfully`, type: 'success' });
    } catch (error: any) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'users/' + user.uid);
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
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
      
      // Update local state
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, allowedSubjects: newAllowedSubjects } : u));
      
      setMessage({ text: 'Permissions updated successfully', type: 'success' });
    } catch (error: any) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'users/' + user.uid);
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const updateAllowedDevices = async (user: UserProfile, count: number) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { allowedDevices: count });
      
      // Update local state
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, allowedDevices: count } : u));
      
      setMessage({ text: 'Allowed devices updated successfully', type: 'success' });
    } catch (error: any) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'users/' + user.uid);
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const clearRegisteredDevices = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { registeredDevices: [] });
      
      // Update local state
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, registeredDevices: [] } : u));
      
      setMessage({ text: 'Registered devices cleared successfully', type: 'success' });
    } catch (error: any) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'users/' + user.uid);
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.nameAr && !subjectForm.nameEn) {
      setMessage({ text: 'Please provide at least one name for the category', type: 'error' });
      return;
    }
    
    try {
      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id), subjectForm);
        setMessage({ text: 'Subject updated successfully', type: 'success' });
      } else {
        const docRef = doc(collection(db, 'subjects'));
        await setDoc(docRef, { ...subjectForm, id: docRef.id });
        setMessage({ text: 'Subject added successfully', type: 'success' });
      }
      setSubjectForm({ nameAr: '', nameEn: '', icon: 'BookOpen' });
      setEditingSubject(null);
      setShowSubjectForm(false);
    } catch (err: any) {
      try {
        handleFirestoreError(err, editingSubject ? OperationType.UPDATE : OperationType.CREATE, 'subjects');
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.subjectId || (!sectionForm.nameAr && !sectionForm.nameEn)) {
      setMessage({ text: 'Please select a subject and provide a name for the section', type: 'error' });
      return;
    }
    
    try {
      if (editingSection) {
        await updateDoc(doc(db, 'sections', editingSection.id), sectionForm);
        setMessage({ text: 'Section updated successfully', type: 'success' });
      } else {
        const docRef = doc(collection(db, 'sections'));
        await setDoc(docRef, { ...sectionForm, id: docRef.id });
        setMessage({ text: 'Section added successfully', type: 'success' });
      }
      setSectionForm({ subjectId: sectionForm.subjectId, nameAr: '', nameEn: '' });
      setEditingSection(null);
      setShowSectionForm(false);
    } catch (err: any) {
      try {
        handleFirestoreError(err, editingSection ? OperationType.UPDATE : OperationType.CREATE, 'sections');
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.subjectId || !questionForm.title) {
      setMessage({ text: 'Please select a subject and enter a question title', type: 'error' });
      return;
    }

    try {
      const { id: _, ...rest } = questionForm;
      const sanitizedForm = Object.fromEntries(
        Object.entries(rest).filter(([_, v]) => v !== undefined)
      );

      if (editingQuestion) {
        await updateDoc(doc(db, 'questions', editingQuestion.id), sanitizedForm);
        
        // Update local state
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...sanitizedForm } : q));
        
        setMessage({ text: 'Question updated successfully', type: 'success' });
      } else {
        const docRef = doc(collection(db, 'questions'));
        const newQuestion = { ...sanitizedForm, id: docRef.id, createdAt: new Date().toISOString() } as any as Question;
        await setDoc(docRef, newQuestion);
        
        // Update local state
        setQuestions(prev => [newQuestion, ...prev]);
        
        setMessage({ text: 'Question added successfully', type: 'success' });
      }
      setQuestionForm({
        subjectId: questionForm.subjectId,
        sectionId: questionForm.sectionId,
        title: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        difficulty: 'medium'
      });
      setEditingQuestion(null);
      setShowQuestionForm(false);
    } catch (err: any) {
      try {
        handleFirestoreError(err, editingQuestion ? OperationType.UPDATE : OperationType.CREATE, 'questions');
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!confirm('Are you sure you want to delete? This will also delete all associated sections and questions.')) return;
    try {
      const batch = writeBatch(db);
      
      // Delete the main document
      batch.delete(doc(db, coll, id));

      // If deleting subject, delete associated sections and questions
      if (coll === 'subjects') {
        // Delete sections
        const sSnap = await getDocs(query(collection(db, 'sections'), where('subjectId', '==', id)));
        sSnap.docs.forEach(sDoc => {
          batch.delete(sDoc.ref);
        });
        // Delete questions
        const qSnap = await getDocs(query(collection(db, 'questions'), where('subjectId', '==', id)));
        qSnap.docs.forEach(qDoc => {
          batch.delete(qDoc.ref);
        });
      }
      // If deleting section, delete associated questions
      else if (coll === 'sections') {
        const qSnap = await getDocs(query(collection(db, 'questions'), where('sectionId', '==', id)));
        qSnap.docs.forEach(qDoc => {
          batch.delete(qDoc.ref);
        });
      }

      await batch.commit();
      
      // Update local state
      if (coll === 'subjects') {
        setSubjects(prev => prev.filter(s => s.id !== id));
        setSections(prev => prev.filter(s => s.subjectId !== id));
        setQuestions(prev => prev.filter(q => q.subjectId !== id));
      } else if (coll === 'sections') {
        setSections(prev => prev.filter(s => s.id !== id));
        setQuestions(prev => prev.filter(q => q.sectionId !== id));
      } else if (coll === 'questions') {
        setQuestions(prev => prev.filter(q => q.id !== id));
      }
      
      setMessage({ text: 'Deleted successfully along with associated content', type: 'success' });
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.DELETE, coll);
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const handleDeleteQuizResult = async (result: QuizResult) => {
    if (!confirm('Are you sure you want to delete this quiz result? This will also remove the points from the user.')) return;
    try {
      const userRef = doc(db, 'users', result.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        const pointsToSubtract = result.score; // Assuming 1 point per correct answer as per Quiz.tsx logic
        
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
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.DELETE, 'quizResults');
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    }
  };

  const toggleLock = async (subject: Subject) => {
    try {
      await updateDoc(doc(db, 'subjects', subject.id), { isLocked: !subject.isLocked });
      setMessage({ text: `Subject ${!subject.isLocked ? 'locked' : 'unlocked'} successfully`, type: 'success' });
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, 'subjects');
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
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
      
      // Update local state
      setQuestions(prev => prev.filter(q => !selectedQuestionIds.has(q.id)));
      
      setSelectedQuestionIds(new Set());
      setMessage({ text: 'Selected questions deleted successfully', type: 'success' });
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.DELETE, 'questions');
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkMoveToSection = async (sectionId: string) => {
    if (!sectionId || selectedQuestionIds.size === 0) return;
    
    setIsDeletingBulk(true);
    try {
      const batch = writeBatch(db);
      const newSectionIdValue = sectionId === 'none' ? '' : sectionId;
      selectedQuestionIds.forEach(id => {
        batch.update(doc(db, 'questions', id), { sectionId: newSectionIdValue });
      });
      await batch.commit();
      
      // Update local state
      setQuestions(prev => prev.map(q => selectedQuestionIds.has(q.id) ? { ...q, sectionId: newSectionIdValue } : q));
      
      setSelectedQuestionIds(new Set());
      setMessage({ text: `Successfully moved ${selectedQuestionIds.size} questions`, type: 'success' });
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, 'questions');
      } catch (firestoreErr: any) {
        if (firestoreErr instanceof Error && firestoreErr.message.includes('authInfo')) {
          setMessage({ text: 'Permission denied. The system is diagnosing the issue.', type: 'error' });
          throw firestoreErr;
        }
        setMessage({ text: firestoreErr instanceof Error ? firestoreErr.message : 'Database error occurred.', type: 'error' });
      }
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

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (questionSearchQuery) {
        const query = questionSearchQuery.toLowerCase();
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesOptions = q.options.some(opt => opt.toLowerCase().includes(query));
        const matchesExplanation = q.explanation.toLowerCase().includes(query);
        return matchesTitle || matchesOptions || matchesExplanation;
      }

      if (selectedSubjectId && q.subjectId !== selectedSubjectId) {
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!(subject && (subject as any).manualId === q.subjectId)) return false;
      }
      if (selectedSectionId && q.sectionId !== selectedSectionId) return false;
      
      return true;
    }).sort((a, b) => {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [questions, selectedSubjectId, selectedSectionId, subjects, questionSearchQuery]);

  const paginatedQuestions = useMemo(() => {
    const start = (questionsPage - 1) * QUESTIONS_PER_PAGE;
    return filteredQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [filteredQuestions, questionsPage]);

  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage your medical question bank ecosystem.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <button
            onClick={refreshAllPoints}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-xl transition-all disabled:opacity-50"
            title="Recalculate all user points from quiz results"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
            <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Refresh All Points</span>
          </button>
          <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
          <div className="flex items-center gap-3 px-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
              {auth.currentUser?.displayName?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{auth.currentUser?.displayName || 'Admin'}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Super Admin</p>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{users.find(u => u.uid === auth.currentUser?.uid)?.points || 0} Points</p>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="mb-10 overflow-x-auto pb-2">
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-fit">
            {[
              { id: 'analytics', label: 'Analytics' },
              { id: 'subjects', label: 'Subjects' },
              { id: 'sections', label: 'Sections' },
              { id: 'questions', label: 'Questions' },
              { id: 'users', label: 'Users' },
              { id: 'quizResults', label: 'Quiz Results' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-8 py-3 rounded-xl font-black text-sm transition-all duration-300 whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-500/25 scale-[1.02]" 
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

      {/* Visual Guide for the User */}
        <div className="mb-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-blue-500/10" />
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 relative z-10">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
              <HelpCircle size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">How to add questions?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium max-w-2xl">
                Streamline your content creation process. You can manually input questions or use our AI-powered file extractor.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: 1, text: "Select a subject from the dropdown menu below." },
                  { step: 2, text: "Upload a PDF or Word file with your questions." },
                  { step: 3, text: "Review and manage your questions in the bank." }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-transform hover:-translate-y-1">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20 shrink-0">
                      {item.step}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{item.text}</span>
                  </div>
                ))}
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

      {activeTab === 'analytics' ? (
        <AdminAnalytics />
      ) : activeTab === 'subjects' ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Subject Repository</h2>
            <button
              onClick={() => setShowSubjectForm(true)}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-black text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95"
            >
              <Plus size={20} />
              Add New Subject
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => {
              const subjectSections = sections.filter(s => s.subjectId === subject.id);
              const subjectQuestions = questions.filter(q => q.subjectId === subject.id);
              
              return (
                <div key={subject.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <BookOpen size={28} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg">{subject.nameEn || subject.nameAr}</h3>
                        <p className="text-sm font-bold text-slate-400 mt-0.5">{subject.nameAr}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSubject(subject);
                          setSubjectForm({ nameAr: subject.nameAr, nameEn: subject.nameEn, icon: subject.icon || 'BookOpen' });
                          setShowSubjectForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleLock(subject)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          subject.isLocked 
                            ? "bg-amber-50 text-amber-500 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400" 
                            : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        )}
                      >
                        {subject.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete('subjects', subject.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Sections</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{subjectSections.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Questions</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{subjectQuestions.length}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : activeTab === 'sections' ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Curriculum Sections</h2>
            <button
              onClick={() => setShowSectionForm(true)}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-black text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95"
            >
              <Plus size={20} />
              Add New Section
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {sections.filter(s => !s.parentId).map((section) => {
              const subSections = sections.filter(sub => sub.parentId === section.id);
              const hasSubSections = subSections.length > 0;
              const isExpanded = expandedAdminSection === section.id;
              const sectionQuestions = questions.filter(q => q.sectionId === section.id);
              const totalQuestions = hasSubSections 
                ? subSections.reduce((acc, sub) => acc + questions.filter(q => q.sectionId === sub.id).length, sectionQuestions.length)
                : sectionQuestions.length;
              
              return (
                <div key={section.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300">
                  <div 
                    className={cn("flex items-center justify-between p-6", hasSubSections && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors")}
                    onClick={() => hasSubSections && setExpandedAdminSection(isExpanded ? null : section.id)}
                  >
                    <div className="flex items-center gap-5">
                      {hasSubSections ? (
                        <div className={cn("text-slate-400 transition-transform duration-300", isExpanded && "rotate-90 text-indigo-600")}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                          <LayoutGrid size={24} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">{section.nameEn || section.nameAr}</h3>
                        <p className="text-sm font-bold text-indigo-400 mt-0.5">
                          {subjects.find(s => s.id === section.subjectId)?.nameEn || 'Unknown Subject'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Questions</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{totalQuestions}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSection(section);
                            setSectionForm({ subjectId: section.subjectId, parentId: section.parentId || '', nameAr: section.nameAr, nameEn: section.nameEn });
                            setShowSectionForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete('sections', section.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {hasSubSections && isExpanded && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 p-4 pl-14 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={subSections.map(s => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {subSections.sort((a, b) => (a.order || 0) - (b.order || 0)).map(sub => {
                            const subQuestions = questions.filter(q => q.sectionId === sub.id);
                            return (
                              <SortableSubSection
                                key={sub.id}
                                sub={sub}
                                subQuestions={subQuestions}
                                onEdit={(sub) => {
                                  setEditingSection(sub);
                                  setSectionForm({ subjectId: sub.subjectId, parentId: sub.parentId || '', nameAr: sub.nameAr, nameEn: sub.nameEn });
                                  setShowSectionForm(true);
                                }}
                                onDelete={(id) => handleDelete('sections', id)}
                              />
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : activeTab === 'users' ? (
        <ManageUsersPanel
          users={users}
          subjects={subjects}
          loading={loading}
          onToggleRole={toggleUserRole}
          onToggleSubjectAccess={toggleSubjectAccess}
          onUpdateAllowedDevices={updateAllowedDevices}
          onClearDevices={clearRegisteredDevices}
          onRefreshPoints={refreshAllPoints}
        />
      ) : activeTab === 'quizResults' ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Quiz Analytics</h2>
              <p className="text-sm text-slate-400 mt-1">Review student performance across all subjects.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(quizResults.reduce((acc, result) => {
              if (!acc[result.userId]) acc[result.userId] = [];
              acc[result.userId].push(result);
              return acc;
            }, {} as Record<string, QuizResult[]>)).map(([userId, results]) => {
              const user = users.find(u => u.uid === userId);
              const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
              const totalQuestions = results.reduce((sum, r) => sum + r.totalQuestions, 0);
              const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
              const accuracy = (totalCorrect / totalQuestions) * 100;

              return (
                <div key={userId} className="group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20">
                      {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">
                        {user?.displayName || 'Unknown User'}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{results.length} Quizzes Taken</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Avg Score</p>
                      <p className="text-xl font-black text-blue-600">{avgScore.toFixed(1)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Accuracy</p>
                      <p className="text-xl font-black text-emerald-500">{accuracy.toFixed(0)}%</p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete all quiz results for this user?')) {
                        await Promise.all(results.map(handleDeleteQuizResult));
                      }
                    }}
                    className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                  >
                    Clear History
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Question Bank</h2>
              
              {filteredQuestions.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <button
                    onClick={toggleSelectAll}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-wider hover:underline"
                  >
                    {selectedQuestionIds.size === filteredQuestions.length ? 'Deselect All' : 'Select All'}
                  </button>
                  
                  {selectedQuestionIds.size > 0 && (
                    <div className="flex items-center gap-4 pl-4 border-l border-slate-100 dark:border-slate-800">
                      {selectedSubjectId && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBulkMoveToSection(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          disabled={isDeletingBulk}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
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
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        {isDeletingBulk ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Delete ({selectedQuestionIds.size})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuizBuilder(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all active:scale-95"
              >
                <Wand2 size={18} />
                Quiz Builder Wizard
              </button>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95"
              >
                <Plus size={18} />
                Add Single Question
              </button>
            </div>
          </div>

          {showQuizBuilder && (
            <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>}>
              <QuizBuilder 
                subjects={subjects} 
                sections={sections} 
                onClose={() => setShowQuizBuilder(false)} 
              />
            </Suspense>
          )}

          {/* File Upload Section */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                <FileUp size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Bulk Import</h3>
                <p className="text-sm text-slate-400">Upload PDF or Word documents to extract questions automatically.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Target Subject</label>
                <select 
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedSectionId('');
                    setSelectedQuestionIds(new Set());
                    setQuestionsPage(1);
                  }}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Target Section</label>
                <select 
                  value={selectedSectionId}
                  onChange={(e) => {
                    setSelectedSectionId(e.target.value);
                    setSelectedQuestionIds(new Set());
                    setQuestionsPage(1);
                  }}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold disabled:opacity-50"
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
              
              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !selectedSubjectId}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                    isUploading 
                      ? "bg-slate-100 text-slate-400" 
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  )}
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}
                  {isUploading ? 'Processing...' : 'Select Document'}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={20} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search questions by title, options, or explanation..."
              value={questionSearchQuery}
              onChange={(e) => setQuestionSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-medium shadow-sm"
            />
            {questionSearchQuery && (
              <button
                onClick={() => setQuestionSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {paginatedQuestions.map((q) => (
              <div 
                key={q.id} 
                className={cn(
                  "group bg-white dark:bg-slate-900 p-6 rounded-3xl border transition-all flex items-center justify-between gap-6",
                  selectedQuestionIds.has(q.id) 
                    ? "border-blue-500 ring-1 ring-blue-500 shadow-lg shadow-blue-500/10" 
                    : "border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.has(q.id)}
                      onChange={() => toggleQuestionSelection(q.id)}
                      className="w-6 h-6 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[9px] font-black uppercase tracking-wider rounded-lg">
                        {subjects.find(s => s.id === q.subjectId || (s as any).manualId === q.subjectId)?.nameEn || 'Subject'}
                      </span>
                      {q.sectionId && (
                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[9px] font-black uppercase tracking-wider rounded-lg">
                          {sections.find(s => s.id === q.sectionId)?.nameEn || sections.find(s => s.id === q.sectionId)?.nameAr || 'Section'}
                        </span>
                      )}
                      <span className={cn(
                        "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg",
                        q.difficulty === 'easy' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" :
                        q.difficulty === 'medium' ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20" : "bg-red-50 text-red-600 dark:bg-red-900/20"
                      )}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: q.title }} />
                    {q.imageUrl && <img src={q.imageUrl} alt="Question" loading="lazy" className="h-20 rounded-lg mb-2 object-cover" />}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingQuestion(q);
                      setQuestionForm({
                        subjectId: q.subjectId,
                        sectionId: q.sectionId,
                        title: q.title,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                        difficulty: q.difficulty,
                        imageUrl: q.imageUrl
                      });
                      setShowQuestionForm(true);
                    }}
                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete('questions', q.id)}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-400">
                Showing {((questionsPage - 1) * QUESTIONS_PER_PAGE) + 1}–{Math.min(questionsPage * QUESTIONS_PER_PAGE, filteredQuestions.length)} of {filteredQuestions.length} questions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuestionsPage(p => Math.max(1, p - 1))}
                  disabled={questionsPage === 1}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (questionsPage <= 4) {
                    page = i + 1;
                  } else if (questionsPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = questionsPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setQuestionsPage(page)}
                      className={cn(
                        "w-9 h-9 rounded-xl text-sm font-black transition-all",
                        questionsPage === page
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setQuestionsPage(p => Math.min(totalPages, p + 1))}
                  disabled={questionsPage === totalPages}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Background Glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Subject Form Modal */}
      {showSubjectForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 sm:p-10 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
                <button onClick={() => { setShowSubjectForm(false); setEditingSubject(null); }} className="p-2 sm:p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                <form onSubmit={handleAddSubject} className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Category Name (English)</label>
                    <input
                      type="text"
                      required
                      value={subjectForm.nameEn}
                      onChange={(e) => setSubjectForm({ ...subjectForm, nameEn: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                      placeholder="e.g. Internal Medicine"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Category Name (Arabic)</label>
                    <input
                      type="text"
                      value={subjectForm.nameAr}
                      onChange={(e) => setSubjectForm({ ...subjectForm, nameAr: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                      placeholder="Optional..."
                    />
                  </div>
                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {editingSubject ? 'Update Category' : 'Create Category'}
                  </button>
                </form>
              </div>
          </div>
        </div>
      )}

      {/* Section Form Modal */}
      {showSectionForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 sm:p-10 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{editingSection ? 'Edit Section' : 'Add Section'}</h2>
                <button onClick={() => { setShowSectionForm(false); setEditingSection(null); }} className="p-2 sm:p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                <form onSubmit={handleAddSection} className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Parent Subject</label>
                    <select
                      required
                      value={sectionForm.subjectId}
                      onChange={(e) => setSectionForm({ ...sectionForm, subjectId: e.target.value, parentId: '' })}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                    >
                      <option value="">Select subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)}
                    </select>
                  </div>
                  {sectionForm.subjectId && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Parent Section (Optional)</label>
                      <select
                        value={sectionForm.parentId || ''}
                        onChange={(e) => setSectionForm({ ...sectionForm, parentId: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                      >
                        <option value="">None (Top Level)</option>
                        {sections
                          .filter(s => s.subjectId === sectionForm.subjectId && s.id !== editingSection?.id && !s.parentId)
                          .map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      {sectionForm.parentId ? 'Sub-Section Name (English)' : 'Section Name (English)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={sectionForm.nameEn}
                      onChange={(e) => setSectionForm({ ...sectionForm, nameEn: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                      placeholder={sectionForm.parentId ? "e.g. Lecture 1" : "e.g. Anatomy"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      {sectionForm.parentId ? 'Sub-Section Name (Arabic)' : 'Section Name (Arabic)'}
                    </label>
                    <input
                      type="text"
                      value={sectionForm.nameAr}
                      onChange={(e) => setSectionForm({ ...sectionForm, nameAr: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                      placeholder="Optional..."
                    />
                  </div>
                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {editingSection ? 'Update Section' : 'Create Section'}
                  </button>
                </form>
              </div>
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 sm:p-10 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>
                <button onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }} className="p-2 sm:p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                <form onSubmit={handleAddQuestion} className="space-y-8 sm:space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Subject</label>
                    <select
                      required
                      value={questionForm.subjectId}
                      onChange={(e) => setQuestionForm({ ...questionForm, subjectId: e.target.value, sectionId: '' })}
                      className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                    >
                      <option value="">Select subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Section</label>
                    <select
                      value={questionForm.sectionId}
                      onChange={(e) => setQuestionForm({ ...questionForm, sectionId: e.target.value })}
                      className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold disabled:opacity-50"
                      disabled={!questionForm.subjectId}
                    >
                      <option value="">Select section...</option>
                      {sections
                        .filter(s => s.subjectId === questionForm.subjectId)
                        .filter(s => !sections.some(child => child.parentId === s.id))
                        .map(s => {
                          const parent = s.parentId ? sections.find(p => p.id === s.parentId) : null;
                          const parentName = parent ? `${parent.nameEn || parent.nameAr} -> ` : '';
                          return (
                            <option key={s.id} value={s.id}>{parentName}{s.nameEn || s.nameAr}</option>
                          );
                        })
                      }
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Difficulty</label>
                    <select
                      value={questionForm.difficulty}
                      onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                      className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Question Content</label>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <ReactQuill 
                      theme="snow"
                      value={questionForm.title || ''}
                      onChange={(content) => setQuestionForm({ ...questionForm, title: content })}
                      className="h-48 sm:h-64 mb-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {questionForm.options?.map((opt, i) => (
                    <div key={i} className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Option {String.fromCharCode(65 + i)}</label>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(questionForm.options || [])];
                          newOpts[i] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOpts });
                        }}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Correct Answer</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setQuestionForm({ ...questionForm, correctAnswer: idx })}
                          className={cn(
                            "py-2 sm:py-3 rounded-xl font-black text-sm transition-all",
                            questionForm.correctAnswer === idx 
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                              : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                          )}
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Explanation (Optional)</label>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <ReactQuill 
                      theme="snow"
                      value={questionForm.explanation || ''}
                      onChange={(content) => setQuestionForm({ ...questionForm, explanation: content })}
                      className="h-48 sm:h-64 mb-12"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {editingQuestion ? 'Update Question' : 'Save Question'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
