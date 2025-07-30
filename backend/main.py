from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import numpy as np
import librosa
import soundfile as sf
import io

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",               # Local dev
        "https://mp3visualizer.vercel.app",   # Deployed frontend (no trailing slash)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check route for Render and others
@app.get("/")
async def root():
    return {"message": "MP3 Visualizer backend is running"}

# Handle CORS preflight requests
@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str):
    return Response(status_code=200)

@app.get("/upload")
async def upload_get():
    return {"message": "Use POST to upload audio."}

@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()

        # Load audio with soundfile and librosa
        audio_stream = io.BytesIO(audio_bytes)
        y, sr = sf.read(audio_stream)

        if len(y.shape) > 1:
            y = np.mean(y, axis=1)  # Convert to mono if stereo

        duration = librosa.get_duration(y=y, sr=sr)
        hop_length = 512

        # Feature extraction
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        cent = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop_length)[0]
        chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop_length)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop_length, n_mfcc=13)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
        tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop_length)
        beat_set = set(beats)

        rms = librosa.util.normalize(rms)
        cent = librosa.util.normalize(cent)
        onset_env = librosa.util.normalize(onset_env)
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)

        # Package into frame-by-frame JSON
        data = []
        for i in range(len(rms)):
            data.append({
                "vol": float(rms[i]),
                "cent": float(cent[i]),
                "beat": i in beat_set,
                "onset": float(onset_env[i]),
                "chroma": chroma[:, i].tolist(),
                "mfcc": mfcc[:, i].tolist(),
                "tempo": float(tempo)
            })

        return JSONResponse(content={
            "duration": duration,
            "data": data,
            "times": times.tolist()
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
