import React, { useState, useEffect, useCallback } from 'react';
import { Movie, AppStep, UserTaste } from './types';
import { analyzeUserTaste, getMovieGenre } from './services/preferenceAnalyzer';
import { getRandomPair, getMoviesByGenre, getSmartPair, getFinalRecommendations, getAllMovies } from './services/movieSelectionService';
import { generateSmartMoviePair, generateFinalRecommendations as generateAIRecommendations } from './services/geminiService';
import Button from './components/Button';
import MovieCard from './components/MovieCard';
import StarRating from './components/StarRating';

const TOTAL_SELECTIONS_NEEDED = 10;

const App: React.FC = () => {
  // State اصلی
  const [step, setStep] = useState<AppStep>(AppStep.INTRO);
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [currentPair, setCurrentPair] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State ردگیری
  const [rejectedMovies, setRejectedMovies] = useState<Set<string>>(new Set());
  const [rejectedPairs, setRejectedPairs] = useState<Set<string>>(new Set());
  const [allDisplayedMovies, setAllDisplayedMovies] = useState<Set<string>>(new Set()); // NEW
  
  // State مراحل
  const [phase1FirstDone, setPhase1FirstDone] = useState(false);
  const [phase1GenreDone, setPhase1GenreDone] = useState(false);
  const [smartPhaseCount, setSmartPhaseCount] = useState(0);
  
  // State فرم
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [movieRatings, setMovieRatings] = useState<{[key: string]: number}>({});

  // --- Helper Functions ---
  const markPairAsRejected = useCallback((pair: Movie[]) => {
    const pairKey = pair.map(m => m.id).sort().join('-');
    setRejectedPairs(prev => new Set([...prev, pairKey]));
    
    pair.forEach(movie => {
      if (movie.id) {
        setRejectedMovies(prev => new Set([...prev, movie.id]));
      }
    });
  }, []);

  const getNonRepeatingPair = useCallback((excludeIds: string[] = []): Movie[] => {
    const pair = getRandomPair(excludeIds);
    
    // Check if pair is rejected
    const pairKey = pair.map(m => m.id).sort().join('-');
    if (rejectedPairs.has(pairKey) || pair.some(m => rejectedMovies.has(m.id!))) {
      return getNonRepeatingPair([...excludeIds, ...pair.map(m => m.id!)]);
    }
    
    return pair;
  }, [rejectedMovies, rejectedPairs]);

  const getEnrichedMovies = useCallback((movies: Movie[]) => {
    const allMovies = getAllMovies();
    return movies.map(movie => {
      const enriched = allMovies.find(m => m.title === movie.title);
      return enriched ? { ...enriched, reason: movie.reason } : movie;
    });
  }, []);

  // Helper functions for movie tracking
  const getIdFromTitle = useCallback((title: string): string => {
    const allMovies = getAllMovies();
    const movie = allMovies.find(m => m.title === title);
    return movie?.id || '';
  }, []);

  const getTitlesFromIds = useCallback((ids: string[]): string[] => {
    const allMovies = getAllMovies();
    return ids.map(id => allMovies.find(m => m.id === id)?.title || '');
  }, []);

  // Function to add movies to displayed set
  const addToDisplayedMovies = useCallback((movies: Movie[]) => {
    setAllDisplayedMovies(prev => {
      const newSet = new Set(prev);
      movies.forEach(m => {
        if (m.id) newSet.add(m.id);
      });
      return newSet;
    });
  }, []);

  // --- Handlers ---
  const handleStart = () => {
    setStep(AppStep.PHASE_1_FIRST_RANDOM);
    setSelectedMovies([]);
    setRejectedMovies(new Set());
    setRejectedPairs(new Set());
    setAllDisplayedMovies(new Set()); // NEW: Reset displayed movies
    setRecommendations([]);
    setPhase1FirstDone(false);
    setPhase1GenreDone(false);
    setSmartPhaseCount(0);
  };

  const handleMovieSelect = async (movie: Movie) => {
    // Add selected movie to displayed movies
    addToDisplayedMovies([movie]);
    
    const newHistory = [...selectedMovies, movie];
    setSelectedMovies(newHistory);
    
    // رد کردن فیلم دیگر در جفت
    const otherMovie = currentPair.find(m => m.title !== movie.title);
    if (otherMovie) {
      markPairAsRejected([otherMovie]);
    }

    if (!phase1FirstDone) {
      // اولین انتخاب انجام شد
      setPhase1FirstDone(true);
      setStep(AppStep.PHASE_1_BY_GENRE);
      
      // نمایش فیلم‌های هم‌ژانر
      const genre = getMovieGenre(movie.title);
      const genreMovies = getMoviesByGenre(genre, [
        movie.id!, 
        ...Array.from(rejectedMovies),
        ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
      ]);
      
      // Add new pair to displayed movies
      if (genreMovies.length >= 2) {
        addToDisplayedMovies(genreMovies);
        setCurrentPair(genreMovies);
      } else {
        const nextPair = getNonRepeatingPair([
          movie.id!, 
          ...Array.from(rejectedMovies),
          ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
        ]);
        addToDisplayedMovies(nextPair);
        setCurrentPair(nextPair);
      }
      return;
    }
    
    if (!phase1GenreDone && phase1FirstDone) {
      // انتخاب دوم (بر اساس ژانر) انجام شد
      setPhase1GenreDone(true);
      setSmartPhaseCount(1);
      
      // شروع مرحله هوشمند
      const taste = analyzeUserTaste(newHistory);
      const smartPair = getSmartPair(
        taste, 
        newHistory, 
        Array.from(rejectedMovies), 
        [
          ...newHistory.map(m => m.id!),
          ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
        ]
      );
      
      addToDisplayedMovies(smartPair); // NEW: Track displayed
      setCurrentPair(smartPair);
      return;
    }
    
    // مراحل هوشمند
    if (smartPhaseCount < 8) {
      const nextCount = smartPhaseCount + 1;
      setSmartPhaseCount(nextCount);
      
      // اگر شماره مرحله فرد است از هوش مصنوعی استفاده کن
      if (nextCount % 2 === 1 && process.env.GEMINI_API_KEY) {
        setLoading(true);
        try {
          const taste = analyzeUserTaste(newHistory);
          const aiPair = await generateSmartMoviePair(
            taste,
            newHistory.map(m => m.title),
            [
              ...Array.from(rejectedMovies), 
              ...newHistory.map(m => m.title),
              ...getTitlesFromIds(Array.from(allDisplayedMovies)) // NEW: Exclude displayed
            ]
          );
          
          if (aiPair.length >= 2) {
            const enriched = getEnrichedMovies(aiPair);
            addToDisplayedMovies(enriched); // NEW: Track displayed
            setCurrentPair(enriched);
          } else {
            const localPair = getSmartPair(
              taste, 
              newHistory, 
              Array.from(rejectedMovies), 
              [
                ...newHistory.map(m => m.id!),
                ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
              ]
            );
            addToDisplayedMovies(localPair); // NEW: Track displayed
            setCurrentPair(localPair);
          }
        } catch (error) {
          console.error('AI failed, using local:', error);
          const taste = analyzeUserTaste(newHistory);
          const localPair = getSmartPair(
            taste, 
            newHistory, 
            Array.from(rejectedMovies), 
            [
              ...newHistory.map(m => m.id!),
              ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
            ]
          );
          addToDisplayedMovies(localPair); // NEW: Track displayed
          setCurrentPair(localPair);
        } finally {
          setLoading(false);
        }
      } else {
        const taste = analyzeUserTaste(newHistory);
        const smartPair = getSmartPair(
          taste, 
          newHistory, 
          Array.from(rejectedMovies), 
          [
            ...newHistory.map(m => m.id!),
            ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
          ]
        );
        addToDisplayedMovies(smartPair); // NEW: Track displayed
        setCurrentPair(smartPair);
      }
    } else {
      // ۱۰ انتخاب کامل شد
      setStep(AppStep.RESULTS);
    }
  };

  const handleNoneOrSkip = () => {
    // Add current pair to displayed movies
    addToDisplayedMovies(currentPair);
    markPairAsRejected(currentPair);
    
    if (step === AppStep.PHASE_1_FIRST_RANDOM) {
      // نمایش جفت تصادفی دیگر
      const nextPair = getNonRepeatingPair([
        ...selectedMovies.map(m => m.id!),
        ...Array.from(rejectedMovies),
        ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
      ]);
      addToDisplayedMovies(nextPair);
      setCurrentPair(nextPair);
    } else if (step === AppStep.PHASE_1_BY_GENRE) {
      // نمایش جفت هم‌ژانر دیگر
      const lastSelected = selectedMovies[selectedMovies.length - 1];
      const genre = getMovieGenre(lastSelected.title);
      const genreMovies = getMoviesByGenre(genre, [
        ...selectedMovies.map(m => m.id!),
        ...Array.from(rejectedMovies),
        ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
      ]);
      
      if (genreMovies.length >= 2) {
        addToDisplayedMovies(genreMovies);
        setCurrentPair(genreMovies);
      } else {
        const nextPair = getNonRepeatingPair([
          ...selectedMovies.map(m => m.id!),
          ...Array.from(rejectedMovies),
          ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
        ]);
        addToDisplayedMovies(nextPair);
        setCurrentPair(nextPair);
      }
    } else {
      // مرحله هوشمند - نمایش جفت جدید
      const taste = analyzeUserTaste(selectedMovies);
      const smartPair = getSmartPair(
        taste, 
        selectedMovies, 
        Array.from(rejectedMovies), 
        [
          ...selectedMovies.map(m => m.id!),
          ...Array.from(allDisplayedMovies) // NEW: Exclude displayed
        ]
      );
      addToDisplayedMovies(smartPair);
      setCurrentPair(smartPair);
    }
  };

  const handleLeadGenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("User data:", { 
      email, 
      phone, 
      selectedMovies,
      movieRatings 
    });
    setStep(AppStep.THANKS);
  };

  const handleRatingChange = (movieTitle: string, rating: number) => {
    setMovieRatings(prev => ({
      ...prev,
      [movieTitle]: rating
    }));
  };

  // --- Effects ---
  useEffect(() => {
    if (step === AppStep.PHASE_1_FIRST_RANDOM && currentPair.length === 0) {
      const initialPair = getNonRepeatingPair(Array.from(rejectedMovies));
      addToDisplayedMovies(initialPair); // NEW: Track initial pair
      setCurrentPair(initialPair);
    }
  }, [step, currentPair.length, rejectedMovies, getNonRepeatingPair, addToDisplayedMovies]);

  useEffect(() => {
    if (step === AppStep.RESULTS && recommendations.length === 0) {
      const fetchRecommendations = async () => {
        setLoading(true);
        
        // Get all excluded movie IDs
        const allExcludedIds = new Set([
          ...selectedMovies.map(m => m.id!),
          ...Array.from(rejectedMovies),
          ...Array.from(allDisplayedMovies)
        ]);

        console.log('Total excluded movies:', allExcludedIds.size);
        console.log('Selected:', selectedMovies.length);
        console.log('Rejected:', rejectedMovies.size);
        console.log('Displayed:', allDisplayedMovies.size);

        // ابتدا از منطق محلی استفاده می‌کنیم
        const taste = analyzeUserTaste(selectedMovies);
        const localRecs = getFinalRecommendations(
          taste,
          Array.from(allExcludedIds)
        );
        
        // اگر Gemini API داریم، از آن استفاده می‌کنیم
        if (process.env.GEMINI_API_KEY) {
          try {
            const allExcludedTitles = [
              ...selectedMovies.map(m => m.title),
              ...getTitlesFromIds(Array.from(rejectedMovies))
            ];

            const aiRecs = await generateAIRecommendations(
              selectedMovies.map(m => m.title),
              allExcludedTitles
            );
            
            if (aiRecs.length >= 3) {
              // Check for duplicates
              const uniqueAiRecs = aiRecs.filter(rec => 
                !allExcludedIds.has(getIdFromTitle(rec.title))
              );

              if (uniqueAiRecs.length >= 3) {
                const enrichedRecs = getEnrichedMovies(uniqueAiRecs.slice(0, 3));
                setRecommendations(enrichedRecs);
              } else {
                setRecommendations(localRecs);
              }
            } else {
              setRecommendations(localRecs);
            }
          } catch (error) {
            console.error('AI recommendation failed:', error);
            setRecommendations(localRecs);
          }
        } else {
          setRecommendations(localRecs);
        }

        // Log for debugging
        console.log('Final recommendations check:');
        recommendations.forEach((rec, idx) => {
          const wasDisplayed = allDisplayedMovies.has(rec.id!);
          console.log(`${idx + 1}. ${rec.title} - Was displayed before? ${wasDisplayed}`);
        });

        setLoading(false);
      };
      
      fetchRecommendations();
    }
  }, [
    step, 
    recommendations.length, 
    selectedMovies, 
    getEnrichedMovies, 
    allDisplayedMovies, 
    rejectedMovies,
    getIdFromTitle,
    getTitlesFromIds
  ]);

  // --- Render Progress Indicator ---
  const renderProgressIndicator = () => {
    if (step === AppStep.INTRO || step === AppStep.RESULTS || 
        step === AppStep.LEAD_GEN || step === AppStep.THANKS) {
      return null;
    }

    const phaseText = phase1FirstDone 
      ? (phase1GenreDone ? `مرحله هوشمند ${smartPhaseCount}/8` : 'بر اساس ژانر')
      : 'انتخاب اولیه';

    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">پیشرفت</span>
          <span className="text-sm text-primary">{selectedMovies.length} از ۱۰</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(selectedMovies.length / TOTAL_SELECTIONS_NEEDED) * 100}%` }}
          ></div>
        </div>
        <div className="text-center mt-2 text-sm text-gray-400">
          {phaseText}
        </div>
      </div>
    );
  };

  // --- Render Steps ---
  if (step === AppStep.INTRO) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[url('https://picsum.photos/id/234/1920/1080?grayscale&blur=2')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div className="relative z-10 max-w-lg text-center space-y-8" dir="rtl">
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary tracking-tight">
            MovieMind
          </h1>
          <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-light">
            "ما قراره با این اپلیکیشن نیاز واقعی کاربر را درک کنیم و بهشون بهترین گزینه ها رو پیشنهاد بدیم. 
            چون ما هنوز با هم آشنا نشدیم ممکنه فیلمهای پیشنهادی مارو دیده باشید ولی الان هدف اینه که ببینیم 
            ما میتونیم دوست فیلم بازت باشم و بهت فیلمی که بهت بچسبه رو معرفی کنیم. 
            پس لطفا ما رو چند دقیقه همراهی کن و در انتها به هر فیلم پیشنهادی ستاره بده. ممنون رفیق"
          </p>
          <Button onClick={handleStart} className="text-xl px-12 py-4 shadow-primary/50">
            شروع کنید (START)
          </Button>
        </div>
      </div>
    );
  }

// ... کدهای قبلی تا بخش render ...

if ([AppStep.PHASE_1_FIRST_RANDOM, AppStep.PHASE_1_BY_GENRE, AppStep.PHASE_2_SMART].includes(step)) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 px-4">
        {renderProgressIndicator()}
      </header>

      <main className="flex-1 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-primary mt-4">در حال آماده‌سازی فیلم‌ها...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8 max-w-6xl mx-auto">
            {currentPair.map((movie, idx) => (
              <div 
                key={`${movie.id}-${idx}`} 
                className="w-full md:w-1/2 max-w-md"
              >
                <MovieCard 
                  movie={movie} 
                  onSelect={() => handleMovieSelect(movie)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 px-4 flex justify-center">
        <Button 
          variant="secondary" 
          onClick={handleNoneOrSkip} 
          disabled={loading}
          className="w-full md:w-auto px-8 py-3"
        >
          {step === AppStep.PHASE_2_SMART ? "ندیدم / دوست ندارم (پرش)" : "هیچکدام"}
        </Button>
      </footer>
    </div>
  );
}


// بخش RESULTS را هم به‌روزرسانی کنید:
if (step === AppStep.RESULTS) {
  return (
    <div className="min-h-screen p-4 max-w-7xl mx-auto">
      <header className="py-8 text-center space-y-2" dir="rtl">
        <h2 className="text-3xl font-bold text-white">پیشنهادات ویژه برای شما</h2>
        <p className="text-gray-400">"بنظرم شما از دیدن این فیلمها لذت خواهید برد."</p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">در حال یافتن بهترین فیلم‌ها...</p>
        </div>
      ) : (
        // تغییر layout برای نمایش سه فیلم به صورت پورتره
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {recommendations.map((movie, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="flex-grow">
                <MovieCard movie={movie} disabled portraitMode={true} />
              </div>
              <div className="bg-surface rounded-b-xl p-4 mt-2 shadow-lg">
                <div className="pt-2 text-right" dir="rtl">
                  <p className="text-sm text-gray-300 italic mb-3 min-h-[3rem]">
                    "{movie.reason || movie.description || 'این فیلم با سلیقه شما هماهنگی زیادی دارد.'}"
                  </p>
                  <div className="border-t border-gray-700 pt-3 flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">به این پیشنهاد چه امتیازی می‌دهید؟</span>
                    <StarRating 
                      onRate={(rating) => handleRatingChange(movie.title, rating)}
                      initialRating={movieRatings[movie.title] || 0}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="flex justify-center mb-12">
          <Button onClick={() => setStep(AppStep.LEAD_GEN)} className="px-12 py-3">
            ادامه
          </Button>
        </div>
      )}
    </div>
  );
}




  if (step === AppStep.LEAD_GEN) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-700" dir="rtl">
          <h3 className="text-2xl font-bold mb-2 text-center text-primary">عضویت در نسخه اولیه</h3>
          <p className="text-gray-400 text-center mb-6 text-sm leading-6">
            در صورتی که از بازی لذت بردید با دادن ایمیل و شماره تلفن جزو اولین گروه بازیکنان باشید.
          </p>
          
          <form onSubmit={handleLeadGenSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase text-right">ایمیل</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-background border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none text-left"
                placeholder="you@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase text-right">شماره موبایل</label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-background border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none text-left"
                placeholder="0912..."
                dir="ltr"
              />
            </div>
            <Button type="submit" fullWidth className="mt-4">
              ثبت و پایان
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Thank you step
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl">🎉</h1>
        <h2 className="text-2xl font-bold">ممنون از همراهی شما!</h2>
        <p className="text-gray-500">به زودی با شما تماس خواهیم گرفت.</p>
      </div>
    </div>
  );
};

export default App;