import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyProfileService } from './company-profile.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Company Profile')
@ApiBearerAuth()
@Controller('company-profile')
export class CompanyProfileController {
  constructor(private service: CompanyProfileService) {}

  @Get()
  @RequirePermissions('settings.read')
  get() {
    return this.service.get();
  }

  @Patch()
  @RequirePermissions('settings.update')
  update(@Body() body: { name?: string; stampUrl?: string | null; logoUrl?: string | null }) {
    return this.service.update(body);
  }
}
