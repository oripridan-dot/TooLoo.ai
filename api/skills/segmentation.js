// TooLoo.ai Text Segmentation Skill v2.0
// Enhanced semantic segmentation with topic detection

import fs from 'fs';
import path from 'path';

// Load learning data
const learningPath = path.join(process.cwd(), 'api', 'skills', 'segmentation-learning.json');
let learningData = { cuePhrases: [], roles: [], errorPatterns: [] };
try {
  learningData = JSON.parse(fs.readFileSync(learningPath, 'utf8'));
} catch (e) {
  // fallback to defaults
}

export async function segmentText(text, options = {}) {
  const { advanced = false, minSegmentLength = 20 } = options;
  
  if (typeof text !== 'string') {
    throw new Error('Valid text string required');
  }

  // Handle empty text
  if (!text || text.trim().length === 0) {
    return {
      segments: [],
      totalSegments: 0,
      totalMessages: 0,
      avgConfidence: 0,
      method: 'basic'
    };
  }

  // Truncate very long texts
  if (text.length > 50000) {
    text = text.slice(0, 50000);
  }

  if (advanced) {
    return semanticSegmentation(text, options);
  }

  return basicSegmentation(text, options);
}

function basicSegmentation(text, options) {
  const { minSegmentLength = 50 } = options;
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rawSegments = [];
  let current = { title: '', summary: '', messageCount: 0, confidence: 0.8, topic: '', speaker: '', speakerChanges: 0 };

  // Dynamic role detection from learning data
  const roleRegex = new RegExp(`^(${learningData.roles.join('|')}):\\s*`, 'i');
  
  // Track conversation state for context-aware segmentation
  let conversationState = {
    lastSpeaker: '',
    lastTopic: '',
    messagesSinceTopicChange: 0,
    turnCount: 0
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse speaker and content
    const speakerMatch = trimmed.match(roleRegex);
    const speaker = speakerMatch ? speakerMatch[1] : null;
    const content = speaker ? trimmed.replace(roleRegex, '') : trimmed;
    
    // Detect conversation boundaries with comprehensive change detection
    if (speaker) {
      conversationState.turnCount++;
      
      // Check for speaker change (different user, not just User → Assistant)
      const isSpeakerChange = speaker !== conversationState.lastSpeaker && 
                               conversationState.lastSpeaker !== '' &&
                               !isAlternatingPair(conversationState.lastSpeaker, speaker);
      
      // Check for topic change with enhanced detection
      const isTopicChange = detectTopicChange(current, content, conversationState);
      
      // Check for explicit transition cues anywhere in content (HIGH PRIORITY)
      const hasTransitionCue = detectTransitionCue(content);
      
      // Multi-factor segmentation decision - transition cues force split
      const shouldSegment = current.messageCount > 0 && (
        hasTransitionCue ||  // Transition cues have highest priority
        isTopicChange || 
        isSpeakerChange ||
        (conversationState.messagesSinceTopicChange > 6 && isTopicChange)
      );
      
      if (shouldSegment) {
        current.confidence = calculateConfidence(current);
        rawSegments.push({ ...current });
        current = { 
          title: content.slice(0, 80),
          summary: '', 
          messageCount: 1,
          confidence: 0.8,
          topic: extractTopic(content),
          speaker: speaker,
          speakerChanges: 0
        };
        conversationState.messagesSinceTopicChange = 0;
        conversationState.lastTopic = current.topic;
      } else {
        // Continue current segment
        if (!current.title) {
          current.title = content.slice(0, 80);
          current.topic = extractTopic(content);
        }
        if (speaker !== current.speaker) {
          current.speakerChanges++;
        }
        current.messageCount++;
        conversationState.messagesSinceTopicChange++;
      }
      
      conversationState.lastSpeaker = speaker;
    } else {
      // Regular content line without speaker
      if (!current.title && trimmed.length < 100) {
        current.title = trimmed;
        current.topic = extractTopic(trimmed);
      } else {
        current.summary += (current.summary ? ' ' : '') + trimmed;
      }
      current.messageCount++;
      conversationState.messagesSinceTopicChange++;
    }
    
    current.summary += (current.summary ? ' ' : '') + content;
  }

  // Add final segment
  if (current.messageCount > 0) {
    current.confidence = calculateConfidence(current);
    rawSegments.push(current);
  }

  // Merge related segments by topic similarity
  const mergedSegments = mergeRelatedSegments(rawSegments);
  
  // Post-merge: consolidate topic returns (e.g., email -> react -> email becomes 2 segments)
  const finalSegments = consolidateTopicReturns(mergedSegments);

  // Post-process segments
  const processedSegments = finalSegments
    .filter(s => s.summary.length >= minSegmentLength)
    .map((s, i) => ({
      id: i + 1,
      title: s.title || `Segment ${i + 1}`,
      summary: s.summary.slice(0, 300),
      messageCount: s.messageCount,
      confidence: s.confidence,
      wordCount: s.summary.split(/\s+/).length,
      topic: s.topic
    }));

  return {
    segments: processedSegments,
    totalSegments: processedSegments.length,
    totalMessages: lines.length,
    avgConfidence: processedSegments.reduce((sum, s) => sum + s.confidence, 0) / processedSegments.length || 0,
    method: 'basic'
  };
}

