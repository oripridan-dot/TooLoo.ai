/**
 * @file SkillMetricsDashboard.tsx
 * @description Enhanced AI Skill Performance Dashboard with real-time updates,
 *              export functionality (CSV/PDF/JSON), and trend charts
 * @version 1.0.0
 * @skill-os true
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  LineChart,
  FileText,
  FileSpreadsheet,
  Share2,
  Bell,
  X,
  ChevronDown,
  Activity,
  Target,
  Brain,
  Code,
  MessageSquare,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// =============================================================================
// TYPES
// =============================================================================

interface SkillMetric {
  id: string;
  name: string;
  executions: number;
  successRate: number;
  avgLatency: number;
  qualityScore: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
  category: 'core' | 'analysis' | 'communication' | 'technical' | 'meta';
  history: PerformancePoint[];
}

interface PerformancePoint {
  timestamp: number;
  qualityScore: number;
  successRate: number;
  avgLatency: number;
  executions: number;
}

interface DashboardFilters {
  category: string;
  minQuality: number;
  sortBy: keyof SkillMetric;
  sortOrder: 'asc' | 'desc';
  timeRange: '1h' | '24h' | '7d' | '30d';
}

// =============================================================================
// EXPORT SERVICE
// =============================================================================

const ExportService = {
  exportToCSV(skills: SkillMetric[], filename = 'skill-metrics.csv') {
    const headers = ['Name', 'Category', 'Executions', 'Success Rate', 'Avg Latency', 'Quality Score', 'Trend', 'Last Updated'];
    const rows = skills.map(skill => [
      skill.name,
      skill.category,
      skill.executions.toString(),
      (skill.successRate * 100).toFixed(2) + '%',
      skill.avgLatency.toFixed(2) + 's',
      skill.qualityScore.toFixed(3),
      skill.trend,
      new Date(skill.lastUpdated).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  async exportToPDF(skills: SkillMetric[], filename = 'skill-metrics.pdf') {
    // Dynamic import for jsPDF (code splitting)
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text('AI Skill Performance Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    // Summary box
    const totalExecutions = skills.reduce((sum, skill) => sum + skill.executions, 0);
    const avgQuality = skills.reduce((sum, skill) => sum + skill.qualityScore, 0) / skills.length;
    const avgSuccess = skills.reduce((sum, skill) => sum + skill.successRate, 0) / skills.length;
    
    doc.setFillColor(240, 249, 255);
    doc.rect(14, 35, 182, 25, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text('Summary', 18, 43);
    
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(`Total Skills: ${skills.length}`, 18, 51);
    doc.text(`Total Executions: ${totalExecutions.toLocaleString()}`, 70, 51);
    doc.text(`Avg Quality: ${(avgQuality * 100).toFixed(1)}%`, 130, 51);
    doc.text(`Avg Success: ${(avgSuccess * 100).toFixed(1)}%`, 165, 51);
    
    // Table
    const tableData = skills.map(skill => [
      skill.name,
      skill.category,
      skill.executions.toString(),
      (skill.successRate * 100).toFixed(1) + '%',
      skill.avgLatency.toFixed(2) + 's',
      (skill.qualityScore * 100).toFixed(1) + '%',
      skill.trend === 'up' ? '↑' : skill.trend === 'down' ? '↓' : '→'
    ]);

    autoTable(doc, {
      head: [['Skill', 'Category', 'Runs', 'Success', 'Latency', 'Quality', 'Trend']],
      body: tableData,
      startY: 65,
      theme: 'striped',
      headStyles: { 
        fillColor: [30, 64, 175],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 15, halign: 'center' }
      }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`TooLoo.ai Skills OS - Page ${i} of ${pageCount}`, 14, 290);
    }

    doc.save(filename);
  },

  exportToJSON(skills: SkillMetric[], filename = 'skill-metrics.json') {
    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      skills: skills.map(skill => ({
        ...skill,
        lastUpdated: new Date(skill.lastUpdated).toISOString()
      })),
      summary: {
        totalSkills: skills.length,
        totalExecutions: skills.reduce((sum, skill) => sum + skill.executions, 0),
        averageQuality: skills.reduce((sum, skill) => sum + skill.qualityScore, 0) / skills.length,
        averageSuccessRate: skills.reduce((sum, skill) => sum + skill.successRate, 0) / skills.length,
        averageLatency: skills.reduce((sum, skill) => sum + skill.avgLatency, 0) / skills.length
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
};

// =============================================================================
// MOCK DATA GENERATOR
// =============================================================================

function generateMockSkills(): SkillMetric[] {
  const skills: SkillMetric[] = [
    { id: 'self-awareness', name: 'Self-Awareness', category: 'meta', executions: 142, successRate: 0.98, avgLatency: 0.4, qualityScore: 0.96, trend: 'up' },
    { id: 'coding-assistant', name: 'Coding Assistant', category: 'technical', executions: 1247, successRate: 0.95, avgLatency: 2.1, qualityScore: 0.93, trend: 'up' },
    { id: 'architect', name: 'System Architect', category: 'technical', executions: 89, successRate: 0.97, avgLatency: 3.2, qualityScore: 0.94, trend: 'stable' },
    { id: 'research-analyst', name: 'Research Analyst', category: 'analysis', executions: 234, successRate: 0.92, avgLatency: 4.5, qualityScore: 0.89, trend: 'up' },
    { id: 'memory', name: 'Memory System', category: 'core', executions: 3421, successRate: 0.99, avgLatency: 0.1, qualityScore: 0.97, trend: 'up' },
    { id: 'routing', name: 'Intent Router', category: 'core', executions: 5678, successRate: 0.94, avgLatency: 0.05, qualityScore: 0.91, trend: 'stable' },
    { id: 'emergence', name: 'Emergence Engine', category: 'meta', executions: 56, successRate: 0.89, avgLatency: 5.2, qualityScore: 0.85, trend: 'up' },
    { id: 'learning', name: 'Learning Engine', category: 'meta', executions: 312, successRate: 0.91, avgLatency: 1.8, qualityScore: 0.88, trend: 'up' },
    { id: 'test-generator', name: 'Test Generator', category: 'technical', executions: 178, successRate: 0.93, avgLatency: 2.8, qualityScore: 0.90, trend: 'stable' },
    { id: 'documentation', name: 'Doc Writer', category: 'communication', executions: 423, successRate: 0.96, avgLatency: 3.1, qualityScore: 0.92, trend: 'up' },
  ];

  // Generate historical data for each skill
  return skills.map(skill => ({
    ...skill,
    lastUpdated: new Date(),
    history: generateHistory(skill, 30)
  }));
}

function generateHistory(skill: SkillMetric, days: number): PerformancePoint[] {
  const history: PerformancePoint[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days; i >= 0; i--) {
    const variance = () => (Math.random() - 0.5) * 0.1;
    history.push({
      timestamp: now - (i * dayMs),
      qualityScore: Math.max(0.5, Math.min(1, skill.qualityScore + variance())),
      successRate: Math.max(0.7, Math.min(1, skill.successRate + variance())),
      avgLatency: Math.max(0.1, skill.avgLatency + variance() * 2),
      executions: Math.max(0, Math.floor(skill.executions / days + (Math.random() - 0.5) * 20))
    });
  }
  return history;
}

// =============================================================================
// COMPONENTS
// =============================================================================

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const icons: Record<string, React.ReactNode> = {
    core: <Activity className="w-4 h-4" />,
    meta: <Brain className="w-4 h-4" />,
    technical: <Code className="w-4 h-4" />,
    analysis: <Target className="w-4 h-4" />,
    communication: <MessageSquare className="w-4 h-4" />,
  };
  return <>{icons[category] || <Zap className="w-4 h-4" />}</>;
};

const QualityBadge: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score >= 0.9) return 'bg-emerald-500';
    if (score >= 0.8) return 'bg-amber-500';
    return 'bg-rose-500';
  };
  return <div className={`w-3 h-3 rounded-full ${getColor()} shadow-lg`} />;
};

const TrendIcon: React.FC<{ trend: SkillMetric['trend'] }> = ({ trend }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
  return <div className="w-4 h-4 border-b-2 border-gray-400" />;
};

// Skill Card Component
const SkillCard: React.FC<{
  skill: SkillMetric;
  onViewTrends: (id: string) => void;
}> = ({ skill, onViewTrends }) => {
  return (
    <div className="group relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
      {/* Quality indicator */}
      <div className="absolute top-4 right-4">
        <QualityBadge score={skill.qualityScore} />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gray-700/50 text-blue-400">
          <CategoryIcon category={skill.category} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{skill.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize">
            {skill.category}
          </span>
        </div>
        <TrendIcon trend={skill.trend} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center text-xs text-gray-400 mb-1">
            <Zap className="w-3 h-3 mr-1" />
            Executions
          </div>
          <div className="text-lg font-bold text-white">
            {skill.executions.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="flex items-center text-xs text-gray-400 mb-1">
            <BarChart3 className="w-3 h-3 mr-1" />
            Success
          </div>
          <div className={`text-lg font-bold ${skill.successRate >= 0.9 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {(skill.successRate * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="flex items-center text-xs text-gray-400 mb-1">
            <Clock className="w-3 h-3 mr-1" />
            Latency
          </div>
          <div className="text-lg font-bold text-white">
            {skill.avgLatency.toFixed(1)}s
          </div>
        </div>
        <div>
          <div className="flex items-center text-xs text-gray-400 mb-1">
            <Target className="w-3 h-3 mr-1" />
            Quality
          </div>
          <div className="text-lg font-bold text-white">
            {(skill.qualityScore * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              skill.qualityScore >= 0.9 ? 'bg-emerald-500' :
              skill.qualityScore >= 0.8 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${skill.qualityScore * 100}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => onViewTrends(skill.id)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          <LineChart className="w-3 h-3" />
          View Trends
        </button>
        <span className="text-xs text-gray-500">
          {new Date(skill.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

// Trend Chart Modal
const TrendChartModal: React.FC<{
  skill: SkillMetric | null;
  timeRange: DashboardFilters['timeRange'];
  onClose: () => void;
  onTimeRangeChange: (range: DashboardFilters['timeRange']) => void;
}> = ({ skill, timeRange, onClose, onTimeRangeChange }) => {
  if (!skill) return null;

  const getDataPoints = () => {
    const ranges: Record<DashboardFilters['timeRange'], number> = {
      '1h': 12,
      '24h': 24,
      '7d': 7,
      '30d': 30
    };
    return skill.history.slice(-ranges[timeRange]);
  };

  const dataPoints = getDataPoints();
  
  const chartData = {
    labels: dataPoints.map((p, i) => {
      if (timeRange === '1h') return `${i * 5}m`;
      if (timeRange === '24h') return `${i}h`;
      return `Day ${i + 1}`;
    }),
    datasets: [
      {
        label: 'Quality Score',
        data: dataPoints.map(p => p.qualityScore * 100),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: 'Success Rate',
        data: dataPoints.map(p => p.successRate * 100),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9ca3af', font: { size: 11 } }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        min: 70,
        max: 100,
        ticks: { color: '#6b7280', callback: (v: number) => `${v}%` },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      },
      x: {
        ticks: { color: '#6b7280', maxRotation: 0 },
        grid: { color: 'rgba(75, 85, 99, 0.2)' }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{skill.name}</h2>
              <p className="text-sm text-gray-400">Performance Trends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Time range selector */}
        <div className="flex gap-2 p-4 border-b border-gray-800">
          {(['1h', '24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="p-4 h-80">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Stats footer */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800/50 border-t border-gray-700">
          <div className="text-center">
            <div className="text-xs text-gray-400">Avg Quality</div>
            <div className="text-lg font-bold text-blue-400">
              {(dataPoints.reduce((s, p) => s + p.qualityScore, 0) / dataPoints.length * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Avg Success</div>
            <div className="text-lg font-bold text-emerald-400">
              {(dataPoints.reduce((s, p) => s + p.successRate, 0) / dataPoints.length * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Avg Latency</div>
            <div className="text-lg font-bold text-amber-400">
              {(dataPoints.reduce((s, p) => s + p.avgLatency, 0) / dataPoints.length).toFixed(2)}s
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Total Runs</div>
            <div className="text-lg font-bold text-white">
              {dataPoints.reduce((s, p) => s + p.executions, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function SkillMetricsDashboard() {
  const [skills, setSkills] = useState<SkillMetric[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    category: 'all',
    minQuality: 0.7,
    sortBy: 'qualityScore',
    sortOrder: 'desc',
    timeRange: '24h'
  });
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    setSkills(generateMockSkills());
  }, []);

  // Real-time updates simulation
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setSkills(prev => {
        const updated = [...prev];
        const randomIndex = Math.floor(Math.random() * updated.length);
        const skill = updated[randomIndex];
        
        // Random metric changes
        const newQuality = Math.max(0.7, Math.min(1, skill.qualityScore + (Math.random() - 0.5) * 0.02));
        const newSuccess = Math.max(0.8, Math.min(1, skill.successRate + (Math.random() - 0.5) * 0.01));
        const newLatency = Math.max(0.05, skill.avgLatency + (Math.random() - 0.5) * 0.1);
        const newExecutions = skill.executions + Math.floor(Math.random() * 5);

        // Determine trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (newQuality > skill.qualityScore + 0.01) trend = 'up';
        else if (newQuality < skill.qualityScore - 0.01) trend = 'down';

        updated[randomIndex] = {
          ...skill,
          qualityScore: newQuality,
          successRate: newSuccess,
          avgLatency: newLatency,
          executions: newExecutions,
          trend,
          lastUpdated: new Date(),
          history: [
            ...skill.history.slice(1),
            {
              timestamp: Date.now(),
              qualityScore: newQuality,
              successRate: newSuccess,
              avgLatency: newLatency,
              executions: newExecutions
            }
          ]
        };

        return updated;
      });
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Filter and sort skills
  const filteredSkills = useMemo(() => {
    return skills
      .filter(skill => {
        if (filters.category !== 'all' && skill.category !== filters.category) return false;
        if (skill.qualityScore < filters.minQuality) return false;
        return true;
      })
      .sort((a, b) => {
        const aVal = a[filters.sortBy];
        const bVal = b[filters.sortBy];
        const modifier = filters.sortOrder === 'asc' ? 1 : -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * modifier;
        }
        return 0;
      });
  }, [skills, filters]);

  // Summary stats
  const stats = useMemo(() => ({
    total: skills.length,
    avgQuality: skills.reduce((s, sk) => s + sk.qualityScore, 0) / skills.length,
    avgSuccess: skills.reduce((s, sk) => s + sk.successRate, 0) / skills.length,
    avgLatency: skills.reduce((s, sk) => s + sk.avgLatency, 0) / skills.length,
    totalExecutions: skills.reduce((s, sk) => s + sk.executions, 0),
  }), [skills]);

  // Export handlers
  const handleExport = useCallback((format: 'csv' | 'pdf' | 'json') => {
    try {
      switch (format) {
        case 'csv':
          ExportService.exportToCSV(filteredSkills);
          break;
        case 'pdf':
          ExportService.exportToPDF(filteredSkills);
          break;
        case 'json':
          ExportService.exportToJSON(filteredSkills);
          break;
      }
      setNotifications(prev => [`✅ Exported ${filteredSkills.length} skills to ${format.toUpperCase()}`, ...prev.slice(0, 4)]);
    } catch (err) {
      setNotifications(prev => [`❌ Export failed: ${err}`, ...prev.slice(0, 4)]);
    }
    setShowExportMenu(false);
  }, [filteredSkills]);

  const selectedSkill = selectedSkillId ? skills.find(s => s.id === selectedSkillId) : null;

  return (
    <div className="h-full bg-gray-900 text-white overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI Skill Performance Dashboard
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                {isLive ? 'Live' : 'Paused'}
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isLive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Activity className="w-4 h-4" />
              {isLive ? 'Live' : 'Start'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20 overflow-hidden">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    CSV (Excel)
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-rose-400" />
                    PDF Report
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-blue-400" />
                    JSON Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.map((note, i) => (
              <div key={i} className="flex items-center justify-between bg-blue-900/30 border border-blue-700/50 rounded-lg px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-400" />
                  {note}
                </div>
                <button onClick={() => setNotifications(prev => prev.filter((_, idx) => idx !== i))}>
                  <X className="w-4 h-4 text-gray-500 hover:text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Total Skills</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Avg Quality</div>
            <div className="text-2xl font-bold text-blue-400">{(stats.avgQuality * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Avg Success</div>
            <div className="text-2xl font-bold text-emerald-400">{(stats.avgSuccess * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Avg Latency</div>
            <div className="text-2xl font-bold text-amber-400">{stats.avgLatency.toFixed(2)}s</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Total Executions</div>
            <div className="text-2xl font-bold text-purple-400">{stats.totalExecutions.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/30 rounded-xl p-4 mb-6 border border-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4 text-blue-400" />
              Filters
            </div>
            <span className="text-xs text-gray-500">
              Showing {filteredSkills.length} of {skills.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="core">Core</option>
                <option value="meta">Meta</option>
                <option value="technical">Technical</option>
                <option value="analysis">Analysis</option>
                <option value="communication">Communication</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Min Quality: {(filters.minQuality * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filters.minQuality}
                onChange={e => setFilters(f => ({ ...f, minQuality: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as keyof SkillMetric }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="qualityScore">Quality Score</option>
                <option value="successRate">Success Rate</option>
                <option value="avgLatency">Latency</option>
                <option value="executions">Executions</option>
                <option value="name">Name</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Order</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters(f => ({ ...f, sortOrder: 'desc' }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filters.sortOrder === 'desc' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  ↓ Desc
                </button>
                <button
                  onClick={() => setFilters(f => ({ ...f, sortOrder: 'asc' }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filters.sortOrder === 'asc' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  ↑ Asc
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onViewTrends={setSelectedSkillId}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
          <div className="text-xs font-medium text-gray-400 mb-3">Performance Indicators</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Excellent (≥90%)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              Good (80-90%)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              Needs Attention (&lt;80%)
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart Modal */}
      {selectedSkill && (
        <TrendChartModal
          skill={selectedSkill}
          timeRange={filters.timeRange}
          onClose={() => setSelectedSkillId(null)}
          onTimeRangeChange={range => setFilters(f => ({ ...f, timeRange: range }))}
        />
      )}
    </div>
  );
}
