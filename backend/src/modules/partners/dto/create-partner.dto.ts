import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export enum PartnerTypeDto {
  CLIENT = 'CLIENT',
  CONSULTANT = 'CONSULTANT',
  CONTRACTOR = 'CONTRACTOR',
  SUPPLIER = 'SUPPLIER',
  EMPLOYEE = 'EMPLOYEE',
  PARTNER = 'PARTNER',
  OTHER = 'OTHER',
}

export class CreatePartnerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: PartnerTypeDto })
  @IsOptional()
  @IsEnum(PartnerTypeDto)
  type?: PartnerTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'نام پدر' })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({ description: 'نام مستعار' })
  @IsOptional()
  @IsString()
  aliasName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'توضیحات شغل' })
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @ApiPropertyOptional({ description: 'شماره شبا (IR + 24 رقم)', example: 'IR123456789012345678901234' })
  @IsOptional()
  @IsString()
  @Matches(/^IR\d{24}$/, { message: 'شبا باید با IR شروع شود و ۲۴ رقم داشته باشد' })
  shabaNumber?: string;

  @ApiPropertyOptional({ description: 'شماره حساب بانکی' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'شماره کارت بانکی (16 رقم)', example: '1234-5678-9012-3456' })
  @IsOptional()
  @IsString()
  bankCardNumber?: string;
}
