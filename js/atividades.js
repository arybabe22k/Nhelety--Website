/* ══════════════════════════════════════════════
   atividades.js — Gestão de posts de atividades
   Leitura pública + painel de administração
   Integração com Supabase
   Associação Nhelety
   ══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     🔐 CONFIGURAÇÃO DE ACESSO ADMIN
  ───────────────────────────────────────────── */
  const ADMIN_KEY = 'nhelety2025';
  const params    = new URLSearchParams(window.location.search);
  const adminMode = params.get('key') === ADMIN_KEY;

  function aplicarVisibilidadeAdmin() {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = adminMode ? 'inline-block' : 'none';
    });
  }

  /* ─────────────────────────────────────────────
     ☁️ SUPABASE
  ───────────────────────────────────────────── */
  const SUPA_URL = 'https://iytjlhotluybgpkbhmjt.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dGpsaG90bHV5Ymdwa2JobWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzQ1MzcsImV4cCI6MjA4OTAxMDUzN30.UJezaHcmA29XHjrHHBC0zD5usun0-REbhTSdo8KCgt4';
  const HEADERS  = {
    'Content-Type': 'application/json',
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
  };

  async function dbCarregar() {
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/posts?order=data.desc`, { headers: HEADERS });
      if (!res.ok) throw new Error('Erro ao carregar posts');
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function dbInserir(post) {
    const res = await fetch(`${SUPA_URL}/rest/v1/posts`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(post),
    });
    if (!res.ok) throw new Error('Erro ao inserir post');
    return (await res.json())[0];
  }

  async function dbAtualizar(id, post) {
    const res = await fetch(`${SUPA_URL}/rest/v1/posts?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(post),
    });
    if (!res.ok) throw new Error('Erro ao atualizar post');
    return (await res.json())[0];
  }

  async function dbEliminar(id) {
    const res = await fetch(`${SUPA_URL}/rest/v1/posts?id=eq.${id}`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    if (!res.ok) throw new Error('Erro ao eliminar post');
  }

  /* ─────────────────────────────────────────────
     ESTADO
  ───────────────────────────────────────────── */
  let todosOsPosts = [];
  let mediaTemp = { imagem: null, video: null };

  const CATEGORIAS = {
    evento:   { label: 'Evento',   emoji: '📅', css: 'cat-evento'   },
    projeto:  { label: 'Projeto',  emoji: '🌱', css: 'cat-projeto'  },
    noticia:  { label: 'Notícia',  emoji: '📰', css: 'cat-noticia'  },
    parceria: { label: 'Parceria', emoji: '🤝', css: 'cat-parceria' },
  };

  /* ─────────────────────────────────────────────
     UTILITÁRIOS
  ───────────────────────────────────────────── */
  function formatarData(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${+d} ${meses[+m - 1]} ${a}`;
  }

  function gerarId() { return 'p' + Date.now(); }

  function tamanhoLegivel(bytes) {
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  /* ─────────────────────────────────────────────
     LEITURA DE FICHEIROS
  ───────────────────────────────────────────── */
  const LIMITE_IMG = 5  * 1024 * 1024;
  const LIMITE_VID = 50 * 1024 * 1024;

  function lerBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = e => res(e.target.result);
      r.onerror = () => rej(new Error('Erro ao ler ficheiro.'));
      r.readAsDataURL(file);
    });
  }

  function lerVideoComProgresso(file) {
    return new Promise((res, rej) => {
      const r   = new FileReader();
      const prg = document.getElementById('f-video-progress');
      const bar = document.getElementById('f-video-bar');
      const pct = document.getElementById('f-video-pct');
      prg.style.display = 'block';
      r.onprogress = e => {
        if (e.lengthComputable) {
          const p = Math.round(e.loaded / e.total * 100);
          bar.style.width  = p + '%';
          pct.textContent  = p + '%';
        }
      };
      r.onload  = e => { prg.style.display = 'none'; res(e.target.result); };
      r.onerror = () => { prg.style.display = 'none'; rej(new Error('Erro ao ler vídeo.')); };
      r.readAsDataURL(file);
    });
  }

  /* ─────────────────────────────────────────────
     DRAG & DROP
  ───────────────────────────────────────────── */
  function configurarDragDrop(id, callback) {
    const zona = document.getElementById(id);
    if (!zona) return;
    zona.addEventListener('dragover',  e => { e.preventDefault(); zona.classList.add('drag-over'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('drag-over'));
    zona.addEventListener('drop', async e => {
      e.preventDefault();
      zona.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) await callback(f);
    });
  }

  /* ─────────────────────────────────────────────
     PREVIEWS
  ───────────────────────────────────────────── */
  function mostrarPreviewImagem(src) {
    document.getElementById('f-imagem-placeholder').style.display = 'none';
    document.getElementById('f-imagem-preview').style.display     = 'block';
    document.getElementById('f-imagem-thumb').src = src;
  }

  function mostrarPreviewVideo(src) {
    document.getElementById('f-video-placeholder').style.display = 'none';
    document.getElementById('f-video-preview').style.display     = 'block';
    const v = document.getElementById('f-video-thumb');
    v.src = src;
    v.load();
  }

  window.limparFicheiro = function (tipo, event) {
    event.stopPropagation();
    mediaTemp[tipo] = null;
    if (tipo === 'imagem') {
      document.getElementById('f-imagem').value = '';
      document.getElementById('f-imagem-preview').style.display     = 'none';
      document.getElementById('f-imagem-placeholder').style.display = 'flex';
      document.getElementById('f-imagem-thumb').src = '';
    } else {
      document.getElementById('f-video').value = '';
      document.getElementById('f-video-preview').style.display     = 'none';
      document.getElementById('f-video-placeholder').style.display = 'flex';
      document.getElementById('f-video-thumb').src = '';
    }
  };

  /* ─────────────────────────────────────────────
     UPLOAD HANDLERS
  ───────────────────────────────────────────── */
  function iniciarUploadHandlers() {
    const inputImg = document.getElementById('f-imagem');
    if (inputImg) {
      inputImg.addEventListener('change', async function () {
        const f = this.files[0];
        if (!f) return;
        if (f.size > LIMITE_IMG) {
          showToast(`⚠️ Imagem demasiado grande (${tamanhoLegivel(f.size)}). Máximo: 5 MB.`);
          this.value = '';
          return;
        }
        try {
          const b64 = await lerBase64(f);
          mediaTemp.imagem = b64;
          mostrarPreviewImagem(b64);
        } catch { showToast('❌ Erro ao carregar imagem.'); }
      });
      configurarDragDrop('f-imagem-drop', async f => {
        if (!f.type.startsWith('image/')) { showToast('⚠️ Ficheiro não é uma imagem.'); return; }
        if (f.size > LIMITE_IMG)          { showToast('⚠️ Imagem demasiado grande. Máximo: 5 MB.'); return; }
        const b64 = await lerBase64(f);
        mediaTemp.imagem = b64;
        mostrarPreviewImagem(b64);
      });
    }

    const inputVid = document.getElementById('f-video');
    if (inputVid) {
      inputVid.addEventListener('change', async function () {
        const f = this.files[0];
        if (!f) return;
        if (f.size > LIMITE_VID) {
          showToast(`⚠️ Vídeo demasiado grande (${tamanhoLegivel(f.size)}). Máximo: 50 MB.`);
          this.value = '';
          return;
        }
        try {
          const b64 = await lerVideoComProgresso(f);
          mediaTemp.video = b64;
          mostrarPreviewVideo(b64);
        } catch { showToast('❌ Erro ao carregar vídeo.'); }
      });
      configurarDragDrop('f-video-drop', async f => {
        if (!f.type.startsWith('video/')) { showToast('⚠️ Ficheiro não é um vídeo.'); return; }
        if (f.size > LIMITE_VID)          { showToast('⚠️ Vídeo demasiado grande. Máximo: 50 MB.'); return; }
        const b64 = await lerVideoComProgresso(f);
        mediaTemp.video = b64;
        mostrarPreviewVideo(b64);
      });
    }
  }

  /* ─────────────────────────────────────────────
     RENDERIZAÇÃO PÚBLICA
  ───────────────────────────────────────────── */
  let filtroActivo = 'todos';

  function renderPublico() {
    const container = document.getElementById('posts-grid');
    if (!container) return;

    const filtrados = (filtroActivo === 'todos')
      ? todosOsPosts
      : todosOsPosts.filter(p => p.categoria === filtroActivo);

    filtrados.sort((a, b) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return new Date(b.data) - new Date(a.data);
    });

    if (filtrados.length === 0) {
      container.innerHTML = `
        <div class="empty-state col-span-full">
          <div class="icon">📭</div>
          <p class="font-semibold text-lg">Nenhuma atividade encontrada</p>
          <p class="text-sm mt-2">Tente outro filtro ou volte mais tarde.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtrados.map(post => {
      const cat = CATEGORIAS[post.categoria] || CATEGORIAS.noticia;
      let mediaHTML = '';
      if (post.imagem) {
        mediaHTML = `<img src="${post.imagem}" alt="${post.titulo}" class="post-media" loading="lazy" />`;
      } else if (post.video) {
        mediaHTML = `<video src="${post.video}" class="post-video" controls preload="metadata"></video>`;
      }
      const btnEditar = adminMode
        ? `<button onclick="abrirAdmin('editar','${post.id}')"
             class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200
                    hover:border-orange-400 hover:text-orange-500 transition-colors">✏️ Editar</button>`
        : '';
      return `
        <article class="post-card flex flex-col">
          ${mediaHTML}
          <div class="p-6 flex-1 flex flex-col">
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              <span class="post-category ${cat.css}">${cat.emoji} ${cat.label}</span>
              ${post.destaque ? '<span class="pin-badge">📌 Destaque</span>' : ''}
              ${post.video && !post.imagem ? '<span class="post-category" style="background:#EDE9FE;color:#4C1D95">🎬 Vídeo</span>' : ''}
            </div>
            <h3 class="text-lg font-bold mb-2 leading-snug" style="font-family:'Playfair Display',serif">${post.titulo}</h3>
            <p class="text-sm text-gray-500 leading-relaxed flex-1">${post.resumo}</p>
          </div>
          <div class="px-6 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400">${formatarData(post.data)}</p>
              <p class="text-xs font-medium text-gray-500">${post.autor || ''}</p>
            </div>
            ${btnEditar}
          </div>
        </article>`;
    }).join('');
  }

  function renderFiltros() {
    const wrap = document.getElementById('filtros-categoria');
    if (!wrap) return;
    const opcoes = [
      { key: 'todos', label: 'Todos', emoji: '🔍' },
      ...Object.entries(CATEGORIAS).map(([k, v]) => ({ key: k, label: v.label, emoji: v.emoji }))
    ];
    wrap.innerHTML = opcoes.map(op => `
      <button class="filter-btn ${filtroActivo === op.key ? 'active' : ''}" onclick="filtrarPosts('${op.key}')">
        ${op.emoji} ${op.label}
      </button>`).join('');
  }

  window.filtrarPosts = function (cat) {
    filtroActivo = cat;
    renderFiltros();
    renderPublico();
  };

  /* ─────────────────────────────────────────────
     PAINEL ADMIN
  ───────────────────────────────────────────── */
  let adminAba   = 'lista';
  let editandoId = null;

  window.openAdmin = function () {
    if (!adminMode) {
      showToast('🔒 Acesso restrito. Utilize o link de administração.');
      return;
    }
    document.getElementById('admin-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
    mudarAba('lista');
  };

  window.closeAdmin = function () {
    document.getElementById('admin-panel').classList.remove('open');
    document.body.style.overflow = '';
    editandoId = null;
    mediaTemp = { imagem: null, video: null };
  };

  window.abrirAdmin = function (aba, id) {
    if (!adminMode) return;
    openAdmin();
    if (aba === 'editar' && id) { editandoId = id; mudarAba('editar'); }
  };

  function mudarAba(aba) {
    adminAba = aba;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.aba === aba));
    document.getElementById('admin-lista').style.display     = aba === 'lista' ? 'block' : 'none';
    document.getElementById('admin-form-wrap').style.display = (aba === 'novo' || aba === 'editar') ? 'block' : 'none';
    if (aba === 'lista')  renderAdminLista();
    if (aba === 'novo')   preencherForm(null);
    if (aba === 'editar') preencherForm(todosOsPosts.find(p => p.id === editandoId) || null);
  }

  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => mudarAba(tab.dataset.aba));
  });

  function renderAdminLista() {
    const lista = document.getElementById('admin-lista-posts');
    if (todosOsPosts.length === 0) {
      lista.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Ainda não há posts.</p></div>`;
      return;
    }
    lista.innerHTML = [...todosOsPosts].sort((a, b) => new Date(b.data) - new Date(a.data)).map(post => {
      const cat   = CATEGORIAS[post.categoria] || CATEGORIAS.noticia;
      const thumb = post.imagem
        ? `<img src="${post.imagem}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0" />`
        : post.video
          ? `<div style="width:52px;height:52px;background:#1A1A0E;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎬</div>`
          : `<div style="width:52px;height:52px;background:#F3F0E8;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.3rem">📄</div>`;
      return `
        <div class="post-list-item">
          ${thumb}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="post-category ${cat.css} text-xs">${cat.emoji} ${cat.label}</span>
              ${post.destaque ? '<span class="pin-badge">📌</span>' : ''}
              <span class="text-xs text-gray-400">${formatarData(post.data)}</span>
            </div>
            <p class="font-semibold text-sm truncate">${post.titulo}</p>
            <p class="text-xs text-gray-400 mt-0.5">${post.autor || '—'}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button onclick="abrirAdmin('editar','${post.id}')"
              class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-yellow-400 font-semibold transition-colors">✏️</button>
            <button onclick="eliminarPost('${post.id}')"
              class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-400 hover:text-red-500 font-semibold transition-colors">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }

  function preencherForm(post) {
    document.getElementById('admin-form-titulo').textContent  = post ? 'Editar Post' : 'Novo Post';
    document.getElementById('f-titulo').value     = post?.titulo    || '';
    document.getElementById('f-resumo').value     = post?.resumo    || '';
    document.getElementById('f-categoria').value  = post?.categoria || 'noticia';
    document.getElementById('f-data').value       = post?.data      || new Date().toISOString().split('T')[0];
    document.getElementById('f-autor').value      = post?.autor     || '';
    document.getElementById('f-destaque').checked = !!post?.destaque;
    if (!post) editandoId = null;

    mediaTemp.imagem = post?.imagem || null;
    mediaTemp.video  = post?.video  || null;

    const imgPrev = document.getElementById('f-imagem-preview');
    const imgPh   = document.getElementById('f-imagem-placeholder');
    const vidPrev = document.getElementById('f-video-preview');
    const vidPh   = document.getElementById('f-video-placeholder');

    if (mediaTemp.imagem) {
      imgPrev.style.display = 'block'; imgPh.style.display = 'none';
      document.getElementById('f-imagem-thumb').src = mediaTemp.imagem;
    } else {
      imgPrev.style.display = 'none'; imgPh.style.display = 'flex';
      document.getElementById('f-imagem-thumb').src = '';
    }
    if (mediaTemp.video) {
      vidPrev.style.display = 'block'; vidPh.style.display = 'none';
      const v = document.getElementById('f-video-thumb');
      v.src = mediaTemp.video; v.load();
    } else {
      vidPrev.style.display = 'none'; vidPh.style.display = 'flex';
      document.getElementById('f-video-thumb').src = '';
    }

    document.getElementById('f-imagem').value = '';
    document.getElementById('f-video').value  = '';
    document.getElementById('f-video-progress').style.display = 'none';
  }

  document.getElementById('admin-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!adminMode) return;

    const errEl = document.getElementById('admin-form-error');
    errEl.textContent = '';

    const titulo    = document.getElementById('f-titulo').value.trim();
    const resumo    = document.getElementById('f-resumo').value.trim();
    const categoria = document.getElementById('f-categoria').value;
    const data      = document.getElementById('f-data').value;
    const autor     = document.getElementById('f-autor').value.trim();
    const destaque  = document.getElementById('f-destaque').checked;

    if (!titulo)    { errEl.textContent = 'O título é obrigatório.'; return; }
    if (!resumo)    { errEl.textContent = 'O resumo é obrigatório.'; return; }
    if (!categoria) { errEl.textContent = 'Selecione uma categoria.'; return; }
    if (!data)      { errEl.textContent = 'A data é obrigatória.'; return; }

    const dadosPost = { titulo, resumo, categoria, data, autor, destaque,
      imagem: mediaTemp.imagem, video: mediaTemp.video };

    try {
      if (editandoId) {
        const updated = await dbAtualizar(editandoId, dadosPost);
        const idx = todosOsPosts.findIndex(p => p.id === editandoId);
        if (idx !== -1) todosOsPosts[idx] = updated;
        showToast('✅ Post actualizado com sucesso!');
      } else {
        const novo = await dbInserir({ id: gerarId(), ...dadosPost });
        todosOsPosts.unshift(novo);
        showToast('✅ Post publicado com sucesso!');
      }
    } catch (err) {
      errEl.textContent = '❌ Erro ao guardar: ' + err.message;
      return;
    }

    renderPublico();
    editandoId = null;
    mediaTemp  = { imagem: null, video: null };
    mudarAba('lista');
  });

  window.eliminarPost = async function (id) {
    if (!adminMode) return;
    if (!confirm('Tem a certeza que deseja eliminar este post? Esta ação é irreversível.')) return;
    try {
      await dbEliminar(id);
      todosOsPosts = todosOsPosts.filter(p => p.id !== id);
      renderPublico();
      renderAdminLista();
      showToast('🗑️ Post eliminado.');
    } catch (err) {
      showToast('❌ Erro ao eliminar: ' + err.message);
    }
  };

  document.getElementById('admin-panel').addEventListener('click', function (e) {
    if (e.target === this) closeAdmin();
  });

  /* ─────────────────────────────────────────────
     INICIALIZAÇÃO
  ───────────────────────────────────────────── */
  async function init() {
    aplicarVisibilidadeAdmin();
    iniciarUploadHandlers();
    renderFiltros();

    const container = document.getElementById('posts-grid');
    if (container) {
      container.innerHTML = `<div class="empty-state col-span-full"><div class="icon">⏳</div><p>A carregar atividades...</p></div>`;
    }

    todosOsPosts = await dbCarregar();
    renderPublico();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
