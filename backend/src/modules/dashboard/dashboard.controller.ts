import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardExecutiveService } from './dashboard-executive.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Dashboard - داشبورد')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private s: DashboardService, private execService: DashboardExecutiveService) {}

  @Get('kpis')
  @RequirePermissions('dashboard.read')
  getKpis() { return this.s.getKpis(); }

  @Get('cash-flow')
  @RequirePermissions('dashboard.read')
  getCashFlow() { return this.s.getCashFlow(); }

  @Get('projects-progress')
  @RequirePermissions('dashboard.read')
  getProjectsProgress() { return this.s.getProjectsProgress(); }

  @Get('alerts')
  @RequirePermissions('dashboard.read')
  getAlerts() { return this.s.getAlerts(); }

  @Get('profit-loss')
  @RequirePermissions('dashboard.read')
  getProfitLoss() { return this.s.getProfitLoss(); }

  @Get('executive')
  executive() {
    return this.execService.executive();
  }
}
