/* ══════════════════════════════════════════════
   contato.js — Validação do formulário de candidatura
   Associação Nhelety
   ══════════════════════════════════════════════ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('form-candidatura');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nome     = document.getElementById('nome')?.value.trim();
      const email    = document.getElementById('email')?.value.trim();
      const tipo     = document.getElementById('tipo')?.value;
      const mensagem = document.getElementById('mensagem')?.value.trim();
      const errEl    = document.getElementById('form-error');

      // Limpar erro anterior
      if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }

      // Validação
      if (!nome) {
        mostrarErro(errEl, 'Por favor, introduza o seu nome completo.');
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarErro(errEl, 'Por favor, introduza um endereço de e-mail válido.');
        return;
      }
      if (!tipo) {
        mostrarErro(errEl, 'Por favor, selecione o tipo de adesão.');
        return;
      }
      if (!mensagem) {
        mostrarErro(errEl, 'Por favor, escreva uma mensagem.');
        return;
      }

      // Sucesso — mostrar toast e limpar formulário
      if (typeof showToast === 'function') {
        showToast('✅ Candidatura enviada com sucesso! Entraremos em contato em breve.');
      }
      form.reset();
    });

    function mostrarErro(el, msg) {
      if (!el) return;
      el.textContent = msg;
      el.classList.remove('hidden');
    }
  });

})();
