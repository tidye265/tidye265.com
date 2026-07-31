/* src/App.jsx */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import AccountPage from './pages/Account';
import WithdrawPage from './pages/Withdraw';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home / Index Route */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        
        {/* Account Route */}
        <Route path="/account" element={<AccountPage />} />
        
        {/* Withdraw Route */}
        <Route path="/withdraw" element={<WithdrawPage />} />
        
        {/* Additional routes mutha kuwonjezera pano */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
