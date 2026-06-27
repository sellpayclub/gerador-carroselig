# Gerador de Carrossel Instagram

App Next.js para criar carrosséis Instagram 4:5 (1080×1350) com imagem gerada pela OpenAI + texto editável. Gere um card por vez, visualize, ajuste o texto sem gastar créditos, regenere a imagem, exclua e baixe tudo em ZIP.

## Recursos

- Quantidade de cards ajustável (1–10)
- Biblioteca de uploads com drag-and-drop para ordenar
- Por card: usar upload atribuído OU prompt de IA
- Dois modos por card:
  - **Composição local** — a OpenAI gera só a foto; o app monta gradiente preto + headline branco + palavra destaque amarela com Bebas Neue. Editável e re-renderizável sem nova chamada IA.
  - **IA completa** — a OpenAI gera o card inteiro (foto + texto) seguindo as regras do prompt master.
- Geração sequencial (1 card por request) com barra de progresso
- Galeria com preview, editar texto, regenerar imagem, excluir, baixar individual
- Download de todos em ZIP (`card-01.png`, `card-02.png`, …)

## Setup local

```bash
npm install
cp .env.example .env.local
# edite .env.local e cole sua OPENAI_API_KEY
npm run dev
```

Abra http://localhost:3000

## Variáveis de ambiente

| Nome | Obrigatório | Descrição |
|------|-------------|-----------|
| `OPENAI_API_KEY` | sim | Chave da OpenAI (https://platform.openai.com/api-keys) |
| `OPENAI_IMAGE_MODEL` | não | Default `gpt-image-1.5`. Alternativas: `gpt-image-2`, `gpt-image-1`, `gpt-image-1-mini` |

**Nunca commite `.env.local`.** Ele já está no `.gitignore`.

## Deploy no Vercel

1. Suba o código no GitHub:
   ```bash
   git init
   git remote add origin https://github.com/sellpayclub/gerador-carroselig.git
   git add .
   git commit -m "Gerador de carrossel Instagram"
   git branch -M main
   git push -u origin main
   ```
2. No Vercel: **New Project** → importe o repo `sellpayclub/gerador-carroselig`
3. **Settings → Environment Variables** → adicione:
   - `OPENAI_API_KEY` = sua chave
   - (opcional) `OPENAI_IMAGE_MODEL` = `gpt-image-1.5`
4. **Deploy**

As rotas `/api/generate-image` e `/api/generate-full` já têm `maxDuration: 60` (ver [vercel.json](vercel.json)).

## Estrutura

```
app/
  layout.tsx                     # fonts Bebas Neue + Anton + Oswald + Inter, tema escuro
  page.tsx                       # renderiza <CarouselBuilder />
  api/
    generate-image/route.ts      # modo composite: só foto
    generate-full/route.ts       # modo IA completa
components/
  carousel-builder.tsx           # estado + orquestração
  image-library.tsx              # uploads + ordenação
  card-editor.tsx                # form por card
  results-gallery.tsx            # preview + ações
  ui.tsx                         # primitives (Button, Input, …)
lib/
  types.ts
  prompts.ts                     # regras verbatim do prompt master
  openai-client.ts               # singleton + helper de File
  carousel-renderer.ts           # Canvas 1080x1350 compositor
  download-zip.ts                # JSZip + file-saver
```

## Modelo de imagem

- Tamanho padrão: `1024x1536` (4:5 retrato)
- Qualidade: `high`
- Com referência (upload atribuído): `images.edit` com `input_fidelity: high` (preserva rosto)
- Sem referência: `images.generate`
- GPT image models retornam `b64_json` automaticamente — não enviar `response_format`

## Limitações

- A OpenAI gera em `1024x1536`; o compositor faz cover-fit + crop para o topo 40% do canvas `1080x1350`. Boa qualidade para Instagram.
- No modo IA completa, a tipografia pode sair imperfeita — para texto preciso use o modo Composição local.
- Uploads ficam em memória do browser (sem storage backend no MVP). Persistência futura: Vercel Blob.
- Custo: ~1 chamada OpenAI por card (mais 1 se regenerar imagem). Re-renderizar texto no modo composite é grátis (roda no browser).

## Segurança

- A chave da OpenAI fica somente em `.env.local` (dev) e nas Environment Variables do Vercel (prod).
- Nunca commite chaves no código ou no GitHub.
- Se uma chave vazar, revogue imediatamente em https://platform.openai.com/api-keys
