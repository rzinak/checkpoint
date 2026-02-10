const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_ENDPOINT = 'https://www.googleapis.com/drive/v3';
const GOOGLE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3';

let clientConfig: { client_id: string; client_secret: string; redirect_uri: string } | null = null;

async function loadClientConfig() {
  if (clientConfig) return clientConfig;
  
  try {
    const response = await fetch('/client_secret.json');
    const data = await response.json();
    
    // Support both "installed" (desktop app) and "web" (web app) client types
    const clientData = data.installed || data.web;
    
    if (!clientData) {
      throw new Error('Invalid client_secret.json format. Expected "installed" or "web" key.');
    }
    
    clientConfig = {
      client_id: clientData.client_id,
      client_secret: clientData.client_secret,
      redirect_uri: clientData.redirect_uris[0]
    };
    return clientConfig;
  } catch (error) {
    console.error('Failed to load client secret:', error);
    throw new Error('OAuth configuration not found or invalid');
  }
}

const REDIRECT_URI = 'http://localhost:1420/auth-callback.html';

export async function initiateGoogleAuth(): Promise<string> {
  const config = await loadClientConfig();
  
  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const config = await loadClientConfig();
  
  // Must match the redirect_uri used in initiateGoogleAuth
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.client_id,
      client_secret: config.client_secret,
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
  const config = await loadClientConfig();
  
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.client_id,
      client_secret: config.client_secret,
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
    throw new Error('Failed to fetch user info');
  }
  
  const data = await response.json();
  return {
    name: data.name,
    email: data.email,
    picture: data.picture
  };
}

export async function getDriveStorageInfo(accessToken: string): Promise<{ used: number; total: number }> {
  const response = await fetch(`${GOOGLE_DRIVE_ENDPOINT}/about?fields=storageQuota`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch storage info');
  }
  
  const data = await response.json();
  return {
    used: parseInt(data.storageQuota.usage),
    total: parseInt(data.storageQuota.limit)
  };
}

export async function findOrCreateCheckpointFolder(accessToken: string): Promise<string> {
  // Search for existing Checkpoint folder
  const searchResponse = await fetch(
    `${GOOGLE_DRIVE_ENDPOINT}/files?q=${encodeURIComponent("name='Checkpoint' and mimeType='application/vnd.google-apps.folder' and trashed=false")}&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!searchResponse.ok) {
    throw new Error('Failed to search for Checkpoint folder');
  }
  
  const searchData = await searchResponse.json();
  
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }
  
  // Create Checkpoint folder
  const createResponse = await fetch(`${GOOGLE_DRIVE_ENDPOINT}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Checkpoint',
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  if (!createResponse.ok) {
    throw new Error('Failed to create Checkpoint folder');
  }
  
  const createData = await createResponse.json();
  return createData.id;
}

export async function uploadSnapshot(
  accessToken: string,
  gameId: string,
  snapshotName: string,
  fileBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  const checkpointFolderId = await findOrCreateCheckpointFolder(accessToken);
  
  // Find or create game folder
  const gameFolderResponse = await fetch(
    `${GOOGLE_DRIVE_ENDPOINT}/files?q=${encodeURIComponent(`name='${gameId}' and '${checkpointFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  let gameFolderId: string;
  
  if (gameFolderResponse.ok) {
    const gameFolderData = await gameFolderResponse.json();
    if (gameFolderData.files && gameFolderData.files.length > 0) {
      gameFolderId = gameFolderData.files[0].id;
    } else {
      // Create game folder
      const createGameFolder = await fetch(`${GOOGLE_DRIVE_ENDPOINT}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: gameId,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [checkpointFolderId]
        })
      });
      
      if (!createGameFolder.ok) {
        throw new Error('Failed to create game folder');
      }
      
      gameFolderId = (await createGameFolder.json()).id;
    }
  } else {
    throw new Error('Failed to search for game folder');
  }
  
  // Upload file
  const metadata = {
    name: `${snapshotName}.zip`,
    parents: [gameFolderId]
  };
  
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', fileBlob);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.id);
      } else {
        reject(new Error('Upload failed'));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    
    xhr.open('POST', `${GOOGLE_UPLOAD_ENDPOINT}/files?uploadType=multipart`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.send(formData);
  });
}

export async function listCloudSnapshots(accessToken: string, gameId: string): Promise<{ id: string; name: string; modifiedTime: string; size: number }[]> {
  const checkpointFolderId = await findOrCreateCheckpointFolder(accessToken);
  
  // Find game folder
  const gameFolderResponse = await fetch(
    `${GOOGLE_DRIVE_ENDPOINT}/files?q=${encodeURIComponent(`name='${gameId}' and '${checkpointFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!gameFolderResponse.ok) {
    return [];
  }
  
  const gameFolderData = await gameFolderResponse.json();
  if (!gameFolderData.files || gameFolderData.files.length === 0) {
    return [];
  }
  
  const gameFolderId = gameFolderData.files[0].id;
  
  // List files in game folder
  const filesResponse = await fetch(
    `${GOOGLE_DRIVE_ENDPOINT}/files?q=${encodeURIComponent(`'${gameFolderId}' in parents and trashed=false`)}&fields=files(id,name,modifiedTime,size)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!filesResponse.ok) {
    return [];
  }
  
  const filesData = await filesResponse.json();
  return filesData.files || [];
}

export async function downloadSnapshot(
  accessToken: string,
  fileId: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    if (onProgress) {
      xhr.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else {
        reject(new Error('Download failed'));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Download failed')));
    
    xhr.open('GET', `${GOOGLE_DRIVE_ENDPOINT}/files/${fileId}?alt=media`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.responseType = 'blob';
    xhr.send();
  });
}
