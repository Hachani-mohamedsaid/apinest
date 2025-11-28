import { ApiProperty } from '@nestjs/swagger';

export class IsFollowingResponseDto {
  @ApiProperty({ example: true, description: 'Indique si l\'utilisateur connecté suit l\'utilisateur cible' })
  isFollowing: boolean;
}

