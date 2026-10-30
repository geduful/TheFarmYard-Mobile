import { supabase } from '@/lib/supabase';

type UploadImageOptions = {
  uri: string;
  bucket: string;
  path: string;
};

export async function uploadImage({
  uri,
  bucket,
  path,
}: UploadImageOptions) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Could not read compressed image.');
  }

  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return `storage://${bucket}/${path}`;
}