export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

export type TestRow = {
  id: string;
  title: string;
  task1_prompt: string;
  task2_prompt: string;
  image_url: string | null;
  duration_minutes: number;
  created_at: string;
};

export type SubmissionStatus = "in_progress" | "completed" | "disqualified";
export type EndReason = "manual" | "timeout" | "disqualified";

export type Task1Score = {
  band: number;
  TA: number;
  CC: number;
  LR: number;
  GRA: number;
};

export type Task2Score = {
  band: number;
  TR: number;
  CC: number;
  LR: number;
  GRA: number;
};

export type Criterion = "CC" | "GRA" | "LR" | "TA" | "TR";

export type Correction = {
  original: string;
  corrected: string;
  explanation: string;
  criterion: Criterion;
};

export type BandProgression = {
  current_band: number;
  why_current: string;
  why_not_lower: string;
  why_not_higher: string;
  roadmap_steps: string[];
};

export type VocabularySuggestion = {
  original_word: string;
  better_alternative: string;
  reason: string;
};

export type AdvancedStructure = {
  structure_name: string;
  example_sentence_en: string;
  explanation_vi: string;
};

export type GradingFeedback = {
  // --- các field cốt lõi (luôn có) ---
  overall_band: number;
  examiner_summary: string;
  task1: Task1Score | null;
  task2: Task2Score | null;
  corrections: Correction[];

  // --- các field mở rộng từ prompt (optional để tương thích dữ liệu cũ đã lưu trước khi vá) ---
  word_count?: number;
  meets_min_word_count?: boolean;
  prompt_analysis?: string;
  band_progression?: BandProgression;
  edited_essay_markdown?: string;
  vocabulary_suggestions?: VocabularySuggestion[];
  advanced_structures?: AdvancedStructure[];
  golden_rule?: string;
};

export type SubmissionRow = {
  id: string;
  test_id: string;
  student_id: string | null;
  student_name: string;
  content: string | null;
  warning_count: number;
  status: SubmissionStatus;
  end_reason: EndReason | null;
  band_score: number | null;
  feedback: GradingFeedback | null;
  started_at: string;
  submitted_at: string | null;
  created_at: string;
  teacher_comment?: string | null;
  tests?: {
    title: string;
    task1_prompt: string;
    task2_prompt: string;
    image_url: string | null;
    duration_minutes: number;
  } | null;
};