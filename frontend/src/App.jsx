import { useState, useRef } from "react";
import Visualizer from "./Visualizer";

function App() {
  const [volumeData, setVolumeData] = useState([]);
  const [times, setTimes] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create URL for audio playback
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const formData = new FormData();
    formData.append("file", file);

    const baseUrl =
      import.meta.env.MODE === "development"
        ? "http://localhost:8000"
        : "https://mp3visualizer.onrender.com";

    try {
      const res = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("Upload failed:", res.statusText);
        return;
      }

      const json = await res.json();
      console.log("Server response:", json);

      // Map backend data to expected format
      const combined = json.data.map((d) => ({
        vol: d.vol,
        cent: d.cent ?? 0.5, // fallback if cent missing
      }));

      setVolumeData(combined);
      setTimes(json.times ?? []);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">MP3 Visualizer</h1>

      <input
        type="file"
        accept=".mp3"
        onChange={handleUpload}
        className="mb-4"
      />

      {audioUrl && (
        <audio
          controls
          src={audioUrl}
          ref={audioRef}
          className="mb-6 w-full"
        />
      )}

      {volumeData.length > 0 && (
        <Visualizer data={volumeData} times={times} audioRef={audioRef} />
      )}
    </div>
  );
}

export default App;
