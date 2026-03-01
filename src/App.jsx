import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
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
  Loader2
} from 'lucide-react';

// Configuração da API via Variável de Ambiente (Vite)
const apiKey = import.meta.env.VITE_GEMINI_API_VEBC;

const VEBC_DATA = {
  categorias: [
    {
      id: 'resp',
      titulo: 'Problemas Respiratórios',
      descricao: 'Pessoas com febre alta, falta de ar ou respiração difícil.',
      tecnico: 'Síndrome Respiratória Aguda',
      eventos: ['Influenza', 'SARS-CoV-2', 'VSR', 'Coqueluche', 'Hantavirose'],
      icon: <Activity className="w-6 h-6" />
    },
    {
      id: 'diar',
      titulo: 'Diarreia Aguda',
      descricao: 'Duas ou mais pessoas com diarreia forte ou vômitos.',
      tecnico: 'Síndrome Diarreica Aguda',
      eventos: ['Cólera', 'DTA', 'Intoxicação Química'],
      icon: <ClipboardCheck className="w-6 h-6" />
    },
    {
      id: 'exan',
      titulo: 'Manchas na Pele + Febre',
      descricao: 'Manchas ou bolhas que aparecem de repente com febre.',
      tecnico: 'Síndrome Febril Exantemática',
      eventos: ['Sarampo', 'Rubéola', 'Varicela', 'Mão-Pé-Boca'],
      icon: <Thermometer className="w-6 h-6" />
    },
    {
      id: 'hemo',
      titulo: 'Febre com Sangramento',
      descricao: 'Manchas roxas ou sangramentos pelo nariz ou boca.',
      tecnico: 'Síndrome Febril Hemorrágica',
      eventos: ['Dengue Grave', 'Leptospirose', 'Febres Hemorrágicas Virais'],
      icon: <AlertTriangle className="w-6 h-6" />
    },
    {
      id: 'neuro',
      titulo: 'Alterações Neurológicas',
      descricao: 'Febre com rigidez no pescoço ou paralisia repentina.',
      tecnico: 'Síndrome Neurológica Aguda Febril',
      eventos: ['Meningite', 'Encefalites Virais', 'Poliomielite'],
      icon: <Activity className="w-6 h-6" />
    },
    {
      id: 'animal',
      titulo: 'Saúde Animal (Epizootias)',
      descricao: 'Morte de animais silvestres sem causa aparente.',
      tecnico: 'Epizootias de Interesse Público',
      eventos: ['Febre Amarela', 'Gripe Aviária', 'Contaminação'],
      icon: <Bug className="w-6 h-6" />
    }
  ],
  riskQuestions: [
    { id: 'q1', text: 'Existem populações vulneráveis afetadas?' },
    { id: 'q2', text: 'A ameaça é incomum para o território?' },
    { id: 'q3', text: 'Há alta probabilidade de disseminação?' },
    { id: 'q4', text: 'A ameaça pode causar doença grave ou morte?' },
    { id: 'q5', text: 'Os recursos de controle são escassos no momento?' }
  ]
};

// Utilitário para chamadas de API com Retry
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return await response.json();
      if (response.status === 404) throw new Error("Modelo não encontrado (404)");
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

