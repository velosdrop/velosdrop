// lib/blob-upload.ts
export async function uploadChatImage(
    file: File,
    deliveryId: number,
    senderId: number,
    senderType: 'driver' | 'customer' = 'driver'
  ): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('deliveryId', deliveryId.toString());
    formData.append('driverId', senderId.toString());
    formData.append('senderType', senderType);
  
    const response = await fetch('/api/upload/delivery-proof-vercel', {
      method: 'POST',
      body: formData,
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
  
    const data = await response.json();
    return data.imageUrl;
  }
  
  // Upload with retry logic
  export async function uploadImageWithRetry(
    file: File,
    deliveryId: number,
    senderId: number,
    maxRetries = 3
  ): Promise<string> {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await uploadChatImage(file, deliveryId, senderId);
      } catch (error) {
        lastError = error;
        console.log(`Upload attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => 
            setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
          );
        }
      }
    }
    
    throw lastError;
  }