/* ══════════════════════════════════════════════
   toast.js — Notificações de feedback (toast)
   Usado por contacto.js e atividades.js
   Associação Nhelety
   ══════════════════════════════════════════════ */

/**
 * Mostra uma notificação temporária no rodapé do ecrã.
 * @param {string} msg      - Texto da mensagem
 * @param {number} duration - Duração em ms (padrão: 4000)
 */
function showToast(msg, duration = 4000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
