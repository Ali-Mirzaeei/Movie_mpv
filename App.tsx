import React, { useState, useEffect, useCallback } from 'react';
import { Movie, AppStep, UserTaste } from './types';
import { analyzeUserTaste, getMovieGenre } from './services/preferenceAnalyzer';
import { getRandomPair, getMoviesByGenre, getSmartPair, getFinalRecommendations, getAllMovies } from './services/movieSelectionService';
import { generateSmartMoviePair, generateFinalRecommendations as generateAIRecommendations, isAIAvailable } from './services/openaiService';
import Button from './components/Button';
import MovieCard from './components/MovieCard';
import StarRating from './components/StarRating';

const API_BASE = "https://movie-mind-ol9e.onrender.com";
console.log("Backend URL:", API_BASE);

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
  
  // State مراحل
  const [phase1FirstDone, setPhase1FirstDone] = useState(false);
  const [phase1GenreDone, setPhase1GenreDone] = useState(false);
  const [smartPhaseCount, setSmartPhaseCount] = useState(0);
  
  // State فرم
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [movieRatings, setMovieRatings] = useState<{[key: string]: number}>({});

  // Stateهای جدید برای اعتبارسنجی امتیاز
  const [ratingError, setRatingError] = useState(false);
  const [showRatingNotification, setShowRatingNotification] = useState(false);

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

  // --- Handlers ---
  const handleStart = () => {
    setStep(AppStep.PHASE_1_FIRST_RANDOM);
  };

  const handleMovieSelect = async (movie: Movie) => {
    const newHistory = [...selectedMovies, movie];
    setSelectedMovies(newHistory);
    
    const otherMovie = currentPair.find(m => m.title !== movie.title);
    if (otherMovie) {
      markPairAsRejected([otherMovie]);
    }

    if (!phase1FirstDone) {
      setPhase1FirstDone(true);
      setStep(AppStep.PHASE_1_BY_GENRE);
      
      const genre = getMovieGenre(movie.title);
      const genreMovies = getMoviesByGenre(genre, [movie.id!, ...Array.from(rejectedMovies)]);
      
      if (genreMovies.length >= 2) {
        setCurrentPair(genreMovies);
      } else {
        setCurrentPair(getNonRepeatingPair([movie.id!, ...Array.from(rejectedMovies)]));
      }
      return;
    }
    
    if (!phase1GenreDone && phase1FirstDone) {
      setPhase1GenreDone(true);
      setSmartPhaseCount(1);
      
      const taste = analyzeUserTaste(newHistory);
      const smartPair = getSmartPair(
        taste, 
        newHistory, 
        Array.from(rejectedMovies), 
        newHistory.map(m => m.id!)
      );
      
      setCurrentPair(smartPair);
      return;
    }
    
    if (smartPhaseCount < 8) {
      const nextCount = smartPhaseCount + 1;
      setSmartPhaseCount(nextCount);
      
      if (nextCount % 2 === 1 && isAIAvailable()) {
        setLoading(true);
        try {
          const taste = analyzeUserTaste(newHistory);
          const aiPair = await generateSmartMoviePair(
            taste,
            newHistory.map(m => m.title),
            [...Array.from(rejectedMovies), ...newHistory.map(m => m.title)]
          );
          
          if (aiPair && aiPair.length >= 2) {
            const enriched = getEnrichedMovies(aiPair);
            setCurrentPair(enriched);
          } else {
            const localPair = getSmartPair(
              taste, 
              newHistory, 
              Array.from(rejectedMovies), 
              newHistory.map(m => m.id!)
            );
            setCurrentPair(localPair);
          }
        } catch (error) {
          console.error('AI failed:', error);
          const taste = analyzeUserTaste(newHistory);
          const localPair = getSmartPair(
            taste, 
            newHistory, 
            Array.from(rejectedMovies), 
            newHistory.map(m => m.id!)
          );
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
          newHistory.map(m => m.id!)
        );
        setCurrentPair(smartPair);
      }
    } else {
      setStep(AppStep.RESULTS);
    }
  };

  const handleNoneOrSkip = () => {
    markPairAsRejected(currentPair);
    
    if (step === AppStep.PHASE_1_FIRST_RANDOM) {
      setCurrentPair(getNonRepeatingPair([
        ...selectedMovies.map(m => m.id!),
        ...Array.from(rejectedMovies)
      ]));
    } else if (step === AppStep.PHASE_1_BY_GENRE) {
      const lastSelected = selectedMovies[selectedMovies.length - 1];
      const genre = getMovieGenre(lastSelected.title);
      const genreMovies = getMoviesByGenre(genre, [
        ...selectedMovies.map(m => m.id!),
        ...Array.from(rejectedMovies)
      ]);
      
      if (genreMovies.length >= 2) {
        setCurrentPair(genreMovies);
      } else {
        setCurrentPair(getNonRepeatingPair([
          ...selectedMovies.map(m => m.id!),
          ...Array.from(rejectedMovies)
        ]));
      }
    } else {
      const taste = analyzeUserTaste(selectedMovies);
      const smartPair = getSmartPair(
        taste, 
        selectedMovies, 
        Array.from(rejectedMovies), 
        selectedMovies.map(m => m.id!)
      );
      setCurrentPair(smartPair);
    }
  };

  const handleLeadGenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalEmail = email.trim() || 'no-email@example.com';
    const finalPhone = phone.trim() || '00000000000';
    
    const payload = {
      email: finalEmail,
      phone: finalPhone,
      selected_movies: selectedMovies,
      movie_ratings: movieRatings,
    };

    try {
      const response = await fetch(`${API_BASE}/api/submit/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Submission error:", errorData);
        setStep(AppStep.THANK_YOU);
        return;
      }

      const data = await response.json();
      console.log("Submission successful:", data);
      setStep(AppStep.THANK_YOU);
    } catch (err) {
      console.error("Network error:", err);
      setStep(AppStep.THANK_YOU);
    }
  };

  const handleSaveRatings = async () => {
    const hasAnyRating = Object.keys(movieRatings).length > 0;
    
    if (!hasAnyRating) {
      setRatingError(true);
      setShowRatingNotification(true);
      
      setTimeout(() => {
        setShowRatingNotification(false);
      }, 5000);
      
      return;
    }
    
    setRatingError(false);
    setShowRatingNotification(false);
    setStep(AppStep.LEAD_GEN);
  };

  const handleRatingChange = (movieTitle: string, rating: number) => {
    setMovieRatings(prev => ({
      ...prev,
      [movieTitle]: rating
    }));
    
    if (rating > 0) {
      setRatingError(false);
      setShowRatingNotification(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (step === AppStep.PHASE_1_FIRST_RANDOM && currentPair.length === 0) {
      setCurrentPair(getNonRepeatingPair(Array.from(rejectedMovies)));
    }
  }, [step, currentPair.length, rejectedMovies, getNonRepeatingPair]);

  useEffect(() => {
    if (step === AppStep.RESULTS && recommendations.length === 0) {
      const fetchRecommendations = async () => {
        setLoading(true);
        
        const taste = analyzeUserTaste(selectedMovies);
        const localRecs = getFinalRecommendations(taste, selectedMovies.map(m => m.id!));
        
        console.log('AI available?', isAIAvailable());
        console.log('Local recommendations count:', localRecs.length);
        
        if (isAIAvailable()) {
          try {
            const aiRecs = await generateAIRecommendations(selectedMovies.map(m => m.title));
            console.log('AI recommendations received:', aiRecs);
            if (aiRecs && aiRecs.length >= 3) {
              const enrichedRecs = getEnrichedMovies(aiRecs);
              setRecommendations(enrichedRecs.slice(0, 3));
            } else {
              setRecommendations(localRecs);
            }
          } catch (error) {
            console.error('AI recommendation failed, using local:', error);
            setRecommendations(localRecs);
          }
        } else {
          console.log('AI not available, using local recommendations');
          setRecommendations(localRecs);
        }
        
        setLoading(false);
      };
      
      fetchRecommendations();
    }
  }, [step, recommendations.length, selectedMovies, getEnrichedMovies]);

  const renderProgressIndicator = () => {
    if (step === AppStep.INTRO || step === AppStep.RESULTS || 
        step === AppStep.LEAD_GEN || step === AppStep.THANK_YOU) {
      return null;
    }

    const phaseText = phase1FirstDone 
      ? (phase1GenreDone ? `مرحله هوشمند ${smartPhaseCount}/8` : 'بر اساس ژانر')
      : 'انتخاب اولیه';

    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">پیشرفت</span>
          <span className="text-sm text-primary">{selectedMovies.length} / 10</span>
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

  if (step === AppStep.INTRO) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[url('https://picsum.photos/id/234/1920/1080?grayscale&blur=2')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div className="relative z-10 max-w-lg text-center space-y-8" dir="rtl">
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary tracking-tight">
            MovieMind
          </h1>
          <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-light">
            <strong>با هم سلیقه‌ی فیلم‌ بازیت رو کشف می‌کنیم</strong> 🎬  
            <br />
            فقط <strong>چند دقیقه</strong> باهامون باش؛ 
            <br /> 
            بین هر دو فیلم <strong>✅ یکی رو انتخاب کن یا ردشون کن ❌</strong>                  
            <br />
            بعدش <strong>فیلم‌هایی بهت نشون می‌دیم که واقعاً بهت می‌چسبه</strong> 🔥  
            <br />
            چون هنوز کامل همو نمی‌شناسیم،  
            ممکنه <strong>بعضی فیلم‌ها رو قبلاً دیده باشی</strong> اشکالی نداره 😉  
            <br />
            فقط <strong>به فیلم‌ها ستاره بده</strong> ⭐
          </p>
          <Button onClick={handleStart} className="text-xl px-12 py-4 shadow-primary/50">
            شروع کنید (START)
          </Button>
        </div>
      </div>
    );
  }

  if ([AppStep.PHASE_1_FIRST_RANDOM, AppStep.PHASE_1_BY_GENRE, AppStep.PHASE_2_SMART].includes(step)) {
    return (
      <div className="min-h-screen flex flex-col p-4 max-w-4xl mx-auto">
        <header className="py-1 mb-1">
          {renderProgressIndicator()}
        </header>

        <main className="flex-1 flex flex-col justify-center">
          {loading ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-primary animate-pulse">در حال آماده‌سازی فیلم‌ها...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-around w-fit self-center gap-4 md:gap-28">
              {currentPair.map((movie, idx) => (
                <MovieCard 
                  key={`${movie.id}-${idx}`} 
                  movie={movie} 
                  onSelect={() => handleMovieSelect(movie)}
                />
              ))}
            </div>
          )}
        </main>

        <footer className="py-2 flex justify-center">
          <Button 
            variant="secondary" 
            onClick={handleNoneOrSkip} 
            disabled={loading}
            className="w-full md:w-auto"
          >
            {step === AppStep.PHASE_2_SMART ? "ندیدم / دوست ندارم (پرش)" : "هیچکدام"}
          </Button>
        </footer>
      </div>
    );
  }

  if (step === AppStep.RESULTS) {
    return (
      <div className="min-h-screen p-4 max-w-5xl mx-auto">
        <header className="py-8 text-center space-y-2" dir="rtl">
          <h2 className="text-3xl font-bold text-white">پیشنهادات ویژه برای شما</h2>
          <p className="text-gray-400">"بنظرم شما از دیدن این فیلمها لذت خواهید برد."</p>
          <h3 className="text-3xl font-bold text-white">«لطفا به پیشنهاد های ارائه شده ستاره دهید»</h3>
        </header>

        {showRatingNotification && (
          <div className="mb-6 animate-pulse">
            <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-4 text-center">
              <p className="text-white text-lg font-bold flex items-center justify-center gap-2">
                <span className="text-2xl">⚠️</span>
                لطفا ابتدا به یکی از فیلم‌های زیر که قبلا دیده‌اید امتیاز دهید
                <span className="text-2xl">⚠️</span>
              </p>
              <p className="text-red-200 text-sm mt-2">برای ادامه باید حداقل به یک فیلم ستاره بدهید</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">در حال یافتن بهترین فیلم‌ها...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {recommendations.map((movie, idx) => (
                <div key={idx} className="bg-surface rounded-2xl p-4 flex flex-col space-y-3 shadow-xl">
                  <MovieCard movie={movie} disabled />
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
              ))}
            </div>

            {!loading && (
              <div className="flex flex-col items-center gap-4 mb-12">
                <div className="text-center">
                  <p className={`text-sm ${ratingError ? 'text-red-400' : 'text-green-400'}`}>
                    {Object.keys(movieRatings).length > 0 
                      ? `✅ به ${Object.keys(movieRatings).length} فیلم امتیاز داده‌اید`
                      : '⭕ هنوز به هیچ فیلمی امتیاز نداده‌اید'}
                  </p>
                </div>
                
                <Button 
                  onClick={handleSaveRatings}
                  className={`px-12 ${ratingError ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  disabled={loading}
                >
                  {ratingError ? 'لطفا اول امتیاز دهید' : 'ادامه'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (step === AppStep.LEAD_GEN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-6">
          <div className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400/50 rounded-xl p-4 text-center animate-pulse shadow-lg">
            <p className="text-white text-lg font-bold flex items-center justify-center gap-2">
              <span className="text-2xl">⚠️</span>
              لطفا کلید ثبت نظر را فشار دهید
              <span className="text-2xl">⚠️</span>
            </p>
            <p className="text-yellow-200 text-sm mt-2">اطلاعات تماس اختیاری است</p>
          </div>
        </div>
        
        <div className="bg-surface p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-700" dir="rtl">
          <h3 className="text-2xl font-bold mb-2 text-center text-primary">عضویت در نسخه اولیه</h3>
          <p className="text-gray-400 text-center mb-6 text-sm leading-6">
            در صورت تمایل ایمیل یا شماره تلفن خود را وارد کنید. (اختیاری)
          </p>
          
          <form onSubmit={handleLeadGenSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase text-right">ایمیل (اختیاری)</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-background border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none text-left"
                placeholder="you@example.com (اختیاری)"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase text-right">شماره موبایل (اختیاری)</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-background border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none text-left"
                placeholder="0912... (اختیاری)"
                dir="ltr"
              />
            </div>
            <div className="mt-6">
              <Button 
                type="submit"
                fullWidth 
                className="bg-primary hover:bg-primary/90 py-3"
              >
                ثبت نظر و اطلاعات
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-md">
        <div className="space-y-4">
          <h1 className="text-6xl">🎉</h1>
          <h2 className="text-3xl font-bold text-white">ممنون از همراهی شما!</h2>
          <p className="text-gray-400 text-lg">بازخورد شما با موفقیت ثبت شد.</p>
        </div>
        
        <div className="pt-6">
          <Button 
            onClick={() => {
              setStep(AppStep.INTRO);
              setSelectedMovies([]);
              setCurrentPair([]);
              setRecommendations([]);
              setRejectedMovies(new Set());
              setRejectedPairs(new Set());
              setPhase1FirstDone(false);
              setPhase1GenreDone(false);
              setSmartPhaseCount(0);
              setEmail('');
              setPhone('');
              setMovieRatings({});
            }}
            className="px-8 py-3 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            شروع مجدد
          </Button>
        </div>
      </div>
    </div>
  );
};

export default App;