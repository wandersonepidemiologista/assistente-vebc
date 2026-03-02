import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { rumor, riscoLabel, sindrome } = req.body || {};
    if (!rumor || !riscoLabel || !sindrome) {
      return res.status(400).json({ error: "Campos obrigatórios: rumor, riscoLabel, sindrome" });
    }

    const prompt = [
      "Você é um consultor sênior em Vigilância em Saúde (VE/ESPIN), com foco em VEBC.",
      "Entregue uma análise técnica curta e operacional (máx. ~200-300 palavras), com:",
      "1) hipótese(s) sindrômica(s) e diferenciais; 2) critérios de gravidade/alerta; 3) ações imediatas em 24h;",
      "4) dados mínimos a coletar; 5) recomendação de comunicação de risco (uma frase).",
      "",
      `Evento (rumor): ${rumor}`,
      `Síndrome: ${sindrome}`,
      `Classificação de risco: ${riscoLabel}`,
    ].join("\n");

    // Responses API (recomendado)
    const response = await client.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    // O SDK costuma expor texto agregado em output_text
    const text = response.output_text ?? "";
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: "Falha ao consultar a OpenAI", detail: String(err?.message || err) });
  }
}