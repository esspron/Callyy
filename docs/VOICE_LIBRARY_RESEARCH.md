# Voicory Voice Library Research - Multi-Provider TTS

## Executive Summary

Comprehensive research on TTS providers for Voicory's 3-tier pricing strategy targeting 70-80% profit margins in the India market.

---

## 🎯 Pricing Tiers

| Tier | Voicory Price | Target Margin | Use Case |
|------|---------------|---------------|----------|
| **Spark** | ₹2-5/min | 70-80% | Budget-conscious SMBs, high volume |
| **Boost** | ₹6-15/min | 70-80% | Professional quality, balanced |
| **Fusion** | ₹16-25/min | 70-80% | Premium quality, enterprise |

---

## 📊 TTS Provider Comparison

### 1. Google Cloud Text-to-Speech

#### Voice Types & Pricing
| Voice Type | Price per 1M chars | Cost per min (~750 chars) | Latency | Quality |
|------------|-------------------|---------------------------|---------|---------|
| **Standard** | $4 | ~₹0.25 | Low | Good |
| **WaveNet** | $4 | ~₹0.25 | Medium | Better |
| **Neural2** | $16 | ~₹1.00 | Medium | High |
| **Chirp 3: HD** | $30 | ~₹1.88 | Low (streaming) | Excellent |
| **Studio** | $160 | ~₹10.00 | Medium | Broadcast |

#### Indian Languages Supported
| Language | Code | Voice Types Available |
|----------|------|----------------------|
| Hindi | `hi-IN` | Standard (6), WaveNet (6), Neural2 (4), Chirp 3: HD (26) |
| English (India) | `en-IN` | Standard (6), WaveNet (6), Neural2 (4), Chirp-HD, Chirp 3: HD (26) |
| Tamil | `ta-IN` | Standard (4), WaveNet (4), Chirp 3: HD (26) |
| Telugu | `te-IN` | Standard (4), Chirp 3: HD (26) |
| Bengali | `bn-IN` | Standard (4), WaveNet (4), Chirp 3: HD (26) |
| Gujarati | `gu-IN` | Standard (4), WaveNet (4), Chirp 3: HD (26) |
| Kannada | `kn-IN` | Standard (4), WaveNet (4), Chirp 3: HD (26) |
| Malayalam | `ml-IN` | Standard (4), WaveNet (4), Chirp 3: HD (26) |
| Marathi | `mr-IN` | Standard (3), WaveNet (3), Chirp 3: HD (26) |
| Urdu (India) | `ur-IN` | Standard (2), WaveNet (2), Chirp 3: HD (26) |
| Punjabi | `pa-IN` | Standard (4), WaveNet (4) |

#### Key Google Voice IDs for India
```
Hindi Standard: hi-IN-Standard-A (F), hi-IN-Standard-B (M), hi-IN-Standard-C (M), hi-IN-Standard-D (F)
Hindi WaveNet: hi-IN-Wavenet-A (F), hi-IN-Wavenet-B (M), hi-IN-Wavenet-C (M), hi-IN-Wavenet-D (F)
Hindi Neural2: hi-IN-Neural2-A (F), hi-IN-Neural2-B (M), hi-IN-Neural2-C (M), hi-IN-Neural2-D (F)
Hindi Chirp3-HD: hi-IN-Chirp3-HD-Achernar (F), hi-IN-Chirp3-HD-Achird (M), hi-IN-Chirp3-HD-Puck (M), etc.

English-IN Standard: en-IN-Standard-A (F), en-IN-Standard-B (M), en-IN-Standard-C (M), en-IN-Standard-D (F)
English-IN WaveNet: en-IN-Wavenet-A (F), en-IN-Wavenet-B (M), en-IN-Wavenet-C (M), en-IN-Wavenet-D (F)
English-IN Neural2: en-IN-Neural2-A (F), en-IN-Neural2-B (M), en-IN-Neural2-C (M), en-IN-Neural2-D (F)
English-IN Chirp-HD: en-IN-Chirp-HD-D (M), en-IN-Chirp-HD-F (F), en-IN-Chirp-HD-O (F)

Tamil Standard: ta-IN-Standard-A (F), ta-IN-Standard-B (M)
Tamil WaveNet: ta-IN-Wavenet-A (F), ta-IN-Wavenet-B (M)
```

#### Streaming Support
- **Chirp 3: HD voices**: Full bidirectional streaming support ✅
- **Standard/WaveNet/Neural2**: Long audio synthesis only

---

### 2. OpenAI TTS

#### Voice Types & Pricing
| Model | Price per 1M chars | Cost per min (~750 chars) | Latency | Quality |
|-------|-------------------|---------------------------|---------|---------|
| **tts-1** | $15 | ~₹0.94 | Very Low | Good |
| **tts-1-hd** | $30 | ~₹1.88 | Low | Better |

