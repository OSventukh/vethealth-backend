import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import unzipper from 'unzipper';

@Injectable()
export class BackupService {
  private readonly uploadsDir = path.join(__dirname, '..', 'uploads');
  private readonly backupDir = path.join(__dirname, '..', 'backups');
  private readonly filesBackupDir = path.join(this.backupDir, 'files');

  constructor() {
    this.ensureBackupDirsExists();
  }
  async createFilesBackup(): Promise<string> {
    const backupFile = path.join(this.backupDir, `backup-${Date.now()}.zip`);
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(backupFile));
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(this.uploadsDir, false);
      archive.finalize();
    });
  }

  async restoreFilesBackup(backupFile: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupFile);
    const directory = await unzipper.Open.file(backupPath);

    return new Promise((resolve, reject) => {
      directory
        .extract({ path: this.uploadsDir, concurrency: 5 })
        .on('close', resolve)
        .on('error', reject);
    });
  }

  private ensureBackupDirsExists() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    if (!fs.existsSync(this.filesBackupDir)) {
      fs.mkdirSync(this.filesBackupDir, { recursive: true });
    }
  }
}
