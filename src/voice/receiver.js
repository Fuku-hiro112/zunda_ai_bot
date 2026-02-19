'use strict';

const fs = require('fs');
const path = require('path');
const { EndBehaviorType } = require('@discordjs/voice');
const prism = require('prism-media');
const wav = require('wav');
const { v4: uuidv4 } = require('uuid');
const { getGuildState } = require('../state');
const { transcribe } = require('./whisper');
const { synthesizeAndPlay } = require('./voicevox');

const TEMP_DIR = path.resolve(process.env.TEMP_DIR || './tmp');
const SILENCE_DURATION = parseInt(process.env.SILENCE_DURATION || '800', 10);
// WAVヘッダ(44bytes) + 最低限の音声データ相当のしきい値
// 48kHz / 2ch / s16le / 0.1秒 = 48000*2*2*0.1 = 19200 bytes + 44 = 19244 bytes
const MIN_WAV_SIZE = 19244;
const MAX_QUEUE_SIZE = 5;

/** guildId -> Set<userId> 現在録音中のユーザーを追跡 */
const activeRecordings = new Map();

/**
 * 指定ユーザーの音声サブスクリプションを開始する
 * @param {string} guildId
 * @param {string} userId
 */
function startUserSubscription(guildId, userId) {
  const state = getGuildState(guildId);
  if (!state) return;

  // 既に録音中なら重複起動しない
  if (!activeRecordings.has(guildId)) {
    activeRecordings.set(guildId, new Set());
  }
  const recording = activeRecordings.get(guildId);
  if (recording.has(userId)) return;
  recording.add(userId);

  const receiver = state.connection.receiver;

  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: SILENCE_DURATION,
    },
  });

  const decoder = new prism.opus.Decoder({
    frameSize: 960,
    channels: 2,
    rate: 48000,
  });

  const wavPath = path.join(TEMP_DIR, `zunda_${userId}_${uuidv4()}.wav`);
  const wavWriter = new wav.FileWriter(wavPath, {
    channels: 2,
    sampleRate: 48000,
    bitDepth: 16,
  });

  opusStream.pipe(decoder).pipe(wavWriter);

  wavWriter.on('error', (err) => {
    console.error(`[ERROR] WAV書き込みエラー (${userId}):`, err.message);
    recording.delete(userId);
    safeUnlink(wavPath);
  });

  wavWriter.on('finish', async () => {
    // 録音中フラグを解除
    recording.delete(userId);

    try {
      const stats = fs.statSync(wavPath);
      if (stats.size < MIN_WAV_SIZE) {
        // ノイズ・短すぎる発話はスキップ
        fs.unlinkSync(wavPath);
      } else {
        await handleTranscription(guildId, wavPath);
      }
    } catch (err) {
      console.error(`[ERROR] WAV処理エラー (${userId}):`, err.message);
      safeUnlink(wavPath);
    }

    // ターゲットユーザーがまだ対象なら再サブスクライブ
    const currentState = getGuildState(guildId);
    if (currentState && currentState.targetUsers.has(userId)) {
      setImmediate(() => startUserSubscription(guildId, userId));
    }
  });

  opusStream.on('error', (err) => {
    console.error(`[ERROR] OpusStream エラー (${userId}):`, err.message);
    recording.delete(userId);
    safeUnlink(wavPath);
  });

  decoder.on('error', (err) => {
    console.error(`[ERROR] Decoder エラー (${userId}):`, err.message);
  });
}

/**
 * 文字起こし → キュー追加 → キュー処理
 * @param {string} guildId
 * @param {string} wavPath
 */
async function handleTranscription(guildId, wavPath) {
  let text = '';
  try {
    text = await transcribe(wavPath);
  } finally {
    safeUnlink(wavPath);
  }

  if (!text || text.trim().length === 0) return;

  const state = getGuildState(guildId);
  if (!state) return;

  // キューが満杯なら先頭を破棄
  if (state.queue.length >= MAX_QUEUE_SIZE) {
    state.queue.shift();
    console.warn('[WARN] キューが満杯のため先頭を破棄したのだ');
  }
  state.queue.push(text.trim());

  processQueue(guildId);
}

/**
 * キューを順番に処理する
 * @param {string} guildId
 */
async function processQueue(guildId) {
  const state = getGuildState(guildId);
  if (!state || state.isProcessingQueue || state.queue.length === 0) return;

  state.isProcessingQueue = true;

  while (state.queue.length > 0) {
    const text = state.queue.shift();
    try {
      await synthesizeAndPlay(guildId, text);
    } catch (err) {
      console.error('[ERROR] 音声合成・再生エラー:', err.message);
    }
  }

  state.isProcessingQueue = false;
}

/**
 * ギルドの一時ファイルをクリーンアップする
 * @param {string} guildId
 */
async function cleanupTempFiles(guildId) {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      if (file.startsWith('zunda_')) {
        safeUnlink(path.join(TEMP_DIR, file));
      }
    }
  } catch {
    // TEMP_DIR が存在しない場合は無視
  }
  activeRecordings.delete(guildId);
}

/**
 * ファイルを安全に削除する (存在しなくてもエラーにしない)
 * @param {string} filePath
 */
function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // 無視
  }
}

module.exports = { startUserSubscription, cleanupTempFiles };
