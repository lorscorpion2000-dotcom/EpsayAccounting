import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum EmployeeTypeDto {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACTOR = 'CONTRACTOR',
  DAILY_WAGE = 'DAILY_WAGE',
  HOURLY = 'HOURLY',
}

export enum MaritalStatusDto {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
}

export class CreateEmployeeDto {
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiProperty({ enum: EmployeeTypeDto }) @IsEnum(EmployeeTypeDto) employeeType!: EmployeeTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) housingAllow?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) foodAllow?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) childAllow?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) otherAllow?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) dailyWage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) hourlyWage?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIban?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() insuranceStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasInsurance?: boolean;
  @ApiPropertyOptional({ enum: MaritalStatusDto }) @IsOptional() @IsEnum(MaritalStatusDto) maritalStatus?: MaritalStatusDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) childrenCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() birthPlace?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() education?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  // Partner fields
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}
