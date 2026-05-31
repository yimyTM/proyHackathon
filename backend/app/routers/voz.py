from fastapi import APIRouter, File, UploadFile, HTTPException
from deepgram import AsyncDeepgramClient
from app.core.config import DEEPGRAM_API_KEY

router = APIRouter(prefix="/voz", tags=["voz"])


@router.post("/transcribir", summary="Transcribe audio a texto en español")
async def transcribir(audio: UploadFile = File(...)):
    if not DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY no configurada en .env")

    audio_bytes = await audio.read()

    try:
        client = AsyncDeepgramClient(api_key=DEEPGRAM_API_KEY)
        response = await client.listen.v1.media.transcribe_file(
            request=audio_bytes,
            model="nova-2",
            language="es",
            smart_format=True,
        )
        transcript = response.results.channels[0].alternatives[0].transcript
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {"transcript": transcript}