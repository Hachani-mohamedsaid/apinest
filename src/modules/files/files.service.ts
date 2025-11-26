import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Express } from 'express';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(private configService: ConfigService) {}

  async uploadFile(file: Express.Multer.File): Promise<UploadFileResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Vérifier le type de fichier (images et PDFs acceptés)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Please upload an image (JPG, PNG, GIF, WEBP) or PDF file.',
      );
    }

    // Vérifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size exceeds the maximum limit of 10MB',
      );
    }

    const apiKey =
      (this.configService.get<string>('IMGBB_API_KEY') ||
        process.env.IMGBB_API_KEY ||
        '5bcfdc535939a696f5a6916a331f90c6').trim();

    if (!apiKey) {
      this.logger.error('IMGBB_API_KEY is not configured in the environment');
      throw new InternalServerErrorException(
        'File upload service is not configured',
      );
    }

    this.logger.debug(`Uploading file: ${file.originalname} (${file.mimetype})`);

    // Convertir le fichier en base64
    const base64File = file.buffer.toString('base64');

    const formBody = new URLSearchParams();
    formBody.append('image', base64File);
    if (file.originalname) {
      formBody.append('name', file.originalname);
    }

    try {
      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
        formBody.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000, // 30 secondes
        },
      );

      if (!response.data?.success || !response.data?.data) {
        this.logger.error(
          `Unexpected response from imgbb: ${JSON.stringify(response.data)}`,
        );
        throw new InternalServerErrorException(
          'Failed to upload file. Please try again later.',
        );
      }

      const fileData = response.data.data;

      this.logger.log(
        `File uploaded successfully: ${file.originalname} -> ${fileData.url}`,
      );

      return {
        url: fileData.url ?? fileData.display_url,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { error?: { message?: string } })?.error
            ?.message ?? error.message;
        this.logger.error(`Failed to upload file to imgbb: ${message}`);
        throw new InternalServerErrorException(
          `Failed to upload file: ${message}`,
        );
      }

      this.logger.error(
        'Unexpected error while uploading file',
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Failed to upload file');
    }
  }
}

