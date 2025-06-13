import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PDFConverter from './components/PDFConverter';
import ViewComponent from './components/ViewComponent';
import ConvertComponent from './components/ConvertComponent';
import EditComponent from './components/EditComponent';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<PDFConverter />} />
          <Route path="/view" element={<ViewComponent />} />
          <Route path="/convert" element={<ConvertComponent />} />
          <Route path="/validate" element={<EditComponent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App; 