// Multi-modal Validation System for TooLoo.ai
// Handles image analysis, document processing, and content validation

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

class MultiModalValidator {
  constructor() {
    this.supportedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    this.supportedDocTypes = ['pdf', 'txt', 'md', 'doc', 'docx'];
    this.ocrEndpoint = 'https://api.ocr.space/parse/image'; // Free OCR service
    this.maxFileSize = 5 * 1024 * 1024; // 5MB limit
  }

  async validateImage({ imageUrl, imageBuffer, prompt, context = {} }) {
    try {
      let ocrResult = null;
      let imageAnalysis = null;

      // Extract text from image using OCR
      if (imageUrl || imageBuffer) {
        ocrResult = await this.performOCR({ imageUrl, imageBuffer });
      }

      // Analyze image content with vision-capable model
      if (process.env.OPENAI_API_KEY) {
        imageAnalysis = await this.analyzeImageWithVision({ 
          imageUrl, 
          imageBuffer, 
          prompt, 
          extractedText: ocrResult?.text 
        });
      }

      // Cross-validate OCR text with AI analysis
      const validation = this.crossValidateImageContent(ocrResult, imageAnalysis, prompt);

      return {
        type: 'image',
        ocr: ocrResult,
        analysis: imageAnalysis,
        validation,
        confidence: validation.confidence,
        extractedContent: {
          text: ocrResult?.text || '',
          description: imageAnalysis?.description || '',
          entities: validation.entities || []
        }
      };
    } catch (error) {
      return {
        type: 'image',
        error: error.message,
        confidence: 0
      };
    }
  }

  async validateDocument({ filePath, fileBuffer, prompt, context = {} }) {
    try {
      let documentContent = '';
      let fileType = '';

      if (filePath) {
        fileType = path.extname(filePath).toLowerCase().slice(1);
        if (fs.existsSync(filePath)) {
          documentContent = await this.extractDocumentContent(filePath, fileType);
        }
      } else if (fileBuffer && context.fileName) {
        fileType = path.extname(context.fileName).toLowerCase().slice(1);
        documentContent = await this.extractBufferContent(fileBuffer, fileType);
      }

      // Validate document content against prompt
      const contentValidation = await this.validateDocumentContent(documentContent, prompt);
      
      // Check for factual accuracy if document contains claims
      const factualValidation = await this.validateFactualClaims(documentContent, prompt);

      return {
        type: 'document',
        fileType,
        contentLength: documentContent.length,
        content: documentContent.slice(0, 1000) + (documentContent.length > 1000 ? '...' : ''),
        validation: {
          content: contentValidation,
          factual: factualValidation,
          overall: this.calculateOverallDocumentConfidence(contentValidation, factualValidation)
        },
        confidence: this.calculateOverallDocumentConfidence(contentValidation, factualValidation)
      };
    } catch (error) {
      return {
        type: 'document',
        error: error.message,
        confidence: 0
      };
    }
  }

  async performOCR({ imageUrl, imageBuffer }) {
    try {
      const formData = new FormData();
      
      if (imageUrl) {
        formData.append('url', imageUrl);
      } else if (imageBuffer) {
        formData.append('file', imageBuffer, { filename: 'image.png' });
      }
      
      formData.append('apikey', process.env.OCR_API_KEY || 'helloworld'); // Free tier key
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');

      const response = await fetch(this.ocrEndpoint, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
      }

      return {
        text: result.ParsedResults?.[0]?.ParsedText || '',
        confidence: result.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 80 : 60
      };
    } catch (error) {
      console.warn('OCR failed:', error.message);
      return { text: '', confidence: 0, error: error.message };
    }
  }

