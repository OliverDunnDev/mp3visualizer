import librosa
import numpy as np

def analyze_audio(file_path):
    y, sr = librosa.load(file_path)
    rms = librosa.feature.rms(y=y)[0]
    pitches, _ = librosa.piptrack(y=y, sr=sr)
    pitch_vals = [float(np.max(p)) for p in pitches.T]

    step = max(1, len(rms) // 100)
    simplified = [
        {"volume": float(rms[i]), "pitch": pitch_vals[i]}
        for i in range(0, len(rms), step)
    ]
    return simplified
