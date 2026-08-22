'use client';

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/landing/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Shield, Users, Smartphone, ShieldAlert, Cpu, Video, Tv, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { useLanguage } from "@/context/LanguageContext";

export default function DemoPage() {
    const { t } = useLanguage();
  const [videoSource, setVideoSource] = useState<'mp4' | 'youtube' | 'vimeo'>('mp4');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Supabase Storage URLs for demo videos
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const mp4Url = `${supabaseUrl}/storage/v1/object/public/demo-videos/walkthrough.mp4`;
  const bgVideoUrl = `${supabaseUrl}/storage/v1/object/public/demo-videos/cyber-background.mp4`;
  const youtubeUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"; 
  const vimeoUrl = "https://player.vimeo.com/video/76979871?autoplay=1&muted=1";

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => console.log("Play failed: ", err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      playerContainerRef.current.requestFullscreen().catch(err => console.log("Fullscreen error:", err));
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setIsLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(err => console.log(err));
    setIsPlaying(true);
  };

  useEffect(() => {
    setIsPlaying(false);
    setIsLoading(true);
  }, [videoSource]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
        
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold uppercase tracking-wider mb-6 inline-block">
              {'Interactive product demo'}</span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              {'See'}<span className="text-blue-400 text-glow">{'Secure auth'}</span> {'In action'}</h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              {'Choose your preferred plan'}</p>
          </motion.div>

          {/* Video Source Switcher Tabs */}
          <div className="flex justify-center gap-4 mb-8">
            <button 
              onClick={() => setVideoSource('mp4')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                videoSource === 'mp4' 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" /> {'MP4 Video Feed'}</button>
            <button 
              onClick={() => setVideoSource('youtube')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                videoSource === 'youtube' 
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" /> {'YouTube Live'}</button>
            <button 
              onClick={() => setVideoSource('vimeo')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                videoSource === 'vimeo' 
                  ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" /> {'Vimeo high res'}</button>
          </div>

          {/* Interactive Player Frame */}
          <motion.div
            ref={playerContainerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-4xl mx-auto aspect-video rounded-2xl border border-white/10 bg-black overflow-hidden relative group shadow-[0_0_50px_rgba(59,130,246,0.15)] flex items-center justify-center"
          >
            {videoSource === 'mp4' && (
              <>
                <video
                  ref={videoRef}
                  src={mp4Url}
                  className="w-full h-full object-cover"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handlePlayPause}
                />
                
                {/* Custom Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                  {/* Progress Slider */}
                  <div className="flex items-center gap-4 w-full mb-4">
                    <span className="text-xs text-gray-400">
                      {Math.floor(currentTime / 60)}:{( '0' + Math.floor(currentTime % 60) ).slice(-2)}
                    </span>
                    <input 
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 accent-blue-500 h-1 bg-white/20 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-gray-400">
                      {Math.floor(duration / 60)}:{( '0' + Math.floor(duration % 60) ).slice(-2)}
                    </span>
                  </div>

                  {/* Operational Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <button onClick={handlePlayPause} className="text-white hover:text-blue-400 transition-colors">
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>
                      <button onClick={handleRestart} className="text-white hover:text-blue-400 transition-colors">
                        <RotateCcw className="w-5 h-5" />
                      </button>
                      <button onClick={handleMute} className="text-white hover:text-blue-400 transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>

                    <button onClick={handleFullscreen} className="text-white hover:text-blue-400 transition-colors">
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Initial Play Button / Loader */}
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none"
                    >
                      <button onClick={handlePlayPause} className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg pointer-events-auto transform hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 ml-1" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {videoSource === 'youtube' && (
              <iframe 
                src={youtubeUrl}
                title="YouTube Walkthrough"
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            )}

            {videoSource === 'vimeo' && (
              <iframe 
                src={vimeoUrl}
                title="Vimeo Walkthrough"
                className="w-full h-full border-none"
                allow="autoplay; fullscreen; picture-in-picture" 
                allowFullScreen
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Feature Showcase Grid */}
      <div className="py-20 px-6 bg-black/40 border-y border-white/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{'Core Capabilities'}</h2>
            <p className="text-gray-400">{'Everything you need'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Zero-Trust Auth', desc: 'Secure login flow with OTP and background risk analysis.' },
              { icon: Users, title: 'Access Requests', desc: 'Streamlined employee request and admin approval workflows.' },
              { icon: Cpu, title: 'AI Risk Engine', desc: 'Real-time calculation of threat levels based on behavior.' },
              { icon: Smartphone, title: 'Device Fingerprinting', desc: 'Verify and track authorized hardware accessing your network.' },
              { icon: ShieldAlert, title: 'Admin Controls', desc: 'Complete visibility over active sessions, logs, and alerts.' },
              { icon: Play, title: 'Mobile Ready', desc: 'Fully responsive interface designed for any device.' }
            ].map((feat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 border-white/5 hover:border-blue-500/30 transition-all"
              >
                <feat.icon className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-32 px-6 relative">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">{'Ready to secure your organization'}</h2>
          <p className="text-xl text-gray-400 mb-10">
            {'Join leading enterprises'}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/#pricing">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 font-bold px-8">
                {'Start free trial'}</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 hover:bg-white/5 font-bold px-8">
                {'Request custom demo'}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
