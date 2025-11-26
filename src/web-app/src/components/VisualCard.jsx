import React from 'react';
import { Info, Activity, BarChart2, CheckCircle, Layers } from 'lucide-react';

const VisualCard = ({ type, data }) => {
  if (!data) return null;

  const renderContent = () => {
    switch (type) {
      case 'info':
        return (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{data.title}</h3>
                <p className="text-gray-300 text-sm">{data.description}</p>
                {data.details && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(data.details).map(([key, value]) => (
                      <div key={key} className="bg-black/20 p-2 rounded">
                        <span className="text-xs text-gray-400 uppercase">{key}</span>
                        <div className="text-sm text-white font-mono">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'process':
        return (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="mr-2 text-green-400" size={20} />
              {data.title}
            </h3>
            <div className="space-y-4">
              {data.steps?.map((step, index) => (
                <div key={index} className="relative flex items-start group">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 font-bold text-sm">
                      {index + 1}
                    </div>
                    {index < data.steps.length - 1 && (
                      <div className="w-0.5 h-12 bg-white/10 group-hover:bg-green-500/30 transition-colors" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <h4 className="text-white font-medium">{step.title}</h4>
                    {step.description && (
                      <p className="text-gray-400 text-sm mt-1">{step.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Layers className="mr-2 text-purple-400" size={20} />
                {data.title}
              </h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/10">
              {data.items?.map((item, idx) => (
                <div key={idx} className="p-4">
                  <h4 className="text-purple-300 font-medium mb-2 text-center">{item.name}</h4>
                  <ul className="space-y-2">
                    {item.features?.map((feature, fIdx) => (
                      <li key={fIdx} className="text-sm text-gray-300 flex items-start">
                        <CheckCircle size={14} className="mr-2 mt-1 text-green-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
             <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BarChart2 className="mr-2 text-blue-400" size={20} />
              {data.title}
            </h3>
            <div className="space-y-3">
              {data.metrics?.map((metric, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{metric.label}</span>
                    <span className="text-white font-mono">{metric.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div className="text-red-400">Unknown visual type: {type}</div>;
    }
  };

  return (
    <div className="my-4 w-full max-w-2xl animate-fade-in">
      {renderContent()}
    </div>
  );
};

export default VisualCard;
