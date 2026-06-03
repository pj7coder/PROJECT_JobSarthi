import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { AVATAR_STATES, getNextState } from './avatarStateMachine';

const InterviewContext = createContext(null);

const initialState = {
  // Navigation / Mode
  screen: 'INSTRUCTIONS', // INSTRUCTIONS | SETUP | INTERVIEW | REPORT
  
  // Configurations
  jobRole: 'Full Stack Developer',
  difficulty: 'Intermediate',
  thinkTimeLimit: 10,
  proctorStrictness: 'medium',
  
  // State Machine variables
  avatarState: AVATAR_STATES.IDLE,
  isPaused: false,
  currentQuestionIndex: 0,
  currentQuestionText: 'Click start to begin the interview.',
  
  // Hardware status
  isCameraOn: true,
  isMicOn: true,
  cameraStream: null,
  
  // Proctor & Telemetry
  suspicionScore: 0,
  proctorWarnings: [],
  faceCount: 1,
  gazeDirection: 'LOCKED',
  micActivity: 'OK',
  blinkDetected: false,
  
  // Data logs
  interviewHistory: [],
  accumulatedScore: 0
};

function interviewReducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };
    case 'SET_CONFIG':
      return { 
        ...state, 
        jobRole: action.payload.jobRole,
        difficulty: action.payload.difficulty,
        thinkTimeLimit: action.payload.thinkTimeLimit,
        proctorStrictness: action.payload.proctorStrictness
      };
    case 'SET_AVATAR_STATE':
      return { ...state, avatarState: action.payload };
    case 'SET_PAUSE':
      return { ...state, isPaused: action.payload };
    case 'SET_CAMERA_STREAM':
      return { ...state, cameraStream: action.payload };
    case 'TOGGLE_CAMERA':
      if (state.cameraStream) {
        state.cameraStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      }
      return { ...state, isCameraOn: !state.isCameraOn };
    case 'TOGGLE_MIC':
      if (state.cameraStream) {
        state.cameraStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      }
      return { ...state, isMicOn: !state.isMicOn };
    case 'NEXT_QUESTION':
      return { 
        ...state, 
        currentQuestionIndex: state.currentQuestionIndex + 1,
        currentQuestionText: action.payload
      };
    case 'RECORD_ANSWER':
      return {
        ...state,
        interviewHistory: [...state.interviewHistory, action.payload],
        accumulatedScore: state.accumulatedScore + action.payload.score
      };
    case 'LOG_PROCTOR_EVENT': {
      const { eventText, suspicionInc } = action.payload;
      
      // Calculate scaled suspicion based on strictness
      let scale = 0.7;
      if (state.proctorStrictness === 'low') scale = 0.4;
      if (state.proctorStrictness === 'hard') scale = 1.2;
      
      const increment = Math.round(suspicionInc * scale);
      const newScore = Math.max(0, Math.min(100, state.suspicionScore + increment));
      
      const timeStr = new Date().toTimeString().split(' ')[0];
      const newWarning = { time: timeStr, event: eventText, increment };
      
      return {
        ...state,
        suspicionScore: newScore,
        proctorWarnings: [...state.proctorWarnings, newWarning]
      };
    }
    case 'UPDATE_TELEMETRY':
      return {
        ...state,
        ...action.payload
      };
    case 'RESET_INTERVIEW':
      return {
        ...initialState,
        screen: 'SETUP'
      };
    default:
      return state;
  }
}

export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  const logProctorEvent = useCallback((eventText, suspicionInc) => {
    dispatch({ type: 'LOG_PROCTOR_EVENT', payload: { eventText, suspicionInc } });
  }, []);

  return (
    <InterviewContext.Provider value={{ state, dispatch, logProctorEvent }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
}
