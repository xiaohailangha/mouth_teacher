"""Convert a 24 kHz mono PCM fixture to the SDK's 16 kHz WAV input."""

import audioop
import sys
import wave


def main(source, target):
    with wave.open(source, "rb") as reader:
        if (reader.getnchannels(), reader.getsampwidth(), reader.getframerate(),
                reader.getcomptype()) != (1, 2, 24000, "NONE"):
            raise ValueError("Expected 24 kHz mono 16-bit PCM WAV")
        data = reader.readframes(reader.getnframes())
    converted, _ = audioop.ratecv(data, 2, 1, 24000, 16000, None)
    with wave.open(target, "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(16000)
        writer.writeframes(converted)


if __name__ == "__main__":
    main(*sys.argv[1:])
