import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"; // Добавлены хуки для 3D анимации
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Gamepad2,
  LogOut,
  ChevronRight,
  UserCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  Server,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

/*********************
 * Firebase Setup (robust lazy getters)
 *********************/
const firebaseConfig = {
  apiKey: "AIzaSyB_wZLaU6LqFCei5BPUEfUKHVjajqKIZ7E",
  authDomain: "br-online-a1333.firebaseapp.com",
  projectId: "br-online-a1333",
  storageBucket: "br-online-a1333.firebasestorage.app",
  messagingSenderId: "1094850593793",
  appId: "1:1094850593793:web:2dfb4bf4c09db2f93d2c00",
  measurementId: "G-WKJF9PZ67V",
};

// Initialize global references safely
if (typeof globalThis !== 'undefined') {
  globalThis.__BR_ONLINE_FIREBASE_APP = globalThis.__BR_ONLINE_FIREBASE_APP || null;
  globalThis.__BR_ONLINE_AUTH = globalThis.__BR_ONLINE_AUTH || null;
  globalThis.__BR_ONLINE_DB = globalThis.__BR_ONLINE_DB || null;
}

function getFirebaseApp() {
  if (globalThis.__BR_ONLINE_FIREBASE_APP) return globalThis.__BR_ONLINE_FIREBASE_APP;
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    globalThis.__BR_ONLINE_FIREBASE_APP = app;
    return app;
  } catch (e) {
    try {
      const fallbackName = `br-online-fallback-${Date.now()}`;
      const app = initializeApp(firebaseConfig, fallbackName);
      globalThis.__BR_ONLINE_FIREBASE_APP = app;
      return app;
    } catch (e2) {
      console.error("Failed to initialize Firebase App (primary + fallback):", e, e2);
      throw e2;
    }
  }
}

function getAuthInstance() {
  if (globalThis.__BR_ONLINE_AUTH) return globalThis.__BR_ONLINE_AUTH;
  try {
    const app = getFirebaseApp();
    const a = getAuth(app);
    globalThis.__BR_ONLINE_AUTH = a;
    return a;
  } catch (e) {
    console.warn("getAuth failed, attempting fallback:", e);
    try {
      const fallbackName = `br-online-auth-fallback-${Date.now()}`;
      const app = initializeApp(firebaseConfig, fallbackName);
      const a = getAuth(app);
      globalThis.__BR_ONLINE_AUTH = a;
      globalThis.__BR_ONLINE_FIREBASE_APP = app;
      return a;
    } catch (e2) {
      console.error("Auth initialization fallback failed:", e2);
      throw e2;
    }
  }
}

function getDbInstance() {
  if (globalThis.__BR_ONLINE_DB) return globalThis.__BR_ONLINE_DB;
  try {
    const app = getFirebaseApp();
    const d = getFirestore(app);
    globalThis.__BR_ONLINE_DB = d;
    return d;
  } catch (e) {
    console.warn("getFirestore failed, attempting fallback:", e);
    try {
      const fallbackName = `br-online-db-fallback-${Date.now()}`;
      const app = initializeApp(firebaseConfig, fallbackName);
      const d = getFirestore(app);
      globalThis.__BR_ONLINE_DB = d;
      globalThis.__BR_ONLINE_FIREBASE_APP = app;
      return d;
    } catch (e2) {
      console.error("Firestore initialization fallback failed:", e2);
      throw e2;
    }
  }
}

/*********************
 * Helpers
 *********************/
const emailRegex = /^(?=.{3,254}$)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/*********************
 * Minimal toast system
 *********************/
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  return { toasts, add };
}

function Toasts({ items }) {
  return (
    <div className="fixed z-[100] top-4 right-4 space-y-2 max-w-xs sm:max-w-sm">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className={`backdrop-blur-md shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 border ${
              t.type === 'error'
                ? 'bg-red-500/15 border-red-300/30 text-red-50'
                : t.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-300/30 text-emerald-50'
                : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="w-5 h-5 opacity-80" />
            ) : (
              <ShieldCheck className="w-5 h-5 opacity-80" />
            )}
            <span className="text-sm font-medium">{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/*********************
 * Ripple Button
 *********************/
function RippleButton({ className = "", children, onClick, disabled, type = "button" }) {
  const ref = useRef(null);
  const [ripples, setRipples] = useState([]);
  
  const addRipple = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height);
    const id = Math.random().toString(36).slice(2);
    setRipples((r) => [...r, { x, y, size, id }]);
    setTimeout(() => setRipples((r) => r.filter((i) => i.id !== id)), 600);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`relative overflow-hidden select-none transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onClick={(e) => {
        addRipple(e);
        onClick && onClick(e);
      }}
      whileTap={{ scale: 0.97 }} // Улучшенная анимация нажатия
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 rounded-2xl">
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute bg-white/40 rounded-full animate-[ripple_600ms_ease-out]"
            style={{ 
              left: r.x - r.size / 2, 
              top: r.y - r.size / 2, 
              width: r.size, 
              height: r.size 
            }}
          />
        ))}
      </span>
    </motion.button>
  );
}

