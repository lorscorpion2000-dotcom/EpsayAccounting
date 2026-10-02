import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class IssueItemDto {
  @ApiProperty() @IsUUID() itemId!: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateIssueDto {
  @ApiProperty() @IsUUID() warehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() recipientId?: string;
  @ApiProperty() @IsDateString() issueDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() requesterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() usageLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [IssueItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => IssueItemDto) items!: IssueItemDto[];
}
