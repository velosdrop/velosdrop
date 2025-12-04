//app/api/upload/delivery-proof-vercel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const deliveryId = formData.get('deliveryId') as string;
    const driverId = formData.get('driverId') as string;

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

    // Generate unique filename
    const fileName = `delivery-proofs/${deliveryId}_${driverId}_${Date.now()}.${file.name.split('.').pop()}`;
    
    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log(`📸 Delivery proof uploaded to Vercel Blob: ${blob.url}`);

    return NextResponse.json({ 
      success: true, 
      imageUrl: blob.url,
      fileName: blob.pathname,
      fileSize: file.size,
      fileType: file.type
    });

  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}