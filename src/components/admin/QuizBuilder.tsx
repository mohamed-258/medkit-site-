import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';
import { Subject, Section, Question } from '../../types';
import { 
  Plus, Trash2, GripVertical, Image as ImageIcon, FileSpreadsheet, 
  CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Eye, Save, 
  LayoutTemplate, X, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface QuizBuilderProps {
  subjects: Subject[];
  sections: Section[];
  onClose: () => void;
}

type WizardStep = 'setup' | 'questions' | 'preview';

export default function QuizBuilder({ subjects, sections, onClose }: QuizBuilderProps) {
  const [step, setStep] = useState<WizardStep>('setup');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load existing questions when subject/section changes
  useEffect(() => {
    if (step === 'questions' && selectedSubject) {
      loadExistingQuestions();
    }
  }, [step, selectedSubject, selectedSection]);

  const loadExistingQuestions = async () => {
    try {
      let allData: any[] = [];
      let from = 0;
      let step = 1000;
      while (true) {
        let query = supabase.from('questions').select('*').eq('subject_id', selectedSubject);
        if (selectedSection) {
          query = query.eq('section_id', selectedSection);
        }
        const { data, error } = await query.order('order', { ascending: true }).range(from, from + step - 1);
        if (error) throw error;
        if (data) allData.push(...data);
        if (!data || data.length < step) break;
        from += step;
      }

      const loadedQuestions = (allData || []).map(doc => ({
        id: doc.id,
        subjectId: doc.subject_id,
        sectionId: doc.section_id,
        title: doc.title,
        imageUrl: doc.image_url,
        options: doc.options,
        correctAnswer: doc.correct_answer,
        explanation: doc.explanation,
        difficulty: doc.difficulty,
        order: doc.order,
        createdAt: doc.created_at
      } as Question));
      setQuestions(loadedQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const handleNext = () => {
    if (step === 'setup' && !selectedSubject) {
      setMessage({ text: 'Please select a subject first.', type: 'error' });
      return;
    }
    if (step === 'setup') setStep('questions');
    else if (step === 'questions') setStep('preview');
  };

  const handleBack = () => {
    if (step === 'preview') setStep('questions');
    else if (step === 'questions') setStep('setup');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order property
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setQuestions(updatedItems);
  };

  const addNewQuestion = (template: 'mcq' | 'tf' | 'clinical' = 'mcq') => {
    const newQ: Partial<Question> = {
      subjectId: selectedSubject,
      sectionId: selectedSection,
      title: template === 'clinical' ? '<p><strong>Patient Presentation:</strong></p><p>A 45-year-old male presents with...</p><p><strong>Question:</strong> What is the most likely diagnosis?</p>' : '',
      options: template === 'tf' ? ['True', 'False'] : ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      difficulty: 'medium',
      order: questions.length
    };
    setQuestions([...questions, newQ]);
    setEditingIndex(questions.length);
  };

  const updateEditingQuestion = (field: keyof Question, value: any) => {
    if (editingIndex === null) return;
    const updated = [...questions];
    updated[editingIndex] = { ...updated[editingIndex], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (optIndex: number, value: string) => {
    if (editingIndex === null) return;
    const updated = [...questions];
    const options = [...(updated[editingIndex].options || [])];
    options[optIndex] = value;
    updated[editingIndex].options = options;
    setQuestions(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || editingIndex === null) return;

    try {
      setMessage({ text: 'Uploading image...', type: 'success' });
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('questions')
        .upload(fileName, file);
      
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('questions')
        .getPublicUrl(fileName);

      updateEditingQuestion('imageUrl', publicUrl);
      setMessage({ text: 'Image uploaded successfully!', type: 'success' });
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ text: 'Failed to upload image.', type: 'error' });
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedQuestions: Partial<Question>[] = data.map((row, idx) => ({
          subjectId: selectedSubject,
          sectionId: selectedSection,
          title: row.Question || row.title || '',
          options: [
            row.Option1 || row.A || '',
            row.Option2 || row.B || '',
            row.Option3 || row.C || '',
            row.Option4 || row.D || ''
          ].filter(Boolean),
          correctAnswer: parseInt(row.CorrectAnswer || row.Answer || '0', 10),
          explanation: row.Explanation || '',
          difficulty: (row.Difficulty?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard',
          order: questions.length + idx
        }));

        setQuestions([...questions, ...importedQuestions]);
        setMessage({ text: `Imported ${importedQuestions.length} questions successfully!`, type: 'success' });
      } catch (error) {
        setMessage({ text: 'Failed to parse Excel file. Please ensure it has the correct format.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const upsertData = questions.map(q => ({
        id: q.id || Math.random().toString(36).substring(2, 15),
        subject_id: q.subjectId,
        section_id: q.sectionId || null,
        title: q.title,
        image_url: q.imageUrl || null,
        options: q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        order: q.order || 0,
        created_at: q.createdAt || new Date().toISOString()
      }));

      const { error } = await supabase.from('questions').upsert(upsertData);
      
      if (error) throw error;
      
      setMessage({ text: 'Quiz saved successfully!', type: 'success' });
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ text: 'Failed to save quiz.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const removeQuestion = (index: number) => {
    const q = questions[index];
    if (q.id) {
      if (!confirm('This question is already saved. Removing it here will not delete it from the database until you save. Continue?')) return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (editingIndex === index) setEditingIndex(null);
  };


  const filteredSections = sections.filter(s => s.subjectId === selectedSubject);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl min-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Quiz Builder</h2>
            <p className="text-slate-500 text-sm">Create and manage your assessments</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Wizard Progress */}
        <div className="flex items-center justify-center py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className={cn("flex items-center gap-2 font-bold", step === 'setup' ? "text-blue-600" : "text-slate-400")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", step === 'setup' ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700")}>1</div>
              Setup
            </div>
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className={cn("flex items-center gap-2 font-bold", step === 'questions' ? "text-blue-600" : "text-slate-400")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", step === 'questions' ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700")}>2</div>
              Questions
            </div>
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className={cn("flex items-center gap-2 font-bold", step === 'preview' ? "text-blue-600" : "text-slate-400")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", step === 'preview' ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700")}>3</div>
              Preview & Publish
            </div>
          </div>
        </div>

        {message && (
          <div className={cn("mx-6 mt-6 p-4 rounded-xl flex items-center gap-3", message.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto"><X size={16} /></button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* STEP 1: SETUP */}
          {step === 'setup' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Quiz Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Subject *</label>
                    <select 
                      value={selectedSubject} 
                      onChange={(e) => { setSelectedSubject(e.target.value); setSelectedSection(''); }}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Select a Subject --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Section (Optional)</label>
                    <select 
                      value={selectedSection} 
                      onChange={(e) => setSelectedSection(e.target.value)}
                      disabled={!selectedSubject}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                    >
                      <option value="">-- All Sections --</option>
                      {filteredSections.map(s => <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: QUESTIONS */}
          {step === 'questions' && (
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* Left Sidebar: Question List & Drag/Drop */}
              <div className="w-full lg:w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">Questions ({questions.length})</h3>
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Import from Excel">
                      <FileSpreadsheet size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="questions-list">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {questions.map((q, index) => (
                            <Draggable key={`q-${index}`} draggableId={`q-${index}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                                    editingIndex === index ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300",
                                    snapshot.isDragging && "shadow-xl scale-105 z-50"
                                  )}
                                  onClick={() => setEditingIndex(index)}
                                >
                                  <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-600">
                                    <GripVertical size={16} />
                                  </div>
                                  <div className="flex-1 truncate text-sm font-medium">
                                    {q.title ? q.title.replace(/<[^>]*>?/gm, '').substring(0, 40) + '...' : 'New Question'}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); removeQuestion(index); }} className="text-slate-400 hover:text-red-500">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-2">
                  <button onClick={() => addNewQuestion('mcq')} className="py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                    <Plus size={16} /> MCQ
                  </button>
                  <button onClick={() => addNewQuestion('clinical')} className="py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1">
                    <LayoutTemplate size={16} /> Clinical
                  </button>
                </div>
              </div>

              {/* Right Area: Question Editor */}
              <div className="w-full lg:w-2/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 h-[600px] overflow-y-auto">
                {editingIndex !== null && questions[editingIndex] ? (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Edit Question {editingIndex + 1}</h3>
                      <select 
                        value={questions[editingIndex].difficulty}
                        onChange={(e) => updateEditingQuestion('difficulty', e.target.value)}
                        className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    {/* Rich Text Editor for Title */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Question Text</label>
                      <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <ReactQuill 
                          theme="snow" 
                          value={questions[editingIndex].title || ''} 
                          onChange={(val) => updateEditingQuestion('title', val)}
                          className="h-40 mb-12"
                        />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Attach Image (Optional)</label>
                      <div className="flex items-center gap-4">
                        {questions[editingIndex].imageUrl && (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                            <img src={questions[editingIndex].imageUrl} alt="Question" loading="lazy" className="w-full h-full object-cover" />
                            <button onClick={() => updateEditingQuestion('imageUrl', '')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"><X size={12} /></button>
                          </div>
                        )}
                        <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                          <ImageIcon size={18} /> {questions[editingIndex].imageUrl ? 'Change Image' : 'Upload Image'}
                        </button>
                        <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </div>
                    </div>

                    {/* Options */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Options & Correct Answer</label>
                      <div className="space-y-3">
                        {questions[editingIndex].options?.map((opt, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name={`correct-${editingIndex}`} 
                              checked={questions[editingIndex].correctAnswer === i}
                              onChange={() => updateEditingQuestion('correctAnswer', i)}
                              className="w-5 h-5 text-blue-600"
                            />
                            <input 
                              type="text" 
                              value={opt} 
                              onChange={(e) => updateOption(i, e.target.value)}
                              placeholder={`Option ${i + 1}`}
                              className={cn(
                                "flex-1 p-3 rounded-xl border outline-none transition-all",
                                questions[editingIndex].correctAnswer === i ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500"
                              )}
                            />
                            <button 
                              onClick={() => {
                                const newOpts = [...(questions[editingIndex].options || [])];
                                newOpts.splice(i, 1);
                                updateEditingQuestion('options', newOpts);
                                if (questions[editingIndex].correctAnswer === i) updateEditingQuestion('correctAnswer', 0);
                              }}
                              className="p-2 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => updateEditingQuestion('options', [...(questions[editingIndex].options || []), ''])}
                          className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                        >
                          <Plus size={16} /> Add Option
                        </button>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Explanation (Optional)</label>
                      <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <ReactQuill 
                          theme="snow"
                          value={questions[editingIndex].explanation || ''}
                          onChange={(content) => updateEditingQuestion('explanation', content)}
                          className="h-32 mb-12"
                        />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <LayoutTemplate size={48} className="mb-4 opacity-20" />
                    <p>Select a question from the list or create a new one.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 'preview' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
                <h3 className="text-2xl font-black mb-2">Quiz Summary</h3>
                <div className="flex gap-6 text-slate-500">
                  <p><strong>Subject:</strong> {subjects.find(s => s.id === selectedSubject)?.nameEn}</p>
                  <p><strong>Section:</strong> {selectedSection ? sections.find(s => s.id === selectedSection)?.nameEn : 'All Sections'}</p>
                  <p><strong>Total Questions:</strong> {questions.length}</p>
                </div>
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold">Question {idx + 1}</span>
                      <span className={cn("px-3 py-1 rounded-lg text-xs font-bold uppercase", q.difficulty === 'easy' ? "text-emerald-600" : q.difficulty === 'medium' ? "text-amber-600" : "text-red-600")}>{q.difficulty}</span>
                    </div>
                    
                    <div className="prose dark:prose-invert max-w-none mb-4" dangerouslySetInnerHTML={{ __html: q.title || '' }} />
                    
                    {q.imageUrl && <img src={q.imageUrl} alt="Question" loading="lazy" className="max-h-64 rounded-xl mb-4" />}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className={cn("p-3 rounded-xl border", q.correctAnswer === oIdx ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold" : "border-slate-200 dark:border-slate-700")}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                    
                    {q.explanation && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-300">
                        <strong className="block mb-2">Explanation:</strong> 
                        <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <button 
            onClick={step === 'setup' ? onClose : handleBack}
            className="px-6 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors"
          >
            {step === 'setup' ? 'Cancel' : 'Back'}
          </button>
          
          {step === 'preview' ? (
            <button 
              onClick={handleSave}
              disabled={isSaving || questions.length === 0}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" /> : <Save size={20} />}
              Publish Quiz
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              Next Step <ChevronRight size={20} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
