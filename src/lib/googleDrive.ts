const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_ENDPOINT = 'https://www.googleapis.com/drive/v3';
const GOOGLE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3';

const REDIRECT_URI = 'http://localhost:1420/auth-callback.html';

// Get OAuth credentials from environment variables (embedded at build time)
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

function checkConfig() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'Google OAuth credentials not configured. ' +
      'Please set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET environment variables. ' +
      'See .env.example for details.'
    );
  }
}

export async function initiateGoogleAuth(): Promise<string> {
  checkConfig();
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  checkConfig();
  
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', errorText);
    throw new Error('Failed to exchange code for tokens');
  }
  
  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  checkConfig();
  
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  
  return response.json();
}

export async function getUserInfo(accessToken: string): Promise<{ name: string; email: string; picture: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user info');
  }
  
  return response.json();
}

// Get storage info
export async function getDriveStorageInfo(accessToken: string): Promise<{ used: number; total: number }> {
  const response = await fetch(`${GOOGLE_DRIVE_ENDPOINT}/about?fields=storageQuota`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get storage info');
  }
  
  const data = await response.json();
  return {
    used: parseInt(data.storageQuota.usage),
    total: parseInt(data.storageQuota.limit)
  };
}

// Upload a snapshot
export async function uploadSnapshot(
  accessToken: string,
  gameId: string,
  snapshotName: string,
  fileBlob: Blob
): Promise<string> {
  // Create file metadata
  const metadata = {
    name: `${gameId}/${snapshotName}.zip`,
    parents: ['appDataFolder'] // Store in app-specific folder
  };
  
  // Create multipart request
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";
  
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve) => {
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(fileBlob);
  });
  
  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/zip\r\n' +
    'Content-Transfer-Encoding: base64\r\n' +
    '\r\n' +
    base64Data +
    close_delim;
  
  const response = await fetch(`${GOOGLE_UPLOAD_ENDPOINT}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    },
    body: multipartRequestBody
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload snapshot');
  }
  
  const result = await response.json();
  return result.id;
}

// List snapshots for a game
export async function listCloudSnapshots(accessToken: string, gameId: string): Promise<{ id: string; name: string; modifiedTime: string }[]> {
  const query = encodeURIComponent(`name contains '${gameId}/' and trashed = false`);
  const response = await fetch(`${GOOGLE_DRIVE_ENDPOINT}/files?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to list cloud snapshots');
  }
  
  const data = await response.json();
  return data.files;
}

// Download a snapshot
export async function downloadSnapshot(
  accessToken: string,
  fileId: string
): Promise<Blob> {
  const response = await fetch(`${GOOGLE_DRIVE_ENDPOINT}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to download snapshot');
  }
  
  return response.blob();
}
