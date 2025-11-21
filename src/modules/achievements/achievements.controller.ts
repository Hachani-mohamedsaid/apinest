import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AchievementsService } from './achievements.service';
import { AchievementsSummaryDto } from './dto/achievements-summary.dto';
import { BadgesResponseDto } from './dto/badges-response.dto';
import { ChallengesResponseDto } from './dto/challenges-response.dto';
import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getSummary(@Request() req): Promise<AchievementsSummaryDto> {
    const userId = req.user._id.toString();
    return this.achievementsService.getSummary(userId);
  }

  @Get('badges')
  @UseGuards(JwtAuthGuard)
  async getBadges(@Request() req): Promise<BadgesResponseDto> {
    const userId = req.user._id.toString();
    return this.achievementsService.getBadges(userId);
  }

  @Get('challenges')
  @UseGuards(JwtAuthGuard)
  async getChallenges(@Request() req): Promise<ChallengesResponseDto> {
    const userId = req.user._id.toString();
    return this.achievementsService.getChallenges(userId);
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  async getLeaderboard(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<LeaderboardResponseDto> {
    const userId = req.user._id.toString();
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.achievementsService.getLeaderboard(userId, pageNum, limitNum);
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user._id.toString();
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const unreadOnlyBool = unreadOnly === 'true';
    return this.achievementsService.getNotifications(userId, pageNum, limitNum, unreadOnlyBool);
  }

  @Post('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  async markNotificationAsRead(@Request() req, @Param('id') notificationId: string) {
    const userId = req.user._id.toString();
    await this.achievementsService.markNotificationAsRead(userId, notificationId);
    return { success: true };
  }

  @Post('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  async markAllNotificationsAsRead(@Request() req) {
    const userId = req.user._id.toString();
    await this.achievementsService.markAllNotificationsAsRead(userId);
    return { success: true };
  }
}

