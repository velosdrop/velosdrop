// src/utils/documentUtils.ts

/**
 * Check if a document URL is valid and points to an actual uploaded file
 */
export function isValidDocumentUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Check for common invalid values
  const invalidValues = ['null', 'undefined', '', 'NaN', 'placeholder'];
  const lowerUrl = url.toLowerCase();
  
  if (invalidValues.some(invalid => lowerUrl.includes(invalid))) {
    return false;
  }
  
  // Check if it's a valid file path or URL
  try {
    // For relative URLs starting with /uploads/
    if (url.startsWith('/uploads/')) {
      return true;
    }
    
    // For absolute URLs
    if (url.startsWith('http')) {
      new URL(url);
      return true;
    }
    
    // For other relative paths that might be valid
    if (url.startsWith('/')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Get document status based on upload status and expiry date
 */
export function getDocumentStatus(
  frontUrl: string | null | undefined, 
  backUrl: string | null | undefined,
  expiryDate?: string
): 'verified' | 'pending' | 'expired' {
  const hasFront = isValidDocumentUrl(frontUrl);
  const hasBack = isValidDocumentUrl(backUrl);
  
  if (!hasFront || !hasBack) {
    return 'pending';
  }

  if (expiryDate) {
    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      if (expiry < today) {
        return 'expired';
      }
    } catch (error) {
      console.error('Error parsing expiry date:', error);
    }
  }

  return 'verified';
}

/**
 * Check if any documents are uploaded for a driver
 */
export function hasAnyDocuments(driver: any): boolean {
  const documentFields = [
    'licenseFrontUrl',
    'licenseBackUrl',
    'registrationFrontUrl',
    'registrationBackUrl',
    'nationalIdFrontUrl',
    'nationalIdBackUrl',
    'vehicleFrontUrl',
    'vehicleBackUrl'
  ];
  
  return documentFields.some(field => 
    isValidDocumentUrl(driver[field])
  );
}

/**
 * Get document display URL - handles placeholder images for missing documents
 */
export function getDocumentDisplayUrl(
  url: string | null | undefined, 
  documentType: string, 
  side: string
): string {
  if (isValidDocumentUrl(url)) {
    return url!;
  }
  
  // Return a placeholder image URL
  return `/api/placeholder/400/250?text=${encodeURIComponent(`${documentType} ${side} Not Uploaded`)}`;
}