import { IsString, IsOptional, IsUUID, IsNumber, MaxLength, Min } from 'class-validator';

export class UpdateFixedAssetDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsNumber() @Min(0) residualValue?: number;
  @IsOptional() @IsUUID() projectId?: string | null;
  @IsOptional() @IsUUID() costCenterId?: string | null;
}