export class WhiteLabelResponseDto {
  id: string;
  userId: string;
  enabled: boolean;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  companyName?: string;
  companyEmail?: string;
  customDomain?: string;
  hideNexoBranding: boolean;
  footerText?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  activatedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

