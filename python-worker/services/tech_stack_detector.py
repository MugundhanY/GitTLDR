"""
Tech Stack Detection - Guide AI with framework-specific instructions
====================================================================

Detects frameworks (FastAPI, Flask, Express, Next.js, Vosk) from file contents
and provides targeted guidance to ensure AI generates framework-appropriate code.

Example: FastAPI detection → AI uses @app.websocket instead of websockets.serve()
"""

from typing import List, Dict, Any
from utils.logger import get_logger

logger = get_logger(__name__)


class TechStackDetector:
    """Detect frameworks and provide guidance to AI."""
    
    FRAMEWORK_SIGNATURES = {
        'FastAPI': {
            'patterns': ['from fastapi import', '@app.get', '@app.post', '@app.websocket', 'FastAPI()'],
            'files': ['main.py', 'app.py'],
            'guidance': """
**TECH STACK: FastAPI**

CRITICAL INTEGRATION RULES:
1. Use FastAPI decorators: @app.get, @app.post, @app.websocket
2. For WebSocket: Use @app.websocket("/path") decorator (NOT external websockets library)
3. Access existing app instance (usually `app = FastAPI()` in main.py)
4. Use async/await for all endpoints
5. Follow FastAPI dependency injection pattern

EXAMPLE WEBSOCKET ENDPOINT:
```python
@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_bytes()
        # Process data
        await websocket.send_text(result)
```

DO NOT create standalone WebSocket servers or use external `websockets` library!
"""
        },
        
        'Flask': {
            'patterns': ['from flask import', '@app.route', 'Flask(__name__)'],
            'files': ['app.py', 'application.py'],
            'guidance': """
**TECH STACK: Flask**

CRITICAL INTEGRATION RULES:
1. Use Flask routes: @app.route decorator
2. For WebSocket: Use flask-socketio extension
3. Access existing app instance
4. Follow Flask patterns (blueprints, etc.)

DO NOT create standalone servers - integrate with existing Flask app!
"""
        },
        
        'Express': {
            'patterns': ["require('express')", 'express()', 'app.get(', 'app.post('],
            'files': ['app.js', 'server.js', 'index.js'],
            'guidance': """
**TECH STACK: Express.js**

CRITICAL INTEGRATION RULES:
1. Use Express router: app.get(), app.post()
2. For WebSocket: Use ws or socket.io library
3. Integrate with existing Express app
4. Follow Express middleware pattern

EXAMPLE WEBSOCKET WITH WS:
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });  // Attach to existing HTTP server

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Process message
    ws.send(result);
  });
});
```

DO NOT create standalone HTTP server - attach to existing Express app!
"""
        },
        
        'Next.js': {
            'patterns': ['next/router', 'next/link', 'export default function', 'getServerSideProps', 'getStaticProps'],
            'files': ['next.config.js', 'pages/_app.js', 'pages/_app.tsx'],
            'guidance': """
**TECH STACK: Next.js**

CRITICAL INTEGRATION RULES:
1. Use API routes in /pages/api/ directory
2. For WebSocket: Use custom server or API route handler
3. Follow Next.js file-based routing
4. Use Next.js data fetching methods

DO NOT create standalone servers - use Next.js API routes!
"""
        },
        
        'Vosk': {
            'patterns': ['from vosk import', 'KaldiRecognizer', 'Model(', 'AcceptWaveform'],
            'files': [],
            'guidance': """
**AUDIO: Vosk Speech Recognition**

CRITICAL INTEGRATION RULES:
1. Use existing Model instance (usually loaded at startup to avoid reload overhead)
2. Use KaldiRecognizer for transcription
3. For streaming: Use AcceptWaveform() in loop with audio chunks
4. Audio format: 16kHz, mono, 16-bit PCM

EXAMPLE STREAMING TRANSCRIPTION:
```python
recognizer = KaldiRecognizer(model, 16000)  # model already loaded
recognizer.SetWords(True)

while True:
    audio_chunk = await websocket.receive_bytes()
    if recognizer.Accept Waveform(audio_chunk):
        result = recognizer.Result()
        partial = json.loads(result)get('text', '')
        await websocket.send_text(partial)
```

DO NOT reload the model for each request - reuse existing model instance!
"""
        }
    }
    
    def detect_stack(self, files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect tech stack from file contents.
        
        Args:
            files: List of file objects with 'path', 'content', 'language' keys
            
        Returns:
            {
                'frameworks': ['FastAPI', 'Vosk'],
                'guidance': 'Combined guidance string',
                'primary_language': 'python'
            }
        """
        detected_frameworks = []
        all_content = ''
        
        # Combine all file contents
        for file in files:
            all_content += file.get('content', '') + '\n'
        
        logger.info(f"🔍 Detecting tech stack from {len(files)} files...")
        
        # Check each framework
        for framework, config in self.FRAMEWORK_SIGNATURES.items():
            patterns = config['patterns']
            
            # Check if any pattern matches
            matches = sum(1 for pattern in patterns if pattern in all_content)
            
            if matches > 0:
                detected_frameworks.append(framework)
                logger.info(f"✅ Detected framework: {framework} ({matches} pattern matches)")
        
        # Build combined guidance
        guidance_parts = []
        for framework in detected_frameworks:
            guidance_parts.append(self.FRAMEWORK_SIGNATURES[framework]['guidance'])
        
        combined_guidance = '\n\n'.join(guidance_parts)
        
        # Detect primary language
        python_count = sum(1 for f in files if f.get('language') == 'python')
        js_count = sum(1 for f in files if f.get('language') in ['javascript', 'typescript'])
        primary_language = 'python' if python_count > js_count else 'javascript'
        
        logger.info(f"📚 Tech stack summary: {detected_frameworks} (primary: {primary_language})")
        
        return {
            'frameworks': detected_frameworks,
            'guidance': combined_guidance,
            'primary_language': primary_language,
            'detected_count': len(detected_frameworks)
        }


# Global instance
tech_stack_detector = TechStackDetector()
