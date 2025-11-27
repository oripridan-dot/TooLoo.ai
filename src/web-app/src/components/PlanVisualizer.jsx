import React from 'react';
import { CheckCircle, Circle, AlertCircle, Loader2 } from 'lucide-react';

const PlanVisualizer = ({ plan }) => {
  if (!plan || !plan.steps) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 my-4 border border-gray-200 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="font-semibold text-lg text-gray-800">Execution Plan</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          plan.status === 'completed' ? 'bg-green-100 text-green-800' :
          plan.status === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {plan.status.toUpperCase()}
        </span>
      </div>
      
      <div className="space-y-3">
        {plan.steps.map((step, index) => (
          <div key={step.id || index} className="flex items-start space-x-3">
            <div className="mt-1">
              {step.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {step.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {step.status === 'running' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
              {step.status === 'pending' && <Circle className="w-5 h-5 text-gray-300" />}
            </div>
            
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                step.status === 'completed' ? 'text-gray-800' :
                step.status === 'running' ? 'text-blue-600' :
                'text-gray-500'
              }`}>
                {step.description}
              </p>
              <div className="text-xs text-gray-400 mt-1 font-mono">
                {step.type}
              </div>
              {step.result && step.status === 'failed' && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                  Error: {step.result.error}
                </div>
              )}
              {step.result && step.status === 'completed' && step.type === 'code:execute' && (
                 <div className="mt-2 p-2 bg-gray-50 text-gray-600 text-xs rounded border border-gray-100 font-mono max-h-20 overflow-y-auto">
                   {step.result.stdout || "Executed successfully"}
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanVisualizer;
