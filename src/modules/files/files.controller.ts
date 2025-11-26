import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Express } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  )
  @ApiOperation({
    summary: 'Upload a file (image or PDF)',
    description:
      'Upload a file (image: JPG, PNG, GIF, WEBP or PDF) and get back the URL. Maximum file size: 10MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file too large',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - File upload service not configured',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFileResponseDto> {
    return this.filesService.uploadFile(file);
  }
}

