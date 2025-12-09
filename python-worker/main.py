"""
Combined Python Worker Entry Point

This script runs both:
1. FastAPI API server (port 8001) - for HTTP endpoints
2. Background worker - for processing Redis queue jobs

This allows deployment on platforms like Render that only support
web services, by keeping the process alive via HTTP health checks.
"""
import asyncio
import multiprocessing
import sys
import os
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass


def run_api_server():
    """Run the FastAPI API server."""
    import uvicorn
    from config.settings import get_settings
    
    settings = get_settings()
    port = int(os.getenv('PORT', 8001))
    
    print(f"🚀 Starting API Server on port {port}")
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )


def run_worker():
    """Run the background worker."""
    import asyncio
    from worker import GitTLDRWorker, setup_signal_handlers
    from utils.logger import setup_logging, get_logger
    
    setup_logging()
    logger = get_logger(__name__)
    
    async def start_worker():
        logger.info("🔧 Starting Background Worker")
        worker = GitTLDRWorker()
        setup_signal_handlers(worker)
        await worker.start()
    
    asyncio.run(start_worker())


def main():
    """Main entry point - runs both API server and worker."""
    print("=" * 60)
    print("GitTLDR Python Worker - Combined Mode")
    print("=" * 60)
    print("Starting both API server and background worker...")
    print()
    
    # Create processes for each component
    api_process = multiprocessing.Process(target=run_api_server, name="api-server")
    worker_process = multiprocessing.Process(target=run_worker, name="background-worker")
    
    try:
        # Start both processes
        api_process.start()
        print(f"✅ API Server started (PID: {api_process.pid})")
        
        worker_process.start()
        print(f"✅ Background Worker started (PID: {worker_process.pid})")
        
        print()
        print("Both services running. Press Ctrl+C to stop.")
        print("=" * 60)
        
        # Wait for either process to finish
        api_process.join()
        worker_process.join()
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        api_process.terminate()
        worker_process.terminate()
        api_process.join(timeout=5)
        worker_process.join(timeout=5)
        print("✅ Shutdown complete")


if __name__ == "__main__":
    # Windows compatibility
    if sys.platform == 'win32':
        multiprocessing.freeze_support()
    
    main()
