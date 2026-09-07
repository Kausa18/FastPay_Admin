export type AdminRole = 'support' | 'compliance' | 'finance' | 'operations' | 'super_admin'

export type AdminUser = {
  id?: string
  email: string
  fullName?: string
  role: AdminRole
  status?: 'active' | 'disabled'
  lastLoginAt?: string | null
  createdAt?: string
}

export type User = {
  id: string
  username: string
  fullName: string
  phoneNumber: string
  email: string
  accountType: 'personal' | 'merchant'
  status: string
  kycStatus: string
  createdAt: string
}

export type Transaction = {
  id: string
  idempotencyKey: string
  senderId: string
  receiverId: string
  type: string
  amountZmw: number
  feeZmw: number
  netAmountZmw: number
  network: string
  status: string
  reference?: string | null
  providerStatus?: string | null
  mnoReference?: string | null
  callbackReceivedAt?: string | null
  failureReason?: string | null
  senderAccountId?: string | null
  receiverAccountId?: string | null
  externalRecipient?: Record<string, unknown> | null
  initiatedAt: string
  completedAt?: string | null
  updatedAt: string
}

export type KycSubmission = {
  id: string
  userId: string
  username?: string
  fullLegalName: string
  dateOfBirth: string
  idType: string
  idNumber: string
  idDocumentPhoto: string
  selfiePhoto: string
  submittedAt: string
}

export type FraudFlag = {
  id: string
  userId: string
  transactionId?: string | null
  ruleTriggered: string
  riskScore: number
  details?: Record<string, unknown>
  status: string
  createdAt: string
}

export type AuditLog = {
  id: string
  adminEmail: string
  actorType: 'administrator' | 'user'
  actorUsername?: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}