/*********************
 * Email Verification Handler
 *********************/
async function handleEmailVerification(user) {
  try {
    await sendEmailVerification(user);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

async function verifyEmailActionCode(actionCode) {
  try {
    const auth = getAuthInstance();
    await checkActionCode(auth, actionCode);
    await applyActionCode(auth, actionCode);
    return true;
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
}

/*********************
 * Reusable Field component
 *********************/
function Field({ label, icon, rightIcon, type = 'text', value, onChange, placeholder, disabled }) {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <label className="block">
      <div className="text-sm text-white/70 mb-1 font-medium">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-white/40 transition-all duration-300">
        <span className="text-white/60">{icon}</span>
        <input
          type={type}
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 min-w-0"
          required
        />
        {rightIcon}
      </div>
    </label>
  );
}

/*********************
 * Dashboard Components
 *********************/
function StatCard({ title, value, sub }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      ref={ref}
      className="rounded-2xl p-4 sm:p-5 bg-white/5 border border-white/10 backdrop-blur"
      style={{ rotateX, rotateY, perspective: 800 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      whileHover={{ scale: 1.05, boxShadow: "0px 15px 30px -10px rgba(0,0,0,0.4)" }}
    >
      <div className="text-sm text-white/70">{title}</div>
      <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">{value}</div>
      {sub && <div className="text-xs text-white/60 mt-1">{sub}</div>}
    </motion.div>
  );
}

/*********************
 * Server Card Component
 *********************/
function ServerCard({ name, online, maxonline, x2 }) {
  const percentage = Math.round((online / maxonline) * 100);
  
  return (
    <motion.div 
      className="rounded-xl p-3 bg-white/5 border border-white/10 transition-all duration-300 flex flex-col h-full"
      whileHover={{ scale: 1.05, y: -2, boxShadow: "0px 10px 20px -8px rgba(0,0,0,0.3)" }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs sm:text-sm text-white/70 truncate flex-1 mr-2">{name}</div>
        {x2 && (
          <div className="flex-shrink-0">
            <div className="bg-yellow-500/20 text-yellow-300 text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              x2
            </div>
          </div>
        )}
      </div>
      <div className="mt-1 text-base sm:text-lg font-bold text-white">
        {online}/{maxonline}
      </div>
      <div className="w-full bg-white/10 rounded-full h-1.5 sm:h-2 mt-1.5">
        <div 
          className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
            percentage >= 80 ? 'bg-red-500' : 
            percentage >= 60 ? 'bg-yellow-500' : 
            percentage >= 40 ? 'bg-blue-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-xs text-white/60 mt-1">
        {percentage}%
      </div>
    </motion.div>
  );
}

/*********************
 * Search Input with Suggestions (REFACTORED for stability)
 *********************/
function SearchInput({ initialValue, placeholder, icon, suggestions = [], onSelection, type = "text" }) {
  const [inputValue, setInputValue] = useState(initialValue || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setInputValue(initialValue || "");
    }
  }, [initialValue]);

  const filteredSuggestions = (suggestions || []).filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!showSuggestions) setShowSuggestions(true);

    if (type === 'date') {
      onSelection?.(newValue);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    onSelection?.(suggestion);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (type !== 'date') {
        if (!suggestions.includes(inputValue)) {
          setInputValue(initialValue);
        }
      }
      setShowSuggestions(false);
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleSuggestionClick(filteredSuggestions[0]);
      }
    }
  };

  return (
    <div className="relative">
      <div className={"flex items-center gap-3 rounded-2xl bg-white/3 px-3 py-2 border border-white/6 focus-within:border-white/20 transition-all duration-200"}>
        <span className="text-white/60">{icon}</span>
        <input
          ref={inputRef}
          type={type}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 min-w-0 text-sm"
          autoComplete="off"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="absolute z-50 mt-1 left-0 right-0 rounded-lg bg-white/6 backdrop-blur py-1 shadow-md max-h-48 overflow-auto"
        >
          {filteredSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => handleSuggestionClick(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white/8"
            >
              {s}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}


 /* Restart Countdown Component
 *********************/
function RestartCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const restartTime = new Date();
      restartTime.setHours(5, 0, 0, 0); 
      
      if (now > restartTime) {
        restartTime.setDate(restartTime.getDate() + 1);
      }
      
      const difference = restartTime - now;
      
      if (difference > 0) {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        return { hours, minutes, seconds };
      }
      
      return { hours: 0, minutes: 0, seconds: 0 };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, []);

  const formatTime = (time) => time.toString().padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl p-3 sm:p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 backdrop-blur"
    >
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-500/20 grid place-items-center flex-shrink-0">
          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white font-semibold text-xs sm:text-sm truncate">Рестарт игровых серверов</div>
          <div className="text-orange-300 text-xs truncate">Рестарт в 05:00:00</div>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <div className="text-center">
          <div className="bg-black/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2">
            <div className="text-white font-mono font-bold text-sm sm:text-lg">
              {formatTime(timeLeft.hours)}
            </div>
          </div>
          <div className="text-orange-300 text-xs mt-0.5 sm:mt-1">часов</div>
        </div>
        
        <div className="text-orange-400 text-sm sm:text-lg font-bold">:</div>
        
        <div className="text-center">
          <div className="bg-black/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2">
            <div className="text-white font-mono font-bold text-sm sm:text-lg">
              {formatTime(timeLeft.minutes)}
            </div>
          </div>
          <div className="text-orange-300 text-xs mt-0.5 sm:mt-1">минут</div>
        </div>
        
        <div className="text-orange-400 text-sm sm:text-lg font-bold">:</div>
        
        <div className="text-center">
          <div className="bg-black/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2">
            <div className="text-white font-mono font-bold text-sm sm:text-lg">
              {formatTime(timeLeft.seconds)}
            </div>
          </div>
          <div className="text-orange-300 text-xs mt-0.5 sm:mt-1">секунд</div>
        </div>
      </div>
      
      <div className="text-orange-200 text-xs text-center mt-2 sm:mt-3">
        до рестарта
      </div>
    </motion.div>
  );
}

