import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  CheckCircle, 
  Users, 
  Activity, 
  ClipboardCheck,
  Stethoscope,
  MapPin,
  Bug,
  Thermometer,
  Sparkles,
  Volume2,
  MessageSquare,
  FileText,
  Loader2,
  RefreshCcw
} from 'lucide-react';

// Configurações da API Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_VEBC;

const VEBC_DATA = {
  categorias: [
    {
      id: 'resp',
      titulo: 'Problemas Respiratórios',
      descricao: 'Pessoas com febre alta, falta de ar, chiado no peito ou respiração difícil.',
      tecnico: 'Síndrome Respiratória Aguda',
      eventos: ['Influenza', 'SARS-CoV-2', 'VSR', 'Coqueluche', 'Hantavirose'],
      icon: <Activity className="w-6 h-6" />
    },
    {
      id: 'diar',
      titulo: 'Diarreia Aguda',
      descricao: 'Duas ou mais pessoas com diarreia forte, vômitos ou sangue nas fezes.',
      tecnico: 'Síndrome Diarreica Aguda',
      eventos: ['Cólera', 'DTA (Doenças Transmitidas por Alimentos)', 'Intoxicação Química'],
      icon: <ClipboardCheck className="w-6 h-6" />
    },
    {
      id: 'exan',
      titulo: 'Manchas na Pele + Febre',
      descricao: 'Manchas, brotoejas ou bolhas que aparecem de repente com febre.',
      tecnico: 'Síndrome Febril Exantemática',
      eventos: ['Sarampo', 'Rubéola', 'Varicela', 'Mão-Pé-Boca'],
      icon: <Thermometer className="w-6 h-6" />
    },
    {
      id: 'hemo',
      titulo: 'Febre com Sangramento',
      descricao: 'Manchas roxas ou sangramentos pelo nariz, boca ou fezes.',
      tecnico: 'Síndrome Febril Hemorrágica',
      eventos: ['Dengue Grave', 'Leptospirose', 'Febres Hemorrágicas Virais'],
      icon: <AlertTriangle className="w-6 h-6" />
    },
    {
      id: 'neuro',
      titulo: 'Alterações Neurológicas',
      descricao: 'Febre com rigidez no pescoço, convulsões ou paralisia repentina.',
      tecnico: 'Síndrome Neurológica Aguda Febril',
      eventos: ['Meningite', 'Encefalites Virais', 'Poliomielite'],
      icon: <Activity className="w-6 h-6" />
    },
    {
      id: 'animal',
      titulo: 'Saúde Animal (Epizootias)',
      descricao: 'Morte de macacos, aves, peixes ou animais silvestres sem causa aparente.',
      tecnico: 'Epizootias de Interesse em Saúde Pública',
      eventos: ['Febre Amarela', 'Gripe Aviária', 'Contaminação Ambiental'],
      icon: <Bug className="w-6 h-6" />
    }
  ],
  riskQuestions: [
    { id: 'q1', text: 'Existem populações vulneráveis (Indígenas, Quilombolas, etc) afetadas?' },
    { id: 'q2', text: 'A ameaça é incomum ou inesperada para o território?' },
    { id: 'q3', text: 'Há alta probabilidade de disseminação para outras regiões?' },
    { id: 'q4', text: 'A ameaça pode causar doença grave ou alta letalidade?' },
    { id: 'q5', text: 'Os tratamentos ou medidas de controle são escassos no momento?' }
  ]
};

// Utilitário para chamadas de API com retry (Backoff Exponencial)
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

