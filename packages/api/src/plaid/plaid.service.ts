import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode
} from "plaid"
import { v4 as uuidv4 } from "uuid"
import { Item, Account, Transaction, Liability } from "../database/entities"

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name)
  private readonly client: PlaidApi

  constructor(
    private configService: ConfigService,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Liability)
    private liabilityRepository: Repository<Liability>
  ) {
    const configuration = new Configuration({
      basePath:
        PlaidEnvironments[
          this.configService.get<string>("PLAID_ENV", "sandbox")
        ],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": this.configService.get<string>("PLAID_CLIENT_ID"),
          "PLAID-SECRET": this.configService.get<string>("PLAID_SECRET"),
          "Plaid-Version": "2020-09-14"
        }
      }
    })
    this.client = new PlaidApi(configuration)
  }

  async createLinkToken(): Promise<{ link_token: string }> {
    const redirectUri = this.configService.get<string>("PLAID_REDIRECT_URI")

    const config: any = {
      user: { client_user_id: uuidv4() },
      client_name: "Personal Finance Tracker",
      language: "en",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us]
    }

    // Only add redirect_uri if explicitly set (for OAuth flow)
    // If not using OAuth, don't include it at all
    if (redirectUri && redirectUri.trim() !== "") {
      // Normalize the redirect URI (remove trailing slash for consistency)
      const normalizedUri = redirectUri.replace(/\/$/, "")
      config.redirect_uri = redirectUri
      this.logger.log(`Creating link token with redirect_uri: ${normalizedUri}`)
    } else {
      this.logger.log(
        "Creating link token WITHOUT redirect_uri (standard flow)"
      )
    }

    try {
      const response = await this.client.linkTokenCreate(config)
      return { link_token: response.data.link_token }
    } catch (error: any) {
      this.logger.error(
        "Failed to create link token:",
        error.response?.data || error.message
      )
      throw error
    }
  }

  async exchangePublicToken(
    publicToken: string,
    institution?: { institution_id?: string; name?: string }
  ): Promise<{ item_id: string }> {
    if (!publicToken || publicToken.trim() === "") {
      throw new Error("public_token is required and cannot be empty")
    }

    console.log(
      "PlaidService.exchangePublicToken - publicToken received:",
      publicToken ? "present" : "missing"
    )

    const exchangeResponse = await this.client.itemPublicTokenExchange({
      public_token: publicToken
    })

    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id

    // Save item to database
    const item = this.itemRepository.create({
      id: itemId,
      accessToken,
      institutionId: institution?.institution_id || null,
      institutionName: institution?.name || null
    })
    await this.itemRepository.save(item)

    // Fetch and save accounts
    await this.syncAccounts(itemId, accessToken)

    return { item_id: itemId }
  }

  private async syncAccounts(
    itemId: string,
    accessToken: string
  ): Promise<void> {
    const accountsResponse = await this.client.accountsGet({
      access_token: accessToken
    })

    for (const acct of accountsResponse.data.accounts) {
      const account = this.accountRepository.create({
        id: acct.account_id,
        itemId,
        name: acct.name,
        officialName: acct.official_name,
        type: acct.type,
        subtype: acct.subtype,
        mask: acct.mask,
        currentBalance: acct.balances.current,
        availableBalance: acct.balances.available,
        creditLimit: acct.balances.limit,
        isoCurrencyCode: acct.balances.iso_currency_code
      })
      await this.accountRepository.save(account)
    }
  }

  async syncTransactions(): Promise<{
    added: number
    modified: number
    removed: number
  }> {
    const items = await this.itemRepository.find()
    let totalAdded = 0
    let totalModified = 0
    let totalRemoved = 0

    for (const item of items) {
      try {
        const result = await this.syncItemTransactions(item)
        totalAdded += result.added
        totalModified += result.modified
        totalRemoved += result.removed
      } catch (error) {
        this.logger.error(
          `Error syncing transactions for item ${item.id}:`,
          error
        )
      }
    }

    return { added: totalAdded, modified: totalModified, removed: totalRemoved }
  }

  private async syncItemTransactions(
    item: Item
  ): Promise<{ added: number; modified: number; removed: number }> {
    let cursor = item.cursor
    let hasMore = true
    let added = 0
    let modified = 0
    let removed = 0

    while (hasMore) {
      const response = await this.client.transactionsSync({
        access_token: item.accessToken,
        cursor: cursor || undefined
      })

      const data = response.data

      // Wait if no data yet (first sync can take time)
      if (!cursor && data.added.length === 0 && data.modified.length === 0) {
        await this.sleep(2000)
        continue
      }

      // Process added transactions
      for (const txn of data.added) {
        const transaction = this.transactionRepository.create({
          id: txn.transaction_id,
          accountId: txn.account_id,
          amount: txn.amount,
          date: txn.date ? new Date(txn.date) : null,
          name: txn.name,
          merchantName: txn.merchant_name,
          category:
            txn.personal_finance_category?.primary || txn.category?.[0] || null,
          pending: txn.pending,
          isoCurrencyCode: txn.iso_currency_code
        })
        await this.transactionRepository.save(transaction)
        added++
      }

      // Process modified transactions
      for (const txn of data.modified) {
        await this.transactionRepository.update(txn.transaction_id, {
          amount: txn.amount,
          name: txn.name,
          merchantName: txn.merchant_name,
          category:
            txn.personal_finance_category?.primary || txn.category?.[0] || null,
          pending: txn.pending
        })
        modified++
      }

      // Process removed transactions
      for (const removedTxn of data.removed) {
        await this.transactionRepository.delete(removedTxn.transaction_id)
        removed++
      }

      cursor = data.next_cursor
      hasMore = data.has_more

      // Update cursor in database
      await this.itemRepository.update(item.id, { cursor })
    }

    return { added, modified, removed }
  }

  async refreshBalances(): Promise<void> {
    const items = await this.itemRepository.find()

    for (const item of items) {
      try {
        const balanceResponse = await this.client.accountsBalanceGet({
          access_token: item.accessToken
        })

        for (const acct of balanceResponse.data.accounts) {
          await this.accountRepository.update(acct.account_id, {
            currentBalance: acct.balances.current,
            availableBalance: acct.balances.available,
            creditLimit: acct.balances.limit
          })
        }
      } catch (error) {
        this.logger.error(
          `Error refreshing balances for item ${item.id}:`,
          error
        )
      }
    }
  }

  async syncLiabilities(): Promise<void> {
    const items = await this.itemRepository.find()

    for (const item of items) {
      try {
        const liabilitiesResponse = await this.client.liabilitiesGet({
          access_token: item.accessToken
        })

        const { credit, mortgage, student } =
          liabilitiesResponse.data.liabilities

        // Process credit card liabilities
        if (credit) {
          for (const card of credit) {
            if (!card.account_id) continue
            const liability = this.liabilityRepository.create({
              accountId: card.account_id,
              type: "credit",
              apr: card.aprs?.[0]?.apr_percentage || null,
              minimumPayment: card.minimum_payment_amount,
              nextPaymentDueDate: card.next_payment_due_date
                ? new Date(card.next_payment_due_date)
                : null,
              lastStatementBalance: card.last_statement_balance,
              lastStatementDate: card.last_statement_issue_date
                ? new Date(card.last_statement_issue_date)
                : null
            })
            await this.liabilityRepository.save(liability)
          }
        }

        // Process mortgage liabilities
        if (mortgage) {
          for (const loan of mortgage) {
            if (!loan.account_id) continue
            const liability = this.liabilityRepository.create({
              accountId: loan.account_id,
              type: "mortgage",
              apr: loan.interest_rate?.percentage || null,
              minimumPayment: loan.next_monthly_payment,
              nextPaymentDueDate: loan.next_payment_due_date
                ? new Date(loan.next_payment_due_date)
                : null
            })
            await this.liabilityRepository.save(liability)
          }
        }

        // Process student loan liabilities
        if (student) {
          for (const loan of student) {
            if (!loan.account_id) continue
            const liability = this.liabilityRepository.create({
              accountId: loan.account_id,
              type: "student",
              apr: loan.interest_rate_percentage,
              minimumPayment: loan.minimum_payment_amount,
              nextPaymentDueDate: loan.next_payment_due_date
                ? new Date(loan.next_payment_due_date)
                : null
            })
            await this.liabilityRepository.save(liability)
          }
        }
      } catch (error) {
        this.logger.log(
          `Could not fetch liabilities for item ${item.id}:`,
          error
        )
      }
    }
  }

  async removeItem(itemId: string): Promise<void> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } })

    if (item) {
      try {
        await this.client.itemRemove({ access_token: item.accessToken })
      } catch (error) {
        this.logger.warn(`Could not remove item from Plaid: ${error}`)
      }
      await this.itemRepository.delete(itemId)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
