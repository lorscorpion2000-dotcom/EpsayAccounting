import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PriceListService } from './price-list.service';
import {
  CreatePriceListDto, UpdatePriceListDto,
  CreatePriceListItemDto, UpdatePriceListItemDto,
  ImportItemsDto, LinkWbsDto,
} from './dto/price-list.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { PriceListStatus } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import type { AuthenticatedRequest } from '../auth/auth.controller';

@ApiTags('Price List - فهرست بها (BOQ)')
@ApiBearerAuth()
@Controller('price-lists')
export class PriceListController {
  constructor(private svc: PriceListService,
    private softDelete: SoftDeleteService,) {}

  // ═══ Price Lists ═══
  @Get()
  @RequirePermissions('price-list.read')
  list(
    @Query('year') year?: string,
    @Query('status', new ParseEnumPipe(PriceListStatus, { optional: true })) status?: PriceListStatus,
    @Query('search') search?: string,
  ) {
    return this.svc.list({
      year: year ? parseInt(year, 10) : undefined,
      status, search,
    });
  }

  @Get('stats')
  @RequirePermissions('price-list.read')
  stats() { return this.svc.stats(); }

  @Get(':id')
  @RequirePermissions('price-list.read')
  get(@Param('id') id: string) { return this.svc.get(id); }

  @Post()
  @RequirePermissions('price-list.manage')
  create(@Body() dto: CreatePriceListDto) { return this.svc.create(dto); }

  @Patch(':id')
  @RequirePermissions('price-list.manage')
  update(@Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('price-list.manage')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.remove(id, req.user?.id);
  }

  @Post(':id/publish')
  @RequirePermissions('price-list.manage')
  publish(@Param('id') id: string) { return this.svc.publish(id); }

  // ═══ Items ═══
  @Get(':id/items')
  @RequirePermissions('price-list.read')
  listItems(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('chapter') chapter?: string,
  ) { return this.svc.listItems(id, { search, chapter }); }

  @Post(':id/items')
  @RequirePermissions('price-list.manage')
  createItem(@Param('id') id: string, @Body() dto: CreatePriceListItemDto) {
    return this.svc.createItem(id, dto);
  }

  @Post(':id/items/import')
  @RequirePermissions('price-list.manage')
  importItems(@Param('id') id: string, @Body() dto: ImportItemsDto) {
    return this.svc.importItems(id, dto);
  }

  @Delete(':id/items/clear')
  @RequirePermissions('price-list.manage')
  clearItems(@Param('id') id: string) { return this.svc.clearItems(id); }

  @Get('items/:itemId')
  @RequirePermissions('price-list.read')
  getItem(@Param('itemId') itemId: string) { return this.svc.getItem(itemId); }

  @Patch('items/:itemId')
  @RequirePermissions('price-list.manage')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdatePriceListItemDto) {
    return this.svc.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('price-list.manage')
  removeItem(@Param('itemId') itemId: string) { return this.svc.removeItem(itemId); }

  // ═══ WBS Linking ═══
  @Get('wbs/:wbsItemId')
  @RequirePermissions('price-list.read')
  itemsForWbs(@Param('wbsItemId') wbsItemId: string) {
    return this.svc.itemsForWbs(wbsItemId);
  }

  @Get('project/:projectId/wbs-mapping')
  @RequirePermissions('price-list.read')
  projectWbsMapping(@Param('projectId') projectId: string) {
    return this.svc.projectWbsMapping(projectId);
  }

  @Patch('wbs/:wbsItemId/link')
  @RequirePermissions('price-list.manage')
  linkWbs(@Param('wbsItemId') wbsItemId: string, @Body() dto: LinkWbsDto) {
    return this.svc.linkWbs(wbsItemId, dto.priceListItemId);
  }

  // ═══ Admin Delete / Restore ═══
  @Delete(':id/admin')
  @RequirePermissions('price-lists.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user!;
    return this.softDelete.adminDelete({
      model: 'priceList',
      id,
      user,
      reason: body?.reason || '',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('price-lists.update')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user!;
    return this.softDelete.restore({
      model: 'priceList',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('price-lists.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'priceList',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }
}
