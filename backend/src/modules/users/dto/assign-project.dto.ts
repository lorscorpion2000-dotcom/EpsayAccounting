import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignProjectDto {
  @ApiProperty({ description: 'شناسه پروژه' })
  @IsString()
  projectId!: string;
}

export class SetDefaultProjectDto {
  @ApiPropertyOptional({ description: 'شناسه پروژه پیش‌فرض — null برای پاک‌کردن', nullable: true })
  @IsOptional()
  @IsString()
  projectId?: string | null;
}
