export const AVATAR_STATES = {
  IDLE: 'IDLE',
  SPEAKING: 'SPEAKING',
  LISTENING: 'LISTENING'
};

export const AVATAR_ANIMATIONS = {
  IDLE: 'idle',
  SPEAKING: 'speaking_body',
  LISTENING: 'listening_posture'
};

export function getNextState(currentState, event) {
  switch (currentState) {
    case AVATAR_STATES.IDLE:
      if (event === 'TTS_START') return AVATAR_STATES.SPEAKING;
      if (event === 'USER_SPEAKS') return AVATAR_STATES.LISTENING;
      return currentState;

    case AVATAR_STATES.SPEAKING:
      if (event === 'TTS_END') return AVATAR_STATES.IDLE;
      return currentState;

    case AVATAR_STATES.LISTENING:
      if (event === 'USER_SUBMITS') return AVATAR_STATES.IDLE;
      return currentState;

    default:
      return currentState;
  }
}
