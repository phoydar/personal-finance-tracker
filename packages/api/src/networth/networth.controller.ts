import { Controller, Get, Post, Query } from '@nestjs/common';
import { NetworthService } from './networth.service';

@Controller('networth')
export class NetworthController {
  constructor(private readonly networthService: NetworthService) {}

  @Get()
  async getNetWorth() {
    return this.networthService.calculateNetWorth();
  }

  @Post('snapshot')
  async saveSnapshot() {
    return this.networthService.saveSnapshot();
  }

  @Get('history')
  async getHistory(@Query('days') days?: string) {
    return this.networthService.getHistory(days ? parseInt(days) : 90);
  }
}
