import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Send, Square, Volume2, Wifi, WifiOff } from 'lucide-react';
import { WalkieChannel, WalkieMessage } from '../types/hub';

interface WalkieTalkiePanelProps {
  mode: 'resident' | 'staff' | 'lead';
  hotspotUp: boolean;
  cellServiceUp: boolean;
  messages: WalkieMessage[];
  onSendMessage: (params: {
    channel: WalkieChannel;
    senderRole: 'Resident' | 'Hub Staff' | 'Hub Lead';
    kind: 'voice' | 'text';
    durationSec?: number;
    transcript: string;
    audioUrl?: string;
  }) => void;
}

type MicStatus = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported';
type TalkMode = 'tap' | 'hold';

const CHANNELS: { id: WalkieChannel; short: string; label: string; freq: string }[] = [
  { id: 'ch1_lead', short: 'Ch 1 · Lead', label: 'Ch 1 · Hub Lead & Generator', freq: '151.625 MHz / FRS 1' },
  { id: 'ch2_staff', short: 'Ch 2 · Staff', label: 'Ch 2 · Desk & Shuttle', freq: '154.570 MHz / FRS 2' },
  { id: 'ch3_neighbor', short: 'Ch 3 · Help', label: 'Ch 3 · Neighbor & Medical', freq: '154.600 MHz / FRS 3' },
];

function pickSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

function playRadioChirp(type: 'start' | 'end') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'start') {
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(1520, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      osc.frequency.setValueAtTime(1420, now);
      osc.frequency.setValueAtTime(980, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 250);
  } catch {
    // Ignore if audio context is unavailable
  }
}