/*********************
 * Online Chart Component
 *********************/
function OnlineChart({ data, loading, onRefresh, dateInput, onDateChange, serverInput, onServerChange, serverSuggestions }) {
  if (loading) {
    return (
      <motion.div
        className="rounded-2xl p-4 sm:p-5 mt-4 sm:mt-6 bg-white/5 border border-white/10 backdrop-blur"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-white/90 font-semibold text-sm sm:text-base">
            <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" /> Онлайн по времени суток
          </div>
          <div className="w-5 h-5 animate-spin text-white/60">
            <Loader2 className="w-5 h-5" />
          </div>
        </div>
        <div className="w-full h-48 sm:h-64 flex items-center justify-center">
          <div className="text-white/60 text-sm">Загрузка данных...</div>
        </div>
      </motion.div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <motion.div
        className="rounded-2xl p-4 sm:p-5 mt-4 sm:mt-6 bg-white/5 border border-white/10 backdrop-blur"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-white/90 font-semibold text-sm sm:text-base">
            <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" /> Онлайн по времени суток
          </div>
          <RippleButton
            onClick={onRefresh}
            className="rounded-xl bg-white/5 hover:bg-white/10 text-white p-2 border border-white/10 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
          </RippleButton>
        </div>
        <div className="w-full h-48 sm:h-64 flex items-center justify-center">
          <div className="text-white/60 text-sm">Нет данных для отображения</div>
        </div>
      </motion.div>
    );
  }

  const chartTitle = serverInput === "Общий онлайн" 
    ? `Онлайн по времени суток - ${dateInput}`
    : `Онлайн сервера ${serverInput} - ${dateInput}`;

  return (
    <motion.div
      className="rounded-2xl p-4 sm:p-5 mt-4 sm:mt-6 bg-white/5 border border-white/10 backdrop-blur"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-white/90 font-semibold text-sm sm:text-base">
          <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" /> {chartTitle}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="w-full sm:w-40">
            <SearchInput
              initialValue={dateInput}
              onSelection={onDateChange}
              placeholder="Дата"
              icon={<Calendar className="w-4 h-4" />}
              type="date"
              suggestions={[]}
            />
          </div>
          
          <div className="w-full sm:w-40">
            <SearchInput
              initialValue={serverInput}
              onSelection={onServerChange}
              placeholder="Выберите сервер"
              icon={<Server className="w-4 h-4" />}
              suggestions={serverSuggestions}
            />
          </div>
          
          <RippleButton
            onClick={onRefresh}
            className="rounded-xl bg-white/5 hover:bg-white/10 text-white p-2 sm:p-3 border border-white/10 transition-all duration-200 flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </RippleButton>
        </div>
      </div>

      <div className="w-full h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis 
              dataKey="hour" 
              stroke="currentColor" 
              opacity={0.6} 
              fontSize={12}
              tickFormatter={(value) => `${value}:00`}
            />
            <YAxis stroke="currentColor" opacity={0.6} fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                background: "rgba(0,0,0,.8)", 
                border: "1px solid rgba(255,255,255,.15)", 
                borderRadius: 12, 
                color: "white",
                fontSize: '12px'
              }} 
              formatter={(value) => [`${value} игроков`, 'Онлайн']}
              labelFormatter={(label) => `Время: ${label}:00`}
            />
            <Line 
              type="monotone" 
              dataKey="online" 
              strokeWidth={3} 
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              stroke="url(#onlineGradient)"
            />
            <defs>
              <linearGradient id="onlineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

