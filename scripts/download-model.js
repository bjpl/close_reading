#!/usr/bin/env node

/**
 * ONNX Model Download Script
 *
 * Downloads the all-MiniLM-L6-v2 ONNX model from Hugging Face
 * and saves it to public/models/ directory.
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2
 * Size: ~23MB
 * Dimensions: 384
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODEL_URL = 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx';
const OUTPUT_DIR = join(__dirname, '../public/models');
const OUTPUT_FILE = join(OUTPUT_DIR, 'all-MiniLM-L6-v2.onnx');

/**
 * Download file with progress
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ONNX model from ${url}...`);
    console.log(`Output: ${outputPath}`);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        console.log(`Following redirect to ${redirectUrl}`);
        downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      let lastProgress = 0;

      const fileStream = createWriteStream(outputPath);

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = Math.floor((downloadedSize / totalSize) * 100);

        // Show progress every 10%
        if (progress >= lastProgress + 10) {
          console.log(`Progress: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(2)}MB / ${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
          lastProgress = progress;
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✓ Download complete: ${outputPath}`);
        console.log(`✓ File size: ${(downloadedSize / 1024 / 1024).toFixed(2)}MB`);
        resolve();
      });

      fileStream.on('error', (err) => {
        fileStream.close();
        reject(err);
      });

    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('=== ONNX Model Download ===\n');

  // Create output directory if it doesn't exist
  if (!existsSync(OUTPUT_DIR)) {
    console.log(`Creating directory: ${OUTPUT_DIR}`);
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if model already exists
  if (existsSync(OUTPUT_FILE)) {
    console.log(`✓ Model already exists at ${OUTPUT_FILE}`);
    console.log('Skipping download. Delete the file to re-download.\n');
    return;
  }

  try {
    await downloadFile(MODEL_URL, OUTPUT_FILE);
    console.log('\n=== Setup Complete ===');
    console.log('The ONNX model is ready for use.');
    console.log('Service will load it from: /models/all-MiniLM-L6-v2.onnx\n');
  } catch (error) {
    console.error('\n=== Download Failed ===');
    console.error('Error:', error.message);
    console.error('\nManual download instructions:');
    console.error(`1. Visit: ${MODEL_URL}`);
    console.error(`2. Save to: ${OUTPUT_FILE}`);
    console.error('3. Ensure the file is ~23MB in size\n');
    process.exit(1);
  }
}

main();