export default function App() {
  const [step, setStep] = useState(1);
  const [selectedRumor, setSelectedRumor] = useState(null);
  const [riskAnswers, setRiskAnswers] = useState({});
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiCommunityMessage, setAiCommunityMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleRumorSelect = (rumor) => {
    setSelectedRumor(rumor);
    setStep(2);
  };

  const toggleRisk = (id) => {
    setRiskAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const riskScore = useMemo(() => Object.values(riskAnswers).filter(Boolean).length, [riskAnswers]);
  const riskLevel = useMemo(() => {
    if (riskScore >= 4) return { label: 'ALTO RISCO', color: 'bg-red-600', text: 'Ação imediata (CIEVS Nacional/Estadual)' };
    if (riskScore >= 2) return { label: 'RISCO MÉDIO', color: 'bg-orange-500', text: 'Investigação local urgente e monitoramento' };
    return { label: 'BAIXO RISCO', color: 'bg-blue-500', text: 'Acompanhamento pela APS e Vigilância Municipal' };
  }, [riskScore]);

  // Função 1: Análise com modelo estável gemini-1.5-flash
  const generateAiAnalysis = async () => {
    setLoadingAi(true);
    const prompt = `Analise tecnicamente: Rumor: ${selectedRumor.titulo}. Risco: ${riskLevel.label}. Gere 2 parágrafos de recomendações para gestão de saúde pública.`;

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      setAiAnalysis(data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na resposta.");
    } catch (error) {
      setAiAnalysis("Não foi possível conectar. Verifique sua chave API no arquivo .env.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Função 2: Mensagem para Comunidade
  const generateCommunityMessage = async () => {
    setLoadingAi(true);
    const prompt = `Crie uma mensagem de WhatsApp para a comunidade sobre: ${selectedRumor.titulo}. Linguagem simples, sem pânico.`;

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      setAiCommunityMessage(data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na mensagem.");
    } catch (error) {
      setAiCommunityMessage("Erro de conexão com a IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Função 3: Áudio (TTS) com correção do Blob
  const speakText = async (text) => {
    if (!text || isSpeaking) return;
    setIsSpeaking(true);
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Leia isto: ${text}` }] }],
            generationConfig: { 
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
            }
          })
        }
      );
      
      const result = await response.json();
      const pcmData = result.candidates[0].content.parts[0].inlineData.data;
      
      // Conversão Base64 para Áudio Blob
      const byteCharacters = atob(pcmData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/mp3' });
      const url = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(url);
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (error) {
      console.error("Erro no áudio:", error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="text-blue-600" /> Assistente VEBC Inteligente
          </h1>
          <p className="text-slate-500">Vigilância de Base Comunitária no SUS</p>
        </header>

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            {VEBC_DATA.categorias.map(cat => (
              <button key={cat.id} onClick={() => handleRumorSelect(cat)} className="flex items-start p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">{cat.icon}</div>
                <div>
                  <h3 className="font-bold">{cat.titulo}</h3>
                  <p className="text-sm text-slate-500">{cat.descricao}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-right-4">
            <h2 className="text-xl font-bold mb-6 text-blue-700">{selectedRumor.tecnico}</h2>
            <div className="space-y-3">
              {VEBC_DATA.riskQuestions.map(q => (
                <label key={q.id} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer ${riskAnswers[q.id] ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}>
                  <span>{q.text}</span>
                  <input type="checkbox" className="w-5 h-5" checked={riskAnswers[q.id] || false} onChange={() => toggleRisk(q.id)} />
                </label>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(1)} className="text-slate-500 font-bold flex items-center gap-1"><ChevronLeft /> Voltar</button>
              <button onClick={() => setStep(3)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2">Ver Resultado <ChevronRight /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in zoom-in-95">
            <div className={`p-8 rounded-3xl text-white shadow-xl ${riskLevel.color}`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-blue-100 mb-1 font-medium">Classificação Final</p>
                  <h2 className="text-4xl font-black">{riskLevel.label}</h2>
                </div>
                <button onClick={() => speakText(`Risco ${riskLevel.label}. ${riskLevel.text}`)} className="p-4 bg-white/20 rounded-2xl">
                  {isSpeaking ? <Loader2 className="animate-spin" /> : <Volume2 size={32} />}
                </button>
              </div>
              <p className="text-xl font-medium">{riskLevel.text}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={generateAiAnalysis} disabled={loadingAi} className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold border-2 border-indigo-200 flex items-center justify-center gap-2">
                {loadingAi ? <Loader2 className="animate-spin" /> : <FileText />} Análise Situacional ✨
              </button>
              <button onClick={generateCommunityMessage} disabled={loadingAi} className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold border-2 border-emerald-200 flex items-center justify-center gap-2">
                {loadingAi ? <Loader2 className="animate-spin" /> : <MessageSquare />} Mensagem Comunidade ✨
              </button>
            </div>

            {aiAnalysis && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold mb-2 flex items-center gap-2 text-indigo-600"><Sparkles size={18} /> Relatório Inteligente</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
              </div>
            )}

            <div className="flex gap-4 pb-10">
              <button onClick={() => { setStep(1); setRiskAnswers({}); setAiAnalysis(""); }} className="flex-1 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-bold">Nova Triagem</button>
              <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold">Salvar PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}