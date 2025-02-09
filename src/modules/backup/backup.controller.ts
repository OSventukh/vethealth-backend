import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { BackupService } from './backup.service';
import { Response } from 'express';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('create-files')
  async createBackup(@Res() res: Response) {
    try {
      const backupFile = await this.backupService.createFilesBackup();
      res.download(backupFile);
    } catch (error) {
      res.status(500).send('Failed to create backup');
    }
  }

  @Post('restore-files')
  async restoreBackup(@Query('file') file: string, @Res() res: Response) {
    try {
      await this.backupService.restoreFilesBackup(file);
      res.send('Backup restored successfully');
    } catch (error) {
      res.status(500).send('Failed to restore backup');
    }
  }
}