/* ══════════════════════════════════════════════
   toast.js — Notificação global showToast()
   Associação Nhelety
   ══════════════════════════════════════════════ */

function showToast(msg, duracao) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duracao || 3500);
}
