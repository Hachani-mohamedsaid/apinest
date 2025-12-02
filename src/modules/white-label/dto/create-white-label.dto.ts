import { IsString, IsOptional, IsBoolean, IsUrl, IsEmail, Matches } from 'class-validator';

export class CreateWhiteLabelDto {
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] })
  logoUrl?: string;

  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, {
    message: 'primaryColor must be a valid hex color (#RRGGBB or #RRGGBBAA)',
  })
  primaryColor?: string;

  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, {
    message: 'secondaryColor must be a valid hex color (#RRGGBB or #RRGGBBAA)',
  })
  secondaryColor?: string;

  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, {
    message: 'accentColor must be a valid hex color (#RRGGBB or #RRGGBBAA)',
  })
  accentColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEmail()
  companyEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, {
    message: 'customDomain must be a valid domain format',
  })
  customDomain?: string;

  @IsOptional()
  @IsBoolean()
  hideNexoBranding?: boolean;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsString()
  emailFromName?: string;

  @IsOptional()
  @IsEmail()
  emailFromAddress?: string;
}

