//app/api/upload/delivery-proof-vercel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const deliveryId = formData.get('deliveryId') as string;
    const driverId = formData.get('driverId') as string;
    const senderType = formData.get('senderType') || 'driver';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename for chat
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    
    // Use a dedicated folder for chat images
    const fileName = `chat-images/delivery-${deliveryId}/${senderType}-${driverId}-${timestamp}.${fileExtension}`;
    
    // Upload to Vercel Blob with additional safety
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log(`📸 Chat image uploaded to Vercel Blob: ${blob.url}`);

    return NextResponse.json({ 
      success: true, 
      imageUrl: blob.url,
      fileName: blob.pathname,
      fileSize: file.size,
      fileType: file.type,
      deliveryId,
      driverId,
      senderType
    });

  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return NextResponse.json(
      { error: 'Failed to upload image. Please try again.' },
      { status: 500 }
    );
  }
}