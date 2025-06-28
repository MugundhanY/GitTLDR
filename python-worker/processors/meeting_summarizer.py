# meeting_summarizer.py
"""
Production-grade, modular meeting summarization and Q&A processor for GitTLDR Python Worker.
Handles audio processing, transcription, topic segmentation, LLM summarization, and Q&A.
Integrates with async worker and Redis job queue.
"""
import os
import math
import subprocess
import tempfile
import shutil
import traceback
import re
from typing import Optional, Dict, Any, List

from config.settings import get_settings
from utils.logger import get_logger
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client

from pydub import AudioSegment
from faster_whisper import WhisperModel
from sentence_transformers import SentenceTransformer
import numpy as np
import google.generativeai as genai
from sklearn.feature_extraction.text import TfidfVectorizer

logger = get_logger(__name__)
settings = get_settings()

gemini_call_count = 0  # Track Gemini API calls

# Use a single, configurable collection for all meeting segments
MEETING_QDRANT_COLLECTION = getattr(settings, "meeting_qdrant_collection", "meeting_segments")

# --- Audio Processing ---
def normalize_audio(input_path: str, output_path: str, target_sr: int = 16000, target_channels: int = 1, target_sample_width: int = 2) -> None:
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(target_channels)
    audio = audio.set_frame_rate(target_sr)
    audio = audio.set_sample_width(target_sample_width)
    audio.export(output_path, format="wav")
    logger.info(f"Normalized audio saved to {output_path}")

def denoise_audio_sox(input_path: str, output_path: str, noise_duration_s: int = 1) -> None:
    profile = "noise.prof"
    subprocess.run([
        "sox", input_path, "-n",
        "trim", "0", str(noise_duration_s),
        "noiseprof", profile
    ], check=True)
    subprocess.run([
        "sox", input_path, output_path,
        "noisered", profile, "0.21"
    ], check=True)
    os.remove(profile)
    logger.info(f"Denoised audio saved to {output_path}")

def split_audio(input_path: str, output_dir: str, max_duration_min: int = 10) -> List[str]:
    audio = AudioSegment.from_file(input_path)
    duration_ms = len(audio)
    chunk_ms = max_duration_min * 60 * 1000
    num_chunks = math.ceil(duration_ms / chunk_ms)
    basename = os.path.splitext(os.path.basename(input_path))[0]
    os.makedirs(output_dir, exist_ok=True)
    chunk_files = []
    for i in range(num_chunks):
        start = i * chunk_ms
        end = min((i + 1) * chunk_ms, duration_ms)
        chunk = audio[start:end]
        out_path = os.path.join(output_dir, f"{basename}_chunk{i+1}.wav")
        chunk.export(out_path, format="wav")
        logger.info(f"Exported chunk {i+1}/{num_chunks}: {out_path}")
        chunk_files.append(out_path)
    return chunk_files

def transcribe_with_whisper(audio_path, model_size="base.en", device="cpu"):
    model = WhisperModel(model_size, device=device)
    segments, info = model.transcribe(audio_path, beam_size=5, word_timestamps=True)
    results = [
        {
            "word": word.word,
            "start": word.start,
            "end": word.end,
            "confidence": word.probability
        }
        for segment in segments for word in segment.words
    ]
    return results, info

def segment_topics(words, window_size=100, stride=50, threshold=0.75, model_name="all-MiniLM-L6-v2"):
    model = SentenceTransformer(model_name)
    tokens = [w['word'] for w in words]
    boundaries = [0]
    for i in range(0, len(tokens) - window_size, stride):
        window1 = " ".join(tokens[i:i+window_size])
        window2 = " ".join(tokens[i+stride:i+stride+window_size])
        emb1 = model.encode(window1)
        emb2 = model.encode(window2)
        sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        if sim < threshold:
            boundaries.append(i + stride)
    return boundaries

def generate_title_gemini(text, api_key, model="gemini-2.0-flash-lite"):
    genai.configure(api_key=api_key)
    prompt = (
        "Give me a single, concise 3–6 word title (not a list, not options, just one title) "
        "that best captures the following text. Do NOT use any Markdown, formatting, or special characters—just plain text:\n"
        f"{text}"
    )
    gen_model = genai.GenerativeModel(model)
    response = gen_model.generate_content(prompt)
    return response.text.strip().split('\n')[0]

def batch_generate_titles_gemini(segment_texts, api_key, model="gemini-2.0-flash-lite"):
    genai.configure(api_key=api_key)
    prompt = (
        "For each numbered transcript below, give a single, concise 3–6 word plain text title (no Markdown, no formatting, no special characters, just plain text). "
        "Return the titles as a numbered list, one per line, matching the order of the transcripts.\n\n"
    )
    prompt += "".join(f"{idx}. {text}\n" for idx, text in enumerate(segment_texts, 1))
    gen_model = genai.GenerativeModel(model)
    response = gen_model.generate_content(prompt)
    lines = response.text.strip().split('\n')
    titles = [re.sub(r"^\d+\.\s*", "", line).strip() for line in lines if line.strip()]
    if len(titles) != len(segment_texts):
        raise ValueError("Mismatch between number of segments and returned titles.")
    return titles

