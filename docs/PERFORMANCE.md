# Response Performance Report (Nov 7)

**Live Claude latency has not been measured.** This environment has no Anthropic API key, so every number below is either a code-only measurement, a prompt-size measurement, or a scripted-stand-in run. None of them is a live Claude response time. To measure live, run `MENTOR_API_KEY=... npm run eval:people report.json`. It prints average, median, P90 and P95 answer latency and the share within 5, 8 and 10 seconds.

## The answer path (audit)

| Step | Before | After |
|---|---|---|
| 1. Conversation classification (Haiku, cached system prompt) | Ran first, alone | Runs **concurrently** with step 3 for money-like messages; greetings skip step 3 entirely |
| 2. Financial calculations (code) | 0.11 ms (measured) | unchanged |
| 3. Option generation | Sonnet, medium effort, up to **40** options before any answer | Sonnet, low effort, **8** options for the first answer (`MENTOR_INITIAL_OPTIONS`); started in parallel with step 1 and truly aborted if the message is small talk |
| 4. Validation (code) | 0.92 ms for 40 options (measured) | unchanged rules; runs on 8 |
| 5. Mentor pick (Haiku, notes cached) | Read about 22,000 system tokens plus up to 40 options | Reads about **9,200** system tokens (note metadata removed) plus 8 options |
| 6. More options | n/a | On request: `POST /api/expand` adds up to 32 more verified options, appended, never replacing the shown answer; "Ask your mentor to review all 40" runs a new, labeled pick |
| Voice | STT, chat, TTS in sequence | unchanged pipeline; STT and TTS now timed; TTS still speaks only the verified answer, and audio is cached per answer |

## Measured here (not live Claude)

| Measurement | Result |
|---|---|
| Financial calculations per request | 0.11 ms |
| Validating 40 options | 0.92 ms |
| Mentor picker system prompt | about 22,000 tokens before, about 9,200 after (58% smaller) |
| Mentor picker options payload | about 4,000 tokens for 40 options vs about 940 for 8 |
| Generation output (realistic option length) | about 570 tokens for 8 options vs about 2,240 for 32 more |
| 15-person suite, practice engine (no Claude) | 15/15 pass, answer median 3 ms. This is app overhead only |
| Scripted stand-in with simulated delays (classify 300 ms, generate 1,400 ms, pick 400 ms) | 1,814 ms server total vs 2,100 ms if sequential: classification fully overlapped |

Token counts are estimated at 4 characters per token.

## Estimates (not measured)

- The first answer is now bounded by **generation of 8 options plus one pick**, instead of classification, then 40 options, then a pick. Expected improvement is large but unmeasured. [Uncertain]
- The first question after about 5 idle minutes pays the full uncached prompt cost. Shrinking the picker prompt 58% reduces that penalty.
- "Show more options" (32 more) will take noticeably longer than the first answer, because it writes about 4 times as much output. It runs only when the user asks.

## Targets (configurable, flag only)

`MENTOR_TARGET_FIRST_MS` 5000, `MENTOR_TARGET_PREFERRED_MS` 8000, `MENTOR_TARGET_THRESHOLD_MS` 10000. Each response's timing records whether it met them. Responses over the threshold are logged as `OVER_THRESHOLD`. Past the threshold the chat says "Still checking the numbers. This is taking longer than usual." and keeps waiting. Nothing is cut off, and nothing unverified is shown.

## Remaining bottlenecks and open items

- **Unmeasured:** real Claude latency for every stage. This needs a key.
- **Generation quality at low effort** for the first 8 options has not been checked live. Set `MENTOR_INITIAL_EFFORT=medium` to compare.
- **Streaming TTS** (speaking while audio is still being generated) is not implemented, because it can't be verified against ElevenLabs from here. The current voice path waits for the full verified answer, then synthesizes it.
- **Voice likeness:** `lib/voice.js` auto-selects an ElevenLabs voice named exactly "Dave Ramsey" when no voice ID is configured. This needs a team decision to make sure it isn't a clone of the real person's voice (locked decision: no voice clone).
