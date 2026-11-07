// Own the entire asynchronous lifecycle, including fetch, decoding, play(), and native controls.
// No text splitting, chunk concatenation, added buffering, or speech setting changes.
export class VoicePlayback {
  constructor({log = event => console.info('[voice]', JSON.stringify(event)), now = () => performance.now()} = {}) {
    this.log = log; this.now = now; this.active = null;
  }
  event(op, event, details = {}) {
    this.log({event, requestId:op.id, elapsedMs:Math.round(this.now()-op.started), ...details});
  }
  stop(reason = 'user') {
    const op = this.active;
    if (!op) return;
    this.active = null; op.abort.abort();
    for (const [name, handler] of op.handlers) op.audio.removeEventListener(name, handler);
    op.audio.pause(); op.audio.removeAttribute('src'); op.audio.load();
    if (op.url) URL.revokeObjectURL(op.url);
    this.event(op, 'cancelled', {reason}); op.state('stopped');
  }
  async start(audio, load, state = () => {}) {
    this.stop('superseded');
    const op = {id:crypto.randomUUID(), started:this.now(), audio, abort:new AbortController(), state, handlers:[]};
    this.active = op;
    const current = () => this.active === op && !op.abort.signal.aborted;
    const on = (name, handler) => {audio.addEventListener(name,handler);op.handlers.push([name,handler]);};
    for (const name of ['playing','waiting','stalled','ended','error']) on(name, () => {
      if (!current()) return;
      this.event(op,name,{position:audio.currentTime, interruption:name === 'waiting' ? Boolean(op.hasPlayed) : undefined, code:audio.error?.code || undefined});
      if (name === 'playing') {op.hasPlayed = true;state('playing');}
      if (name === 'ended') state('ended');
      if (name === 'error') {this.stop('media-error');state('error',new Error('Audio playback failed. Try Listen again; your written answer is unchanged.'));}
    });
    this.event(op,'requested'); state('loading');
    try {
      const blob = await load(op.abort.signal,op.id);
      if (!current()) return;
      if (!blob.size || !/^audio\/mpeg(?:;|$)/i.test(blob.type)) throw Error('The voice service returned invalid MP3 audio. Try Listen again.');
      this.event(op,'received',{bytes:blob.size});
      op.url = URL.createObjectURL(blob); audio.src = op.url;
      // Ownership is assigned before invoking play(), not after it resolves.
      await audio.play();
      if (!current()) return;
    } catch (error) {
      if (!current()) return;
      if (error.name === 'NotAllowedError') {this.event(op,'autoplay-blocked');state('blocked');return;}
      this.event(op,'playback-error',{name:error.name});this.stop('error');state('error',error);
    }
  }
}
