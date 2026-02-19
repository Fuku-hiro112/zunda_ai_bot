'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { getGuildState } = require('../state');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('end')
    .setDescription('読み上げキューをクリアして再生を停止するのだ'),

  async execute(interaction) {
    const state = getGuildState(interaction.guildId);

    if (!state) {
      return interaction.reply({
        content: 'ボイスチャンネルに参加していないのだ。',
        ephemeral: true,
      });
    }

    // キューをクリアしてから再生を停止
    state.queue.length = 0;

    if (state.player.state.status !== AudioPlayerStatus.Idle) {
      state.player.stop(true);
    }

    await interaction.reply({
      content: 'キューをクリアして再生を止めたのだ！',
      ephemeral: true,
    });
  },
};
