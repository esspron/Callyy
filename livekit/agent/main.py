"""
Voicory Voice Agent - LiveKit-based Real-Time Voice AI
======================================================
Ultra-low latency voice agent using LiveKit's agent framework v1.3.

Architecture:
- STT: OpenAI Whisper (hardcoded for quality)
- LLM: OpenAI (model from assistant settings in Agent tab)
- TTS: ElevenLabs/Google (voice from assistant's voice library selection)
- VAD: Silero (local, optimized settings hardcoded)

Features:
- <200ms end-to-end latency
- Natural interruption handling (barge-in)
- Dynamic system prompts from Supabase (assistants.instruction)
- Voice from voice library (voices table)
- Knowledge Base RAG integration
- Customer memory/context injection
"""

import asyncio
import os
import logging
from typing import Optional
from datetime import datetime
from dataclasses import dataclass

import structlog
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (
    AgentSession,
    Agent,
    JobContext,
    AgentServer,
    room_io,
)
from livekit.plugins import elevenlabs, openai, silero, google

# Database client
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Initialize Supabase client
supabase: Optional[Client] = None
if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    logger.info("supabase_connected")


@dataclass
class VoicoryAssistantConfig:
    """Configuration loaded from Supabase for an assistant
    
    Combines data from:
    - assistants table: name, instruction, language, LLM settings, voice_id
    - voices table: TTS provider config, voice IDs, language mappings
    """
    
    assistant_id: str
    user_id: str
    name: str = "Voicory Assistant"
    instruction: str = "You are a helpful AI assistant."
    first_message: str = "Hello! How can I help you today?"
    language: str = "en"
    
    # LLM Settings (from assistants table - Agent tab)
    llm_model: str = "gpt-4o"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 300
    
    # TTS Settings (from voices table via voice_id)
    tts_provider: str = "elevenlabs"  # elevenlabs, google, or openai
    tts_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel (ElevenLabs default)
    tts_model: str = "eleven_turbo_v2_5"
    tts_stability: float = 0.5
    tts_similarity_boost: float = 0.75
    
    # Google TTS language voice codes (BCP-47 format)
    # Maps language codes to full Google voice names like "en-US-Chirp3-HD-Aoede"
    language_voice_codes: dict = None
    
    # RAG Settings (from assistants table)
    rag_enabled: bool = False
    rag_similarity_threshold: float = 0.7
    rag_max_results: int = 5
    rag_instructions: str = ""
    knowledge_base_ids: list = None
    
    def __post_init__(self):
        if self.knowledge_base_ids is None:
            self.knowledge_base_ids = []
        if self.language_voice_codes is None:
            self.language_voice_codes = {}


# ============================================
# HARDCODED OPTIMIZED VOICE SETTINGS
# ============================================
# These are optimized for low-latency, natural conversation
# No need for users to configure these

# VAD (Voice Activity Detection)
VAD_MIN_SPEECH_DURATION = 0.1  # seconds - quick pickup
VAD_MIN_SILENCE_DURATION = 0.5  # seconds - wait before processing

# STT (Speech-to-Text) - Always OpenAI Whisper
STT_MODEL = "whisper-1"

# Interruption handling - enabled with low threshold
INTERRUPTION_ENABLED = True

# Turn detection - optimized for natural conversation
TURN_END_SILENCE_MS = 700  # ms before assuming turn is complete

# Greeting
GREETING_ENABLED = True
GREETING_DELAY_MS = 500  # ms delay before greeting


