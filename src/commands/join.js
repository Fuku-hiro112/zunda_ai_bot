'use strict';

const { SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const { initGuildState, getGuildState, deleteGuildState } = require('../state');
const { startUserSubscription } = require('../voice/receiver');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('ボイスチャンネルに参加するのだ'),

  async execute(interaction) {
    const member = interaction.member;
    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: 'まずボイスチャンネルに入るのだ！',
        ephemeral: true,
      });
    }

    // 既に参加中なら退出させてから再参加
    const existing = getGuildState(interaction.guildId);
    if (existing) {
      existing.connection.destroy();
      deleteGuildState(interaction.guildId);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,   // 音声受信に必須
        selfMute: false,
      });

      // 接続確立を待機 (5秒タイムアウト)
      await entersState(connection, VoiceConnectionStatus.Ready, 5000);

      const player = createAudioPlayer();
      const state = initGuildState(interaction.guildId, connection, player);
      connection.subscribe(player);

      // Disconnected 時に再接続を試みる
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
          ]);
        } catch {
          console.log(`[INFO] ${interaction.guildId} VCから切断されたのだ`);
          connection.destroy();
          deleteGuildState(interaction.guildId);
        }
      });

      // 既存のターゲットユーザーのサブスクリプションを開始
      for (const userId of state.targetUsers) {
        startUserSubscription(interaction.guildId, userId);
      }

      await interaction.editReply(
        `${voiceChannel.name} に参加したのだ！\n\`/target add @user\` でずんだ変換する対象を追加するのだ。`
      );
    } catch (err) {
      console.error('[ERROR] VC参加失敗:', err);
      await interaction.editReply('ボイスチャンネルへの参加に失敗したのだ…');
    }
  },
};