/*********************
 * Email Verification Component
 *********************/
function EmailVerificationCard({ email, onResend, onCancel, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto px-4 rounded-3xl p-6 sm:p-8 border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl"
    >
      <motion.div 
        className="flex items-center gap-4 mb-6"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 grid place-items-center">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-white font-black text-xl">Подтверждение email</div>
          <div className="text-white/70 text-sm break-all">
            Отправлено на <span className="font-semibold text-white/90">{email}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="space-y-4 text-center"
      >
        <p className="text-white/80 text-sm leading-relaxed">
          Мы отправили письмо с ссылкой для подтверждения на вашу почту.
          Пожалуйста, перейдите по ссылке в письме чтобы завершить регистрацию.
        </p>
        
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-200 text-xs">
            <strong>Важно:</strong> Без подтверждения email вы не сможете получить полный доступ к системе.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <RippleButton
            disabled={loading}
            onClick={onResend}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-semibold py-3 border border-white/10 hover:shadow-lg transition-all duration-300"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Отправляем…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Отправить ещё раз <Mail className="w-5 h-5" />
              </span>
            )}
          </RippleButton>
          
          <RippleButton
            disabled={loading}
            onClick={onCancel}
            className="rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold py-3 border border-white/10 transition-all duration-300"
          >
            <span className="text-sm">Выйти</span>
          </RippleButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

/*********************
 * AuthCard Component
 *********************/
