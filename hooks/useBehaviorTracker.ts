'use client';

import { useEffect, useRef } from 'react';
import { useTypingBehavior } from './useTypingBehavior';

// Collects typing speed, mouse activity, cadence, and navigation frequency
export function useBehaviorTracker(userId: string | null, sessionId: string) {
  const { handleKeyDown: cadenceKeyDown, handleKeyUp: cadenceKeyUp, averageDwellTime, averageFlightTime } = useTypingBehavior();
  
  const dataRef = useRef({
    keystrokes: 0,
    mouseDistance: 0,
    lastMousePos: { x: 0, y: 0 },
    startTime: Date.now(),
    clicks: 0
  });

  useEffect(() => {
    if (!userId) return;

    const handleKeyDown = (e: any) => {
      dataRef.current.keystrokes += 1;
      cadenceKeyDown(e);
    };

    const handleKeyUp = (e: any) => {
      cadenceKeyUp(e);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { lastMousePos } = dataRef.current;
      
      if (lastMousePos.x !== 0 && lastMousePos.y !== 0) {
        const dist = Math.sqrt(
          Math.pow(clientX - lastMousePos.x, 2) + 
          Math.pow(clientY - lastMousePos.y, 2)
        );
        dataRef.current.mouseDistance += dist;
      }
      
      dataRef.current.lastMousePos = { x: clientX, y: clientY };
    };

    const handleClick = () => {
      dataRef.current.clicks += 1;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    // Send batch telemetry every 10 seconds for continuous auth
    const intervalId = setInterval(() => {
      sendTelemetry();
    }, 10000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      clearInterval(intervalId);
    };
  }, [userId, sessionId, cadenceKeyDown, cadenceKeyUp]);

  const sendTelemetry = async () => {
    if (!userId) return;
    
    const now = Date.now();
    const elapsedMinutes = (now - dataRef.current.startTime) / 60000;
    
    // Calculate WPM (roughly 5 chars per word)
    const wpm = elapsedMinutes > 0 ? (dataRef.current.keystrokes / 5) / elapsedMinutes : 0;

    const telemetry = {
      typing_wpm: wpm,
      typing_variance: 5.0, // Mock variance
      average_dwell_time: averageDwellTime,
      average_flight_time: averageFlightTime,
      mouse_distance: dataRef.current.mouseDistance,
      clicks: dataRef.current.clicks,
      time_anomaly: 0 // Mock normal time
    };

    try {
      const res = await fetch('/api/risk/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          telemetry
        })
      });

      const data = await res.json();
      
      if (data.recommended_action === 'BLOCK' || data.recommended_action === 'REQUIRE_MFA') {
        // Dispatch custom event for UI to react (e.g. show MFA modal)
        window.dispatchEvent(new CustomEvent('AI_RISK_ALERT', { detail: data.recommended_action }));
      } else if (data.recommended_action === 'REQUIRE_APPROVAL') {
        window.dispatchEvent(new CustomEvent('AI_QUORUM_REQUIRED'));
      }
      
    } catch (e) {
      console.error("Failed to send behavior telemetry", e);
    } finally {
      // Reset counters for next batch
      dataRef.current.keystrokes = 0;
      dataRef.current.mouseDistance = 0;
      dataRef.current.clicks = 0;
      dataRef.current.startTime = Date.now();
    }
  };

  return null;
}
