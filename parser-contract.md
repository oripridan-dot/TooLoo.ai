# Transcript Parser Contract (Phase P1)
Version: 0.1.0
Date: 2025-10-08

## Purpose
Normalize raw pasted transcript text into structured messages for downstream segmentation & pattern extraction.

## Input Format (Flexible)
- Preferred: One message per line: `user: text` or `ai: text`.
- Lines without an `author:` prefix that follow a message are appended to previous message (multi-line support).
- Blank lines ignored.

## Output Shape
{
  messages: [ { id, author, content, index } ],
  metadata: { lineCount, messageCount, charCount, truncated, reasons: [] }
}

## Sampling
- Default maxMessages = 400 (configurable) — truncates beyond limit; sets `truncated=true` and adds reason `TRUNCATED_MAX_MESSAGES`.

## Edge Cases
| Case | Handling | Reason Flag |
|------|----------|-------------|
| Empty / whitespace input | Returns empty arrays | EMPTY_INPUT |
| Oversize > maxMessages | Truncate after limit | TRUNCATED_MAX_MESSAGES |
| Orphan line at start | Treated as `user` message | (none) |

## Determinism Guarantees
- No randomness; same input yields identical message ordering & IDs.
- IDs assigned sequentially (m1..mN).

## Time Complexity
O(N) over line count with constant-time operations per line.

## Known Non-Goals (v0.1)
- No timestamp parsing.
- No participant alias normalization beyond `user`/`ai`.
- No language detection.

## Future Hooks
- Timestamp inference from leading `[HH:MM]` patterns.
- Participant mapping (e.g., multiple human speakers).
- Sanitization & PII redaction layer.

End of Contract v0.1.0