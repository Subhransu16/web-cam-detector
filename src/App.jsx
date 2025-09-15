import Webcam from "react-webcam";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

let interval;

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [detections, setDetections] = useState([]);
  const [history, setHistory] = useState([]);
  const [alertShown, setAlertShown] = useState({});

  useEffect(() => {
    startPrediction();
    return () => interval && clearInterval(interval);
  }, []);

  const startPrediction = async () => {
    const model = await cocoSsd.load();
    setLoading(false);

    interval = setInterval(() => {
      detect(model);
    }, 200);
  };

  const detect = async (model) => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const predictions = await model.detect(video);
      setDetections(predictions);

      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawMesh(predictions, ctx);

      checkAlerts(predictions);
    }
  };

  const drawMesh = (predictions, ctx) => {
    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      const text = prediction.class;

      // 🎨 Color-coded bounding boxes
      if (text === "person") ctx.strokeStyle = "blue";
      else if (text === "cell phone") ctx.strokeStyle = "red";
      else ctx.strokeStyle = "lime";

      ctx.lineWidth = 3;
      ctx.font = "18px Arial";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(text, x, y > 10 ? y - 5 : 10);

      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.stroke();
    });
  };

  const checkAlerts = (predictions) => {
    const personCount = predictions.filter((p) => p.class === "person").length;
    const phoneDetected = predictions.some((p) => p.class === "cell phone");

    // 👤 Alert for >1 person
    if (personCount > 1 && !alertShown["person"]) {
      playBeep();
      addToHistory("⚠️ More than 1 person detected!");
      alert("⚠️ Alert: More than 1 person detected!");
      setAlertShown({ ...alertShown, person: true });

      // reset after 5 sec
      setTimeout(() => {
        setAlertShown((prev) => ({ ...prev, person: false }));
      }, 5000);
    }

    // 📱 Alert for phone
    if (phoneDetected && !alertShown["cell phone"]) {
      playBeep();
      addToHistory("📱 Cell phone detected!");
      alert("📱 Alert: Cell phone detected!");
      setAlertShown({ ...alertShown, "cell phone": true });

      // reset after 5 sec
      setTimeout(() => {
        setAlertShown((prev) => ({ ...prev, "cell phone": false }));
      }, 5000);
    }
  };

  const playBeep = () => {
    const audio = new Audio(
      "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
    );
    audio.play();
  };

  const addToHistory = (msg) => {
    const time = new Date().toLocaleTimeString();
    setHistory((prev) => [...prev, `[${time}] ${msg}`]);
  };

  return (
    <div className="parentContainer">
      <h1 className="appTitle">🎯 Real-Time Object Detection</h1>
      {loading ? <span>Loading Model...</span> : null}

      {/* Webcam + Canvas */}
      <div className="videoWrapper">
        <div className="videoBox">
          <Webcam ref={webcamRef} muted={true} className="videoFeed" />
          <canvas ref={canvasRef} className="canvasOverlay" />
        </div>
      </div>

      {/* Live Detection Count */}
      <div className="statsBox">
        <h2>📊 Live Detections</h2>
        {detections.length === 0 ? (
          <p>No objects detected</p>
        ) : (
          <ul>
            {detections.map((d, i) => (
              <li key={i}>
                {d.class} ({Math.round(d.score * 100)}%)
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detection History */}
      <div className="historyBox">
        <h2>📝 Detection History</h2>
        {history.length === 0 ? (
          <p>No alerts yet</p>
        ) : (
          <ul>
            {history.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default App;
