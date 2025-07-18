import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFilms } from "../hooks/useFilms";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, Minimize2,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { updateUserProgress, getFilmProgress } from "../hooks/useUserProgress";

const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent);

export default function WatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { films, loading: filmsLoading } = useFilms();
  const { activeProfile, user, loading: userLoading } = useUser();

  // HOOK-urile toate la început!
  const film = films.find((f) => String(f.id) === String(id));
  const containerRef = useRef();
  const videoRef = useRef();
  const seekBarRef = useRef();
  const controlsTimeout = useRef();
  const centerTimeout = useRef();
  const saveProgressInterval = useRef();

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [centerAction, setCenterAction] = useState(null);

  const [videoError, setVideoError] = useState(null);

  const filmTitle = film?.title || "No title";
  const iconSize = isMobileDevice() ? 28 : 38;
  const rangeWidthClass = isMobileDevice() ? "w-16" : "w-20";
  const controlPadding = isMobileDevice() ? 6 : 10;

  // Redirect după loading (ca să nu dea jump la login la refresh!)
  useEffect(() => {
    if (!userLoading && (!user || !activeProfile)) {
      navigate("/login");
    }
  }, [user, activeProfile, userLoading, navigate]);

  // FETCH progres și setează la load (!!! per profil activ)
  useEffect(() => {
    async function fetchLastProgress() {
      if (!activeProfile?.id || !film?.id || !videoRef.current) return;
      const lastPosition = await getFilmProgress(activeProfile.id, film.id);
      if (lastPosition && videoRef.current) {
        setTimeout(() => {
          try {
            videoRef.current.currentTime = lastPosition;
          } catch (err) {}
        }, 300);
      }
    }
    fetchLastProgress();
    // eslint-disable-next-line
  }, [activeProfile?.id, film?.id]);

  // Salvează progresul la interval regulat și la PAUZĂ (!!! per profil)
  useEffect(() => {
    if (!activeProfile?.id || !film?.id) return;
    const saveProgress = () => {
      if (videoRef.current) {
        const poz = Math.floor(videoRef.current.currentTime || 0);
        if (poz > 0) updateUserProgress(activeProfile.id, film.id, poz);
      }
    };
    saveProgressInterval.current = setInterval(saveProgress, 8000);
    return () => {
      clearInterval(saveProgressInterval.current);
      saveProgress();
    };
    // eslint-disable-next-line
  }, [activeProfile?.id, film?.id]);

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (isMobileDevice()) requestFullscreen();
      videoRef.current.play();
      setIsPlaying(true);
      setCenterAction("play");
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setCenterAction("pause");
      if (activeProfile?.id && film?.id) {
        const poz = Math.floor(videoRef.current.currentTime || 0);
        if (poz > 0) updateUserProgress(activeProfile.id, film.id, poz);
      }
    }
    clearTimeout(centerTimeout.current);
    centerTimeout.current = setTimeout(() => setCenterAction(null), 500);
  };

  useEffect(() => {
    if (!film || !videoRef.current) return;
    const vid = videoRef.current;
    const update = () => {
      setDuration(vid.duration || 0);
      setCurrentTime(vid.currentTime || 0);
      setProgress(vid.duration ? (vid.currentTime / vid.duration) * 100 : 0);
    };
    vid.addEventListener("timeupdate", update);
    vid.addEventListener("loadedmetadata", update);
    return () => {
      vid.removeEventListener("timeupdate", update);
      vid.removeEventListener("loadedmetadata", update);
    };
  }, [film]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    function show() {
      setShowControls(true);
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => setShowControls(false), 2200);
    }
    window.addEventListener("mousemove", show);
    window.addEventListener("touchstart", show);
    show();
    return () => {
      clearTimeout(controlsTimeout.current);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const fmt = (t) => {
    if (!isFinite(t)) return "00:00";
    const h = Math.floor(t / 3600);
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
    const s = String(Math.floor(t % 60)).padStart(2, "0");
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const requestFullscreen = () => {
    const el = containerRef.current;
    if (el && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  const handleSkip = (sec) => {
    const vid = videoRef.current;
    if (vid.duration) vid.currentTime = Math.min(Math.max(vid.currentTime + sec, 0), vid.duration);
  };

  const toggleMute = (e) => { e.stopPropagation(); setIsMuted((m) => !m); };

  const handleFsButton = (e) => {
    e.stopPropagation();
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  };

  const seek = (e) => {
    const bar = seekBarRef.current;
    const vid = videoRef.current;
    if (!bar || !vid || !duration) return;
    const rect = bar.getBoundingClientRect();
    const x = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    vid.currentTime = Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * duration;
  };
  const startSeek = (e) => { seek(e); window.addEventListener("mousemove", seek); window.addEventListener("mouseup", stopSeek); window.addEventListener("touchmove", seek); window.addEventListener("touchend", stopSeek); };
  const stopSeek = () => { window.removeEventListener("mousemove", seek); window.removeEventListener("mouseup", stopSeek); window.removeEventListener("touchmove", seek); window.removeEventListener("touchend", stopSeek); };

  // DOAR după hook-uri - safe!
  if (filmsLoading || userLoading) return <div className="text-white p-8">Loading...</div>;
  if (!film) return <div className="text-white p-8">Film inexistent</div>;

  const mobilePortrait = isMobileDevice() && !isFullscreen;

  // LINK PUBLIC din Backblaze
  const videoUrl = film?.video_path
    ? `https://s3.us-east-005.backblazeb2.com/CinemAI/${film.video_path}`
    : null;

  // Video pe tot ecranul, cu aspect ratio nativ păstrat, fără padding/margini
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen bg-black select-none"
      onClick={(e) => {
        e.stopPropagation();
        if (isMobileDevice()) {
          setShowControls(true);
          clearTimeout(controlsTimeout.current);
          controlsTimeout.current = setTimeout(() => setShowControls(false), 2200);
        } else {
          handlePlayPause(e);
        }
      }}
    >
      {/* EROARE la acces video */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <span className="text-red-400 font-bold text-xl px-8 py-6 bg-black/60 rounded-xl shadow-lg border border-red-600">
            {videoError}
          </span>
        </div>
      )}

      {/* VIDEO PLAYER cu aspect ratio păstrat */}
      {!videoError && videoUrl && (
        <video
          autoPlay
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={false}
          onError={() => { setVideoError("Nu s-a putut încărca video-ul!"); }}
          style={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            minWidth: "0",
            minHeight: "0",
            background: "#000",
          }}
        />
      )}

      {/* Center animation */}
      <AnimatePresence>
        {centerAction && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {centerAction === 'play' ? (
              <Play size={mobilePortrait ? 100 : 140} className="text-cyan-400" />
            ) : (
              <Pause size={mobilePortrait ? 100 : 140} className="text-cyan-400" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute bottom-0 left-0 w-full z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: controlPadding }}
          >
            {/* Time */}
            <div className="flex justify-end px-5 pb-1">
              <span className="text-white font-mono text-sm">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>

            {/* Progress */}
            <div
              ref={seekBarRef}
              className="mx-auto h-[4px] w-full bg-zinc-200 relative cursor-pointer mb-1"
              onClick={seek}
              onMouseDown={startSeek}
              onTouchStart={startSeek}
            >
              <div
                className="h-[4px] bg-cyan-400 absolute left-0 top-0 rounded-full"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute top-1/2" style={{ left: `calc(${progress}% - 6px)`, transform: 'translateY(-50%)' }}>
                <div className="w-3 h-3 rounded-full bg-white border-2 border-cyan-400" />
              </div>
            </div>

            {/* Buttons row */}
            <div className="flex items-center justify-between px-5 pt-1">
              <div className="flex items-center gap-3">
                <button className="p-1 text-white hover:bg-white/10 rounded-full" onClick={() => handleSkip(-10)}>
                  <RotateCcw size={iconSize - 4} />
                </button>
                <button className="p-1 text-white hover:bg-white/10 rounded-full" onClick={handlePlayPause}>
                  {isPlaying ? <Pause size={iconSize} /> : <Play size={iconSize} />}
                </button>
                <button className="p-1 text-white hover:bg-white/10 rounded-full" onClick={() => handleSkip(10)}>
                  <RotateCw size={iconSize - 4} />
                </button>
                <button className="p-1 text-white hover:bg-white/10 rounded-full" onClick={toggleMute}>
                  {isMuted || volume === 0 ? <VolumeX size={iconSize - 4} /> : <Volume2 size={iconSize - 4} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      videoRef.current.muted = v === 0;
                    }
                    setVolume(v);
                    setIsMuted(v === 0);
                  }}
                  className={`${rangeWidthClass} accent-cyan-400`}
                />
              </div>
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-white text-sm font-semibold">{filmTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-1 text-white hover:bg-white/10 rounded-full" onClick={handleFsButton}>
                  {isFullscreen ? <Minimize2 size={iconSize - 2} /> : <Maximize2 size={iconSize - 2} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
