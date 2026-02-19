'use strict';

/**
 * Guild単位のBot状態を管理するモジュール
 * Map<guildId, GuildBotState> で複数サーバーに対応
 */

const guildStates = new Map();

/**
 * @typedef {Object} GuildBotState
 * @property {import('@discordjs/voice').VoiceConnection} connection
 * @property {import('@discordjs/voice').AudioPlayer} player
 * @property {Set<string>} targetUsers
 * @property {string[]} queue
 * @property {boolean} isProcessingQueue
 * @property {number} styleId
 */

/**
 * ギルドの状態を初期化して返す
 * @param {string} guildId
 * @param {import('@discordjs/voice').VoiceConnection} connection
 * @param {import('@discordjs/voice').AudioPlayer} player
 * @returns {GuildBotState}
 */
function initGuildState(guildId, connection, player) {
  const state = {
    connection,
    player,
    targetUsers: new Set(),
    queue: [],
    isProcessingQueue: false,
    styleId: parseInt(process.env.DEFAULT_STYLE_ID || '3', 10),
  };
  guildStates.set(guildId, state);
  return state;
}

/**
 * ギルドの状態を取得する
 * @param {string} guildId
 * @returns {GuildBotState | undefined}
 */
function getGuildState(guildId) {
  return guildStates.get(guildId);
}

/**
 * ギルドの状態を削除する
 * @param {string} guildId
 */
function deleteGuildState(guildId) {
  guildStates.delete(guildId);
}

/**
 * 全ギルドIDを取得する
 * @returns {string[]}
 */
function getAllGuildIds() {
  return [...guildStates.keys()];
}

module.exports = { initGuildState, getGuildState, deleteGuildState, getAllGuildIds };
