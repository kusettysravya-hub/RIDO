import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car,
  ShieldCheck,
  Calendar,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Activity,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
  Sun,
  Moon,
  Leaf,
  Radio,
  Navigation,
  KeyRound,
  Layers,
  Cpu,
  LogIn,
  UserPlus,
  Heart,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { UserRole } from '../types';
import { RidoLogo } from '../components/RidoLogo';
import { AnimatedCommuterScene } from '../components/AnimatedCommuterScene';

interface AuthLandingPageProps {
  onAuthenticated?: (role?: UserRole) => void;
  onExploreApp?: () => void;
}

interface CommuterPerson {
  id: string;
  name: string;
  role: string;
  storyTag: string;
  image: string;
  badge: string;
  badgeColor: string;
  quote: string;
  speechBubble: string;
  telematics: { label: string; value: string }[];
  highlight: string;
}

const PEOPLE_CHARACTERS: CommuterPerson[] = [
  {
    id: 'passenger',
    name: 'Alex Rivera',
    role: 'College Student • Morning Commuter',
    storyTag: 'Story 01 • Morning Rush Solution',
    image: '/images/people/rushing_commuter.jpg',
    badge: '🏃‍♂️ Running Late to 9AM Standup',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    quote: 'Woke up at 8:38 AM with a presentation in 22 minutes. RIDO routed me to an express shuttle in 2 seconds and got me to my seat on time!',
    speechBubble: 'Presentation in 20m! RIDO pool matched in 2.4s ⚡',
    telematics: [
      { label: 'Time to Curb', value: '2.1 mins' },
      { label: 'Corridor Overlap', value: '96%' },
      { label: 'On-Time Arrival', value: '98.6%' },
    ],
    highlight: 'Matched with Campus Express #04 in 2.4s',
  },
  {
    id: 'driver',
    name: 'Marcus Vance',
    role: 'Campus Shuttle Driver • 4.9★',
    storyTag: 'Story 04 • Fleet Telematics & Driver',
    image: '/images/people/driver_welcoming.jpg',
    badge: '👋 Certified Electric Shuttle Operator',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    quote: 'I receive optimized passenger batches with zero empty-seat waste. The live turn-by-turn navigation HUD guides every meter of the corridor.',
    speechBubble: 'EV battery at 84%. Next stop: Student Center! 🚗',
    telematics: [
      { label: 'EV State of Charge', value: '84% SoC' },
      { label: 'Tyre Pressure', value: '33.5 PSI' },
      { label: 'Driver Rating', value: '4.95 ★' },
    ],
    highlight: 'Active on Route 12 • 12 Synchronized Shuttles',
  },
  {
    id: 'carpool',
    name: 'Maya & Daniel',
    role: 'Shared Commuters • Research Labs',
    storyTag: 'Story 03 • Smarter Carpooling',
    image: '/images/people/carpool_passengers.jpg',
    badge: '👥 75% Pooled Savings',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'We commute to the science block together every morning. We slashed our monthly travel expenses from ₹3,600 to under ₹900 while enjoying our coffee!',
    speechBubble: '₹45 fare per rider • -3.2 kg CO₂ saved 🌿',
    telematics: [
      { label: 'Solo Ride Cost', value: '₹180.00' },
      { label: 'Pooled Fare / Rider', value: '₹45.00' },
      { label: 'Emissions Slashed', value: '-3.2 kg CO₂' },
    ],
    highlight: 'Daily corridor carpool • 94% route overlap',
  },
];

interface StoryScene {
  id: number;
  badge: string;
  headline: string;
  tagline: string;
  oneLiner: string;
  videoUrl: string;
  hudType: 'morning_rush' | 'traffic' | 'shared_ride' | 'driver_fleet' | 'safety' | 'recovery';
  stats: { label: string; value: string }[];
  accentColor: string;
  personIndex?: number;
}

