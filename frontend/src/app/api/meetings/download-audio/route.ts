import { NextApiRequest, NextApiResponse } from 'next';
import { B2StorageService } from '@/lib/b2-storage';

export default async function GET(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const meetingId = req.query.id;

  if (!meetingId || typeof meetingId !== 'string') {
    res.status(400).json({ error: 'Meeting ID is required and must be a string' });
    return;
  }

  const { fileName } = req.query;
  const b2Service = new B2StorageService();
  if (typeof fileName !== 'string') {
    res.status(400).json({ error: 'File name is required and must be a string' });
    return;
  }

  try {
    await b2Service.authorize();

    const data  = await b2Service.downloadFileContent(fileName);

    console.log('File Name:', fileName);
    console.log('Response Headers:', {
      'Content-Type': 'audio/mpeg',
    });
    console.log('Audio Data:', data);
    console.log('Meeting ID:', meetingId);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(data);
  } catch (error) {
    console.error('Error downloading audio file:', error);
    res.status(500).json({ error: 'Failed to download audio file' });
  }
}
