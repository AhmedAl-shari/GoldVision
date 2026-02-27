import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useLocale } from "../contexts/useLocale";
import {
  Wifi,
  WifiOff,
  Activity,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Settings,
  Users,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  RotateCcw,
  Bell,
  Eye,
  Share2,
  Download,
  Maximize2,
  Minimize2,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../lib/config";
import { getPriceSSE } from "../lib/stream";
import { getPrices } from "../lib/api";
import { useQuery } from "@tanstack/react-query";

interface PriceUpdate {
  asset: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  volume?: number;
  high24h?: number;
  low24h?: number;
}

interface StreamingStats {
  connected: boolean;
  messagesReceived: number;
  lastUpdate: Date | null;
  latency: number;
  reconnectAttempts: number;
  uptime: number;
}

interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  lastSeen: Date;
  isViewing: boolean;
  cursor?: { x: number; y: number };
}

interface RealTimeStreamingProps {
  onPriceUpdate?: (update: PriceUpdate) => void;
  onConnectionChange?: (connected: boolean) => void;
  enableCollaboration?: boolean;
  showMiniPlayer?: boolean;
}

const RealTimeStreaming: React.FC<RealTimeStreamingProps> = ({
  onPriceUpdate,
  onConnectionChange,
  enableCollaboration = false,
  showMiniPlayer = false,
}) => {
  const { settings } = useSettings();
  const { t } = useLocale();

  // Add error boundary state
  const [hasError, setHasError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMode, setConnectionMode] = useState<
    "none" | "sse" | "polling"
  >("none");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(showMiniPlayer);
  const [priceHistory, setPriceHistory] = useState<PriceUpdate[]>([]);
  const [streamingStats, setStreamingStats] = useState<StreamingStats>({
    connected: false,
    messagesReceived: 0,
    lastUpdate: null,
    latency: 0,
    reconnectAttempts: 0,
    uptime: 0,
  });
  const [collaborationUsers, setCollaborationUsers] = useState<
    CollaborationUser[]
  >([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef<boolean>(false);

  // Add connection state refs to prevent duplicate connections
  const connectingRef = useRef<boolean>(false);
  const connectedRef = useRef<boolean>(false);

  // Store previous price for change calculation (fallback)
  const previousPriceRef = useRef<number | null>(null);

  // Fetch historical prices for change calculation (similar to ProMarketTicker)
  const { data: historicalPrices } = useQuery({
    queryKey: ["historical-prices-realtime", settings.asset, settings.currency],
    queryFn: async () => {
      const response = await getPrices({
        asset: settings.asset,
        currency: settings.currency,
        limit: 2,
      });
      return response?.prices || [];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to calculate change from historical prices or priceHistory if API doesn't provide it
  // Use useCallback to ensure it has access to the latest state
  const calculateChangeFromHistory = useCallback(
    (
      currentPrice: number,
      apiChange: number | null | undefined,
      apiChangePercent: number | null | undefined
    ): { change: number; changePercent: number } => {
      // If API provides change values, use them
      if (
        typeof apiChange === "number" &&
        typeof apiChangePercent === "number"
      ) {
        return { change: apiChange, changePercent: apiChangePercent };
      }

      // Try to calculate from historical prices first (from API)
      if (
        historicalPrices &&
        Array.isArray(historicalPrices) &&
        historicalPrices.length >= 2
      ) {
        // Historical prices are typically sorted newest first (prices[0] = most recent, prices[1] = previous)
        const historicalPrevious = historicalPrices[1]?.price;
        if (historicalPrevious && historicalPrevious > 0) {
          const change = currentPrice - historicalPrevious;
          const changePercent = (change / historicalPrevious) * 100;
          return { change, changePercent };
        }
      }

      // Fallback to priceHistory if available
      // priceHistory[0] is the most recent previous price
      if (
        priceHistory.length > 0 &&
        priceHistory[0].price &&
        priceHistory[0].price > 0
      ) {
        const previousPrice = priceHistory[0].price;
        const change = currentPrice - previousPrice;
        const changePercent = (change / previousPrice) * 100;
        return { change, changePercent };
      }

      // Fallback to stored previous price ref
      if (previousPriceRef.current && previousPriceRef.current > 0) {
        const previousPrice = previousPriceRef.current;
        const change = currentPrice - previousPrice;
        const changePercent = (change / previousPrice) * 100;
        return { change, changePercent };
      }

      // Fallback to 0 if no history available
      return { change: 0, changePercent: 0 };
    },
    [priceHistory, historicalPrices]
  );

  // Initialize audio context for price change sounds
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && soundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn("Audio context not supported:", error);
      }
    }
  }, [soundEnabled]);

  // Add a function to resume audio context if suspended
  const resumeAudioContext = useCallback(async () => {
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
          console.log("Audio context resumed");
        }
      } catch (error) {
        console.warn("Failed to resume audio context:", error);
      }
    }
  }, []);

  // Speak price announcement using Text-to-Speech
  const speakPrice = useCallback(
    (price: number, change: number, changePercent: number, currency: string) => {
      if (!soundEnabled) return;

      try {
        // Check if browser supports speech synthesis
        if (!("speechSynthesis" in window)) {
          console.warn("Speech synthesis not supported");
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Format the price announcement
        const formattedPrice = price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        const isIncrease = change >= 0;
        const changeText = Math.abs(change).toFixed(2);
        const percentText = Math.abs(changePercent).toFixed(2);
        const direction = isIncrease ? "up" : "down";

        // Construct the announcement
        let announcement = "";
        if (currency === "YER") {
          announcement = `Gold price: ${formattedPrice} YER. ${direction} ${changeText}, ${percentText} percent.`;
        } else {
          announcement = `Gold price: ${formattedPrice} dollars. ${direction} ${changeText} dollars, ${percentText} percent.`;
        }

        // Create and speak
        const utterance = new SpeechSynthesisUtterance(announcement);
        utterance.rate = 1.0; // Normal speech rate
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 1.0; // Full volume

        // Try to use a pleasant voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
          voices.find((v) => v.name.includes("Samantha") || v.name.includes("Karen")) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
        console.log(`Price announced: ${announcement}`);
      } catch (error) {
        console.warn("Failed to speak price:", error);
      }
    },
    [soundEnabled, settings.currency]
  );

  // Play sound for price changes
  const playPriceSound = useCallback(
    async (isIncrease: boolean) => {
      if (!soundEnabled) {
        console.log("Sound disabled, skipping audio");
        return;
      }

      // Initialize audio context if it doesn't exist
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
          console.log("Audio context created");
        } catch (error) {
          console.warn("Audio context not supported:", error);
          return;
        }
      }

      try {
        // Resume audio context if suspended
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
          console.log("Audio context resumed for price sound");
        }

        // Wait a tiny bit to ensure context is ready
        if (audioContextRef.current.state !== "running") {
          console.warn("Audio context not running, state:", audioContextRef.current.state);
          return;
        }

        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        oscillator.frequency.setValueAtTime(
          isIncrease ? 800 : 400, // Higher pitch for increase, lower for decrease
          audioContextRef.current.currentTime
        );
        oscillator.type = "sine";

        // Increase volume for better audibility
        gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContextRef.current.currentTime + 0.3
        );

        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + 0.3);
        
        console.log(`Price sound played: ${isIncrease ? "increase" : "decrease"}`);
      } catch (error) {
        console.error("Failed to play price sound:", error);
      }
    },
    [soundEnabled]
  );

  // Keep a live ref of pause state for timers
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Establish SSE fallback
  const connectSSE = useCallback(() => {
    // Robust guard to prevent duplicate connections
    if (connectingRef.current || connectedRef.current) {
      console.log("SSE connection already in progress or connected, skipping");
      return;
    }

    // Clean up any existing connection first
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    connectingRef.current = true;

    try {
      // Resolve API base: if running on static localhost (e.g., :5174), go direct to backend :8000
      let base = (API_BASE_URL || "/api").replace(/\/$/, "");
      try {
        const isRelative = !/^https?:\/\//.test(base) && base.startsWith("/");
        const onLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        const isStatic =
          window.location.port && window.location.port !== "5173"; // e.g., 5174
        if (isRelative && onLocal && isStatic) {
          base = `http://${window.location.hostname}:8000`;
        }
      } catch { /* ignore */ }
      const sseUrl = `${base}/stream/prices?asset=${encodeURIComponent(
        settings.asset
      )}&currency=${encodeURIComponent(settings.currency)}`;
      setIsConnecting(true);
      toast("Connecting to live price stream…");

      // Helper: start polling fallback immediately (used on timeout/error)
      const startPolling = () => {
        if (pollingRef.current) return;
        // Seed immediately so we render a price right after connect
        (async () => {
          try {
            const res = await fetch(`${base}/spot`);
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            const now = new Date();
            const price = Number(data.usdPerOunce);
            if (!Number.isFinite(price)) return; // ignore invalid
            const { change, changePercent } = calculateChangeFromHistory(
              price,
              data.meta?.ch,
              data.meta?.chp
            );
            const priceUpdate: PriceUpdate = {
              asset: settings.asset,
              currency: settings.currency,
              price,
              change,
              changePercent,
              timestamp: data.asOf || now.toISOString(),
            };
            setIsConnected(true);
            setConnectionMode("polling");
            onConnectionChange?.(true);
            setPriceHistory((prev) => [
              priceUpdate,
              ...prev.filter((p) => Number.isFinite(p.price)).slice(0, 99),
            ]);
            // Update previous price ref for future change calculations
            previousPriceRef.current = price;
            setStreamingStats((prev) => ({
              ...prev,
              messagesReceived: prev.messagesReceived + 1,
              lastUpdate: now,
            }));
          } catch (_) { /* ignore */ }
        })();

        pollingRef.current = setInterval(async () => {
          if (isPausedRef.current) return;
          try {
            const res = await fetch(`${base}/spot`);
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            const now = new Date();
            const price = Number(data.usdPerOunce);
            if (!Number.isFinite(price)) return; // ignore invalid
            const { change, changePercent } = calculateChangeFromHistory(
              price,
              data.meta?.ch,
              data.meta?.chp
            );
            const priceUpdate: PriceUpdate = {
              asset: settings.asset,
              currency: settings.currency,
              price,
              change,
              changePercent,
              timestamp: data.asOf || now.toISOString(),
            };
            setIsConnected(true);
            setConnectionMode("polling");
            onConnectionChange?.(true);
            setPriceHistory((prev) => [
              priceUpdate,
              ...prev.filter((p) => Number.isFinite(p.price)).slice(0, 99),
            ]);
            setStreamingStats((prev) => ({
              ...prev,
              messagesReceived: prev.messagesReceived + 1,
              lastUpdate: now,
            }));
          } catch (_) {
            // keep trying silently
          }
        }, 5000);
        setIsConnecting(false);
        setIsConnected(true);
        setConnectionMode("polling");
        setStreamingStats((prev) => ({ ...prev, connected: true }));
      };
      // Prefer app-wide singleton so connection persists across navigation
      let es: EventSource;
      try {
        es = getPriceSSE(settings.asset, settings.currency);
      } catch {
        es = new EventSource(sseUrl);
      }
      sseRef.current = es;

      // Safety timeout: if no onopen within 7s, abort and show disconnected
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = setTimeout(() => {
        if (!isConnected && sseRef.current) {
          try {
            sseRef.current.close();
          } catch { /* ignore */ }
          sseRef.current = null;
          // Switch to polling immediately on timeout
          startPolling();
          toast("Live stream unavailable (SSE); switched to polling");
        }
      }, 7000);

      es.onopen = () => {
        connectingRef.current = false;
        connectedRef.current = true;
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionMode("sse");
        setStreamingStats((prev) => ({ ...prev, connected: true }));
        onConnectionChange?.(true);
        toast.success("Connected to live price stream (SSE)");
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data || "{}");
          const now = new Date();
          if (!isPaused && (data.price || data.usdPerOunce)) {
            const priceRaw =
              typeof data.price === "number" ? data.price : data.usdPerOunce;
            const price = Number(priceRaw);
            if (!Number.isFinite(price)) return; // ignore invalid
            const { change, changePercent } = calculateChangeFromHistory(
              price,
              data.change,
              data.changePercent
            );
            const priceUpdate: PriceUpdate = {
              asset: data.asset || settings.asset,
              currency: data.currency || settings.currency,
              price,
              change,
              changePercent,
              timestamp: data.timestamp || now.toISOString(),
              volume: data.volume,
              high24h: data.high24h,
              low24h: data.low24h,
            };
            setPriceHistory((prev) => [
              priceUpdate,
              ...prev.filter((p) => Number.isFinite(p.price)).slice(0, 99),
            ]);
            // Update previous price ref for future change calculations
            previousPriceRef.current = price;
            onPriceUpdate?.(priceUpdate);
            // Play sound and speak announcement for significant price changes (>= 0.1%)
            if (Math.abs(priceUpdate.changePercent) >= 0.1) {
              console.log(`Price change detected: ${priceUpdate.changePercent.toFixed(2)}%, playing sound and announcement`);
              const isIncrease = priceUpdate.change > 0;
              // Play beep sound
              playPriceSound(isIncrease);
              // Speak price announcement (with slight delay to not overlap with beep)
              setTimeout(() => {
                speakPrice(
                  priceUpdate.price,
                  priceUpdate.change,
                  priceUpdate.changePercent,
                  priceUpdate.currency || settings.currency
                );
              }, 400); // Wait for beep to finish (0.3s + 0.1s buffer)
            }
            setStreamingStats((prev) => ({
              ...prev,
              messagesReceived: prev.messagesReceived + 1,
              lastUpdate: now,
              latency:
                now.getTime() - new Date(priceUpdate.timestamp).getTime(),
            }));
          }
        } catch (e) {
          console.warn("Failed to parse SSE price message", e);
        }
      };

      es.onerror = () => {
        connectingRef.current = false;
        connectedRef.current = false;
        setIsConnecting(false);
        // Fall back to polling so the widget still works
        startPolling();
        // Keep silent beyond resetting flags; toast was shown on connect/timeout
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
      };
    } catch (error) {
      console.warn("SSE not available:", error);
      // Start polling immediately if EventSource creation fails synchronously
      try {
        let base = (API_BASE_URL || "/api").replace(/\/$/, "");
        const isRelative = !/^https?:\/\//.test(base) && base.startsWith("/");
        const onLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        const isStatic =
          window.location.port && window.location.port !== "5173";
        if (isRelative && onLocal && isStatic) {
          base = `http://${window.location.hostname}:8000`;
        }
        if (!pollingRef.current) {
          pollingRef.current = setInterval(async () => {
            try {
              const res = await fetch(`${base}/spot`);
              if (!res.ok) throw new Error(String(res.status));
              const data = await res.json();
              const now = new Date();
              const price = Number(data.usdPerOunce);
              if (!Number.isFinite(price)) return; // ignore invalid
              const priceUpdate: PriceUpdate = {
                asset: settings.asset,
                currency: settings.currency,
                price,
                change: data.meta?.ch || 0,
                changePercent: data.meta?.chp || 0,
                timestamp: data.asOf || now.toISOString(),
              };
              setIsConnected(true);
              setConnectionMode("polling");
              onConnectionChange?.(true);
              setPriceHistory((prev) => [
                priceUpdate,
                ...prev.filter((p) => Number.isFinite(p.price)).slice(0, 99),
              ]);
              setStreamingStats((prev) => ({
                ...prev,
                messagesReceived: prev.messagesReceived + 1,
                lastUpdate: now,
              }));
            } catch (_) { /* ignore */ }
          }, 5000);
          setIsConnecting(false);
          setIsConnected(true);
          setConnectionMode("polling");
          setStreamingStats((prev) => ({ ...prev, connected: true }));
        }
      } catch { /* ignore */ }
    }
  }, [
    isPaused,
    onPriceUpdate,
    onConnectionChange,
    playPriceSound,
    speakPrice,
    settings.asset,
    settings.currency,
  ]);

  // Connect: immediately start polling (connected), and attempt SSE in parallel
  const connect = useCallback(() => {
    // Robust guard to prevent duplicate connections
    if (connectingRef.current || connectedRef.current) {
      console.log("Connection already in progress or connected, skipping");
      return;
    }

    connectingRef.current = true;
    setIsConnecting(true);
    try {
      if (!pollingRef.current) {
        let base = (API_BASE_URL || "/api").replace(/\/$/, "");
        try {
          const isRelative = !/^https?:\/\//.test(base) && base.startsWith("/");
          const onLocal =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";
          const isStatic =
            window.location.port && window.location.port !== "5173";
          if (isRelative && onLocal && isStatic) {
            base = `http://${window.location.hostname}:8000`;
          }
        } catch { /* ignore */ }
        // Seed immediately so the first price shows right away
        (async () => {
          try {
            const res = await fetch(`${base}/spot`);
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            const now = new Date();
            const price = Number(data.usdPerOunce);
            if (!Number.isFinite(price)) return;
            const { change, changePercent } = calculateChangeFromHistory(
              price,
              data.meta?.ch,
              data.meta?.chp
            );
            const priceUpdate: PriceUpdate = {
              asset: settings.asset,
              currency: settings.currency,
              price,
              change,
              changePercent,
              timestamp: data.asOf || now.toISOString(),
            };
            setPriceHistory((prev) => [
              priceUpdate,
              ...prev.filter((p) => Number.isFinite(p.price)).slice(0, 99),
            ]);
            // Update previous price ref for future change calculations
            previousPriceRef.current = price;
            setStreamingStats((prev) => ({
              ...prev,
              messagesReceived: prev.messagesReceived + 1,
              lastUpdate: now,
              connected: true,
            }));
            setIsConnected(true);
            setConnectionMode("polling");
            onConnectionChange?.(true);
          } catch (_) { /* ignore */ }
        })();

        pollingRef.current = setInterval(async () => {
          if (isPausedRef.current) return;
          try {
            const res = await fetch(`${base}/spot`);
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            const now = new Date();
            const price = Number(data.usdPerOunce);
            if (!Number.isFinite(price)) return;
            const { change, changePercent } = calculateChangeFromHistory(
              price,
              data.meta?.ch,
              data.meta?.chp
            );
            const priceUpdate: PriceUpdate = {
              asset: settings.asset,
              currency: settings.currency,
              price,
              change,
              changePercent,
              timestamp: data.asOf || now.toISOString(),
            };
            setPriceHistory((prev) => [
              priceUpdate,
              ...prev.filter((p) => Number.isFinite(p.price)).slice(0, 99),
            ]);
            // Update previous price ref for future change calculations
            previousPriceRef.current = price;
            setStreamingStats((prev) => ({
              ...prev,
              messagesReceived: prev.messagesReceived + 1,
              lastUpdate: now,
              connected: true,
            }));
            setIsConnected(true);
            setConnectionMode("polling");
            onConnectionChange?.(true);
          } catch (_) { /* ignore */ }
        }, 5000);
        setIsConnecting(false);
        setIsConnected(true);
        setConnectionMode("polling");
        setStreamingStats((prev) => ({ ...prev, connected: true }));
      }
    } catch { /* ignore */ }

    if (!sseRef.current) {
      connectSSE();
    }
  }, [
    settings.asset,
    settings.currency,
    isPaused,
    enableCollaboration,
    onPriceUpdate,
    onConnectionChange,
    streamingStats.reconnectAttempts,
    playPriceSound,
    speakPrice,
    connectSSE,
    API_BASE_URL,
    isConnecting,
    isConnected,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Reset connection state refs
    connectingRef.current = false;
    connectedRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    setIsConnected(false);
    setStreamingStats((prev) => ({ ...prev, connected: false }));
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Toggle pause/resume
  const togglePause = useCallback(() => {
    const next = !isPaused;
    if (next) {
      // Pausing: stop all live sources immediately
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (sseRef.current) {
        try {
          sseRef.current.close();
        } catch { /* ignore */ }
        sseRef.current = null;
      }
      setIsConnected(false);
      setConnectionMode("none");
    } else {
      // Resuming: reconnect using current strategy
      connect();
    }
    setIsPaused(next);
    toast(next ? "Paused real-time updates" : "Resumed real-time updates");
  }, [connect, isPaused]);

  // Clear history
  const clearHistory = useCallback(() => {
    setPriceHistory([]);
    setNotifications([]);
    setStreamingStats((prev) => ({
      ...prev,
      messagesReceived: 0,
    }));
    toast.success("History cleared");
  }, []);

  // Export data
  const exportData = useCallback(() => {
    const data = {
      priceHistory,
      streamingStats,
      collaborationUsers,
      notifications,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `realtime-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Real-time data exported");
  }, [priceHistory, streamingStats, collaborationUsers, notifications]);

  // Initialize audio context when sound is enabled
  useEffect(() => {
    if (soundEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        console.log("Audio context initialized (sound enabled)");
      } catch (error) {
        console.warn("Audio context not supported:", error);
      }
    }
    
    // Load voices for speech synthesis (browsers load voices asynchronously)
    if (soundEnabled && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log(`Loaded ${voices.length} speech synthesis voices`);
        }
      };
      
      // Some browsers load voices immediately
      loadVoices();
      
      // Others need to wait for the voiceschanged event
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [soundEnabled]);

  // Initialize connection and audio
  useEffect(() => {
    try {
      initAudioContext();
      // Don't auto-connect - let user manually connect if WebSocket is available
      // connect();

      // Update uptime stats
      statsIntervalRef.current = setInterval(() => {
        setStreamingStats((prev) => ({
          ...prev,
          uptime: Math.floor(
            (new Date().getTime() - startTimeRef.current.getTime()) / 1000
          ),
        }));
      }, 1000);

      return () => {
        disconnect();
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
        }
      };
    } catch (error) {
      console.error("Error initializing RealTimeStreaming:", error);
      setHasError(true);
    }
  }, [disconnect, initAudioContext]); // Removed connect from dependencies

  // Don't auto-reconnect when settings change - let user manually reconnect
  // useEffect(() => {
  //   if (isConnected) {
  //     disconnect();
  //     setTimeout(connect, 1000);
  //   }
  // }, [settings.asset, settings.currency]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getLatestPrice = () => {
    return priceHistory.length > 0 ? priceHistory[0] : null;
  };

  const latestPrice = getLatestPrice();

  const formatMoney = (value?: number) =>
    typeof value === "number" && isFinite(value) ? value.toLocaleString() : "—";

  // Error boundary fallback
  if (hasError) {
    return (
      <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Real-Time Streaming Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              An error occurred in the real-time streaming component. Please
              refresh the page.
            </p>
            <button
              onClick={() => setHasError(false)}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-64">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Live Price
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={togglePause}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {isPaused ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {latestPrice && (
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {settings.currency === "YER" ? "" : "$"}
                {latestPrice.price.toLocaleString()}
              </div>
              <div
                className={`text-sm flex items-center justify-center gap-1 ${
                  latestPrice.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {latestPrice.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {latestPrice.change >= 0 ? "+" : ""}
                {latestPrice.changePercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              connectionMode !== "none"
                ? "bg-green-100 dark:bg-green-900/20"
                : "bg-red-100 dark:bg-red-900/20"
            }`}
          >
            {connectionMode !== "none" ? (
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Real-Time Price Stream
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isPaused
                ? "Paused"
                : connectionMode !== "none"
                ? connectionMode === "polling"
                  ? "Connected (Polling)"
                  : "Connected (SSE)"
                : isConnecting
                ? "Connecting…"
                : "Disconnected (Click WiFi icon to connect)"}{" "}
              • {streamingStats.messagesReceived} updates received
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connectionMode === "none" ? (
            <button
              onClick={connect}
              disabled={isConnecting || connectionMode !== "none"}
              aria-busy={isConnecting}
              className={`p-2 rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 ${
                isConnecting || connectionMode !== "none"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title={
                connectionMode !== "none"
                  ? "Already connected"
                  : isConnecting
                  ? "Connecting…"
                  : "Connect to live stream"
              }
            >
              <Wifi className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
              title="Disconnect WebSocket stream"
            >
              <WifiOff className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={async () => {
              const newSoundEnabled = !soundEnabled;
              setSoundEnabled(newSoundEnabled);
              
              if (newSoundEnabled) {
                // Initialize audio context if it doesn't exist
                if (!audioContextRef.current) {
                  try {
                    audioContextRef.current = new (window.AudioContext ||
                      (window as any).webkitAudioContext)();
                  } catch (error) {
                    console.warn("Audio context not supported:", error);
                    return;
                  }
                }
                
                // Resume audio context if suspended (required for browser autoplay policies)
                await resumeAudioContext();
                
                // Read the current price when sound is enabled
                try {
                  const currentPrice = priceHistory.length > 0 ? priceHistory[0] : null;
                  
                  if (currentPrice) {
                    // Announce the current price directly (bypass soundEnabled check since we just enabled it)
                    if ("speechSynthesis" in window) {
                      // Cancel any ongoing speech
                      window.speechSynthesis.cancel();
                      
                      // Format the price announcement
                      const formattedPrice = currentPrice.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                      
                      const isIncrease = currentPrice.change >= 0;
                      const changeText = Math.abs(currentPrice.change).toFixed(2);
                      const percentText = Math.abs(currentPrice.changePercent).toFixed(2);
                      const direction = isIncrease ? "up" : "down";
                      const currency = currentPrice.currency || settings.currency;
                      
                      // Construct the announcement
                      let announcement = "";
                      if (currency === "YER") {
                        announcement = `Gold price: ${formattedPrice} YER. ${direction} ${changeText}, ${percentText} percent.`;
                      } else {
                        announcement = `Gold price: ${formattedPrice} dollars. ${direction} ${changeText} dollars, ${percentText} percent.`;
                      }
                      
                      // Create and speak
                      const utterance = new SpeechSynthesisUtterance(announcement);
                      utterance.rate = 1.0;
                      utterance.pitch = 1.0;
                      utterance.volume = 1.0;
                      
                      // Try to use a pleasant voice if available
                      const voices = window.speechSynthesis.getVoices();
                      const preferredVoice =
                        voices.find((v) => v.name.includes("Samantha") || v.name.includes("Karen")) ||
                        voices.find((v) => v.lang.startsWith("en")) ||
                        voices[0];
                      if (preferredVoice) {
                        utterance.voice = preferredVoice;
                      }
                      
                      window.speechSynthesis.speak(utterance);
                      console.log(`Current price announced: ${announcement}`);
                    }
                  } else {
                    // No price data available yet, just confirm sound is enabled
                    if ("speechSynthesis" in window) {
                      const utterance = new SpeechSynthesisUtterance("Sound notifications enabled. Waiting for price data.");
                      utterance.rate = 1.0;
                      utterance.volume = 1.0;
                      window.speechSynthesis.speak(utterance);
                      console.log("Announced: Sound notifications enabled. Waiting for price data.");
                    }
                  }
                } catch (error) {
                  console.error("Failed to announce current price:", error);
                }
              }
            }}
            className={`p-2 rounded-lg ${
              soundEnabled ? "text-blue-600" : "text-gray-400"
            }`}
            title={soundEnabled ? "Disable sound" : "Enable sound"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={togglePause}
            className={`p-2 rounded-lg ${
              isPaused ? "text-yellow-600" : "text-green-600"
            }`}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={clearHistory}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-800"
            title="Clear history"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={exportData}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-800"
            title="Export data"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-800"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Connection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Activity className="h-5 w-5 text-blue-500" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {streamingStats.messagesReceived}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Messages
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Clock className="h-5 w-5 text-green-500" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {streamingStats.latency}ms
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Latency
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Zap className="h-5 w-5 text-purple-500" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatUptime(streamingStats.uptime)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Uptime
            </div>
          </div>
        </div>

        {enableCollaboration && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Users className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {collaborationUsers.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Viewers
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Latest Price Display */}
      {latestPrice && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {settings.currency === "YER" ? "" : "$"}
              {formatMoney(latestPrice.price)}
              {settings.currency === "YER" && (
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
                  YER
                </span>
              )}
            </div>
            <div
              className={`flex items-center justify-center gap-2 text-lg ${
                latestPrice.change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {latestPrice.change >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <span>
                {latestPrice.change >= 0 ? "+" : ""}
                {latestPrice.change.toFixed(2)}(
                {latestPrice.changePercent >= 0 ? "+" : ""}
                {latestPrice.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Last updated:{" "}
              {new Date(latestPrice.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Price History */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Recent Updates ({priceHistory.length})
        </h3>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {priceHistory.slice(0, 10).map((update, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    update.change >= 0 ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {settings.currency === "YER" ? "" : "$"}
                    {formatMoney(update.price)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div
                className={`text-sm font-medium ${
                  update.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {update.change >= 0 ? "+" : ""}
                {update.changePercent.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collaboration Users */}
      {enableCollaboration && collaborationUsers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Active Viewers ({collaborationUsers.length})
          </h3>
          <div className="flex items-center gap-2">
            {collaborationUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/20 rounded-full"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800 dark:text-green-200">
                  {user.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Recent Notifications
          </h3>
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
              >
                <Bell className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  {notification}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                Real-Time Streaming (Optional)
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Click the WiFi icon above to connect to live price updates. This
                feature is optional and the application works fully without it.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeStreaming;
