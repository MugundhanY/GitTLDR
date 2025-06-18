#!/usr/bin/env python3
"""
Test script to verify that the streaming chain of thought works properly.
This tests the natural sentence flow like DeepSeek's UI.
"""
import asyncio
import json
from services.deepseek_client import deepseek_client

async def test_streaming_quality():
    """Test that streaming produces natural, complete thoughts."""
    
    print("🧠 Testing DeepSeek R1 streaming quality...")
    print("=" * 60)
    
    # Test question that should produce clear reasoning steps
    test_question = "How does authentication work in this Next.js application?"
    
    repository_context = """
    Next.js application with:
    - User authentication system
    - Database integration with Prisma
    - GitHub OAuth integration
    - Session management
    """
    
    files_content = [
        """// auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ user: session.user })
}""",
        """// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  return NextResponse.next()
}"""
    ]
    
    try:
        step_count = 0
        total_content = ""
        
        async for thinking_step in deepseek_client.think_and_analyze(
            question=test_question,
            repository_context=repository_context,
            files_content=files_content,
            repository_name="test-app",
            stream=True
        ):
            step_count += 1
            step_type = thinking_step.get("type", "thinking")
            content = thinking_step.get("content", "")
            
            if thinking_step.get("type") == "error":
                print(f"❌ Error: {content}")
                break
            elif thinking_step.get("type") == "complete":
                print(f"✅ {content}")
                break
            else:
                print(f"\n[Step {step_count}] {step_type.upper()}:")
                print("-" * 40)
                print(content)
                print("-" * 40)
                
                total_content += content + "\n"
                
                # Check streaming quality
                if len(content) < 20:
                    print("⚠️  Warning: Very short content chunk")
                elif content.count('. ') > 0 and not content.strip().endswith(('.', '!', '?')):
                    print("⚠️  Warning: Incomplete sentence detected")
                
                # Add small delay to simulate real streaming
                await asyncio.sleep(0.1)
        
        print(f"\n📊 Streaming Summary:")
        print(f"   Total steps: {step_count}")
        print(f"   Total content length: {len(total_content)} characters")
        print(f"   Average step length: {len(total_content) // max(1, step_count)} characters")
        
        # Quality checks
        sentences = total_content.count('. ') + total_content.count('? ') + total_content.count('! ')
        if sentences > 0:
            print(f"   Complete sentences: {sentences}")
        
        print("\n✅ Streaming test completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_streaming_quality())
