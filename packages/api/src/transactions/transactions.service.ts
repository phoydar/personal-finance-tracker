import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Transaction } from "../database/entities"

export interface TransactionFilters {
  account_id?: string
  start_date?: string
  end_date?: string
  search?: string
  category?: string
  limit?: number
  offset?: number
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>
  ) {}

  async findAll(filters: TransactionFilters) {
    const {
      account_id,
      start_date,
      end_date,
      search,
      category,
      limit = 100,
      offset = 0
    } = filters

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.account", "account")
      .leftJoin("account.item", "item")
      .addSelect(["item.institutionName"])

    if (account_id) {
      queryBuilder.andWhere("transaction.accountId = :account_id", {
        account_id
      })
    }

    if (start_date) {
      queryBuilder.andWhere("transaction.date >= :start_date", { start_date })
    }

    if (end_date) {
      queryBuilder.andWhere("transaction.date <= :end_date", { end_date })
    }

    if (search) {
      queryBuilder.andWhere(
        "(transaction.name ILIKE :search OR transaction.merchantName ILIKE :search)",
        { search: `%${search}%` }
      )
    }

    if (category) {
      queryBuilder.andWhere("transaction.category = :category", { category })
    }

    // Get total count
    const total = await queryBuilder.getCount()

    // Get paginated results
    const transactions = await queryBuilder
      .orderBy("transaction.date", "DESC")
      .addOrderBy("transaction.createdAt", "DESC")
      .skip(offset)
      .take(limit)
      .getMany()

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        account_id: t.accountId,
        amount: t.amount,
        date: t.date,
        name: t.name,
        merchant_name: t.merchantName,
        category: t.category,
        pending: t.pending,
        iso_currency_code: t.isoCurrencyCode,
        created_at: t.createdAt,
        account_name: t.account?.name,
        institution_name: t.account?.item?.institutionName
      })),
      total,
      limit,
      offset
    }
  }

  async getSpendingByCategory(filters: {
    start_date?: string
    end_date?: string
  }) {
    const { start_date, end_date } = filters

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .select("transaction.category", "category")
      .addSelect("SUM(transaction.amount)", "total")
      .where("transaction.amount > 0")
      .andWhere("transaction.pending = false")

    if (start_date) {
      queryBuilder.andWhere("transaction.date >= :start_date", { start_date })
    }

    if (end_date) {
      queryBuilder.andWhere("transaction.date <= :end_date", { end_date })
    }

    const results = await queryBuilder
      .groupBy("transaction.category")
      .orderBy("total", "DESC")
      .getRawMany()

    return results.map((r) => ({
      category: r.category,
      total: parseFloat(r.total) || 0
    }))
  }

  async getIncome(filters: { start_date?: string; end_date?: string }) {
    const { start_date, end_date } = filters

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.account", "account")
      .where("transaction.amount < 0")
      .andWhere("transaction.pending = false")

    if (start_date) {
      queryBuilder.andWhere("transaction.date >= :start_date", { start_date })
    }

    if (end_date) {
      queryBuilder.andWhere("transaction.date <= :end_date", { end_date })
    }

    const transactions = await queryBuilder
      .orderBy("transaction.date", "DESC")
      .getMany()

    // Calculate total income
    const total = transactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    )

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        account_id: t.accountId,
        amount: t.amount,
        date: t.date,
        name: t.name,
        merchant_name: t.merchantName,
        category: t.category,
        account_name: t.account?.name
      })),
      total
    }
  }
}
