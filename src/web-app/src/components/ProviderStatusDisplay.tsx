// @version 2.2.125
/**
 * ProviderStatusDisplay
 *
 * Shared component for displaying provider status and metrics.
 * Used by NeuralState, CortexMonitor, and Dashboard.
 *
 * @purpose provider-display
 * @version 2.2.125
 */

import React from "react";
import { Server, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import { getProviderLogo } from "./ProviderLogos";

/**
 * Provider metrics data structure
 */
export interface ProviderMetrics {
  name: string;
  provider: string;
  status: "idle" | "processing" | "success" | "error";
  callCount: number;
  successRate: number;
  avgLatencyMs: number;
  confidenceScore: number;
  routingScore?: number;
  isActive?: boolean;
}

/**
 * Display variants
 */
export type DisplayVariant = "compact" | "card" | "inline" | "detailed";

/**
 * Component props
 */
export interface ProviderStatusDisplayProps {
  /**
   * Provider metrics to display
   */
  provider: ProviderMetrics;

  /**
   * Display variant
   * - compact: Small inline display with just name and status indicator
   * - card: Full card with all metrics
   * - inline: Single line with key metrics
   * - detailed: Expanded view with all metrics and history
   */
  variant?: DisplayVariant;

  /**
   * Show provider logo
   */
  showLogo?: boolean;

  /**
   * Show latency bar visualization
   */
  showLatencyBar?: boolean;

  /**
   * Show success rate bar
   */
  showSuccessBar?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Click handler
   */
  onClick?: (provider: ProviderMetrics) => void;
}

/**
 * Status indicator component
 */
const StatusIndicator: React.FC<{
  status: ProviderMetrics["status"];
  size?: "sm" | "md" | "lg";
}> = ({ status, size = "md" }) => {
  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  const statusColors = {
    idle: "bg-gray-400",
    processing: "bg-cyan-400 animate-pulse",
    success: "bg-green-400",
    error: "bg-red-400",
  };

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${statusColors[status]}`}
      title={status}
    />
  );
};

/**
 * Progress bar component
 */
const ProgressBar: React.FC<{
  value: number;
  max?: number;
  color?: string;
  height?: string;
}> = ({ value, max = 1, color = "from-cyan-500 to-blue-500", height = "h-1" }) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${height}`}>
      <div
        className={`${height} bg-gradient-to-r ${color} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

/**
 * Compact variant - minimal display
 */
const CompactDisplay: React.FC<ProviderStatusDisplayProps> = ({
  provider,
  showLogo = true,
  className = "",
}) => (
  <div
    className={`flex items-center gap-2 px-2 py-1 rounded border border-white/10 bg-gray-900/50 ${className}`}
  >
    {showLogo && getProviderLogo(provider.provider, "w-4 h-4 text-gray-400")}
    <span className="text-xs font-mono text-gray-300 uppercase">
      {provider.name}
    </span>
    <StatusIndicator status={provider.status} size="sm" />
  </div>
);

/**
 * Inline variant - single row with key metrics
 */
const InlineDisplay: React.FC<ProviderStatusDisplayProps> = ({
  provider,
  showLogo = true,
  className = "",
}) => (
  <div
    className={`flex items-center justify-between gap-4 px-3 py-2 rounded border border-white/10 bg-gray-900/50 ${className}`}
  >
    <div className="flex items-center gap-2">
      {showLogo && getProviderLogo(provider.provider, "w-5 h-5 text-gray-400")}
      <span className="text-sm font-mono text-gray-300 uppercase">
        {provider.name}
      </span>
      <StatusIndicator status={provider.status} />
    </div>
    <div className="flex items-center gap-4 text-xs text-gray-400">
      <span>{Math.round(provider.successRate * 100)}%</span>
      <span>{provider.avgLatencyMs}ms</span>
      <span>{provider.callCount} calls</span>
    </div>
  </div>
);

/**
 * Card variant - full card with all metrics
 */
const CardDisplay: React.FC<ProviderStatusDisplayProps> = ({
  provider,
  showLogo = true,
  showSuccessBar = true,
  className = "",
  onClick,
}) => {
  const isActive = provider.isActive || provider.status === "processing";

  return (
    <div
      className={`p-3 rounded-lg border text-xs transition-all cursor-pointer hover:bg-gray-800/50 ${
        isActive
          ? "bg-cyan-500/20 border-cyan-500/50"
          : provider.status === "success"
            ? "bg-green-500/10 border-green-500/30"
            : provider.status === "error"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-gray-800/50 border-white/5"
      } ${className}`}
      onClick={() => onClick?.(provider)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {showLogo && (
            <div className="w-6 h-6 flex items-center justify-center">
              {getProviderLogo(
                provider.provider,
                isActive ? "w-5 h-5 text-white" : "w-4 h-4 text-gray-400"
              )}
            </div>
          )}
          <span className="font-mono font-bold text-white uppercase">
            {provider.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {provider.status === "success" && (
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          )}
          {provider.status === "error" && (
            <XCircle className="w-3 h-3 text-red-400" />
          )}
          {isActive && <StatusIndicator status="processing" size="md" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-gray-400 mb-2">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" /> {provider.callCount} calls
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> {Math.round(provider.successRate * 100)}%
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {provider.avgLatencyMs}ms
        </span>
        <span>
          Confidence: {Math.round(provider.confidenceScore * 100)}%
        </span>
      </div>

      {showSuccessBar && (
        <ProgressBar
          value={provider.successRate}
          color={
            provider.successRate > 0.8
              ? "from-green-500 to-emerald-500"
              : provider.successRate > 0.5
                ? "from-yellow-500 to-orange-500"
                : "from-red-500 to-rose-500"
          }
        />
      )}
    </div>
  );
};

/**
 * Detailed variant - expanded view with all info
 */
const DetailedDisplay: React.FC<ProviderStatusDisplayProps> = ({
  provider,
  showLogo = true,
  showSuccessBar = true,
  showLatencyBar = true,
  className = "",
  onClick,
}) => {
  const isActive = provider.isActive || provider.status === "processing";

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isActive
          ? "bg-cyan-500/10 border-cyan-500/30"
          : "bg-gray-900/50 border-white/10"
      } ${className}`}
      onClick={() => onClick?.(provider)}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {showLogo && (
            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
              {getProviderLogo(
                provider.provider,
                isActive ? "w-6 h-6 text-cyan-400" : "w-6 h-6 text-gray-400"
              )}
            </div>
          )}
          <div>
            <h3 className="font-bold text-white uppercase text-sm">
              {provider.name}
            </h3>
            <span className="text-xs text-gray-500 capitalize">
              {provider.status}
            </span>
          </div>
        </div>
        <StatusIndicator status={provider.status} size="lg" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">Success Rate</div>
          <div className="text-lg font-bold text-white">
            {Math.round(provider.successRate * 100)}%
          </div>
          {showSuccessBar && (
            <div className="mt-1">
              <ProgressBar value={provider.successRate} height="h-1.5" />
            </div>
          )}
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">Avg Latency</div>
          <div className="text-lg font-bold text-white">
            {provider.avgLatencyMs}ms
          </div>
          {showLatencyBar && (
            <div className="mt-1">
              <ProgressBar
                value={provider.avgLatencyMs}
                max={5000}
                color="from-blue-500 to-purple-500"
                height="h-1.5"
              />
            </div>
          )}
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">Total Calls</div>
          <div className="text-lg font-bold text-white">
            {provider.callCount.toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">Confidence</div>
          <div className="text-lg font-bold text-white">
            {Math.round(provider.confidenceScore * 100)}%
          </div>
        </div>
      </div>

      {provider.routingScore !== undefined && (
        <div className="bg-gray-800/50 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-500 text-xs">Routing Score</span>
            <span className="text-cyan-400 font-bold text-sm">
              {Math.round(provider.routingScore * 100)}
            </span>
          </div>
          <ProgressBar
            value={provider.routingScore}
            color="from-cyan-500 to-blue-500"
            height="h-2"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Main ProviderStatusDisplay component
 */
const ProviderStatusDisplay: React.FC<ProviderStatusDisplayProps> = (props) => {
  const { variant = "card" } = props;

  switch (variant) {
    case "compact":
      return <CompactDisplay {...props} />;
    case "inline":
      return <InlineDisplay {...props} />;
    case "detailed":
      return <DetailedDisplay {...props} />;
    case "card":
    default:
      return <CardDisplay {...props} />;
  }
};

/**
 * Provider list component for displaying multiple providers
 */
export interface ProviderListProps {
  providers: ProviderMetrics[];
  variant?: DisplayVariant;
  emptyMessage?: string;
  className?: string;
  onProviderClick?: (provider: ProviderMetrics) => void;
}

export const ProviderStatusList: React.FC<ProviderListProps> = ({
  providers,
  variant = "card",
  emptyMessage = "No providers active yet...",
  className = "",
  onProviderClick,
}) => {
  if (!providers || providers.length === 0) {
    return (
      <div className="text-[10px] text-gray-500 italic p-2 rounded border border-white/5 bg-gray-900/20">
        {emptyMessage}
      </div>
    );
  }

  const gridClass =
    variant === "compact" || variant === "inline"
      ? "space-y-2"
      : "grid grid-cols-1 gap-2";

  return (
    <div className={`${gridClass} ${className}`}>
      {providers.map((provider) => (
        <ProviderStatusDisplay
          key={provider.provider}
          provider={provider}
          variant={variant}
          onClick={onProviderClick}
        />
      ))}
    </div>
  );
};

export default ProviderStatusDisplay;
