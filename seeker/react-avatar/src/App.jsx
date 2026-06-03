import React from 'react';
import { InterviewProvider } from './state/InterviewContext';
import { InterviewScreen } from './components/Interviewer/InterviewScreen';

export function App() {
  return (
    <InterviewProvider>
      <main className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <InterviewScreen />
      </main>
    </InterviewProvider>
  );
}
export default App;
