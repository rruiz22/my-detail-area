import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VoicePlayerProps {
  audioUrl?: string;
  duration?: number; // in milliseconds
}

export function VoicePlayer({ audioUrl, duration }: VoicePlayerProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setTotalDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (value[0] / 100) * totalDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (!audioUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded border text-muted-foreground">
        <Volume2 className="w-4 h-4" />
        <span className="text-sm">{t('communication.voice_message_unavailable')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded border border-primary/20">
      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlayPause}
        className="h-8 w-8 rounded-full p-0"
      >
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </Button>

      {/* Progress and Time */}
      <div className="flex-1 space-y-1">
        <Progress value={progress} className="h-2 cursor-pointer" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration || (duration || 0) / 1000)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMute}
        className="h-8 w-8 p-0"
      >
        {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      </Button>

      {/* Download Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(audioUrl, '_blank')}
        className="h-8 w-8 p-0"
      >
        <Download className="w-3 h-3" />
      </Button>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        muted={isMuted}
        className="hidden"
      />
    </div>
  );
}