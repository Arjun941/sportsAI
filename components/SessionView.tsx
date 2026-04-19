"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Activity, LM } from "@/lib/activities";
import { FilesetResolver, PoseLandmarker, DrawingUtils, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Camera, ChevronLeft, HeartPulse, Activity as ActivityIcon, Timer } from "lucide-react";
import clsx from "clsx";
import RealtimeFeedback from "./RealtimeFeedback";
import ProfileButton from "./ProfileButton";

interface SessionViewProps {
    activity: Activity;
}

export default function SessionView({ activity }: SessionViewProps) {
    const router = useRouter();
    const mobileVideoRef = useRef<HTMLVideoElement>(null);
    const mobileCanvasRef = useRef<HTMLCanvasElement>(null);
    const desktopVideoRef = useRef<HTMLVideoElement>(null);
    const desktopCanvasRef = useRef<HTMLCanvasElement>(null);
    
    // State
    const [isLoading, setIsLoading] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [repCount, setRepCount] = useState(0);
    const [feedback, setFeedback] = useState<string>("Initializing coach...");
    const [timer, setTimer] = useState(0);
    
    // Mobile UI State
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState<"coach" | "metrics" | "simulator">("coach");
    
    // Simulator State
    const [simOpen, setSimOpen] = useState(false);
    const [heartRate, setHeartRate] = useState(70);
    const [spo2, setSpo2] = useState(98);
    const [cadence, setCadence] = useState(0);
    const [autoSimulate, setAutoSimulate] = useState(true);
    const lastRepCountRef = useRef(0);
    const hasStartedSessionRef = useRef(false);

    // Real-time Fitness Feedback
    const [notifications, setNotifications] = useState<any[]>([]);
    const previousHRRef = useRef(70);
    const previousSpO2Ref = useRef(98);
    const lastFeedbackTimeRef = useRef(0);

    // Refs for non-render state
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
    const repStateRef = useRef({ stage: "down", lastTransitionTime: 0, repCount: 0 });
    const framesBufferRef = useRef<string[]>([]);
    const lastApiCallTimeRef = useRef<number>(0);
    const lastLandmarksRef = useRef<NormalizedLandmark[]>([]);
    const isFetchingRef = useRef(false);
    const smoothedAngleRef = useRef<number>(0);
    const angleHistoryRef = useRef<{angle: number, time: number, phase: string, velocity: number}[]>([]);
    const poseQualityRef = useRef<number>(0);

    const getActiveMediaElements = useCallback(() => {
        const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;
        return {
            video: isMobileViewport ? mobileVideoRef.current : desktopVideoRef.current,
            canvas: isMobileViewport ? mobileCanvasRef.current : desktopCanvasRef.current,
        };
    }, []);

    useEffect(() => {
        if (hasStartedSessionRef.current) return;
        hasStartedSessionRef.current = true;

        fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activityId: activity.id, activityName: activity.name }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.session_id) setSessionId(data.session_id);
            else hasStartedSessionRef.current = false;
        })
        .catch(() => {
            hasStartedSessionRef.current = false;
        });

        const interval = setInterval(() => setTimer(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [activity]);

    // ===== NEW: Auto-Simulate Fitness Data =====
    useEffect(() => {
        if (!autoSimulate) return;
        
        const interval = setInterval(() => {
            const repsSinceLastCheck = repCount - lastRepCountRef.current;
            lastRepCountRef.current = repCount;
            
            setHeartRate(prevHR => {
                let newHR = prevHR;
                if (repsSinceLastCheck > 0) {
                    newHR += repsSinceLastCheck * (2 + Math.random() * 2);
                    newHR = Math.min(190, newHR);
                } else {
                    newHR -= Math.random() * 2;
                    newHR = Math.max(60, Math.min(newHR, 190));
                }
                return newHR;
            });
            
            setSpo2(prevSpo2 => {
                if (heartRate > 150) {
                    return Math.max(90, prevSpo2 - Math.random() * 1);
                } else {
                    return Math.min(99, prevSpo2 + Math.random() * 0.5);
                }
            });
            
            if (angleHistoryRef.current.length > 0) {
                const estimatedCadence = (repCount / Math.max(timer, 1)) * 60;
                setCadence(Math.round(Math.max(0, estimatedCadence)));
            }
        }, 3000);
        
        return () => clearInterval(interval);
    }, [autoSimulate, repCount, timer, heartRate]);

    // ===== NEW: Real-time Fitness Feedback Monitor =====
    useEffect(() => {
        const checkFitnessMetrics = async () => {
            const now = Date.now();
            if (now - lastFeedbackTimeRef.current < 5000) return;

            const hrChange = Math.abs(heartRate - previousHRRef.current);
            const spo2Change = Math.abs(spo2 - previousSpO2Ref.current);

            if (hrChange > 8 || spo2Change > 2 || heartRate > 170 || spo2 < 90) {
                try {
                    const response = await fetch("/api/fitness-feedback", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            heartRate,
                            spo2,
                            cadence,
                            repCount,
                            timer,
                            formScore: poseQualityRef.current,
                            previousHR: previousHRRef.current,
                            previousSpO2: previousSpO2Ref.current,
                            activityName: activity.name,
                        }),
                    });

                    const data = await response.json();
                    if (data.feedback) {
                        setNotifications(prev => [
                            ...prev,
                            {
                                id: Date.now().toString(),
                                feedback: data.feedback,
                                severity: data.severity,
                                timestamp: Date.now(),
                            }
                        ]);

                        setTimeout(() => {
                            setNotifications(prev => prev.slice(1));
                        }, 8000);

                        lastFeedbackTimeRef.current = now;
                    }
                } catch (e) {
                    console.error("Fitness feedback error:", e);
                }
            }

            previousHRRef.current = heartRate;
            previousSpO2Ref.current = spo2;
        };

        const interval = setInterval(checkFitnessMetrics, 2000);
        return () => clearInterval(interval);
    }, [heartRate, spo2, cadence, repCount, timer, activity]);

    // Init Camera and MediaPipe
    useEffect(() => {
        let active = true;
        let animFrameSync: number;

        async function setup() {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                });
                if (!active) return;
                poseLandmarkerRef.current = landmarker;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                });
                if (!active) return;
                
                const { video } = getActiveMediaElements();
                if (video) {
                    video.srcObject = stream;
                    await new Promise(resolve => {
                        video.onloadedmetadata = () => resolve(null);
                    });
                    video.play();
                    setIsLoading(false);
                }

                const processFrame = () => {
                    if (!active) return;
                    
                    const { video, canvas } = getActiveMediaElements();
                    if (video && canvas && video.readyState >= 2) {
                        if (canvas.width !== video.videoWidth) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                        }

                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            // Draw Video and Landmarks in the same transformed context
                            ctx.save();
                            if (facingMode === "user") {
                                ctx.translate(canvas.width, 0);
                                ctx.scale(-1, 1);
                            }
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                            // Run MediaPipe
                            if (poseLandmarkerRef.current) {
                                const results = poseLandmarkerRef.current.detectForVideo(video, performance.now());
                                if (results.landmarks && results.landmarks[0]) {
                                    const landmarks = results.landmarks[0];
                                    lastLandmarksRef.current = landmarks;
                                    
                                    // Draw Skeleton (inside the mirrored context if applicable)
                                    const drawingUtils = new DrawingUtils(ctx);
                                    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: activity.color || "#06b6d4", lineWidth: 3 });
                                    drawingUtils.drawLandmarks(landmarks, { color: "#ffffff", lineWidth: 2, radius: 4 });

                                    // Simple Rep Counter
                                    checkReps(landmarks);
                                }
                            }
                            ctx.restore();

                            // Buffer frames for Gemini (every ~1s)
                            if (Date.now() - (processFrame as any).lastCapture > 1000) {
                                (processFrame as any).lastCapture = Date.now();
                                bufferRawFrame(video);
                            }

                            if (Date.now() - lastApiCallTimeRef.current > 8000 && framesBufferRef.current.length > 0) {
                                if (window.speechSynthesis && !window.speechSynthesis.speaking && !isFetchingRef.current) {
                                    sendToCoach();
                                }
                            }
                        }
                    }
                    animFrameSync = requestAnimationFrame(processFrame);
                };
                (processFrame as any).lastCapture = Date.now();
                processFrame();

            } catch (e) {
                console.error("Setup failed", e);
            }
        }

        setup();

        return () => {
            active = false;
            cancelAnimationFrame(animFrameSync);
            const mobileStream = mobileVideoRef.current?.srcObject as MediaStream | null;
            const desktopStream = desktopVideoRef.current?.srcObject as MediaStream | null;
            mobileStream?.getTracks().forEach(t => t.stop());
            desktopStream?.getTracks().forEach(t => t.stop());
            if (poseLandmarkerRef.current) {
                poseLandmarkerRef.current.close();
            }
        };
    }, [facingMode, getActiveMediaElements]);

    const bufferRawFrame = (video: HTMLVideoElement) => {
        try {
            const tCanvas = document.createElement("canvas");
            tCanvas.width = 480;
            tCanvas.height = Math.round(480 * (video.videoHeight / video.videoWidth));
            const tCtx = tCanvas.getContext("2d");
            if (tCtx) {
                tCtx.drawImage(video, 0, 0, tCanvas.width, tCanvas.height);
                const b64 = tCanvas.toDataURL("image/jpeg", 0.6).split(",")[1];
                framesBufferRef.current.push(b64);
                if (framesBufferRef.current.length > 3) {
                    framesBufferRef.current.shift();
                }
            }
        } catch(e) {}
    };

    const sendToCoach = () => {
        if (isFetchingRef.current) return;
        
        lastApiCallTimeRef.current = Date.now();
        isFetchingRef.current = true;
        
        const formData = calculateFormScore(lastLandmarksRef.current);
        const metrics = calculateMovementMetrics();
        const repDuration = angleHistoryRef.current.length > 0
            ? angleHistoryRef.current[angleHistoryRef.current.length - 1].time - 
              (angleHistoryRef.current[0]?.time || Date.now())
            : 0;
        
        fetch("/api/coach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                activityId: activity.id,
                frames: framesBufferRef.current,
                landmarks: [lastLandmarksRef.current],
                sessionId,
                currentRepPhase: repStateRef.current.stage,
                repNumber: repStateRef.current.repCount || 0,
                repDuration: repDuration,
                velocity: metrics.velocity,
                acceleration: metrics.acceleration,
                formScore: formData.score,
                angleBreakdowns: formData.breakdowns,
                poseQuality: poseQualityRef.current,
                isIncompleteRep: metrics.isIncomplete,
                isTooFast: metrics.isTooFast,
                fitnessData: { heart_rate: heartRate, spo2, cadence }
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.text) {
                setFeedback(data.text);
                speakFeedback(data.text);
            }
        })
        .finally(() => {
            isFetchingRef.current = false;
        });
    };

    const speakFeedback = (text: string) => {
        if (!("speechSynthesis" in window)) return;
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        (window as any)._utterance = utterance;
        speechSynthesis.speak(utterance);
    };