function detectTopicChange(currentSegment, newUserContent, conversationState) {
  if (!currentSegment.topic || !currentSegment.title) return true;
  
  const currentTopic = currentSegment.topic.toLowerCase();
  const newTopic = extractTopic(newUserContent).toLowerCase();
  
  // Dynamic topic transition indicators from learningData
  const topicTransitions = learningData.cuePhrases.map(phrase => new RegExp(`^(${phrase})`, 'i'));
  if (topicTransitions.some(pattern => pattern.test(newUserContent))) {
    return true;
  }
  
  // Enhanced topic similarity with more granular detection
  const topicSimilarity = calculateTopicSimilarity(currentTopic, newTopic);
  
  // Adaptive threshold based on context - favor more segments over fewer
  let dynamicThreshold = 0.25;  // Lowered from 0.3 for more sensitivity
  if (currentSegment.messageCount > 6) dynamicThreshold = 0.35;  // Lowered from 0.4
  if (conversationState && conversationState.messagesSinceTopicChange > 8) dynamicThreshold = 0.3;  // Lowered from 0.35
  
  // Check for context switches (question patterns)
  const isQuestionSwitch = 
    /\?$/.test(currentSegment.summary) && 
    /^[A-Z]/.test(newUserContent) && 
    !newUserContent.toLowerCase().includes('yes') && 
    !newUserContent.toLowerCase().includes('no');
  
  return topicSimilarity < dynamicThreshold || isQuestionSwitch;
}

function extractTopic(text) {
  // Enhanced topic extraction with more categories and patterns
  const topics = {
    'project': /\b(project|app|application|software|build|develop|create|development|coding|programming)\b/i,
    'marketing': /\b(marketing|strategy|campaign|promotion|advertising|user acquisition|growth|outreach)\b/i,
    'technical': /\b(code|programming|react|hooks|api|database|server|technical|javascript|frontend|backend)\b/i,
    'email': /\b(email|smtp|gmail|mail|messaging|inbox|send|receive)\b/i,
    'planning': /\b(plan|schedule|timeline|roadmap|organize|strategy|goals|objectives|brainstorm)\b/i,
    'engagement': /\b(engagement|users|retention|growth|metrics|analytics|active|usage|behavior)\b/i,
    'gamification': /\b(gamification|points|badges|streaks|rewards|achievements|leaderboard|competition)\b/i,
    'features': /\b(features|functionality|capabilities|options|tools|components|modules)\b/i,
    'ui': /\b(interface|ui|ux|design|visual|layout|kanban|dashboard|frontend|user experience)\b/i,
    'problem': /\b(problem|issue|trouble|error|bug|help|support|fix|solve|troubleshoot)\b/i,
    'notifications': /\b(notification|push|alert|reminder|message|updates|inform)\b/i,
    'social': /\b(social|community|sharing|collaborative|users|friends|network|connect)\b/i,
    'data': /\b(data|analytics|metrics|tracking|measurement|statistics|insights)\b/i,
    'workflow': /\b(workflow|process|procedure|method|approach|system|automation)\b/i
  };

  // Return the first matching topic
  for (const [topic, pattern] of Object.entries(topics)) {
    if (pattern.test(text)) {
      return topic;
    }
  }
  
  return 'general';
}

