# 🩺 Assistente VEBC Inteligente (SUS)

Aplicação web para **triagem sindrômica** e **classificação rápida de risco** em cenários de **Vigilância Epidemiológica de Base Comunitária (VEBC)**, com geração opcional de **análise situacional** e **mensagens para a comunidade** via **API da OpenAI** (back-end em Serverless Functions na Vercel). 🚀

---

## ✨ Funcionalidades

- 🧭 **Triagem por categorias sindrômicas** (respiratória, diarreica, exantemática, hemorrágica, neurológica e epizootias)
- ✅ **Checklist de risco** com cálculo automático e **classificação** (Baixo/Médio/Alto)
- 📌 **Agravos possíveis** por síndrome (tags)
- ⚡ **Ações imediatas** sugeridas (operacional)
- 🤖 **Análise situacional** gerada por IA (OpenAI)
- 💬 **Mensagem para a comunidade** (linguagem simples)
- 🔊 **TTS (áudio)** via endpoint `/api/tts` (se configurado)
- 🖨️ **Salvar/Imprimir PDF** (via `window.print()`)

---

## 🧱 Stack

- ⚛️ **React** + **Vite**
- 🎨 **Tailwind CSS**
- 🧩 **Lucide React** (ícones)
- ☁️ **Vercel** (deploy + Serverless Functions)
- 🤖 **OpenAI API** (via `/api/analyze`)

---

## 🗂️ Estrutura do projeto

```txt
assistente-vebc/
├─ api/
│  ├─ analyze.js         # Serverless Function: chama OpenAI (Responses API)
│  └─ tts.js             # (Opcional) Serverless Function: TTS (se existir)
├─ src/
│  ├─ App.jsx
│  ├─ main.jsx
│  └─ index.css
├─ postcss.config.js
├─ tailwind.config.js
├─ vite.config.js
└─ package.json
