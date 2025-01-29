import time
timerStart = time.time()

import torch
import base64
import argparse
import numpy as np
print(torch.__path__)
print("torch.cuda.is_available()", torch.cuda.is_available())
import socketio # pip install python-socketio
from melo.api import TTS
import datetime
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Parse command line arguments
parser = argparse.ArgumentParser(description='Vosk Socket Client')
parser.add_argument('--userId', type=str, required=True, help='User ID')
parser.add_argument('--guildId', type=str, required=True, help='Guild ID')
args = parser.parse_args()

# Speed is adjustable
speed = 1.25
device = 'cuda' # or cpu

model = TTS(language='FR', device=device)
print(f"model loaded: {time.time() - timerStart:.2f} seconds")

# Initialize Socket.IO client
sio = socketio.Client() # logger=True, engineio_logger=True, namespace=...

# Define Socket.IO events
@sio.event
def connect():
    print("Connected to the server")

@sio.event
def disconnect():
    print("Disconnected from the server")


@sio.on('text')
def on_text(text):
    print("Text received:", text)
    timerStart = time.time()
    speaker_ids = model.hps.data.spk2id
    output_path=f"fr_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.wav"
    print(output_path)
    model.tts_to_file(
        text,
        speaker_ids['FR'],
        output_path=f"fr_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.wav",
        speed=speed,
        # sdp_ratio=0.1,
        # noise_scale: float = 0.6,
        # noise_scale_w: float = 0.8,
        # pbar: Any | None = None,
        format = 'wav',
        # position: Any | None = None,
        # quiet=True,
    )

    print(f"audio generated: {time.time() - timerStart:.2f} seconds")
    sio.emit('transcribed-audio', output_path)

@sio.on('connect_error')
def on_connect_error(data):
    print("Connection failed:", data)

def connect_to_server():
    server_url = 'ws://localhost:80'  # Use the correct URL

    sio.connect(
        url=server_url,
        headers = { 'user_id': args.userId, 'guild_id': args.guildId }
    )

    try:
        # Keep the connection alive
        time.sleep(100000)
        sio.wait()

    except KeyboardInterrupt:
        print("Connection closed")
        sio.disconnect()

if __name__ == "__main__":
    print("Time taken:", time.time() - timerStart)

    connect_to_server()
