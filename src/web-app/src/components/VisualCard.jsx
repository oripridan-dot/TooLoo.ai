// @version 2.1.385
import React, { useEffect, useRef, useState } from "react";
import { Info, Activity, BarChart2, CheckCircle, Layers, Download, Copy, Maximize2 } from "lucide-react";

const DiagramRenderer = ({ code }) => {
  const mermaidRef = useRef(null);

  useEffect(() => {
    /* eslint-disable-next-line no-undef */
    if (mermaidRef.current && typeof window !== "undefined" && window.mermaid) {
      /* eslint-disable-next-line no-undef */
      window.mermaid.contentLoaded();
    }
  }, [code]);

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 overflow-auto max-h-96"
      ref={mermaidRef}
    >
      <div className="mermaid">{code}</div>
    </div>
  );
};

// Image Modal for fullscreen viewing
const ImageModal = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 bg-gray-800 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xl transition z-10"
        >
          ×
        </button>
        <img 
          src={src} 
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="mt-4 text-center text-gray-400 text-sm">{alt || 'Generated Image'}</div>
      </div>
    </div>
  );
};

const VisualCard = ({ type, data }) => {
  const [showModal, setShowModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);

  if (!data) return null;

  // Handle diagram type at component level (before switch)
  if (type === "diagram") {
    const diagramCode = typeof data === "string" ? data : data.code;
    return (
      <div className="my-4 w-full max-w-2xl animate-fade-in">
        <DiagramRenderer code={diagramCode} />
      </div>
    );
  }

  // Handle image type
  if (type === "image") {
    const imageSrc = typeof data === "string" ? data : (data.src || data.url || data.data);
    const imageAlt = typeof data === "object" ? (data.alt || data.prompt || 'Generated Image') : 'Generated Image';
    const mimeType = typeof data === "object" ? (data.mimeType || 'image/png') : 'image/png';
    
    // Build the full data URL if needed
    const fullSrc = imageSrc.startsWith('data:') ? imageSrc : `data:${mimeType};base64,${imageSrc}`;
    
    const downloadImage = () => {
      const link = document.createElement('a');
      link.href = fullSrc;
      link.download = `tooloo-generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const copyImage = async () => {
      try {
        const response = await fetch(fullSrc);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        setCopyFeedback('Copied!');
        setTimeout(() => setCopyFeedback(null), 2000);
      } catch (err) {
        console.error('Failed to copy image:', err);
        try {
          await navigator.clipboard.writeText(fullSrc);
          setCopyFeedback('Copied as URL');
          setTimeout(() => setCopyFeedback(null), 2000);
        } catch (e) {
          setCopyFeedback('Failed');
          setTimeout(() => setCopyFeedback(null), 2000);
        }
      }
    };

    return (
      <div className="my-4 w-full max-w-2xl animate-fade-in">
        <div className="rounded-xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl">
          {/* Header */}
          <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
            <span className="text-cyan-400">🎨</span>
            <span className="text-sm font-medium text-white">{imageAlt}</span>
            <span className="ml-auto text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">AI Generated</span>
          </div>
          
          {/* Image */}
          <div className="p-4">
            <img 
              src={fullSrc} 
              alt={imageAlt}
              className="w-full max-h-[512px] object-contain rounded-lg cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={() => setShowModal(true)}
            />
          </div>
          
          {/* Actions */}
          <div className="px-4 pb-3 flex gap-2">
            <button 
              onClick={downloadImage}
              className="flex-1 px-3 py-2 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download
            </button>
            <button 
              onClick={copyImage}
              className="flex-1 px-3 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Copy size={16} /> {copyFeedback || 'Copy'}
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="px-3 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition flex items-center justify-center"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
        
        {/* Fullscreen Modal */}
        {showModal && (
          <ImageModal 
            src={fullSrc} 
            alt={imageAlt} 
            onClose={() => setShowModal(false)} 
          />
        )}
      </div>
    );
  }

  const renderContent = () => {
    switch (type) {
      case "info":
        return (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {data.title}
                </h3>
                <p className="text-gray-300 text-sm">{data.description}</p>
                {data.details && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(data.details).map(([key, value]) => (
                      <div key={key} className="bg-black/20 p-2 rounded">
                        <span className="text-xs text-gray-400 uppercase">
                          {key}
                        </span>
                        <div className="text-sm text-white font-mono">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "process":
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
                      <p className="text-gray-400 text-sm mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "comparison":
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
                  <h4 className="text-purple-300 font-medium mb-2 text-center">
                    {item.name}
                  </h4>
                  <ul className="space-y-2">
                    {item.features?.map((feature, fIdx) => (
                      <li
                        key={fIdx}
                        className="text-sm text-gray-300 flex items-start"
                      >
                        <CheckCircle
                          size={14}
                          className="mr-2 mt-1 text-green-500 shrink-0"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );

      case "data":
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
                    <span className="text-white font-mono">
                      {metric.value}%
                    </span>
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

      case "diagram": {
        /* eslint-disable-next-line no-undef */
        const mermaidRef = useRef(null);
        /* eslint-disable-next-line no-undef */
        useEffect(() => {
          if (
            mermaidRef.current &&
            typeof window !== "undefined" &&
            window.mermaid
          ) {
            window.mermaid.contentLoaded();
          }
        }, [data]);

        return (
          <div
            className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 overflow-auto max-h-96"
            ref={mermaidRef}
          >
            <div className="mermaid">
              {typeof data === "string" ? data : data.code}
            </div>
          </div>
        );
      }

      case "code": {
        const codeContent =
          typeof data === "string"
            ? data
            : data.code || data.content || JSON.stringify(data, null, 2);
        const copyCode = () => {
          /* eslint-disable-next-line no-undef */
          if (typeof window !== "undefined" && window.navigator?.clipboard) {
            /* eslint-disable-next-line no-undef */
            window.navigator.clipboard.writeText(codeContent);
          }
        };
        return (
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-full">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
              <span className="text-sm font-mono text-gray-400">
                {data.language || data.framework || "code"}
              </span>
              <button
                onClick={copyCode}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-4 max-h-96">
              <code className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                {codeContent}
              </code>
            </pre>
          </div>
        );
      }

      default: {
        if (
          typeof data === "string" &&
          (data.includes("{") ||
            data.includes("<") ||
            data.includes("function") ||
            data.includes("const "))
        ) {
          const copyCode = () => {
            /* eslint-disable-next-line no-undef */
            if (typeof window !== "undefined" && window.navigator?.clipboard) {
              /* eslint-disable-next-line no-undef */
              window.navigator.clipboard.writeText(data);
            }
          };
          return (
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-full">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                <span className="text-sm font-mono text-gray-400">code</span>
                <button
                  onClick={copyCode}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto p-4 max-h-96">
                <code className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {data}
                </code>
              </pre>
            </div>
          );
        }
        return (
          <div className="text-red-400 text-sm p-4 bg-red-900/20 rounded border border-red-700">
            Unknown visual type: {type}
          </div>
        );
      }
    }
  };

  return (
    <div className="my-4 w-full max-w-2xl animate-fade-in">
      {renderContent()}
    </div>
  );
};

export default VisualCard;