def _summarize_batch(batch_texts, api_key, model):
    global gemini_call_count
    gemini_call_count += 1
    genai.configure(api_key=api_key)
    prompt = (
        "For each numbered transcript below, write a concise, content-rich summary (2–3 sentences) of the transcript. "
        "Do not refer to the segment itself. Return the summaries as a numbered list, one per line, matching the order of the transcripts.\n\n"
    )
    prompt += "".join(f"{idx}. {text}\n" for idx, text in enumerate(batch_texts, 1))
    gen_model = genai.GenerativeModel(model)
    response = gen_model.generate_content(prompt)
    lines = [line.strip() for line in response.text.strip().split('\n') if line.strip()]
    summaries = [re.sub(r"^\d+\.\s*", "", line).strip() for line in lines if re.match(r"^\d+\.\s*", line)]
    if len(summaries) != len(batch_texts):
        summaries = [summarize_segment_gemini(text, api_key, model) for text in batch_texts]
    return summaries

def summarize_segment_gemini(text, api_key, model="gemini-2.0-flash-lite", max_chunk_words=500):
    genai.configure(api_key=api_key)
    gen_model = genai.GenerativeModel(model)
    def split_into_chunks(words, chunk_size):
        return [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
    words = re.findall(r"\w+|[.,!?;]", text)
    if len(words) > max_chunk_words:
        chunks = split_into_chunks(words, max_chunk_words)
        summaries = [summarize_segment_gemini(chunk, api_key, model, max_chunk_words) for chunk in chunks]
        combined = " ".join(summaries)
        return summarize_segment_gemini(combined, api_key, model, max_chunk_words)
    else:
        prompt = (
            "Write a concise, content-rich summary (2–3 sentences) of the following transcript, "
            "without saying 'this segment' or referring to the segment itself. Focus only on the facts and main ideas:\n"
            f"{text}"
        )
        response = gen_model.generate_content(prompt)
        return response.text.strip()

def batch_generate_summaries_gemini(segment_texts, api_key, model="gemini-2.0-flash-lite", max_batch_words=120):
    summaries = []
    i = 0
    n = len(segment_texts)
    while i < n:
        batch = []
        batch_word_count = 0
        while i < n:
            seg_words = len(segment_texts[i].split())
            if seg_words > max_batch_words:
                if batch:
                    summaries.extend(_summarize_batch(batch, api_key, model))
                    batch = []
                    batch_word_count = 0
                summaries.append(summarize_segment_gemini(segment_texts[i], api_key, model))
                i += 1
                break
            else:
                batch.append(segment_texts[i])
                batch_word_count += seg_words
                i += 1
                if batch_word_count > max_batch_words * 3:
                    break
        if batch:
            summaries.extend(_summarize_batch(batch, api_key, model))
    return summaries

def extract_titlestamp_and_excerpt(words, segment_start_idx, segment_end_idx, method="first", excerpt_len=15):
    segment_words = words[segment_start_idx:segment_end_idx]
    if not segment_words:
        return None, None, ""
    start_time = segment_words[0].get('start', None)
    end_time = segment_words[-1].get('end', None)
    if method == "first":
        excerpt = " ".join([w['word'] for w in segment_words[:excerpt_len]])
    elif method == "tfidf":
        text = " ".join([w['word'] for w in segment_words])
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        if not sentences:
            excerpt = text[:excerpt_len*8]
        else:
            vectorizer = TfidfVectorizer()
            X = vectorizer.fit_transform(sentences)
            scores = X.sum(axis=1)
            best_idx = scores.argmax()
            excerpt = sentences[best_idx]
    else:
        excerpt = " ".join([w['word'] for w in segment_words[:excerpt_len]])
    return start_time, end_time, excerpt

def align_to_sentence_start(words, idx, window=10):
    for i in range(idx, min(idx + window, len(words))):
        if i == 0:
            return 0
        if re.match(r".*[\.\!\?]$", words[i-1]['word']):
            return i
    return idx

def align_to_sentence_end(words, idx, window=10):
    for i in range(idx, min(idx + window, len(words))):
        if re.match(r".*[\.\!\?]$", words[i]['word']):
            return i + 1
    return idx

class MeetingSummarizerProcessor:
    """
    Handles meeting audio summarization and Q&A, integrates with async worker.
    Cleaner, file-processor-style abstraction: no direct env access, all config via self.settings, no direct Qdrant/Redis client calls, only service methods.
    """
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_logger("MeetingSummarizerProcessor")
        self.meeting_collection = getattr(self.settings, "meeting_qdrant_collection", "meeting_segments")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.embedding_dimension = getattr(self.settings, "embedding_dimension_meeting", 384)

    async def process_meeting(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        meeting_id = task_data.get("meetingId")
        audio_path = task_data.get("audioPath")
        api_key = task_data.get("apiKey")
        model_size = task_data.get("modelSize", "base.en")
        device = task_data.get("device", "cpu")
        window_size = task_data.get("windowSize", 100)
        stride = task_data.get("stride", 50)
        threshold = task_data.get("threshold", 0.75)
        title_model = task_data.get("titleModel", "gemini-2.0-flash-lite")
        summary_model = task_data.get("summaryModel", "gemini-2.0-flash-lite")
        excerpt_method = task_data.get("excerptMethod", "first")
        excerpt_len = task_data.get("excerptLen", 15)
        b2_file_key = task_data.get("b2FileKey")
        from services.audio_file_service import download_meeting_audio
        if not meeting_id or not api_key or not (audio_path or b2_file_key):
            raise ValueError("meetingId, audioPath or b2FileKey, and apiKey are required")
        temp_dir = tempfile.mkdtemp()
        try:
            # Always use the audio_file_service abstraction for audio file retrieval
            if b2_file_key or not audio_path:
                audio_path_to_use = download_meeting_audio(meeting_id, b2_file_key)
                logger.info(f"Downloaded audio for meeting {meeting_id} to {audio_path_to_use}")
            else:
                audio_path_to_use = audio_path
            norm_path = os.path.join(temp_dir, "norm.wav")
            denoise_path = os.path.join(temp_dir, "denoise.wav")
            normalize_audio(audio_path_to_use, norm_path)
            denoise_audio_sox(norm_path, denoise_path)
            chunk_dir = os.path.join(temp_dir, "chunks")
            chunk_files = split_audio(denoise_path, chunk_dir, max_duration_min=10)
            all_words = []
            for chunk in sorted(chunk_files):
                results, _ = transcribe_with_whisper(chunk, model_size=model_size, device=device)
                all_words.extend(results)
            boundaries = segment_topics(all_words, window_size=window_size, stride=stride, threshold=threshold)
            boundaries.append(len(all_words))
            segment_data = []
            for i in range(len(boundaries) - 1):
                raw_start, raw_end = boundaries[i], boundaries[i + 1]
                start_idx = align_to_sentence_start(all_words, raw_start)
                end_idx = align_to_sentence_end(all_words, raw_end)
                segment_words = all_words[start_idx:end_idx]
                segment_text = " ".join([w['word'] for w in segment_words])
                start_time, end_time, excerpt = extract_titlestamp_and_excerpt(
                    all_words, start_idx, end_idx, method=excerpt_method, excerpt_len=excerpt_len
                )
                segment_data.append({
                    "start_idx": start_idx,
                    "end_idx": end_idx,
                    "segment_text": segment_text,
                    "words": [w['word'] for w in segment_words],
                    "start_time": start_time,
                    "end_time": end_time,
                    "excerpt": excerpt
                })
            segment_texts = [s["segment_text"] for s in segment_data]
            titles = batch_generate_titles_gemini(segment_texts, api_key, model=title_model)
            summaries = batch_generate_summaries_gemini(segment_texts, api_key, model=summary_model)
            full_transcript = " ".join([w['word'] for w in all_words])
            meeting_title = generate_title_gemini(full_transcript, api_key, model=title_model)
            segments = []
            for i, s in enumerate(segment_data):
                embedding = self.embedder.encode(s["segment_text"]).tolist()
                # Pad or truncate embedding to the configured meeting dimension
                if len(embedding) < self.embedding_dimension:
                    embedding += [0.0] * (self.embedding_dimension - len(embedding))
                elif len(embedding) > self.embedding_dimension:
                    embedding = embedding[:self.embedding_dimension]
                metadata = {
                    "meeting_id": meeting_id,
                    "segment_index": i,
                    "title": titles[i],
                    "start_time": s["start_time"],
                    "end_time": s["end_time"],
                    "excerpt": s["excerpt"],
                    "summary": summaries[i],
                    "segment_text": s["segment_text"]
                }
                try:
                    await qdrant_client.store_embedding_with_metadata(
                        embedding=embedding,
                        metadata=metadata,
                        point_id=f"{meeting_id}_{i}",
                        repo_id=meeting_id,  # for consistency, use meeting_id as repo_id
                        file_path=f"meeting_segment_{i}",
                        text=s["segment_text"],
                        collection_name=self.meeting_collection
                    )
                    logger.info(f"Stored embedding for meeting {meeting_id} segment {i} in collection {self.meeting_collection}")
                except Exception as e:
                    logger.error(f"Failed to store embedding for segment {i}: {e}")
                segments.append({
                    "title": titles[i],
                    "start_time": s["start_time"],
                    "end_time": s["end_time"],
                    "excerpt": s["excerpt"],
                    "summary": summaries[i],
                    "start_idx": s["start_idx"],
                    "end_idx": s["end_idx"],
                    "words": s["words"]
                })
            return {
                "meeting_id": meeting_id,
                "title": meeting_title,
                "segments": segments,
                "transcript": full_transcript
            }
        except Exception as e:
            logger.error(f"Error processing meeting {meeting_id}: {e}")
            logger.debug(traceback.format_exc())
            return {"error": str(e)}
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
