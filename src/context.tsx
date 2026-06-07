/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { UnityContext } from "react-unity-webgl";
import { useLocation } from "react-router";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { config } from "./config";

export interface BettedUserType {
  name: string;
  betAmount: number;
  cashOut: number;
  cashouted: boolean;
  target: number;
  img: string;
  bot?: boolean;
}

export interface UserType {
  balance: number;
  userType: boolean;
  img: string;
  userName: string;
  f: { auto: boolean; betted: boolean; cashouted: boolean; cashAmount: number; betAmount: number; target: number; };
  s: { auto: boolean; betted: boolean; cashouted: boolean; cashAmount: number; betAmount: number; target: number; };
}

export interface PlayerType {
  auto: boolean;
  betted: boolean;
  cashouted: boolean;
  betAmount: number;
  cashAmount: number;
  target: number;
}

interface GameStatusType {
  currentNum: number;
  currentSecondNum: number;
  GameState: string;
  time: number;
}

interface GameBetLimit {
  maxBet: number;
  minBet: number;
}

declare interface GameHistory {
  _id: number;
  name: string;
  betAmount: number;
  cashoutAt: number;
  cashouted: boolean;
  date: number;
}

interface UserStatusType {
  fbetState: boolean;
  fbetted: boolean;
  sbetState: boolean;
  sbetted: boolean;
}

interface ContextDataType {
  myBets: GameHistory[];
  width: number;
  userInfo: UserType;
  fautoCashoutState: boolean;
  fautoCound: number;
  finState: boolean;
  fdeState: boolean;
  fsingle: boolean;
  fincrease: number;
  fdecrease: number;
  fsingleAmount: number;
  fdefaultBetAmount: number;
  sautoCashoutState: boolean;
  sautoCound: number;
  sincrease: number;
  sdecrease: number;
  ssingleAmount: number;
  sinState: boolean;
  sdeState: boolean;
  ssingle: boolean;
  sdefaultBetAmount: number;
  myUnityContext: UnityContext;
}

// ✅ Tawonjezera isHighMultiplier mu interface
interface ContextType extends GameBetLimit, UserStatusType, GameStatusType {
  state: ContextDataType;
  unityState: boolean;
  unityLoading: boolean;
  currentProgress: number;
  bettedUsers: BettedUserType[];
  previousHand: BettedUserType[];
  history: number[];
  rechargeState: boolean;
  myUnityContext: UnityContext;
  currentTarget: number;
  isHighMultiplier: boolean; 
  setCurrentTarget(attrs: Partial<number>);
  update(attrs: Partial<ContextDataType>);
  getMyBets();
  updateUserBetState(attrs: Partial<UserStatusType>);
}

const unityContext = new UnityContext({
  loaderUrl: "unity/AirCrash.loader.js",
  dataUrl: "unity/AirCrash.data.unityweb",
  frameworkUrl: "unity/AirCrash.framework.js.unityweb",
  codeUrl: "unity/AirCrash.wasm.unityweb",
});

const init_state = {
  myBets: [],
  width: 1500,
  userInfo: {
    balance: 0,
    userType: false,
    img: "",
    userName: "",
    f: { auto: false, betted: false, cashouted: false, cashAmount: 0, betAmount: 20, target: 2 },
    s: { auto: false, betted: false, cashouted: false, cashAmount: 0, betAmount: 20, target: 2 },
  },
  fautoCashoutState: false,
  fautoCound: 0,
  finState: false,
  fdeState: false,
  fsingle: false,
  fincrease: 0,
  fdecrease: 0,
  fsingleAmount: 0,
  fdefaultBetAmount: 20,
  sautoCashoutState: false,
  sautoCound: 0,
  sincrease: 0,
  sdecrease: 0,
  ssingleAmount: 0,
  sinState: false,
  sdeState: false,
  ssingle: false,
  sdefaultBetAmount: 20,
  myUnityContext: unityContext,
} as ContextDataType;

const Context = React.createContext<ContextType>(null!);

