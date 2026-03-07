/* ══════════════════════════════════════════════
   contacto.js — Validação e envio do formulário
   Associação Nhelety
   ══════════════════════════════════════════════ */

(function () {
  'use strict';

  const form     = document.getElementById('form-candidatura');
  const errorBox = document.getElementById('form-error');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    const nome     = document.getElementById('nome').value.trim();
    const email    = document.getElementById('email').value.trim();
    const tipo     = document.getElementById('tipo').value;
    const mensagem = document.getElementById('mensagem').value.trim();

    // ── Validações ──
    if (!nome || nome.length < 3) {
      return showError('Por favor, introduza o seu nome completo (mínimo 3 caracteres).');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError('Por favor, introduza um endereço de e-mail válido.');
    }
    if (!tipo) {
      return showError('Por favor, seleccione o tipo de adesão.');
    }
    if (!mensagem || mensagem.length < 20) {
      return showError('A mensagem deve ter pelo menos 20 caracteres. Conte-nos mais sobre si.');
    }

    // ── Simulação de envio ──
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'A enviar...';

    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      btn.textContent = 'Enviar Candidatura ✉';
      showToast('✅ Candidatura enviada com sucesso! Entraremos em contacto em breve.');
    }, 1200);
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError() {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }

})();
