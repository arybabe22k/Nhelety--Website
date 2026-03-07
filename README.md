# Associação Nhelety — Website Institucional

Site oficial da **Associação Nhelety**, organização sem fins lucrativos fundada em 2007 e reconhecida pelo Ministério da Justiça da República de Moçambique (Boletim da República, III Série — N.º 49, 10 de Dezembro de 2009).

## Tecnologias
- HTML5 semântico
- Tailwind CSS (via CDN)
- JavaScript vanilla (sem frameworks)

## Estrutura
```
nhelety/
├── index.html        # Ponto de entrada
├── Nhelety_Logo.png  # Logo oficial
├── css/              # Estilos por secção
├── js/               # Scripts por funcionalidade
└── sections/         # Fragmentos HTML de referência
```

## Funcionalidades
- Página única responsiva (mobile-first)
- Secções: Sobre, Atividades, Membros, Transparência, Doações, Contacto
- Painel de gestão de posts (acesso via URL secreta `?key=`)
- Redes sociais: Instagram `@ass.nhelety` · Facebook `Associacao Nhelety`
- Formulário de candidatura com validação

## Como publicar
Faça upload da pasta `nhelety/` para qualquer serviço de hospedagem estática (GitHub Pages, Netlify, Vercel).

## Acesso Admin
O painel de gestão de atividades é protegido por URL secreta. Consulte `js/atividades.js` para configurar a chave de acesso (`ADMIN_KEY`).
