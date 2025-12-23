# Text-to-Speech (TTS) Providers Configuration Guide

> **Last Updated:** December 2024

This document provides comprehensive information on configuring languages, voices, models, and pricing for the three major TTS providers used in Voicory.

---

## Table of Contents

1. [Provider Comparison](#provider-comparison)
2. [ElevenLabs](#elevenlabs)
3. [OpenAI](#openai)
4. [Google Cloud TTS](#google-cloud-tts)
5. [Pricing Comparison](#pricing-comparison)
6. [Configuration Examples](#configuration-examples)
7. [Best Practices](#best-practices)

---

## Provider Comparison

| Feature | ElevenLabs | OpenAI | Google Cloud TTS |
|---------|------------|--------|------------------|
| **Best For** | Emotional, expressive speech | Fast, reliable TTS with prompting | Multi-language, enterprise |
| **Latency** | ~75ms (Flash) to ~300ms | ~15ms (gpt-4o-mini-tts) | Varies by model |
| **Languages** | 70+ (v3), 32 (Flash v2.5) | 57+ (follows Whisper) | 50+ |
| **Voice Cloning** | ✅ Yes (Professional) | ✅ Yes (Custom voices) | ✅ Yes (Instant Custom) |
| **Streaming** | ✅ Yes | ✅ Yes | ✅ Yes |
| **SSML Support** | Limited | No | ✅ Yes |
| **Real-time Agents** | ✅ Agents Platform | ✅ Realtime API | ❌ Limited |

---

## ElevenLabs

### Models Overview

| Model ID | Description | Languages | Latency | Character Limit |
|----------|-------------|-----------|---------|-----------------|
| `eleven_v3` | Most expressive, emotional speech | 70+ | Higher | 5,000 chars (~5 min) |
| `eleven_multilingual_v2` | Lifelike, consistent quality | 29 | Medium | 10,000 chars (~10 min) |
| `eleven_flash_v2_5` | **Recommended for agents** - Ultra-low latency | 32 | ~75ms | 40,000 chars (~40 min) |
| `eleven_turbo_v2_5` | Balance of quality and speed | 32 | ~250-300ms | 40,000 chars (~40 min) |

### Model Selection Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                    ElevenLabs Model Selection                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Need ultra-low latency? (Real-time agents)                     │
│  └── YES → eleven_flash_v2_5 (~75ms)                            │
│  └── NO ↓                                                       │
│                                                                 │
│  Need highest emotional expression?                             │
│  └── YES → eleven_v3 (70+ languages, dramatic delivery)         │
│  └── NO ↓                                                       │
│                                                                 │
│  Need consistent quality across languages?                      │
│  └── YES → eleven_multilingual_v2 (29 languages)                │
│  └── NO → eleven_turbo_v2_5 (good balance)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Supported Languages

#### Eleven v3 (70+ Languages)
Afrikaans, Arabic, Armenian, Assamese, Azerbaijani, Belarusian, Bengali, Bosnian, Bulgarian, Catalan, Cebuano, Chichewa, Croatian, Czech, Danish, Dutch, English, Estonian, Filipino, Finnish, French, Galician, Georgian, German, Greek, Gujarati, Hausa, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Irish, Italian, Japanese, Javanese, Kannada, Kazakh, Kirghiz, Korean, Latvian, Lingala, Lithuanian, Luxembourgish, Macedonian, Malay, Malayalam, Mandarin Chinese, Marathi, Nepali, Norwegian, Pashto, Persian, Polish, Portuguese, Punjabi, Romanian, Russian, Serbian, Sindhi, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Welsh

#### Flash v2.5 / Turbo v2.5 (32 Languages)
All v2 languages plus: Hungarian (hu), Norwegian (no), Vietnamese (vi)

### Pricing

| Plan | Credits/Month | Minutes Approx. | Price | Per-Minute Cost |
|------|---------------|-----------------|-------|-----------------|
| **Free** | 10,000 | ~20 min | $0 | - |
| **Starter** | 30,000 | ~60 min | $5/mo | - |
| **Creator** | 100,000 | ~200 min | $22/mo | ~$0.15/min extra |
| **Pro** | 500,000 | ~1,000 min | $99/mo | ~$0.12/min extra |
| **Scale** | 2,000,000 | ~4,000 min | $330/mo | ~$0.09/min extra |
| **Business** | 11,000,000 | ~22,000 min | $1,320/mo | ~$0.06/min extra |
| **Enterprise** | Custom | Custom | Custom | Volume discounts |

> **Note:** 1 credit ≈ ~0.5 characters. Actual usage varies by model.

### Configuration Example

```typescript
// ElevenLabs TTS Configuration
const elevenLabsConfig = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  model_id: "eleven_flash_v2_5", // For real-time agents
  voice_settings: {
    stability: 0.5,           // 0-1, higher = more consistent
    similarity_boost: 0.75,   // 0-1, higher = more similar to original
    style: 0.0,               // 0-1, for v2 models
    use_speaker_boost: true   // Enhances voice clarity
  },
  output_format: "mp3_44100_128" // mp3_22050_32, mp3_44100_64, mp3_44100_128, mp3_44100_192, pcm_16000, pcm_22050, pcm_24000, pcm_44100
};

// API Call Example
const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream", {
  method: "POST",
  headers: {
    "xi-api-key": elevenLabsConfig.apiKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    text: "Hello, how can I help you today?",
    model_id: elevenLabsConfig.model_id,
    voice_settings: elevenLabsConfig.voice_settings
  })
});
```

---

## OpenAI

### Models Overview

| Model | Description | Latency | Best For |
|-------|-------------|---------|----------|
| `gpt-4o-mini-tts` | **Recommended** - Newest, promptable TTS | Ultra-low | Real-time agents, dynamic speech |
| `tts-1` | Standard quality | Low | General use |
| `tts-1-hd` | High-definition quality | Higher | Content creation |

### Voice Options

| Voice | Style | Recommended For |
|-------|-------|-----------------|
| `alloy` | Neutral, balanced | General purpose |
| `ash` | Warm, friendly | Customer service |
| `ballad` | Soft, melodic | Storytelling |
| `coral` | Clear, professional | Business |
| `echo` | Warm, conversational | Casual interactions |
| `fable` | Expressive, dynamic | Entertainment |
| `nova` | Bright, energetic | Marketing |
| `onyx` | Deep, authoritative | Formal content |
| `sage` | Calm, measured | Education |
| `shimmer` | Gentle, soothing | Wellness |
| `verse` | Articulate, refined | Narration |
| `marin` | **New** - High quality | Best quality |
| `cedar` | **New** - High quality | Best quality |

> **Note:** `tts-1` and `tts-1-hd` support: `alloy`, `ash`, `coral`, `echo`, `fable`, `onyx`, `nova`, `sage`, `shimmer`  
> **Best quality:** Use `marin` or `cedar` with `gpt-4o-mini-tts`

### Prompting with gpt-4o-mini-tts

The newest model supports natural language instructions to control:
- Accent
- Emotional range
- Intonation
- Speed of speech
- Tone
- Whispering

```python
# OpenAI TTS with Instructions
from openai import OpenAI

client = OpenAI()

response = client.audio.speech.create(
    model="gpt-4o-mini-tts",
    voice="coral",
    input="Today is a wonderful day to build something people love!",
    instructions="Speak in a cheerful and positive tone. Add slight enthusiasm when saying 'wonderful'.",
    response_format="mp3"  # mp3, opus, aac, flac, wav, pcm
)

# Save to file
response.stream_to_file("output.mp3")
```

### Supported Languages

OpenAI TTS follows Whisper's language support (57+ languages):

Afrikaans, Arabic, Armenian, Azerbaijani, Belarusian, Bosnian, Bulgarian, Catalan, Chinese, Croatian, Czech, Danish, Dutch, English, Estonian, Finnish, French, Galician, German, Greek, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Italian, Japanese, Kannada, Kazakh, Korean, Latvian, Lithuanian, Macedonian, Malay, Marathi, Maori, Nepali, Norwegian, Persian, Polish, Portuguese, Romanian, Russian, Serbian, Slovak, Slovenian, Spanish, Swahili, Swedish, Tagalog, Tamil, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Welsh

### Pricing

| Model | Price |
|-------|-------|
| `tts-1` | **$15.00 / 1M characters** |
| `tts-1-hd` | **$30.00 / 1M characters** |
| `gpt-4o-mini-tts` | **$0.015 / minute** (~$12/1M audio tokens output) |

**Cost Calculation Examples:**
- 1,000 characters with tts-1 = $0.015
- 1 minute of audio with gpt-4o-mini-tts = $0.015
- 1 hour of audio with gpt-4o-mini-tts = $0.90

### Supported Output Formats

| Format | Use Case |
|--------|----------|
| `mp3` | Default, general use |
| `opus` | Internet streaming, low latency |
| `aac` | Digital audio compression (YouTube, iOS, Android) |
| `flac` | Lossless compression, archiving |
| `wav` | Low-latency apps (no decoding overhead) |
| `pcm` | Raw samples at 24kHz, 16-bit signed |

### Custom Voices (Enterprise)

OpenAI supports custom voice creation with consent verification:

```bash
# 1. Upload consent recording (must match exact phrase)
curl https://api.openai.com/v1/audio/voice_consents \
  -X POST \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "name=my_voice_consent" \
  -F "language=en" \
  -F "recording=@consent_recording.wav"

# 2. Create voice with sample
curl https://api.openai.com/v1/audio/voices \
  -X POST \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "name=my_custom_voice" \
  -F "audio_sample=@voice_sample.wav" \
  -F "consent=cons_123abc"

# 3. Use in TTS
curl https://api.openai.com/v1/audio/speech \
  -X POST \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini-tts",
    "voice": {"id": "voice_123abc"},
    "input": "Hello from my custom voice!"
  }'
```

**Consent Phrases (must be spoken exactly):**
| Language | Phrase |
|----------|--------|
| English | "I am the owner of this voice and I consent to OpenAI using this voice to create a synthetic voice model." |
| Spanish | "Soy el propietario de esta voz y doy mi consentimiento para que OpenAI la utilice para crear un modelo de voz sintética." |
| French | "Je suis le propriétaire de cette voix et j'autorise OpenAI à utiliser cette voix pour créer un modèle de voix synthétique." |
| German | "Ich bin der Eigentümer dieser Stimme und bin damit einverstanden, dass OpenAI diese Stimme zur Erstellung eines synthetischen Stimmmodells verwendet." |
| Hindi | "मैं इस आवाज का मालिक हूं और मैं सिंथेटिक आवाज मॉडल बनाने के लिए OpenAI को इस आवाज का उपयोग करने की सहमति देता हूं" |

---

## Google Cloud TTS

### Models Overview

| Model | Description | Price per 1M chars | Free Tier |
|-------|-------------|-------------------|-----------|
| **Chirp 3: HD voices** | Latest, most realistic | $30 | 1M chars/month |
| **Instant Custom Voice** | Voice cloning | $60 | None |
| **Neural2** | High quality neural | $16 | 1M chars/month |
| **WaveNet** | Natural sounding | $4 | 4M chars/month |
| **Standard** | Basic quality | $4 | 4M chars/month |
| **Studio** | Professional quality | $160 | 1M chars/month |

### Chirp 3: HD Voices

The latest generation of Google TTS with 30 premium voices:

| Voice Name | Gender | Style |
|------------|--------|-------|
| Achernar | Female | - |
| Achird | Male | - |
| Algenib | Male | - |
| Algieba | Male | - |
| Alnilam | Male | - |
| Aoede | Female | - |
| Autonoe | Female | - |
| Callirrhoe | Female | - |
| Charon | Male | - |
| Despina | Female | - |
| Enceladus | Male | - |
| Erinome | Female | - |
| Fenrir | Male | - |
| Gacrux | Female | - |
| Iapetus | Male | - |
| Kore | Female | - |
| Laomedeia | Female | - |
| Leda | Female | - |
| Orus | Male | - |
| Pulcherrima | Female | - |
| Puck | Male | - |
| Rasalgethi | Male | - |
| Sadachbia | Male | - |
| Sadaltager | Male | - |
| Schedar | Male | - |
| Sulafat | Female | - |
| Umbriel | Male | - |
| Vindemiatrix | Female | - |
| Zephyr | Female | - |
| Zubenelgenubi | Male | - |

### Voice Name Format

```
{language_code}-Chirp3-HD-{voice_name}

Examples:
- en-US-Chirp3-HD-Charon
- hi-IN-Chirp3-HD-Kore
- es-ES-Chirp3-HD-Leda
```

### Supported Languages (50+)

| Language | Code | Notes |
|----------|------|-------|
| Arabic (Generic) | ar-XA | |
| Bengali (India) | bn-IN | |
| Bulgarian (Bulgaria) | bg-BG | |
| Croatian (Croatia) | hr-HR | |
| Czech (Czech Republic) | cs-CZ | |
| Danish (Denmark) | da-DK | |
| Dutch (Belgium) | nl-BE | |
| Dutch (Netherlands) | nl-NL | |
| English (Australia) | en-AU | |
| English (India) | en-IN | |
| English (United Kingdom) | en-GB | |
| English (United States) | en-US | |
| Estonian (Estonia) | et-EE | |
| Finnish (Finland) | fi-FI | |
| French (Canada) | fr-CA | |
| French (France) | fr-FR | |
| German (Germany) | de-DE | |
| Greek (Greece) | el-GR | |
| Gujarati (India) | gu-IN | |
| Hebrew (Israel) | he-IL | |
| Hindi (India) | hi-IN | |
| Hungarian (Hungary) | hu-HU | |
| Indonesian (Indonesia) | id-ID | |
| Italian (Italy) | it-IT | |
| Japanese (Japan) | ja-JP | |
| Kannada (India) | kn-IN | |
| Korean (South Korea) | ko-KR | |
| Latvian (Latvia) | lv-LV | |
| Lithuanian (Lithuania) | lt-LT | |
| Malayalam (India) | ml-IN | |
| Mandarin Chinese (China) | cmn-CN | |
| Marathi (India) | mr-IN | |
| Norwegian Bokmål (Norway) | nb-NO | |
| Polish (Poland) | pl-PL | |
| Portuguese (Brazil) | pt-BR | |
| Punjabi (India) | pa-IN | Preview |
| Romanian (Romania) | ro-RO | |
| Russian (Russia) | ru-RU | |
| Serbian (Cyrillic) | sr-RS | |
| Slovak (Slovakia) | sk-SK | |
| Slovenian (Slovenia) | sl-SI | |
| Spanish (Spain) | es-ES | |
| Spanish (United States) | es-US | |
| Swahili (Kenya) | sw-KE | |
| Swedish (Sweden) | sv-SE | |
| Tamil (India) | ta-IN | |
| Telugu (India) | te-IN | |
| Thai (Thailand) | th-TH | |
| Turkish (Turkey) | tr-TR | |
| Ukrainian (Ukraine) | uk-UA | |
| Urdu (India) | ur-IN | |
| Vietnamese (Vietnam) | vi-VN | |

### Voice Controls (Chirp 3: HD)

#### 1. Pace Control
Adjust speed from 0.25x (very slow) to 2x (very fast).

```json
{
  "audio_config": {
    "audio_encoding": "LINEAR16",
    "speaking_rate": 1.5  // 0.25 to 2.0
  },
  "input": {
    "text": "This is spoken at 1.5x speed."
  },
  "voice": {
    "language_code": "en-US",
    "name": "en-US-Chirp3-HD-Leda"
  }
}
```

#### 2. Pause Control
Insert pauses using markup tags (use `markup` field, not `text`).

```json
{
  "input": {
    "markup": "Let me take a look, [pause long] yes, I see it."
  },
  "voice": {
    "language_code": "en-US",
    "name": "en-US-Chirp3-HD-Leda"
  }
}
```

Tags: `[pause short]`, `[pause]`, `[pause long]`

#### 3. Custom Pronunciations
Override pronunciation using IPA or X-SAMPA.

```json
{
  "input": {
    "text": "There is a dog in the boat",
    "custom_pronunciations": {
      "phrase": "dog",
      "phonetic_encoding": "PHONETIC_ENCODING_X_SAMPA",
      "pronunciation": "\"k{t"  // Pronounces as "cat"
    }
  }
}
```

### SSML Support (Chirp 3: HD)

Supported tags:
- `<speak>` - Root element
- `<say-as>` - Pronunciation hints (except expletive/bleep)
- `<p>` - Paragraph
- `<s>` - Sentence
- `<phoneme>` - Phonetic pronunciation
- `<sub>` - Substitution (alias)

```xml
<speak>
  Here are <say-as interpret-as="characters">SSML</say-as> samples.
  I can substitute phrases like the <sub alias="World Wide Web Consortium">W3C</sub>.
  <phoneme alphabet="ipa" ph="ˌmænɪˈtoʊbə">manitoba</phoneme>!
</speak>
```

### Pricing

| Model | Free Tier | Price After Free Tier |
|-------|-----------|----------------------|
| **Chirp 3: HD** | 1M chars/month | **$30 per 1M characters** |
| **Instant Custom Voice** | None | **$60 per 1M characters** |
| **Neural2** | 1M chars/month | **$16 per 1M characters** |
| **WaveNet** | 4M chars/month | **$4 per 1M characters** |
| **Standard** | 4M chars/month | **$4 per 1M characters** |
| **Studio** | 1M chars/month | **$160 per 1M characters** |

### Gemini-TTS (Preview)

New models powered by Gemini:

| Model | Input Tokens | Output Tokens |
|-------|--------------|---------------|
| Gemini 2.5 Flash TTS | $0.50 / 1M tokens | $10.00 / 1M audio tokens* |
| Gemini 2.5 Pro TTS | $1.00 / 1M tokens | $20.00 / 1M audio tokens* |

*Audio tokens = 25 tokens per second of audio

### Regional Availability

| Region | Status |
|--------|--------|
| global | GA |
| us | GA |
| eu | GA |
| asia-southeast1 | GA |
| europe-west2 | GA |
| asia-northeast1 | GA |

### Output Formats

| Mode | Formats |
|------|---------|
| Streaming | ALAW, MULAW, OGG_OPUS, PCM |
| Batch | ALAW, MULAW, MP3, OGG_OPUS, PCM |

### Configuration Example

```python
from google.cloud import texttospeech

client = texttospeech.TextToSpeechClient()

# Input text
input_text = texttospeech.SynthesisInput(text="Hello there.")

# Voice configuration
voice = texttospeech.VoiceSelectionParams(
    language_code="en-US",
    name="en-US-Chirp3-HD-Charon"
)

# Audio configuration
audio_config = texttospeech.AudioConfig(
    audio_encoding=texttospeech.AudioEncoding.MP3,
    speaking_rate=1.0  # 0.25 to 2.0
)

# Synthesize
response = client.synthesize_speech(
    input=input_text,
    voice=voice,
    audio_config=audio_config
)

# Save to file
with open("output.mp3", "wb") as out:
    out.write(response.audio_content)
```

### Streaming Example

```python
from google.cloud import texttospeech

client = texttospeech.TextToSpeechClient()

streaming_config = texttospeech.StreamingSynthesizeConfig(
    voice=texttospeech.VoiceSelectionParams(
        name="en-US-Chirp3-HD-Charon",
        language_code="en-US"
    )
)

config_request = texttospeech.StreamingSynthesizeRequest(
    streaming_config=streaming_config
)

text_chunks = ["Hello there. ", "How are you ", "today?"]

def request_generator():
    yield config_request
    for text in text_chunks:
        yield texttospeech.StreamingSynthesizeRequest(
            input=texttospeech.StreamingSynthesisInput(text=text)
        )

responses = client.streaming_synthesize(request_generator())
for response in responses:
    print(f"Audio chunk size: {len(response.audio_content)} bytes")
```

---

## Pricing Comparison

### Cost per 1 Million Characters

| Provider | Model | Cost per 1M Chars | Notes |
|----------|-------|-------------------|-------|
| **OpenAI** | tts-1 | $15.00 | Standard quality |
| **OpenAI** | tts-1-hd | $30.00 | High definition |
| **OpenAI** | gpt-4o-mini-tts | ~$15 (based on audio) | Promptable |
| **ElevenLabs** | Flash v2.5 | ~$6-15 (varies by plan) | Ultra-low latency |
| **ElevenLabs** | Multilingual v2 | ~$12-30 (varies by plan) | Highest quality |
| **Google** | Chirp 3: HD | $30.00 | Latest generation |
| **Google** | Neural2 | $16.00 | High quality |
| **Google** | WaveNet | $4.00 | Good quality |
| **Google** | Standard | $4.00 | Basic quality |

### Cost per Minute of Audio

| Provider | Model | Cost per Minute | Latency |
|----------|-------|-----------------|---------|
| **ElevenLabs** | Flash v2.5 (Business) | $0.06 | ~75ms |
| **ElevenLabs** | Flash v2.5 (Scale) | $0.09 | ~75ms |
| **ElevenLabs** | Flash v2.5 (Pro) | $0.12 | ~75ms |
| **OpenAI** | gpt-4o-mini-tts | $0.015 | Ultra-low |
| **Google** | Chirp 3: HD | ~$0.10* | Medium |

*Estimated based on ~3,000 chars/minute average

### Free Tier Comparison

| Provider | Free Offer |
|----------|------------|
| **ElevenLabs** | 10,000 credits/month (~20 minutes) |
| **OpenAI** | None (pay-as-you-go) |
| **Google** | 1M-4M chars/month (varies by model) |

---

## Configuration Examples

### Voicory Voice Agent Config

```typescript
// frontend/types/voiceAgent.ts
export interface VoiceAgentConfig {
  // TTS Provider Selection
  tts_provider: 'elevenlabs' | 'openai' | 'google';
  
  // ElevenLabs Config
  elevenlabs?: {
    model_id: 'eleven_flash_v2_5' | 'eleven_turbo_v2_5' | 'eleven_multilingual_v2' | 'eleven_v3';
    voice_id: string;
    voice_settings: {
      stability: number;
      similarity_boost: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
    output_format: 'mp3_44100_128' | 'pcm_24000' | 'pcm_44100';
  };
  
  // OpenAI Config
  openai?: {
    model: 'gpt-4o-mini-tts' | 'tts-1' | 'tts-1-hd';
    voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar';
    instructions?: string; // For gpt-4o-mini-tts only
    response_format: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  };
  
  // Google Cloud TTS Config
  google?: {
    model: 'chirp3-hd' | 'neural2' | 'wavenet' | 'standard';
    voice_name: string; // e.g., "en-US-Chirp3-HD-Charon"
    language_code: string;
    speaking_rate: number; // 0.25 to 2.0
    audio_encoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  };
}
```

### Database Schema

```sql
-- voice_agent_config table
CREATE TABLE voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
  
  -- TTS Configuration
  tts_provider TEXT DEFAULT 'elevenlabs' CHECK (tts_provider IN ('elevenlabs', 'openai', 'google')),
  
  -- ElevenLabs
  elevenlabs_model_id TEXT DEFAULT 'eleven_flash_v2_5',
  elevenlabs_voice_id TEXT,
  elevenlabs_stability DECIMAL DEFAULT 0.5,
  elevenlabs_similarity_boost DECIMAL DEFAULT 0.75,
  
  -- OpenAI
  openai_model TEXT DEFAULT 'gpt-4o-mini-tts',
  openai_voice TEXT DEFAULT 'coral',
  openai_instructions TEXT,
  
  -- Google
  google_model TEXT DEFAULT 'chirp3-hd',
  google_voice_name TEXT,
  google_language_code TEXT DEFAULT 'en-US',
  google_speaking_rate DECIMAL DEFAULT 1.0,
  
  -- Common
  output_format TEXT DEFAULT 'mp3',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Best Practices

### 1. Provider Selection by Use Case

| Use Case | Recommended Provider | Model |
|----------|---------------------|-------|
| **Real-time voice agents** | ElevenLabs | Flash v2.5 |
| **Real-time with prompting** | OpenAI | gpt-4o-mini-tts |
| **Audiobook/Long-form** | ElevenLabs | v3 or Multilingual v2 |
| **Multi-language IVR** | Google | Chirp 3: HD |
| **Budget-conscious** | Google | WaveNet |
| **Voice cloning** | ElevenLabs | Professional Clone |
| **Enterprise/Compliance** | Google | Chirp 3: HD |

### 2. Latency Optimization

```
For sub-100ms latency:
├── ElevenLabs Flash v2.5 (~75ms)
├── OpenAI gpt-4o-mini-tts (~15ms)
└── Use streaming endpoints
    └── Use PCM/WAV format (no decoding overhead)
```

### 3. Cost Optimization

```
To reduce costs:
├── Use appropriate model for use case
│   ├── Don't use HD for internal testing
│   └── Use Standard/WaveNet for bulk processing
├── Cache frequently used phrases
├── Batch requests where possible
├── Use compression (opus for streaming)
└── Monitor usage with alerts
```

### 4. Quality Tips

**ElevenLabs:**
- Stability 0.3-0.5 for more expressive speech
- Stability 0.7-0.9 for consistent, professional tone
- Use `use_speaker_boost: true` for clarity

**OpenAI:**
- Use `instructions` parameter for tone control
- Best voices for quality: `marin`, `cedar`
- Use `wav` or `pcm` for lowest latency

**Google:**
- Use natural prompting in text (ellipses, punctuation)
- Adjust `speaking_rate` for different content types
- Use SSML for precise control

### 5. Error Handling

```typescript
async function synthesizeSpeech(text: string, config: VoiceAgentConfig) {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callTTSProvider(text, config);
    } catch (error) {
      lastError = error as Error;
      
      // Rate limit - exponential backoff
      if (error.status === 429) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      
      // Server error - retry
      if (error.status >= 500) {
        await sleep(500 * attempt);
        continue;
      }
      
      // Client error - don't retry
      throw error;
    }
  }
  
  throw lastError;
}
```

---

## Quick Reference Card

### ElevenLabs API Endpoints
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream
GET  https://api.elevenlabs.io/v1/voices
GET  https://api.elevenlabs.io/v1/models
```

### OpenAI API Endpoints
```
POST https://api.openai.com/v1/audio/speech
POST https://api.openai.com/v1/audio/voices (custom)
POST https://api.openai.com/v1/audio/voice_consents (custom)
```

### Google Cloud TTS Endpoints
```
POST https://texttospeech.googleapis.com/v1/text:synthesize
POST https://texttospeech.googleapis.com/v1/text:streamingSynthesize
GET  https://texttospeech.googleapis.com/v1/voices
```

---

## References

- [ElevenLabs Documentation](https://elevenlabs.io/docs/overview/models)
- [ElevenLabs Pricing](https://elevenlabs.io/pricing/api)
- [OpenAI TTS Guide](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [Google Cloud TTS - Chirp 3: HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing)
