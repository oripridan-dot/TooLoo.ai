// TooLoo.ai Brain Tester JavaScript
// Interactive conversation intelligence testing interface

class BrainTester {
    constructor() {
        this.currentResults = null;
        this.testCount = 0;
        this.qualityScores = [];
        this.feedbackData = {};
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadStats();
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.fileSelectBtn = document.getElementById('file-select-btn');
        this.pasteBtn = document.getElementById('paste-btn');
        
        // Modal elements
        this.pasteModal = document.getElementById('paste-modal');
        this.pasteTextarea = document.getElementById('paste-textarea');
        this.pasteAnalyzeBtn = document.getElementById('paste-analyze');
        this.pasteCancelBtn = document.getElementById('paste-cancel');
        this.modalCloseBtn = document.getElementById('modal-close');
        
        // Processing elements
        this.uploadSection = document.getElementById('upload-section');
        this.processingSection = document.getElementById('processing-section');
        this.resultsSection = document.getElementById('results-section');
        this.progressFill = document.getElementById('progress-fill');
        this.processingStage = document.getElementById('processing-stage');
        
        // Results elements
        this.conversationStyle = document.getElementById('conversation-style');
        this.patternsCount = document.getElementById('patterns-count');
        this.dominantTrait = document.getElementById('dominant-trait');
        this.insightsCount = document.getElementById('insights-count');
        
        // Tab elements
        this.tabs = document.querySelectorAll('.tab');
        this.tabPanels = document.querySelectorAll('.tab-panel');
        
        // Content containers
        this.patternsGrid = document.getElementById('patterns-grid');
        this.traitsGrid = document.getElementById('traits-grid');
        this.timelineContainer = document.getElementById('timeline-container');
        this.insightsContainer = document.getElementById('insights-container');
        this.feedbackQuestions = document.getElementById('feedback-questions');
        
        // Action elements
        this.testAnotherBtn = document.getElementById('test-another');
        this.downloadSnapshotBtn = document.getElementById('download-snapshot');
        this.submitFeedbackBtn = document.getElementById('submit-feedback');
        this.exportResultsBtn = document.getElementById('export-results');
        
        // Stats elements
        this.totalTestsEl = document.getElementById('total-tests');
        this.avgQualityEl = document.getElementById('avg-quality');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
    }

    attachEventListeners() {
        // Upload listeners
        this.fileSelectBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.pasteBtn.addEventListener('click', () => this.showPasteModal());
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Modal listeners
        this.modalCloseBtn.addEventListener('click', () => this.hidePasteModal());
        this.pasteCancelBtn.addEventListener('click', () => this.hidePasteModal());
        this.pasteAnalyzeBtn.addEventListener('click', () => this.analyzePastedText());
        
        // Sample file listeners
        document.querySelectorAll('.sample-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadSampleFile(e.target.dataset.file));
        });
        
