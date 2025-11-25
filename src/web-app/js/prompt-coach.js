class PromptCoach {
  constructor() {
    this.inputElement = null;
    this.indicatorElement = null;
    this.messageElement = null;
    this.dotElement = null;
    this.debounceTimer = null;
  }

  init(inputElement, indicatorElement) {
    this.inputElement = inputElement;
    this.indicatorElement = indicatorElement;
    this.messageElement = indicatorElement.querySelector("#coach-message");
    this.dotElement = indicatorElement.querySelector("#coach-dot");

    this.inputElement.addEventListener("keyup", () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.analyze(), 500);
    });
  }

  analyze() {
    const text = this.inputElement.value.trim();
    if (!text) {
      this.indicatorElement.style.opacity = "0";
      return;
    }

    const score = this.calculateScore(text);
    this.updateUI(score);
  }

  calculateScore(text) {
    let score = 0;
    let feedback = [];

    // Length Check
    if (text.length > 20) score += 20;
    else feedback.push("Too short");

    // Context Check (keywords like "file", "code", "context")
    if (/\b(file|code|context|project|repo)\b/i.test(text)) score += 20;
    else feedback.push("Add context");

    // Action Check (verbs)
    if (/\b(create|update|fix|refactor|analyze|explain)\b/i.test(text))
      score += 20;
    else feedback.push("Specify action");

    // Constraint/Format Check
    if (/\b(json|markdown|list|table|brief|detailed)\b/i.test(text))
      score += 20;

    // Clarity (no "it", "this", "that" without context - hard to check simply, skipping)
    score += 20; // Base confidence

    return {
      value: Math.min(score, 100),
      feedback: feedback.length > 0 ? feedback[0] : "Great prompt!",
    };
  }

  updateUI(result) {
    this.indicatorElement.style.opacity = "1";
    this.messageElement.textContent = result.feedback;

    this.dotElement.className = "coach-dot"; // reset
    if (result.value >= 80) {
      this.dotElement.classList.add("green");
    } else if (result.value >= 50) {
      this.dotElement.classList.add("yellow");
    } else {
      this.dotElement.classList.add("red");
    }
  }
}

window.PromptCoach = new PromptCoach();
