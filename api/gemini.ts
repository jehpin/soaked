import { GoogleGenAI } from "@google/genai";

// Lazy Gemini API Client Initialization
let geminiClient: GoogleGenAI | null = null;

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

async function callGeminiJson<T>(prompt: string, timeoutMs: number = 15000): Promise<T> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("CREDENTIAL_NOT_CONFIGURED");
  }

  const client = getGeminiClient();
  if (!client) {
    throw new Error("CREDENTIAL_NOT_CONFIGURED");
  }

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Gemini request timeout")), timeoutMs)
  );

  const genPromise = client.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const response: any = await Promise.race([genPromise, timeoutPromise]);
  const text = response?.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return JSON.parse(text) as T;
}

export async function generateHotTake(params: {
  area?: string;
  forecast?: string;
  rainfallMm?: number;
  uvIndex?: number;
  temperature?: number;
  umbrellaScore?: number;
}) {
  const {
    area = "Singapore",
    forecast = "Cloudy",
    rainfallMm = 0,
    uvIndex = 7.5,
    temperature = 32,
    umbrellaScore = 75,
  } = params;

  const prompt = `You are the Singapore Umbrella & UV Oracle, a hilariously quirky, witty, sarcastic Singlish-speaking weather auntie/uncle weather bot.
Current Singapore Weather context:
- Location: ${area}
- 2-Hour Forecast: ${forecast}
- Real-time 5-min Rainfall: ${rainfallMm} mm
- UV Index: ${uvIndex}
- Temperature: ${temperature}°C
- Calculated Umbrella Need Score: ${umbrellaScore}/100

Generate a super funny, quirky, memorable weather hot take / excuse for whether the user MUST bring an umbrella, sunscreen, or avoid walking outside. Include 1-2 witty Singlish particles (lah, lor, sia, chope, char siew, wet chicken, Defcon 1, auntie visor) naturally. Keep it punchy (1 to 2 sentences max!).

Output format (JSON):
{
  "headline": "Short punchy catchphrase (under 7 words)",
  "body": "The hilarious 1-2 sentence breakdown",
  "singlishVerdict": "TAKE IT LAH / SAFE LEH / ROASTING TIME / DANGER",
  "excuseForBoss": "Funny 1-line excuse for being late due to weather"
}`;

  return callGeminiJson<any>(prompt, 15000);
}

export async function generateShelteredRoute(params: {
  origin?: string;
  destination?: string;
  rainIntensity?: string;
}) {
  const {
    origin = "Jurong East MRT",
    destination = "Jem & Westgate",
    rainIntensity = "Heavy rain & blazing UV",
  } = params;

  const prompt = `You are the Singapore Master of Sheltered Walking Routes (Underground Linkways, Void Decks, Shopping Mall Tunnels, Covered Walkways Expert).
The user wants to walk from "${origin}" to "${destination}".
Current rain/weather status: ${rainIntensity}.

Provide a quirky, practical and hilarious step-by-step sheltered walking route strategy avoiding rain and sun!
Output JSON:
{
  "shelterRating": number (between 70 and 99),
  "quirkyTip": "Hilarious tip on using void decks, MRT underpasses, or dodging bus stop gaps",
  "landmarks": ["Step 1: MRT Underground Link", "Step 2: Cut through Aircon Mall", "Step 3: Sprint 10m across uncovered road gap", "Step 4: Safe arrival at Void Deck"],
  "singlishVerdict": "100% DRY GUARANTEED (except 3 steps)"
}`;

  return callGeminiJson<any>(prompt, 15000);
}

export async function generateHourlyAnalysis(params: {
  area?: string;
  currentScore?: number;
}) {
  const { area = "Jurong West", currentScore = 65 } = params;

  const prompt = `Give a 6-hour umbrella need forecast for ${area} in Singapore with current base umbrella score ${currentScore}.
Output JSON format:
{
  "hourly": [
    {"hour": "+1 hr", "umbrellaRisk": 70, "recommendation": "Heavy shower clouds moving in from Malacca Strait", "icon": "rain"},
    {"hour": "+2 hr", "umbrellaRisk": 85, "recommendation": "Flash downpour peak! Stay in office or carry brolly", "icon": "thunder"},
    {"hour": "+3 hr", "umbrellaRisk": 40, "recommendation": "Rain clearing, high humidity evaporation", "icon": "cloud"},
    {"hour": "+4 hr", "umbrellaRisk": 65, "recommendation": "Blazing afternoon UV peak! Switch to sun parasol", "icon": "sun"},
    {"hour": "+5 hr", "umbrellaRisk": 30, "recommendation": "Pleasant evening breeze", "icon": "fair"},
    {"hour": "+6 hr", "umbrellaRisk": 20, "recommendation": "Safe to head home without worry", "icon": "fair"}
  ]
}`;

  return callGeminiJson<any>(prompt, 15000);
}
