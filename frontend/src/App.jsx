import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import RIASECQuiz from './components/RIASECQuiz';
import MBTIQuiz from './components/MBTIQuiz';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const renderContent = () => {
    switch (currentTab) {
      case 'riasec':
        return <RIASECQuiz />;
      case 'mbti':
        return <MBTIQuiz />;
      case 'dashboard':
      default:
        return (
          <Dashboard 
            onNavigateToMBTI={() => setCurrentTab('mbti')}
            onNavigateToRIASEC={() => setCurrentTab('riasec')}
          />
        );
    }
  };

  return (
    <div className="shell">
      <nav>
        <button onClick={() => setCurrentTab('dashboard')}>Dashboard</button>
        <button onClick={() => setCurrentTab('riasec')}>RIASEC Quiz</button>
        <button onClick={() => setCurrentTab('mbti')}>MBTI Quiz</button>
      </nav>
      {renderContent()}
    </div>
  );
}

export default App;