"""Synthesizes Overlune's own alert sounds (T6.142): Phosphor, Daylight, Abyss, Sakura, Skate Deck, Session, Shonen
and Quest. Our own work,
no samples (CC0, docs/ASSETS.md). Mono, 44.1 kHz. Needs numpy and ffmpeg (not project dependencies; run by hand).
Each is normalized to -12 LUFS integrated (ffmpeg loudnorm, measured with silence padding so short sounds gate
correctly) with true peak <= -1 dBTP, then encoded as Ogg Vorbis.
Usage: python tests/make-sounds.py public/sounds <path to ffmpeg>   (a fixed seed, so the same files come out)
"""
import json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 44100
OUT, FFMPEG = Path(sys.argv[1]), sys.argv[2]
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, attack, release_tau):
    """Fast linear attack, then exponential decay with time constant release_tau (seconds)."""
    x = np.arange(n) / SR
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(x - attack, 0) / release_tau)


def fade(sig, ms=6):
    n = int(SR * ms / 1000)
    sig[:n] *= np.linspace(0, 1, n)
    sig[-n:] *= np.linspace(1, 0, n)
    return sig


def lowpass(sig, cutoff):
    """One-pole low-pass, run twice (gentle, no ringing)."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    for _ in range(2):
        out = np.empty_like(sig)
        y = 0.0
        for i, v in enumerate(sig):
            y = (1 - a) * v + a * y
            out[i] = y
        sig = out
    return sig


def place(total, *parts):
    """Mixes (start_seconds, signal) parts into one buffer `total` seconds long."""
    buf = np.zeros(int(SR * total))
    for start, sig in parts:
        i = int(SR * start)
        buf[i : i + len(sig)] += sig[: len(buf) - i]
    return buf


def phosphor():
    # A short terminal beep pair: two soft-edged square-ish tones, the second a fifth higher.
    def beep(freq, sec):
        x = t(sec)
        s = sum(np.sin(2 * np.pi * freq * k * x) / k for k in (1, 3, 5, 7))  # band-limited square
        return fade(lowpass(s, 5000) * 0.6, 4)

    return place(0.42, (0.0, beep(1046.5, 0.075)), (0.115, beep(1568.0, 0.11)))


def daylight():
    # A clean bell: inharmonic partials, each decaying at its own rate, the highest fastest.
    x = t(1.3)
    f0 = 880.0
    partials = [(1.0, 1.0, 0.9), (2.0, 0.5, 0.55), (2.76, 0.35, 0.4), (5.4, 0.18, 0.18), (8.93, 0.08, 0.1)]
    s = sum(a * np.sin(2 * np.pi * f0 * r * x) * env(len(x), 0.002, tau) for r, a, tau in partials)
    return fade(s, 3)


def abyss():
    # A soft sonar ping over a low pad: a sine that drops a little in pitch, with one quieter echo.
    x = t(0.9)
    freq = 1180 * (1 - 0.04 * (1 - np.exp(-x / 0.3)))
    ping = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(len(x), 0.004, 0.22)
    xp = t(1.45)
    pad = (np.sin(2 * np.pi * 55 * xp) + 0.6 * np.sin(2 * np.pi * 82.4 * xp)) * np.sin(np.pi * xp / 1.45) ** 2 * 0.35
    return fade(place(1.45, (0.0, pad), (0.05, ping), (0.33, ping * 0.35)), 8)


def sakura():
    # A single koto-like pluck: Karplus-Strong string (G4) with a bright, slightly nasal attack.
    n = int(SR * 1.3)
    period = int(SR / 392.0)
    buf = rng.uniform(-1, 1, period)
    buf = np.convolve(buf, [0.6, 0.4], mode="same")  # a little softer than white noise
    out = np.empty(n)
    for i in range(n):
        v = buf[i % period]
        out[i] = v
        buf[i % period] = 0.4985 * (v + buf[(i + 1) % period])  # averaging filter, slow decay
    pluck = out * env(n, 0.001, 0.55)
    # The koto's "twang": a quick upper partial at the attack.
    x = t(0.12)
    twang = np.sin(2 * np.pi * 392 * 3 * x) * env(len(x), 0.0005, 0.03) * 0.3
    return fade(place(1.3, (0.0, pluck), (0.0, twang)), 4)


def skate():
    # Board pop and click: a low thump with a snap of grit, then the landing click.
    x = t(0.09)
    thump = np.sin(2 * np.pi * np.cumsum(170 * np.exp(-x / 0.04) + 55) / SR) * env(len(x), 0.001, 0.035)
    snap = lowpass(rng.uniform(-1, 1, int(SR * 0.025)), 3800) * env(int(SR * 0.025), 0.0005, 0.008) * 1.4
    y = t(0.06)
    land = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-y / 0.03) + 70) / SR) * env(len(y), 0.001, 0.02) * 0.8
    click = lowpass(rng.uniform(-1, 1, int(SR * 0.012)), 6000) * env(int(SR * 0.012), 0.0003, 0.004) * 1.6
    return fade(place(0.5, (0.0, thump), (0.0, snap), (0.2, land), (0.2, click)), 3)


def brass(freqs, sec, cutoff):
    """A muted horn voice: band-limited sawtooths through a low-pass, swelling in and dying away."""
    x = t(sec)
    s = sum(sum(np.sin(2 * np.pi * f * k * x) / k for k in range(1, 9)) for f in freqs) / len(freqs)
    shape = np.minimum(x / 0.025, 1) * np.exp(-np.maximum(x - 0.06, 0) / (sec / 2.5))
    return lowpass(s * shape, cutoff)


def string_pluck(freq, sec, decay=0.4985):
    """Karplus-Strong string."""
    n = int(SR * sec)
    period = int(SR / freq)
    buf = np.convolve(rng.uniform(-1, 1, period), [0.5, 0.5], mode="same")
    out = np.empty(n)
    for i in range(n):
        v = buf[i % period]
        out[i] = v
        buf[i % period] = decay * (v + buf[(i + 1) % period])
    return out * env(n, 0.001, sec / 3)


def session():
    # A brush snare swish into a muted horn stab: a jazz club's cue.
    swish = lowpass(rng.uniform(-1, 1, int(SR * 0.3)), 4500) * env(int(SR * 0.3), 0.03, 0.09) * 0.7
    stab = brass([233.1, 293.7, 349.2, 440.0], 0.42, 1700) * 1.6  # B-flat major seventh
    return fade(place(0.62, (0.0, swish), (0.12, stab)), 4)


def shonen():
    # A whoosh rising into one big taiko hit.
    nw = int(SR * 0.28)
    whoosh = lowpass(rng.uniform(-1, 1, nw), 2500) * np.linspace(0, 1, nw) ** 2 * 0.5
    x = t(0.9)
    body = np.sin(2 * np.pi * np.cumsum(60 + 70 * np.exp(-x / 0.05)) / SR) * env(len(x), 0.002, 0.28)
    skin = lowpass(rng.uniform(-1, 1, int(SR * 0.06)), 1400) * env(int(SR * 0.06), 0.001, 0.02) * 1.2
    return fade(place(1.15, (0.0, whoosh), (0.26, body), (0.26, skin)), 4)


def quest():
    # A lute strum up a D major chord, then a short horn call, like a quest log opening.
    notes = [293.7, 370.0, 440.0, 587.3]
    strum = [(0.07 * i, string_pluck(f, 0.9) * 0.8) for i, f in enumerate(notes)]
    horn = brass([440.0], 0.22, 2200) * 0.9
    horn2 = brass([587.3], 0.45, 2200) * 0.9
    return fade(place(1.35, *strum, (0.42, horn), (0.62, horn2)), 4)


def write_wav(path, sig):
    sig = sig / np.max(np.abs(sig)) * 0.5
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((sig * 32767).astype("<i2").tobytes())


def loudness(path):
    """Integrated loudness and true peak, padded with a second of silence so short sounds gate correctly."""
    r = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", str(path), "-af", "apad=pad_dur=1,loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    j = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr).group(0))
    return float(j["input_i"]), float(j["input_tp"])


for name, make in [("phosphor", phosphor), ("daylight", daylight), ("abyss", abyss), ("sakura", sakura), ("skate-deck", skate), ("session", session), ("shonen", shonen), ("quest", quest)]:
    raw = OUT / f"{name}.raw.wav"
    write_wav(raw, make())
    # Gain to -12 LUFS, with a peak limiter (as broadcast audio does) so sharp attacks (the pluck, the pop) can reach
    # it without going over -1 dBTP; a second pass trims what the limiter and the encoder moved.
    ogg = OUT / f"{name}.ogg"
    gain = 0.0
    for _ in range(3):
        lufs, _peak = loudness(ogg if gain else raw)
        gain += -12 - lufs
        subprocess.run(
            [FFMPEG, "-hide_banner", "-y", "-loglevel", "error", "-i", str(raw), "-af",
             f"volume={gain:.2f}dB,alimiter=limit=0.79:attack=1:release=60:level=false",
             "-c:a", "libvorbis", "-q:a", "5", "-ar", str(SR), "-ac", "1", str(ogg)],
            check=True,
        )
    final = loudness(ogg)
    dur = float(re.search(r"Duration: 00:00:([\d.]+)", subprocess.run([FFMPEG, "-hide_banner", "-i", str(ogg)], capture_output=True, text=True).stderr).group(1))
    print(f"{name}: {dur:.2f}s, {ogg.stat().st_size // 1024} KB, {final[0]:.1f} LUFS, peak {final[1]:.1f} dBTP")
    raw.unlink()
