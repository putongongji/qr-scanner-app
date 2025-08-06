import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Home } from './pages/Home';
import { BatchRecognition } from './pages/BatchRecognition';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import './App.css';

function App() {
  const basename = process.env.NODE_ENV === 'production' ? '/qr-scanner-app' : '/';
  
  return (
    <Router basename={basename}>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/batch" element={<BatchRecognition />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        
        {/* Toast 通知组件 */}
        <Toaster 
          position="top-center"
          richColors
          closeButton
          duration={3000}
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '14px'
            }
          }}
        />
      </div>
    </Router>
  );
}

export default App;