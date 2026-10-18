"""独自の仮ループを標準ライブラリだけで再生成。外部音源・既存曲を使わない。"""
import math
import struct
import wave
from pathlib import Path

RATE = 16000
ROOT = Path(__file__).resolve().parents[1] / 'src' / 'music'
SONGS = [
    ('jp_town_day', 96, [62, 64, 66, 69, 71], [0, 2, 3, 2, 1, 0, 4, 3, 2, 1, 0, 1, 3, 4, 2, 0], 'pluck'),
    ('jp_town_night', 72, [59, 62, 64, 66, 69], [0, None, 2, None, 1, None, 3, None, 4, None, 2, None, 1, None, 0, None], 'flute'),
    ('jp_shop_calm', 84, [60, 64, 67, 71, 74], [2, 1, 0, None, 3, 2, 1, None, 4, 3, 2, None, 1, 2, 0, None], 'keys'),
    ('jp_shop_lively', 108, [67, 69, 71, 74, 76], [0, 2, 1, 3, 2, 4, 3, 1, 2, 0, 1, 4, 3, 2, 1, 0], 'pluck'),
    ('jp_home_default', 78, [60, 62, 64, 67, 69], [0, None, 2, 3, 1, None, 2, None, 4, 3, 2, None, 1, 2, 0, None], 'keys'),
]
ROOT.mkdir(exist_ok=True)
for song, bpm, scale, motif, tone in SONGS:
    beat = 60 / bpm
    samples = [0.0] * int(16 * beat * RATE)

    def note(midi, start, length, gain, sound):
        frequency = 440 * 2 ** ((midi - 69) / 12)
        for i in range(int(length * RATE)):
            target = int(start * RATE) + i
            if target >= len(samples):
                break
            t = i / RATE
            attack = min(1, t / 0.012)
            release = min(1, (length - t) / 0.08)
            decay = math.exp(-t * (4 if sound == 'pluck' else 2))
            fundamental = math.sin(2 * math.pi * frequency * t)
            overtone = math.sin(4 * math.pi * frequency * t) * (0.14 if sound == 'flute' else 0.27)
            samples[target] += (fundamental + overtone) * attack * release * decay * gain

    for step, degree in enumerate(motif * 2):
        if degree is not None:
            note(scale[degree], step * beat / 2, min(beat * .85, .7), .16, tone)
    for bar in range(4):
        root = scale[[0, 3, 2, 0][bar]] - 12
        for offset in [0, 2]:
            note(root, (bar * 4 + offset) * beat, beat * 1.6, .10, 'keys')
        note(root + 7, (bar * 4 + 1) * beat, beat * 2.5, .045, 'flute')
        if tone == 'pluck':
            for offset in [1, 3]:
                note(43, (bar * 4 + offset) * beat, .08, .08, 'pluck')
    pcm = b''.join(struct.pack('<h', round(max(-.95, min(.95, value)) * 32767)) for value in samples)
    with wave.open(str(ROOT / (song + '.wav')), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm)
    print(song, len(samples) / RATE, 'seconds')
