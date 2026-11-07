# Preserve the saved ElevenLabs voice delivery

The original voice transport omitted `voice_settings`. A later integration added
fixed overrides: stability 0.45, similarity 0.8, style 0.15, and speaker boost on.
These overrides replaced the selected voice's saved settings. This is a confirmed
configuration mismatch, not proof of the cause of the reported rushed sound.

Speech requests now omit those overrides again, allowing ElevenLabs to use the
selected voice's saved settings. No speed, pitch, tone, or style adjustment is
applied by the browser or added to the request. Voice selection, configured TTS
model, conversational prompts, verified reply text, and financial number
pronunciation remain unchanged. No extra network request or buffering is added.
The audio cache policy has a distinct key so clips made under the fixed overrides
cannot be reused under this policy.

The full voice endpoint regression asserts that no delivery overrides reach
ElevenLabs and that the verified spoken text, selected voice, model, and replay
cache still behave as expected. A separate regression checks legacy cache key
separation. Tests use a local provider stand-in, not a real voice recording.

An exact match to the user's original ElevenLabs sample still requires that
sample and its model/settings. Saved voice settings do not necessarily include
temporary settings used for a particular ElevenLabs preview. We cannot verify
monotone delivery or subjective pacing without that reference and a live listen.
Changing settings directly in ElevenLabs does not invalidate an already cached
clip in the running app; restart the app or request a new reply to hear it.

Validation for this change: `npm test` passed all 108 tests. The Chromium script
completed its 17 direct audio scenarios and payload/error assertions, then timed
out looking for `[data-listen]` in restored history. Current main only renders that
control while voice mode is active, so the existing UI interruption/hands-free
portion and final latency comparison did not complete in this run.