function calculateTopicSimilarity(topic1, topic2) {
  if (topic1 === topic2) return 1.0;
  
  // Enhanced topic relationship mapping
  const topicGroups = [
    ['project', 'technical', 'features', 'ui', 'workflow'],
    ['marketing', 'engagement', 'gamification', 'social'],
    ['planning', 'strategy', 'data', 'analytics'],
    ['problem', 'help', 'email', 'technical'],
    ['notifications', 'ui', 'engagement'],
    ['social', 'gamification', 'engagement']
  ];
  
  // Check if topics are in the same group
  for (const group of topicGroups) {
    if (group.includes(topic1) && group.includes(topic2)) {
      return 0.7;
    }
  }
  
  // Check for partial semantic overlap
  const semanticPairs = {
    'project': ['technical', 'features', 'ui'],
    'engagement': ['gamification', 'social', 'notifications'],
    'planning': ['marketing', 'strategy'],
    'data': ['engagement', 'analytics']
  };
  
  if (semanticPairs[topic1]?.includes(topic2) || semanticPairs[topic2]?.includes(topic1)) {
    return 0.5;
  }
  
  return 0.1;
}

function mergeRelatedSegments(segments) {
  if (segments.length <= 1) return segments;
  
  const merged = [segments[0]];
  
  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const previous = merged[merged.length - 1];
    
    // Check if segments should be merged
    const topicSimilarity = calculateTopicSimilarity(
      previous.topic || 'general', 
      current.topic || 'general'
    );
    
    // Check for topic returns (going back to previous topic)
    const isTopicReturn = checkTopicReturn(merged, current);
    
    // Reduced aggressive merging - only merge very similar segments
    const shouldMerge = 
      (topicSimilarity > 0.9 && previous.messageCount + current.messageCount <= 4) ||
      (isTopicReturn && topicSimilarity > 0.85 && previous.messageCount + current.messageCount <= 6);
    
    if (shouldMerge) {
      // Merge segments
      previous.summary += ' ' + current.summary;
      previous.messageCount += current.messageCount;
      previous.confidence = (previous.confidence + current.confidence) / 2;
      if (!previous.title && current.title) {
        previous.title = current.title;
      }
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

function checkTopicReturn(existingSegments, currentSegment) {
  // Check if current segment returns to a topic discussed earlier
  const currentTopic = currentSegment.topic;
  
  for (let i = 0; i < existingSegments.length - 1; i++) {
    if (existingSegments[i].topic === currentTopic) {
      return true;
    }
  }
  
  return false;
}

function consolidateTopicReturns(segments) {
  if (segments.length <= 2) return segments;
  
  const consolidated = [];
  const topicGroups = new Map();
  
  // Group segments by topic
  segments.forEach((segment, index) => {
    const topic = segment.topic || 'general';
    if (!topicGroups.has(topic)) {
      topicGroups.set(topic, []);
    }
    topicGroups.get(topic).push({ segment, originalIndex: index });
  });
  
  // For topics that appear multiple times, consider consolidating
  const finalSegments = [...segments];
  
  topicGroups.forEach((group, topic) => {
    if (group.length > 1) {
      // Check if topic segments are separated by only 1-2 other segments
      const indices = group.map(g => g.originalIndex);
      const gaps = [];
      
      for (let i = 1; i < indices.length; i++) {
        gaps.push(indices[i] - indices[i-1] - 1);
      }
      
      // If gaps are small (1-2 segments), consider merging
      const hasSmallGaps = gaps.every(gap => gap <= 2);
      const totalMessages = group.reduce((sum, g) => sum + g.segment.messageCount, 0);
      
      if (hasSmallGaps && totalMessages <= 8 && topic !== 'general') {
        // Mark first occurrence for consolidation, others for removal
        const firstIndex = indices[0];
        const consolidatedSegment = { ...group[0].segment };
        
        // Merge all segments of this topic
        for (let i = 1; i < group.length; i++) {
          const segment = group[i].segment;
          consolidatedSegment.summary += ' ' + segment.summary;
          consolidatedSegment.messageCount += segment.messageCount;
          consolidatedSegment.confidence = (consolidatedSegment.confidence + segment.confidence) / 2;
          
          // Mark for removal
          finalSegments[group[i].originalIndex] = null;
        }
        
        finalSegments[firstIndex] = consolidatedSegment;
      }
    }
  });
  
  return finalSegments.filter(s => s !== null);
}

function hasNaturalBreak(segment1, segment2) {
  // Detect natural conversation flow breaks even within same topic
  
  // Question progression - different types of questions suggest segments
  const hasDeepQuestions = /\b(what|how|why|when|where|which|specific|details|explain)\b/i;
  const seg1HasDeepQuestion = hasDeepQuestions.test(segment1.summary);
  const seg2HasDeepQuestion = hasDeepQuestions.test(segment2.summary);
  
  // Different question types suggest natural break
  if (seg1HasDeepQuestion && seg2HasDeepQuestion) {
    return true;
  }
  
  // Progression indicators - moving from general to specific
  const progressionWords = /\b(specific|details|exactly|particular|implement|build|design)\b/i;
  const isProgression = progressionWords.test(segment2.title);
  
  // Feature enumeration suggests segment break
  const hasFeatureList = /\b(features?|include|track|create|manage|users?|interface)\b/i;
  const seg1Features = hasFeatureList.test(segment1.summary);
  const seg2Features = hasFeatureList.test(segment2.summary);
  
  if (seg1Features && seg2Features) {
    return true;
  }
  
  return false;
}

function semanticSegmentation(text, options) {
  // Advanced semantic segmentation (placeholder for future enhancement)
  // Could use NLP libraries, topic modeling, etc.
  return basicSegmentation(text, { ...options, advanced: false });
}

function calculateConfidence(segment) {
  let confidence = 0.5;
  
  // Boost confidence for clear structure
  if (segment.title && segment.title.length > 5) confidence += 0.2;
  if (segment.messageCount >= 2) confidence += 0.1;
  if (segment.summary.length > 100) confidence += 0.1;
  
  // Patterns that indicate good segmentation
  if (/\b(plan|goal|objective|issue|problem|solution)\b/i.test(segment.summary)) confidence += 0.1;
  
  // Topic coherence boost
  if (segment.topic && segment.topic !== 'general') confidence += 0.1;
  
  // Conversation flow indicators
  if (segment.messageCount >= 4) confidence += 0.1;
  if (segment.summary.includes('?') && segment.summary.includes('.')) confidence += 0.05;
  
  return Math.min(0.95, Math.max(0.1, confidence));
}

// Helper: Check if speakers are alternating user-assistant pairs (not a real speaker change)
function isAlternatingPair(speaker1, speaker2) {
  const userSpeakers = ['User', 'User1', 'Human', 'You'];
  const assistantSpeakers = ['Assistant', 'AI', 'Bot'];
  
  const s1IsUser = userSpeakers.includes(speaker1);
  const s2IsUser = userSpeakers.includes(speaker2);
  const s1IsAssistant = assistantSpeakers.includes(speaker1);
  const s2IsAssistant = assistantSpeakers.includes(speaker2);
  
  return (s1IsUser && s2IsAssistant) || (s1IsAssistant && s2IsUser);
}

// Helper: Detect transition cues anywhere in content (not just start)
function detectTransitionCue(content) {
  const transitionPatterns = learningData.cuePhrases.map(phrase => 
    new RegExp(`\\b(${phrase})\\b`, 'i')
  );
  
  // Also check for common mid-sentence transitions at sentence/clause boundaries
  const additionalPatterns = [
    /\b(also|additionally)\b/i,
    /\b(by the way|speaking of)\b/i,
    /\b(back to|returning to)\b/i,
    /\b(let's talk about|what about|how about)\b/i,
    /\b(now|meanwhile|separately)\b/i,
    /\.\s+(Now|Also|But|However|Meanwhile)/i,  // After period
    /^(Also|Now|But|However)\b/i  // Start of message
  ];
  
  const allPatterns = [...transitionPatterns, ...additionalPatterns];
  return allPatterns.some(pattern => pattern.test(content));
}

// Learning mechanism: log new error patterns and update learning data
export function logSegmentationError(errorPattern) {
  if (!learningData.errorPatterns.includes(errorPattern)) {
    learningData.errorPatterns.push(errorPattern);
    fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2));
  }
}

// Add new cue phrase from failed segmentation
export function addCuePhrase(phrase) {
  if (!learningData.cuePhrases.includes(phrase)) {
    learningData.cuePhrases.push(phrase);
    fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2));
  }
}

// Add new role from failed segmentation
export function addRole(role) {
  if (!learningData.roles.includes(role)) {
    learningData.roles.push(role);
    fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2));
  }
}