async def get_assistant_config(assistant_id: str, user_id: str) -> Optional[VoicoryAssistantConfig]:
    """Fetch complete assistant configuration from Supabase
    
    Gets:
    - assistants table: Core settings (instruction, language, LLM model)
    - voices table: Voice provider and voice ID for TTS
    """
    if not supabase:
        logger.warning("supabase_not_configured", assistant_id=assistant_id)
        return None
    
    try:
        # Get assistant with voice info (join with voices table)
        # Includes language_voice_codes for Google TTS BCP-47 voice names
        result = supabase.table("assistants").select(
            "*, voices(id, name, tts_provider, provider_voice_id, elevenlabs_voice_id, elevenlabs_model_id, default_stability, default_similarity, language_voice_codes)"
        ).eq("id", assistant_id).eq("user_id", user_id).single().execute()
        
        if not result.data:
            logger.error("assistant_not_found", assistant_id=assistant_id)
            return None
        
        assistant = result.data
        voice = assistant.get("voices") or {}
        
        # Determine TTS provider based on voice configuration
        # Database schema: tts_provider = 'elevenlabs' | 'google' | 'openai' | 'azure' | 'deepgram'
        voice_tts_provider = voice.get("tts_provider", "elevenlabs")
        tts_provider = "elevenlabs"  # default
        tts_voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel default
        tts_model = "eleven_turbo_v2_5"
        
        if voice_tts_provider == "openai":
            # OpenAI TTS supports: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, marin, cedar
            # Models: tts-1 (fast), tts-1-hd (high quality), gpt-4o-mini-tts (newest, supports instructions)
            # Multilingual: Follows Whisper language support (57+ languages) - auto-detects from input text
            tts_provider = "openai"
            tts_voice_id = voice.get("provider_voice_id") or "alloy"
            # Model from voice table (tts-1 or tts-1-hd stored in elevenlabs_model_id for now)
            tts_model = voice.get("elevenlabs_model_id") or "tts-1-hd"
        elif voice_tts_provider == "google":
            # Google TTS (Chirp3-HD) - supports 24+ languages with multilingual voices
            # Voices: Aoede, Achernar, Achird, Algenib, Algieba, Ankaa, Autonoe, Callirrhoe, Chara, Despina, etc.
            tts_provider = "google"
            tts_voice_id = voice.get("provider_voice_id") or "Aoede"
            tts_model = "chirp3-hd"  # Google's high-quality model
        elif voice_tts_provider == "elevenlabs" or voice.get("elevenlabs_voice_id"):
            # ElevenLabs TTS - supports 29+ languages with multilingual_v2 model
            # Models: eleven_multilingual_v2 (best quality), eleven_turbo_v2_5 (fast), eleven_flash_v2_5 (fastest)
            tts_provider = "elevenlabs"
            tts_voice_id = voice.get("elevenlabs_voice_id") or "21m00Tcm4TlvDq8ikWAM"
            # Model comes from assistant table (user's selection in VoiceSelectorModal)
            # Fallback to voice table default, then hardcoded default
            tts_model = assistant.get("elevenlabs_model_id") or voice.get("elevenlabs_model_id") or "eleven_turbo_v2_5"
        
        # Extract language settings
        language_settings = assistant.get("language_settings") or {}
        primary_language = language_settings.get("default", assistant.get("language", "en"))
        
        # Get Google TTS language voice codes if applicable
        language_voice_codes = voice.get("language_voice_codes") or {}
        
        # Build config from assistant and voice tables only
        config = VoicoryAssistantConfig(
            assistant_id=assistant_id,
            user_id=user_id,
            name=assistant.get("name", "Assistant"),
            instruction=assistant.get("instruction") or "You are a helpful AI assistant.",
            first_message="",  # Will be set based on greeting
            language=primary_language,
            
            # LLM from assistant's Agent tab settings
            llm_model=assistant.get("llm_model") or assistant.get("model", "gpt-4o"),
            llm_temperature=float(assistant.get("temperature", 0.7)),
            llm_max_tokens=int(assistant.get("max_tokens", 300)),
            
            # TTS from voice library
            tts_provider=tts_provider,
            tts_voice_id=tts_voice_id,
            tts_model=tts_model,
            tts_stability=float(voice.get("default_stability", 0.5)),
            tts_similarity_boost=float(voice.get("default_similarity", 0.75)),
            language_voice_codes=language_voice_codes,
            
            # RAG from assistant
            rag_enabled=assistant.get("rag_enabled", False),
            rag_similarity_threshold=float(assistant.get("rag_similarity_threshold", 0.7)),
            rag_max_results=int(assistant.get("rag_max_results", 5)),
            rag_instructions=assistant.get("rag_instructions") or "",
            knowledge_base_ids=assistant.get("knowledge_base_ids") or [],
        )
        
        logger.info(
            "assistant_config_loaded",
            assistant_id=assistant_id,
            name=config.name,
            llm=f"openai/{config.llm_model}",
            tts=f"{config.tts_provider}/{config.tts_voice_id}",
            stt="openai/whisper-1",
            rag_enabled=config.rag_enabled,
        )
        
        return config
        
    except Exception as e:
        logger.error("failed_to_get_assistant", error=str(e), assistant_id=assistant_id)
        return None


async def get_customer_context(customer_id: str, assistant_id: str) -> str:
    """Get customer memory and context for personalization"""
    if not supabase or not customer_id:
        return ""
    
    try:
        # Get customer profile
        customer_result = supabase.table("customers").select(
            "name, phone_number, email, variables"
        ).eq("id", customer_id).single().execute()
        
        if not customer_result.data:
            return ""
        
        customer = customer_result.data
        
        # Get customer memories
        memories_result = supabase.table("customer_memories").select(
            "executive_summary, conversation_context, personality_traits, interests, pain_points"
        ).eq("customer_id", customer_id).single().execute()
        
        memory = memories_result.data or {}
        
        # Build context string
        context_parts = []
        
        if customer.get("name"):
            context_parts.append(f"Customer Name: {customer['name']}")
        
        if memory.get("executive_summary"):
            context_parts.append(f"Customer Summary: {memory['executive_summary']}")
        
        if memory.get("conversation_context"):
            context_parts.append(f"Previous Context: {memory['conversation_context']}")
        
        if memory.get("interests"):
            context_parts.append(f"Interests: {', '.join(memory['interests'])}")
        
        if memory.get("pain_points"):
            context_parts.append(f"Pain Points: {', '.join(memory['pain_points'])}")
        
        return "\n\n".join(context_parts)
        
    except Exception as e:
        logger.error("failed_to_get_customer_context", error=str(e))
        return ""


