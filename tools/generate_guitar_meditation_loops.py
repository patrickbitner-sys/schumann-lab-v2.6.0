#!/usr/bin/env python3
"""Generate meditation-focused synthetic guitar loops.

The output loops are intentionally mellow, low-density, and loop-safe.
They are synthetic approximations (not real amp captures), built to provide
usable default guitar content for the app's chord layer.
"""

from __future__ import annotations

import argparse
import math
import random
import wave
from pathlib import Path


SAMPLE_RATE = 44_100


NOTE_OFFSETS = {
    "C": 0,
    "C#": 1,
    "D": 2,
    "D#": 3,
    "E": 4,
    "F": 5,
    "F#": 6,
    "G": 7,
    "G#": 8,
    "A": 9,
    "A#": 10,
    "B": 11,
}


VOICINGS = {
    "Cmaj7": ["C3", "G3", "B3", "E4"],
    "Amadd9": ["A2", "E3", "B3", "C4"],
    "G6": ["G2", "D3", "E3", "B3"],
    "Dm9": ["D3", "A3", "C4", "E4"],
    "Em7": ["E2", "B2", "D3", "G3"],
    "Fmaj7": ["F2", "C3", "E3", "A3"],
    "Gsus2": ["G2", "D3", "A3", "D4"],
    "Csus2": ["C3", "G3", "D4", "G4"],
    "Amin7": ["A2", "E3", "G3", "C4"],
    "Dadd9": ["D3", "A3", "E4", "F#4"],
    "Emin9": ["E2", "B2", "D3", "F#3"],
    "Cmaj9": ["C3", "G3", "B3", "D4"],
}


LOOPS = [
    ("gtr_dumble_ambient_78_Cmaj7_cycle01.wav", 78, ["Cmaj7", "Amadd9", "Fmaj7", "G6"]),
    ("gtr_dumble_ambient_80_Amadd9_cycle02.wav", 80, ["Amadd9", "Fmaj7", "Cmaj7", "G6"]),
    ("gtr_dumble_ambient_82_G6_cycle03.wav", 82, ["G6", "Cmaj7", "Dm9", "Em7"]),
    ("gtr_dumble_ambient_74_Dm9_cycle04.wav", 74, ["Dm9", "Amadd9", "Fmaj7", "Cmaj7"]),
    ("gtr_dumble_ambient_88_Em7_cycle05.wav", 88, ["Em7", "Cmaj7", "G6", "Dadd9"]),
    ("gtr_dumble_ambient_72_Fmaj7_cycle06.wav", 72, ["Fmaj7", "Cmaj7", "Amadd9", "Gsus2"]),
    ("gtr_dumble_ambient_84_Gsus2_cycle07.wav", 84, ["Gsus2", "Dadd9", "Em7", "Csus2"]),
    ("gtr_dumble_ambient_76_Csus2_cycle08.wav", 76, ["Csus2", "Gsus2", "Amadd9", "Fmaj7"]),
    ("gtr_dumble_ambient_90_Amin7_cycle09.wav", 90, ["Amin7", "Fmaj7", "Cmaj7", "G6"]),
    ("gtr_dumble_ambient_86_Dadd9_cycle10.wav", 86, ["Dadd9", "Amin7", "Cmaj7", "Gsus2"]),
    ("gtr_dumble_ambient_80_Emin9_cycle11.wav", 80, ["Emin9", "Cmaj7", "G6", "Dadd9"]),
    ("gtr_dumble_ambient_92_Cmaj9_cycle12.wav", 92, ["Cmaj9", "Amadd9", "Fmaj7", "Gsus2"]),
]


def note_to_freq(note: str) -> float:
    if len(note) not in (2, 3):
        raise ValueError(f"Invalid note: {note}")
    if note[1] == "#":
        key = note[:2]
        octave = int(note[2])
    else:
        key = note[0]
        octave = int(note[1])
    semitone = NOTE_OFFSETS[key]
    midi = (octave + 1) * 12 + semitone
    return 440.0 * (2 ** ((midi - 69) / 12.0))


