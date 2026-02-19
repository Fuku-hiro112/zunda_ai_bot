'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { getGuildState } = require('../state');
const { startUserSubscription } = require('../voice/receiver');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('target')
    .setDescription('ずんだ変換する対象ユーザーを管理するのだ')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('変換対象ユーザーを追加するのだ')
        .addUserOption(opt =>
          opt.setName('user').setDescription('追加するユーザー').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('変換対象ユーザーを除外するのだ')
        .addUserOption(opt =>
          opt.setName('user').setDescription('除外するユーザー').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('現在の変換対象一覧を表示するのだ')
    ),

  async execute(interaction) {
    const state = getGuildState(interaction.guildId);
    if (!state) {
      return interaction.reply({
        content: 'まず `/join` でボイスチャンネルに参加するのだ！',
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      if (state.targetUsers.has(user.id)) {
        return interaction.reply({
          content: `${user.displayName} はすでに対象に追加されているのだ。`,
          ephemeral: true,
        });
      }
      state.targetUsers.add(user.id);
      startUserSubscription(interaction.guildId, user.id);
      await interaction.reply({
        content: `${user.displayName} をずんだ変換対象に追加したのだ！`,
        ephemeral: true,
      });
    } else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      if (!state.targetUsers.has(user.id)) {
        return interaction.reply({
          content: `${user.displayName} は対象に含まれていないのだ。`,
          ephemeral: true,
        });
      }
      state.targetUsers.delete(user.id);
      await interaction.reply({
        content: `${user.displayName} をずんだ変換対象から除外したのだ。`,
        ephemeral: true,
      });
    } else if (sub === 'list') {
      if (state.targetUsers.size === 0) {
        return interaction.reply({
          content: '現在、変換対象ユーザーはいないのだ。',
          ephemeral: true,
        });
      }
      const mentions = [...state.targetUsers].map(id => `<@${id}>`).join(', ');
      await interaction.reply({
        content: `現在の変換対象: ${mentions}`,
        ephemeral: true,
      });
    }
  },
};