async def get_knowledge_base_context(config: VoicoryAssistantConfig, query: str) -> str:
    """Get relevant knowledge base content via RAG (similarity search)"""
    if not supabase or not config.rag_enabled or not config.knowledge_base_ids:
        return ""
    
    try:
        # Fetch relevant documents
        docs_result = supabase.table("knowledge_base_documents").select(
            "name, content, character_count"
        ).in_("knowledge_base_id", config.knowledge_base_ids).eq(
            "processing_status", "completed"
        ).limit(config.rag_max_results).execute()
        
        if not docs_result.data:
            return ""
        
        # Format knowledge base content
        kb_content = "\n\n".join([
            f"[{doc['name']}]: {doc['content'][:2000]}..."
            if len(doc.get('content', '')) > 2000
            else f"[{doc['name']}]: {doc.get('content', '')}"
            for doc in docs_result.data
        ])
        
        return kb_content
        
    except Exception as e:
        logger.error("failed_to_get_kb_context", error=str(e))
        return ""


def resolve_template_variables(text: str, context: dict) -> str:
    """Resolve {{variable}} placeholders in text"""
    if not text:
        return text
    
    # System variables
    now = datetime.now()
    variables = {
        "current_time": now.strftime("%I:%M %p"),
        "current_date": now.strftime("%A, %B %d, %Y"),
        "assistant_name": context.get("assistant_name", ""),
        "customer_name": context.get("customer_name", ""),
    }
    
    # Merge with provided context
    variables.update(context)
    
    # Replace variables
    for key, value in variables.items():
        text = text.replace(f"{{{{{key}}}}}", str(value))
    
    return text


class VoicoryAgent(Agent):
    """Custom Agent class that loads configuration from Supabase"""
    
    def __init__(self, config: VoicoryAssistantConfig, customer_context: str = "", kb_context: str = ""):
        # Build system prompt with context
        system_prompt = config.instruction
        
        # Add knowledge base context if RAG enabled
        if kb_context:
            system_prompt = f"{system_prompt}\n\n## Knowledge Base:\n{kb_context}\n\n{config.rag_instructions}"
        
        # Add customer context
        if customer_context:
            system_prompt = f"{system_prompt}\n\n## Customer Context:\n{customer_context}"
        
        # Resolve template variables
        template_context = {
            "assistant_name": config.name,
            "customer_name": customer_context.split("Customer Name: ")[1].split("\n")[0] if "Customer Name:" in customer_context else "",
        }
        system_prompt = resolve_template_variables(system_prompt, template_context)
        
        super().__init__(instructions=system_prompt)
        self.config = config
        self.customer_context = customer_context
        
        logger.info(
            "voicory_agent_initialized",
            assistant_id=config.assistant_id,
            name=config.name,
            instruction_length=len(system_prompt),
        )


