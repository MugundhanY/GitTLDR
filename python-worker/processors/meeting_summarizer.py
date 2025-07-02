"""
Meeting processor for GitTLDR Python Worker.
Handles meeting audio processing, transcription, and summarization.
"""
import os
import math
import subprocess
import tempfile
import shutil
import traceback
import re
import time
import json
import uuid
from typing import Optional, Dict, Any, List

from config.settings import get_settings
from utils.logger import get_logger
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from services.redis_client import redis_client

from pydub import AudioSegment
from faster_whisper import WhisperModel
from sentence_transformers import SentenceTransformer
import numpy as np
import google.generativeai as genai
from sklearn.feature_extraction.text import TfidfVectorizer

logger = get_logger(__name__)

class MeetingProcessor:
    """Handles meeting processing tasks including transcription and summarization."""
    
    def __init__(self):
        self.settings = get_settings()
        self.meeting_collection = getattr(self.settings, "meeting_qdrant_collection", "meeting_segments")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.embedding_dimension = getattr(self.settings, "embedding_dimension_meeting", 384)
        self.gemini_call_count = 0

    async def update_meeting_status(self, meeting_id: str, status: str, data: Optional[dict] = None) -> None:
        """Update meeting status via Redis to notify node-worker, with optional extra data."""
        try:
            status_update = {
                "meeting_id": meeting_id,
                "status": status,
                "timestamp": int(time.time())
            }
            if data:
                status_update.update(data)
            await redis_client.publish("meeting_status_updates", json.dumps(status_update))
            logger.info(f"Sent meeting {meeting_id} status update to {status} via Redis with data: {data}")
        except Exception as e:
            logger.error(f"Failed to send meeting status update: {e}")

    def normalize_audio(self, input_path: str, output_path: str, target_sr: int = 16000, target_channels: int = 1, target_sample_width: int = 2) -> None:
        """Normalize audio file to standard format."""
        audio = AudioSegment.from_file(input_path)
        audio = audio.set_channels(target_channels)
        audio = audio.set_frame_rate(target_sr)
        audio = audio.set_sample_width(target_sample_width)
        audio.export(output_path, format="wav")
        logger.info(f"Normalized audio saved to {output_path}")

    def denoise_audio_sox(self, input_path: str, output_path: str, noise_duration_s: int = 1) -> None:
        """Remove noise from audio using sox."""
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

    def split_audio(self, input_path: str, output_dir: str, max_duration_min: int = 10) -> List[str]:
        """Split audio into chunks for processing."""
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

    def transcribe_with_whisper(self, audio_path, model_size="base.en", device="cpu"):
        """Transcribe audio using Whisper model."""
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

    def segment_topics(self, words, window_size=100, stride=50, threshold=0.75, model_name="all-MiniLM-L6-v2"):
        """Segment transcript into topics based on semantic similarity."""
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

    def generate_title_gemini(self, text, api_key, model="gemini-2.0-flash-lite"):
        """Generate title using Gemini API."""
        genai.configure(api_key=api_key)
        prompt = (
            "Give me a single, concise 3–6 word title (not a list, not options, just one title) "
            "that best captures the following text. Do NOT use any Markdown, formatting, or special characters—just plain text:\n"
            f"{text}"
        )
        gen_model = genai.GenerativeModel(model)
        response = gen_model.generate_content(prompt)
        return response.text.strip().split('\n')[0]

    def batch_generate_titles_gemini(self, segment_texts, api_key, model="gemini-2.0-flash-lite"):
        """Generate titles for multiple segments using Gemini API."""
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

    def _summarize_batch(self, batch_texts, api_key, model):
        """Summarize a batch of texts using Gemini API."""
        self.gemini_call_count += 1
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
            summaries = [self.summarize_segment_gemini(text, api_key, model) for text in batch_texts]
        return summaries

    def summarize_segment_gemini(self, text, api_key, model="gemini-2.0-flash-lite", max_chunk_words=500):
        """Summarize a single segment using Gemini API."""
        genai.configure(api_key=api_key)
        gen_model = genai.GenerativeModel(model)
        def split_into_chunks(words, chunk_size):
            return [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
        words = re.findall(r"\w+|[.,!?;]", text)
        if len(words) > max_chunk_words:
            chunks = split_into_chunks(words, max_chunk_words)
            summaries = [self.summarize_segment_gemini(chunk, api_key, model, max_chunk_words) for chunk in chunks]
            combined = " ".join(summaries)
            return self.summarize_segment_gemini(combined, api_key, model, max_chunk_words)
        else:
            prompt = (
                "Write a concise, content-rich summary (2–3 sentences) of the following transcript, "
                "without saying 'this segment' or referring to the segment itself. Focus only on the facts and main ideas:\n"
                f"{text}"
            )
            response = gen_model.generate_content(prompt)
            return response.text.strip()

    def batch_generate_summaries_gemini(self, segment_texts, api_key, model="gemini-2.0-flash-lite", max_batch_words=120):
        """Generate summaries for multiple segments using batch processing."""
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
                        summaries.extend(self._summarize_batch(batch, api_key, model))
                        batch = []
                        batch_word_count = 0
                    summaries.append(self.summarize_segment_gemini(segment_texts[i], api_key, model))
                    i += 1
                    break
                else:
                    batch.append(segment_texts[i])
                    batch_word_count += seg_words
                    i += 1
                    if batch_word_count > max_batch_words * 3:
                        break
            if batch:
                summaries.extend(self._summarize_batch(batch, api_key, model))
        return summaries

    def extract_titlestamp_and_excerpt(self, words, segment_start_idx, segment_end_idx, method="first", excerpt_len=15):
        """Extract timestamp and excerpt from segment."""
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

    def align_to_sentence_start(self, words, idx, window=10):
        """Align segment boundary to sentence start."""
        for i in range(idx, min(idx + window, len(words))):
            if i == 0:
                return 0
            if re.match(r".*[\.\!\?]$", words[i-1]['word']):
                return i
        return idx

    def align_to_sentence_end(self, words, idx, window=10):
        """Align segment boundary to sentence end."""
        for i in range(idx, min(idx + window, len(words))):
            if re.match(r".*[\.\!\?]$", words[i]['word']):
                return i + 1
        return idx

    async def process_meeting(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Process meeting audio and generate transcripts and summaries."""
        meeting_id = task_data.get("meetingId")
        audio_path = task_data.get("audioPath")
        b2_file_key = task_data.get("b2FileKey")
        model_size = task_data.get("modelSize", "base.en")
        device = task_data.get("device", "cpu")
        window_size = task_data.get("windowSize", 100)
        stride = task_data.get("stride", 50)
        threshold = task_data.get("threshold", 0.75)
        title_model = task_data.get("titleModel", "gemini-2.0-flash-lite")
        summary_model = task_data.get("summaryModel", "gemini-2.0-flash-lite")
        excerpt_method = task_data.get("excerptMethod", "first")
        excerpt_len = task_data.get("excerptLen", 15)
        
        # Use the API key from settings instead of requiring it in task_data
        api_key = self.settings.gemini_api_key
        if not api_key or api_key == "your-gemini-api-key":
            raise ValueError("Gemini API key not configured in settings. Please set GEMINI_API_KEY environment variable.")
        
        if not meeting_id or not (audio_path or b2_file_key):
            raise ValueError("meetingId and either audioPath or b2FileKey are required")
        
        from services.audio_file_service import download_meeting_audio
        
        temp_dir = tempfile.mkdtemp()
        try:
            await self.update_meeting_status(meeting_id, "transcribing")
            
            # Always use the audio_file_service abstraction for audio file retrieval
            if b2_file_key or not audio_path:
                audio_path_to_use = await download_meeting_audio(meeting_id, b2_file_key)
                logger.info(f"Downloaded audio for meeting {meeting_id} to {audio_path_to_use}")
            else:
                audio_path_to_use = audio_path
            norm_path = os.path.join(temp_dir, "norm.wav")
            denoise_path = os.path.join(temp_dir, "denoise.wav")
            self.normalize_audio(audio_path_to_use, norm_path)
            self.denoise_audio_sox(norm_path, denoise_path)
            chunk_dir = os.path.join(temp_dir, "chunks")
            chunk_files = self.split_audio(denoise_path, chunk_dir, max_duration_min=10)
            all_words = []
            for chunk in sorted(chunk_files):
                results, _ = self.transcribe_with_whisper(chunk, model_size=model_size, device=device)
                all_words.extend(results)
            full_transcript = " ".join([w['word'] for w in all_words])
            # Update status to summarizing
            boundaries = self.segment_topics(all_words, window_size=window_size, stride=stride, threshold=threshold)
            boundaries.append(len(all_words))
            segment_data = []
            for i in range(len(boundaries) - 1):
                raw_start, raw_end = boundaries[i], boundaries[i + 1]
                start_idx = self.align_to_sentence_start(all_words, raw_start)
                end_idx = self.align_to_sentence_end(all_words, raw_end)
                segment_words = all_words[start_idx:end_idx]
                segment_text = " ".join([w['word'] for w in segment_words])
                start_time, end_time, excerpt = self.extract_titlestamp_and_excerpt(
                    all_words, start_idx, end_idx, method=excerpt_method, excerpt_len=excerpt_len
                )
                segment_data.append({
                    "segment_text": segment_text,
                    "start_time": start_time,
                    "end_time": end_time,
                    "excerpt": excerpt
                })
            meeting_length = 0.0
            if segment_data and segment_data[-1]["end_time"] is not None:
                meeting_length = float(segment_data[-1]["end_time"])
            # Send transcript, transcript_length, meeting_length, and segment_data after segmentation (summarizing)
            summarizing_payload = {
                "full_transcript": full_transcript,
                "meeting_length": meeting_length,
                "segments": segment_data
            }
            logger.info(f"[meeting_summarizer] Sending summarizing payload: {json.dumps(summarizing_payload)[:500]}...")
            await self.update_meeting_status(meeting_id, "summarizing", summarizing_payload)
            segment_texts = [s["segment_text"] for s in segment_data]
            titles = self.batch_generate_titles_gemini(segment_texts, api_key, model=title_model)
            summaries = self.batch_generate_summaries_gemini(segment_texts, api_key, model=summary_model)
            meeting_title = self.generate_title_gemini(full_transcript, api_key, model=title_model)
            segments = []
            for i, s in enumerate(segment_data):
                embedding = self.embedder.encode(s["segment_text"]).tolist()
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
                    point_id = str(uuid.uuid4())
                    await qdrant_client.store_embedding_with_metadata(
                        embedding=embedding,
                        metadata=metadata,
                        point_id=point_id,
                        repo_id=meeting_id,
                        file_path=f"meeting_segment_{i}",
                        text=s["segment_text"],
                        collection_name=self.meeting_collection,
                        dimension=self.embedding_dimension
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
                    "segment_text": s["segment_text"]
                })
            # Send all final data before returning
            completed_payload = {
                "num_segments": len(segments),
                "transcript": full_transcript,
                "full_transcript": full_transcript,
                "meeting_title": meeting_title,
                "meeting_length": meeting_length,
                "segments": segments
            }
            logger.info(f"[meeting_summarizer] Sending completed payload: {json.dumps(completed_payload)[:500]}...")
            await self.update_meeting_status(meeting_id, "completed", completed_payload)
            return {
                "meeting_id": meeting_id,
                "title": meeting_title,
                "segments": segments,
                "transcript": full_transcript,
                "full_transcript": full_transcript,
                "meeting_length": meeting_length
            }
        except Exception as e:
            logger.error(f"Error processing meeting {meeting_id}: {e}")
            logger.debug(traceback.format_exc())
            return {"error": str(e)}
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    async def process_meeting_qa(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Process meeting Q&A queries using stored embeddings."""
        try:
            meeting_id = task_data.get("meetingId")
            question = task_data.get("question")
            user_id = task_data.get("userId", "anonymous")
            
            if not meeting_id or not question:
                raise ValueError("meetingId and question are required")
            
            logger.info(f"Processing meeting Q&A for meeting {meeting_id}: {question}")
            
            # Get meeting metadata from database first
            from services.database_service import database_service
            meeting_info = await database_service.get_meeting_info(meeting_id)
            
            if not meeting_info:
                return {
                    "status": "error",
                    "error": "Meeting not found or not processed yet",
                    "answer": "I couldn't find information about this meeting. Please ensure the meeting has been processed.",
                    "confidence": 0.0,
                    "related_segments": []
                }
            
            # Use Qdrant to search for relevant segments
            from services.qdrant_client import qdrant_client
            
            # Generate embedding for the question
            question_embedding = self.embedder.encode(question).tolist()
            if len(question_embedding) < self.embedding_dimension:
                question_embedding += [0.0] * (self.embedding_dimension - len(question_embedding))
            elif len(question_embedding) > self.embedding_dimension:
                question_embedding = question_embedding[:self.embedding_dimension]
            
            # Search for relevant segments
            search_results = await qdrant_client.search_similar_embeddings(
                embedding=question_embedding,
                collection_name=self.meeting_collection,
                limit=5,
                score_threshold=0.5,
                filter_by_repo_id=meeting_id
            )
            
            if not search_results:
                return {
                    "status": "completed",
                    "answer": "I couldn't find relevant information in this meeting to answer your question. The meeting might not contain discussion about this topic.",
                    "confidence": 0.2,
                    "related_segments": []
                }
            
            # Prepare context from relevant segments
            context_segments = []
            for result in search_results:
                metadata = result.get('metadata', {})
                context_segments.append({
                    "segment_index": metadata.get('segment_index', 0),
                    "title": metadata.get('title', 'Untitled'),
                    "summary": metadata.get('summary', ''),
                    "text": metadata.get('segment_text', ''),
                    "start_time": metadata.get('start_time', 0),
                    "end_time": metadata.get('end_time', 0),
                    "score": result.get('score', 0.0)
                })
            
            # Build context for AI
            context_text = f"Meeting: {meeting_info.get('title', 'Untitled Meeting')}\n"
            context_text += f"Total Duration: {meeting_info.get('duration', 'Unknown')}\n\n"
            context_text += "Relevant Meeting Segments:\n"
            
            for i, segment in enumerate(context_segments, 1):
                context_text += f"\n{i}. {segment['title']} ({self._format_time(segment['start_time'])} - {self._format_time(segment['end_time'])})\n"
                context_text += f"Summary: {segment['summary']}\n"
                context_text += f"Content: {segment['text'][:500]}{'...' if len(segment['text']) > 500 else ''}\n"
            
            # Use Gemini to answer the question
            from services.gemini_client import gemini_client
            
            # Build Q&A prompt specific to meetings
            prompt = f"""You are analyzing a meeting transcript to answer questions. Based on the meeting segments provided below, answer the user's question accurately and concisely.

Meeting Context:
{context_text}

User Question: {question}

Instructions:
1. Answer based ONLY on the information provided in the meeting segments
2. If the answer involves specific times or actions, reference the relevant segment timestamps
3. If the information is not available in the segments, say so clearly
4. Be specific about who said what, when possible
5. Include relevant details like deadlines, assignments, decisions, or action items
6. Keep the answer focused and actionable

Answer:"""

            try:
                import google.generativeai as genai
                genai.configure(api_key=self.settings.gemini_api_key)
                model = genai.GenerativeModel('gemini-2.0-flash-lite')
                
                response = await model.generate_content_async(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        top_p=0.9,
                        max_output_tokens=1000,
                    )
                )
                
                answer = response.text.strip()
                
                # Calculate confidence based on search scores
                avg_score = sum(seg['score'] for seg in context_segments) / len(context_segments)
                confidence = min(avg_score * 1.2, 1.0)  # Boost slightly but cap at 1.0
                
                # Find the most relevant timestamp for seeking
                best_segment = max(context_segments, key=lambda x: x['score'])
                suggested_timestamp = best_segment['start_time']
                
                return {
                    "status": "completed",
                    "answer": answer,
                    "confidence": round(confidence, 2),
                    "related_segments": [
                        {
                            "segment_index": seg['segment_index'],
                            "title": seg['title'],
                            "start_time": seg['start_time'],
                            "end_time": seg['end_time'],
                            "relevance_score": round(seg['score'], 2)
                        }
                        for seg in context_segments
                    ],
                    "suggested_timestamp": suggested_timestamp,
                    "meeting_id": meeting_id,
                    "question": question
                }
                
            except Exception as ai_error:
                logger.error(f"AI processing failed: {str(ai_error)}")
                
                # Fallback to simple context-based answer
                answer = f"Based on the meeting content, here are the relevant segments discussing '{question}':\n\n"
                for i, segment in enumerate(context_segments[:3], 1):
                    answer += f"{i}. {segment['title']} ({self._format_time(segment['start_time'])})\n"
                    answer += f"   {segment['summary']}\n\n"
                
                return {
                    "status": "completed",
                    "answer": answer,
                    "confidence": 0.6,
                    "related_segments": [
                        {
                            "segment_index": seg['segment_index'],
                            "title": seg['title'],
                            "start_time": seg['start_time'],
                            "end_time": seg['end_time'],
                            "relevance_score": round(seg['score'], 2)
                        }
                        for seg in context_segments
                    ],
                    "suggested_timestamp": context_segments[0]['start_time'] if context_segments else 0,
                    "meeting_id": meeting_id,
                    "question": question
                }
                
        except Exception as e:
            logger.error(f"Meeting Q&A failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "answer": f"An error occurred while processing your question: {str(e)}",
                "confidence": 0.0,
                "related_segments": []
            }
    
    def _format_time(self, seconds: float) -> str:
        """Format seconds to MM:SS format."""
        if not seconds or seconds < 0:
            return "0:00"
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        return f"{minutes}:{seconds:02d}"
