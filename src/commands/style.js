'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { getGuildState } = require('../state');

// ずんだもんのスタイル一覧
const ZUNDAMON_STYLES = {
  1: 'あまあま',
  2: 'イントネーション崩し↑',
  3: 'ノーマル',
  5: 'セクシー',
  7: 'ツンツン',
  22: 'ささやき',
  38: 'ヒミツ',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('style')
    .setDescription('ずんだもんのスタイルを変更するのだ')
    .addIntegerOption(opt =>
      opt
        .setName('id')
        .setDescription(
          'スタイルID: 1=あまあま, 3=ノーマル, 5=セクシー, 7=ツンツン, 22=ささやき, 38=ヒミツ'
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const state = getGuildState(interaction.guildId);
    if (!state) {
      return interaction.reply({
        content: 'まず `/join` でボイスチャンネルに参加するのだ！',
        ephemeral: true,
      });
    }

    const id = interaction.options.getInteger('id');

    if (id === null) {
      // 現在のスタイルと利用可能なスタイル一覧を表示
      const currentName = ZUNDAMON_STYLES[state.styleId] || `不明 (ID: ${state.styleId})`;
      const list = Object.entries(ZUNDAMON_STYLES)
        .map(([k, v]) => `  \`${k}\`: ${v}`)
        .join('\n');
      return interaction.reply({
        content: `現在のスタイル: **${currentName}** (ID: ${state.styleId})\n\n利用可能なスタイル:\n${list}`,
        ephemeral: true,
      });
    }

    state.styleId = id;
    const styleName = ZUNDAMON_STYLES[id] || `カスタム (ID: ${id})`;
    await interaction.reply({
      content: `ずんだもんのスタイルを **${styleName}** に変更したのだ！`,
      ephemeral: true,
    });
  },
};
