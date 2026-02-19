'use strict';

const { Readable } = require('stream');
const {
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} = require('@discordjs/voice');
const fetch = require('node-fetch');
const { getGuildState } = require('../state');

const VOICEVOX_URL = (process.env.VOICEVOX_URL || 'http://localhost:50021').replace(/\/$/, '');
const MAX_TEXT_LENGTH = 150;

/**
 * 起動時にVOICEVOXのヘルスチェックを行う
 */
async function checkVoicevox() {
  try {
    const res = await fetch(`${VOICEVOX_URL}/version`, { timeout: 3000 });
    if (res.ok) {
      const version = await res.text();
      console.log(`[INFO] VOICEVOX v${version.trim().replace(/"/g, '')} に接続したのだ`);
    } else {
      console.warn('[WARNING] VOICEVOXが応答しないのだ (status:', res.status, ')');
    }
  } catch {
    console.warn('[WARNING] VOICEVOXが応答しないのだ。localhost:50021 を確認するのだ。');
  }
}

/**
 * テキストをVOICEVOXで合成してDiscord VCで再生する
 * @param {string} guildId
 * @param {string} text
 * @returns {Promise<void>} 再生が完了するまで待機する
 */
async function synthesizeAndPlay(guildId, text) {
  const state = getGuildState(guildId);
  if (!state) return;

  // テキストのトランケート
  const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const speakerId = state.styleId;

  console.log(`[TTS] スタイル${speakerId}: "${truncated}"`);

  // Step 1: AudioQuery の取得
  const queryRes = await fetch(
    `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(truncated)}&speaker=${speakerId}`,
    { method: 'POST', timeout: 10000 }
  );

  if (!queryRes.ok) {
    throw new Error(`audio_query 失敗: ${queryRes.status} ${queryRes.statusText}`);
  }

  const audioQuery = await queryRes.json();

  // Step 2: 音声合成
  const synthRes = await fetch(
    `${VOICEVOX_URL}/synthesis?speaker=${speakerId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audioQuery),
      timeout: 15000,
    }
  );

  if (!synthRes.ok) {
    throw new Error(`synthesis 失敗: ${synthRes.status} ${synthRes.statusText}`);
  }

  const wavBuffer = await synthRes.buffer();

  // Step 3: Discord VCで再生
  await playBuffer(state, wavBuffer);
}

/**
 * WAVバッファをAudioPlayerで再生し、Idle になるまで待機する
 * @param {import('../state').GuildBotState} state
 * @param {Buffer} wavBuffer
 * @returns {Promise<void>}
 */
function playBuffer(state, wavBuffer) {
  return new Promise((resolve, reject) => {
    const readable = Readable.from(wavBuffer);
    const resource = createAudioResource(readable, {
      inputType: StreamType.Arbitrary,
    });

    const onIdle = () => {
      state.player.removeListener('error', onError);
      resolve();
    };

    const onError = (err) => {
      state.player.removeListener(AudioPlayerStatus.Idle, onIdle);
      reject(err);
    };

    state.player.once(AudioPlayerStatus.Idle, onIdle);
    state.player.once('error', onError);

    state.player.play(resource);
  });
}

module.exports = { checkVoicevox, synthesizeAndPlay };
