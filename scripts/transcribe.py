#!/usr/bin/env python3
"""
faster-whisper (または openai-whisper フォールバック) の常駐モード。

起動時にモデルをロードし、stdin から WAV パスを1行ずつ受け取って
文字起こし結果を stdout に出力する。

Protocol:
  stdin  <- "<wav_path>\n"
  stdout -> "<text>\n__END__\n"
  stdout -> "\n__END__\n"  (テキストなし / スキップ時)
"""

import sys
import argparse

# Windows で stdout/stderr を UTF-8 に強制
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')


def load_model_faster_whisper(model_name: str):
    from faster_whisper import WhisperModel
    return WhisperModel(model_name, device="cpu", compute_type="int8")


def load_model_openai_whisper(model_name: str):
    import whisper
    return whisper.load_model(model_name)


def transcribe_faster_whisper(model, wav_path: str, language: str) -> str:
    segments, _ = model.transcribe(wav_path, language=language, vad_filter=True)
    return "".join(seg.text for seg in segments).strip()


def transcribe_openai_whisper(model, wav_path: str, language: str) -> str:
    result = model.transcribe(wav_path, language=language, fp16=False)
    return result["text"].strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Whisper transcription daemon")
    parser.add_argument("--model", default="base", help="Whisperモデル名")
    parser.add_argument("--language", default="ja", help="認識言語コード")
    args = parser.parse_args()

    # モデルを一度だけロード
    use_faster = True
    try:
        model = load_model_faster_whisper(args.model)
        transcribe_fn = transcribe_faster_whisper
        print(f"[whisper] faster-whisper ({args.model}) loaded", file=sys.stderr, flush=True)
    except ImportError:
        try:
            model = load_model_openai_whisper(args.model)
            transcribe_fn = transcribe_openai_whisper
            use_faster = False
            print(f"[whisper] openai-whisper ({args.model}) loaded", file=sys.stderr, flush=True)
        except ImportError:
            print("ERROR: faster-whisper も openai-whisper もインストールされていないのだ。", file=sys.stderr)
            sys.exit(1)

    # stdin からWAVパスを受け取り続けるループ
    for line in sys.stdin:
        wav_path = line.strip()
        if not wav_path:
            continue
        try:
            text = transcribe_fn(model, wav_path, args.language)
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr, flush=True)
            text = ""

        # 結果を stdout に書き出す (センチネルで終端)
        sys.stdout.write(text + "\n__END__\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