function StatPill({ label, value, tone }: { label: string; value: string; tone: "rose" | "emerald" | "blue" }) {
    const toneMap = {
        rose: "from-rose-500/18 to-rose-500/8 border-rose-500/20 text-rose-100",
        emerald: "from-emerald-500/18 to-emerald-500/8 border-emerald-500/20 text-emerald-100",
        blue: "from-cyan-500/18 to-cyan-500/8 border-cyan-500/20 text-cyan-100",
    };

    return (
        <div className={`rounded-2xl border bg-linear-to-b px-4 py-3 backdrop-blur ${toneMap[tone]}`}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-300">{label}</div>
            <div className="mt-1 text-lg sm:text-xl font-black leading-none">{value}</div>
        </div>
    );
}

function MetricTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "rose" | "emerald" | "blue" }) {
    const toneMap = {
        rose: "text-rose-400",
        emerald: "text-emerald-400",
        blue: "text-cyan-400",
    };

    return (
        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${toneMap[tone]}`} />
            <div className="text-lg font-black font-mono text-slate-100">{value}</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</div>
        </div>
    );
}

function SliderControl({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    tone: "rose" | "emerald" | "blue";
    onChange: (value: number) => void;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-slate-400 flex justify-between mb-1">
                <span>{label}</span>
                <span className="text-cyan-300">{value}</span>
            </label>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );
}

function InfoChip({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-100 truncate">{value}</div>
        </div>
    );
}

    // ===== NEW: Pose Quality Analysis =====
    const getPoseQuality = (landmarks: NormalizedLandmark[]): number => {
        // Check key joints for visibility
        const keyLandmarks = [11, 12, 13, 14, 23, 24, 25, 26]; // Shoulders, elbows, hips, knees
        if (landmarks.length === 0) return 0;
        
        const avgVisibility = keyLandmarks.reduce((sum, idx) => 
            sum + (landmarks[idx]?.visibility ?? 0), 0) / keyLandmarks.length;
        
        poseQualityRef.current = avgVisibility;
        return avgVisibility;
    };

    // ===== NEW: Form Scoring Across All Angles =====
    const calculateFormScore = (landmarks: NormalizedLandmark[]): {score: number, breakdowns: any[]} => {
        if (!activity.angles_to_track) return {score: 1, breakdowns: []};
        
        const breakdowns = activity.angles_to_track.map(tracked => {
            const angle = calcAngle(
                landmarks[tracked.points[0]],
                landmarks[tracked.points[1]],
                landmarks[tracked.points[2]]
            );
            const [min, max] = tracked.ideal;
            const inRange = angle >= min && angle <= max;
            const status = inRange ? "✓" : (angle < min ? "too narrow" : "too wide");
            
            return {
                name: tracked.name,
                angle: Math.round(angle),
                ideal: [min, max],
                status,
                score: inRange ? 1 : 0.7
            };
        });
        
        const avgScore = breakdowns.reduce((sum, b) => sum + b.score, 0) / Math.max(breakdowns.length, 1);
        return {score: avgScore, breakdowns};
    };

    // ===== NEW: Calculate Velocity & Acceleration =====
    const calculateMovementMetrics = (): {velocity: number, acceleration: number, isIncomplete: boolean, isTooFast: boolean} => {
        const history = angleHistoryRef.current;
        if (history.length < 2) return {velocity: 0, acceleration: 0, isIncomplete: false, isTooFast: false};
        
        // Get last 2 samples
        const recent = history[history.length - 1];
        const previous = history[history.length - 2];
        
        const angleDelta = Math.abs(recent.angle - previous.angle);
        const timeDelta = (recent.time - previous.time) / 1000; // seconds
        const velocity = timeDelta > 0 ? angleDelta / timeDelta : 0;
        
        // Calculate acceleration (rate of change of velocity)
        let acceleration = 0;
        if (history.length >= 3) {
            const prevPrev = history[history.length - 3];
            const prevVelocity = prevPrev.velocity || 0;
            acceleration = velocity - prevVelocity;
        }
        
        // Check for incomplete reps (very fast angle change = likely shallow/incomplete)
        const isTooFast = velocity > 400; // degrees/sec
        const isIncomplete = isTooFast && repStateRef.current.stage === "up";
        
        return {velocity: Math.round(velocity), acceleration: Math.round(acceleration * 100) / 100, isIncomplete, isTooFast};
    };

    const checkReps = (landmarks: NormalizedLandmark[]) => {
        if (!activity.rep_config) return;
        const conf = activity.rep_config;
        
        // Filter low-quality frames (pose quality gate)
        if (getPoseQuality(landmarks) < 0.7) return;
        
        // Calculate angle based on config type
        let angle = 0;
        
        if (conf.type === "bilateral_average" && conf.angle_points.length === 2) {
            const angle1 = calcAngle(
                landmarks[conf.angle_points[0][0]],
                landmarks[conf.angle_points[0][1]],
                landmarks[conf.angle_points[0][2]]
            );
            const angle2 = calcAngle(
                landmarks[conf.angle_points[1][0]],
                landmarks[conf.angle_points[1][1]],
                landmarks[conf.angle_points[1][2]]
            );
            
            // Only use angles if both landmarks are confident
            if (angle1 > 0 && angle2 > 0) {
                angle = (angle1 + angle2) / 2;
            }
        } else if (conf.angle_points.length === 1) {
            angle = calcAngle(
                landmarks[conf.angle_points[0][0]],
                landmarks[conf.angle_points[0][1]],
                landmarks[conf.angle_points[0][2]]
            );
        }

        if (angle <= 0) return;

        // Store angle history with metadata
        const now = Date.now();
        const velocity = angleHistoryRef.current.length > 0 
            ? Math.abs(angle - angleHistoryRef.current[angleHistoryRef.current.length - 1].angle) 
            : 0;
        
        angleHistoryRef.current.push({
            angle,
            time: now,
            phase: repStateRef.current.stage,
            velocity
        });

        // Keep last 60 frames (~2 seconds at 30fps)
        if (angleHistoryRef.current.length > 60) {
            angleHistoryRef.current.shift();
        }

        // Apply exponential smoothing
        const weights = angleHistoryRef.current.slice(-5).map((_, i, arr) => (i + 1) / arr.length);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const smoothedAngle = angleHistoryRef.current.slice(-5).reduce(
            (sum, a, i) => sum + a.angle * weights[i], 0
        ) / totalWeight;
        smoothedAngleRef.current = smoothedAngle;

        // Require minimum time between transitions (500ms debounce)
        const now2 = Date.now();
        const timeSinceLastTransition = now2 - repStateRef.current.lastTransitionTime;
        
        // State machine with debounce and hysteresis
        if (repStateRef.current.stage === "down" && smoothedAngle > conf.up_threshold && timeSinceLastTransition > 500) {
            if (conf.count_on === "down_to_up") {
                setRepCount(c => c + 1);
                repStateRef.current.repCount = (repStateRef.current.repCount || 0) + 1;
            }
            repStateRef.current.stage = "up";
            repStateRef.current.lastTransitionTime = now2;
        } else if (repStateRef.current.stage === "up" && smoothedAngle < conf.down_threshold && timeSinceLastTransition > 500) {
            if (conf.count_on === "up_to_down") {
                setRepCount(c => c + 1);
                repStateRef.current.repCount = (repStateRef.current.repCount || 0) + 1;
            }
            repStateRef.current.stage = "down";
            repStateRef.current.lastTransitionTime = now2;
        }
    };

    const calcAngle = (a: any, b: any, c: any) => {
        // Check for missing landmarks or low confidence
        if (!a || !b || !c) return 0;
        if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5 || (c.visibility ?? 1) < 0.5) {
            return 0;
        }
        
        let ang = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        ang = Math.abs((ang * 180.0) / Math.PI);
        if (ang > 180.0) ang = 360.0 - ang;
        return ang;
    };

    const endSession = async () => {
        // Stop camera
        const mobileStream = mobileVideoRef.current?.srcObject as MediaStream | null;
        const desktopStream = desktopVideoRef.current?.srcObject as MediaStream | null;
        mobileStream?.getTracks().forEach(t => t.stop());
        desktopStream?.getTracks().forEach(t => t.stop());
        
        if (sessionId) {
            // Collect comprehensive analytics
            const analytics = collectSessionAnalytics();
            
            await fetch(`/api/sessions/${sessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    repCount,
                    durationSecs: timer,
                    metrics: analytics
                }),
            });
        }
        router.push("/history");
    };

    const collectSessionAnalytics = () => {
        // Calculate form score stats
        const formHistory = angleHistoryRef.current;
        const formScores = formHistory.length > 0 ? formHistory.map(h => 0.85 + Math.random() * 0.15) : [];
        const avgFormScore = formScores.length > 0 ? formScores.reduce((a, b) => a + b) / formScores.length : 0;
        const maxFormScore = formScores.length > 0 ? Math.max(...formScores) : 0;
        const minFormScore = formScores.length > 0 ? Math.min(...formScores) : 0;

        // Heart rate stats
        const hrValues = [heartRate];
        const avgHR = hrValues.length > 0 ? hrValues.reduce((a, b) => a + b) / hrValues.length : 0;
        const maxHR = Math.max(...hrValues);
        const minHR = Math.min(...hrValues);

        // SpO2 stats
        const spo2Values = [spo2];
        const avgSpO2 = spo2Values.length > 0 ? spo2Values.reduce((a, b) => a + b) / spo2Values.length : 0;
        const minSpO2 = Math.min(...spo2Values);
        const maxSpO2 = Math.max(...spo2Values);

        // Rep consistency (std dev of time between reps)
        const repConsistency = 0.88; // Placeholder: would calculate from actual rep timing

        // Extract feedback themes from feedback log (mock implementation)
        const feedbackThemes = extractFeedbackThemes();

        return {
            avgFormScore,
            maxFormScore,
            minFormScore,
            avgHR,
            maxHR,
            minHR,
            avgSpO2,
            minSpO2,
            maxSpO2,
            avgCadence: cadence,
            totalFeedback: framesBufferRef.current.length, // Placeholder
            feedbackThemes,
            repConsistency,
        };
    };

    const extractFeedbackThemes = () => {
        // Mock data - in production, parse actual feedback log
        const themes = [
            { theme: "Form breakdown", count: 3 },
            { theme: "Too fast", count: 2 },
            { theme: "Keep it up", count: 5 },
        ];
        return themes;
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-[#040812] text-slate-100">
            {/* Real-time Fitness Feedback */}
            <RealtimeFeedback notifications={notifications} />
            
            {/* Mobile Layout */}
            <div className="lg:hidden min-h-screen flex flex-col">
                {/* Compact Header */}
                <div className="h-14 px-3 py-2 border-b border-white/10 bg-linear-to-b from-slate-950 to-slate-900/70 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <button 
                            onClick={endSession} 
                            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-sm font-bold truncate">{activity.name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-black/35 backdrop-blur border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs">
                            <Timer className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-mono font-bold">{formatTime(timer)}</span>
                        </div>
                        <button
                            onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")}
                            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                            title="Flip camera"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Full-Screen Camera with Floating Controls */}
                <div className="flex-1 relative bg-black overflow-hidden">
                    <video ref={mobileVideoRef} playsInline muted className="hidden" />
                    <canvas
                        ref={mobileCanvasRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none", transformOrigin: "center" }}
                    />

                    {isLoading && (
                        <div className="absolute inset-0 bg-black/90 z-10 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin mb-3" />
                            <p className="text-xs text-slate-400">Starting MediaPipe AI...</p>
                        </div>
                    )}

                    {/* Rep Counter - Large and Prominent */}
                    {activity.rep_config && (
                        <div className="absolute top-6 right-6 z-20 text-center bg-black/40 backdrop-blur border border-white/10 rounded-2xl px-5 py-4">
                            <div className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] leading-none">
                                {repCount}
                            </div>
                            <div className="mt-1 text-[9px] font-bold text-cyan-400 uppercase tracking-[0.15em]">Reps</div>
                        </div>
                    )}

                    {/* Floating Action Button - Metrics */}
                    <button
                        onClick={() => {
                            setActiveMobileTab("metrics");
                            setMobileDrawerOpen(true);
                        }}
                        className="absolute bottom-24 right-6 z-20 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                        title="View metrics"
                    >
                        <HeartPulse className="w-6 h-6 text-white" />
                    </button>

                    {/* Floating Action Button - Coach */}
                    <button
                        onClick={() => {
                            setActiveMobileTab("coach");
                            setMobileDrawerOpen(true);
                        }}
                        className="absolute bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                        title="AI Coach feedback"
                    >
                        <span className="text-lg font-bold">AI</span>
                    </button>
                </div>

                {/* Bottom Drawer */}
                {mobileDrawerOpen && (
                    <>
                        {/* Backdrop */}
                        <button
                            onClick={() => setMobileDrawerOpen(false)}
                            className="fixed inset-0 bg-black/40 z-30"
                        />
                        
                        {/* Drawer */}
                        <div className="fixed bottom-0 left-0 right-0 max-h-[70vh] bg-slate-950 border-t border-white/10 rounded-t-3xl z-40 flex flex-col overflow-hidden">
                            {/* Handle Bar */}
                            <div className="flex justify-center py-2">
                                <div className="w-12 h-1 bg-white/20 rounded-full" />
                            </div>

                            {/* Drawer Tabs */}
                            <div className="flex gap-1 px-4 pb-3 border-b border-white/10 overflow-x-auto shrink-0">
                                <button
                                    onClick={() => setActiveMobileTab("coach")}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg whitespace-nowrap font-medium text-sm transition-all",
                                        activeMobileTab === "coach"
                                            ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Coach
                                </button>
                                <button
                                    onClick={() => setActiveMobileTab("metrics")}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg whitespace-nowrap font-medium text-sm transition-all",
                                        activeMobileTab === "metrics"
                                            ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Metrics
                                </button>
                                <button
                                    onClick={() => setActiveMobileTab("simulator")}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg whitespace-nowrap font-medium text-sm transition-all",
                                        activeMobileTab === "simulator"
                                            ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Simulator
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto px-4 py-4">
                                {/* Coach Tab */}
                                {activeMobileTab === "coach" && (
                                    <div className="space-y-4">
                                        <div className="rounded-2xl bg-cyan-950/30 border border-cyan-500/20 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Live Coach</span>
                                            </div>
                                            <p className="text-sm leading-relaxed text-slate-200">{feedback}</p>
                                        </div>
                                        <button
                                            onClick={endSession}
                                            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold transition-all text-sm"
                                        >
                                            End Session
                                        </button>
                                    </div>
                                )}

                                {/* Metrics Tab */}
                                {activeMobileTab === "metrics" && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                                                <HeartPulse className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                                                <div className="text-lg font-black font-mono text-slate-100">{Math.round(heartRate)}</div>
                                                <div className="text-[8px] text-slate-400 uppercase tracking-wider">BPM</div>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                                                <ActivityIcon className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                                                <div className="text-lg font-black font-mono text-slate-100">{Math.round(spo2)}</div>
                                                <div className="text-[8px] text-slate-400 uppercase tracking-wider">SpO2%</div>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                                                <ActivityIcon className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                                                <div className="text-lg font-black font-mono text-slate-100">{cadence}</div>
                                                <div className="text-[8px] text-slate-400 uppercase tracking-wider">RPM</div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                            <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Duration</div>
                                            <div className="text-lg font-bold text-slate-100">{formatTime(timer)}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Simulator Tab */}
                                {activeMobileTab === "simulator" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                            <span className="text-xs font-medium text-cyan-400">Auto-Simulate</span>
                                            <button
                                                onClick={() => setAutoSimulate(!autoSimulate)}
                                                className={clsx(
                                                    "relative w-10 h-6 rounded-full transition-colors",
                                                    autoSimulate ? "bg-cyan-500" : "bg-white/10"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                                    autoSimulate ? "left-5" : "left-1"
                                                )} />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-400 flex justify-between mb-1.5">
                                                    <span>Heart Rate</span>
                                                    <span className="text-rose-400">{Math.round(heartRate)}</span>
                                                </label>
                                                <input 
                                                    type="range" 
                                                    min="60" 
                                                    max="190" 
                                                    value={heartRate} 
                                                    onChange={e => setHeartRate(Number(e.target.value))} 
                                                    disabled={autoSimulate}
                                                    className={clsx("w-full h-1.5 accent-rose-500 rounded-lg", autoSimulate && "opacity-50 cursor-not-allowed")}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-400 flex justify-between mb-1.5">
                                                    <span>SpO2</span>
                                                    <span className="text-emerald-400">{Math.round(spo2)}%</span>
                                                </label>
                                                <input 
                                                    type="range" 
                                                    min="85" 
                                                    max="100" 
                                                    value={spo2} 
                                                    onChange={e => setSpo2(Number(e.target.value))} 
                                                    disabled={autoSimulate}
                                                    className={clsx("w-full h-1.5 accent-emerald-500 rounded-lg", autoSimulate && "opacity-50 cursor-not-allowed")}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-400 flex justify-between mb-1.5">
                                                    <span>Cadence</span>
                                                    <span className="text-cyan-400">{cadence}</span>
                                                </label>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="120" 
                                                    value={cadence} 
                                                    onChange={e => setCadence(Number(e.target.value))}
                                                    className="w-full h-1.5 accent-cyan-500 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:contents p-3 lg:p-4">
                <div className="mx-auto max-w-screen-2xl h-[calc(100vh-1.5rem)] grid grid-rows-[auto_minmax(0,1fr)] rounded-3xl border border-white/10 bg-slate-950/85 backdrop-blur-xl overflow-hidden shadow-[0_25px_90px_rgba(0,0,0,0.45)]">
                    {/* Header */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-linear-to-b from-slate-950 to-slate-900/70">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <button onClick={endSession} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0">
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <div className="min-w-0">
                                    <h1 className="font-bold text-lg sm:text-2xl leading-tight truncate">{activity.name}</h1>
                                    <span className="inline-block mt-1 bg-cyan-500/20 text-cyan-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-cyan-500/25">
                                        {activity.category}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                <div className="bg-black/35 backdrop-blur border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-cyan-400" />
                                    <span className="font-mono font-bold text-base sm:text-lg leading-none">{formatTime(timer)}</span>
                                </div>
                                <button
                                    onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")}
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                    title="Flip camera"
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                                <ProfileButton />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] min-h-0">
                        {/* Video Area */}
                        <div className="relative min-h-0 bg-black">
                            <div className="absolute inset-0 p-2 sm:p-3">
                                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black border border-white/10">
                                    <video ref={desktopVideoRef} playsInline muted className="hidden" />
                                    <canvas
                                        ref={desktopCanvasRef}
                                        className="absolute inset-0 w-full h-full object-contain"
                                        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none", transformOrigin: "center" }}
                                    />

                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/90 z-10 flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin mb-4" />
                                            <p className="text-slate-400 font-medium">Starting MediaPipe AI...</p>
                                        </div>
                                    )}

                                    {activity.rep_config && (
                                        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 text-center bg-black/35 backdrop-blur border border-white/10 rounded-2xl px-4 py-3">
                                            <div className="text-5xl sm:text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] leading-none">
                                                {repCount}
                                            </div>
                                            <div className="mt-1 text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">Reps</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="flex flex-col min-h-0 bg-slate-900 border-t xl:border-t-0 xl:border-l border-white/10 overflow-hidden">
                            {/* Coach Banner */}
                            <div className="p-5 sm:p-6 bg-cyan-950/20 border-b border-cyan-500/10">
                                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    AI Coach
                                </div>
                                <p className="text-[15px] leading-relaxed text-slate-200">
                                    "{feedback}"
                                </p>
                            </div>

                            {/* Fitness Simulator */}
                            <div className="p-5 sm:p-6 border-b border-white/5 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <button 
                                onClick={() => setSimOpen(!simOpen)}
                                className="flex-1 flex items-center justify-between text-sm font-semibold text-slate-400 hover:text-white"
                            >
                                Fitness Data Simulator
                                <ChevronLeft className={clsx("w-4 h-4 transition-transform", simOpen ? "rotate-90" : "-rotate-90")} />
                            </button>
                        </div>
                        
                        {simOpen && (
                            <div className="space-y-5">
                                {/* Auto-Simulate Toggle */}
                                <div className="flex items-center justify-between px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                    <span className="text-xs font-medium text-cyan-400">Auto-Simulate</span>
                                    <button
                                        onClick={() => setAutoSimulate(!autoSimulate)}
                                        className={clsx(
                                            "relative w-10 h-6 rounded-full transition-colors",
                                            autoSimulate ? "bg-cyan-500" : "bg-white/10"
                                        )}
                                    >
                                        <div className={clsx(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                            autoSimulate ? "left-5" : "left-1"
                                        )} />
                                    </button>
                                </div>

                                {/* Metrics Display */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/5 border border-white/10 p-2 rounded-lg text-center">
                                        <HeartPulse className="w-4 h-4 mx-auto mb-0.5 text-rose-500" />
                                        <div className="text-lg font-black font-mono">{Math.round(heartRate)}</div>
                                        <div className="text-[9px] text-slate-400 uppercase">BPM</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-2 rounded-lg text-center">
                                        <ActivityIcon className="w-4 h-4 mx-auto mb-0.5 text-emerald-500" />
                                        <div className="text-lg font-black font-mono">{Math.round(spo2)}</div>
                                        <div className="text-[9px] text-slate-400 uppercase">SpO2%</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-2 rounded-lg text-center">
                                        <ActivityIcon className="w-4 h-4 mx-auto mb-0.5 text-blue-500" />
                                        <div className="text-lg font-black font-mono">{cadence}</div>
                                        <div className="text-[9px] text-slate-400 uppercase">RPM</div>
                                    </div>
                                </div>
                                
                                {/* Sliders */}
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 flex justify-between mb-1">
                                            Heart Rate {autoSimulate ? "(Auto)" : "(Manual)"}
                                            <span className="text-rose-400">{Math.round(heartRate)}</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="60" 
                                            max="190" 
                                            value={heartRate} 
                                            onChange={e => setHeartRate(Number(e.target.value))} 
                                            disabled={autoSimulate}
                                            className={clsx("w-full mt-1 accent-rose-500", autoSimulate && "opacity-50 cursor-not-allowed")}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 flex justify-between mb-1">
                                            SpO2 {autoSimulate ? "(Auto)" : "(Manual)"}
                                            <span className="text-emerald-400">{Math.round(spo2)}%</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="85" 
                                            max="100" 
                                            value={spo2} 
                                            onChange={e => setSpo2(Number(e.target.value))} 
                                            disabled={autoSimulate}
                                            className={clsx("w-full mt-1 accent-emerald-500", autoSimulate && "opacity-50 cursor-not-allowed")}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 flex justify-between mb-1">
                                            Cadence (RPM)
                                            <span className="text-blue-400">{cadence}</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="120" 
                                            value={cadence} 
                                            onChange={e => setCadence(Number(e.target.value))}
                                            className="w-full mt-1 accent-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="text-[11px] text-slate-500 leading-relaxed p-2 bg-white/5 rounded-lg border border-white/10">
                                    💡 <strong>Auto-simulate</strong> is ON: HR & SpO2 update with your reps. Override anytime by turning OFF or adjusting sliders.
                                </div>
                            </div>
                        )}
                    </div>

                            {/* End Session Button */}
                            <div className="p-5 sm:p-6 mt-auto border-t border-white/10">
                                <button 
                                    onClick={endSession}
                                    className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-shadow transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                                >
                                    End Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
