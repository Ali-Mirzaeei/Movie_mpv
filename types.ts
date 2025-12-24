export interface Movie {
  id?: string; // Corresponds to ردیف
  title: string;
  persianTitle?: string; // ترجمه نام فیلم
  year?: string;
  genre?: string;
  rating?: string; // امتیاز
  description?: string; // خلاصه داستان
  reason?: string; // Reason why AI suggested it
  imageUrl?: string; // Placeholder for UI or generated
}

export enum AppStep {
  INTRO = 'INTRO',
  PHASE_1_INITIAL = 'PHASE_1_INITIAL', // First 2 selections from static list
  PHASE_2_AI = 'PHASE_2_AI', // Next 8 selections from AI
  RESULTS = 'RESULTS',
  LEAD_GEN = 'LEAD_GEN',
  THANK_YOU = 'THANK_YOU'
}

export interface UserPreference {
  selectedMovies: Movie[];
}