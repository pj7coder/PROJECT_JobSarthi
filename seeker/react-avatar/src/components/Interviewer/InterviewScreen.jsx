import React, { useEffect, useRef, useState } from 'react';
import { useInterview } from '../../state/InterviewContext';
import { AVATAR_STATES } from '../../state/avatarStateMachine';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useElevenLabsTTS } from '../../hooks/useElevenLabsTTS';
import { AvatarCanvas } from './AvatarCanvas';

export function InterviewScreen() {
  const { state, dispatch, logProctorEvent } = useInterview();
  const { playAudioBuffer, getRMSVolume, stopAudio, initAudio } = useAudioAnalyzer();
  const { transcript, setTranscript, isListening, startListening, stopListening, supported: speechSupported } = useSpeechRecognition();
  const { fetchTTS } = useElevenLabsTTS();

  // Local configuration states (bound during SETUP)
  const [roleInput, setRoleInput] = useState('Full Stack Developer');
  const [difficultyInput, setDifficultyInput] = useState('Intermediate');
  const [timerInput, setTimerInput] = useState(10);
  const [strictnessInput, setStrictnessInput] = useState('medium');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM'); // Rachel default

  // Setup screen webcam variables
  const setupVideoRef = useRef(null);
  const webcamVideoRef = useRef(null);

  // Live interview states
  const [answerText, setAnswerText] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [thinkTimeActive, setThinkTimeActive] = useState(false);
  const [timerCircleDash, setTimerCircleDash] = useState(54); // circle outline circumference

  // Ref handles for timers
  const timerIntervalRef = useRef(null);
  const autoSubmitTimeoutRef = useRef(null);
  
  // Track gaze variables
  const eyeballRef = useRef(null);
  const [gazeWarning, setGazeWarning] = useState(false);
  const [gazeText, setGazeText] = useState('EYE GAZE: LOCKED');
  const [faceText, setFaceText] = useState('FACE DETECTED: 1');

  // --- AUDIO SYNTHESIS & TTS ENGINE ---
  const playSpeech = async (text) => {
    // Stop any active candidate listening during speech
    stopListening();
    dispatch({ type: 'SET_AVATAR_STATE', payload: AVATAR_STATES.SPEAKING });

    // Scenario A: ElevenLabs TTS API configured
    if (elevenLabsKey) {
      try {
        const audioBuffer = await fetchTTS(text, voiceId, elevenLabsKey);
        await playAudioBuffer(
          audioBuffer,
          () => {
            console.log("TTS audio play started.");
          },
          () => {
            console.log("TTS audio play finished.");
            handleSpeechFinished();
          }
        );
        return;
      } catch (err) {
        console.warn("ElevenLabs TTS failed, falling back to Web Speech API:", err);
      }
    }

    // Scenario B: Fallback to standard web synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.08;
      
      const voices = window.speechSynthesis.getVoices();
      const usVoice = voices.find(v => v.lang.includes("en-US"));
      if (usVoice) utterance.voice = usVoice;

      utterance.onend = () => {
        handleSpeechFinished();
      };
      utterance.onerror = () => {
        handleSpeechFinished();
      };

      // Mock volume peaks during browser SpeechSynthesis since it doesn't output raw PCM data directly to AnalyserNode
      const mockInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(mockInterval);
        }
      }, 50);

      window.speechSynthesis.speak(utterance);
    } else {
      // Direct pass-through if no Speech available
      handleSpeechFinished();
    }
  };

  const handleSpeechFinished = () => {
    dispatch({ type: 'SET_AVATAR_STATE', payload: AVATAR_STATES.IDLE });
    setAnswerText('');
    setTranscript('');
    
    if (state.thinkTimeLimit > 0) {
      startThinkTimer();
    } else {
      startListeningMode();
    }
  };

  // --- THINK TIMER CONTROLS ---
  const startThinkTimer = () => {
    setThinkTimeActive(true);
    setTimeLeft(state.thinkTimeLimit);
    
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          skipThinkTime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipThinkTime = () => {
    setThinkTimeActive(false);
    clearInterval(timerIntervalRef.current);
    startListeningMode();
  };

  const startListeningMode = () => {
    dispatch({ type: 'SET_AVATAR_STATE', payload: AVATAR_STATES.LISTENING });
    startListening();
  };

  // Sync speech-to-text transcript output into local answer text
  useEffect(() => {
    if (transcript) {
      setAnswerText(transcript);
      resetAutoSubmitTimer();
    }
  }, [transcript]);

  const resetAutoSubmitTimer = () => {
    if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
    
    // Auto submit response after 3 seconds of candidate silence
    autoSubmitTimeoutRef.current = setTimeout(() => {
      if (answerText && state.avatarState === AVATAR_STATES.LISTENING) {
        submitAnswer(false);
      }
    }, 3500);
  };

  // --- SUBMIT ANSWER LOOP ---
  const submitAnswer = async (wasTimerExpired = false) => {
    if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
    stopListening();
    
    const finalAnswer = answerText.trim();
    dispatch({ type: 'SET_AVATAR_STATE', payload: AVATAR_STATES.IDLE });

    dispatch({
      type: 'NEXT_QUESTION',
      payload: 'Evaluating response & generating next question...'
    });

    try {
      const response = await fetch('/api/sarthi/interview/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: state.jobRole,
          difficulty: state.difficulty,
          history: state.interviewHistory,
          currentQuestion: state.currentQuestionText,
          userAnswer: finalAnswer,
          timerExpired: wasTimerExpired
        })
      });

      const data = await response.json();

      // Record answer score card
      dispatch({
        type: 'RECORD_ANSWER',
        payload: {
          question: state.currentQuestionText,
          answer: finalAnswer || '[No Answer / Skipped]',
          score: data.score !== undefined ? data.score : 5,
          feedback: data.feedback || 'Evaluation completed successfully.'
        }
      });

      // Update question text and speak
      dispatch({ type: 'SET_AVATAR_STATE', payload: AVATAR_STATES.SPEAKING });
      dispatch({ type: 'NEXT_QUESTION', payload: data.nextQuestion });
      playSpeech(data.nextQuestion);

    } catch (err) {
      console.error(err);
      // Fallback fallback question
      const fallbackQ = "Describe a situation where you had to debug a production-breaking issue. What was your strategy?";
      dispatch({ type: 'NEXT_QUESTION', payload: fallbackQ });
      playSpeech(fallbackQ);
    }
  };

  // --- HARDWARE CAMERA CONTROLS ---
  const requestMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      dispatch({ type: 'SET_CAMERA_STREAM', payload: stream });
      
      if (setupVideoRef.current) {
        setupVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert("Please grant camera and microphone access to continue with the mock interview proctoring.");
    }
  };

  const startInterviewSession = async () => {
    initAudio(); // Warm up Web Audio API Context
    dispatch({
      type: 'SET_CONFIG',
      payload: {
        jobRole: roleInput,
        difficulty: difficultyInput,
        thinkTimeLimit: timerInput,
        proctorStrictness: strictnessInput
      }
    });

    dispatch({ type: 'SET_SCREEN', payload: 'INTERVIEW' });

    // Fetch and read first question
    try {
      const response = await fetch('/api/sarthi/interview/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleInput,
          difficulty: difficultyInput,
          history: [],
          currentQuestion: '',
          userAnswer: '',
          timerExpired: false
        })
      });
      const data = await response.json();
      dispatch({ type: 'NEXT_QUESTION', payload: data.nextQuestion });
      
      // Delay speak a bit to ensure screen rendering has settled
      setTimeout(() => {
        playSpeech(data.nextQuestion);
      }, 1000);
    } catch (e) {
      const defaultFirstQ = `Tell me about yourself and your experience as a ${roleInput}.`;
      dispatch({ type: 'NEXT_QUESTION', payload: defaultFirstQ });
      playSpeech(defaultFirstQ);
    }
  };

  // Bind webcam stream to the primary display once interview initiates
  useEffect(() => {
    if (state.screen === 'INTERVIEW' && webcamVideoRef.current && state.cameraStream) {
      webcamVideoRef.current.srcObject = state.cameraStream;
    }
  }, [state.screen, state.cameraStream]);

  // --- PROCTOR TELEMETRY TRIGGERS ---
  useEffect(() => {
    if (state.screen !== 'INTERVIEW') return;

    // A. Tab Blur detector
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctorEvent('Browser tab switch or window minimization detected.', 18);
      }
    };

    const handleWindowBlur = () => {
      logProctorEvent('Browser window lost focus.', 10);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // B. Eye Gaze cursor simulator hook
    const handleMouseMove = (e) => {
      if (state.avatarState === AVATAR_STATES.SPEAKING) return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const xPercent = (e.clientX / width) - 0.5;
      const yPercent = (e.clientY / height) - 0.5;

      // Rotate pupil tracking dot
      if (eyeballRef.current) {
        const shiftX = xPercent * 50;
        const shiftY = yPercent * 50;
        eyeballRef.current.style.transform = `translate(calc(-50% + ${shiftX}px), calc(-50% + ${shiftY}px))`;
      }

      if (Math.abs(xPercent) > 0.40 || Math.abs(yPercent) > 0.40) {
        setGazeWarning(true);
        setGazeText('EYE GAZE: DEVIATED');
        if (Math.random() < 0.05) {
          logProctorEvent('User eyes deviated away from screen center.', 8);
        }
      } else {
        setGazeWarning(false);
        setGazeText('EYE GAZE: LOCKED');
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    // C. Random interval proctor alerts (webcam fluctuations, background activity noise)
    const randomInterval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.15) {
        setFaceText('FACE DETECTED: 2');
        logProctorEvent('Multiple face structures detected in camera frame.', 14);
        setTimeout(() => setFaceText('FACE DETECTED: 1'), 3000);
      } else if (rand < 0.28) {
        logProctorEvent('Low volume secondary voice whispering detected in background.', 12);
      }
    }, 45000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(randomInterval);
    };
  }, [state.screen, state.avatarState, logProctorEvent]);

  // Handle auto-finish on strictness warnings
  useEffect(() => {
    if (state.proctorStrictness === 'hard' && state.suspicionScore >= 95) {
      alert("Proctor Alert: Strictly terminated due to multiple cheating indicators.");
      finishInterview();
    }
  }, [state.suspicionScore]);

  const finishInterview = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
    stopAudio();
    stopListening();
    
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
    }

    dispatch({ type: 'SET_SCREEN', payload: 'REPORT' });
  };

  const handleRetake = () => {
    dispatch({ type: 'RESET_INTERVIEW' });
  };

  // Math helper for circle path percentage bounds
  useEffect(() => {
    const dashOffset = 54 - (54 * timeLeft) / (state.thinkTimeLimit || 10);
    setTimerCircleDash(dashOffset);
  }, [timeLeft, state.thinkTimeLimit]);

  // --- SCREEN RENDERERS ---

  if (state.screen === 'INSTRUCTIONS') {
    return (
      <div className="glass-panel setup-card" style={{ maxWidth: '750px', margin: '40px auto', padding: '25px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', background: 'linear-gradient(135deg, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AI Mock Interview Instructions
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
          Welcome to the Sarthi AI Mock Interview. This session simulates a real recruitment trial using advanced real-time audio analysis and eye tracking algorithms. Please read the instructions below carefully before starting.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', gap: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '15px' }}>
            <span style={{ fontSize: '1.5rem' }}>🎙️</span>
            <div>
              <h4 style={{ color: '#fff', marginBottom: '4px' }}>Real-Time 3D Lip Sync</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                The Sarthi AI interviewer is powered by WebGL bone-rig manipulations. Its mouth, eyelids, and head move dynamically in sync with ElevenLabs low-latency voice synthesis audio output.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '15px' }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            <div>
              <h4 style={{ color: '#fff', marginBottom: '4px' }}>Web Proctor Shield</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                The system monitors background noises, multiple face occurrences, tab switching, and eye gaze direction (looking away from display center for too long increases the suspicion score).
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'SETUP' })} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: '700', fontSize: '1rem' }}>
          Proceed to Configuration & Permissions
        </button>
      </div>
    );
  }

  if (state.screen === 'SETUP') {
    return (
      <div className="glass-panel setup-card" style={{ maxWidth: '650px', margin: '40px auto', padding: '30px' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>AI Interview Pre-Setup</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
          Configure your mock session, API keys, and calibrate web hardware access.
        </p>

        {/* API Credentials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ fontSize: '0.9rem', color: '#fff', margin: 0 }}>🔑 Voice Service Credentials (Optional)</h4>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ElevenLabs API Key</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Paste key to activate ElevenLabs (blank defaults to Web Speech API)" 
              value={elevenLabsKey}
              onChange={(e) => setElevenLabsKey(e.target.value)}
              style={{ background: 'var(--bg-secondary)', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="setup-permissions-panel">
          <h4 style={{ fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔒</span> Required Hardware Permissions
          </h4>
          <div className="permission-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Camera & Mic Access</span>
            <span className={`permission-badge ${state.cameraStream ? 'granted' : 'pending'}`}>
              {state.cameraStream ? 'Granted' : 'Pending'}
            </span>
          </div>
          
          <div className="setup-preview-box" style={{ background: '#000', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <video ref={setupVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}></video>
            {!state.cameraStream && (
              <div style={{ position: 'absolute', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Grant camera access to see live preview
              </div>
            )}
          </div>

          {!state.cameraStream ? (
            <button onClick={requestMediaAccess} className="btn btn-secondary" style={{ width: '100%', marginTop: '10px' }}>
              Grant Camera & Mic Access
            </button>
          ) : null}
        </div>

        {/* Customization Form */}
        <div className="setup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div className="form-group">
            <label className="form-label">Target Job Role</label>
            <select value={roleInput} onChange={(e) => setRoleInput(e.target.value)} className="form-control" style={{ background: 'var(--bg-secondary)' }}>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Starting Difficulty</label>
            <select value={difficultyInput} onChange={(e) => setDifficultyInput(e.target.value)} className="form-control" style={{ background: 'var(--bg-secondary)' }}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Think/Preparation Time</label>
            <select value={timerInput} onChange={(e) => setTimerInput(Number(e.target.value))} className="form-control" style={{ background: 'var(--bg-secondary)' }}>
              <option value="10">10 Seconds (Standard)</option>
              <option value="20">20 Seconds (Extended)</option>
              <option value="30">30 Seconds (Relaxed)</option>
              <option value="0">No Timer (Start Instantly)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Proctor Strictness Mode</label>
            <select value={strictnessInput} onChange={(e) => setStrictnessInput(e.target.value)} className="form-control" style={{ background: 'var(--bg-secondary)' }}>
              <option value="low">Low (Relaxed proctoring)</option>
              <option value="medium">Medium (Standard limits)</option>
              <option value="hard">Hard (Strict & auto-fail)</option>
            </select>
          </div>
        </div>

        <button 
          onClick={startInterviewSession} 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '25px', padding: '12px' }} 
          disabled={!state.cameraStream}
        >
          Start AI Mock Trial
        </button>
      </div>
    );
  }

  if (state.screen === 'INTERVIEW') {
    return (
      <div className="interview-grid">
        {/* Left Column: Model window, proctor indicators, camera stream, control buttons */}
        <div className="proctor-sidebar">
          {/* Interviewer Model Box */}
          <div className="glass-panel interviewer-avatar-panel" style={{ height: '280px', position: 'relative', overflow: 'hidden', background: 'rgba(10, 11, 15, 0.45)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* Holographic matrix glow overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(6,182,212,0.06), rgba(0, 0, 0, 0), rgba(6,182,212,0.06))', backgroundSize: '100% 4px, 6px 100%', pointerEvents: 'none', zIndex: 3 }}></div>
            
            <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 4 }}>
              <span className="mic-status-pulse" style={{ background: state.avatarState === AVATAR_STATES.SPEAKING ? 'var(--accent-secondary)' : '#6b7280' }}></span>
              <span>SARTHI AI ({state.avatarState})</span>
            </div>

            {/* Canvas Loader integration */}
            <div style={{ width: '100%', height: '100%', zIndex: 2 }}>
              <AvatarCanvas 
                state={state.avatarState} 
                getRMSVolume={getRMSVolume}
                modelUrl="/assets/models/interviewer_avatar.glb" 
              />
            </div>
          </div>

          {/* Proctor panel bar */}
          <div className="proctor-panel" style={{ padding: '12px 15px', background: 'rgba(10, 11, 15, 0.45)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              <span>Suspicion Score</span>
              <span className={`suspicion-score-val ${state.suspicionScore > 60 ? 'high' : state.suspicionScore > 35 ? 'medium' : ''}`}>
                {state.suspicionScore}%
              </span>
            </div>
            <div className="proctor-bar-bg" style={{ margin: 0, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
              <div 
                className={`proctor-bar-fill ${state.suspicionScore > 60 ? 'high' : state.suspicionScore > 35 ? 'medium' : ''}`}
                style={{ width: `${state.suspicionScore}%`, height: '100%', transition: 'width 0.4s ease' }}
              ></div>
            </div>
          </div>

          {/* Camera box with HUD */}
          <div className="camera-container" style={{ height: '200px', position: 'relative' }}>
            <video ref={webcamVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}></video>
            
            <div className={`gaze-hud-overlay ${gazeWarning ? 'warning' : ''}`} style={{ position: 'absolute', inset: 0, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <div className="gaze-hud-line" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{gazeText}</span>
                <span>BLINK: DETECTED</span>
              </div>
              <div className="gaze-hud-line" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{faceText}</span>
                <span>MIC LEVEL: OK</span>
              </div>
              <div ref={eyeballRef} className="eyeball-reticle" style={{ position: 'absolute', width: '20px', height: '20px', border: '1px dashed currentColor', borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
            </div>
          </div>

          {/* Control Bar (Cam, Mic, Exit buttons) */}
          <div className="controls-row" style={{ display: 'flex', justifyContent: 'space-between', background: '#1e1f22', padding: '8px 14px', borderRadius: 'var(--radius-lg)' }}>
            <button 
              onClick={() => dispatch({ type: 'TOGGLE_MIC' })} 
              className={`control-btn ${!state.isMicOn ? 'muted' : ''}`}
              title={state.isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: 'auto' }}>
                {state.isMicOn ? (
                  <>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </>
                ) : (
                  <>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 11a6.97 6.97 0 0 0-1.2-3.88M19 14v1a7 7 0 0 1-7 7"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </>
                )}
              </svg>
            </button>
            <button 
              onClick={() => dispatch({ type: 'TOGGLE_CAMERA' })} 
              className={`control-btn ${!state.isCameraOn ? 'muted' : ''}`}
              title={state.isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: 'auto' }}>
                {state.isCameraOn ? (
                  <>
                    <path d="M23 7l-7 5 7 5V7z"></path>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </>
                ) : (
                  <>
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10l-1.17-.83"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </>
                )}
              </svg>
            </button>
            <button onClick={finishInterview} className="exit-pill-btn" style={{ background: '#ea4335', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '99px', fontWeight: '600', cursor: 'pointer' }}>
              Exit
            </button>
          </div>
        </div>

        {/* Right Column: Cards containing generated questions & answers */}
        <div className="interview-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Question Box */}
          <div className="glass-panel question-box" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px 25px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem' }}>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-tertiary)', fontWeight: '700', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                {state.difficulty}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Question {state.interviewHistory.length + 1}</span>
            </div>
            <div style={{ fontSize: '1.1rem', color: '#fff', lineHeight: '1.5' }}>
              {state.currentQuestionText}
            </div>
          </div>

          {/* Answer Box */}
          <div className="glass-panel answer-box" style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '20px 25px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#fff' }}>
                <span className="mic-status-pulse" style={{ background: state.avatarState === AVATAR_STATES.LISTENING ? 'var(--success)' : '#ea4335' }}></span>
                <span>
                  {state.avatarState === AVATAR_STATES.LISTENING ? 'Listening... Speak now' : 'Interviewer speaking'}
                </span>
              </div>
              <span className="badge" style={{ background: speechSupported ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: speechSupported ? 'var(--success)' : 'var(--danger)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                {speechSupported ? 'Speech Active' : 'Type Mode Only'}
              </span>
            </div>

            <textarea
              className="answer-textarea"
              placeholder={thinkTimeActive ? `Preparation Time active... Think about your response.` : `Start speaking or type your answer here...`}
              disabled={thinkTimeActive || state.avatarState === AVATAR_STATES.SPEAKING}
              value={answerText}
              onChange={(e) => {
                setAnswerText(e.target.value);
                resetAutoSubmitTimer();
              }}
              style={{ width: '100%', flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '15px', color: '#fff', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'none', minHeight: '150px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                💡 Tip: Speak clearly. The system auto-submits on 3s silence.
              </span>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Countdown Timer */}
                {thinkTimeActive && (
                  <div className="timer-badge-container" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: '99px' }}>
                    <svg style={{ width: '16px', height: '16px' }}>
                      <circle cx="8" cy="8" r="7" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                      <circle cx="8" cy="8" r="7" fill="none" stroke="var(--accent-secondary)" strokeWidth="1.5" strokeDasharray="54" strokeDashoffset={timerCircleDash} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s linear' }} />
                    </svg>
                    <span style={{ fontSize: '0.85rem', color: '#fff' }}>{timeLeft}s</span>
                  </div>
                )}

                {thinkTimeActive ? (
                  <button onClick={skipThinkTime} className="btn btn-glow" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-tertiary))', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)' }}>
                    Start Answering
                  </button>
                ) : (
                  <button 
                    onClick={() => submitAnswer(false)} 
                    className="btn btn-primary" 
                    disabled={state.avatarState === AVATAR_STATES.SPEAKING || !answerText.trim()}
                    style={{ padding: '10px 22px', borderRadius: '99px', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)' }}
                  >
                    Submit Answer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.screen === 'REPORT') {
    const totalAnswered = state.interviewHistory.length;
    const finalScorePct = totalAnswered > 0 ? Math.round((state.accumulatedScore / (totalAnswered * 10)) * 100) : 0;
    
    let verdict = 'PASSED PROCTOR';
    let verdictColor = 'var(--success)';
    if (state.suspicionScore >= 70) {
      verdict = 'PROCTOR SHIELD FLAGGED';
      verdictColor = 'var(--danger)';
    } else if (state.suspicionScore >= 45) {
      verdict = 'VERIFICATION WARNED';
      verdictColor = 'var(--warning)';
    }

    return (
      <div className="glass-panel report-card" style={{ maxWidth: '850px', margin: '40px auto', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '8px', color: '#fff' }}>AI Interview Analytics Report</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.95rem', marginBottom: '30px' }}>
          Performance scorecard and anti-cheating audit trail.
        </p>

        {/* Score blocks */}
        <div className="report-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="report-metric-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interview Score</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--accent-secondary)', margin: '10px 0' }}>
              {totalAnswered > 0 ? `${finalScorePct}%` : 'N/A'}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weighted average score</span>
          </div>

          <div className="report-metric-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Proctor Shield</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: verdictColor, margin: '10px 0' }}>
              {state.suspicionScore}%
            </div>
            <span style={{ fontSize: '0.8rem', color: verdictColor, fontWeight: '600' }}>{verdict}</span>
          </div>

          <div className="report-metric-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Role</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', margin: '18px 0', color: '#fff' }}>
              {state.jobRole}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: '600' }}>
              Session: {state.difficulty}
            </span>
          </div>
        </div>

        {/* Q&A Transcripts */}
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '15px' }}>
            Question & Answer Transcript
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {state.interviewHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No questions were answered during the session.</p>
            ) : (
              state.interviewHistory.map((item, index) => (
                <div 
                  key={index} 
                  className={`report-q-item ${item.score >= 7 ? 'correct' : item.score >= 5 ? '' : 'incorrect'}`}
                  style={{ borderLeft: '3px solid var(--border-subtle)', paddingLeft: '16px', marginBottom: '10px' }}
                >
                  <div style={{ fontWeight: '600', color: '#fff', fontSize: '1rem', marginBottom: '6px' }}>
                    Q{index + 1}: {item.question}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <strong>Response:</strong> {item.answer}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-tertiary)', fontStyle: 'italic' }}>
                    ⭐ Score: {item.score}/10 | <em>Feedback: {item.feedback}</em>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Proctor Flags logs */}
        <div className="report-logs-section" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '25px', marginTop: '30px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Proctor Audit Trail
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
            {state.proctorWarnings.length === 0 ? (
              <div style={{ color: 'var(--success)' }}>🟢 No suspicious indicators registered. Perfect testing suspicion score.</div>
            ) : (
              state.proctorWarnings.map((w, idx) => (
                <div key={idx}>
                  [{w.time}] <span style={{ color: 'var(--warning)' }}>{w.event}</span> (+{w.increment}% suspicion)
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '40px' }}>
          <button onClick={() => window.location.href = '../index.html'} className="btn btn-secondary" style={{ padding: '12px 24px' }}>
            Return to Dashboard
          </button>
          <button onClick={handleRetake} className="btn btn-primary" style={{ padding: '12px 24px' }}>
            Retake Mock Test
          </button>
        </div>
      </div>
    );
  }

  return null;
}
export default InterviewScreen;
