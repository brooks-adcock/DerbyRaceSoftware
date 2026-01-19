import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import convert from 'heic-convert';

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'photos');

export async function processAndSavePhoto(file_buffer: Buffer): Promise<string> {
  try {
    await fs.access(PHOTOS_DIR);
  } catch {
    await fs.mkdir(PHOTOS_DIR, { recursive: true });
  }

  let processed_buffer = file_buffer;

  // Check if it's HEIC (magic numbers: ftypheic, ftypheix, ftyphevc, ftypmif1, etc.)
  const header = file_buffer.slice(4, 12).toString('hex');
  const is_heic = header.includes('6674797068656963') || // ftypheic
                 header.includes('667479706d696631') || // ftypmif1
                 header.includes('6674797068657663');   // ftyphevc

  if (is_heic) {
    try {
      processed_buffer = Buffer.from(await convert({
        buffer: file_buffer,
        format: 'JPEG',
        quality: 1
      }));
    } catch (error) {
      console.error('HEIC conversion failed, trying sharp directly:', error);
    }
  }

  const file_hash = uuidv4();
  const file_name = `${file_hash}.jpg`;
  const file_path = path.join(PHOTOS_DIR, file_name);

  await sharp(processed_buffer)
    .rotate() // Auto-orient based on EXIF data
    .resize(800, 800, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 80 })
    .toFile(file_path);

  return file_hash;
}
