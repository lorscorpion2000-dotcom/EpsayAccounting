import { IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from 'class-validator';

export class CreateCostCenterDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}