const STORIES: StoryScene[] = [
  {
    id: 1,
    badge: 'Story 01 • Morning Rush',
    headline: 'Running Late to Work?',
    tagline: 'Late Start. Right Ride. Better Day.',
    oneLiner: 'One tap instantly pairs you with the fastest corridor express pool so you arrive on time.',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    hudType: 'morning_rush',
    personIndex: 0,
    stats: [
      { label: 'Instant Match', value: '2.4s' },
      { label: 'Arrival Reliability', value: '98.6%' },
      { label: 'Stress Reduction', value: '100%' },
    ],
    accentColor: 'from-blue-600 to-cyan-500',
  },
  {
    id: 2,
    badge: 'Story 02 • Unexpected Traffic',
    headline: 'Stuck in Sudden Gridlock?',
    tagline: 'When Plans Change, Keep Moving.',
    oneLiner: 'Real-time telematics detects bottlenecks ahead and reroutes your ride to save up to 18 minutes.',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    hudType: 'traffic',
    stats: [
      { label: 'Corridor Reroute', value: 'Real-Time' },
      { label: 'Congestion Avoided', value: '18 mins' },
      { label: 'Speed Maintained', value: '48 km/h' },
    ],
    accentColor: 'from-amber-500 to-orange-500',
  },
  {
    id: 3,
    badge: 'Story 03 • Smarter Shared Journeys',
    headline: 'Shared Rides, Lower Costs',
    tagline: 'Share the Ride. Simplify the Journey.',
    oneLiner: 'Smart empty-seat pooling connects you with commuters heading your way, slashing fares by 75%.',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    hudType: 'shared_ride',
    personIndex: 2,
    stats: [
      { label: 'Cost Reduction', value: '75%' },
      { label: 'Route Overlap', value: '94%' },
      { label: 'CO₂ Slash', value: '-3.2 kg' },
    ],
    accentColor: 'from-emerald-500 to-teal-500',
  },
  {
    id: 4,
    badge: 'Story 04 • Fleet Telematics & Driver Empowerment',
    headline: 'Empowered Drivers, Synchronized Fleets',
    tagline: 'Every Ride. Better Coordinated.',
    oneLiner: 'Drivers receive optimized batch routes while campus dispatch monitors live EV battery and corridor demand.',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    hudType: 'driver_fleet',
    personIndex: 1,
    stats: [
      { label: 'EV Telematics', value: '84% SoC' },
      { label: 'Fleet Sync', value: '12 Active' },
      { label: 'Corridor Capacity', value: '96%' },
    ],
    accentColor: 'from-indigo-500 to-blue-500',
  },
  {
    id: 5,
    badge: 'Story 05 • Verified Safety & Peace of Mind',
    headline: 'Board Safely, Travel with Confidence',
    tagline: 'Move Forward with Confidence.',
    oneLiner: 'Board safely with cryptographic 4-digit PINs, live GPS tracking, and instant 24/7 security dispatch.',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    hudType: 'safety',
    personIndex: 0,
    stats: [
      { label: 'Boarding PIN', value: '4-Digit Crypto' },
      { label: 'Security Dispatch', value: '24/7 Linked' },
      { label: 'Emergency SOS', value: 'Instant Drill' },
    ],
    accentColor: 'from-rose-500 to-pink-500',
  },
  {
    id: 6,
    badge: 'Story 06 • Flagship Innovation',
    headline: 'Self-Healing Ride Recovery (SHRP 2.0)',
    tagline: 'Disruptions Happen. RIDO Adapts.',
    oneLiner: 'Autonomous self-healing engine resolves transit disruptions in seconds with fair, multi-objective ride recovery.',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    hudType: 'recovery',
    stats: [
      { label: 'Confidence Score', value: '0.89' },
      { label: 'Fairness Recency', value: 'λ = 0.8' },
      { label: 'Recovery Latency', value: '< 200ms' },
    ],
    accentColor: 'from-cyan-500 to-teal-400',
  },
];

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({
  onAuthenticated,
  onExploreApp,
}) => {
  const { user, login, register, demoLogin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useNotification();

  // Carousel State
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [activePersonIndex, setActivePersonIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Right Panel View Toggle: 'people' | 'login'
  const [rightPanelTab, setRightPanelTab] = useState<'people' | 'login'>('people');

  // Auth Modal & Form State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Register Form
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('PASSENGER');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regError, setRegError] = useState('');

  const currentStory = STORIES[currentStoryIndex];
  const currentPerson = PEOPLE_CHARACTERS[activePersonIndex];

  // Auto-rotation timer: 7000ms duration per story
  const STORY_DURATION = 7000;
  const TICK_INTERVAL = 50;

  const handleNextStory = useCallback(() => {
    setCurrentStoryIndex((prev) => {
      const next = (prev + 1) % STORIES.length;
      if (STORIES[next].personIndex !== undefined) {
        setActivePersonIndex(STORIES[next].personIndex!);
      } else {
        setActivePersonIndex((next) % PEOPLE_CHARACTERS.length);
      }
      return next;
    });
    setProgress(0);
    setVideoError(false);
  }, []);

  const handlePrevStory = useCallback(() => {
    setCurrentStoryIndex((prev) => {
      const next = (prev - 1 + STORIES.length) % STORIES.length;
      if (STORIES[next].personIndex !== undefined) {
        setActivePersonIndex(STORIES[next].personIndex!);
      }
      return next;
    });
    setProgress(0);
    setVideoError(false);
  }, []);

  const handleSelectStory = (index: number) => {
    setCurrentStoryIndex(index);
    if (STORIES[index].personIndex !== undefined) {
      setActivePersonIndex(STORIES[index].personIndex!);
    }
    setProgress(0);
    setVideoError(false);
  };

  // Visibility and Playback management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
        if (videoRef.current) videoRef.current.pause();
      } else {
        setIsPlaying(true);
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Story progression effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_INTERVAL / STORY_DURATION) * 100;
        if (next >= 100) {
          handleNextStory();
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [isPlaying, handleNextStory]);

  // Auth actions
  const handleOpenLogin = () => {
    setAuthTab('login');
    setShowAuthModal(true);
    setLoginError('');
  };

  const handleOpenRegister = () => {
    setAuthTab('register');
    setShowAuthModal(true);
    setRegError('');
  };

  const handleBookRideClick = () => {
    if (user) {
      if (onExploreApp) onExploreApp();
    } else {
      setRightPanelTab('login');
      handleOpenLogin();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim()) {
      setLoginError('Please enter your email address');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password');
      return;
    }

    setSubmitting(true);
    try {
      const success = await login(loginEmail.trim(), loginPassword, rememberMe);
      if (success) {
        setShowAuthModal(false);
        if (onAuthenticated) onAuthenticated();
      } else {
        setLoginError('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regFullName.trim()) {
      setRegError('Please provide your full name');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please enter a valid email address');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        phone: regPhone.trim() || '9876543210',
      };
      const success = await register(payload, rememberMe);
      if (success) {
        setShowAuthModal(false);
        if (onAuthenticated) onAuthenticated(regRole);
      } else {
        setRegError('Registration failed. Email may already be in use.');
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setSubmitting(true);
    try {
      const success = await demoLogin(role, rememberMe);
      if (success) {
        setShowAuthModal(false);
        if (onAuthenticated) onAuthenticated(role);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#070b14]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <RidoLogo size="md" badgeText="SHRP 2.0" showTagline={true} />
          </div>

          {/* Quick story pills (desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            {STORIES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => handleSelectStory(idx)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentStoryIndex === idx
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400'
                }`}
              >
                0{s.id}
              </button>
            ))}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
              aria-label="Toggle Light and Dark Mode"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Signed in as <strong className="text-slate-800 dark:text-slate-200">{user.full_name}</strong>
                </span>
                <button
                  onClick={onExploreApp}
                  className="btn-primary text-xs px-4 py-2 font-bold shadow-md shadow-cyan-500/25 flex items-center gap-1.5"
                >
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenLogin}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={handleOpenRegister}
                  className="btn-primary text-xs px-4 py-2 font-bold shadow-md shadow-cyan-500/25 flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero & Story Video Arena */}
      <section className="relative flex-1 flex flex-col justify-between overflow-hidden">
        {/* Subtle Ambient Glow Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-r from-blue-500/15 via-cyan-400/20 to-teal-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent dark:from-[#070b14] dark:via-[#070b14]/85 dark:to-transparent" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 w-full flex flex-col justify-between flex-1">
          {/* Top Road Animation Feature: Sleek Electric Car with Driving Passengers & Running Commuter */}
          <div className="mb-6">
            <AnimatedCommuterScene activeCharacter={activePersonIndex === 0 ? 'passenger' : activePersonIndex === 1 ? 'driver' : 'carpool'} />
          </div>

          {/* Main Grid: Storytelling on Left, Interactive People & Sign In on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Brand Storytelling & Action Hub */}
            <div className="lg:col-span-7 space-y-6">
              {/* Story Category Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span>{currentStory.badge}</span>
              </div>

              {/* Tagline & Main Brand Heading */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                  Running Late? <br />
                  <span className="text-cyan-600 dark:text-cyan-400">RIDO Gets You There.</span>
                </h1>

                <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-cyan-300">
                  {currentStory.tagline}
                </p>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {currentStory.oneLiner}
                </p>
              </div>

              {/* Prominent Action Buttons: Book a Ride, Login, Sign Up */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleBookRideClick}
                  className="btn-primary px-6 py-3.5 text-sm font-bold shadow-lg shadow-cyan-500/25 flex items-center gap-2.5"
                >
                  <Car className="w-4 h-4 text-cyan-200" />
                  <span>Book a Ride</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {!user && (
                  <>
                    <button
                      onClick={() => {
                        setRightPanelTab('login');
                        setAuthTab('login');
                      }}
                      className="btn-secondary px-5 py-3.5 text-sm font-semibold flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                      <span>Sign In Here</span>
                    </button>

                    <button
                      onClick={handleOpenRegister}
                      className="px-5 py-3.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span>Create Account</span>
                    </button>
                  </>
                )}

                {user && (
                  <button
                    onClick={onExploreApp}
                    className="btn-secondary px-5 py-3.5 text-sm font-semibold flex items-center gap-2"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 1-Click Demo Persona Launcher with Animated People Avatars */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                  <span>1-Click Test Personas (Instant Login Before Opening Website)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleQuickDemoLogin('PASSENGER')}
                    className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-cyan-50/50 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 text-left transition-all group shadow-sm hover:border-cyan-500 flex items-center gap-2.5"
                  >
                    <img
                      src="/images/people/rushing_commuter.jpg"
                      alt="Student Alex"
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 group-hover:scale-105 transition-transform"
                    />
                    <div className="overflow-hidden">
                      <div className="text-[10px] uppercase font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        Passenger
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Alex (Student)
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">Quick Pool</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickDemoLogin('DRIVER')}
                    className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-blue-50/50 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 text-left transition-all group shadow-sm hover:border-blue-500 flex items-center gap-2.5"
                  >
                    <img
                      src="/images/people/driver_welcoming.jpg"
                      alt="Driver Marcus"
                      className="w-10 h-10 rounded-xl object-cover border border-blue-500/40 group-hover:scale-105 transition-transform"
                    />
                    <div className="overflow-hidden">
                      <div className="text-[10px] uppercase font-mono font-bold text-blue-600 dark:text-blue-400">
                        Driver
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Marcus (Shuttle)
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">Accept Rides</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickDemoLogin('FLEET_MANAGER')}
                    className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-amber-50/50 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 text-left transition-all group shadow-sm hover:border-amber-500 flex items-center gap-2.5"
                  >
                    <img
                      src="/images/people/carpool_passengers.jpg"
                      alt="Fleet Maya"
                      className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 group-hover:scale-105 transition-transform"
                    />
                    <div className="overflow-hidden">
                      <div className="text-[10px] uppercase font-mono font-bold text-amber-600 dark:text-amber-400">
                        Fleet Mgr
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Operations Hub
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">EV Telematics</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickDemoLogin('ADMIN')}
                    className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-purple-50/50 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 text-left transition-all group shadow-sm hover:border-purple-500 flex items-center gap-2.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-500/40">
                      🛡️
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[10px] uppercase font-mono font-bold text-purple-600 dark:text-purple-400">
                        Admin
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Mission Ctrl
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">Full System</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Animated People Spotlight & Live Sign-In Hub */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-white/80 dark:bg-[#0c1427]/90 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Header Switcher: Animated Commuters vs Instant Sign-In */}
                <div className="flex border-b border-slate-200 dark:border-slate-800/80 p-2 bg-slate-100/70 dark:bg-slate-900/60">
                  <button
                    onClick={() => setRightPanelTab('people')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      rightPanelTab === 'people'
                        ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Live Commuter Stories</span>
                  </button>
                  <button
                    onClick={() => setRightPanelTab('login')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      rightPanelTab === 'login'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {user ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="truncate">Active ({user.full_name.split(' ')[0]})</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Instant Sign In</span>
                      </>
                    )}
                  </button>
                </div>

                {/* TAB 1: ANIMATED PEOPLE COMMUTER SPOTLIGHT */}
                {rightPanelTab === 'people' && (
                  <div className="p-5 space-y-4">
                    {/* Character Selector Pills */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                      {PEOPLE_CHARACTERS.map((char, idx) => (
                        <button
                          key={char.id}
                          onClick={() => setActivePersonIndex(idx)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 truncate ${
                            activePersonIndex === idx
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="truncate">{char.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>

                    {/* Animated Character Portrait Card */}
                    <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 group">
                      <img
                        src={currentPerson.image}
                        alt={currentPerson.name}
                        className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      />

                      {/* Frosted Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                      {/* Floating Speech Bubble with Pulsing Indicator */}
                      <div className="absolute top-3 inset-x-3">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-cyan-400/50 text-white text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce">
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{currentPerson.speechBubble}</span>
                        </div>
                      </div>

                      {/* Character Details & Telematics Overlay at bottom */}
                      <div className="absolute bottom-3 inset-x-3 space-y-1.5 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-base font-extrabold flex items-center gap-2">
                              <span>{currentPerson.name}</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            </div>
                            <div className="text-xs text-cyan-300 font-medium">
                              {currentPerson.role}
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${currentPerson.badgeColor}`}>
                            {currentPerson.badge}
                          </span>
                        </div>

                        {/* Telematics Bar inside card */}
                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-700/60 text-center">
                          {currentPerson.telematics.map((t, idx) => (
                            <div key={idx} className="p-1 rounded-lg bg-slate-900/80">
                              <div className="text-[9px] text-slate-400">{t.label}</div>
                              <div className="text-[11px] font-mono font-bold text-cyan-300">{t.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Character Testimonial Quote */}
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                      "{currentPerson.quote}"
                    </div>

                    {/* Action Button: Enter Dashboard if signed in, or Switch to Sign In */}
                    {user ? (
                      <button
                        onClick={onExploreApp}
                        className="w-full btn-primary py-2.5 text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
                      >
                        <span>Enter Dashboard as {user.full_name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setRightPanelTab('login')}
                        className="w-full btn-primary py-2.5 text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In as {currentPerson.name.split(' ')[0]}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 2: ACTIVE SESSION CARD (IF LOGGED IN) */}
                {rightPanelTab === 'login' && user && (
                  <div className="p-5 space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-transparent border border-cyan-500/30 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-base shadow-md shadow-cyan-500/30">
                          {user.full_name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                            <span>{user.full_name}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                          <div className="text-[10px] text-slate-400 font-medium">Active Role</div>
                          <div className="font-bold text-cyan-600 dark:text-cyan-400 capitalize truncate">
                            {user.role.toLowerCase().replace('_', ' ')}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                          <div className="text-[10px] text-slate-400 font-medium">Wallet Balance</div>
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{user.wallet_balance.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Status:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Signed In & Ready</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={onExploreApp}
                      className="w-full btn-primary py-3 text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                    >
                      <span>Enter Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => logout()}
                      className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out of RIDO</span>
                    </button>
                  </div>
                )}

                {/* TAB 2: INLINE SIGN IN FORM (IF NOT LOGGED IN) */}
                {rightPanelTab === 'login' && !user && (
                  <div className="p-5 space-y-4">
                    {/* Commuter Persona Welcome Header */}
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30">
                      <img
                        src={currentPerson.image}
                        alt="Commuter avatar"
                        className="w-11 h-11 rounded-xl object-cover border border-cyan-400/50 shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          Welcome, Commuter! 👋
                        </div>
                        <div className="text-[11px] text-cyan-700 dark:text-cyan-300 truncate">
                          Sign in to start pooling and tracking campus rides
                        </div>
                      </div>
                    </div>

                    {loginError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    {/* Sign In Form */}
                    <form onSubmit={handleLoginSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="student@campuscommute.edu"
                            className="input-field pl-10 text-xs"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showLoginPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input-field pl-10 pr-10 text-xs"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <span>Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenRegister}
                          className="text-xs text-blue-600 dark:text-cyan-400 hover:underline font-semibold"
                        >
                          New to RIDO? Sign Up
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full btn-primary py-2.5 text-xs font-bold shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>Sign In to RIDO</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Quick Demo Logins inside Tab */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
                        Or One-Click Demo Login
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickDemoLogin('PASSENGER')}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs text-left transition-colors flex items-center gap-2"
                        >
                          <img
                            src="/images/people/rushing_commuter.jpg"
                            alt="Student"
                            className="w-7 h-7 rounded-lg object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-cyan-600 dark:text-cyan-400">Student</div>
                            <div className="text-[9px] text-slate-400">Alex</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickDemoLogin('DRIVER')}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs text-left transition-colors flex items-center gap-2"
                        >
                          <img
                            src="/images/people/driver_welcoming.jpg"
                            alt="Driver"
                            className="w-7 h-7 rounded-lg object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-blue-600 dark:text-blue-400">Driver</div>
                            <div className="text-[9px] text-slate-400">Marcus</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Story Navigation & Progress Timeline */}
          <div className="mt-10 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 space-y-4">
            {/* Story Timeline Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {STORIES.map((s, idx) => {
                const isActive = currentStoryIndex === idx;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStory(idx)}
                    className={`relative p-3 rounded-2xl text-left transition-all overflow-hidden ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 border-2 border-cyan-500 shadow-md shadow-cyan-500/20 scale-[1.02]'
                        : 'bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:bg-white/80 dark:hover:bg-slate-900/80 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Active Timer Progress Line */}
                    {isActive && isPlaying && (
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        0{s.id}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {s.tagline.split('.')[0]}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {s.badge.split('•')[1]?.trim() || s.headline}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Playback Controls Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> <span>Pause Rotation</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> <span>Resume Auto-Play</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] font-mono hidden sm:inline">
                  Story {currentStoryIndex + 1} of {STORIES.length} • Auto-rotates every 7s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevStory}
                  className="p-2 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Previous Story"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextStory}
                  className="p-2 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Next Story"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="bg-slate-100/70 dark:bg-slate-900/50 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Why Commuters & Fleets Choose RIDO
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Integrated corridor ride pooling engineered with mathematical fairness, zero-waste capacity, and real-time self-healing resilience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                Self-Healing Ride Recovery (SHRP)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Autonomous multi-objective resilience engine dynamically evaluates recovery plans, tracks passenger delay burdens, and minimizes commute disruptions.
              </p>
            </div>

            <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                Intelligent Empty Seat Optimization
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Pairs compatible corridor riders instantly, reducing solo commute costs by up to 75% and removing carbon emissions from crowded campus routes.
              </p>
            </div>

            <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                4-Digit PIN & Verified Safety
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cryptographic start PIN verification, live GPS breadcrumb tracking, and instant SOS dispatch drills protect both drivers and passengers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#070b14]/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <RidoLogo size="sm" showTagline={true} />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-400">
            © {new Date().getFullYear()} RIDO • Smart Rides. Seamless Journeys.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Autonomous Corridor Transit & Fleet Operations Platform
          </p>
        </div>
      </footer>

      {/* Authentication Modal (Sign In & Sign Up) with Animated Commuter Banner */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
              aria-label="Close Auth Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Top Character Banner */}
            <div className="relative h-28 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 overflow-hidden flex items-end px-6 pb-3">
              <img
                src={currentPerson.image}
                alt="Commuter"
                className="absolute right-4 -bottom-2 w-24 h-24 rounded-2xl object-cover border-2 border-white/80 shadow-lg shadow-black/30"
              />
              <div className="relative z-10 text-white max-w-[65%]">
                <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-cyan-200">
                  {currentPerson.role}
                </div>
                <div className="text-base font-extrabold truncate">
                  {authTab === 'login' ? `Welcome back, ${currentPerson.name.split(' ')[0]}!` : 'Join RIDO Community'}
                </div>
              </div>
            </div>

            {/* Modal Header Tab Selector */}
            <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setLoginError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authTab === 'login'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setRegError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authTab === 'register'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* LOGIN FORM */}
              {authTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. student@campuscommute.edu"
                        className="input-field pl-10 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-field pl-10 pr-10 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <span>Remember me</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-primary py-3 text-xs font-bold shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* REGISTER FORM */}
              {authTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {regError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="John Doe"
                        className="input-field pl-10 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="john@campus.edu"
                        className="input-field pl-10 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="9876543210"
                          className="input-field pl-9 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Role
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as UserRole)}
                        className="input-field text-xs py-2"
                      >
                        <option value="PASSENGER">Passenger</option>
                        <option value="DRIVER">Driver</option>
                        <option value="FLEET_MANAGER">Fleet Manager</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="input-field pl-10 pr-10 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegConfirm ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-field pl-10 pr-10 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirm(!showRegConfirm)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-primary py-3 text-xs font-bold shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Instant 1-Click Demo Section in Modal */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
                  Or One-Click Demo Persona Login
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('PASSENGER')}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-left transition-colors flex items-center gap-2"
                  >
                    <img
                      src="/images/people/rushing_commuter.jpg"
                      alt="Student"
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                    <div>
                      <div className="font-bold text-cyan-600 dark:text-cyan-400">Student Alex</div>
                      <div className="text-[10px] text-slate-400">Passenger</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('DRIVER')}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-left transition-colors flex items-center gap-2"
                  >
                    <img
                      src="/images/people/driver_welcoming.jpg"
                      alt="Driver"
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                    <div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">Driver Marcus</div>
                      <div className="text-[10px] text-slate-400">Shuttle Operator</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('FLEET_MANAGER')}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-left transition-colors flex items-center gap-2"
                  >
                    <img
                      src="/images/people/carpool_passengers.jpg"
                      alt="Fleet"
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                    <div>
                      <div className="font-bold text-amber-600 dark:text-amber-400">Fleet Maya</div>
                      <div className="text-[10px] text-slate-400">Telematics Hub</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('ADMIN')}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-left transition-colors flex items-center gap-2"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                      🛡️
                    </div>
                    <div>
                      <div className="font-bold text-purple-600 dark:text-purple-400">Admin Control</div>
                      <div className="text-[10px] text-slate-400">Full System</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthLandingPage;
