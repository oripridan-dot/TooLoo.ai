// CHANGE: Enhance ThinkingProgress component with director-specific features
import React from 'react';

const ThinkingProgress = ({ currentStep, totalSteps, isActive }) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  
  return (
    <div className="thinking-progress">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Current Step</span>
        <span className="text-xs text-gray-500">
          {steps.findIndex(step => step === Math.ceil((steps.length / totalSteps) * steps.length)) + 1} of {totalSteps}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: isActive ? `${(steps.length / totalSteps) * 100}%` : '0%'
          }}
        ></div>
      </div>
      
      {/* Step Indicators */}
      <div className="flex justify-between relative">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium z-10 ${
              index < steps.length ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step}
            </div>
            {index === Math.floor(steps.length / 2) && currentStep && (
              <div className="mt-2 text-xs text-center text-blue-600 font-medium max-w-24">
                {currentStep}
              </div>
            )}
          </div>
        ))}
        
        {/* Connecting Line */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-300 -z-10"></div>
      </div>
    </div>
  );
};

export default ThinkingProgress;