        // Tab listeners
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Action listeners
        this.testAnotherBtn.addEventListener('click', () => this.resetToUpload());
        this.downloadSnapshotBtn.addEventListener('click', () => this.downloadSnapshot());
        this.submitFeedbackBtn.addEventListener('click', () => this.submitFeedback());
        this.exportResultsBtn.addEventListener('click', () => this.exportResults());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    // File handling
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    async processFile(file) {
        try {
            const text = await this.readFile(file);
            const format = this.detectFormat(file.name, text);
            await this.analyzeConversation(text, format, file.name);
        } catch (error) {
            this.showToast('Error reading file: ' + error.message, 'error');
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    detectFormat(filename, content) {
        // Simple format detection based on filename and content
        if (filename.includes('discord') || content.includes('Discord Chat Export')) return 'discord';
        if (filename.includes('whatsapp') || content.match(/\[\d{2}\/\d{2}\/\d{4}/)) return 'whatsapp';
        if (filename.includes('slack') || content.includes('"ts":')) return 'slack';
        if (filename.includes('telegram')) return 'telegram';
        if (filename.endsWith('.json')) return 'json';
        return 'plain';
    }

    // Modal handling
    showPasteModal() {
        this.pasteModal.classList.add('show');
        this.pasteTextarea.focus();
    }

    hidePasteModal() {
        this.pasteModal.classList.remove('show');
        this.pasteTextarea.value = '';
    }

    async analyzePastedText() {
        const text = this.pasteTextarea.value.trim();
        if (!text) {
            this.showToast('Please paste some conversation text', 'warning');
            return;
        }
        
        this.hidePasteModal();
        await this.analyzeConversation(text, 'plain', 'Pasted Text');
    }

    // Sample files
    async loadSampleFile(type) {
        try {
            const sampleData = this.getSampleData(type);
            await this.analyzeConversation(JSON.stringify(sampleData), 'json', `${type}-sample.json`);
        } catch (error) {
            this.showToast('Error loading sample: ' + error.message, 'error');
        }
    }

    getSampleData(type) {
        const samples = {
            discord: {
                "guild": { "name": "Test Server" },
                "channel": { "name": "general" },
                "messages": [
                    {
                        "id": "1001",
                        "timestamp": "2025-10-08T10:00:00.000Z",
                        "author": { "name": "Alice", "id": "user1" },
                        "content": "Hey team, I've been thinking about our upcoming project launch. We need to make sure we cover all the risks before we proceed."
                    },
                    {
                        "id": "1002", 
                        "timestamp": "2025-10-08T10:02:00.000Z",
                        "author": { "name": "Bob", "id": "user2" },
                        "content": "Good point Alice. What specific risks are you thinking about? I'd like to get this moving quickly if possible."
                    },
                    {
                        "id": "1003",
                        "timestamp": "2025-10-08T10:05:00.000Z", 
                        "author": { "name": "Alice", "id": "user1" },
                        "content": "Well, we haven't fully tested the integration with the payment system. That could cause major issues if it fails in production. Should we do more thorough testing first?"
                    },
                    {
                        "id": "1004",
                        "timestamp": "2025-10-08T10:07:00.000Z",
                        "author": { "name": "Bob", "id": "user2" },
                        "content": "You're right about the payment integration. Let's set up a comprehensive testing phase. Can you create a structured plan for that?"
                    }
                ]
            },
            whatsapp: {
                "messages": [
                    {
                        "id": "msg1",
                        "timestamp": "2025-10-08T14:30:00.000Z",
                        "author": "Sarah",
                        "content": "I'm really struggling with this decision. There are so many factors to consider."
                    },
                    {
                        "id": "msg2",
                        "timestamp": "2025-10-08T14:32:00.000Z",
                        "author": "Mike",
                        "content": "What's the main thing that's bothering you about it?"
                    },
                    {
                        "id": "msg3",
                        "timestamp": "2025-10-08T14:35:00.000Z",
                        "author": "Sarah",
                        "content": "Well, if we go with option A, it's faster but riskier. Option B is safer but takes much longer."
                    },
                    {
                        "id": "msg4",
                        "timestamp": "2025-10-08T14:36:00.000Z",
                        "author": "Mike",
                        "content": "Why don't we make a quick list of pros and cons for each? That might help clarify things."
                    }
                ],
                "metadata": { "platform": "whatsapp" }
            },
            slack: {
                "messages": [
                    {
                        "id": "msg1",
                        "timestamp": "2025-10-08T16:00:00.000Z",
                        "author": "Chris",
                        "content": "Quick question - do we have approval to move forward with the database migration?"
                    },
                    {
                        "id": "msg2",
                        "timestamp": "2025-10-08T16:02:00.000Z",
                        "author": "Dana",
                        "content": "I think we need to check with the security team first. This affects user data, right?"
                    },
                    {
                        "id": "msg3",
                        "timestamp": "2025-10-08T16:05:00.000Z",
                        "author": "Chris",
                        "content": "Yes, it involves user data. Should I set up a meeting with security or just send them the details?"
                    }
                ],
                "metadata": { "platform": "slack" }
            }
        };
        
        return samples[type] || samples.discord;
    }

    // Analysis pipeline
    async analyzeConversation(content, format, filename) {
        this.showProcessingSection();
        
        try {
            // Simulate processing steps with real API calls
            await this.simulateProcessingStep('parse', 'Parsing conversation...', 20);
            await this.simulateProcessingStep('segment', 'Identifying conversation phases...', 40);
            await this.simulateProcessingStep('patterns', 'Detecting behavioral patterns...', 60);
            await this.simulateProcessingStep('traits', 'Computing cognitive traits...', 80);
            await this.simulateProcessingStep('snapshot', 'Assembling cognitive profile...', 100);
            
            // Make actual API call to analyze
            const results = await this.callAnalysisAPI(content, format);
            
            this.currentResults = results;
            this.testCount++;
            this.qualityScores.push(results.validation?.quality || 0.5);
            this.updateStats();
            
            this.showResults(results);
            
        } catch (error) {
            this.showToast('Analysis failed: ' + error.message, 'error');
            this.resetToUpload();
        }
    }

    async simulateProcessingStep(step, message, progress) {
        // Update progress
        this.progressFill.style.width = progress + '%';
        this.processingStage.textContent = message;
        
        // Update step indicators
        document.querySelectorAll('.step').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.step === step) {
                el.classList.add('active');
            }
            
            // Mark previous steps as completed
            const stepOrder = ['parse', 'segment', 'patterns', 'traits', 'snapshot'];
            const currentIndex = stepOrder.indexOf(step);
            const elIndex = stepOrder.indexOf(el.dataset.step);
            if (elIndex < currentIndex) {
                el.classList.add('completed');
            }
        });
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    }

