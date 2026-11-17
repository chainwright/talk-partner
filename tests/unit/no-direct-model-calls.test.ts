// Contest rule: "All of your app's AI inference must go through Firebase AI Logic, so don't call other model APIs
// directly." This test reads every source file in the repo and fails on any direct model call, any other model SDK,
// and any firebase/ai import outside the one engine file per client. It also keeps the shared core free of
// platform code, so the Android and iOS clients can reuse it unchanged.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const SKIP = new Set(['node_modules', 'dist', '.git', '.firebase']);
const SOURCE = /\.(?:[cm]?[jt]sx?|html|kt|kts|java|swift|dart|json)$/;
const SELF = relative(ROOT, __filename);

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (SOURCE.test(name) && name !== 'package-lock.json') out.push(p);
  }
  return out;
}

const ALL = files(ROOT).map((p) => ({ path: relative(ROOT, p).split(sep).join('/'), text: readFileSync(p, 'utf8') }));
/** The one file per client allowed to talk to Firebase AI Logic. */
const ENGINE_FILES = new Set(['web/src/ai/firebaseEngine.ts']);

/** Direct model calls and model endpoints that bypass the Firebase AI Logic SDK. */
const FORBIDDEN: [string, RegExp][] = [
  ['Chrome Prompt API called directly (create/prompt)', /\bLanguageModel\s*\??\.\s*(?:create|prompt|promptStreaming|params|clone)\b/],
  ['a model session prompted directly (any `x.prompt(` / `x.promptStreaming(`)', /(?<!window)\??\.\s*prompt(?:Streaming)?\s*\(/],
  ['old Chrome window.ai API', /\b(?:window|self|globalThis)\s*\.\s*ai\s*\.\s*(?:languageModel|assistant|summarizer|writer|rewriter)\b/],
  ['Chrome task APIs (Summarizer/Writer/Rewriter/Translator) used directly', /\b(?:Summarizer|Writer|Rewriter|Proofreader|Translator|LanguageDetector)\s*\.\s*create\b/],
  ['Gemini REST endpoint called directly', /generativelanguage\.googleapis\.com/],
  ['Vertex AI REST endpoint called directly', /aiplatform\.googleapis\.com/],
  ['Firebase AI Logic REST proxy called without the SDK', /firebasevertexai\.googleapis\.com/],
  ['Cloud Text-to-Speech called directly', /texttospeech\.googleapis\.com/],
  ['Cloud Speech-to-Text called directly', /speech\.googleapis\.com/],
  // 17 Nov 2026: voice input used the browser's speech recognition for a few hours. It is AI inference outside Firebase
  // AI Logic, so it was removed (web/src/voice.ts now records and the engine transcribes), and it may not come back.
  ['the browser\'s speech recognition (Web Speech API) used', /new\s+(?:webkit)?SpeechRecognition\b|[.\]]\s*(?:webkit)?SpeechRecognition\b|\bSpeechRecognition\s*\.\s*available\b/],
  ['another model SDK imported', /from\s+['"](?:@google\/genai|@google\/generative-ai|@google-cloud\/vertexai|@google-cloud\/text-to-speech|openai|@anthropic-ai\/[\w-]+|@mlc-ai\/[\w-]+|@huggingface\/[\w-]+|@xenova\/transformers|onnxruntime-web|@mediapipe\/tasks-genai|langchain|@langchain\/[\w-]+|ai)['"]/],
  ['another model SDK required', /require\(\s*['"](?:@google\/genai|@google\/generative-ai|openai|@anthropic-ai\/[\w-]+)['"]\s*\)/],
  ['Android ML Kit GenAI used directly (use firebase-ai-ondevice)', /com\.google\.mlkit\.genai|com\.google\.ai\.edge/],
  ['Apple Foundation Models used directly (use FirebaseAILogic HybridModel)', /^\s*import\s+FoundationModels\b/m],
];

const MODEL_PACKAGES = /^(?:@google\/genai|@google\/generative-ai|@google-cloud\/vertexai|@google-cloud\/text-to-speech|openai|@anthropic-ai\/.+|@mlc-ai\/.+|@huggingface\/.+|@xenova\/transformers|onnxruntime-web|@mediapipe\/tasks-genai|langchain|@langchain\/.+|ai)$/;

describe('all AI inference goes through Firebase AI Logic', () => {
  it('scans a non-trivial set of files (the scan itself works)', () => {
    expect(ALL.map((f) => f.path)).toEqual(expect.arrayContaining(['core/pipeline.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/main.ts']));
  });

  for (const [why, re] of FORBIDDEN) {
    it(`no ${why}`, () => {
      const hits = ALL.filter((f) => f.path !== SELF && re.test(f.text)).map((f) => f.path);
      expect(hits, `${why}: ${hits.join(', ')}`).toEqual([]);
    });
  }

  it('firebase/ai is imported only by the client engine file', () => {
    const importers = ALL.filter((f) => /from\s+['"]firebase\/ai['"]|from\s+['"]@firebase\/ai['"]/.test(f.text)).map((f) => f.path);
    expect(importers.length).toBeGreaterThan(0);
    expect(importers.filter((p) => !ENGINE_FILES.has(p))).toEqual([]);
  });

  it('the engine really imports AND calls Firebase AI Logic (not just names it)', () => {
    const engine = ALL.find((f) => f.path === 'web/src/ai/firebaseEngine.ts')!.text;
    for (const call of ['getAI(', 'getGenerativeModel(', 'generateContent(', 'initializeDeviceModel(', 'appWithAppCheck(', 'inferenceSource', 'inlineData']) {
      expect(engine).toContain(call);
    }
    // App Check is started in the one place the engine and the feedback form share
    expect(ALL.find((f) => f.path === 'web/src/ai/app.ts')!.text).toContain('initializeAppCheck(');
    expect(engine).toMatch(/InferenceMode\.ONLY_ON_DEVICE/);
    expect(engine).toMatch(/InferenceMode\.PREFER_IN_CLOUD/);
    // voice input: sound runs in the cloud only (core/models.ts, LEGS.voice)
    expect(engine).toMatch(/InferenceMode\.ONLY_IN_CLOUD/);
  });

  it('Chrome LanguageModel is touched only for the availability check, only in the engine file', () => {
    for (const f of ALL.filter((x) => x.path !== SELF)) {
      const uses = [...f.text.matchAll(/LanguageModel\b(?!Create|Prompt|Expected|Message)/g)];
      if (!uses.length) continue;
      expect(ENGINE_FILES.has(f.path), `${f.path} references LanguageModel`).toBe(true);
      const calls = [...f.text.matchAll(/\b(?:LanguageModel|lm)\s*\??\.\s*(\w+)/g)].map((m) => m[1]);
      expect(calls.filter((c) => c !== 'availability'), `${f.path} calls LanguageModel.${calls.join(', ')}`).toEqual([]);
    }
  });

  it('no other model SDK in package.json dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies });
    expect(deps.filter((d) => MODEL_PACKAGES.test(d))).toEqual([]);
    expect(deps).toContain('firebase');
  });
});

describe('the shared core is platform-free (so Android and iOS clients reuse it)', () => {
  const core = ALL.filter((f) => f.path.startsWith('core/'));
  it('core imports only other core files', () => {
    const bad = core.flatMap((f) => [...f.text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((s) => !s.startsWith('./')).map((s) => `${f.path}: ${s}`));
    expect(bad).toEqual([]);
  });
  it('core uses no DOM, storage or network', () => {
    const bad = core.filter((f) => /\b(?:document|window|indexedDB|localStorage|fetch|XMLHttpRequest|navigator)\s*[.(]/.test(f.text)).map((f) => f.path);
    expect(bad).toEqual([]);
  });
});
