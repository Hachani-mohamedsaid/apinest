import { ApiProperty } from '@nestjs/swagger';

export class ParticipantDto {
  @ApiProperty({ example: 'user-id-1' })
  id: string;

  @ApiProperty({ example: 'Sarah Mitchell' })
  name: string;

  @ApiProperty({ example: 'https://example.com/avatar1.png', required: false })
  profileImageUrl?: string;
}

export class ChatDto {
  @ApiProperty({ example: 'chat-id-123' })
  id: string;

  @ApiProperty({ example: 'Swimming Group' })
  groupName: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  groupAvatar?: string;

  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];

  @ApiProperty({ example: true })
  isGroup: boolean;

  @ApiProperty({ example: '2025-11-15T10:30:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-15T10:30:00Z' })
  updatedAt: string;
}

export class ActivityGroupChatResponseDto {
  @ApiProperty({ type: ChatDto })
  chat: ChatDto;

  @ApiProperty({ example: 'Chat de groupe créé avec succès' })
  message: string;
}

