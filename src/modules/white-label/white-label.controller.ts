import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhiteLabelAccessGuard } from './white-label.guard';
import { WhiteLabelService } from './white-label.service';
import { CreateWhiteLabelDto } from './dto/create-white-label.dto';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto';
import { WhiteLabelResponseDto } from './dto/white-label-response.dto';

@Controller('white-label')
@UseGuards(JwtAuthGuard)
export class WhiteLabelController {
  constructor(private whiteLabelService: WhiteLabelService) {}

  /**
   * GET /white-label
   * Récupère la configuration White Label de l'utilisateur
   */
  @Get()
  async getMyWhiteLabel(@Request() req): Promise<WhiteLabelResponseDto | null> {
    const userId = req.user.userId || req.user.sub || req.user._id?.toString();
    const whiteLabel = await this.whiteLabelService.getWhiteLabelByUserId(userId);
    
    if (!whiteLabel) {
      return null;
    }

    return this.whiteLabelService.toResponseDto(whiteLabel);
  }

  /**
   * POST /white-label
   * Crée ou met à jour la configuration White Label
   */
  @Post()
  @UseGuards(WhiteLabelAccessGuard)
  async createOrUpdateWhiteLabel(
    @Request() req,
    @Body() createDto: CreateWhiteLabelDto,
  ): Promise<WhiteLabelResponseDto> {
    const userId = req.user.userId || req.user.sub || req.user._id?.toString();
    const whiteLabel = await this.whiteLabelService.createOrUpdateWhiteLabel(
      userId,
      createDto,
    );
    return this.whiteLabelService.toResponseDto(whiteLabel);
  }

  /**
   * PUT /white-label
   * Met à jour la configuration White Label
   */
  @Put()
  @UseGuards(WhiteLabelAccessGuard)
  async updateWhiteLabel(
    @Request() req,
    @Body() updateDto: UpdateWhiteLabelDto,
  ): Promise<WhiteLabelResponseDto> {
    const userId = req.user.userId || req.user.sub || req.user._id?.toString();
    const whiteLabel = await this.whiteLabelService.createOrUpdateWhiteLabel(
      userId,
      updateDto,
    );
    return this.whiteLabelService.toResponseDto(whiteLabel);
  }

  /**
   * PUT /white-label/toggle
   * Active ou désactive White Label
   */
  @Put('toggle')
  @UseGuards(WhiteLabelAccessGuard)
  async toggleWhiteLabel(
    @Request() req,
    @Body() body: { enabled: boolean },
  ): Promise<WhiteLabelResponseDto> {
    const userId = req.user.userId || req.user.sub || req.user._id?.toString();
    const whiteLabel = await this.whiteLabelService.toggleWhiteLabel(
      userId,
      body.enabled,
    );
    return this.whiteLabelService.toResponseDto(whiteLabel);
  }

  /**
   * GET /white-label/css
   * Récupère le CSS personnalisé
   */
  @Get('css')
  async getCustomCSS(@Request() req): Promise<{ css: string }> {
    const userId = req.user.userId || req.user.sub || req.user._id?.toString();
    const whiteLabel = await this.whiteLabelService.getWhiteLabelByUserId(userId);
    if (!whiteLabel || !whiteLabel.enabled) {
      return { css: '' };
    }

    const css = this.whiteLabelService.generateCustomCSS(whiteLabel);
    return { css };
  }

  /**
   * GET /white-label/preview
   * Récupère un aperçu de la configuration White Label
   */
  @Get('preview')
  async getPreview(@Request() req): Promise<{
    whiteLabel: WhiteLabelResponseDto | null;
    previewCSS: string;
    previewHTML: string;
  }> {
    const userId = req.user.userId || req.user.sub || req.user._id?.toString();
    const whiteLabel = await this.whiteLabelService.getWhiteLabelByUserId(userId);
    
    if (!whiteLabel || !whiteLabel.enabled) {
      return {
        whiteLabel: null,
        previewCSS: '',
        previewHTML: '',
      };
    }

    const css = this.whiteLabelService.generateCustomCSS(whiteLabel);
    const html = this.whiteLabelService.generatePreviewHTML(whiteLabel);
    
    return {
      whiteLabel: this.whiteLabelService.toResponseDto(whiteLabel),
      previewCSS: css,
      previewHTML: html,
    };
  }

  /**
   * DELETE /white-label
   * Supprime la configuration White Label
   */
  @Delete()
  @UseGuards(WhiteLabelAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWhiteLabel(@Request() req): Promise<void> {
    const userId = req.user.userId || req.user.sub || req.user._id?.toString();
    await this.whiteLabelService.deleteWhiteLabel(userId);
  }

  /**
   * GET /white-label/by-domain/:domain
   * Récupère la configuration White Label par domaine personnalisé
   * (Public - pour résolution de domaine)
   */
  @Get('by-domain/:domain')
  async getWhiteLabelByDomain(
    @Param('domain') domain: string,
  ): Promise<WhiteLabelResponseDto | null> {
    const whiteLabel = await this.whiteLabelService.getWhiteLabelByDomain(domain);
    if (!whiteLabel) {
      return null;
    }

    return this.whiteLabelService.toResponseDto(whiteLabel);
  }
}

