/**
 * Cost monitoring and tracking for API usage
 * Tracks Gemini, STT, TTS, and database operations
 */

export interface UsageMetrics {
  geminiTokens: number;
  sttMinutes: number;
  ttsCharacters: number;
  timestamp: number;
}

export class CostMonitor {
  private static instance: CostMonitor;
  private metrics: UsageMetrics[] = [];
  private readonly storageName = 'zoid_usage_metrics';

  private constructor() {
    this.loadMetrics();
  }

  static getInstance(): CostMonitor {
    if (!CostMonitor.instance) {
      CostMonitor.instance = new CostMonitor();
    }
    return CostMonitor.instance;
  }

  trackGeminiTokens(inputTokens: number, outputTokens: number): void {
    const total = inputTokens + outputTokens;
    console.log(`📊 [COST] Gemini: +${total} tokens (input: ${inputTokens}, output: ${outputTokens})`);
    
    const metric = this.getOrCreateTodayMetric();
    metric.geminiTokens += total;
    this.save();
  }

  trackSTT(durationMs: number): void {
    const minutes = durationMs / 60000;
    console.log(`📊 [COST] STT: +${minutes.toFixed(2)} minutes`);
    
    const metric = this.getOrCreateTodayMetric();
    metric.sttMinutes += minutes;
    this.save();
  }

  trackTTS(characters: number): void {
    console.log(`📊 [COST] TTS: +${characters} characters`);
    
    const metric = this.getOrCreateTodayMetric();
    metric.ttsCharacters += characters;
    this.save();
  }

  calculateCosts(metric: UsageMetrics) {
    // Pricing as of Nov 2025 (per Google Cloud / Gemini pricing)
    const geminiCost = (metric.geminiTokens / 1_000_000) * 0.075;
    const sttCost = metric.sttMinutes * 0.016;
    const ttsCost = (metric.ttsCharacters / 1_000_000) * 16;

    return {
      gemini: geminiCost,
      stt: sttCost,
      tts: ttsCost,
      total: geminiCost + sttCost + ttsCost,
    };
  }

  getTodayMetrics(): UsageMetrics {
    return this.getOrCreateTodayMetric();
  }

  getAllMetrics(): UsageMetrics[] {
    return this.metrics;
  }

  private getOrCreateTodayMetric(): UsageMetrics {
    const today = new Date().toDateString();
    
    let metric = this.metrics.find(
      (m) => new Date(m.timestamp).toDateString() === today
    );

    if (!metric) {
      metric = {
        geminiTokens: 0,
        sttMinutes: 0,
        ttsCharacters: 0,
        timestamp: Date.now(),
      };
      this.metrics.push(metric);
    }

    return metric;
  }

  private save(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageName, JSON.stringify(this.metrics));
    }
  }

  private loadMetrics(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.storageName);
      if (stored) {
        try {
          this.metrics = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to load metrics:', e);
        }
      }
    }
  }
}

export const costMonitor = CostMonitor.getInstance();