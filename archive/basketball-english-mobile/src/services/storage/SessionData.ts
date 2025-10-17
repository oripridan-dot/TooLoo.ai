export default class SessionData {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = new Date();
        this.endTime = null;
        this.wordsLearned = [];
        this.correctResponses = 0;
        this.hesitations = 0;
        this.needsRecovery = false;
    }

    generateSessionId() {
        return 'session-' + Math.random().toString(36).substr(2, 9);
    }

    addWord(word) {
        if (!this.wordsLearned.includes(word)) {
            this.wordsLearned.push(word);
        }
    }

    recordResponse(correct) {
        if (correct) {
            this.correctResponses++;
        } else {
            this.hesitations++;
        }
    }

    endSession() {
        this.endTime = new Date();
    }

    getSessionReport() {
        return {
            sessionId: this.sessionId,
            duration: this.endTime ? (this.endTime - this.startTime) / 1000 : null,
            wordsLearned: this.wordsLearned,
            correctResponses: this.correctResponses,
            hesitations: this.hesitations,
            needsRecovery: this.needsRecovery,
        };
    }
}