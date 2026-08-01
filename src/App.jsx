/* src/App.jsx */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import AccountPage from './pages/Account';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home / Index Route */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        
        {/* Account Route */}
        <Route path="/account" element={<AccountPage />} />
        
        
        {/* Additional routes mutha kuwonjezera pano */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
