import { existsSync, mkdirSync, rmSync, statSync } from 'fs';
import fs, { readdirSync } from 'node:fs';

import AdmZip from 'adm-zip';
import { Log } from './terminal_utils.js';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export const BASE_DIR = path.resolve(__dirname, '..', '..', '..');

export function getFilenameWithoutExtension(filename: string) {
  return path.basename(filename, path.extname(filename));
}

export function getRelativePath(filepath: string) {
  if (path.isAbsolute(filepath)) {
    return filepath;
  }
  return path.resolve(BASE_DIR, filepath);
}
export function getRootedPath(filepath: string) {
  return path.resolve(BASE_DIR, filepath);
}

export function getFileSize(filepath: string) {
  const stats = statSync(filepath);
  return stats.size;
}

export function getHumanReadableSize(
  filepath: string,
  maxUnit: 'B' | 'KB' | 'MB' | 'GB' = 'GB',
) {
  const bytes = getFileSize(filepath);

  return covertToHumanReadableSize(bytes, maxUnit);
}

export function covertToHumanReadableSize(
  bytes: number,
  maxUnit: 'B' | 'KB' | 'MB' | 'GB' = 'GB',
) {
  if (bytes < 1024 || maxUnit === 'B') {
    return `${bytes} Bytes`;
  }

  if (bytes < 1024 * 1024 || maxUnit === 'KB') {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024 || maxUnit === 'MB') {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ensureEmptyDir(dir: string) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }

  mkdirSync(dir, { recursive: true });
}

export function unzip(buffer: Buffer<ArrayBufferLike>, targetDir: string) {
  const zip = new AdmZip(Buffer.from(buffer));

  zip.extractAllTo(targetDir, false, true);
}

export function zipFile(filepath: string, outputZipPath: string) {
  const filename = path.basename(filepath);

  const zip = new AdmZip();

  zip.addFile(filename, fs.readFileSync(filepath));

  zip.writeZip(outputZipPath);
}

export function zipDirectory(dirpath: string, outputZipPath: string) {
  const zip = new AdmZip();
  
  const files = readdirSync(dirpath);
  for (const file of files) {
    const filePath = path.join(dirpath, file);
    const stat = statSync(filePath);
    
    if (stat.isFile()) {
      const fileContent = fs.readFileSync(filePath);
      zip.addFile(file, fileContent);
    }
  }
  
  zip.writeZip(outputZipPath);
}

export function listFiles(
  dir: string,
  pattern: string,
  opts?: {
    maxDepth?: number;
  },
) {
  const maxDepth = opts?.maxDepth ?? 10;

  return glob.sync(`${dir}/**/${pattern}`, {
    cwd: dir,
    absolute: true,
    maxDepth,
  });
}

export function listDirectories(dir: string) {
  const dirPaths: string[] = [];
  const dirents = readdirSync(dir, { withFileTypes: true, recursive: false });

  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      dirPaths.push(path.join(dir, dirent.name));
    }
  }

  return dirPaths;
}

export function unzipFiles(
  files: string[],
  outputDir: string,
  options?: {
    keepFiles?: boolean;
  },
) {
  Log.stepBegin('Unzipping files, # of files: ' + files.length);

  files.forEach((file) => {
    const filepath = path.resolve(file);
    const name = path.basename(filepath).replace('.zip', '');

    const buffer = fs.readFileSync(filepath);

    const unzipTo = path.resolve(outputDir, name);
    unzip(buffer, unzipTo);

    if (options?.keepFiles !== true) {
      fs.unlinkSync(filepath);
    }

    Log.stepProgress(`Completed: ${name}`);
  });

  Log.stepEnd('Unzipped all files');
}