export function WalkieTalkiePanel({
  mode,
  hotspotUp,
  cellServiceUp,
  messages,
  onSendMessage,
}: WalkieTalkiePanelProps) {
  const defaultChannel: WalkieChannel =
    mode === 'resident' ? 'ch3_neighbor' : mode === 'lead' ? 'ch1_lead' : 'ch2_staff';
  const [activeChannel, setActiveChannel] = useState<WalkieChannel>(defaultChannel);
  const [talkMode, setTalkMode] = useState<TalkMode>('tap');
  const [micStatus, setMicStatus] = useState<MicStatus>('checking');
  const [micError, setMicError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textDraft, setTextDraft] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const talkStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isTalkingRef = useRef(false);
  const meterFrameRef = useRef<number | null>(null);
  const meterCtxRef = useRef<AudioContext | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const senderRole: 'Resident' | 'Hub Staff' | 'Hub Lead' =
    mode === 'resident' ? 'Resident' : mode === 'lead' ? 'Hub Lead' : 'Hub Staff';

  const channelInfo = CHANNELS.find((c) => c.id === activeChannel)!;
  const visibleMessages = messages.filter((m) => m.channel === activeChannel);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicStatus('unsupported');
      return;
    }
    setMicStatus('prompt');

    let active = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((perm) => {
          if (!active) return;
          if (perm.state === 'granted') setMicStatus('granted');
          else if (perm.state === 'denied') setMicStatus('denied');
          else setMicStatus('prompt');
          perm.onchange = () => {
            if (!active) return;
            if (perm.state === 'granted') {
              setMicStatus('granted');
              setMicError(null);
            } else if (perm.state === 'denied') {
              setMicStatus('denied');
            } else {
              setMicStatus('prompt');
            }
          };
        })
        .catch(() => {
          // Permissions query for microphone not supported in all browsers
        });
    }

    return () => {
      active = false;
    };
  }, []);

  const stopMeter = () => {
    if (meterFrameRef.current !== null) {
      cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }
    if (meterCtxRef.current) {
      meterCtxRef.current.close().catch(() => {});
      meterCtxRef.current = null;
    }
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      stopMeter();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
      }
    };
  }, []);

  const startLevelMeter = (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      meterCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const update = () => {
        if (!isTalkingRef.current) return;
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i += 1) {
          const val = Math.abs(data[i] - 128) / 128;
          if (val > peak) peak = val;
        }
        setAudioLevel(Math.min(1, peak * 2.5));
        meterFrameRef.current = requestAnimationFrame(update);
      };
      meterFrameRef.current = requestAnimationFrame(update);
    } catch {
      // Non-critical visual meter
    }
  };

  const requestMicPermission = async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicStatus('unsupported');
      setMicError('This browser does not support microphone audio recording.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus('granted');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access blocked.';
      setMicStatus('denied');
      setMicError(msg);
      return false;
    }
  };

  const quickCallouts =
    mode === 'resident'
      ? [
          'Arriving at University Ave entrance — need check-in help',
          'Need medical outlet or insulin fridge access',
          'Question about shuttle pickup time',
        ]
      : [
          'Copy that — on my way now',
          'Shuttle arriving at North Loop',
          'Battery Desk check-in needed',
        ];

  const startRecording = async () => {
    if (isTalkingRef.current) return;
    setMicError(null);
    isTalkingRef.current = true;
    setIsTalking(true);
    setElapsedSec(0);
    talkStartRef.current = Date.now();
    playRadioChirp('start');

    timerRef.current = window.setInterval(() => {
      setElapsedSec(Math.max(1, Math.round((Date.now() - talkStartRef.current) / 1000)));
    }, 250);

    try {
      if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        if (!isTalkingRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setMicStatus('granted');
        streamRef.current = stream;
        audioChunksRef.current = [];

        const mimeType = pickSupportedAudioMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(100);
        startLevelMeter(stream);
      } else {
        setMicStatus('unsupported');
      }
    } catch (err) {
      setMicStatus('denied');
      setMicError(
        err instanceof Error
          ? `Mic blocked (${err.message}). Logging simulated radio packet instead.`
          : 'Microphone access denied. Logging simulated radio packet instead.'
      );
    }
  };

  const stopRecording = () => {
    if (!isTalkingRef.current) return;
    isTalkingRef.current = false;
    setIsTalking(false);
    stopMeter();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const durationSec = Math.max(1, Math.round((Date.now() - talkStartRef.current) / 1000));
    playRadioChirp('end');

    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        const url = blob.size > 0 ? URL.createObjectURL(blob) : undefined;
        stream?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

        onSendMessage({
          channel: activeChannel,
          senderRole,
          kind: 'voice',
          durationSec,
          transcript: url
            ? hotspotUp
              ? `Recorded voice memo (${durationSec}s · tap Listen to play)`
              : `Recorded VHF voice log (${durationSec}s on ${channelInfo.freq})`
            : hotspotUp
              ? `Voice radio transmission (${durationSec}s via offline hotspot)`
              : `Logged VHF handheld transmission (${durationSec}s on ${channelInfo.freq})`,
          audioUrl: url,
        });
      };
      recorder.stop();
    } else {
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      onSendMessage({
        channel: activeChannel,
        senderRole,
        kind: 'voice',
        durationSec,
        transcript: hotspotUp
          ? `Voice radio clip (${durationSec}s via RedTail-Hub-Local)`
          : `Logged VHF handheld call (${durationSec}s on ${channelInfo.freq})`,
      });
    }
  };

  const stopPlayback = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
      playbackAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setPlayingId(null);
  };

  const handlePlayMessage = (msg: WalkieMessage) => {
    if (playingId === msg.id) {
      stopPlayback();
      return;
    }
    stopPlayback();

    setPlayingId(msg.id);
    playRadioChirp('start');

    if (msg.audioUrl) {
      const audio = new Audio(msg.audioUrl);
      playbackAudioRef.current = audio;
      audio.onended = () => {
        playRadioChirp('end');
        playbackAudioRef.current = null;
        setPlayingId(null);
      };
      audio.onerror = () => {
        playbackAudioRef.current = null;
        setPlayingId(null);
      };
      audio.play().catch(() => {
        playbackAudioRef.current = null;
        setPlayingId(null);
      });
      return;
    }

    if ('speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(msg.transcript);
        utter.rate = 1.05;
        utter.onend = () => {
          playRadioChirp('end');
          setPlayingId(null);
        };
        utter.onerror = () => setPlayingId(null);
        window.speechSynthesis.speak(utter);
        return;
      } catch {
        // Fallback timeout
      }
    }

    setTimeout(() => {
      playRadioChirp('end');
      setPlayingId(null);
    }, 900);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textDraft.trim()) return;
    onSendMessage({
      channel: activeChannel,
      senderRole,
      kind: 'text',
      transcript: textDraft.trim(),
    });
    setTextDraft('');
  };

  return (
    <div className="space-y-4">
      {hotspotUp ? (
        <div className="rounded-xl bg-surface-alt border border-edge px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-ok-ink flex items-center gap-1.5">
            <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>RedTail-Hub-Local · Offline Hotspot</span>
          </span>
          <span className="font-mono text-charcoal-muted">
            No internet{!cellServiceUp ? ' · Cell off' : ''}
          </span>
        </div>
      ) : (
        <div className="rounded-xl bg-crit-bg border border-crit-border p-3 space-y-2">
          <div className="text-xs font-bold text-crit-ink flex items-center gap-1.5">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Wi-Fi Out — Switch to Handheld Radios</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono tabular-nums text-charcoal">
            {CHANNELS.map((c) => (
              <div key={c.id} className="bg-surface rounded-lg border border-edge px-2 py-1">
                <div className="font-bold">{c.short}</div>
                <div className="text-charcoal-muted">{c.freq.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Microphone Status & Tap vs Hold Recording Mode */}
      <div className="rounded-xl bg-surface-alt border border-edge px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {micStatus === 'granted' ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-ok-ink">
              <Mic className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Mic Ready (Real Audio)</span>
            </span>
          ) : micStatus === 'denied' ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-crit-ink">
              <MicOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Mic Blocked — Allow in Browser</span>
            </span>
          ) : micStatus === 'unsupported' ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal-muted">
              <MicOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Browser Mic Unavailable</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void requestMicPermission()}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-crimson text-white font-bold hover:bg-crimson-dark inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Enable Mic to Record Voice</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-edge">
          <button
            type="button"
            onClick={() => setTalkMode('tap')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
              talkMode === 'tap'
                ? 'bg-crimson text-white'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Tap to Record
          </button>
          <button
            type="button"
            onClick={() => setTalkMode('hold')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
              talkMode === 'hold'
                ? 'bg-crimson text-white'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Hold to Talk
          </button>
        </div>
      </div>

      {micError && (
        <p className="text-xs text-crit-ink bg-crit-bg border border-crit-border rounded-xl px-3 py-2">
          {micError}
        </p>
      )}

      {mode !== 'resident' ? (
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-alt border border-edge rounded-xl">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setActiveChannel(ch.id)}
              className={`min-h-[42px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeChannel === ch.id
                  ? 'bg-gold-band text-gold-band-ink shadow-xs border border-edge-strong'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              {ch.short}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs font-semibold text-charcoal-muted flex items-center justify-between">
          <span>Connected Channel: {channelInfo.label}</span>
          <span className="font-mono">{channelInfo.freq}</span>
        </div>
      )}

      {/* Voice Recorder Button (Supports both Tap-to-Record and Hold-to-Talk) */}
      <button
        type="button"
        onClick={() => {
          if (talkMode !== 'tap') return;
          if (isTalkingRef.current) stopRecording();
          else void startRecording();
        }}
        onPointerDown={() => {
          if (talkMode === 'hold') void startRecording();
        }}
        onPointerUp={() => {
          if (talkMode === 'hold') stopRecording();
        }}
        onPointerLeave={() => {
          if (talkMode === 'hold' && isTalkingRef.current) stopRecording();
        }}
        onPointerCancel={() => {
          if (talkMode === 'hold' && isTalkingRef.current) stopRecording();
        }}
        onKeyDown={(e) => {
          if (talkMode === 'hold' && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            if (!isTalkingRef.current) void startRecording();
          }
        }}
        onKeyUp={(e) => {
          if (talkMode === 'hold' && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            stopRecording();
          }
        }}
        className={`w-full min-h-[72px] px-4 rounded-2xl font-bold text-base flex items-center justify-between gap-3 select-none transition-all cursor-pointer border ${
          isTalking
            ? 'bg-gold text-gold-band-ink border-crimson scale-[0.99] ring-4 ring-gold/40'
            : 'bg-crimson hover:bg-crimson-dark text-white border-gold/40 active:scale-[0.99]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isTalking ? (
            <Square className="w-5 h-5 shrink-0 fill-current" aria-hidden="true" />
          ) : talkMode === 'tap' ? (
            <Mic className="w-6 h-6 shrink-0" aria-hidden="true" />
          ) : (
            <Radio className="w-6 h-6 shrink-0" aria-hidden="true" />
          )}
          <span className="tabular-nums text-left truncate">
            {isTalking
              ? talkMode === 'tap'
                ? `Recording ${channelInfo.short} (${elapsedSec}s) — Tap to Send`
                : `Transmitting ${channelInfo.short} (${elapsedSec}s) — Release`
              : talkMode === 'tap'
                ? `Tap to Record Voice · ${channelInfo.short}`
                : hotspotUp
                  ? `Hold to Talk · ${channelInfo.short}`
                  : `Hold to Log Radio Call · ${channelInfo.short}`}
          </span>
        </div>

        {/* Live 6-bar voice level indicator while recording */}
        {isTalking && (
          <div className="flex items-end gap-1 h-6 shrink-0" aria-hidden="true">
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((threshold, idx) => (
              <span
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  audioLevel >= threshold ? 'bg-crimson' : 'bg-black/20'
                }`}
                style={{ height: `${8 + idx * 3}px` }}
              />
            ))}
          </div>
        )}
      </button>

      <div className="flex flex-wrap gap-2">
        {quickCallouts.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => {
              playRadioChirp('end');
              onSendMessage({
                channel: activeChannel,
                senderRole,
                kind: 'text',
                transcript: phrase,
              });
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-edge bg-surface-alt hover:bg-surface-hover text-xs font-semibold text-charcoal text-left cursor-pointer"
          >
            {phrase}
          </button>
        ))}
      </div>

      <form onSubmit={handleSendText} className="flex items-center gap-2">
        <input
          type="text"
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          placeholder={`Send short message on ${channelInfo.short}...`}
          className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-edge bg-input-bg text-sm text-charcoal"
        />
        <button
          type="submit"
          aria-label="Send radio message"
          className="min-h-[44px] min-w-[48px] px-4 rounded-xl bg-crimson text-white text-sm font-bold hover:bg-crimson-dark flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>

      <div className="divide-y divide-edge border-t border-edge pt-1">
        {visibleMessages.length === 0 ? (
          <p className="py-3 text-xs sm:text-sm text-charcoal-muted">
            No transmissions on {channelInfo.short} yet.
          </p>
        ) : (
          visibleMessages.slice(0, 6).map((msg) => (
            <div key={msg.id} className="py-3 last:pb-0 flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-crimson-ink">{msg.senderLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-charcoal-muted">{msg.timeLabel}</span>
                  {msg.kind === 'voice' && msg.durationSec && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-charcoal-muted">
                        {msg.durationSec}s {msg.audioUrl ? 'mic audio' : 'voice'}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-charcoal">{msg.transcript}</p>
              </div>

              <button
                type="button"
                onClick={() => handlePlayMessage(msg)}
                aria-label={
                  playingId === msg.id
                    ? `Stop transmission from ${msg.senderLabel}`
                    : `Play transmission from ${msg.senderLabel}`
                }
                className={`min-h-[40px] min-w-[40px] px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer ${
                  playingId === msg.id
                    ? 'bg-gold text-gold-band-ink border-edge-strong'
                    : 'bg-surface-alt border-edge text-charcoal hover:bg-surface-hover'
                }`}
              >
                {playingId === msg.id ? (
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {playingId === msg.id ? 'Stop' : msg.audioUrl ? 'Play Audio' : 'Listen'}
                </span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
