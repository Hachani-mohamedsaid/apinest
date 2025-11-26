import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDto {
  @ApiProperty({ 
    example: 'https://i.ibb.co/example/document.pdf',
    description: 'URL of the uploaded file'
  })
  url: string;

  @ApiProperty({ 
    example: 'document.pdf',
    description: 'Original file name'
  })
  fileName: string;

  @ApiProperty({ 
    example: 'application/pdf',
    description: 'MIME type of the file'
  })
  fileType: string;

  @ApiProperty({ 
    example: 123456,
    description: 'File size in bytes'
  })
  fileSize: number;
}

