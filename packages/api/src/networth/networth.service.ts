import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository, MoreThanOrEqual } from "typeorm"
import { Account, NetWorthSnapshot } from "../database/entities"

@Injectable()
export class NetworthService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(NetWorthSnapshot)
    private snapshotRepository: Repository<NetWorthSnapshot>
  ) {}

  async calculateNetWorth() {
    // Get total assets (positive balance accounts)
    const assetsResult = await this.accountRepository
      .createQueryBuilder("account")
      .select("COALESCE(SUM(account.currentBalance), 0)", "total")
      .where("account.type IN (:...types)", {
        types: ["depository", "investment", "brokerage"]
      })
      .getRawOne()

    // Get total liabilities (credit cards, loans)
    const liabilitiesResult = await this.accountRepository
      .createQueryBuilder("account")
      .select("COALESCE(SUM(ABS(account.currentBalance)), 0)", "total")
      .where("account.type IN (:...types)", { types: ["credit", "loan"] })
      .getRawOne()

    const totalAssets = parseFloat(assetsResult?.total) || 0
    const totalLiabilities = parseFloat(liabilitiesResult?.total) || 0
    const netWorth = totalAssets - totalLiabilities

    return {
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth
    }
  }

  async saveSnapshot() {
    const { total_assets, total_liabilities, net_worth } =
      await this.calculateNetWorth()

    const snapshot = this.snapshotRepository.create({
      totalAssets: total_assets,
      totalLiabilities: total_liabilities,
      netWorth: net_worth,
      snapshotDate: new Date()
    })

    await this.snapshotRepository.save(snapshot)
    return { success: true }
  }

  async getHistory(days: number = 90) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const snapshots = await this.snapshotRepository.find({
      where: {
        snapshotDate: MoreThanOrEqual(startDate)
      },
      order: {
        snapshotDate: "ASC"
      }
    })

    return snapshots.map((s) => ({
      snapshot_date: s.snapshotDate,
      total_assets: s.totalAssets,
      total_liabilities: s.totalLiabilities,
      net_worth: s.netWorth
    }))
  }
}
