/**
 * Image Helper Utility
 * Centralized image URL handling with proper fallbacks
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Get listing image URL with fallback to placeholder
 * @param imageUrl - Image URL from backend
 * @returns Full image URL or placeholder
 */
export const getListingImageUrl = (imageUrl?: string): string => {
  // Use placeholder from /public directory (exists)
  if (!imageUrl) return '/placeholder.jpg';
  
  // If already a full URL, return as-is
  if (imageUrl.startsWith('http')) return imageUrl;
  
  // Otherwise prepend API base URL
  return `${API_BASE_URL}${imageUrl}`;
};

/**
 * Get user avatar URL with fallback to placeholder
 * @param avatarUrl - Avatar URL from backend
 * @returns Full avatar URL or placeholder
 */
export const getAvatarUrl = (avatarUrl?: string): string => {
  // Use placeholder from /public directory (exists)
  if (!avatarUrl) return '/placeholder.jpg';
  
  // If already a full URL, return as-is
  if (avatarUrl.startsWith('http')) return avatarUrl;
  
  // Otherwise prepend API base URL
  return `${API_BASE_URL}${avatarUrl}`;
};

/**
 * Get vehicle image URL with fallback to placeholder
 * @param imageUrl - Vehicle image URL from backend
 * @returns Full image URL or placeholder
 */
export const getVehicleImageUrl = (imageUrl?: string): string => {
  // Use placeholder from /public directory (exists)
  if (!imageUrl) return '/placeholder.jpg';
  
  // If already a full URL, return as-is
  if (imageUrl.startsWith('http')) return imageUrl;
  
  // Otherwise prepend API base URL
  return `${API_BASE_URL}${imageUrl}`;
};

/**
 * Get primary image from listing images array
 * @param images - Array of listing images
 * @returns Primary image URL or first image or placeholder
 */
export const getPrimaryListingImage = (images?: Array<{ url: string; isPrimary?: boolean }>): string => {
  if (!images || images.length === 0) return '/placeholder.jpg';
  
  // Find primary image
  const primaryImage = images.find(img => img.isPrimary);
  const imageUrl = primaryImage?.url || images[0]?.url;
  
  return getListingImageUrl(imageUrl);
};

/**
 * Check if image URL is valid (not a broken link)
 * @param url - Image URL to check
 * @returns Promise<boolean>
 */
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};