#### Available Voices (6 total)
| Voice | Gender | Style | Best For |
|-------|--------|-------|----------|
| `alloy` | Neutral | Versatile | General purpose |
| `echo` | Male | Warm | Conversational |
| `fable` | Neutral | Expressive | Storytelling |
| `onyx` | Male | Deep | Professional |
| `nova` | Female | Friendly | Customer service |
| `shimmer` | Female | Soft | Gentle interactions |

#### Language Support
- **Primary**: English (optimized)
- **Supported**: 50+ languages through model inference
- **Indian Languages**: Hindi/Tamil/Telugu NOT natively optimized - quality varies
- **Recommendation**: Use only for English voice calls

#### Limitations
- ❌ No native Indian language voices
- ❌ No Hindi-specific voice models
- ✅ Good for English-only deployments
- ✅ Very low latency

---

### 3. Google Gemini TTS (NEW!)

#### Pricing (from official docs)
| Model | Input Price | Output Price | Notes |
|-------|-------------|--------------|-------|
| **Gemini 2.5 Flash TTS** | $0.50/1M tokens | $10/1M audio tokens* | Fast, affordable |
| **Gemini 2.5 Flash-Lite Preview TTS** | $0.50/1M tokens | $10/1M audio tokens* | Even faster |
| **Gemini 2.5 Pro TTS** | $1.00/1M tokens | $20/1M audio tokens* | Premium quality |

*Audio tokens = 25 tokens per second of audio

#### Cost Calculation
- 1 minute of audio = 60 seconds × 25 tokens = 1,500 tokens
- **Gemini 2.5 Flash TTS per minute**: ~₹1.26 (input + output)
- **Gemini 2.5 Pro TTS per minute**: ~₹2.52 (input + output)

#### Language Support
- Inherits from Gemini's multilingual capabilities
- Expected strong Hindi/Indian language support (same as Gemini models)

---

### 4. ElevenLabs

#### Voice Types & Pricing
| Model | Price per char | Cost per min (~750 chars) | Latency | Quality |
|-------|----------------|---------------------------|---------|---------|
| **Flash** | ~$0.00003 | ~₹1.88 | Ultra-low (<100ms) | Good |
| **Turbo v2.5** | ~$0.00003 | ~₹1.88 | Very low | Better |
| **Multilingual v2** | ~$0.00006 | ~₹3.75 | Medium | Excellent |

#### Indian Language Support
- **Hindi**: Full support with native voices
- **Tamil**: Full support
- **Telugu**: Full support  
- **Bengali**: Full support
- **Malayalam**: Full support
- **Kannada**: Full support
- **Marathi**: Full support
- **Gujarati**: Full support

#### Voice Cloning
- Professional voice cloning available
- Can create custom Indian voices

---

## 💰 Margin Analysis by Tier

### Spark Tier (₹2-5/min)

| Provider | Model | Our Cost | Sell Price | Margin |
|----------|-------|----------|------------|--------|
| Google | Standard | ₹0.25 | ₹2.50 | **90%** |
| Google | WaveNet | ₹0.25 | ₹3.00 | **92%** |
| Google | Neural2 | ₹1.00 | ₹4.00 | **75%** |

**Recommended for Spark**: Google Standard/WaveNet

---

### Boost Tier (₹6-15/min)

| Provider | Model | Our Cost | Sell Price | Margin |
|----------|-------|----------|------------|--------|
| ElevenLabs | Flash | ₹1.88 | ₹8.00 | **76%** |
| ElevenLabs | Turbo | ₹1.88 | ₹10.00 | **81%** |
| OpenAI | tts-1 | ₹0.94 | ₹7.00 | **87%** |
| Google | Chirp 3: HD | ₹1.88 | ₹12.00 | **84%** |
| Gemini | Flash TTS | ₹1.26 | ₹9.00 | **86%** |

**Recommended for Boost**: ElevenLabs Flash/Turbo (multilingual), OpenAI tts-1 (English only)

---

### Fusion Tier (₹16-25/min)

| Provider | Model | Our Cost | Sell Price | Margin |
|----------|-------|----------|------------|--------|
| ElevenLabs | Multilingual v2 | ₹3.75 | ₹18.00 | **79%** |
| Google | Chirp 3: HD | ₹1.88 | ₹18.00 | **90%** |
| Gemini | Pro TTS | ₹2.52 | ₹20.00 | **87%** |

**Recommended for Fusion**: ElevenLabs Multilingual v2 (best quality)

---

## 🎨 White-Label Voice Naming Strategy

### Naming Convention
- **Indian Names** for Hindi voices (Priya, Arjun, Meera, etc.)
- **Professional Names** for English voices (Alex, Maya, James, etc.)
- **Unique names per tier** to prevent confusion

### Sample Names by Tier

