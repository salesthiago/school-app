# GPschool App (Ionic)

App mobile (Ionic Angular + Capacitor) que consome a mesma API REST do
`backend/` e replica a área do aluno do `frontend/` — login/cadastro,
dashboard, meus cursos, detalhe do curso (matrícula grátis/paga com
checkout Pix/Boleto) e player de aula com progresso.

## Stack

Ionic 8 (`@ionic/angular` standalone) + Angular 22 + Capacitor 8, sem
Ionic/Capacitor CLI globais — tudo via `npx`/scripts do `package.json`.

## Como rodar

Pré-requisito: backend rodando (`cd ../backend && npm run start:dev`).

```bash
npm install
npm start          # ionic serve equivalente — http://localhost:4200 (ng serve)
```

A API é configurada em `src/environments/environment.ts`
(`http://localhost:3000/api` por padrão). Ajuste conforme o dispositivo:

- **Navegador / `ionic serve`**: `http://localhost:3000/api` (padrão).
- **Emulador Android**: troque `localhost` por `10.0.2.2`.
- **Dispositivo físico / iOS simulator**: use o IP da máquina rodando o
  backend na mesma rede Wi-Fi, ex. `http://192.168.0.10:3000/api`.

## Rodar como app nativo (Capacitor)

```bash
npm run build
npx cap add android   # ou ios (requer Xcode, só no macOS)
npx cap sync
npx cap open android  # abre no Android Studio
```

## Estrutura (`src/app/`)

- `core/` — models, services (HTTP) e interceptor/guard de autenticação,
  espelhando `frontend/src/app/core/` (mesmos contratos de API).
- `auth/` — login e cadastro.
- `student/tabs/` — shell de abas (Início, Meus Cursos, Perfil).
- `student/dashboard/`, `student/my-courses/`, `student/course-detail/`,
  `student/course-player/`, `student/profile/` — telas do aluno.

## Implementado

- Login/cadastro com JWT + refresh automático (interceptor).
- Dashboard: curso atual, em andamento/concluídos, cursos recomendados.
- Meus Cursos: matrículas ativas com progresso.
- Detalhe do curso: módulos e trilha de aulas avulsas, matrícula
  grátis, checkout Pix/Boleto com polling de confirmação.
- Player de aula: vídeo (embed Bunny Stream + player.js para progresso
  automático), lista de aulas, materiais complementares, marcar como
  concluída, próxima aula.
- Perfil: dados do usuário e logout.

## Pendente (fora do escopo inicial)

- Avaliações (`exams`) e certificados — o backend já expõe a API
  correspondente; falta só a tela, seguindo o mesmo padrão de
  `frontend/src/app/student/exams` e `.../certificates`.
- Anotações de aula (`notes`) e catálogo "Explorar" dedicado.
