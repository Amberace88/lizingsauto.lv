'use client';

import { useState } from 'react';
import { Loader2, Mic, Play } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Card } from '@/components/admin/CarEditor';
import { useToast } from '@/components/admin/Toast';
import { VOICE_PATH, VOICE_PHRASES, speak, unlockVoice } from '@/lib/voice';

// Bezmaksas neironu balss latviski (Piper, “aivars”, MIT licence) — ģenerējam tieši pārlūkā un saglabājam krātuvē.
const MODEL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/lv/lv_LV/aivars/medium/lv_LV-aivars-medium.onnx';
const ORT = 'https://esm.sh/onnxruntime-web@1.18.0/wasm';
const ORT_WASM = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/';
const PHONEMIZE = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-o91UDS6e.js';
const PHONEMIZE_WASM = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
const LAME = 'https://esm.sh/@breezystack/lamejs@1.2.7';

type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (t: string, d: unknown, dims: number[]) => unknown;
  InferenceSession: { create: (b: ArrayBuffer, o: object) => Promise<{ run: (f: object) => Promise<{ output: { data: Float32Array } }> }> };
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = (u: string): Promise<any> => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ u);

export function VoiceStudio() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function generate() {
    setBusy(true);
    try {
      setMsg('Ielādēju balss modeli (~60 MB, tikai pirmo reizi)…');
      const om = await load(ORT);
      const ort: Ort = om.default || om;
      ort.env.wasm.wasmPaths = ORT_WASM;
      ort.env.wasm.numThreads = 1;
      const cfg = await (await fetch(`${MODEL}.json`)).json();
      const session = await ort.InferenceSession.create(await (await fetch(MODEL)).arrayBuffer(), { executionProviders: ['wasm'] });
      const { createPiperPhonemize } = await load(PHONEMIZE);
      const lame = await load(LAME);

      const phon = (text: string) =>
        new Promise<number[]>(async (res, rej) => {
          let done = false;
          const fin = (d: string) => {
            if (done) return;
            try {
              const j = JSON.parse(d);
              done = true;
              res(j.phoneme_ids);
            } catch {}
          };
          const m = await createPiperPhonemize({
            print: fin,
            printErr: (e: string) => {
              const i = e.indexOf('for: ');
              if (i >= 0) fin(e.slice(i + 5));
            },
            locateFile: (u: string) => (u.endsWith('.wasm') ? `${PHONEMIZE_WASM}.wasm` : u.endsWith('.data') ? `${PHONEMIZE_WASM}.data` : u),
          });
          try {
            m.callMain(['-l', cfg.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
          } catch {}
          setTimeout(() => !done && rej(new Error('fonēmas')), 8000);
        });
      const synth = async (text: string) => {
        const ids = await phon(text);
        const r = await session.run({
          input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
          input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
          scales: new ort.Tensor('float32', Float32Array.from([cfg.inference.noise_scale, cfg.inference.length_scale * 0.97, cfg.inference.noise_w]), [3]),
        });
        return r.output.data;
      };
      const sr: number = cfg.audio.sample_rate;
      const toMp3 = (pcm: Float32Array) => {
        // normalizējam skaļumu un apgriežam klusumu sākumā/beigās
        let peak = 0;
        for (const v of pcm) peak = Math.max(peak, Math.abs(v));
        const g = peak > 0 ? 0.92 / peak : 1;
        let a = 0;
        let b = pcm.length - 1;
        while (a < b && Math.abs(pcm[a] * g) < 0.01) a++;
        while (b > a && Math.abs(pcm[b] * g) < 0.01) b--;
        a = Math.max(0, a - Math.round(sr * 0.03));
        b = Math.min(pcm.length - 1, b + Math.round(sr * 0.06));
        const i16 = new Int16Array(b - a + 1);
        for (let i = a; i <= b; i++) i16[i - a] = Math.max(-1, Math.min(1, pcm[i] * g)) * 32767;
        const enc = new lame.Mp3Encoder(1, sr, 48);
        const out: Uint8Array[] = [];
        for (let i = 0; i < i16.length; i += 1152) out.push(new Uint8Array(enc.encodeBuffer(i16.subarray(i, i + 1152))));
        out.push(new Uint8Array(enc.flush()));
        return new Blob(out as BlobPart[], { type: 'audio/mpeg' });
      };

      const entries = Object.entries(VOICE_PHRASES);
      let n = 0;
      for (const [key, text] of entries) {
        setMsg(`Ģenerēju ${++n}/${entries.length}: “${text}”`);
        const parts = text.split(/(?<=[.!?])\s+/);
        const chunks: Float32Array[] = [];
        for (const p of parts) {
          if (chunks.length) chunks.push(new Float32Array(Math.round(sr * 0.18)));
          chunks.push(await synth(p));
        }
        const all = new Float32Array(chunks.reduce((s, c) => s + c.length, 0));
        let o = 0;
        for (const c of chunks) {
          all.set(c, o);
          o += c.length;
        }
        const { error } = await sb.storage.from('cars').upload(`${VOICE_PATH}${key}.mp3`, toMp3(all), { contentType: 'audio/mpeg', upsert: true, cacheControl: '31536000' });
        if (error) throw new Error(`${key}: ${error.message}`);
      }
      setMsg(`✓ Gatavs: ${entries.length} balss fragmenti saglabāti. Navigācija tos izmanto uzreiz.`);
      toast('Balss norādes saģenerētas');
    } catch (e) {
      setMsg(`✗ ${e instanceof Error ? e.message : 'Kļūda'}`);
      toast('Neizdevās saģenerēt balsi', 'err');
    }
    setBusy(false);
  }

  return (
    <Card
      title="Navigācijas balss norādes"
      hint="Latviešu neironu balss (Piper “aivars”, bezmaksas). Ģenerē vienreiz — fragmenti glabājas krātuvē un skan visos telefonos, arī iPhone."
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => {
              unlockVoice();
              speak(['d300', 'm_right']).then((ok) => !ok && setMsg('Balss vēl nav saģenerēta.'));
            }}
            className="btn btn-ghost"
          >
            <Play className="h-4 w-4" /> Noklausīties
          </button>
          <button onClick={generate} disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} Ģenerēt balsi</button>
        </div>
      }
    >
      <p className="text-sm text-ink-2">{msg || `${Object.keys(VOICE_PHRASES).length} frāzes: attālumi, pagriezieni, apļi, radari, ātrums, ierašanās.`}</p>
    </Card>
  );
}
