import { GoogleGenerativeAI } from '@google/genai';
import { Movie } from '../types';
import movieInfo from '../movie_info.json';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn('GEMINI_API_KEY is not set. AI features will be limited.');
}

const ai = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = ai ? ai.getGenerativeModel({ model: 'gemini-pro' }) : null;

export const generateSmartMoviePair = async (
  userTaste: any,
  historyTitles: string[],
  rejectedTitles: string[] = []
): Promise<Movie[]> => {
  if (!model) {
    return [];
  }

  try {
    const prompt = `
      You are a movie recommendation expert. 
      
      User's selected movies: ${historyTitles.join(', ')}
      
      User's taste profile:
      - Favorite genres: ${Object.entries(userTaste.genres || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([genre]) => genre).join(', ')}
      - Favorite moods: ${Object.entries(userTaste.moods || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([mood]) => mood).join(', ')}
      - Favorite themes: ${Object.entries(userTaste.themes || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([theme]) => theme).join(', ')}
      
      Suggest 2 movies from this exact list of 100 movies:
      ${movieInfo.map(m => m.film).join(', ')}
      
      Do NOT suggest these movies: ${rejectedTitles.join(', ') || 'none'}
      
      Requirements:
      1. Movies should match user's taste profile
      2. Provide a brief reason in Persian for each suggestion
      3. Return in JSON format
      
      Return format: [{"title": "Movie Title", "reason": "Brief reason in Persian"}]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        const movies = JSON.parse(jsonMatch[0]);
        return movies.map((m: any) => ({
          title: m.title,
          reason: m.reason
        }));
      } catch (e) {
        console.error('Error parsing AI response:', e);
      }
    }
  } catch (error) {
    console.error('Error generating movie pair:', error);
  }
  
  return [];
};

export const generateFinalRecommendations = async (
  historyTitles: string[]
): Promise<Movie[]> => {
  if (!model) {
    return [];
  }

  try {
    const prompt = `
      You are a movie recommendation expert. 
      The user has selected these movies: ${historyTitles.join(', ')}
      
      Suggest 3 PERFECT movies for this user from this exact list:
      ${movieInfo.map(m => m.film).join(', ')}
      
      For each movie, provide a personalized reason in Persian why they would enjoy it.
      
      Return format: [{"title": "Movie Title", "reason": "Personalized reason in Persian"}]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        const movies = JSON.parse(jsonMatch[0]);
        return movies.map((m: any) => ({
          title: m.title,
          reason: m.reason
        }));
      } catch (e) {
        console.error('Error parsing AI response:', e);
      }
    }
  } catch (error) {
    console.error('Error generating final recommendations:', error);
  }
  
  return [];
};