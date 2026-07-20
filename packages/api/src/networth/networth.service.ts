import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository, MoreThanOrEqual, Between, LessThanOrEqual } from "typeorm"
import {
  Account,
  NetWorthSnapshot,
  AccountBalanceSnapshot
} from "../database/entities"

@Injectable()
export class NetworthService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(NetWorthSnapshot)
    private snapshotRepository: Repository<NetWorthSnapshot>,
    @InjectRepository(AccountBalanceSnapshot)
    private accountBalanceSnapshotRepository: Repository<AccountBalanceSnapshot>
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

    const savedSnapshot = await this.snapshotRepository.save(snapshot)

    // Save individual account balances
    const accounts = await this.accountRepository.find({
      relations: ["item"]
    })

    const accountBalanceSnapshots = accounts.map((account) =>
      this.accountBalanceSnapshotRepository.create({
        snapshotId: savedSnapshot.id,
        accountId: account.id,
        balance: account.currentBalance,
        accountType: account.type,
        accountName: account.name || account.officialName
      })
    )

    if (accountBalanceSnapshots.length > 0) {
      await this.accountBalanceSnapshotRepository.save(accountBalanceSnapshots)
    }

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

  async getCompositionTrends(
    options: {
      days?: number
      startDate?: string
      endDate?: string
    } = {}
  ) {
    const { days, startDate, endDate } = options

    let whereCondition: any = {}

    if (startDate && endDate) {
      whereCondition.snapshotDate = Between(
        new Date(startDate),
        new Date(endDate)
      )
    } else if (startDate) {
      whereCondition.snapshotDate = MoreThanOrEqual(new Date(startDate))
    } else if (endDate) {
      whereCondition.snapshotDate = LessThanOrEqual(new Date(endDate))
    } else if (days) {
      const start = new Date()
      start.setDate(start.getDate() - days)
      whereCondition.snapshotDate = MoreThanOrEqual(start)
    }

    const snapshots = await this.snapshotRepository.find({
      where:
        Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      order: {
        snapshotDate: "ASC"
      }
    })

    // Calculate period changes
    let assetChange = 0
    let assetChangePercent = 0
    let liabilityChange = 0
    let liabilityChangePercent = 0

    if (snapshots.length >= 2) {
      const first = snapshots[0]
      const last = snapshots[snapshots.length - 1]

      const firstAssets = parseFloat(String(first.totalAssets)) || 0
      const lastAssets = parseFloat(String(last.totalAssets)) || 0
      const firstLiabilities = parseFloat(String(first.totalLiabilities)) || 0
      const lastLiabilities = parseFloat(String(last.totalLiabilities)) || 0

      assetChange = lastAssets - firstAssets
      assetChangePercent =
        firstAssets !== 0 ? (assetChange / firstAssets) * 100 : 0

      liabilityChange = lastLiabilities - firstLiabilities
      liabilityChangePercent =
        firstLiabilities !== 0 ? (liabilityChange / firstLiabilities) * 100 : 0
    }

    return {
      data: snapshots.map((s) => ({
        date: s.snapshotDate,
        assets: parseFloat(String(s.totalAssets)) || 0,
        liabilities: parseFloat(String(s.totalLiabilities)) || 0,
        net_worth: parseFloat(String(s.netWorth)) || 0
      })),
      changes: {
        asset_change: assetChange,
        asset_change_percent: assetChangePercent,
        liability_change: liabilityChange,
        liability_change_percent: liabilityChangePercent
      }
    }
  }

  async getAccountTrends(
    options: {
      accountId?: string
      days?: number
      startDate?: string
      endDate?: string
    } = {}
  ) {
    const { accountId, days, startDate, endDate } = options

    // Build query for snapshots within date range
    let snapshotWhereCondition: any = {}

    if (startDate && endDate) {
      snapshotWhereCondition.snapshotDate = Between(
        new Date(startDate),
        new Date(endDate)
      )
    } else if (startDate) {
      snapshotWhereCondition.snapshotDate = MoreThanOrEqual(new Date(startDate))
    } else if (endDate) {
      snapshotWhereCondition.snapshotDate = LessThanOrEqual(new Date(endDate))
    } else if (days) {
      const start = new Date()
      start.setDate(start.getDate() - days)
      snapshotWhereCondition.snapshotDate = MoreThanOrEqual(start)
    }

    // Get snapshots in date range
    const snapshots = await this.snapshotRepository.find({
      where:
        Object.keys(snapshotWhereCondition).length > 0
          ? snapshotWhereCondition
          : undefined,
      order: {
        snapshotDate: "ASC"
      }
    })

    if (snapshots.length === 0) {
      return { data: [], accounts: [] }
    }

    const snapshotIds = snapshots.map((s) => s.id)

    // Build query for account balances
    let query = this.accountBalanceSnapshotRepository
      .createQueryBuilder("abs")
      .innerJoin("net_worth_history", "nwh", "abs.snapshot_id = nwh.id")
      .where("abs.snapshot_id IN (:...snapshotIds)", { snapshotIds })
      .orderBy("nwh.snapshot_date", "ASC")

    if (accountId) {
      query = query.andWhere("abs.account_id = :accountId", { accountId })
    }

    const balances = await query
      .select([
        "abs.account_id as account_id",
        "abs.account_name as account_name",
        "abs.account_type as account_type",
        "abs.balance as balance",
        "nwh.snapshot_date as date"
      ])
      .getRawMany()

    // Get unique accounts
    const accountsMap = new Map<
      string,
      { id: string; name: string; type: string }
    >()
    balances.forEach((b) => {
      if (!accountsMap.has(b.account_id)) {
        accountsMap.set(b.account_id, {
          id: b.account_id,
          name: b.account_name,
          type: b.account_type
        })
      }
    })

    // Group balances by date for chart data
    const dateMap = new Map<string, any>()
    balances.forEach((b) => {
      const dateKey = new Date(b.date).toISOString().split("T")[0]
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: b.date })
      }
      const entry = dateMap.get(dateKey)
      entry[b.account_id] = parseFloat(b.balance) || 0
    })

    return {
      data: Array.from(dateMap.values()),
      accounts: Array.from(accountsMap.values())
    }
  }
}
