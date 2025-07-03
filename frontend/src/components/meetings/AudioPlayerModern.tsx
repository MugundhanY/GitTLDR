import React from 'react';
import { 
  SpeakerWaveIcon, 
  PlayIcon as PlaySolidIcon, 
  PauseIcon as PauseSolidIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/solid';
import { 
  AdjustmentsHorizontalIcon,
  SpeakerWaveIcon as SpeakerOutlineIcon
} from '@heroicons/react/24/outline';

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
  return (
    <div className="sticky top-20 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 animate-slideDown">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <SpeakerWaveIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Audio Player</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {currentSegment !== null && meeting.segments[currentSegment] 
                ? meeting.segments[currentSegment].title 
                : 'No segment selected'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="w-4 h-4 text-slate-400" />
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
        </div>
      </div>
      
      {/* Hidden Audio/Video Elements */}
      {meeting.video_path ? (
        <video
          ref={audioRef as unknown as React.RefObject<HTMLVideoElement>}
          src={`/api/meetings/${meetingId}/video`}
          preload="metadata"
          className="hidden"
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
      
      {/* Loading State */}
      {isAudioLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Loading audio...</span>
        </div>
      )}
      
      {/* Controls */}
      {!isAudioLoading && (
        <div className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => seekTo(Math.max(0, currentTime - 15))}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
            >
              <BackwardIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {isPlaying ? (
                <PauseSolidIcon className="w-7 h-7" />
              ) : (
                <PlaySolidIcon className="w-7 h-7 ml-1" />
              )}
            </button>
            
            <button
              onClick={() => seekTo(Math.min(duration, currentTime + 15))}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
            >
              <ForwardIcon className="w-5 h-5" />
            </button>
            
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-mono">{formatTime(currentTime)}</span>
                <span className="font-mono">{formatTime(duration)}</span>
              </div>
              <div className="relative group">
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-100 relative"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
            
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              {volume === 0 ? (
                <SpeakerXMarkIcon className="w-5 h-5 text-slate-400" />
              ) : (
                <SpeakerOutlineIcon className="w-5 h-5 text-slate-400" />
              )}
              <div className="relative group">
                <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-100"
                    style={{ width: `${volume * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          {/* Segment Navigation */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {meeting.segments.map((segment: MeetingSegment, index: number) => (
                <button
                  key={segment.id}
                  onClick={() => jumpToSegment(segment)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 ${
                    currentSegment === index
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={segment.title}
                >
                  <div className="flex items-center gap-2">
                    <span>{index + 1}</span>
                    <span className="max-w-20 truncate">{segment.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
