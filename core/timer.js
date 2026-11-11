// Server-authoritative countdown. Clients render from endsAt using their synced offset.
function startCountdown(nsp, roomCode, seconds, { onTick, onEnd } = {}) {
  const endsAt = Date.now() + seconds * 1000;
  nsp.to(roomCode).emit('timer:start', { endsAt, serverNow: Date.now() });

  const t = setInterval(() => {
    const left = endsAt - Date.now();
    if (left <= 0) {
      clearInterval(t);
      onEnd?.();
    } else {
      onTick?.(left);
    }
  }, 250);

  return { endsAt, cancel: () => clearInterval(t) };
}

module.exports = { startCountdown };