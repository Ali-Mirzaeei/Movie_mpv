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
  PHASE_1_FIRST_RANDOM = 'PHASE_1_FIRST_RANDOM', // First 2 random movies
  PHASE_1_BY_GENRE = 'PHASE_1_BY_GENRE', // Next 2 based on genre of first selection
  PHASE_2_SMART = 'PHASE_2_SMART', // Next 8 smart selections
  RESULTS = 'RESULTS',
  LEAD_GEN = 'LEAD_GEN',
  THANK_YOU = 'THANK_YOU'
}

export interface UserPreference {
  selectedMovies: Movie[];
}

export interface UserTaste {
  genres: { [genre: string]: number };
  moods: { [mood: string]: number };
  themes: { [theme: string]: number };
  directors: { [director: string]: number };
  cast: { [actor: string]: number };
}