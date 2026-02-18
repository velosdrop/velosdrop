// lib/cloudinary.ts
export const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!cloudName) {
      throw new Error('Cloudinary cloud name is not configured');
    }
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  
    if (!response.ok) {
      const error = await response.text();
      console.error('Cloudinary upload failed:', error);
      throw new Error('Failed to upload image');
    }
  
    const data = await response.json();
    return data.secure_url;
  };