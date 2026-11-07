# Voice playback investigation

Initial reproduction: main `47a9a63`. Integrated and retested against main `74acf46`, including the progressive-response and hands-free features merged during this investigation. Fix branch: `fix/voice-playback-races`.

## Confirmed defects

The old browser implementation assigned playback ownership only after awaiting an uncancelled speech fetch. A controlled reproduction completed request B before A: playback started B, then A. A's `onplay` stopped B. This explains abrupt cuts and out-of-order answers; Stop did nothing while A was still fetching. Typed questions also failed to stop an existing answer, and late chat responses could auto-play after an interruption.

The audio cache used session/turn/mentor/voice only. Re-picking the same turn could replace its stored text but still retrieve its old MP3. Browser audio resources were never revoked. Failures during media decoding or buffering had no diagnostics.

These are reproduced code defects, not proof that every reported production artifact has the same cause. Production traces and a real ElevenLabs listening session were unavailable.

## Pipeline and speed review

Current main does **not** stream text to TTS or concatenate audio chunks. The financial pipeline finishes generation, validation and picking before a stored reply becomes eligible for speech. ElevenLabs receives that whole reply in one request to `/v1/text-to-speech/{voice}?output_format=mp3_44100_128`. Node collects the complete MP3, the browser downloads it as a Blob, then the audio element decodes and plays it. HTTP transport chunks are ordered by the networking stack, not by an application-level sentence queue. Network delays can delay startup; invalid or interrupted payloads can fail decoding, but application audio-chunk reordering is not present here.

Recent conversational work enabled automatic playback for typed responses, increasing exposure to this lifecycle race. The later progressive-response optimization generates a smaller first verified option set and can expand it after the answer. It does not stream partial recommendations into speech. The hands-free implementation closes microphone capture while thinking and speaking; the fix preserves its await-playback-completion contract and guards against starting capture while any reply is loading or playing. No calculation, validation, generation, or picking code was changed in this fix.

## Changes

- A single playback owner covers fetch, Blob creation, decoding, `play()` promises, and native audio events. Abort and identity checks prevent stale work from playing even if the transport ignores cancellation.
- Stop, new typed questions, recording, mentor/coach changes, and navigation cancel pending and active audio. A chat epoch prevents a delayed answer from auto-playing after an interruption.
- Stop is available while preparing audio. Failed loads return Listen to a retryable state. Autoplay restrictions leave native play available.
- Cancelled playback removes its source and revokes its Blob URL. Browser disconnects abort upstream synthesis; cancelled work is not cached.
- Stored answers have content versions. Cache keys include exact text, voice, model, settings, and format. Browser-supplied text is still ignored; only the server's stored response can be synthesized.
- Non-MP3 and empty service responses are rejected. Diagnostics distinguish startup buffering from waiting after playback has begun.

No buffering delay was added, streaming was not disabled, text was not split/rephrased, and no volume normalization or speech-speed manipulation was introduced. `eleven_flash_v2_5`, MP3 44.1 kHz / 128 kbps, stability 0.45, similarity 0.8, style 0.15 and speaker boost are unchanged. There is no listening evidence supporting a voice-setting change.

## Diagnostics

Server `[voice]` JSON events: `generation-start`, `generation-complete`, `generation-error`, `generation-cancelled`. They include a request id, elapsed milliseconds, cache status and byte count. HTTP exposes `Server-Timing` and `X-Voice-Request-Id` for correlation.

Browser `[voice]` JSON events: `requested`, `received`, `playing`, `waiting`, `stalled`, `ended`, `error`, `playback-error`, `autoplay-blocked`, `cancelled`. They include elapsed time and media position; waiting after first playback is marked `interruption: true`. Logs exclude financial text, audio contents, keys and voice ids. These are browser-console and server logs, not a new telemetry collection service.

## Verification and limits

`npm test`: 71 passed, 0 failed after integration with current main. `npm run db:test`: 20 database checks passed (PGlite, hosted services simulated). Tests include existing checks plus new race, pending Stop, delayed `play()`, error/retry, format, cache-version/model and cancellation regressions. The baseline stale-order reproduction produced `[new, old]`; the regression now keeps the new answer active and the old source empty.

`CHROMIUM_PATH=/usr/bin/chromium node scripts/test-voice-browser.cjs` runs a local ElevenLabs stand-in through real Chromium MP3 decoding/playback: 15 financial coaching questions, including numerical amounts and a repeated question, plus independently numeric-checked short and long text fixtures (59 and 1,576 characters). It verifies whole-text payload identity, playback completion, no decoding errors and no waiting events after first playback. Interruption races, repeat requests and failed transports are also covered by the automated lifecycle tests. The fixed-duration synthetic tone deliberately tests transport and decoding rather than pretending to test spoken sentence cadence or pronunciation. The practice engine's generated replies may repeat across different questions.

A controlled before/after benchmark uses the exact same MP3 and simulated 20 ms transport delay, alternating the old and new controller for 15 samples each. Results vary with Chromium scheduling; the run summary records both medians. The fix adds no intentional buffering or synthesis wait. These local times are not a measurement of ElevenLabs generation time or production network latency.

No real API credentials were configured. Naturalness, accent, numerical pronunciation, loudness consistency, provider-side artifacts and production/mobile network performance still require a real ElevenLabs listening session. The fix does not claim that a tone test establishes conversational voice quality. The PR is left for review rather than automatically merged with those acoustic checks outstanding.

The pre-integration controlled run measured a median 43.1 ms before and 38.9 ms after (15 samples each), consistent with scheduler noise rather than a meaningful added delay. The integrated browser suite also checks the actual typed-question interrupt handler and verifies that a hands-free reply promise remains pending until audio ends. No real speaker/microphone echo-path quality claim is made.

Final integrated run: 17 audio scenarios completed, exact full-text payloads confirmed, 0 decode errors and 0 mid-playback waiting events; typed-interruption and hands-free completion assertions passed. Alternating controller medians were 39.2 ms before and 43.4 ms after (15 samples/version). This roughly 4 ms local difference is small and does not establish real-provider latency.