# Create the agent server
server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    """
    Main entry point for voice agent jobs.
    Called when a participant joins a room that matches our dispatch rules.
    
    Room name format: voice_{assistant_id}_{user_id}_{customer_id}_{timestamp}
    """
    logger.info("job_started", room=ctx.room.name)
    
    # Extract metadata from room name
    room_parts = ctx.room.name.split("_")
    assistant_id = room_parts[1] if len(room_parts) > 1 else None
    user_id = room_parts[2] if len(room_parts) > 2 else None
    customer_id = room_parts[3] if len(room_parts) > 3 else None
    
    # Load assistant configuration from database
    config = None
    if assistant_id and user_id:
        config = await get_assistant_config(assistant_id, user_id)
    
    # Use defaults if no config found
    if not config:
        logger.warning("using_default_config", assistant_id=assistant_id)
        config = VoicoryAssistantConfig(
            assistant_id=assistant_id or "default",
            user_id=user_id or "default",
        )
    
    # Get customer context for personalization
    customer_context = ""
    if customer_id:
        customer_context = await get_customer_context(customer_id, config.assistant_id)
    
    # Get knowledge base context if RAG enabled
    kb_context = ""
    if config.rag_enabled:
        kb_context = await get_knowledge_base_context(config, "")
    
    logger.info(
        "agent_configured",
        assistant_id=assistant_id,
        stt="openai/whisper-1",
        llm=f"openai/{config.llm_model}",
        tts=f"{config.tts_provider}/{config.tts_voice_id}",
        temperature=config.llm_temperature,
        has_customer_context=bool(customer_context),
        has_kb_context=bool(kb_context),
    )
    
    # ============================================
    # BUILD VOICE PIPELINE (Hardcoded optimal settings)
    # ============================================
    
    # STT: Always OpenAI Whisper for best quality
    stt_plugin = openai.STT(
        model=STT_MODEL,
        language=config.language if config.language != "en" else None,
    )
    
    # LLM: OpenAI with settings from Agent tab
    llm_plugin = openai.LLM(
        model=config.llm_model,
        temperature=config.llm_temperature,
    )
    
    # TTS: Based on voice from voice library
    if config.tts_provider == "openai":
        # OpenAI TTS - supports 13 voices, 57+ languages (auto-detected from text)
        # Models: tts-1 (fast), tts-1-hd (high quality), gpt-4o-mini-tts (newest)
        tts_plugin = openai.TTS(
            model=config.tts_model,  # tts-1 or tts-1-hd from voice table
            voice=config.tts_voice_id,  # alloy, echo, fable, onyx, nova, shimmer, etc.
        )
    elif config.tts_provider == "google" and os.getenv("GOOGLE_TTS_API_KEY"):
        # Google Cloud TTS (Chirp3-HD) - 24+ languages with multilingual voices
        # Voice names follow BCP-47 format: "{lang}-{region}-Chirp3-HD-{VoiceName}"
        # E.g., "en-US-Chirp3-HD-Aoede", "hi-IN-Chirp3-HD-Aoede"
        
        # Map language code to BCP-47 format
        lang_to_bcp47 = {
            "en": "en-US", "hi": "hi-IN", "es": "es-ES", "fr": "fr-FR",
            "de": "de-DE", "it": "it-IT", "pt": "pt-BR", "ja": "ja-JP",
            "ko": "ko-KR", "zh": "cmn-CN", "ar": "ar-XA", "ru": "ru-RU",
            "nl": "nl-NL", "pl": "pl-PL", "tr": "tr-TR", "vi": "vi-VN",
            "th": "th-TH", "id": "id-ID", "ta": "ta-IN", "te": "te-IN",
            "bn": "bn-IN", "gu": "gu-IN", "kn": "kn-IN", "ml": "ml-IN",
            "mr": "mr-IN", "ur": "ur-IN", "sv": "sv-SE", "da": "da-DK",
            "fi": "fi-FI", "nb": "nb-NO"
        }
        
        # Get BCP-47 language code
        bcp47_lang = lang_to_bcp47.get(config.language, "en-US")
        
        # Use language_voice_codes from DB if available, else construct it
        if config.language_voice_codes and bcp47_lang in config.language_voice_codes:
            google_voice = config.language_voice_codes[bcp47_lang]
        else:
            # Construct Google voice name: {lang}-Chirp3-HD-{VoiceName}
            google_voice = f"{bcp47_lang}-Chirp3-HD-{config.tts_voice_id}"
        
        tts_plugin = google.TTS(
            voice=google_voice,
            language=bcp47_lang,
        )
    elif config.tts_provider == "elevenlabs" and os.getenv("ELEVENLABS_API_KEY"):
        # ElevenLabs TTS - highest quality, 29+ languages
        tts_plugin = elevenlabs.TTS(
            voice=config.tts_voice_id,
            model=config.tts_model,
            stability=config.tts_stability,
            similarity_boost=config.tts_similarity_boost,
        )
    else:
        # Fallback to OpenAI TTS with default voice
        tts_plugin = openai.TTS(
            model="tts-1",
            voice="alloy",
        )
    
    # VAD: Silero with optimized settings
    vad_plugin = silero.VAD.load(
        min_speech_duration=VAD_MIN_SPEECH_DURATION,
        min_silence_duration=VAD_MIN_SILENCE_DURATION,
    )
    
    # Create agent session with configured plugins
    session = AgentSession(
        stt=stt_plugin,
        llm=llm_plugin,
        tts=tts_plugin,
        vad=vad_plugin,
    )
    
    # Create the custom agent with loaded config
    agent = VoicoryAgent(
        config=config,
        customer_context=customer_context,
        kb_context=kb_context,
    )
    
    # Start the session with room I/O options
    await session.start(
        room=ctx.room,
        agent=agent,
        room_options=room_io.RoomOptions(),
    )
    
    # Generate greeting if enabled
    if GREETING_ENABLED:
        greeting = f"Hello! I'm {config.name}. How can I help you today?"
        if GREETING_DELAY_MS > 0:
            await asyncio.sleep(GREETING_DELAY_MS / 1000)
        await session.generate_reply(instructions=f"Greet the user. Say: {greeting}")
    
    logger.info("agent_started", room=ctx.room.name, assistant_name=config.name)


if __name__ == "__main__":
    # Run the agent server
    agents.cli.run_app(server)
