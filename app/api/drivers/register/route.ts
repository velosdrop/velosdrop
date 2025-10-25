//app/api/drivers/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { driversTable } from '@/src/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract data from the nested structure
    const driverData = {
      phoneNumber: body.personal?.phoneNumber,
      firstName: body.personal?.firstName,
      lastName: body.personal?.lastName,
      email: body.personal?.email,
      password: body.personal?.password,
      profilePictureUrl: body.personal?.profilePictureUrl,
      vehicleType: body.vehicle?.vehicleType,
      carName: body.vehicle?.carName,
      numberPlate: body.vehicle?.numberPlate,
      licenseExpiry: body.documents?.license?.expiry,
      registrationExpiry: body.documents?.registration?.expiry,
      licenseFrontUrl: body.documents?.license?.frontUrl,
      licenseBackUrl: body.documents?.license?.backUrl,
      registrationFrontUrl: body.documents?.registration?.frontUrl,
      registrationBackUrl: body.documents?.registration?.backUrl,
      nationalIdFrontUrl: body.documents?.nationalId?.frontUrl,
      nationalIdBackUrl: body.documents?.nationalId?.backUrl,
      vehicleFrontUrl: body.vehicle?.vehicleFrontUrl,
      vehicleBackUrl: body.vehicle?.vehicleBackUrl,
    };

    // Add validation for required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'phoneNumber'];
    const missingFields = requiredFields.filter(field => !driverData[field as keyof typeof driverData]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const [driver] = await db.insert(driversTable).values(driverData).returning();

    return NextResponse.json({ 
      success: true, 
      driverId: driver.id 
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}