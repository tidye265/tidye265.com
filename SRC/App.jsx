/* src/App.jsx */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AccountPage from './pages/Account';
import WithdrawPage from './pages/Withdraw';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AccountPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/withdraw" element={<WithdrawPage />} />
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
