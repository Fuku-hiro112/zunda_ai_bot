# zundabot

Discordのボイスチャンネルで、指定したユーザーの発言をリアルタイムに**ずんだもんの声**で読み上げるBotなのだ。

- **音声認識**: [Whisper](https://github.com/openai/whisper) (faster-whisper / openai-whisper)
- **音声合成**: [VOICEVOX](https://voicevox.hiroshiba.jp/)

## 仕組み

```
ユーザーが発話
    ↓
Whisperで文字起こし (Python常駐プロセス)
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
| `VOICEVOX_URL` | VOICEVOXエンジンのURL | `http://localhost:50021` |
| `DEFAULT_STYLE_ID` | デフォルトのずんだもんスタイルID | `3` (ノーマル) |
| `WHISPER_MODEL` | Whisperモデルサイズ | `base` |
| `PYTHON_PATH` | Pythonの実行パス | `python` |
| `TEMP_DIR` | 音声一時ファイルの保存先 | `./tmp` |
| `SILENCE_DURATION` | 無音検知タイムアウト (ms) | `800` |
| `WHISPER_LANGUAGE` | 音声認識の言語コード | `ja` |

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
| `/join` | Botが自分のいるボイスチャンネルに参加する |
| `/leave` | Botがボイスチャンネルから退出する |
| `/target add @user` | 変換対象ユーザーを追加する |
| `/target remove @user` | 変換対象ユーザーを除外する |
| `/target list` | 現在の変換対象ユーザーを一覧表示する |
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