const AuthCard = React.memo(function AuthCard({
  mode, email, password, setEmail, setPassword, showPwd, setShowPwd,
  handleAuth, handleGoogle, disabled, loading, add, setMode
}) {

  const handleEmailChange = (value) => {
    setEmail(value);
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
  };

  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-200, 200], [10, -10]);
  const rotateY = useTransform(x, [-200, 200], [-10, 10]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4" style={{ perspective: 1000 }}>
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        layout
        className="rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl hover:shadow-3xl transition-shadow duration-500"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <motion.div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 grid place-items-center text-white font-extrabold text-base sm:text-lg shadow-lg"
                animate={{
                    scale: [1, 1.05, 1, 1.05, 1],
                    rotate: [0, 2, -2, 2, 0]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                BR
            </motion.div>
            <div>
              <div className="text-white font-black text-lg sm:text-xl tracking-wide">BR ONLINE</div>
              <div className="text-white/60 text-xs -mt-0.5">Мониторинг игровых серверов</div>
            </div>
          </motion.div>
          <motion.div 
            className="flex gap-1 sm:gap-2 bg-white/5 rounded-xl p-1 border border-white/10 w-full sm:w-auto"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <button 
              type="button"
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                mode === 'login' ? 'bg-white/20 text-white shadow-md scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setMode("login")}
            >
              <LogIn className="w-4 h-4" /> <span className="hidden xs:inline">Вход</span>
            </button>
            <button 
              type="button"
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                mode === 'register' ? 'bg-white/20 text-white shadow-md scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setMode("register")}
            >
              <UserPlus className="w-4 h-4" /> <span className="hidden xs:inline">Регистрация</span>
            </button>
          </motion.div>
        </div>

        <AnimatePresence initial={false}>
          {mode === "login" ? (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAuth("login");
                }}
                className="space-y-4"
              >
                <Field
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@example.com"
                  disabled={disabled}
                />
                <Field
                  icon={<Lock className="w-4 h-4" />}
                  label="Пароль"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  disabled={disabled}
                  rightIcon={
                    <button 
                      type="button" 
                      onClick={() => setShowPwd((s) => !s)} 
                      className="text-white/60 hover:text-white transition-colors duration-200"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <RippleButton
                  type="submit"
                  disabled={disabled}
                  className="w-full mt-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-semibold py-3 shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Входим…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Войти <ChevronRight className="w-5 h-5" />
                    </span>
                  )}
                </RippleButton>

                <div className="relative py-4 text-center text-white/50 text-sm font-medium">
                  <span className="relative z-10 bg-gradient-to-r from-transparent via-black/20 to-transparent px-4">или</span>
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RippleButton
                    disabled={disabled}
                    onClick={() => handleGoogle([])}
                    className="rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold py-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20"
                  >
                    <span className="inline-flex items-center gap-2 justify-center">
                      <UserCircle2 className="w-5 h-5" /> <span className="text-xs sm:text-sm">Google</span>
                    </span>
                  </RippleButton>

                  <RippleButton
                    disabled={disabled}
                    onClick={() => handleGoogle(["https://www.googleapis.com/auth/games"])}
                    className="rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold py-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20"
                  >
                    <span className="inline-flex items-center gap-2 justify-center">
                      <Gamepad2 className="w-5 h-5" /> <span className="text-xs sm:text-sm">Play Games</span>
                    </span>
                  </RippleButton>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="register-form"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAuth("register");
                }}
                className="space-y-4"
              >
                <Field
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@example.com"
                  disabled={disabled}
                />
                <Field
                  icon={<Lock className="w-4 h-4" />}
                  label="Пароль"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="минимум 6 символов"
                  disabled={disabled}
                  rightIcon={
                    <button 
                      type="button" 
                      onClick={() => setShowPwd((s) => !s)} 
                      className="text-white/60 hover:text-white transition-colors duration-200"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <RippleButton
                  type="submit"
                  disabled={disabled}
                  className="w-full mt-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-semibold py-3 shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Создаём…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Зарегистрироваться <ChevronRight className="w-5 h-5" />
                    </span>
                  )}
                </RippleButton>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

/*********************
 * Main App Component
 *********************/

// Custom server order
const SERVER_ORDER = [
  "RED", "GREEN", "BLUE", "YELLOW", "ORANGE", "PURPLE", "LIME", "PINK", 
  "CHERRY", "BLACK", "INDIGO", "WHITE", "MAGENTA", "CRIMSON", "GOLD", "AZURE", 
  "PLATINUM", "AQUA", "GRAY", "ICE", "CHILLI", "CHOCO", "MOSCOW", "SPB", 
  "UFA", "SOCHI", "KAZAN", "SAMARA", "ROSTOV", "ANAPA", "EKB", "KRASNODAR", 
  "ARZAMAS", "NOVOSIB", "GROZNY", "SARATOV", "OMSK", "IRKUTSK", "VOLGOGRAD", 
  "VORONEZH", "BELGOROD", "MAKHACHKALA", "VLADIKAVKAZ", "VLADIVOSTOK", 
  "KALININGRAD", "CHELYABINSK", "KRASNOYARSK", "CHEBOKSARY", "KHABAROVSK", 
  "PERM", "TULA", "RYAZAN", "MURMANSK", "PENZA", "KURSK", "ARKHANGELSK", 
  "ORENBURG", "KIROV", "KEMEROVO", "TYUMEN", "TOLYATTI", "IVANOVO", 
  "STAVROPOL", "SMOLENSK", "PSKOV", "BRYANSK", "OREL", "YAROSLAVL", 
  "BARNAUL", "LIPETSK", "ULYANOVSK", "YAKUTSK", "TAMBOV", "BRATSK", 
  "ASTRAKHAN", "CHITA", "KOSTROMA", "VLADIMIR", "KALUGA", "NOVGOROD", 
  "TAGANROG", "VOLOGDA", "TVER", "TOMSK", "IZHEVSK", "SURGUT", "PODOLSK", 
  "MAGADAN", "CHEREPOVETS"
];

