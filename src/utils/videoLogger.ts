
const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

export interface VideoLogData {
  event: 'play' | 'pause';
  time: string;
  service: string;
  url: string;
  timestamp?: string;
}

export interface VideoLogPayload extends VideoLogData {
  roomCode: string;
  username: string;
}

export const sendVideoLogToBackend = async (logData: VideoLogPayload): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });
    
    if (response.ok) {
      console.log('✅ Video log sent to backend successfully');
      return true;
    } else {
      console.error('❌ Failed to send video log to backend:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending video log to backend:', error);
    return false;
  }
};

export const formatVideoLogMessage = (logData: VideoLogData): string => {
  const { event, time, service, url } = logData;
  const eventIcon = event === 'play' ? '▶️' : '⏸️';
  const serviceName = service || 'Unknown';
  
  return `${eventIcon} ${event.charAt(0).toUpperCase() + event.slice(1)} at ${time} | Service: ${serviceName}`;
};

export const getCurrentISTTimestamp = (): string => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return istTime.toISOString();
};

export const isStreamingService = (url: string): boolean => {
  const streamingDomains = [
    'netflix.com',
    'primevideo.com',
    'youtube.com',
    'youtu.be',
    'disneyplus.com',
    'hbomax.com',
    'hulu.com'
  ];
  
  return streamingDomains.some(domain => url.includes(domain));
};

export const getServiceFromUrl = (url: string): string => {
  if (url.includes('netflix.com')) return 'Netflix';
  if (url.includes('primevideo.com')) return 'Prime Video';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('disneyplus.com')) return 'Disney+';
  if (url.includes('hbomax.com')) return 'HBO Max';
  if (url.includes('hulu.com')) return 'Hulu';
  return 'Unknown';
};