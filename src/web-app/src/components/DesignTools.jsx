// @version 2.1.336
import React, { useState } from 'react';
import { Globe, Figma, Download, Loader2 } from 'lucide-react';

const DesignTools = () => {
  const [extractUrl, setExtractUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);

  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!extractUrl) return;
    
    setIsExtracting(true);
    setExtractionResult(null);
    
    try {
      const res = await fetch('/api/v1/design/extract-from-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: extractUrl })
      });
      const data = await res.json();
      if (data.ok) {
        setExtractionResult(data);
      } else {
        alert('Extraction failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Extraction error: ' + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFigmaImport = async (e) => {
    e.preventDefault();
    if (!figmaUrl) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/v1/design/import-figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figmaUrl, apiToken: figmaToken })
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult(data);
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Import error: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Website Extractor */}
      <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Extract from URL</h3>
        </div>
        <form onSubmit={handleExtract} className="space-y-4">
          <input
            type="url"
            value={extractUrl}
            onChange={(e) => setExtractUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
          <button
            type="submit"
            disabled={isExtracting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Extract Design System
          </button>
        </form>
        
        {extractionResult && (
          <div className="mt-4 p-4 bg-[#0f1117] rounded-lg border border-gray-800">
            <div className="text-xs text-green-400 mb-2">Extraction Successful</div>
            <div className="grid grid-cols-5 gap-2">
              {Object.values(extractionResult.tokens?.colors || {}).map((color, i) => (
                <div key={i} className="h-6 rounded" style={{ backgroundColor: color }} title={color}></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Figma Import */}
      <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Figma className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Figma Import</h3>
        </div>
        <form onSubmit={handleFigmaImport} className="space-y-4">
          <input
            type="url"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            placeholder="Figma File URL"
            className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            required
          />
          <input
            type="password"
            value={figmaToken}
            onChange={(e) => setFigmaToken(e.target.value)}
            placeholder="Access Token (Optional)"
            className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={isImporting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Import from Figma
          </button>
        </form>

        {importResult && (
          <div className="mt-4 p-4 bg-[#0f1117] rounded-lg border border-gray-800">
            <div className="text-xs text-green-400 mb-2">Import Successful</div>
            <div className="text-xs text-gray-400">
              Imported {Object.keys(importResult.designSystem?.colors || {}).length} styles from {importResult.metadata?.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignTools;
