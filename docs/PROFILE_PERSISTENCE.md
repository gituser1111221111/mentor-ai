# Profile persistence before launch

Local changes preserve chat history during profile updates, restore chats without a completed quiz, refill saved quiz values, and replace the delayed JSON write with an atomic synchronous write.

The local UI proxies API calls to Render. Backend improvements must be deployed there to take effect.

The current anonymous session uses a browser-local identifier, not an authenticated account. It does not support secure cross-device access. Render's default filesystem is ephemeral. Set STORE_FILE on a persistent mounted disk for a single-process pilot; use a durable database plus authenticated ownership checks before public launch. The store still caps anonymous sessions at 2,000 and chat retention is bounded: it is not a permanent archive. Add backups, explicit retention, account deletion/export, and migration before launch. Do not claim all profile data is permanently saved until these are configured and verified.

Generated logo: public/img/mentor-logo-seal.png. Built-in image generation prompt: intricate cream/gold M monogram, architectural linework, open book and compass star, circular seal on forest green.
21st.dev CLI search for background beams returned HTTP 401; the hero uses original lightweight CSS motion with reduced-motion support.
