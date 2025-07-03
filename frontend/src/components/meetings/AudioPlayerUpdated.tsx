import React, { useState, useEffect } from 'react';
import { 
  SpeakerWaveIcon, 
  PlayIcon as PlaySolidIcon, 
  PauseIcon as PauseSolidIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/solid';

interface MeetingSegment {
  id: string;
  title: string;
  summary: string;
  excerpt?: string;
  text?: string;
  startTime: number;
  endTime: number;
  index: number;
  duration?: number;
}

interface AudioPlayerProps {
  meeting: any;
  meetingId: string;
  isAudioLoading: boolean;
  setIsAudioLoading: (loading: boolean) => void;
  playbackRate: number;
  changePlaybackRate: (rate: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  currentTime: number;
  duration: number;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  isPlaying: boolean;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  updateCurrentSegment: (time: number) => void;
  volume: number;
  changeVolume: (volume: number) => void;
  currentSegment: number | null;
  jumpToSegment: (segment: MeetingSegment) => void;
  formatTime: (time: number) => string;
}

export default function AudioPlayer({
  meeting,
  meetingId,
  isAudioLoading,
  setIsAudioLoading,
  playbackRate,
  changePlaybackRate,
  audioRef,
  currentTime,
  duration,
  setCurrentTime,
  setDuration,
  setIsPlaying,
  isPlaying,
  togglePlayPause,
  seekTo,
  updateCurrentSegment,
  volume,
  changeVolume,
  currentSegment,
  jumpToSegment,
  formatTime
}: AudioPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      // Convert to dynamic island when scrolling down past 150px
      const shouldCollapse = currentScrollY > 150;
      if (shouldCollapse !== isScrolled) {
        setIsScrolled(shouldCollapse);
        if (shouldCollapse) {
          setIsExpanded(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  // Reset expanded state when user scrolls back up
  useEffect(() => {
    if (!isScrolled && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isScrolled, isExpanded]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    seekTo(newTime);
    updateCurrentSegment(newTime);
  };

  return (
    <>
      {/* Main Audio Player in Content */}
      <div className={`transition-all duration-500 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <SpeakerWaveIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {meeting.video_path ? 'Media Player' : 'Audio Player'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentSegment !== null && meeting.segments?.[currentSegment] 
                    ? meeting.segments[currentSegment].title 
                    : meeting.title
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={playbackRate}
                onChange={(e) => changePlaybackRate(Number(e.target.value))}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div 
                className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg pointer-events-none"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayPause}
                disabled={isAudioLoading}
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                {isAudioLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <PauseSolidIcon className="w-5 h-5" />
                ) : (
                  <PlaySolidIcon className="w-5 h-5 ml-0.5" />
                )}
              </button>
              
              <div className="flex items-center gap-2">
                <SpeakerXMarkIcon className="w-4 h-4 text-slate-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <SpeakerWaveIcon className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {currentSegment !== null && meeting.segments?.[currentSegment] 
                ? `Segment ${currentSegment + 1} of ${meeting.segments.length}`
                : 'Ready to play'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Island - Fixed Position */}
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
        isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className={`bg-black/80 backdrop-blur-xl border border-slate-700/50 rounded-full shadow-2xl transition-all duration-300 ${
          isExpanded ? 'px-6 py-4' : 'px-4 py-3'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center transition-all duration-300 ${
              isExpanded ? 'w-8 h-8' : 'w-6 h-6'
            }`}>
              <SpeakerWaveIcon className={`text-white transition-all duration-300 ${
                isExpanded ? 'w-4 h-4' : 'w-3 h-3'
              }`} />
            </div>
            
            {isExpanded && (
              <div className="min-w-0">
                <h3 className="font-medium text-white text-sm truncate max-w-48">
                  {currentSegment !== null && meeting.segments?.[currentSegment] 
                    ? meeting.segments[currentSegment].title 
                    : meeting.title
                  }
                </h3>
                <p className="text-xs text-slate-300 truncate max-w-48">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayPause}
                disabled={isAudioLoading}
                className={`bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all duration-200 ${
                  isExpanded ? 'w-8 h-8' : 'w-6 h-6'
                }`}
              >
                {isAudioLoading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <PauseSolidIcon className={`${isExpanded ? 'w-4 h-4' : 'w-3 h-3'}`} />
                ) : (
                  <PlaySolidIcon className={`${isExpanded ? 'w-4 h-4 ml-0.5' : 'w-3 h-3 ml-0.5'}`} />
                )}
              </button>
              
              {isExpanded && (
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(Number(e.target.value))}
                  className="text-xs border border-slate-600 rounded-lg px-2 py-1 bg-slate-800 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              )}
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="w-3 h-3 text-slate-300" />
                ) : (
                  <ChevronDownIcon className="w-3 h-3 text-slate-300" />
                )}
              </button>
            </div>
          </div>
          
          {/* Compact Progress Bar for Dynamic Island */}
          {isExpanded && (
            <div className="mt-3 px-1">
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg pointer-events-none"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
