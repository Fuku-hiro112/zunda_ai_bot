'use strict';

const { spawn } = require('child_process');
const path = require('path');

const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';
const WHISPER_LANGUAGE = process.env.WHISPER_LANGUAGE || 'ja';
const TRANSCRIBE_SCRIPT = path.resolve(__dirname, '../../scripts/transcribe.py');
const SENTINEL = '__END__';

let proc = null;
let buffer = '';
let pendingResolve = null;
let pendingReject = null;

/**
 * 常駐Pythonプロセスを起動してモデルをロードする
 */
function startProcess() {
  console.log('[Whisper] プロセスを起動中なのだ...');

  proc = spawn(PYTHON_PATH, [
    TRANSCRIBE_SCRIPT,
    '--model', WHISPER_MODEL,
    '--language', WHISPER_LANGUAGE,
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });

  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  proc.stdout.on('data', (chunk) => {
    buffer += chunk;
    const sentinelIdx = buffer.indexOf(SENTINEL);
    if (sentinelIdx === -1) return;

    // センチネルより前のテキストを取り出す
    const text = buffer.slice(0, sentinelIdx).trim();
    buffer = buffer.slice(sentinelIdx + SENTINEL.length);

    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      pendingReject = null;
      resolve(text);
    }
  });

  proc.stderr.on('data', (chunk) => {
    // モデルロード完了メッセージなどを表示
    const line = chunk.trim();
    if (line) console.log(`[Whisper] ${line}`);
  });

  proc.on('close', (code) => {
    console.warn(`[Whisper] プロセスが終了したのだ (code=${code})。再起動するのだ。`);
    proc = null;
    buffer = '';
    if (pendingReject) {
      const reject = pendingReject;
      pendingResolve = null;
      pendingReject = null;
      reject(new Error(`Whisper process exited with code ${code}`));
    }
  });

  proc.on('error', (err) => {
    console.error('[ERROR] Whisper プロセス起動失敗:', err.message);
    proc = null;
    if (pendingReject) {
      const reject = pendingReject;
      pendingResolve = null;
      pendingReject = null;
      reject(err);
    }
  });
}

/**
 * WAVファイルをWhisperで文字起こしする (常駐プロセス経由)
 * @param {string} wavPath
 * @returns {Promise<string>}
 */
function transcribe(wavPath) {
  return new Promise((resolve, reject) => {
    if (!proc) startProcess();

    pendingResolve = (text) => {
      if (text) console.log(`[STT] "${text}"`);
      resolve(text);
    };
    pendingReject = reject;

    proc.stdin.write(wavPath + '\n');
  });
}

module.exports = { transcribe };
