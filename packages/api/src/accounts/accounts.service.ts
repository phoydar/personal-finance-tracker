import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Item, Account, Liability } from "../database/entities"

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Liability)
    private liabilityRepository: Repository<Liability>
  ) {}

  async findAllItems() {
    const items = await this.itemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.accounts", "account")
      .orderBy("item.createdAt", "DESC")
      .getMany()

    return items.map((item) => ({
      id: item.id,
      institution_id: item.institutionId,
      institution_name: item.institutionName,
      created_at: item.createdAt,
      accounts: item.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        official_name: account.officialName,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        current_balance: account.currentBalance,
        available_balance: account.availableBalance,
        credit_limit: account.creditLimit
      }))
    }))
  }

  async findAllAccounts() {
    const accounts = await this.accountRepository
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.item", "item")
      .orderBy("item.institutionName", "ASC")
      .addOrderBy("account.name", "ASC")
      .getMany()

    return accounts.map((account) => ({
      id: account.id,
      item_id: account.itemId,
      name: account.name,
      official_name: account.officialName,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      current_balance: account.currentBalance,
      available_balance: account.availableBalance,
      credit_limit: account.creditLimit,
      iso_currency_code: account.isoCurrencyCode,
      updated_at: account.updatedAt,
      institution_name: account.item?.institutionName
    }))
  }

  async findAllLiabilities() {
    const liabilities = await this.liabilityRepository
      .createQueryBuilder("liability")
      .leftJoinAndSelect("liability.account", "account")
      .leftJoin("account.item", "item")
      .addSelect(["item.institutionName"])
      .orderBy("account.currentBalance", "DESC")
      .getMany()

    return liabilities.map((liability) => ({
      account_id: liability.accountId,
      account_name: liability.account?.name,
      current_balance: liability.account?.currentBalance,
      institution_name: liability.account?.item?.institutionName,
      type: liability.type,
      apr: liability.apr,
      minimum_payment: liability.minimumPayment,
      next_payment_due_date: liability.nextPaymentDueDate,
      last_statement_balance: liability.lastStatementBalance,
      last_statement_date: liability.lastStatementDate,
      updated_at: liability.updatedAt
    }))
  }

  async updateAccountName(accountId: string, name: string) {
    const account = await this.accountRepository.findOne({
      where: { id: accountId }
    })

    if (!account) {
      return null
    }

    account.name = name
    await this.accountRepository.save(account)

    return {
      id: account.id,
      name: account.name
    }
  }
}