  async analyzeImageWithVision({ imageUrl, imageBuffer, prompt, extractedText }) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return { description: 'Vision analysis unavailable - no OpenAI key', confidence: 0 };
      }

      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image in the context of: "${prompt}". ${extractedText ? `OCR extracted: "${extractedText}"` : ''} Provide a detailed description and assess relevance.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl || 'data:image/png;base64,' + imageBuffer?.toString('base64')
              }
            }
          ]
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages,
          max_tokens: 300
        })
      });

      const result = await response.json();
      
      return {
        description: result.choices?.[0]?.message?.content || '',
        confidence: 85,
        model: 'gpt-4-vision-preview'
      };
    } catch (error) {
      console.warn('Vision analysis failed:', error.message);
      return { description: '', confidence: 0, error: error.message };
    }
  }

  crossValidateImageContent(ocrResult, imageAnalysis, prompt) {
    const ocrText = ocrResult?.text || '';
    const analysisText = imageAnalysis?.description || '';
    
    // Check consistency between OCR and vision analysis
    const textSimilarity = this.calculateTextSimilarity(ocrText, analysisText);
    
    // Check relevance to prompt
    const ocrRelevance = this.calculatePromptRelevance(ocrText, prompt);
    const analysisRelevance = this.calculatePromptRelevance(analysisText, prompt);
    
    // Extract entities and claims
    const entities = this.extractEntities(ocrText + ' ' + analysisText);
    
    const confidence = Math.round(
      (textSimilarity * 0.3 + ocrRelevance * 0.3 + analysisRelevance * 0.4) * 100
    );

    return {
      textSimilarity: Math.round(textSimilarity * 100),
      ocrRelevance: Math.round(ocrRelevance * 100),
      analysisRelevance: Math.round(analysisRelevance * 100),
      entities,
      confidence,
      consistent: textSimilarity > 0.7,
      relevant: Math.max(ocrRelevance, analysisRelevance) > 0.6
    };
  }

  async extractDocumentContent(filePath, fileType) {
    switch (fileType) {
      case 'txt':
      case 'md':
        return fs.readFileSync(filePath, 'utf8');
      case 'pdf':
        // Would need pdf-parse library in real implementation
        return 'PDF content extraction not implemented yet';
      default:
        return 'Unsupported document type';
    }
  }

  async extractBufferContent(buffer, fileType) {
    switch (fileType) {
      case 'txt':
      case 'md':
        return buffer.toString('utf8');
      default:
        return 'Buffer extraction for this type not implemented';
    }
  }

  async validateDocumentContent(content, prompt) {
    // Simple content validation - check if document relates to prompt
    const relevance = this.calculatePromptRelevance(content, prompt);
    const wordCount = content.split(/\s+/).length;
    const hasStructure = /\n\n|\. [A-Z]/.test(content); // Basic structure detection
    
    return {
      relevance: Math.round(relevance * 100),
      wordCount,
      hasStructure,
      confidence: Math.round((relevance * 0.7 + (hasStructure ? 0.3 : 0)) * 100)
    };
  }

  async validateFactualClaims(content, prompt) {
    // Extract potential factual claims (simple heuristic)
    const factualPatterns = [
      /\b\d{4}\b/, // Years
      /\$[\d,]+/, // Money amounts
      /\b\d+%\b/, // Percentages
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/ // Proper nouns (names, places)
    ];
    
    const claims = factualPatterns.map(pattern => 
      content.match(pattern) || []
    ).flat();
    
    return {
      claimsFound: claims.length,
      claims: claims.slice(0, 10), // Limit to 10 claims
      confidence: claims.length > 0 ? 70 : 90 // Lower confidence if many claims to verify
    };
  }

  calculateOverallDocumentConfidence(contentValidation, factualValidation) {
    return Math.round(
      (contentValidation.confidence * 0.6 + factualValidation.confidence * 0.4)
    );
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const overlap = words1.filter(w => words2.includes(w)).length;
    
    return overlap / Math.max(words1.length, words2.length);
  }

  calculatePromptRelevance(text, prompt) {
    if (!text || !prompt) return 0;
    
    const textWords = text.toLowerCase().split(/\s+/);
    const promptWords = prompt.toLowerCase().split(/\s+/);
    const overlap = promptWords.filter(w => textWords.includes(w)).length;
    
    return overlap / promptWords.length;
  }

  extractEntities(text) {
    // Simple entity extraction (in real implementation would use NLP library)
    const entityPatterns = {
      dates: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g,
      numbers: /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g,
      emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      urls: /https?:\/\/[^\s]+/g
    };
    
    const entities = {};
    for (const [type, pattern] of Object.entries(entityPatterns)) {
      entities[type] = text.match(pattern) || [];
    }
    
    return entities;
  }

  isValidImageType(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return this.supportedImageTypes.includes(ext);
  }

  isValidDocumentType(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return this.supportedDocTypes.includes(ext);
  }

  isValidFileSize(size) {
    return size <= this.maxFileSize;
  }
}

export default new MultiModalValidator();