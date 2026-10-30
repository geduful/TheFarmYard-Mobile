import { supabase } from '@/lib/supabase';

export const LISTING_IMAGES_BUCKET = 'listing-images';

export function parseStorageRef(
  value: string
): { bucket: string; path: string } | null {
  if (!value.startsWith('storage://')) {
    return null;
  }

  const rest = value.slice('storage://'.length);
  const slashIndex = rest.indexOf('/');

  if (slashIndex <= 0) {
    return null;
  }

  return {
    bucket: rest.slice(0, slashIndex),
    path: rest.slice(slashIndex + 1),
  };
}

export async function resolveImageUrl(
  value: string | null,
  expiresIn = 3600
) {
  if (!value) {
    return null;
  }

  const ref = parseStorageRef(value);

  if (!ref) {
    return value;
  }

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error(
      'Could not resolve storage image:',
      error?.message
    );

    return null;
  }

  return data.signedUrl;
}

export function createListingImagePath(userId: string) {
  const randomPart = Math.random()
    .toString(36)
    .slice(2);

  return `${userId}/${Date.now()}-${randomPart}.jpg`;
}