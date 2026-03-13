/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Lock, 
  Unlock, 
  RotateCw, 
  SortAsc, 
  Equal, 
  Save, 
  FolderOpen,
  Trophy,
  Settings2,
  ChevronRight
} from 'lucide-react';
import { WheelOption } from './types';

const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
  '#FF9F40', '#FF6384', '#C9CBCF', '#7BC225', '#58508d',
  '#bc5090', '#ff6361', '#ffa600', '#003f5c'
];

export default function App() {
  const [options, setOptions] = useState<WheelOption[]>([
    { id: '1', name: 'Option 1', percentage: 33.33, locked: false, color: COLORS[0] },
    { id: '2', name: 'Option 2', percentage: 33.33, locked: false, color: COLORS[1] },
    { id: '3', name: 'Option 3', percentage: 33.34, locked: false, color: COLORS[2] },
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelOption | null>(null);
  const [rotation, setRotation] = useState(0);
  const controls = useAnimation();
  const wheelRef = useRef<HTMLDivElement>(null);

  // Helper to get a new color
  const getNextColor = (index: number) => COLORS[index % COLORS.length];

  // Smart adjustment logic
  const smartAdjust = (id: string, newVal: number) => {
    setOptions(prev => {
      const targetIdx = prev.findIndex(o => o.id === id);
      if (targetIdx === -1) return prev;

      const others = prev.filter(o => o.id !== id);
      const lockedOthers = others.filter(o => o.locked);
      const unlockedOthers = others.filter(o => !o.locked);

      const lockedTotal = lockedOthers.reduce((sum, o) => sum + o.percentage, 0);
      
      // Cap new value if it exceeds available space
      let adjustedNewVal = Math.max(0, Math.min(newVal, 100 - lockedTotal));
      const available = 100 - adjustedNewVal - lockedTotal;

      if (unlockedOthers.length === 0) {
        // If no one else can take the slack, we can't change the value unless we unlock something
        // But for UX, we'll just allow it if it's the only one or if we force it
        return prev.map(o => o.id === id ? { ...o, percentage: 100 - lockedTotal } : o);
      }

      const currentUnlockedSum = unlockedOthers.reduce((sum, o) => sum + o.percentage, 0);

      return prev.map(o => {
        if (o.id === id) return { ...o, percentage: adjustedNewVal };
        if (o.locked) return o;
        
        let share = 0;
        if (currentUnlockedSum > 0) {
          share = (o.percentage / currentUnlockedSum) * available;
        } else {
          share = available / unlockedOthers.length;
        }
        return { ...o, percentage: share };
      });
    });
  };

  const addOption = () => {
    setOptions(prev => {
      const unlocked = prev.filter(o => !o.locked);
      const lockedTotal = prev.filter(o => o.locked).reduce((sum, o) => sum + o.percentage, 0);
      const newCount = prev.length + 1;
      
      // New slice share based on (100 - lockedTotal) / (unlockedCount + 1)
      const newShare = (100 - lockedTotal) / (unlocked.length + 1);
      const remainingForUnlocked = (100 - lockedTotal) - newShare;
      const currentUnlockedSum = unlocked.reduce((sum, o) => sum + o.percentage, 0);

      const newOption: WheelOption = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Option ${newCount}`,
        percentage: newShare,
        locked: false,
        color: getNextColor(prev.length)
      };

      const updatedExisting = prev.map(o => {
        if (o.locked) return o;
        let share = 0;
        if (currentUnlockedSum > 0) {
          share = (o.percentage / currentUnlockedSum) * remainingForUnlocked;
        } else {
          share = remainingForUnlocked / unlocked.length;
        }
        return { ...o, percentage: share };
      });

      return [...updatedExisting, newOption];
    });
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    
    setOptions(prev => {
      const target = prev.find(o => o.id === id);
      if (!target) return prev;

      const filtered = prev.filter(o => o.id !== id);
      const unlocked = filtered.filter(o => !o.locked);
      
      if (unlocked.length > 0) {
        const totalToDistribute = target.percentage;
        const currentUnlockedSum = unlocked.reduce((sum, o) => sum + o.percentage, 0);
        
        return filtered.map(o => {
          if (o.locked) return o;
          let extra = 0;
          if (currentUnlockedSum > 0) {
            extra = (o.percentage / currentUnlockedSum) * totalToDistribute;
          } else {
            extra = totalToDistribute / unlocked.length;
          }
          return { ...o, percentage: o.percentage + extra };
        });
      } else {
        // If all others are locked, unlock the first one and give it the percentage
        const first = { ...filtered[0], locked: false, percentage: filtered[0].percentage + target.percentage };
        return [first, ...filtered.slice(1)];
      }
    });
  };

  const equalize = (forceAll = false) => {
    setOptions(prev => {
      if (forceAll) {
        const avg = 100 / prev.length;
        return prev.map(o => ({ ...o, percentage: avg, locked: false }));
      } else {
        const unlocked = prev.filter(o => !o.locked);
        if (unlocked.length === 0) return prev;
        
        const lockedTotal = prev.filter(o => o.locked).reduce((sum, o) => sum + o.percentage, 0);
        const available = 100 - lockedTotal;
        const avg = available / unlocked.length;
        
        return prev.map(o => o.locked ? o : { ...o, percentage: avg });
      }
    });
  };

  const sortOptions = () => {
    setOptions(prev => [...prev].sort((a, b) => b.percentage - a.percentage));
  };

  const toggleLock = (id: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, locked: !o.locked } : o));
  };

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const saveConfig = () => {
    try {
      localStorage.setItem('spin_wheel_config', JSON.stringify(options));
      setNotification({ message: 'Configuration saved successfully!', type: 'success' });
    } catch (e) {
      setNotification({ message: 'Failed to save configuration.', type: 'error' });
    }
  };

  const loadConfig = () => {
    try {
      const saved = localStorage.getItem('spin_wheel_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setOptions(parsed);
          setNotification({ message: 'Configuration loaded successfully!', type: 'success' });
        }
      } else {
        setNotification({ message: 'No saved configuration found.', type: 'error' });
      }
    } catch (e) {
      setNotification({ message: 'Failed to load configuration.', type: 'error' });
    }
  };

  const spin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    const extraSpins = 5 + Math.random() * 5;
    const randomStop = Math.random() * 360;
    const totalRotation = rotation + (extraSpins * 360) + randomStop;
    
    setRotation(totalRotation);

    await controls.start({
      rotate: totalRotation,
      transition: { duration: 5, ease: [0.15, 0, 0.15, 1] }
    });

    // Determine winner
    // The arrow is at the top (90 degrees in SVG pie logic usually, but let's calculate based on 0 being top)
    // In our SVG, 0 degrees is top.
    const normalizedRotation = (totalRotation % 360);
    // The wheel rotates clockwise. The pointer is at 0 degrees (top).
    // A slice at angle A (0 to 360) will be at the pointer if rotation R satisfies (A + R) % 360 = 0
    // So A = (360 - R) % 360
    const winningAngle = (360 - normalizedRotation) % 360;
    
    let currentAngle = 0;
    for (const option of options) {
      const sliceAngle = (option.percentage / 100) * 360;
      if (winningAngle >= currentAngle && winningAngle < currentAngle + sliceAngle) {
        setWinner(option);
        break;
      }
      currentAngle += sliceAngle;
    }

    setIsSpinning(false);
  };

  // Generate SVG paths for the wheel
  const wheelPaths = useMemo(() => {
    let currentAngle = 0;
    return options.map((option) => {
      const sliceAngle = (option.percentage / 100) * 360;
      const x1 = Math.cos((currentAngle - 90) * (Math.PI / 180)) * 100;
      const y1 = Math.sin((currentAngle - 90) * (Math.PI / 180)) * 100;
      const x2 = Math.cos((currentAngle + sliceAngle - 90) * (Math.PI / 180)) * 100;
      const y2 = Math.sin((currentAngle + sliceAngle - 90) * (Math.PI / 180)) * 100;
      
      const largeArcFlag = sliceAngle > 180 ? 1 : 0;
      const pathData = `M 0 0 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      const midAngle = currentAngle + sliceAngle / 2;
      const labelX = Math.cos((midAngle - 90) * (Math.PI / 180)) * 70;
      const labelY = Math.sin((midAngle - 90) * (Math.PI / 180)) * 70;

      const result = {
        path: pathData,
        color: option.color,
        label: option.name,
        labelX,
        labelY,
        angle: midAngle,
        percentage: option.percentage
      };
      
      currentAngle += sliceAngle;
      return result;
    });
  }, [options]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              SmartSpin
            </h1>
            <p className="text-gray-500 font-medium flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Proportional Probability Wheel
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => equalize(false)}
              onContextMenu={(e) => { e.preventDefault(); equalize(true); }}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
              title="Left click: Equalize unlocked | Right click: Equalize all"
            >
              <Equal className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-semibold">Equalize</span>
            </button>
            <button 
              onClick={sortOptions}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
            >
              <SortAsc className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-sm font-semibold">Sort</span>
            </button>
          </div>
        </header>

        <main className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Wheel Visualization - Now comes first on mobile */}
          <section className="order-1 lg:order-2 lg:col-span-7 w-full flex flex-col items-center justify-center space-y-8 lg:space-y-12">
            <div className="relative w-full max-w-[300px] sm:max-w-[400px] lg:max-w-[500px] aspect-square">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
                <div className="w-6 h-8 sm:w-8 sm:h-10 bg-red-500 clip-path-triangle shadow-lg" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
              </div>

              {/* Wheel */}
              <motion.div 
                animate={controls}
                className="w-full h-full rounded-full shadow-2xl shadow-indigo-500/20 border-4 sm:border-8 border-white bg-white overflow-hidden relative"
              >
                <svg viewBox="-105 -105 210 210" className="w-full h-full">
                  {wheelPaths.map((slice, i) => (
                    <g key={i}>
                      <path 
                        d={slice.path} 
                        fill={slice.color} 
                        className="transition-colors duration-300"
                        stroke="white"
                        strokeWidth="1"
                      />
                      <g transform={`rotate(${slice.angle - 90})`}>
                        <text
                          x="65"
                          y="0"
                          fill="white"
                          fontSize="9"
                          fontWeight="900"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform="rotate(90, 65, 0)"
                          className="pointer-events-none drop-shadow-xl select-none"
                          style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
                        >
                          {slice.percentage > 2 ? (slice.label.length > 12 ? slice.label.substring(0, 10) + '...' : slice.label) : ''}
                        </text>
                      </g>
                    </g>
                  ))}
                  <circle cx="0" cy="0" r="10" fill="white" className="shadow-inner" />
                </svg>
              </motion.div>

              {/* Center Button */}
              <button 
                onClick={spin}
                disabled={isSpinning}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-all active:scale-90 z-30 ${isSpinning ? 'bg-gray-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <span className="text-white font-black text-lg sm:text-xl tracking-widest">
                  {isSpinning ? <RotateCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /> : 'SPIN'}
                </span>
              </button>
            </div>

            {/* Winner Display */}
            <AnimatePresence>
              {winner && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-white px-8 py-6 sm:px-12 sm:py-8 rounded-[30px] sm:rounded-[40px] shadow-2xl shadow-indigo-500/20 border border-indigo-100 flex flex-col items-center gap-3 sm:gap-4 text-center"
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">We have a winner!</p>
                    <h3 className="text-2xl sm:text-4xl font-black text-gray-900">{winner.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <span>Probability: {Math.round(winner.percentage * 100) / 100}%</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Options List - Now comes second on mobile */}
          <section className="order-2 lg:order-1 lg:col-span-5 w-full space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 overflow-hidden">
              <div className="p-6 border-bottom border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  Options
                  <span className="text-xs font-normal text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                    {options.length} total
                  </span>
                </h2>
                <button 
                  onClick={addOption}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 active:scale-90"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[400px] lg:max-h-[500px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {options.map((option, idx) => (
                    <motion.div 
                      key={option.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all"
                    >
                      <button 
                        onClick={() => removeOption(option.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div 
                        className="w-3 h-3 rounded-full shrink-0 shadow-inner" 
                        style={{ backgroundColor: option.color }} 
                      />

                      <input 
                        type="text"
                        value={option.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOptions(prev => prev.map(o => o.id === option.id ? { ...o, name: val } : o));
                        }}
                        className="flex-1 bg-transparent border-none focus:ring-0 font-medium text-sm placeholder:text-gray-300 min-w-0"
                        placeholder="Option name..."
                      />

                      <div className="flex items-center gap-1 sm:gap-2 bg-white px-2 sm:px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <input 
                          type="number"
                          value={Math.round(option.percentage * 100) / 100}
                          onChange={(e) => smartAdjust(option.id, parseFloat(e.target.value) || 0)}
                          className="w-12 sm:w-16 bg-transparent border-none focus:ring-0 text-right font-bold text-sm"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400">%</span>
                      </div>

                      <button 
                        onClick={() => toggleLock(option.id)}
                        className={`p-2 rounded-xl transition-all ${option.locked ? 'bg-indigo-100 text-indigo-600' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                      >
                        {option.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={saveConfig}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 rounded-2xl text-gray-500 font-semibold hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
              >
                <Save className="w-5 h-5" />
                Save Config
              </button>
              <button 
                onClick={loadConfig}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 rounded-2xl text-gray-500 font-semibold hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
              >
                <FolderOpen className="w-5 h-5" />
                Load Config
              </button>
            </div>
          </section>
        </main>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 font-bold text-sm flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}} />
    </div>
  );
}