const socket = io("https://moskonx-tidye-shooter-game-server.hf.space", {
  transports: ["websocket", "polling"],
  secure: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export const callCashOut = (at: number, index: "f" | "s") => {
  let data = { type: index, endTarget: at };
  socket.emit("cashOut", data);
};

let newState;
let newBetState;

export const Provider = ({ children }: any) => {
  const token = new URLSearchParams(useLocation().search).get("cert");
  const [state, setState] = React.useState<ContextDataType>(init_state);

  newState = state;
  const [unity, setUnity] = React.useState({ unityState: false, unityLoading: false, currentProgress: 0 });
  
  const [gameState, setGameState] = React.useState<GameStatusType>({
    currentNum: 1.00,
    currentSecondNum: 0,
    GameState: "BET",
    time: 0,
  });

  const [bettedUsers, setBettedUsers] = React.useState<BettedUserType[]>([]);
  const [previousHand, setPreviousHand] = React.useState<BettedUserType[]>([]);
  const [history, setHistory] = React.useState<number[]>([]);
  const [rechargeState, setRechargeState] = React.useState(false);
  const [currentTarget, setCurrentTarget] = React.useState(1);
  const [isHighMultiplier, setIsHighMultiplier] = React.useState(false); // ✅ State yatsopano
  
  const [userBetState, setUserBetState] = React.useState<UserStatusType>({
    fbetState: false, fbetted: false, sbetState: false, sbetted: false,
  });
  
  newBetState = userBetState;

  const update = (attrs: Partial<ContextDataType>) => { setState({ ...state, ...attrs }); };
  const updateUserBetState = (attrs: Partial<UserStatusType>) => { setUserBetState({ ...userBetState, ...attrs }); };

  const [betLimit, setBetLimit] = React.useState<GameBetLimit>({ maxBet: 2000, minBet: 1 });

  React.useEffect(function () {
    unityContext.on("GameController", function (message) {
      if (message === "Ready") {
        setUnity({ currentProgress: 100, unityLoading: true, unityState: true });
      }
    });
    unityContext.on("progress", (progression) => {
      const currentProgress = progression * 100;
      if (progression === 1) {
        setUnity({ currentProgress, unityLoading: true, unityState: true });
      } else {
        setUnity({ currentProgress, unityLoading: false, unityState: false });
      }
    });
    return () => unityContext.removeAllEventListeners();
  }, []);

  React.useEffect(() => {
    socket.on("connect", () => {
      socket.emit("enterRoom", { token });
      console.log("Connected Successfully. Gateway synced.");
    });

    socket.on("gameState", (incomingState: any) => {
        // ✅ Reset color tikabwerela mu BET phase
        if (incomingState.GameState === "BET") setIsHighMultiplier(false);

        setGameState({
            currentNum: incomingState.currentNum,
            currentSecondNum: Math.ceil(incomingState.timeRemaining / 1000),
            GameState: incomingState.GameState,
            time: incomingState.time 
        });
        
        try {
            const unityInstance = (unityContext as any).unityInstance;
            if (unityInstance && unityInstance.SendMessage) {
                unityInstance.SendMessage("GameManager", "RequestToken", JSON.stringify({
                    gameState: incomingState.GameState === "PLAYING" ? 2 : incomingState.GameState === "GAMEEND" ? 5 : 1
                }));
            }
        } catch(e) {
            console.error("Unity Sync Error:", e);
        }
    });

    // ✅ Listen for high multiplier
    socket.on("highMultiplier", () => {
        setIsHighMultiplier(true);
    });

    socket.on("bettedUserInfo", (bettedUsers: BettedUserType[]) => {
      setBettedUsers(bettedUsers);
    });

    socket.on("myBetState", (user: UserType) => {
      const attrs = { ...userBetState };
      attrs.fbetState = false;
      attrs.fbetted = user.f.betted;
      attrs.sbetState = false;
      attrs.sbetted = user.s.betted;
      setUserBetState(attrs);
    });

    socket.on("myInfo", (user: UserType) => {
      let attrs = { ...state };
      attrs.userInfo.balance = user.balance;
      attrs.userInfo.userType = user.userType;
      attrs.userInfo.userName = user.userName;
      setState(attrs);
    });

    socket.on("history", (historyList: any) => {
      setHistory(historyList);
    });

    socket.on("previousHand", (previousHand: BettedUserType[]) => {
      setPreviousHand(previousHand);
    });

    socket.on("finishGame", (user: UserType) => {
      let attrs = newState;
      let fauto = attrs.userInfo.f.auto;
      let sauto = attrs.userInfo.s.auto;
      let fbetAmount = attrs.userInfo.f.betAmount;
      let sbetAmount = attrs.userInfo.s.betAmount;
      let betStatus = newBetState;
      
      attrs.userInfo = user;
      attrs.userInfo.f.betAmount = fbetAmount;
      attrs.userInfo.s.betAmount = sbetAmount;
      attrs.userInfo.f.auto = fauto;
      attrs.userInfo.s.auto = sauto;
      
      betStatus.fbetted = false;
      betStatus.sbetted = false;
      
      setState(attrs);
      setUserBetState(betStatus);
    });

    socket.on("getBetLimits", (betAmounts: { max: number; min: number }) => {
      setBetLimit({ maxBet: betAmounts.max, minBet: betAmounts.min });
    });

    socket.on("recharge", () => { setRechargeState(true); });

    socket.on("error", (data) => {
      setUserBetState({ ...userBetState, [`${data.index}betted`]: false });
      toast.error(data.message);
    });

    socket.on("success", (data) => { toast.success(data); });

    return () => {
      socket.off("connect");
      socket.off("gameState");
      socket.off("highMultiplier"); // ✅ Clean up
      socket.off("bettedUserInfo");
      socket.off("myBetState");
      socket.off("myInfo");
      socket.off("history");
      socket.off("finishGame");
      socket.off("error");
      socket.off("success");
    };
  }, []);

  React.useEffect(() => {
    let attrs = state;
    let betStatus = userBetState;
    if (gameState.GameState === "BET") {
      if (betStatus.fbetState) {
        let data = { betAmount: state.userInfo.f.betAmount, target: state.userInfo.f.target, type: "f", auto: state.userInfo.f.auto };
        if (attrs.userInfo.balance - state.userInfo.f.betAmount < 0) {
          toast.error("Your balance is not enough");
          betStatus.fbetState = false; betStatus.fbetted = false; return;
        }
        attrs.userInfo.balance -= state.userInfo.f.betAmount;
        socket.emit("playBet", data);
        betStatus.fbetState = false; betStatus.fbetted = true;
        setUserBetState({ ...betStatus });
      }
      if (betStatus.sbetState) {
        let data = { betAmount: state.userInfo.s.betAmount, target: state.userInfo.s.target, type: "s", auto: state.userInfo.s.auto };
        if (attrs.userInfo.balance - state.userInfo.s.betAmount < 0) {
          toast.error("Your balance is not enough");
          betStatus.sbetState = false; betStatus.sbetted = false; return;
        }
        attrs.userInfo.balance -= state.userInfo.s.betAmount;
        socket.emit("playBet", data);
        betStatus.sbetState = false; betStatus.sbetted = true;
        setUserBetState({ ...betStatus });
      }
    }
  }, [gameState.GameState, userBetState.fbetState, userBetState.sbetState]);

  const getMyBets = async () => {
    try {
      const response = await fetch(`${config.api}/my-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.userInfo.userName }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status) update({ myBets: data.data as GameHistory[] });
      }
    } catch (error) { console.log("getMyBets", error); }
  };

  useEffect(() => { if (gameState.GameState === "BET") getMyBets(); }, [gameState.GameState]);

  return (
    <Context.Provider
      value={{
        state: state, ...betLimit, ...userBetState, ...unity, ...gameState, currentTarget, rechargeState, isHighMultiplier, // ✅ Added to provider
        myUnityContext: unityContext, bettedUsers: [...bettedUsers], previousHand: [...previousHand], history: [...history],
        setCurrentTarget, update, getMyBets, updateUserBetState,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default Context;
