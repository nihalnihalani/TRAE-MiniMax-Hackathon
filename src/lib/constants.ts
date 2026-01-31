/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers and strings
 */

// Wizard Mode Script - Demo interview prompts
export const WIZARD_SCRIPT = [
    "Hi there! I'm Alex. Today we're going to work on reversing a linked list. Can you start by defining the Node class?",
    "Great start. Now, how would you handle the prev pointer in the reversal function?",
    "Hmm, take a look at line 15. Are we updating the head reference correctly?",
    "Excellent work. You nailed the pointer manipulation."
];

// Integrity Shield Thresholds
export const LARGE_PASTE_THRESHOLD = 50;

// Code Complexity Thresholds
export const COMPLEXITY_HIGH = 8;
export const COMPLEXITY_MEDIUM = 6;
export const MAX_HINTS = 3;

// Timeout Values (in milliseconds)
export const DEFAULT_EXECUTION_TIMEOUT = 30000;
export const DEFAULT_CREATE_TIMEOUT = 60; // seconds

// Daytona Configuration - Optimized for disk limit management
export const DEFAULT_AUTO_STOP_INTERVAL = 5; // minutes - stop quickly when idle
export const DEFAULT_AUTO_ARCHIVE_INTERVAL = 10; // minutes - archive quickly to free disk
export const DEFAULT_NETWORK_ALLOW_LIST = ''; // Empty = allow all
export const MAX_WORKSPACE_AGE_MS = 30 * 60 * 1000; // 30 minutes max workspace lifetime

// Retry Configuration
export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
} as const;

// MiniMax AI Retry Configuration
export const MINIMAX_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
} as const;

// CodeRabbit CLI Configuration
export const CODERABBIT_INSTALL_CMD = 'curl -fsSL https://cli.coderabbit.ai/install.sh | sh';
export const CODERABBIT_INSTALL_TIMEOUT = 60000; // 60 seconds

// ============================================================================
// MiniMax TTS Configuration
// ============================================================================

// TTS Models (see https://platform.minimax.io docs)
export const TTS_MODEL_HD = "speech-2.8-hd";        // Best quality: tonal nuances, timbre similarity
export const TTS_MODEL_TURBO = "speech-2.8-turbo";   // Faster, affordable, good nuances

// Default TTS model per use case
export const DEFAULT_TTS_MODEL = TTS_MODEL_HD;         // High quality for interview chat
export const FAST_TTS_MODEL = TTS_MODEL_TURBO;         // Fast option for streaming

// Voice IDs for different interview scenarios
export const VOICES = {
  INTERVIEWER_PRIMARY: "English_Trustworth_Man",      // Professional, trustworthy
  INTERVIEWER_FEMALE: "English_ConfidentWoman",       // Confident, authoritative
  PRACTICE_COACH: "English_PatientMan",               // Patient, encouraging
  FALLBACK: "English_Gentle-voiced_man",              // Default fallback
} as const;

// Voice selection per interview mode
export const VOICE_BY_MODE = {
  real: VOICES.INTERVIEWER_PRIMARY,
  practice: VOICES.PRACTICE_COACH,
} as const;

// Default voice
export const DEFAULT_MINIMAX_VOICE = VOICES.INTERVIEWER_PRIMARY;
export const DEFAULT_VOICE_ID = DEFAULT_MINIMAX_VOICE;

// Audio settings for TTS
export const TTS_AUDIO_SETTINGS = {
  sample_rate: 32000,
  bitrate: 128000,
  format: "mp3" as const,
  channel: 1,
} as const;

// Keyboard Shortcuts
export const WIZARD_SHORTCUT = { ctrl: true, shift: true, key: 'X' };