    async callAnalysisAPI(content, format) {
        // Call the real backend API
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                format: format,
                filename: 'uploaded-conversation'
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Analysis failed');
        }
        
        return data;
    }

    simulateAnalysisResults(content) {
        // Simple pattern matching simulation
        const patterns = [];
        const traits = {
            decisionCompression: Math.random(),
            riskDiscipline: Math.random(),
            trustPriority: Math.random(),
            structureExpectation: Math.random()
        };
        
        // Detect some basic patterns
        if (content.toLowerCase().includes('risk')) {
            patterns.push({
                id: 'risk-surfacing',
                name: 'Risk Surfacing',
                confidence: 0.8 + Math.random() * 0.2,
                description: 'Actively identifies potential risks and concerns'
            });
        }
        
        if (content.toLowerCase().includes('should we') || content.toLowerCase().includes('next step')) {
            patterns.push({
                id: 'next-step-authorization',
                name: 'Next Step Authorization',
                confidence: 0.7 + Math.random() * 0.3,
                description: 'Seeks explicit approval before proceeding'
            });
        }
        
        if (content.toLowerCase().includes('quick') || content.toLowerCase().includes('fast')) {
            patterns.push({
                id: 'scope-compression',
                name: 'Scope Compression',
                confidence: 0.6 + Math.random() * 0.4,
                description: 'Prefers condensed, focused problem definitions'
            });
            traits.decisionCompression = Math.max(traits.decisionCompression, 0.8);
        }
        
        // Create mock results
        const dominantTrait = Object.entries(traits).sort((a, b) => b[1] - a[1])[0];
        
        return {
            success: true,
            validation: {
                valid: true,
                quality: 0.7 + Math.random() * 0.3,
                issues: []
            },
            snapshot: {
                summary: {
                    conversationStyle: ['exploratory', 'decisive', 'methodical', 'cautious'][Math.floor(Math.random() * 4)],
                    dominantTrait: dominantTrait[0],
                    totalInsights: patterns.length + Math.floor(Math.random() * 5),
                    patternCount: patterns.length
                },
                patterns: patterns,
                traits: Object.entries(traits).map(([name, value]) => ({
                    name: this.formatTraitName(name),
                    key: name,
                    value: Math.round(value * 100),
                    interpretation: this.getTraitInterpretation(name, value),
                    color: this.getTraitColor(value),
                    icon: this.getTraitIcon(name)
                })),
                recommendations: [
                    'Consider implementing structured decision checkpoints',
                    'Develop risk assessment templates for future discussions'
                ]
            }
        };
    }

    // UI Management
    showProcessingSection() {
        this.uploadSection.style.display = 'none';
        this.processingSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        
        // Reset processing indicators
        this.progressFill.style.width = '0%';
        document.querySelectorAll('.step').forEach(el => {
            el.classList.remove('active', 'completed');
        });
    }

    showResults(results) {
        this.processingSection.style.display = 'none';
        this.resultsSection.style.display = 'block';
        
        this.populateOverviewCards(results);
        this.populatePatterns(results.snapshot.patterns);
        this.populateTraits(results.snapshot.traits);
        this.populateTimeline(results);
        this.populateInsights(results);
        this.populateFeedback(results);
        
        // Show success toast
        this.showToast('Analysis complete! 🧠✨', 'success');
    }

    resetToUpload() {
        this.uploadSection.style.display = 'block';
        this.processingSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.fileInput.value = '';
    }

    populateOverviewCards(results) {
        const snapshot = results.snapshot;
        this.conversationStyle.textContent = snapshot.summary.conversationStyle || 'Unknown';
        this.patternsCount.textContent = snapshot.patterns ? snapshot.patterns.length : 0;
        this.dominantTrait.textContent = this.formatTraitName(snapshot.summary.dominantTrait || 'balanced');
        this.insightsCount.textContent = snapshot.summary.totalInsights || 0;
    }

    populatePatterns(patterns) {
        this.patternsGrid.innerHTML = '';
        
        if (!patterns || patterns.length === 0) {
            this.patternsGrid.innerHTML = '<p class="empty-state">No specific patterns detected in this conversation.</p>';
            return;
        }
        
        patterns.forEach(pattern => {
            const patternCard = document.createElement('div');
            patternCard.className = 'pattern-card';
            patternCard.innerHTML = `
                <div class="pattern-header">
                    <div class="pattern-name">${pattern.name || this.formatPatternName(pattern.id)}</div>
                    <div class="pattern-confidence">${Math.round((pattern.confidence || 0) * 100)}%</div>
                </div>
                <div class="pattern-description">${pattern.description || 'Pattern detected in conversation flow'}</div>
            `;
            this.patternsGrid.appendChild(patternCard);
        });
    }

    populateTraits(traits) {
        this.traitsGrid.innerHTML = '';
        
        // Handle both array and object formats for traits
        let traitsArray = [];
        if (Array.isArray(traits)) {
            traitsArray = traits;
        } else if (typeof traits === 'object') {
            // Convert object format to array format
            traitsArray = Object.entries(traits).map(([name, value]) => ({
                name: this.formatTraitName(name),
                key: name,
                value: typeof value === 'object' ? Math.round(value.value * 100) : Math.round(value * 100),
                interpretation: typeof value === 'object' ? value.interpretation : this.getTraitInterpretation(name, value),
                color: typeof value === 'object' ? value.color : this.getTraitColor(value),
                icon: this.getTraitIcon(name)
            }));
        }
        
        if (traitsArray.length === 0) {
            this.traitsGrid.innerHTML = '<p class="empty-state">No traits computed for this conversation.</p>';
            return;
        }
        
        traitsArray.forEach(trait => {
            const traitCard = document.createElement('div');
            traitCard.className = 'trait-card';
            traitCard.innerHTML = `
                <div class="trait-icon">${trait.icon}</div>
                <div class="trait-name">${trait.name}</div>
                <div class="trait-value" style="color: ${trait.color}">${trait.value}%</div>
                <div class="trait-bar">
                    <div class="trait-bar-fill" style="background: ${trait.color}; width: ${trait.value}%"></div>
                </div>
                <div class="trait-interpretation">${trait.interpretation}</div>
            `;
            this.traitsGrid.appendChild(traitCard);
        });
    }

    populateTimeline(results) {
        // Simulate timeline data
        const segments = [
            { title: 'Opening Phase', patterns: 2, theme: 'setup' },
            { title: 'Discussion Phase', patterns: 4, theme: 'exploration' },
            { title: 'Resolution Phase', patterns: 1, theme: 'conclusion' }
        ];
        
        this.timelineContainer.innerHTML = '';
        
        segments.forEach((segment, index) => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            timelineItem.innerHTML = `
                <div class="timeline-header">
                    <div class="timeline-title">${segment.title}</div>
                    <div class="timeline-badge">${segment.patterns} patterns</div>
                </div>
                <div class="timeline-patterns">
                    <div class="timeline-pattern">${segment.theme} theme</div>
                </div>
            `;
            this.timelineContainer.appendChild(timelineItem);
        });
    }

    populateInsights(results) {
        this.insightsContainer.innerHTML = `
            <div class="insights-section">
                <h4>Key Findings</h4>
                <ul>
                    <li>Conversation demonstrates ${results.snapshot.summary.conversationStyle} communication style</li>
                    <li>${results.snapshot.patterns.length} behavioral patterns identified</li>
                    <li>Strong ${this.formatTraitName(results.snapshot.summary.dominantTrait)} characteristics detected</li>
                </ul>
            </div>
            <div class="insights-section">
                <h4>Recommendations</h4>
                <ul>
                    ${results.snapshot.recommendations.map(rec => {
                        if (typeof rec === 'string') {
                            return `<li>${rec}</li>`;
                        } else if (rec.text) {
                            return `<li><strong>${rec.category}:</strong> ${rec.text} <span class="confidence">(${Math.round(rec.confidence * 100)}% confidence)</span></li>`;
                        } else {
                            return `<li>${JSON.stringify(rec)}</li>`;
                        }
                    }).join('')}
                </ul>
            </div>
        `;
    }

    populateFeedback(results) {
        const questions = [
            "How accurate is the conversation style assessment?",
            "Are the detected patterns meaningful and relevant?",
            "Do the cognitive traits match your expectations?",
            "What important patterns might have been missed?"
        ];
        
        this.feedbackQuestions.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'feedback-question';
            questionDiv.innerHTML = `
                <div class="question-text">${question}</div>
                <div class="rating-buttons">
                    <button class="rating-btn" data-question="${index}" data-rating="poor">Poor</button>
                    <button class="rating-btn" data-question="${index}" data-rating="fair">Fair</button>
                    <button class="rating-btn" data-question="${index}" data-rating="good">Good</button>
                    <button class="rating-btn" data-question="${index}" data-rating="excellent">Excellent</button>
                </div>
                <textarea class="feedback-textarea" placeholder="Additional comments..." data-question="${index}"></textarea>
            `;
            this.feedbackQuestions.appendChild(questionDiv);
        });
        
        // Add rating button listeners
        document.querySelectorAll('.rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.dataset.question;
                const rating = e.target.dataset.rating;
                
                // Remove active class from siblings
                e.target.parentNode.querySelectorAll('.rating-btn').forEach(sibling => {
                    sibling.classList.remove('active');
                });
                
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Store feedback
                if (!this.feedbackData[question]) this.feedbackData[question] = {};
                this.feedbackData[question].rating = rating;
            });
        });
        
        // Add textarea listeners
        document.querySelectorAll('.feedback-textarea').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const question = e.target.dataset.question;
                if (!this.feedbackData[question]) this.feedbackData[question] = {};
                this.feedbackData[question].comment = e.target.value;
            });
        });
    }

    // Tab management
    switchTab(tabName) {
        // Update tab buttons
        this.tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Update tab panels
        this.tabPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === `${tabName}-panel`) {
                panel.classList.add('active');
            }
        });
    }

    // Actions
    async submitFeedback() {
        try {
            if (!this.currentResults) {
                this.showToast('No analysis to provide feedback for', 'warning');
                return;
            }
            
            // Submit to real API
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    analysisId: this.currentResults.id,
                    feedback: this.feedbackData,
                    rating: this.calculateOverallRating()
                })
            });
            
            if (response.ok) {
                this.showToast('Thank you for your feedback! 🙏', 'success');
                this.feedbackData = {}; // Reset
            } else {
                throw new Error('Failed to submit feedback');
            }
            
        } catch (error) {
            this.showToast('Failed to submit feedback: ' + error.message, 'error');
        }
    }

    calculateOverallRating() {
        const ratings = Object.values(this.feedbackData).map(f => f.rating).filter(Boolean);
        if (ratings.length === 0) return null;
        
        const ratingValues = { poor: 1, fair: 2, good: 3, excellent: 4 };
        const total = ratings.reduce((sum, rating) => sum + ratingValues[rating], 0);
        return total / ratings.length;
    }

    downloadSnapshot() {
        if (!this.currentResults) return;
        
        const data = {
            timestamp: new Date().toISOString(),
            results: this.currentResults,
            feedback: this.feedbackData
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tooloo-analysis-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Analysis downloaded! 📄', 'success');
    }

    exportResults() {
        // Export in various formats
        if (!this.currentResults) return;
        
        // Create export options modal (simplified for now)
        this.downloadSnapshot();
    }

    // Utilities
    formatPatternName(patternId) {
        if (!patternId) return 'Unknown Pattern';
        
        // Convert kebab-case to Title Case
        return patternId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    formatTraitName(traitKey) {
        const names = {
            decisionCompression: 'Decision Compression',
            riskDiscipline: 'Risk Discipline',
            trustPriority: 'Trust Priority',
            structureExpectation: 'Structure Expectation'
        };
        return names[traitKey] || traitKey;
    }

    getTraitInterpretation(trait, value) {
        if (value > 0.7) {
            const high = {
                decisionCompression: 'Prefers rapid, compressed decision-making',
                riskDiscipline: 'Systematic risk identification and mitigation',
                trustPriority: 'Strong emphasis on privacy and trust',
                structureExpectation: 'Prefers organized, structured outputs'
            };
            return high[trait] || 'High expression of this trait';
        } else if (value > 0.3) {
            return 'Moderate expression of this trait';
        } else {
            return 'Low expression of this trait';
        }
    }

    getTraitColor(value) {
        if (value > 0.7) return '#22c55e';
        if (value > 0.4) return '#f59e0b';
        return '#ef4444';
    }

    getTraitIcon(trait) {
        const icons = {
            decisionCompression: '⚡',
            riskDiscipline: '🛡️',
            trustPriority: '🔒',
            structureExpectation: '📋'
        };
        return icons[trait] || '📊';
    }

    updateStats() {
        this.totalTestsEl.textContent = this.testCount;
        
        if (this.qualityScores.length > 0) {
            const avgQuality = this.qualityScores.reduce((a, b) => a + b, 0) / this.qualityScores.length;
            this.avgQualityEl.textContent = Math.round(avgQuality * 100) + '%';
        }
        
        this.saveStats();
    }

    loadStats() {
        try {
            const stats = localStorage.getItem('tooloo-brain-stats');
            if (stats) {
                const data = JSON.parse(stats);
                this.testCount = data.testCount || 0;
                this.qualityScores = data.qualityScores || [];
                this.updateStats();
            }
        } catch (error) {
            console.log('No saved stats found');
        }
    }

    saveStats() {
        try {
            const stats = {
                testCount: this.testCount,
                qualityScores: this.qualityScores
            };
            localStorage.setItem('tooloo-brain-stats', JSON.stringify(stats));
        } catch (error) {
            console.log('Failed to save stats');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    handleKeyboard(event) {
        // ESC to close modal
        if (event.key === 'Escape' && this.pasteModal.classList.contains('show')) {
            this.hidePasteModal();
        }
        
        // Ctrl+V to open paste modal (when not in input)
        if (event.ctrlKey && event.key === 'v' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'INPUT') {
            event.preventDefault();
            this.showPasteModal();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BrainTester();
});