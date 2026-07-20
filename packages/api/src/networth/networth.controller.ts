import { Controller, Get, Post, Query, Request } from '@nestjs/common';
import { NetworthService } from './networth.service';

@Controller('networth')
export class NetworthController {
  constructor(private readonly networthService: NetworthService) {}

  @Get()
  async getNetWorth(@Request() req: any) {
    return this.networthService.calculateNetWorth(req.user.id);
  }

  @Post('snapshot')
  async saveSnapshot(@Request() req: any) {
    return this.networthService.saveSnapshot(req.user.id);
  }

  @Get('history')
  async getHistory(@Query('days') days?: string, @Request() req?: any) {
    return this.networthService.getHistory(days ? parseInt(days) : 90, req.user.id);
  }
}
