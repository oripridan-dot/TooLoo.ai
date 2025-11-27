// @version 2.2.16
import React, { useMemo } from 'react';
import VisualCard from './VisualCard';

const VisualRegistry = ({ type, data }) => {
  const parsedData = useMemo(() => {
    if (!data) return null;
    
    if (typeof data === 'string') {
      // Don't parse for types that expect strings
      if (['diagram', 'code', 'markdown', 'text'].includes(type)) {
        return data;
      }
      
      // For image, it might be a URL or base64 string, or a JSON object with src/alt
      if (type === 'image') {
         if (data.trim().startsWith('{')) {
             try { return JSON.parse(data); } catch { return data; }
         }
         return data;
      }
      
      // For other types (info, process, comparison, data), try to parse
      try {
        return JSON.parse(data);
      } catch (e) {
        console.warn(`[VisualRegistry] Failed to parse data for type ${type}`, e);
        return data;
      }
    }
    return data;
  }, [data, type]);

  if (!parsedData) return null;

  return <VisualCard type={type} data={parsedData} />;
};

export default VisualRegistry;
