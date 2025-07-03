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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <SpeakerWaveIcon className="w-5 h-5 text-blue-500"/>
          {meeting.video_path ? 'Media Player' : 'Audio Player'}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={playbackRate}
            onChange={(e) => changePlaybackRate(Number(e.target.value))}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800"
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
      
      {/* Audio/Video Player */}
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
            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
              >
                {isPlaying ? (
                  <PauseSolidIcon className="w-6 h-6" />
                ) : (
                  <PlaySolidIcon className="w-6 h-6 ml-1" />
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative">
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-100"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
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
                <div className="flex items-center gap-2">
                  <SpeakerWaveIcon className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="w-20"
                  />
                </div>
              )}
            </div>
        
        {/* Segment Timeline */}
        <div className="relative">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {meeting.segments.map((segment: MeetingSegment, index: number) => (
              <button
                key={segment.id}
                onClick={() => jumpToSegment(segment)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  currentSegment === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {segment.title}
              </button>
            ))}
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
}
