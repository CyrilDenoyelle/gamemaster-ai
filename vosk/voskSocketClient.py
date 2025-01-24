
import numpy as np
from vosk import Model, KaldiRecognizer
import socketio
import numpy as np
import time
import json

startTimer = time.time()

# Path to the Vosk model
# download the model from https://alphacephei.com/vosk/models and extract it to the vosk folder
# MODEL_PATH = "./vosk/vosk-model-fr-0.6-linto-2.2.0"
MODEL_PATH = "./vosk/vosk-model-fr-0.22"
# Load the Vosk model
model = Model(MODEL_PATH)
# Create a recognizer with a sample rate of 16000 Hz
recognizer = KaldiRecognizer(
    model,
    24000, # Half the Sample rate send by the server (discord decoded format)
)

# Initialize Socket.IO client
sio = socketio.Client() # logger=True, engineio_logger=True, namespace=...

# Define Socket.IO events
@sio.event
def connect():
    print("Connected to the server")

@sio.event
def disconnect():
    print("Disconnected from the server")


audio_buffer = bytearray()
@sio.on('audio-stream')
def on_audio_stream(data):
    # audio_buffer += raw_audio  # Append new data to the buffer
    global audio_buffer
    audio_buffer.extend(data)

@sio.on('connect_error')
def on_connect_error(data):
    print("Connection failed:", data)

global processTimer
processTimer = time.time()
def processAudio():
    while True:
        global audio_buffer
        # Process only when we have a valid length
        if len(audio_buffer) >= 512:

            processTimer = time.time()

            # Convert data to NumPy array and truncate to a multiple of 4 bytes
            truncated = audio_buffer[:len(audio_buffer) - (len(audio_buffer) % 4)]
            truncated_np = np.frombuffer(truncated, dtype=np.int16)
            # Keep the remaining bytes for the next iteration
            audio_buffer = audio_buffer[len(truncated):]

            if len(audio_buffer) != 0:
                print("---------------------------------")
                print("audio_buffer", len(audio_buffer))
                print("---------------------------------")

            # Convert stereo to mono (average channels)
            mono_audio = np.mean(truncated_np.reshape(-1, 2), axis=1).astype(np.int16)

        else:
            # If we don't have enough data, push silence
            mono_audio = np.zeros(
                8192,
                dtype=np.int16
            )

        # push audio to a file
        with open('audiotest.wav', 'ab') as f:
            f.write(mono_audio.tobytes())
        # Process with Vosk
        if recognizer.AcceptWaveform(mono_audio.tobytes()):
            result = recognizer.Result()
            text = json.loads(result)['text']
            if len(text) > 0:
                print('------', time.time() - processTimer)
                processTimer = time.time()
                print(text)
                print('------')
        # else:
        #     result = recognizer.PartialResult()
        #     print(f"({json.loads(result)['partial']})")

        # pause while loop
        time.sleep(0.4)
 
def connect_to_server():
    server_url = 'ws://localhost:8080'  # Use the correct URL and namespace
    sio.connect(server_url)
    try:
        # Keep the connection alive and process incoming data in audio_buffer
        processAudio()

    except KeyboardInterrupt:
        print("Connection closed")
        sio.disconnect()

if __name__ == "__main__":
    print("Time taken:", time.time() - startTimer)

    connect_to_server()