export default function App() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [onlineData, setOnlineData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedServer, setSelectedServer] = useState("Общий онлайн");
  const [availableServers, setAvailableServers] = useState([]);
  const [serversData, setServersData] = useState({});
  const [totalOnline, setTotalOnline] = useState(0);
  const { toasts, add } = useToasts();

  useEffect(() => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    setSelectedDate(dateString);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const actionCode = urlParams.get('oobCode');
    
    if (actionCode) {
      handleEmailVerificationCallback(actionCode);
    }
  }, []);

  const handleEmailVerificationCallback = async (actionCode) => {
    try {
      setLoading(true);
      await verifyEmailActionCode(actionCode);
      add("Email успешно подтверждён!", "success");
      
      window.history.replaceState({}, document.title, window.location.pathname);
      const auth = getAuthInstance();
      await auth.currentUser?.reload();
      setUser(auth.currentUser);
      setNeedsEmailVerification(false);
    } catch (error) {
      console.error('Email verification failed:', error);
      add("Ошибка подтверждения email", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = getAuthInstance();
    const unsub = onAuthStateChanged(auth, async (u) => {
      console.log('Auth state changed:', u);
      setUser(u);
      setCheckingAuth(false);
      
      if (u) {
        try {
          const userRef = doc(getDbInstance(), "users", u.uid);
          const snap = await getDoc(userRef);
          
          if (!snap.exists()) {
            await setDoc(userRef, {
              email: u.email,
              createdAt: serverTimestamp(),
              providers: u.providerData?.map((p) => p.providerId) || [],
              emailVerified: u.emailVerified,
            });
          }

          if (!u.emailVerified && u.providerData?.some(p => p.providerId === 'password')) {
            console.log('User needs email verification');
            setNeedsEmailVerification(true);
          } else {
            console.log('User email verified or using social auth');
            setNeedsEmailVerification(false);
          }
        } catch (error) {
          console.error("Error setting up user document:", error);
        }
      } else {
        console.log('User signed out');
        setNeedsEmailVerification(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (user && !needsEmailVerification) {
      loadOnlineData();
    }
  }, [user, needsEmailVerification, selectedDate, selectedServer]);

  const loadOnlineData = async () => {
    try {
      setChartLoading(true);
      const db = getDbInstance();
      
      console.log('Loading data for date:', selectedDate);
      
      const onlineRef = collection(db, 'online');
      const q = query(
        onlineRef,
        where('date', '==', selectedDate)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No data found for selected date');
        setOnlineData(generateEmptyData());
        setAvailableServers([]);
        setServersData({});
        setTotalOnline(0);
        return;
      }
      
      const documents = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp || data.last_update
        });
      });
      console.log('Found documents:', documents.length);
      
      const latestDoc = documents.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      setTotalOnline(latestDoc.total_online || 0);
      
      if (latestDoc.servers) {
        const servers = Object.keys(latestDoc.servers).sort();
        setAvailableServers(servers);
        setServersData(latestDoc.servers);
      } else {
        setAvailableServers([]);
        setServersData({});
      }
      
      const filteredData = filterDocumentsByHour(documents);
      const chartData = generateChartData(filteredData);
      setOnlineData(chartData);
      
    } catch (error) {
      console.error('Error loading online data:', error);
      add("Ошибка загрузки данных онлайн", "error");
      setOnlineData(generateEmptyData());
      setAvailableServers([]);
      setServersData({});
      setTotalOnline(0);
    } finally {
      setChartLoading(false);
    }
  };

  const filterDocumentsByHour = (documents) => {
    const hourlyData = {};
    documents.forEach(doc => {
      if (!doc.timestamp) return;
      
      const timestamp = new Date(doc.timestamp);
      const hour = timestamp.getHours();
      
      if (!hourlyData[hour] || new Date(doc.timestamp) > new Date(hourlyData[hour].timestamp)) {
        hourlyData[hour] = doc;
      }
    });
    return Object.values(hourlyData);
  };

  const generateChartData = (filteredData) => {
    const chartData = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourData = filteredData.find(doc => {
        if (!doc.timestamp) return false;
        const docHour = new Date(doc.timestamp).getHours();
        return docHour === hour;
      });
      let online = 0;
      if (hourData) {
        if (selectedServer === "Общий онлайн") {
          online = hourData.total_online || 0;
        } else {
          online = hourData.servers?.[selectedServer]?.online || 0;
        }
      }
      
      chartData.push({
        hour: hour.toString().padStart(2, '0'),
        online: online,
        timestamp: hourData?.timestamp
      });
    }
    
    return chartData;
  };

  const generateEmptyData = () => {
    const emptyData = [];
    for (let hour = 0; hour < 24; hour++) {
      emptyData.push({
        hour: hour.toString().padStart(2, '0'),
        online: 0,
        timestamp: null
      });
    }
    return emptyData;
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleServerChange = (newServer) => {
    setSelectedServer(newServer);
  };

  const Background = useMemo(
    () => (
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,.25),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,.25),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,.25),transparent_40%)]" />
        <div className="absolute inset-0 opacity-30" style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}>
          <svg className="w-full h-full" preserveAspectRatio="none">
            {Array.from({ length: 30 }).map((_, i) => (
              <line key={"v" + i} x1={(i * 100) / 29 + "%"} y1="0" x2={(i * 100) / 29 + "%"} y2="100%" stroke="white" strokeOpacity="0.06" />
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <line key={"h" + i} x1="0" y1={(i * 100) / 17 + "%"} x2="100%" y2={(i * 100) / 17 + "%"} stroke="white" strokeOpacity="0.06" />
            ))}
          </svg>
        </div>
      </div>
    ),
    []
  );

  const disabled = loading;

  const handleAuth = async (action) => {
    try {
      setLoading(true);
      if (!emailRegex.test(email)) throw new Error("Введите корректный email");
      if (password.length < 6) throw new Error("Минимальная длина пароля — 6 символов");
      const auth = getAuthInstance();

      if (action === "login") {
        const res = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful:', res.user);
        add("Успешный вход!", "success");
        
        if (!res.user.emailVerified && res.user.providerData?.some(p => p.providerId === 'password')) {
          setNeedsEmailVerification(true);
          add("Подтвердите ваш email для полного доступа", "error");
          return;
        }
        
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Register successful:', res.user);
        
        await handleEmailVerification(res.user);
        await setDoc(doc(getDbInstance(), "users", res.user.uid), {
          email: email,
          createdAt: serverTimestamp(),
          providers: ["password"],
          emailVerified: false,
        });
        setNeedsEmailVerification(true);
        add("Письмо с подтверждением отправлено на вашу почту", "success");
      }
    } catch (e) {
      console.error('Auth error:', e);
      add(e.message || "Ошибка авторизации", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (scopes = []) => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      scopes.forEach((s) => provider.addScope(s));
      const auth = getAuthInstance();
      const res = await signInWithPopup(auth, provider);
      console.log('Google auth successful:', res.user);
      
      await setDoc(
        doc(getDbInstance(), "users", res.user.uid), 
        {
          email: res.user.email,
          createdAt: serverTimestamp(),
          providers: res.user.providerData?.map((p) => p.providerId) || [],
          emailVerified: true,
        }, 
        { merge: true }
      );
      
      add("Успешный вход через Google!", "success");
    } catch (e) {
      console.error('Google auth error:', e);
      add(e.message || "Не удалось войти через Google", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      const auth = getAuthInstance();
      if (auth.currentUser) {
        await handleEmailVerification(auth.currentUser);
        add("Письмо с подтверждением отправлено повторно", "success");
      }
    } catch (error) {
      add("Ошибка при отправке письма", "error");
    } finally {
      setLoading(false);
    }
  };

  const Dashboard = () => {
    const [now] = useState(() => new Date());
    const avgLatency = 32 + Math.round(Math.random() * 8);
    
    // Варианты для staggered-анимации
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.07,
        },
      },
    };

    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
        }
      },
    };

    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-3 sm:px-4"
      >
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 grid place-items-center text-white font-extrabold text-xs sm:text-sm"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              BR
            </motion.div>
            <div>
              <div className="text-white font-black text-lg sm:text-xl tracking-wide">BR ONLINE</div>
              <div className="text-white/60 text-xs -mt-0.5">{now.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-white/80 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[150px]">{user?.email}</div>
            <RippleButton
              onClick={async () => {
                await signOut(getAuthInstance());
                setUser(null);
                setNeedsEmailVerification(false);
              }}
              className="rounded-xl bg-white/5 hover:bg-white/10 text-white p-2 border border-white/10 transition-all duration-200"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            </RippleButton>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4"
        >
          <StatCard title="Игроков онлайн" value={totalOnline} sub="текущий онлайн" />
          <StatCard title="Средняя задержка" value={`${avgLatency} ms`} sub="Европа / HEL" />
        </motion.div>

        <motion.div variants={itemVariants}>
            <OnlineChart 
              data={onlineData} 
              loading={chartLoading}
              onRefresh={loadOnlineData}
              dateInput={selectedDate}
              onDateChange={handleDateChange}
              serverInput={selectedServer}
              onServerChange={handleServerChange}
              serverSuggestions={["Общий онлайн", ...availableServers]}
            />
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="mt-3 sm:mt-6 grid lg:grid-cols-2 gap-3 sm:gap-4"
        >
          <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white/5 border border-white/10 backdrop-blur">
            <div className="text-white/90 font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Сервера</div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {Object.entries(serversData)
                  .sort(([serverA], [serverB]) => {
                    const indexA = SERVER_ORDER.indexOf(serverA);
                    const indexB = SERVER_ORDER.indexOf(serverB);
                    if (indexA === -1 && indexB === -1) return serverA.localeCompare(serverB);
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                  })
                  .map(([serverName, serverData]) => (
                  <ServerCard
                    key={serverName}
                    name={serverName}
                    online={serverData.online || 0}
                    maxonline={serverData.maxonline || 1000}
                    x2={serverData.x2 || false}
                  />
                ))}
                {Object.keys(serversData).length === 0 && (
                  <div className="text-center py-6 text-white/60 text-sm col-span-full">
                    Нет данных о серверах
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white/5 border border-white/10 backdrop-blur">
            <div className="text-white/90 font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Последние события</div>
            <div className="space-y-2 sm:space-y-3">
              <RestartCountdown />
              {[
                "EU-2 перезапуск по расписанию",
                "Анти-чит обновлён",
                "Новая карта добавлена на AS-1",
              ].map((t, i) => (
                <motion.div 
                  key={i} 
                  className="rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 border border-white/10 text-white/80 text-xs sm:text-sm break-words"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  {t}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen relative text-white overflow-x-hidden flex items-center justify-center">
        {Background}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(0,0,0,.65),rgba(0,0,0,.75))]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div 
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 grid place-items-center text-white font-extrabold text-lg mx-auto mb-4"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0]}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut"}}
            >
            BR
          </motion.div>
          <div className="text-white/80">Загрузка...</div>
        </motion.div>
      </div>
    );
  }

  const showAuth = !user;
  const showEmailVerification = user && needsEmailVerification;
  const showDashboard = user && !needsEmailVerification;

  console.log('Render state:', {
    user: !!user,
    needsEmailVerification,
    showAuth,
    showEmailVerification,
    showDashboard,
    userEmailVerified: user?.emailVerified
  });

  return (
    <div className="min-h-screen relative text-white overflow-x-hidden">
      <style>{`
        @keyframes ripple { 
          from { 
            transform: scale(0); 
            opacity: .7; 
          } 
          to { 
            transform: scale(3); 
            opacity: 0; 
          } 
        }
      `}</style>
      {Background}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(0,0,0,.65),rgba(0,0,0,.75))]" />

      <div className="relative px-2 py-4 sm:py-6 md:py-10">
        <AnimatePresence>
        {showAuth && (
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mb-4 sm:mb-6 px-2"
          >
            Добро пожаловать в{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-300 bg-clip-text text-transparent">
              BR ONLINE
            </span>
          </motion.h1>
        )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {showAuth && (
              <motion.div key="auth-card">
                <AuthCard 
                  mode={mode} 
                  email={email} 
                  password={password} 
                  setEmail={setEmail} 
                  setPassword={setPassword} 
                  showPwd={showPwd} 
                  setShowPwd={setShowPwd}
                  handleAuth={handleAuth} 
                  handleGoogle={handleGoogle} 
                  disabled={disabled} 
                  loading={loading} 
                  add={add}
                  setMode={setMode}
                />
              </motion.div>
            )}
            {showEmailVerification && (
              <motion.div key="email-verify">
                <EmailVerificationCard 
                  email={user?.email || email}
                  onResend={handleResendVerification}
                  onCancel={async () => {
                    await signOut(getAuthInstance());
                    setNeedsEmailVerification(false);
                    setUser(null);
                  }}
                  loading={loading}
                />
              </motion.div>
            )}
            {showDashboard && (
              <motion.div key="dashboard">
                <Dashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Toasts items={toasts} />
    </div>
  );
}

/*********************
 * DEV helper: run `testFirebase()` from console to validate initialization.
 *********************/
export async function testFirebase() {
  try {
    const a = getAuthInstance();
    const d = getDbInstance();
    console.log('Firebase initialized', { 
      apps: getApps().length, 
      auth: !!a, 
      db: !!d 
    });
    return true;
  } catch (e) {
    console.error('Firebase test failed', e);
    return false;
  }
}