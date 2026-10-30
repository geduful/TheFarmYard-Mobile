import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const TARGET_MAX_BYTES = 700 * 1024;

const RESIZE_STEPS = [
  1400,
  1200,
  1000,
  850,
];

const QUALITY_STEPS = [
  0.78,
  0.68,
  0.58,
  0.48,
  0.4,
];

type CompressImageInput = {
  uri: string;
  width: number;
  height: number;
};

function getResizeAction(
  width: number,
  height: number,
  maxDimension: number
) {
  const largestDimension = Math.max(
    width,
    height
  );

  if (largestDimension <= maxDimension) {
    return null;
  }

  const scale =
    maxDimension / largestDimension;

  return {
    resize: {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    },
  } as const;
}

function getFileSize(uri: string) {
  const file = new File(uri);

  if (!file.exists) {
    throw new Error(
      'Compressed image could not be found.'
    );
  }

  return file.size ?? 0;
}

export async function compressImage({
  uri,
  width,
  height,
}: CompressImageInput) {
  let smallestResult:
    | (ImageManipulator.ImageResult & {
        size: number;
      })
    | null = null;

  for (const maxDimension of RESIZE_STEPS) {
    const resizeAction =
      getResizeAction(
        width,
        height,
        maxDimension
      );

    const actions = resizeAction
      ? [resizeAction]
      : [];

    for (const quality of QUALITY_STEPS) {
      const result =
        await ImageManipulator.manipulateAsync(
          uri,
          actions,
          {
            compress: quality,
            format:
              ImageManipulator.SaveFormat.JPEG,
          }
        );

      const size = getFileSize(
        result.uri
      );

      const candidate = {
        ...result,
        size,
      };

      if (
        !smallestResult ||
        size < smallestResult.size
      ) {
        smallestResult =
          candidate;
      }

      if (
        size > 0 &&
        size <= TARGET_MAX_BYTES
      ) {
        return candidate;
      }
    }
  }

  if (!smallestResult) {
    throw new Error(
      'The image could not be compressed.'
    );
  }

  if (
    smallestResult.size >
    TARGET_MAX_BYTES
  ) {
    throw new Error(
      'This image is still too large after optimization. Please choose another photo.'
    );
  }

  return smallestResult;
}