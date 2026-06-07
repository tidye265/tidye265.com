import React from "react";
import { Routes, Route } from "react-router-dom";

import Header from "./components/header";
import BetsUsers from "./components/bet-users";
import Main from "./components/Main";
import Context from "./context";
import propeller from "./assets/images/propeller.png";

// ❗ IMPORTANT: fix import path
import WebGLStarter from "./components/crash/index"; 

function App() {
  const { unityLoading, currentProgress, rechargeState } =
    React.useContext(Context);

  return (
    <div className="main-container">

      {!unityLoading && (
        <div className="myloading">
          <div className="loading-container">
            <div className="rotation">
              <img alt="propeller" src={propeller} />
            </div>

            <div className="waiting">
              <div
                style={{ width: `${currentProgress * 1.111 + 0.01}%` }}
              />
            </div>

            <p>
              {Number(currentProgress * 1.111 + 0.01).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {rechargeState && (
        <div className="recharge">
          <div className="recharge-body">
            <div className="recharge-body-font">
              Insufficient balance amount
            </div>
            <a href="https://induswin.com/#/pages/recharge/recharge">
              Induswin.com
            </a>
          </div>
        </div>
      )}

      <Header />

      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={
            <div className="game-container">
              <BetsUsers />
              <Main />
            </div>
          }
        />

        {/* AVIATOR GAME */}
        <Route
          path="/casino/aviator"
          element={<WebGLStarter />}
        />

      </Routes>

    </div>
  );
}

export default App;
