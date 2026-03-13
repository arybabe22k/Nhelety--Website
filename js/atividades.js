/* ══════════════════════════════════════════════
   atividades.js — Gestão de posts de atividades
   Leitura pública + painel de administração
   Inclui suporte a upload de imagens e vídeos
   Associação Nhelety
   ══════════════════════════════════════════════ */
 
(function () {
  'use strict';
 
  /* ─────────────────────────────────────────────
     🔐 CONFIGURAÇÃO DE ACESSO ADMIN
     O painel Admin só aparece quando o URL contém
     o parâmetro secreto correcto. Exemplo:
       https://seusite.com/?key=nhelety2025
     ✏️  Para mudar a chave: edite apenas ADMIN_KEY.
  ───────────────────────────────────────────── */
  const ADMIN_KEY = 'nhelety2025';
  const params    = new URLSearchParams(window.location.search);
  const adminMode = params.get('key') === ADMIN_KEY;
 
  function aplicarVisibilidadeAdmin() {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = adminMode ? '' : 'none';
    });
  }
 
  /* ─────────────────────────────────────────────
     ESTADO
  ───────────────────────────────────────────── */
  const STORAGE_KEY = 'nhelety_posts';
 
  // Media temporária durante edição (não persiste até guardar)
  let mediaTemp = { imagem: null, video: null };
 
  const CATEGORIAS = {
    evento:   { label: 'Evento',   emoji: '📅', css: 'cat-evento'   },
    projeto:  { label: 'Projeto',  emoji: '🌱', css: 'cat-projeto'  },
    noticia:  { label: 'Notícia',  emoji: '📰', css: 'cat-noticia'  },
    parceria: { label: 'Parceria', emoji: '🤝', css: 'cat-parceria' },
  };
 
  const POSTS_EXEMPLO = [
    {
      id: 'p1',
      titulo: 'Distribuição de Kits Escolares em Maputo',
      resumo: 'A Associação Nhelety distribuiu mais de 200 kits escolares a crianças carenciadas nos bairros de Hulene e Polana Caniço, garantindo material para o novo ano letivo.',
      categoria: 'projeto', data: '2025-02-10', destaque: true, autor: 'Conselho de Direção',
      imagem: null, video: null,
    },
    {
      id: 'p2',
      titulo: 'Parceria com Escola Primária da Munhuana',
      resumo: 'Firmámos um acordo de cooperação com a EP Munhuana para apoio em material didático e formação de professores ao longo de 2025.',
      categoria: 'parceria', data: '2025-01-22', destaque: false, autor: 'Secretaria',
      imagem: null, video: null,
    },
    {
      id: 'p3',
      titulo: 'Assembleia Geral Ordinária — Março 2025',
      resumo: 'Realizou-se a Assembleia Geral Ordinária anual, onde foram aprovadas as contas de 2024 e eleita a nova Mesa da Assembleia para o mandato 2025-2027.',
      categoria: 'evento', data: '2025-03-01', destaque: false, autor: 'Mesa da Assembleia',
      imagem: null, video: null,
    },
  ];
 
  /* ─────────────────────────────────────────────
     PERSISTÊNCIA
  ───────────────────────────────────────────── */
  function carregarPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : POSTS_EXEMPLO;
    } catch { return POSTS_EXEMPLO; }
  }
 
  function guardarPosts(posts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast('⚠️ Espaço de armazenamento esgotado. Reduza o tamanho das imagens ou vídeos.');
      } else {
        console.warn('Erro ao guardar posts:', e);
      }
    }
  }
 
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
     LEITURA DE FICHEIROS (FileReader → base64)
  ───────────────────────────────────────────── */
  const LIMITE_IMG = 5  * 1024 * 1024;  // 5 MB
  const LIMITE_VID = 50 * 1024 * 1024;  // 50 MB
 
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
 
  // Exposto globalmente para os botões "Remover"
  window.limparFicheiro = function (tipo, event) {
    event.stopPropagation(); // não abrir o seletor de ficheiros
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
     INICIAR HANDLERS DE UPLOAD
  ───────────────────────────────────────────── */
  function iniciarUploadHandlers() {
    // ── Imagem ──
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
 
    // ── Vídeo ──
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
 
    const posts = carregarPosts();
    const filtrados = (filtroActivo === 'todos')
      ? posts
      : posts.filter(p => p.categoria === filtroActivo);
 
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
 
      // Media: imagem tem prioridade sobre vídeo
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
     PAINEL ADMIN — protegido por adminMode
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
    if (aba === 'editar') preencherForm(carregarPosts().find(p => p.id === editandoId) || null);
  }
 
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => mudarAba(tab.dataset.aba));
  });
 
  function renderAdminLista() {
    const lista = document.getElementById('admin-lista-posts');
    const posts = carregarPosts();
    if (posts.length === 0) {
      lista.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Ainda não há posts.</p></div>`;
      return;
    }
    lista.innerHTML = [...posts].sort((a, b) => new Date(b.data) - new Date(a.data)).map(post => {
      const cat   = CATEGORIAS[post.categoria] || CATEGORIAS.noticia;
      // Miniatura na lista admin
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
            <p class="font-semibold text-sm truncate">${post.titulo}${post.imagem ? ' 🖼️' : post.video ? ' 🎬' : ''}</p>
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
 
    // Restaurar media do post existente para mediaTemp
    mediaTemp.imagem = post?.imagem || null;
    mediaTemp.video  = post?.video  || null;
 
    // Restaurar previews
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
 
    // Limpar inputs de ficheiro
    document.getElementById('f-imagem').value = '';
    document.getElementById('f-video').value  = '';
    document.getElementById('f-video-progress').style.display = 'none';
  }
 
  document.getElementById('admin-form').addEventListener('submit', function (e) {
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
 
    const posts = carregarPosts();
    const dadosPost = {
      titulo, resumo, categoria, data, autor, destaque,
      imagem: mediaTemp.imagem,
      video:  mediaTemp.video,
    };
 
    if (editandoId) {
      const idx = posts.findIndex(p => p.id === editandoId);
      if (idx !== -1) posts[idx] = { ...posts[idx], ...dadosPost };
    } else {
      posts.unshift({ id: gerarId(), ...dadosPost });
    }
 
    guardarPosts(posts);
    renderPublico();
    showToast(editandoId ? '✅ Post actualizado com sucesso!' : '✅ Post publicado com sucesso!');
    editandoId = null;
    mediaTemp  = { imagem: null, video: null };
    mudarAba('lista');
  });
 
  window.eliminarPost = function (id) {
    if (!adminMode) return;
    if (!confirm('Tem a certeza que deseja eliminar este post? Esta ação é irreversível.')) return;
    guardarPosts(carregarPosts().filter(p => p.id !== id));
    renderPublico();
    renderAdminLista();
    showToast('🗑️ Post eliminado.');
  };
 
  document.getElementById('admin-panel').addEventListener('click', function (e) {
    if (e.target === this) closeAdmin();
  });
 
  /* ─────────────────────────────────────────────
     INICIALIZAÇÃO
  ───────────────────────────────────────────── */
  function init() {
    aplicarVisibilidadeAdmin();
    iniciarUploadHandlers();
    renderFiltros();
    renderPublico();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
 
})();