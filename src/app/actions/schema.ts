import { z } from 'zod'
import { AccountType, RuleInterval } from '@prisma/client'

export const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.nativeEnum(AccountType),
  balance: z.number(),
  currency: z.string().length(3).default('USD'),
})

export const DeleteAccountSchema = z.string().uuid()

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().uuid().optional(),
  monthlyTarget: z.number().optional(),
  rolloverEnabled: z.boolean().optional(),
})

export const UpdateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  color: z.string().optional(),
  icon: z.string().optional(),
  monthlyTarget: z.number().optional(),
  rolloverEnabled: z.boolean().optional(),
})

export const CreateTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  amount: z.number(),
  date: z.date(),
  description: z.string().max(500).optional().default(''),
  merchant: z.string().min(1, 'Merchant name is required').max(200),
  pendingStatus: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

export const UpdateTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  amount: z.number().optional(),
  date: z.date().optional(),
  description: z.string().max(500).optional(),
  merchant: z.string().max(200).optional(),
  pendingStatus: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

export const SplitTransactionSchema = z.array(
  z.object({
    categoryId: z.string().uuid().nullable(),
    amount: z.number(),
    description: z.string().optional().default(''),
  })
)

export const CreateRecurringRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100),
  interval: z.nativeEnum(RuleInterval),
  amount: z.number(),
  nextExpectedDate: z.date(),
  matchingMerchant: z.string(),
  categoryId: z.string().uuid().optional(),
})

export const UpdateRecurringRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100).optional(),
  interval: z.nativeEnum(RuleInterval).optional(),
  amount: z.number().optional(),
  nextExpectedDate: z.date().optional(),
  matchingMerchant: z.string().optional(),
  categoryId: z.string().uuid().optional(),
})
