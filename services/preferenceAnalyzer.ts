import { Movie, UserTaste } from '../types';
import movieInfo from '../movie_info.json';

export const analyzeUserTaste = (selectedMovies: Movie[]): UserTaste => {
  const taste: UserTaste = {
    genres: {},
    moods: {},
    themes: {},
    directors: {},
    cast: {}
  };

  selectedMovies.forEach(selectedMovie => {
    const movieDetail = movieInfo.find(m => m.film === selectedMovie.title);
    if (!movieDetail) return;

    // Analyze genres
    movieDetail.genres.forEach(genre => {
      taste.genres[genre] = (taste.genres[genre] || 0) + 1;
    });

    // Analyze moods
    movieDetail.mood.forEach(mood => {
      taste.moods[mood] = (taste.moods[mood] || 0) + 1;
    });

    // Analyze themes
    movieDetail.themes.forEach(theme => {
      taste.themes[theme] = (taste.themes[theme] || 0) + 1;
    });

    // Analyze director
    if (movieDetail.director) {
      taste.directors[movieDetail.director] = (taste.directors[movieDetail.director] || 0) + 1;
    }

    // Analyze top 3 cast members
    movieDetail.cast.slice(0, 3).forEach(actor => {
      taste.cast[actor] = (taste.cast[actor] || 0) + 1;
    });
  });

  return taste;
};

export const getMovieGenre = (title: string): string => {
  const movie = movieInfo.find(m => m.film === title);
  return movie && movie.genres.length > 0 ? movie.genres[0] : 'Drama';
};

export const getMovieDetails = (title: string) => {
  return movieInfo.find(m => m.film === title);
};