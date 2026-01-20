// Utility function to get the base API URL based on environment
function getBaseApiUrl(): string {
  // Check if running in production (https://baytup.fr)
  if (typeof window !== 'undefined' && window.location.hostname === 'baytup.fr') {
    return 'https://baytup.fr';
  }

  // Use environment variable or default to localhost
  return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
}

// Utility function to construct correct image URLs
export function getImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) {
    return `${getBaseApiUrl()}/uploads/listings/listing.jpeg`;
  }

  // If URL is already absolute (starts with http), return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // Construct full URL from relative path
  return `${getBaseApiUrl()}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

// Helper function for listing images
export function getListingImageUrl(listing: any, index: number = 0): string {
  const defaultImage = `${getBaseApiUrl()}/uploads/listings/listing.jpeg`;

  // Check if listing has images
  if (!listing?.images || !Array.isArray(listing.images) || listing.images.length === 0) {
    return defaultImage;
  }

  // ✅ FIX BQ-39: Use index first for slider to work, only use isPrimary as fallback
  let image;

  // If valid index provided, use it
  if (index >= 0 && index < listing.images.length) {
    image = listing.images[index];
  }

  // Fallback to primary image
  if (!image) {
    image = listing.images.find((img: any) => img.isPrimary);
  }

  // Final fallback to first image
  if (!image) {
    image = listing.images[0];
  }

  // If no image found, return default
  if (!image) {
    return defaultImage;
  }

  // Handle different image formats
  if (typeof image === 'string') {
    return getImageUrl(image);
  }

  // Handle image object with url property
  if (image.url) {
    return getImageUrl(image.url);
  }

  return defaultImage;
}

// Helper function for avatar images
export function getAvatarUrl(avatar: string | undefined | null): string {
  const defaultAvatar = `${getBaseApiUrl()}/uploads/users/default-avatar.png`;

  if (!avatar) {
    return defaultAvatar;
  }

  // If URL is already absolute (starts with http), return as is
  if (avatar.startsWith('http')) {
    return avatar;
  }

  // Construct full URL from relative path
  return `${getBaseApiUrl()}${avatar.startsWith('/') ? avatar : `/${avatar}`}`;
}

// Helper function to get primary listing image
export function getPrimaryListingImage(listing: any): string {
  if (!listing?.images || !Array.isArray(listing.images) || listing.images.length === 0) {
    return `${getBaseApiUrl()}/uploads/listings/listing.jpeg`;
  }

  // Find primary image
  const primaryImage = listing.images.find((img: any) => img.isPrimary) || listing.images[0];

  if (typeof primaryImage === 'string') {
    return getImageUrl(primaryImage);
  }

  if (primaryImage?.url) {
    return getImageUrl(primaryImage.url);
  }

  return `${getBaseApiUrl()}/uploads/listings/listing.jpeg`;
}

// Helper function to get all listing images
export function getAllListingImages(listing: any): string[] {
  if (!listing?.images || !Array.isArray(listing.images) || listing.images.length === 0) {
    return [`${getBaseApiUrl()}/uploads/listings/listing.jpeg`];
  }

  return listing.images.map((image: any) => {
    if (typeof image === 'string') {
      return getImageUrl(image);
    }
    if (image?.url) {
      return getImageUrl(image.url);
    }
    return `${getBaseApiUrl()}/uploads/listings/listing.jpeg`;
  });
}
