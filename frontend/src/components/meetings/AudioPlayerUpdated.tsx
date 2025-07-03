import React, { useState, useEffect } from 'react';
import { 
  SpeakerWaveIcon, 
  PlayIcon as PlaySolidIcon, 
  PauseIcon as PauseSolidIcon,
  ChevronUpIcon,
  ChevronDownIcon
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
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      // Auto-collapse when scrolling down past 100px
      if (currentScrollY > 100 && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${
      isExpanded 
        ? 'w-full max-w-4xl px-4' 
        : 'w-80'
    }`}>
      <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 ${
        isExpanded ? 'p-6' : 'p-3'
      }`}>
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isExpanded ? 'w-10 h-10' : 'w-8 h-8'
            }`}>
              <SpeakerWaveIcon className={`text-white transition-all duration-300 ${
                isExpanded ? 'w-5 h-5' : 'w-4 h-4'
              }`} />
            </div>
            {isExpanded && (
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {meeting.video_path ? 'Media Player' : 'Audio Player'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentSegment !== null && meeting.segments[currentSegment] 
                    ? meeting.segments[currentSegment].title 
                    : 'No segment selected'
                  }
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isExpanded && (
              <select
                value={playbackRate}
                onChange={(e) => changePlaybackRate(Number(e.target.value))}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>        
        {/* Compact Controls Row for collapsed state */}
        {!isExpanded && (
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all duration-200"
            >
              {isPlaying ? (
                <PauseSolidIcon className="w-4 h-4" />
              ) : (
                <PlaySolidIcon className="w-4 h-4 ml-0.5" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-200"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {formatTime(currentTime)}
            </span>
          </div>
        )}

        {/* Full Player for expanded state */}
        {isExpanded && (
          <>
            {/* Audio/Video Elements */}
            <div className="space-y-4">
              {isAudioLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {meeting.video_path ? (
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    ref={audioRef as unknown as React.RefObject<HTMLVideoElement>}
                    src={`/api/meetings/${meetingId}/video`}
                    preload="metadata"
                    className="w-full h-full"
                    controls
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        setCurrentTime(audioRef.current.currentTime);
                        updateCurrentSegment(audioRef.current.currentTime);
                      }
                    }}
                    onDurationChange={() => {
                      if (audioRef.current) {
                        setDuration(audioRef.current.duration);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedData={() => setIsAudioLoading(false)}
                  />
                </div>
              ) : (
                <audio
                  ref={audioRef}
                  src={`/api/meetings/${meetingId}/audio`}
                  preload="metadata"
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      setCurrentTime(audioRef.current.currentTime);
                      updateCurrentSegment(audioRef.current.currentTime);
                    }
                  }}
                  onDurationChange={() => {
                    if (audioRef.current) {
                      setDuration(audioRef.current.duration);
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedData={() => setIsAudioLoading(false)}
                />
              )}
              
              {!isAudioLoading && (
                <div className="space-y-4">
                  {/* Main Controls */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 focus:ring-4 focus:ring-blue-500/20"
                    >
                      {isPlaying ? (
                        <PauseSolidIcon className="w-6 h-6" />
                      ) : (
                        <PlaySolidIcon className="w-6 h-6 ml-0.5" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-mono">{formatTime(currentTime)}</span>
                        <span className="font-mono">{formatTime(duration)}</span>
                      </div>
                      <div className="relative group">
                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-200 relative"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          >
                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={duration}
                          value={currentTime}
                          onChange={(e) => seekTo(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    {!meeting.video_path && (
                      <div className="flex items-center gap-3">
                        <SpeakerWaveIcon className="w-5 h-5 text-slate-400" />
                        <div className="relative group">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={volume}
                            onChange={(e) => changeVolume(Number(e.target.value))}
                            className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${volume * 100}%, rgb(148 163 184) ${volume * 100}%, rgb(148 163 184) 100%)`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Segment Timeline */}
                  <div className="relative">
                    <div className="mb-2">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Segments</h4>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {meeting.segments.map((segment: MeetingSegment, index: number) => (
                        <button
                          key={segment.id}
                          onClick={() => jumpToSegment(segment)}
                          className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 transform hover:scale-105 ${
                            currentSegment === index
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-md'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="line-clamp-1">{segment.title}</span>
                            <span className="text-xs opacity-75">{formatTime(segment.startTime)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Hidden audio/video for collapsed state */}
        {!isExpanded && (
          <div className="hidden">
            {meeting.video_path ? (
              <video
                ref={audioRef as unknown as React.RefObject<HTMLVideoElement>}
                src={`/api/meetings/${meetingId}/video`}
                preload="metadata"
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime);
                    updateCurrentSegment(audioRef.current.currentTime);
                  }
                }}
                onDurationChange={() => {
                  if (audioRef.current) {
                    setDuration(audioRef.current.duration);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedData={() => setIsAudioLoading(false)}
              />
            ) : (
              <audio
                ref={audioRef}
                src={`/api/meetings/${meetingId}/audio`}
                preload="metadata"
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime);
                    updateCurrentSegment(audioRef.current.currentTime);
                  }
                }}
                onDurationChange={() => {
                  if (audioRef.current) {
                    setDuration(audioRef.current.duration);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedData={() => setIsAudioLoading(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
