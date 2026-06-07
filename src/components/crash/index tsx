/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import "./crash.scss";
import Unity from "react-unity-webgl";
import propeller from "../../assets/images/propeller.png";
import Context from "../../context";

let currentFlag = 0;

export default function WebGLStarter() {
    // ✅ Tapopa isHighMultiplier
    const { GameState, currentNum, time, unityState, myUnityContext, setCurrentTarget, isHighMultiplier } = React.useContext(Context);
    const [target, setTarget] = React.useState(1);
    const [waiting, setWaiting] = React.useState(0);
    const [flag, setFlag] = React.useState(1);
    const [canvasReady, setCanvasReady] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        let rafId: number;
        const id = requestAnimationFrame(() => {
            rafId = requestAnimationFrame(() => {
                setCanvasReady(true);
            });
        });
        return () => {
            cancelAnimationFrame(id);
            if (rafId !== undefined) cancelAnimationFrame(rafId);
        };
    }, []);

    React.useEffect(() => {
        let animationFrameId: number;
        
        if (GameState === "PLAYING") {
            setFlag(2);
            const getCurrentTime = () => {
                let elapsedMs = Date.now() - time;
                // STRICT MATH SYNC: Smooth frame by frame
                let calculatedNum = Math.max(1.00, Math.exp(0.00006 * elapsedMs));
                
                if (calculatedNum > 2 && currentFlag === 2) setFlag(3);
                else if (calculatedNum > 10 && currentFlag === 3) setFlag(4);
                
                setTarget(calculatedNum);
                setCurrentTarget(calculatedNum);
                
                // Keep calling for next frame
                animationFrameId = requestAnimationFrame(getCurrentTime);
            }
            animationFrameId = requestAnimationFrame(getCurrentTime);
            
        } else if (GameState === "GAMEEND") {
            setFlag(5);
            // LOCK THE EXACT CRASH POINT FROM BACKEND
            setCurrentTarget(currentNum);
            setTarget(currentNum);
            
        } else if (GameState === "BET") {
            setFlag(1);
            setTarget(1);
            setCurrentTarget(1);

            const updateWaiting = () => {
                let elapsedMs = Date.now() - time;
                setWaiting(elapsedMs);
                animationFrameId = requestAnimationFrame(updateWaiting);
            }
            animationFrameId = requestAnimationFrame(updateWaiting);
        }
        
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [GameState, unityState, time, currentNum]);

    React.useEffect(() => {
        myUnityContext?.send("GameManager", "RequestToken", JSON.stringify({
            gameState: flag
        }));
        currentFlag = flag;
    }, [flag, myUnityContext]);

    const displayMultiplier = Number(target).toFixed(2);
    
    // ✅ Logic ya Gradients yomwe imawoneka bwino kwambiri pamwamba pa WebGL koma pansi pa Text
    let glowBackground = "none";
    if (GameState !== "GAMEEND" && GameState !== "BET") {
        if (target >= 10.00 || isHighMultiplier) {
            // Intense Deep Pink Glow (10.00x+)
            glowBackground = "radial-gradient(circle at center, rgba(219, 10, 114, 0.4) 0%, rgba(219, 10, 114, 0.05) 50%, transparent 70%)";
        } else if (target >= 2.00) {
            // Intense Deep Purple Glow (2.00x - 9.99x)
            glowBackground = "radial-gradient(circle at center, rgba(146, 23, 199, 0.45) 0%, rgba(146, 23, 199, 0.05) 50%, transparent 70%)";
        } else {
            // Intense Electric Blue Glow (1.00x - 1.99x)
            glowBackground = "radial-gradient(circle at center, rgba(10, 132, 255, 0.4) 0%, rgba(10, 132, 255, 0.05) 50%, transparent 70%)";
        }
    }

    return (
        <div className="crash-container" ref={containerRef} style={{ position: "relative", overflow: "hidden", background: "#000000" }}>
            
            {/* ✅ WebGL Canvas Player Level (Base layer) */}
            <div className="canvas" style={{ position: "relative", zIndex: 1 }}>
                {canvasReady && <Unity unityContext={myUnityContext} matchWebGLToCanvasSize={true} />}
            </div>

            {/* ✅ Gradient Overlay Layer - Izi zimapangitsa kuti gradient iwoneke pamwamba pa game background koma kuseli kwa manambala */}
            <div className="background-glow" style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                background: glowBackground,
                transition: "background 0.4s ease-in-out",
                zIndex: 2,
                pointerEvents: "none",
                mixBlendMode: "screen" // Imapangitsa glow kukhala yowala kwambiri pamwamba pa canvas
            }}></div>
            
            {/* ✅ Text Layer (Pamwamba pa chilichonse) */}
            <div className="crash-text-container" style={{ 
                position: "absolute", 
                top: 0, left: 0, right: 0, bottom: 0, 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                zIndex: 3, 
                pointerEvents: "none" 
            }}>
                {GameState === "BET" ? (
                    <div className="crashtext wait font-9" style={{ pointerEvents: "auto" }}>
                        <div className="rotate">
                            <img width={100} height={100} src={propeller} alt="propellar"></img>
                        </div>
                        <div className="waiting-font" style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "10px" }}>WAITING FOR NEXT ROUND</div>
                        <div className="waiting">
                            <div style={{ width: `${Math.max(0, (6000 - waiting)) * 100 / 6000}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <div className={`crashtext ${GameState === "GAMEEND" ? "red" : ""}`} style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {/* ✅ FLEW AWAY ndi Pure White (#ffffff) */}
                        {GameState === "GAMEEND" && (
                            <div className="flew-away" style={{ 
                                fontSize: "clamp(1.8rem, 4vw, 2.8rem)", 
                                fontWeight: "900", 
                                color: "#ffffff", 
                                fontFamily: "'Arial Black', Impact, sans-serif",
                                textTransform: "uppercase",
                                marginBottom: "4px",
                                textShadow: "0px 4px 12px rgba(0,0,0,0.8)"
                            }}>
                                FLEW AWAY!
                            </div>
                        )}
                        
                        {/* ✅ Manambala: Onenepa Kwambiri (Fat), Atchipi/Ang'ono Height Pang'ono, Deep Aviator Red pa GAMEEND */}
                        <div style={{ 
                            color: GameState === "GAMEEND" ? "#c60119" : "#ffffff", // Deep Aviator Red weniweni
                            fontWeight: "900", 
                            fontSize: "clamp(4rem, 13vw, 105px)", // Anachepetsako height pang'ono kuti akhale squat/fat
                            lineHeight: "1.0", // Line height yochepa kuti nambala isatambasuke
                            letterSpacing: "-0.03em", // Kupangitsa manambala akhale onenepa komanso oyandikana ngati original Aviator
                            fontFamily: "'Arial Black', 'Helvetica Black', Impact, sans-serif", // Font stack yonenepa kwambiri
                            textShadow: "0px 4px 25px rgba(0,0,0,0.9)", // Shadow yamphamvu kuti nambala itulukire pamwamba pa gradient
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "center"
                        }}>
                            {displayMultiplier} 
                            <span style={{ 
                                fontSize: "0.52em", // 'x' yochepa yomwe ikukwera bwino
                                marginLeft: "4px", 
                                fontWeight: "900" 
                            }}>x</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
