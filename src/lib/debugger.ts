// Debugger - Step through code execution with breakpoints
// Tracks execution state and provides debugging capabilities

export default {
  // Initialize debugger state
  createSession(code, language = 'javascript') {
    return {
      id: `debug-${Date.now()}`,
      code,
      language,
      breakpoints: new Set(),
      currentLine: 0,
      variables: {},
      callStack: [],
      isPaused: false,
      isRunning: false,
      executedLines: []
    };
  },

  // Add breakpoint at line
  addBreakpoint(session, lineNumber) {
    session.breakpoints.add(lineNumber);
    return { ok: true, breakpoint: lineNumber };
  },

  // Remove breakpoint
  removeBreakpoint(session, lineNumber) {
    session.breakpoints.delete(lineNumber);
    return { ok: true };
  },

  // Continue execution
  continue(session) {
    session.isPaused = false;
    return { ok: true, status: 'running' };
  },

  // Pause execution
  pause(session) {
    session.isPaused = true;
    return { ok: true, status: 'paused', line: session.currentLine };
  },

  // Step to next line
  stepNext(session) {
    session.currentLine++;
    session.executedLines.push(session.currentLine);
    return { ok: true, line: session.currentLine };
  },

  // Step into function
  stepInto(session) {
    session.callStack.push(session.currentLine);
    session.currentLine++;
    session.executedLines.push(session.currentLine);
    return { ok: true, line: session.currentLine, callStackDepth: session.callStack.length };
  },

  // Step out of function
  stepOut(session) {
    if (session.callStack.length > 0) {
      session.callStack.pop();
    }
    return { ok: true, callStackDepth: session.callStack.length };
  },

  // Get current state
  getState(session) {
    return {
      ok: true,
      line: session.currentLine,
      variables: session.variables,
      callStack: session.callStack,
      isPaused: session.isPaused,
      breakpoints: Array.from(session.breakpoints),
      executedLines: session.executedLines
    };
  },

  // Set variable value (for watches)
  setVariable(session, name, value) {
    session.variables[name] = value;
    return { ok: true, variable: name, value };
  },

  // Get variable value
  getVariable(session, name) {
    return {
      ok: true,
      variable: name,
      value: session.variables[name],
      defined: name in session.variables
    };
  }
};
