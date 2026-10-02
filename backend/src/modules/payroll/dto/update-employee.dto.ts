import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './employee.dto';
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
