/**
 * ProviderStatusBadge - Shows data provider health status
 * Checks primary and fallback provider availability
 * Features: Adaptive refresh, status animations, connection quality
 */

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, CheckCircle, Wifi, WifiOff, Signal } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/config';
import { useState, useEffect } from 'react';

export default function ProviderStatusBadge() {
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [hasChanged, setHasChanged] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['provider-status'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/provider/status`);
      return res.data;
    },
    // Adaptive refresh: faster when offline, slower when healthy
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'offline') return 5000;      // 5 seconds when offline
      if (status === 'degraded') return 15000;    // 15 seconds on fallback
      return 30000;                                // 30 seconds when healthy
    },
    staleTime: 5000,
    retry: false, // Don't retry on failure
  });

  // Detect status changes and trigger animation
  useEffect(() => {
    if (data?.status && data.status !== previousStatus && previousStatus !== null) {
      setHasChanged(true);
      const timer = setTimeout(() => setHasChanged(false), 1000);
      return () => clearTimeout(timer);
    }
    if (data?.status) {
      setPreviousStatus(data.status);
    }
  }, [data?.status, previousStatus]);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>Checking...</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const statusConfig = {
    healthy: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Live Data'
    },
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Live Data'
    },
    degraded: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'Fallback'
    },
    offline: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Offline'
    }
  } as const;

  const config = statusConfig[data.status as keyof typeof statusConfig] ?? statusConfig.healthy;
  
  // Determine which source is active
  const activeSource = data.primary?.available ? 'Primary' : 
                      data.fallback?.available ? 'Fallback' : 
                      'None';
  
  const latency = data.primary?.available ? data.primary.latency : 
                 data.fallback?.available ? data.fallback.latency : 
                 null;

  // Connection quality based on latency
  const getConnectionQuality = () => {
    if (!latency) return null;
    if (latency < 100) return { level: 'excellent', bars: 3, color: 'text-green-600' };
    if (latency < 300) return { level: 'good', bars: 2, color: 'text-yellow-600' };
    return { level: 'poor', bars: 1, color: 'text-orange-600' };
  };

  const quality = getConnectionQuality();

  return (
    <div 
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
        ${config.bg} ${config.text}
        transition-all duration-300
        ${hasChanged ? 'scale-110 ring-2 ring-offset-1 ring-current' : 'scale-100'}
      `}
      title={`${activeSource} provider • ${latency ? `${latency}ms (${quality?.level})` : 'No connection'}`}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
      
      {/* Latency with quality indicator */}
      {latency && (
        <div className="hidden md:inline-flex items-center gap-1">
          <span className="text-[10px] opacity-75">
            {latency}ms
          </span>
          {/* Connection quality bars */}
          {quality && (
            <div className="flex items-end gap-[1px] h-3">
              {[1, 2, 3].map((bar) => (
                <div
                  key={bar}
                  className={`w-[2px] rounded-full transition-all ${
                    bar <= quality.bars
                      ? `${quality.color} opacity-100`
                      : 'bg-gray-400 opacity-30'
                  }`}
                  style={{ height: `${bar * 33}%` }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Pulse animation when checking */}
      {isLoading && (
        <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
      )}
    </div>
  );
}

