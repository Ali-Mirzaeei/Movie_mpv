import { Movie } from '../types';
import { moviesData } from '../moviesData';
import movieInfo from '../movie_info.json';

// Convert moviesData to Movie array
const LOCAL_MOVIES: Movie[] = moviesData.map((item: any) => ({
  id: item["ردیف"],
  title: item["نام فیلم"],
  persianTitle: item["ترجمه نام فیلم براساس منابع ایرانی"],
  year: item["سال ساخت به میلادی"],
  rating: item["امتیاز و تعداد رای"],
  description: item["خلاصه فیلم با ترجمه روان فارسی"],
  genre: "Drama" // Default
}));

// Enrich with movieInfo data
LOCAL_MOVIES.forEach(movie => {
  const info = movieInfo.find(m => m.film === movie.title);
  if (info) {
    movie.genre = info.genres[0];
  }
});

export const getRandomPair = (excludeIds: string[] = []): Movie[] => {
  const available = LOCAL_MOVIES.filter(movie => !excludeIds.includes(movie.id!));
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
};

export const getMoviesByGenre = (genre: string, excludeIds: string[] = []): Movie[] => {
  // Find movies with this genre from movieInfo
  const movieTitles = movieInfo
    .filter(movie => 
      movie.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()))
    )
    .map(m => m.film)
    .slice(0, 20);

  // Filter available movies
  const availableMovies = LOCAL_MOVIES.filter(movie => 
    movieTitles.includes(movie.title) && 
    !excludeIds.includes(movie.id!)
  );

  // Shuffle and return 2
  const shuffled = [...availableMovies].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
};

export const getSmartPair = (
  userTaste: any,
  selectedMovies: Movie[],
  rejectedIds: string[],
  selectedIds: string[]
): Movie[] => {
  const selectedTitles = selectedMovies.map(m => m.title);
  const availableMovies = LOCAL_MOVIES.filter(movie => 
    !rejectedIds.includes(movie.id!) && 
    !selectedIds.includes(movie.id!) &&
    !selectedTitles.includes(movie.title)
  );

  if (availableMovies.length < 2) {
    return getRandomPair([...rejectedIds, ...selectedIds]);
  }

  // Score movies based on user taste
  const scoredMovies = availableMovies.map(movie => {
    let score = 0;
    const details = movieInfo.find(m => m.film === movie.title);
    
    if (details) {
      // Genre match
      details.genres.forEach(genre => {
        score += (userTaste.genres[genre] || 0) * 2;
      });
      
      // Mood match
      details.mood.forEach(mood => {
        score += (userTaste.moods[mood] || 0) * 1.5;
      });
      
      // Theme match
      details.themes.forEach(theme => {
        score += (userTaste.themes[theme] || 0) * 1;
      });
      
      // Director match
      if (details.director) {
        score += (userTaste.directors[details.director] || 0) * 3;
      }
      
      // Cast match (top 3)
      details.cast.slice(0, 3).forEach(actor => {
        score += (userTaste.cast[actor] || 0) * 2;
      });
    }
    
    return { movie, score };
  });

  // Sort by score and take top 2
  const topMovies = scoredMovies
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(item => item.movie);

  return topMovies.length >= 2 ? topMovies : getRandomPair([...rejectedIds, ...selectedIds]);
};

export const getFinalRecommendations = (
  userTaste: any,
  selectedIds: string[]
): Movie[] => {
  const availableMovies = LOCAL_MOVIES.filter(movie => !selectedIds.includes(movie.id!));

  // Score movies based on user taste
  const scoredMovies = availableMovies.map(movie => {
    let score = 0;
    const details = movieInfo.find(m => m.film === movie.title);
    
    if (details) {
      // Genre match
      details.genres.forEach(genre => {
        score += (userTaste.genres[genre] || 0) * 2;
      });
      
      // Mood match
      details.mood.forEach(mood => {
        score += (userTaste.moods[mood] || 0) * 1.5;
      });
      
      // Theme match
      details.themes.forEach(theme => {
        score += (userTaste.themes[theme] || 0) * 1;
      });
      
      // Director match
      if (details.director) {
        score += (userTaste.directors[details.director] || 0) * 3;
      }
      
      // Cast match (top 3)
      details.cast.slice(0, 3).forEach(actor => {
        score += (userTaste.cast[actor] || 0) * 2;
      });
    }
    
    return { movie, score };
  });

  // Sort by score and take top 3
  return scoredMovies
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.movie);
};

export const getAllMovies = () => LOCAL_MOVIES;