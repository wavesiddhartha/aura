import os
import sys
import argparse
import subprocess
import tempfile
import dotenv
import riva.client
import imageio_ffmpeg

# Load environment variables
dotenv.load_dotenv()

def get_args():
    parser = argparse.ArgumentParser(description="Transcribe audio using NVIDIA Riva ASR via gRPC")
    parser.add_argument("--input", required=True, help="Path to the input audio file")
    parser.add_argument("--key", help="NVIDIA API key (falls back to NVIDIA_WHISPER_KEY env var)")
    return parser.parse_args()

def convert_to_wav(input_path):
    # Get bundled ffmpeg path
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Create a temporary file for the wav output
    temp_fd, temp_wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(temp_fd) # Close file descriptor so ffmpeg can write to it
    
    print(f"Transcoding {input_path} to 16kHz mono PCM WAV...", file=sys.stderr)
    try:
        # Run ffmpeg command
        cmd = [
            ffmpeg_exe,
            "-y",
            "-i", input_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            temp_wav_path
        ]
        
        # Execute silently
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return temp_wav_path
    except subprocess.CalledProcessError as e:
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)
        print(f"FFmpeg error: {e.stderr.decode('utf-8')}", file=sys.stderr)
        raise RuntimeError("Failed to transcode audio file")

def transcribe(wav_path, api_key):
    function_id = "b702f636-f60c-4a3d-a6f4-f3568c13bd7d"
    
    auth = riva.client.Auth(
        uri="grpc.nvcf.nvidia.com:443",
        use_ssl=True,
        metadata_args=[
            ["function-id", function_id],
            ["authorization", f"Bearer {api_key}"]
        ]
    )
    
    asr_service = riva.client.ASRService(auth)
    
    config = riva.client.RecognitionConfig(
        encoding=riva.client.AudioEncoding.LINEAR_PCM,
        language_code="en-US",
        max_alternatives=1,
        enable_automatic_punctuation=True,
    )
    
    riva.client.add_audio_file_specs_to_config(config, wav_path)
    
    with open(wav_path, "rb") as fh:
        content = fh.read()
        
    response = asr_service.offline_recognize(content, config)
    
    transcripts = []
    for result in response.results:
        if result.alternatives:
            transcripts.append(result.alternatives[0].transcript)
            
    return " ".join(transcripts)

def main():
    args = get_args()
    
    api_key = args.key or os.getenv("NVIDIA_WHISPER_KEY")
    if not api_key:
        print("Error: NVIDIA API key not found. Set NVIDIA_WHISPER_KEY in .env or pass --key.", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(args.input):
        print(f"Error: Input file {args.input} does not exist.", file=sys.stderr)
        sys.exit(1)
        
    temp_wav = None
    try:
        temp_wav = convert_to_wav(args.input)
        transcript = transcribe(temp_wav, api_key)
        print(transcript)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        if temp_wav and os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass

if __name__ == "__main__":
    main()