#### Spark Tier (Budget)
| Branded Name | Actual Provider | Voice ID | Language | Gender |
|--------------|-----------------|----------|----------|--------|
| Aanya | Google Standard | hi-IN-Standard-A | Hindi | Female |
| Arjun | Google Standard | hi-IN-Standard-B | Hindi | Male |
| Priya | Google WaveNet | hi-IN-Wavenet-A | Hindi | Female |
| Raj | Google WaveNet | hi-IN-Wavenet-B | Hindi | Male |
| Maya | Google Standard | en-IN-Standard-A | English-IN | Female |
| Dev | Google Standard | en-IN-Standard-B | English-IN | Male |

#### Boost Tier (Professional)
| Branded Name | Actual Provider | Voice ID | Language | Gender |
|--------------|-----------------|----------|----------|--------|
| Kavya | ElevenLabs Flash | eleven_turbo_v2_5 | Hindi | Female |
| Vikram | ElevenLabs Flash | eleven_turbo_v2_5 | Hindi | Male |
| Neha | Google Chirp 3 HD | hi-IN-Chirp3-HD-Achernar | Hindi | Female |
| Rohan | Google Chirp 3 HD | hi-IN-Chirp3-HD-Puck | Hindi | Male |
| Emma | OpenAI | nova | English | Female |
| James | OpenAI | onyx | English | Male |

#### Fusion Tier (Premium)
| Branded Name | Actual Provider | Voice ID | Language | Gender |
|--------------|-----------------|----------|----------|--------|
| Aaradhya | ElevenLabs ML v2 | eleven_multilingual_v2 | Hindi | Female |
| Advait | ElevenLabs ML v2 | eleven_multilingual_v2 | Hindi | Male |
| Ishaan | ElevenLabs ML v2 | eleven_multilingual_v2 | Hindi | Male |
| Ananya | ElevenLabs ML v2 | eleven_multilingual_v2 | Hindi | Female |

---

## 📋 Implementation Recommendations

### 1. Primary Routing Strategy
```
Hindi/Regional Languages:
  Spark → Google Standard/WaveNet
  Boost → ElevenLabs Flash/Turbo OR Google Chirp 3 HD
  Fusion → ElevenLabs Multilingual v2

English (India):
  Spark → Google Standard
  Boost → OpenAI tts-1 OR ElevenLabs Flash
  Fusion → ElevenLabs Multilingual v2

English (US/UK):
  Spark → Google Standard
  Boost → OpenAI tts-1
  Fusion → ElevenLabs Multilingual v2
```

### 2. Failover Strategy
```javascript
// Primary → Secondary fallback
const fallbackChain = {
  elevenlabs: ['google_chirp3', 'openai'],
  google_chirp3: ['elevenlabs', 'google_neural2'],
  openai: ['elevenlabs', 'google_standard'],
};
```

### 3. Latency Considerations
- **Voice Calls**: Prioritize ElevenLabs Flash/Turbo (<100ms) or OpenAI tts-1
- **WhatsApp**: Can use slower but higher quality voices
- **Streaming**: Use Google Chirp 3 HD for best streaming experience

---

## 🔑 API Integration Notes

### Google Cloud TTS
```javascript
// Endpoint
POST https://texttospeech.googleapis.com/v1/text:synthesize

// Required: GOOGLE_CLOUD_API_KEY
// Streaming: POST https://texttospeech.googleapis.com/v1/text:streamingSynthesize
```

### OpenAI TTS
```javascript
// Endpoint
POST https://api.openai.com/v1/audio/speech

// Body
{
  "model": "tts-1", // or "tts-1-hd"
  "voice": "nova",  // alloy, echo, fable, onyx, nova, shimmer
  "input": "Hello world"
}
```

### ElevenLabs TTS
```javascript
// Endpoint
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream

// Models: eleven_flash_v2_5, eleven_turbo_v2_5, eleven_multilingual_v2
```

### Gemini TTS (Preview)
```javascript
// Via Vertex AI
// Endpoint: vertex AI text generation with TTS output
// Model: gemini-2.5-flash-tts, gemini-2.5-pro-tts
```

---

## 📁 Next Steps

1. [ ] Create SQL migration with voice library data
2. [ ] Update frontend types for new providers
3. [ ] Implement backend TTS routing service
4. [ ] Generate audio samples for each voice
5. [ ] Update VoiceSelectorModal with tier tabs
6. [ ] Add voice preview functionality

---

## 📚 References

- [Google Cloud TTS Voices](https://docs.cloud.google.com/text-to-speech/docs/voices)
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing)
- [OpenAI TTS Guide](https://platform.openai.com/docs/guides/text-to-speech)
- [ElevenLabs API Docs](https://docs.elevenlabs.io/)
- [Gemini TTS Preview](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts)

---

*Last Updated: December 2024*
*Research by: Voicory AI Team*