def add_pluck(
    left: list[float],
    right: list[float],
    start_sec: float,
    freq: float,
    duration_sec: float,
    amp: float,
    pan: float,
    rng: random.Random,
) -> None:
    start = int(start_sec * SAMPLE_RATE)
    length = int(duration_sec * SAMPLE_RATE)
    if start >= len(left) or length <= 0:
        return
    length = min(length, len(left) - start)
    delay = max(2, int(SAMPLE_RATE / max(40.0, freq)))
    ring = [(rng.random() * 2.0 - 1.0) * 0.58 for _ in range(delay)]
    idx = 0
    decay = 0.9983
    lp = 0.0
    drive = 1.18
    drive_norm = math.tanh(drive)

    left_gain = max(0.0, min(1.0, 0.5 * (1.0 - pan)))
    right_gain = max(0.0, min(1.0, 0.5 * (1.0 + pan)))

    attack = max(1, int(0.018 * SAMPLE_RATE))
    release = max(1, int(0.78 * SAMPLE_RATE))

    phase2 = rng.random() * math.tau
    phase3 = rng.random() * math.tau
    w = math.tau * freq / SAMPLE_RATE
    w2 = 2.0 * w
    w3 = 3.0 * w
    p = 0.0
    p2 = phase2
    p3 = phase3

    for i in range(length):
        y = ring[idx]
        nxt = ring[(idx + 1) % delay]
        ring[idx] = ((y + nxt) * 0.5) * decay
        idx = (idx + 1) % delay

        # Add lightly compressed upper harmonics for electric-guitar character.
        s = y + 0.17 * math.sin(p2) + 0.06 * math.sin(p3)
        p += w
        p2 += w2
        p3 += w3

        # Gentle single-pole lowpass.
        lp += 0.17 * (s - lp)
        s = lp

        # Soft clipping for low-gain overdrive character.
        s = math.tanh(s * drive) / drive_norm

        env = 1.0
        if i < attack:
            env = i / attack
        elif i > length - release:
            env = max(0.0, (length - i) / release)
        sample = s * amp * env

        j = start + i
        left[j] += sample * left_gain
        right[j] += sample * right_gain


def render_loop(filename: str, bpm: int, progression: list[str], out_dir: Path) -> None:
    bars = 8
    beats_per_bar = 4
    beat_sec = 60.0 / bpm
    bar_sec = beat_sec * beats_per_bar
    total_sec = bars * bar_sec
    frames = int(total_sec * SAMPLE_RATE)
    left = [0.0] * frames
    right = [0.0] * frames

    rng = random.Random(filename)
    strums = [
        (0.00, 3.6, 0.16),
        (2.25, 2.6, 0.11),
    ]

    for bar in range(bars):
        chord_name = progression[bar % len(progression)]
        notes = VOICINGS[chord_name]
        bar_start = bar * bar_sec

        # Low root anchor.
        root_hz = note_to_freq(notes[0]) / 2.0
        add_pluck(
            left,
            right,
            start_sec=bar_start + 0.01,
            freq=root_hz,
            duration_sec=3.25 * beat_sec,
            amp=0.11,
            pan=-0.10 + rng.uniform(-0.025, 0.025),
            rng=rng,
        )

        for beat_pos, sustain_beats, base_amp in strums:
            strum_start = bar_start + beat_pos * beat_sec
            for n, note in enumerate(notes):
                add_pluck(
                    left,
                    right,
                    start_sec=strum_start + n * 0.032,
                    freq=note_to_freq(note),
                    duration_sec=max(0.75, sustain_beats * beat_sec),
                    amp=base_amp * (0.88 ** n),
                    pan=-0.06 + 0.045 * n + rng.uniform(-0.02, 0.02),
                    rng=rng,
                )

    # Slow breathing-style amplitude drift.
    for i in range(frames):
        t = i / SAMPLE_RATE
        mod = 1.0 + 0.027 * math.sin(math.tau * 0.15 * t) + 0.013 * math.sin(math.tau * 0.06 * t + 0.8)
        left[i] *= mod
        right[i] *= mod

    # Click-safe loop edge.
    edge = max(1, int(0.02 * SAMPLE_RATE))
    for i in range(edge):
        ramp = i / edge
        left[i] *= ramp
        right[i] *= ramp
        left[-1 - i] *= ramp
        right[-1 - i] *= ramp

    peak = max(max(abs(v) for v in left), max(abs(v) for v in right), 1e-8)
    gain = 0.89 / peak
    left = [max(-0.98, min(0.98, v * gain)) for v in left]
    right = [max(-0.98, min(0.98, v * gain)) for v in right]

    out_path = out_dir / filename
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames_bytes = bytearray()
        for l, r in zip(left, right):
            li = int(max(-32767, min(32767, l * 32767)))
            ri = int(max(-32767, min(32767, r * 32767)))
            frames_bytes += li.to_bytes(2, byteorder="little", signed=True)
            frames_bytes += ri.to_bytes(2, byteorder="little", signed=True)
        wf.writeframes(frames_bytes)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project_root", default=".", help="Project root")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    out_dir = root / "assets" / "chords" / "library"
    generated = 0
    for filename, bpm, progression in LOOPS:
        render_loop(filename, bpm, progression, out_dir)
        generated += 1
    print(f"Generated {generated} guitar loops in {out_dir}")


if __name__ == "__main__":
    main()
