'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { getGuildState, deleteGuildState } = require('../state');
const { cleanupTempFiles } = require('../voice/receiver');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('ボイスチャンネルから退出するのだ'),

  async execute(interaction) {
    const state = getGuildState(interaction.guildId);

    if (!state) {
      return interaction.reply({
        content: 'ボイスチャンネルに参加していないのだ。',
        ephemeral: true,
      });
    }

    // 一時ファイルをクリーンアップ
    await cleanupTempFiles(interaction.guildId);

    state.connection.destroy();
    deleteGuildState(interaction.guildId);

    await interaction.reply({
      content: 'バイバイなのだ！',
      ephemeral: true,
    });
  },
};
