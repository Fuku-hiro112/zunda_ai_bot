# zundabot

🚀 **プロジェクト紹介ページ（構成図・詳細解説）**  
https://fuku-hiro112.github.io/zundabot/

Discordのボイスチャンネルで、指定したユーザーの発言をリアルタイムに**ずんだもんの声**で読み上げるBotなのだ。

- **音声認識**: [Whisper](https://github.com/openai/whisper) (faster-whisper / openai-whisper)
- **AI返答**: [Claude](https://www.anthropic.com/) (claude-sonnet-4-6)
- **音声合成**: [VOICEVOX](https://voicevox.hiroshiba.jp/)

## 仕組み

```
VC内の誰かが発話
    ↓
Whisperで文字起こし (Python常駐プロセス)
    ↓
Claudeが会話の文脈を読んで返答を生成
(返答しないと判断した場合はスキップ)
    ↓
VOICEVOXでずんだもん音声を合成
    ↓
ボイスチャンネルで再生
```

## 必要なもの

| 種別 | 要件 |
|------|------|
| Node.js | v18以上 |
| Python | 3.8以上 |
| VOICEVOX | ローカルで起動済み (`http://localhost:50021`) |
| Whisperライブラリ | `faster-whisper` または `openai-whisper` のどちらか |
| Anthropic APIキー | [console.anthropic.com](https://console.anthropic.com) で取得 |

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/Fuku-hiro112/zundabot.git
cd zundabot
```

### 2. Node.js 依存パッケージをインストール

```bash
npm install
```

### 3. Python 仮想環境を作成してWhisperをインストール

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# faster-whisper (推奨・高速)
pip install faster-whisper

# または openai-whisper
pip install openai-whisper
```

### 4. 環境変数を設定

`.env.example` をコピーして `.env` を作成し、各値を設定する。

```bash
cp .env.example .env
```

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `DISCORD_TOKEN` | Discord Botのトークン | (必須) |
| `CLIENT_ID` | BotのアプリケーションID | (必須) |
| `GUILD_ID` | テスト用サーバーID (省略するとグローバル登録) | (任意) |
| `ANTHROPIC_API_KEY` | Anthropic APIキー | (必須) |
| `VOICEVOX_URL` | VOICEVOXエンジンのURL | `http://localhost:50021` |
| `DEFAULT_STYLE_ID` | デフォルトのずんだもんスタイルID | `3` (ノーマル) |
| `WHISPER_MODEL` | Whisperモデルサイズ | `base` |
| `PYTHON_PATH` | Pythonの実行パス | `python` |
| `TEMP_DIR` | 音声一時ファイルの保存先 | `./tmp` |
| `SILENCE_DURATION` | 無音検知タイムアウト (ms) | `800` |
| `WHISPER_LANGUAGE` | 音声認識の言語コード | `ja` |
| `MAX_HISTORY_ENTRIES` | 会話履歴の最大保持件数 | `40` |

> **PYTHON_PATH について**: venv を使用する場合は絶対パスを指定する。
> 例: `PYTHON_PATH=C:/dev/ClaudeProject/zundabot/.venv/Scripts/python.exe`

### 5. スラッシュコマンドを登録

```bash
npm run deploy
```

### 6. Botを起動

```bash
npm start
```

## 使い方

1. **VOICEVOX エンジン**を起動しておく
2. Discord サーバーで、ボイスチャンネルに入る
3. テキストチャンネルでコマンドを実行する

### コマンド一覧

| コマンド | 説明 |
|----------|------|
| `/join` | BotがVCに参加し、全員の声を聞き始める |
| `/leave` | BotがVCから退出する |
| `/style [id]` | ずんだもんのスタイルを変更する (引数なしで一覧表示) |
| `/end` | 再生キューをクリアして読み上げを止める |

### ずんだもんのスタイル一覧

| ID | スタイル名 |
|----|-----------|
| 1 | あまあま |
| 3 | ノーマル (デフォルト) |
| 5 | セクシー |
| 7 | ツンツン |
| 22 | ささやき |
| 38 | ヒミツ |

## Whisperモデルのサイズ目安

| モデル | 精度 | 速度 | VRAM |
|--------|------|------|------|
| `tiny` | 低め | 最速 | ~1GB |
| `base` | 普通 | 速い | ~1GB |
| `small` | 良い | 普通 | ~2GB |
| `medium` | 高い | 遅め | ~5GB |
| `large` | 最高 | 遅い | ~10GB |

日本語会話には `base` または `small` がバランスよく使えるのだ。

## ライセンス

MIT
