import { PrismaClient, MeetingStatus } from '@prisma/client';
const prisma = new PrismaClient();

export async function createMeetingRecord({ meetingId, userId, b2FileKey, title, source, language, numSegments, participants }: any) {
  await prisma.meeting.create({
    data: {
      id: meetingId,
      userId: userId, // Use userId, not ownerId
      raw_audio_path: b2FileKey,
      status: MeetingStatus.PROCESSING,
      title: title || '',
      participants: participants,
      source: source || null,
      language: language || null,
      num_segments: numSegments || null,
      created_at: new Date(),
      updated_at: new Date(),
    }
  });
}

export async function updateMeetingStatus(jobId: string, status: string, result?: any, error?: any) {
  // Extract meetingId between the first and last underscore
  const match = jobId.match(/^meeting_(.+)_.*$/);
  const meetingId = match ? match[1] : null;
  console.log('[updateMeetingStatus] jobId:', jobId, 'meetingId:', meetingId, 'status:', status);
  console.log('[updateMeetingStatus] result keys:', result ? Object.keys(result) : 'no result');
  if (result && result.segments) {
    console.log('[updateMeetingStatus] segments count:', result.segments.length);
    console.log('[updateMeetingStatus] first segment sample:', JSON.stringify(result.segments[0], null, 2));
  }
  
  if (!meetingId) {
    console.warn('[updateMeetingStatus] Could not extract meetingId from jobId:', jobId);
    return;
  }
  try {
    // Always update available meeting fields at every step
    const updateData: any = {
      status: status.toUpperCase() as MeetingStatus,
      updated_at: new Date(),
    };
    
    // Add fields if they exist in result
    if (result?.summary) updateData.summary = result.summary;
    if (result?.full_transcript || result?.transcript) {
      updateData.full_transcript = result.full_transcript || result.transcript;
    }
    if (result?.segments && Array.isArray(result.segments)) {
      updateData.num_segments = result.segments.length;
    } else if (result?.num_segments) {
      updateData.num_segments = result.num_segments;
    }
    if (result?.title || result?.meeting_title) {
      updateData.title = result.title || result.meeting_title;
    }
    if (result?.meeting_length) {
      updateData.meeting_length = result.meeting_length;
    }
    
    console.log('[updateMeetingStatus] updating meeting with:', JSON.stringify(updateData, null, 2));
    
    await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      console.warn(`[updateMeetingStatus] No meeting found for id: ${meetingId} (jobId: ${jobId})`);
    } else {
      console.error('[updateMeetingStatus] Error updating meeting:', err);
    }
  }
  // Upsert segments at every step, handle both raw and summarized segment payloads
  if (result?.segments && Array.isArray(result.segments)) {
    console.log(`[updateMeetingStatus] Upserting segments for meetingId: ${meetingId}, count: ${result.segments.length}`);
    for (const [i, seg] of result.segments.entries()) {
      // Support both raw and summarized segment payloads
      const segmentText = seg.segment_text || (Array.isArray(seg.words) ? seg.words.join(' ') : '');
      const segmentData = {
        title: seg.title || `Segment ${i + 1}`,
        summary: seg.summary || 'Summary not available',
        excerpt: seg.excerpt || '',
        segment_text: segmentText,
        start_time: seg.start_time ?? 0,
        end_time: seg.end_time ?? 0,
      };
      
      console.log(`[updateMeetingStatus] Upserting segment ${i}:`, JSON.stringify(segmentData, null, 2));
      
      await prisma.meetingSegment.upsert({
        where: {
          meeting_id_segment_index: {
            meeting_id: meetingId,
            segment_index: i
          }
        },
        update: segmentData,
        create: {
          meeting_id: meetingId,
          segment_index: i,
          ...segmentData,
          created_at: new Date(),
        }
      });
    }
  } else {
    console.log('[updateMeetingStatus] No segments to upsert for this update.');
  }
}