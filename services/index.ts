// Re-export canonical services so workers & routes share one import surface.
export { aiService, GroqService, fallbackTemplate } from "@/services/ai/groq.service";
export { whatsappService, EvolutionService } from "@/services/whatsapp/evolution.service";
