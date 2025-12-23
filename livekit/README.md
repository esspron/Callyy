# LiveKit Self-Hosted Deployment for Voicory

This directory contains everything needed to deploy LiveKit for real-time voice AI.

## 🟢 Production Deployment Status

| Component | Status | URL/Details |
|-----------|--------|-------------|
| **LiveKit Server** | ✅ Running | `34.180.15.3:7880` |
| **GCE VM** | ✅ Running | `livekit-server` (asia-south1-a) |
| **Caddy SSL Proxy** | ✅ Installed | Waiting for DNS |
| **DNS** | ⏳ Pending | Need A record: `livekit.voicory.com → 34.180.15.3` |
| **Voice Agent** | ⏳ Pending | Cloud Run deployment |

### Production Credentials
```env
LIVEKIT_URL=wss://livekit.voicory.com
LIVEKIT_API_KEY=APIVoicorye503a529
LIVEKIT_API_SECRET=RmF4uKWP8O0Tc5FBbcF2usepiMaN8WVzBhEOKqzh
```

### DNS Setup Required
Add this A record to your DNS provider:
| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | livekit | 34.180.15.3 | 300 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Voicory Voice Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Browser (React)                                               │
│   ┌─────────────────┐                                           │
│   │ LiveKitVoiceCall│ ◄──── @livekit/components-react           │
│   │ Component       │       livekit-client                      │
│   └────────┬────────┘                                           │
│            │ WebRTC (UDP) - <200ms latency                      │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │ LiveKit Server  │ ◄──── GCE VM (for UDP support)            │
│   │ (SFU)           │       wss://livekit.voicory.com           │
│   └────────┬────────┘                                           │
│            │ Room subscription                                  │
│            ▼                                                    │
│   ┌─────────────────┐                                           │
│   │ Voice Agent     │ ◄──── Cloud Run (Python)                  │
│   │ (livekit-agents)│       Deepgram → OpenAI → ElevenLabs      │
│   └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start (Local Development)

### 1. Generate API Keys
```bash
cd livekit
chmod +x setup.sh
./setup.sh keys
```

### 2. Configure Environment
Edit `.env` and add your AI provider keys:
```env
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
```

### 3. Start LiveKit Locally
```bash
./setup.sh local
```

This starts:
- LiveKit Server on `ws://localhost:7880`
- Redis on `localhost:6379`
- Voice Agent container

### 4. Test the Connection
```bash
# Check LiveKit server health
curl http://localhost:7880

# View logs
docker compose logs -f
```

## Production Deployment (GCP)

### Option A: GCE VM for LiveKit Server (Recommended)

LiveKit needs UDP ports for WebRTC, which Cloud Run doesn't support. Deploy to a GCE VM:

```bash
# Set your project
export GCP_PROJECT_ID=voicory
export GCE_ZONE=asia-south1-a

# Deploy LiveKit server to GCE
./setup.sh gce
```

This creates:
- `e2-medium` VM with Container-Optimized OS
- Firewall rules for ports 7880, 7881, 50000-50100 (UDP), 3478, 5349

### Option B: LiveKit Cloud (Easiest)

Instead of self-hosting, use [LiveKit Cloud](https://cloud.livekit.io):
1. Sign up at cloud.livekit.io
2. Create a project
3. Get your API keys and WebSocket URL
4. Update `.env` with cloud credentials

### Deploy Voice Agent to Cloud Run

```bash
./setup.sh agent
```

## Environment Variables

### Backend (add to Cloud Run)
```env
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-livekit-server:7880
```

### Frontend (add to Vercel)
```env
VITE_LIVEKIT_URL=wss://your-livekit-server:7880
```

## File Structure

```
livekit/
├── setup.sh              # Setup and deployment script
├── docker-compose.yml    # Local development compose
├── livekit.yaml          # LiveKit server config (local)
├── livekit-gce.yaml      # LiveKit server config (production)
├── Dockerfile.server     # LiveKit server Dockerfile
├── README.md             # This file
└── agent/
    ├── main.py           # Voice agent entrypoint
    ├── requirements.txt  # Python dependencies
    └── Dockerfile        # Agent container image
```

## Troubleshooting

### "Connection failed" in browser
1. Check LiveKit server is running: `curl http://localhost:7880`
2. Check firewall allows WebRTC ports
3. Verify LIVEKIT_URL in frontend matches server

### Voice agent not responding
1. Check agent logs: `docker compose logs voice-agent`
2. Verify API keys are set in `.env`
3. Check Deepgram/OpenAI/ElevenLabs quotas

### High latency (>500ms)
1. Ensure using WebRTC (not WebSocket fallback)
2. Check geographic distance to LiveKit server
3. Consider deploying server closer to users

## Scaling

### Multiple Regions
Deploy LiveKit servers in multiple regions:
- `asia-south1` (Mumbai) - Primary for India
- `us-central1` (Iowa) - For US users
- `europe-west1` (Belgium) - For EU users

Use LiveKit's built-in region routing or a load balancer.

### Agent Scaling
Cloud Run auto-scales voice agents. Adjust:
- `--min-instances=1` for always-on
- `--max-instances=10` for peak load
- `--memory=1Gi` for larger context

## Costs

### Self-Hosted (GCE)
- `e2-medium` VM: ~$25/month
- Egress bandwidth: ~$0.12/GB

### LiveKit Cloud
- $0.001/participant-minute (voice)
- No infrastructure management

### Voice Agent (Cloud Run)
- ~$0.00002/second of CPU time
- Typical call: ~$0.01-0.02
