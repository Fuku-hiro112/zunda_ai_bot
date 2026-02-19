'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`${commands.length}件のスラッシュコマンドを登録中なのだ...`);

    const guildId = process.env.GUILD_ID;
    let data;

    if (guildId) {
      // ギルドコマンド登録 (即時反映)
      data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(`ギルド ${guildId} に ${data.length} 件のコマンドを登録したのだ！`);
    } else {
      // グローバルコマンド登録 (最大1時間で反映)
      data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`グローバルに ${data.length} 件のコマンドを登録したのだ！`);
    }
  } catch (err) {
    console.error('[ERROR] コマンド登録失敗:', err);
    process.exit(1);
  }
})();
