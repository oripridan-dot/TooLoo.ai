// @version 3.3.588
/**
 * @file Unified Development Machine - Single streamlined workflow
 * @intent Consolidate Genesis validation-first approach with Synapsys real-time monitoring
 * @owner cortex
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Unified workflow stages
type WorkflowStage = 
  | 'plan'      // Genesis: Generate plan with coverage gates
  | 'simulate'  // Genesis: Sandbox simulation (confidence ≥ 0.9)
  | 'execute'   // Genesis: Real code generation to filesystem
  | 'monitor'   // Synapsys: Real-time metrics & learning data
  | 'validate'  // Genesis: Gate validation & quality checks
  | 'learn';    // Genesis: Reflection & memory updates

type StageStatus = 'idle' | 'running' | 'ok' | 'warn' | 'fail';

interface UnifiedStage {
  id: WorkflowStage;
  label: string;
  status: StageStatus;
  confidence: number;
  task: string;
  metrics?: any;
  cta?: {
    label: string;
    variant: 'primary' | 'secondary';
    onClick: () => void;
    disabled?: boolean;
  };
}

interface UnifiedDevelopmentMachineProps {
  // Genesis API endpoints
  genesisApiUrl: string;
  // Synapsys API endpoints  
  synapsysApiUrl: string;
  // Real-time socket connection
  socketUrl: string;
}

export const UnifiedDevelopmentMachine: React.FC<UnifiedDevelopmentMachineProps> = ({
  genesisApiUrl,
  synapsysApiUrl,
  socketUrl
}) => {
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('plan');
  const [stages, setStages] = useState<UnifiedStage[]>([]);
  const [session, setSession] = useState<any>(null);
  const [learning, setLearning] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [missionPrompt, setMissionPrompt] = useState('');

  // Initialize unified workflow
  useEffect(() => {
    const initializeStages = () => {
      setStages([
        {
          id: 'plan',
          label: 'Plan',
          status: 'idle',
          confidence: 0,
          task: 'Define mission and generate execution plan',
          cta: {
            label: 'Start Planning',
            variant: 'primary',
            onClick: handlePlan,
            disabled: !missionPrompt.trim()
          }
        },
        {
          id: 'simulate',
          label: 'Simulate',
          status: 'idle', 
          confidence: 0,
          task: 'Run sandbox simulation with confidence validation'
        },
        {
          id: 'execute',
          label: 'Execute',
          status: 'idle',
          confidence: 0,
          task: 'Generate real code to filesystem'
        },
        {
          id: 'monitor',
          label: 'Monitor',
          status: 'idle',
          confidence: 0,
          task: 'Real-time metrics and learning data'
        },
        {
          id: 'validate',
          label: 'Validate',
          status: 'idle',
          confidence: 0,
          task: 'Quality gates and validation checks'
        },
        {
          id: 'learn',
          label: 'Learn',
          status: 'idle',
          confidence: 0,
          task: 'Reflection and memory updates'
        }
      ]);
    };

    initializeStages();
  }, [missionPrompt]);

  // Genesis API integration
  const handlePlan = async () => {
    try {
      setIsProcessing(true);
      setCurrentStage('plan');
      
      // Create Genesis session
      const response = await fetch(`${genesisApiUrl}/api/v2/ade/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: missionPrompt,
          mode: 'producer' 
        })
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        
        // Update plan stage
        updateStageStatus('plan', 'ok', sessionData.planBundle?.readinessScore || 0);
        
        // Auto-advance to simulation if plan is ready
        if (sessionData.planBundle?.readinessScore >= 0.8) {
          await handleSimulate(sessionData);
        }
      }
    } catch (error) {
      updateStageStatus('plan', 'fail', 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulate = async (sessionData?: any) => {
    const targetSession = sessionData || session;
    if (!targetSession) return;

    try {
      setCurrentStage('simulate');
      updateStageStatus('simulate', 'running', 0);

      // Genesis simulation endpoint
      const response = await fetch(`${genesisApiUrl}/api/v2/ade/session/${targetSession.sessionId}/simulate`, {
        method: 'POST'
      });

      if (response.ok) {
        const simResult = await response.json();
        
        // Require confidence ≥ 0.9 (Genesis validation-first principle)
        if (simResult.confidence >= 0.9) {
          updateStageStatus('simulate', 'ok', simResult.confidence);
          await handleExecute(targetSession);
        } else {
          updateStageStatus('simulate', 'warn', simResult.confidence);
          // Require user refinement for low confidence
        }
      }
    } catch (error) {
      updateStageStatus('simulate', 'fail', 0);
    }
  };

  const handleExecute = async (sessionData?: any) => {
    const targetSession = sessionData || session;
    if (!targetSession) return;

    try {
      setCurrentStage('execute');
      updateStageStatus('execute', 'running', 0);

      // Genesis execution - real code generation
      const response = await fetch(`${genesisApiUrl}/api/v2/ade/demo/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: missionPrompt,
          mode: 'producer'
        })
      });

      if (response.ok) {
        const execResult = await response.json();
        updateStageStatus('execute', 'ok', 1.0);
        
        // Auto-advance to monitoring
        await handleMonitor(execResult);
      }
    } catch (error) {
      updateStageStatus('execute', 'fail', 0);
    }
  };

  const handleMonitor = async (execResult?: any) => {
    try {
      setCurrentStage('monitor');
      updateStageStatus('monitor', 'running', 0);

      // Synapsys monitoring - real-time metrics
      const metricsResponse = await fetch(`${synapsysApiUrl}/api/v1/usage/dashboard`);
      const learningResponse = await fetch(`${synapsysApiUrl}/api/v1/routing/models`);
      
      if (metricsResponse.ok && learningResponse.ok) {
        const metrics = await metricsResponse.json();
        const learningData = await learningResponse.json();
        
        setLearning(learningData);
        updateStageStatus('monitor', 'ok', 0.9);
        
        // Auto-advance to validation
        await handleValidate();
      }
    } catch (error) {
      updateStageStatus('monitor', 'fail', 0);
    }
  };

  const handleValidate = async () => {
    try {
      setCurrentStage('validate');
      updateStageStatus('validate', 'running', 0);

      // Genesis validation gates
      if (session?.planBundle?.gates) {
        const gates = session.planBundle.gates;
        const anyFail = gates.some((g: any) => g.status === 'fail');
        const anyWarn = gates.some((g: any) => g.status === 'warn');
        const gateScore = gates.length ? 
          gates.reduce((a: number, g: any) => a + (g.score ?? 0), 0) / gates.length : 0;

        if (anyFail) {
          updateStageStatus('validate', 'fail', gateScore);
        } else if (anyWarn) {
          updateStageStatus('validate', 'warn', gateScore);
        } else {
          updateStageStatus('validate', 'ok', gateScore);
          // Auto-advance to learning
          await handleLearn();
        }
      }
    } catch (error) {
      updateStageStatus('validate', 'fail', 0);
    }
  };

  const handleLearn = async () => {
    try {
      setCurrentStage('learn');
      updateStageStatus('learn', 'running', 0);

      // Genesis learning events + Synapsys metrics
      const learningEvents = await fetch(`${genesisApiUrl}/api/v2/learning/stats`);
      
      if (learningEvents.ok) {
        const events = await learningEvents.json();
        updateStageStatus('learn', 'ok', 0.95);
        
        // Mark workflow complete
        setCurrentStage('plan'); // Ready for next iteration
      }
    } catch (error) {
      updateStageStatus('learn', 'fail', 0);
    }
  };

  // Utility to update stage status
  const updateStageStatus = (stageId: WorkflowStage, status: StageStatus, confidence: number) => {
    setStages(prev => prev.map(stage => 
      stage.id === stageId 
        ? { ...stage, status, confidence }
        : stage
    ));
  };

  // Get stage color based on status
  const getStageColor = (status: StageStatus) => {
    switch (status) {
      case 'ok': return '#10b981';
      case 'running': return '#3b82f6';
      case 'warn': return '#f59e0b';
      case 'fail': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="unified-development-machine h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold">TooLoo Unified Development Machine</h1>
        <p className="text-gray-400 text-sm">Validation-first development with real-time monitoring</p>
      </div>

      {/* Mission Input */}
      <div className="p-4 border-b border-gray-800">
        <textarea
          value={missionPrompt}
          onChange={(e) => setMissionPrompt(e.target.value)}
          placeholder="Describe your development mission..."
          className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white resize-none"
          rows={3}
        />
      </div>

      {/* Unified Workflow */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-6 gap-4 h-full">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              className={`
                bg-gray-800 rounded-lg p-4 border-2 relative
                ${currentStage === stage.id ? 'border-blue-500' : 'border-gray-700'}
              `}
              animate={{
                borderColor: currentStage === stage.id ? '#3b82f6' : '#374151',
                scale: currentStage === stage.id ? 1.02 : 1
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{stage.label}</h3>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStageColor(stage.status) }}
                />
              </div>

              {/* Confidence Meter */}
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">
                  Confidence: {Math.round(stage.confidence * 100)}%
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    animate={{ width: `${stage.confidence * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Task Description */}
              <p className="text-sm text-gray-300 mb-4">{stage.task}</p>

              {/* Action Button */}
              {stage.cta && (
                <button
                  onClick={stage.cta.onClick}
                  disabled={stage.cta.disabled || isProcessing}
                  className={`
                    w-full py-2 px-3 rounded text-sm font-medium
                    ${stage.cta.variant === 'primary' 
                      ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700' 
                      : 'bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800'
                    }
                    disabled:text-gray-500 disabled:cursor-not-allowed
                  `}
                >
                  {isProcessing && currentStage === stage.id 
                    ? 'Processing...' 
                    : stage.cta.label}
                </button>
              )}

              {/* Stage Progress Indicator */}
              {currentStage === stage.id && stage.status === 'running' && (
                <div className="absolute top-2 right-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Real-time Status */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {/* Genesis Session */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Genesis Session</h4>
            <div className="text-sm text-gray-400">
              {session ? (
                <>
                  <p>Session ID: {session.sessionId}</p>
                  <p>Phase: {session.phase}</p>
                  <p>Readiness: {Math.round((session.planBundle?.readinessScore || 0) * 100)}%</p>
                </>
              ) : (
                <p>No active session</p>
              )}
            </div>
          </div>

          {/* Learning Metrics */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Learning Metrics</h4>
            <div className="text-sm text-gray-400">
              {learning ? (
                <>
                  <p>Events: {learning.total || 0}</p>
                  <p>Last: {learning.lastAt ? new Date(learning.lastAt).toLocaleTimeString() : '—'}</p>
                </>
              ) : (
                <p>No learning data yet</p>
              )}
            </div>
          </div>

          {/* Current Operation */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Current Operation</h4>
            <div className="text-sm text-gray-400">
              <p>Stage: {currentStage}</p>
              <p>Status: {isProcessing ? 'Processing' : 'Idle'}</p>
              <p>Machine: Unified TooLoo V3.3</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDevelopmentMachine;