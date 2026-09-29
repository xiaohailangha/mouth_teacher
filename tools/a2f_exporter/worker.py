"""Loopback-only A2F inference worker. Reach it through an SSH tunnel.

The worker accepts a 24 kHz mono PCM WAV and returns the official SDK's
skin/tongue blendshape solve. It deliberately exposes no public listener.
"""

import audioop
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import wave


SDK = Path(os.environ.get("A2F_SDK_DIR", "/root/Audio2Face-3D-SDK"))
MODEL = SDK / "_data/generated/audio2face-sdk/samples/data/multi-diffusion/model.json"
BINARY = SDK / "_build/release/audio2face-sdk/bin/mouth-teacher-a2f-exporter"
RUNNER = SDK / "run_sample.sh"
BUSY = threading.Lock()
MAX_BODY = 10_000_000


def convert_wav(raw):
    with wave.open(io.BytesIO(raw), "rb") as source:
        if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, 24000):
            raise ValueError("Expected 24 kHz mono 16-bit PCM WAV")
        if source.getnframes() > 24000 * 30:
            raise ValueError("Audio must be 30 seconds or shorter")
        pcm = source.readframes(source.getnframes())
    converted, _ = audioop.ratecv(pcm, 2, 1, 24000, 16000, None)
    output = io.BytesIO()
    with wave.open(output, "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(16000)
        target.writeframes(converted)
    return output.getvalue()


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        body = json.dumps(data, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.respond(200, {"ready": all(p.is_file() for p in (MODEL, BINARY, RUNNER))})
        else:
            self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/infer":
            return self.respond(404, {"error": "Not found"})
        size = int(self.headers.get("Content-Length", "0"))
        if size <= 0 or size > MAX_BODY:
            return self.respond(413, {"error": "Audio request is too large"})
        if not BUSY.acquire(blocking=False):
            return self.respond(429, {"error": "A2F is already processing audio"})
        try:
            payload = json.loads(self.rfile.read(size))
            raw = base64.b64decode(payload["audioBase64"], validate=True)
            wav = convert_wav(raw)
            with tempfile.TemporaryDirectory(prefix="mouth-a2f-") as folder:
                input_path = Path(folder) / "input.wav"
                output_path = Path(folder) / "face.json"
                input_path.write_bytes(wav)
                result = subprocess.run(
                    [str(RUNNER), str(BINARY), str(input_path), str(MODEL), str(output_path)],
                    cwd=SDK, capture_output=True, text=True, timeout=120, check=False,
                    env={**os.environ, "CUDA_PATH": os.environ.get("CUDA_PATH", "/usr/local/cuda-12.9"),
                         "TENSORRT_ROOT_DIR": os.environ.get("TENSORRT_ROOT_DIR", "/usr")},
                )
                if result.returncode or not output_path.is_file():
                    self.log_error("A2F exporter exited %s: %s %s", result.returncode, result.stdout[-1000:], result.stderr[-1000:])
                    raise RuntimeError("Audio2Face inference failed")
                face = json.loads(output_path.read_text("utf-8"))
            if face.get("schema") != 2 or len(face.get("tongueChannels", [])) != 16:
                raise RuntimeError("A2F worker returned incomplete tongue data")
            self.respond(200, {"face": face})
        except (ValueError, KeyError, json.JSONDecodeError):
            self.respond(400, {"error": "Invalid audio request"})
        except (RuntimeError, subprocess.TimeoutExpired):
            self.respond(502, {"error": "Audio2Face inference failed"})
        finally:
            BUSY.release()


if __name__ == "__main__":
    if not all(p.is_file() for p in (MODEL, BINARY, RUNNER)):
        raise SystemExit("A2F model or exporter is missing")
    port = int(os.environ.get("A2F_WORKER_PORT", "8799"))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