export default function App() {
  const [step, setStep] = useState(1);
  const [selectedRumor, setSelectedRumor] = useState(null);
  const [riskAnswers, setRiskAnswers] = useState({});
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiCommunityMessage, setAiCommunityMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Seleção de Rumor
  const handleRumorSelect = (rumor) => {
    setSelectedRumor(rumor);
    setStep(2);
  };

  // Toggle de perguntas de risco
  const toggleRisk = (id) => {
    setRiskAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Cálculo de Risco
  const riskScore = useMemo(() => Object.values(riskAnswers).filter(Boolean).length, [riskAnswers]);
  const riskLevel = useMemo(() => {
    if (riskScore >= 4) return { label: 'ALTO RISCO', color: 'bg-red-600', text: 'Ação imediata (CIEVS Nacional/Estadual)' };
    if (riskScore >= 2) return { label: 'RISCO MÉDIO', color: 'bg-orange-500', text: 'Investigação local urgente e monitoramento' };
    return { label: 'BAIXO RISCO', color: 'bg-blue-500', text: 'Acompanhamento pela APS e Vigilância Municipal' };
  }, [riskScore]);

  // Funcionalidade 1: Gerar Análise Situacional ✨
  const generateAiAnalysis = async () => {
    setLoadingAi(true);
    const prompt = `Analise tecnicamente o seguinte evento de Vigilância de Base Comunitária no Brasil:
    - Rumor detectado: ${selectedRumor.titulo}
    - Síndrome Técnica: ${selectedRumor.tecnico}
    - Respostas de Risco: ${Object.entries(riskAnswers).map(([id, val]) => `${VEBC_DATA.riskQuestions.find(q => q.id === id).text}: ${val ? 'Sim' : 'Não'}`).join(', ')}
    - Nível de Risco Calculado: ${riskLevel.label}
    
    Por favor, forneça uma análise de 2 parágrafos para a gestão de saúde, destacando os riscos epidemiológicos específicos e recomendações imediatas de contenção.`;

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      setAiAnalysis(data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar análise.");
    } catch (error) {
      setAiAnalysis("Não foi possível conectar ao assistente inteligente no momento.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Funcionalidade 2: Gerar Mensagem para a Comunidade ✨
  const generateCommunityMessage = async () => {
    setLoadingAi(true);
    const prompt = `Crie uma mensagem curta (estilo WhatsApp ou rádio) para avisar a comunidade local sobre o evento: ${selectedRumor.titulo}.
    Use linguagem simples, acolhedora e evite pânico. Dê dicas de prevenção e diga para procurarem a Unidade Básica de Saúde se sentirem sintomas.
    O risco atual é ${riskLevel.label}.`;

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      setAiCommunityMessage(data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar mensagem.");
    } catch (error) {
      setAiCommunityMessage("Não foi possível gerar o rascunho de mensagem.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Funcionalidade 3: Text-to-Speech do Relatório ✨
  const speakText = async (text) => {
    if (!text) return;
    setIsSpeaking(true);
    const payload = {
      contents: [{ parts: [{ text: `Diga de forma profissional e clara: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
        }
      }
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const result = await response.json();
      const pcmData = result.candidates[0].content.parts[0].inlineData.data;
      
      // Conversão simples de PCM para WAV (Header simplificado para 24kHz)
      const byteCharacters = atob(pcmData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/l16' });
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (error) {
      console.error("Erro TTS:", error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Stethoscope className="text-blue-600" />
              Assistente VEBC Inteligente
            </h1>
            <p className="text-slate-500">Inteligência Epidemiológica Territorial no SUS</p>
          </div>
          <div className="hidden md:block">
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-wider">
              AI-Powered Beta
            </span>
          </div>
        </header>

        {/* Navigation Indicator */}
        <div className="flex mb-8 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* Step 1: Rumor Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="text-blue-500" />
                Qual o sinal ou rumor detectado na comunidade?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VEBC_DATA.categorias.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleRumorSelect(cat)}
                    className="flex text-left items-start p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{cat.titulo}</h3>
                      <p className="text-sm text-slate-500 leading-tight">{cat.descricao}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Risk Assessment */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-blue-600 text-white rounded-lg">
                  {selectedRumor.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedRumor.tecnico}</h2>
                  <p className="text-sm text-slate-500 italic">Sinal: {selectedRumor.titulo}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4 text-slate-700">Avaliação de Risco Rápida</h3>
              <div className="space-y-3">
                {VEBC_DATA.riskQuestions.map(q => (
                  <label 
                    key={q.id}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${riskAnswers[q.id] ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    <span className="text-slate-700 pr-4">{q.text}</span>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={riskAnswers[q.id] || false}
                      onChange={() => toggleRisk(q.id)}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="px-6 py-2 flex items-center gap-2 text-slate-600 font-medium hover:text-slate-800">
                  <ChevronLeft size={20} /> Voltar
                </button>
                <button onClick={() => setStep(3)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2">
                  Ver Resultado <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result & AI Intelligence */}
        {step === 3 && (
          <div className="space-y-6 animate-in zoom-in-95 pb-20">
            {/* Status Card */}
            <div className={`p-8 rounded-3xl text-white shadow-xl ${riskLevel.color}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-blue-100 font-medium mb-1">Classificação Final</p>
                  <h2 className="text-4xl font-black">{riskLevel.label}</h2>
                </div>
                <button 
                  disabled={isSpeaking}
                  onClick={() => speakText(`A classificação atual é de ${riskLevel.label}. ${riskLevel.text}`)}
                  className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  {isSpeaking ? <Loader2 className="animate-spin" /> : <Volume2 size={32} />}
                </button>
              </div>
              <p className="text-xl font-medium opacity-90">{riskLevel.text}</p>
            </div>

            {/* AI Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={generateAiAnalysis}
                disabled={loadingAi}
                className="flex items-center justify-center gap-3 p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold border-2 border-indigo-200 hover:bg-indigo-100 transition-all"
              >
                {loadingAi ? <Loader2 className="animate-spin" /> : <FileText />}
                Análise Situacional ✨
              </button>
              <button 
                onClick={generateCommunityMessage}
                disabled={loadingAi}
                className="flex items-center justify-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold border-2 border-emerald-200 hover:bg-emerald-100 transition-all"
              >
                {loadingAi ? <Loader2 className="animate-spin" /> : <MessageSquare />}
                Mensagem p/ Comunidade ✨
              </button>
            </div>

            {/* AI Results Display */}
            {(aiAnalysis || aiCommunityMessage) && (
              <div className="space-y-4 animate-in fade-in">
                {aiAnalysis && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-indigo-500 w-5" /> Relatório Inteligente
                      </h3>
                      <button onClick={() => speakText(aiAnalysis)} className="text-slate-400 hover:text-indigo-500">
                        <Volume2 size={20} />
                      </button>
                    </div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                  </div>
                )}
                
                {aiCommunityMessage && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <MessageSquare className="text-emerald-500 w-5" /> Rascunho para Comunicação Social
                    </h3>
                    <div className="bg-emerald-50 p-4 rounded-xl text-emerald-900 font-medium italic relative">
                      "{aiCommunityMessage}"
                    </div>
                    <button 
                      onClick={() => {
                        const text = `*Alerta VEBC - Devolutiva Comunidade*\n\n${aiCommunityMessage}`;
                        navigator.clipboard.writeText(text);
                      }}
                      className="mt-4 text-sm font-bold text-emerald-600 flex items-center gap-1"
                    >
                      Copiar para WhatsApp
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Traditional Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-500" /> Eventos Possíveis
                </h3>
                <ul className="space-y-2">
                  {selectedRumor.eventos.map((e, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {e}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="text-blue-500" /> Passos Operacionais (7-1-7)
                </h3>
                <div className="space-y-4 text-sm text-slate-600">
                  <p>1. Notificar <strong>CIEVS</strong> em até 24h.</p>
                  <p>2. Coordenar com <strong>APS</strong> para visita de campo.</p>
                  <p>3. Coleta de amostras se indicado pelo protocolo.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setStep(1); setSelectedRumor(null); setRiskAnswers({}); setAiAnalysis(""); setAiCommunityMessage(""); }}
                className="flex-1 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100"
              >
                Nova Triagem
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 flex items-center justify-center gap-2"
              >
                Salvar PDF
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-4 text-center text-slate-400 text-xs py-8">
          <p>Este sistema utiliza a API Gemini para fornecer suporte à decisão. </p>
          <p className="mt-1">A responsabilidade final pela análise técnica é do profissional de saúde competente.</p>
        </footer>
      </div>
    </div>
  );
}