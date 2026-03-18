// SEC EDGAR API Response Types

export interface EdgarCompany {
  name: string;
  cik: string;
  sic: string;
  sicDescription: string;
  ticker: string;
  stateOfIncorporation: string;
  fiscalYearEnd: string;
  filerCategory: string;
}

export interface EdgarFiling {
  accessionNumber: string;
  filingDate: string;
  form: string;
  periodOfReport: string;
  primaryDocument?: string;
}

export interface EdgarSubmissionsResponse {
  company: EdgarCompany;
  filings: EdgarFiling[];
}

export interface EdgarFact {
  value: number;
  end: string;
  filed: string;
  form: string;
  fiscalYear: number;
  fiscalPeriod: string;
  accession: string;
  frame?: string;
}

export interface EdgarCompanyFactsResponse {
  cik: string;
  entityName: string;
  facts: Record<string, EdgarFact[]>;
  latestDocumentType?: string;
}

export interface EdgarCompanyConceptResponse {
  concept: string;
  label: string;
  description: string;
  values: EdgarFact[];
}

// Balance sheet row definition for EDGAR data mapping
export interface BalanceSheetRowDef {
  key: string;
  label: string;
  concept: string;
  indent: number;
  bold: boolean;
  borderTop?: string;
  sectionHeader?: string;
}

// Statement row definition (supports BS, IS, CF)
export interface StatementRowDef {
  key: string;
  label: string;
  concept: string;
  indent: number;
  bold: boolean;
  borderTop?: string;
  sectionHeader?: string;
  statement: "bs" | "is" | "cf";
  unitType?: "monetary" | "perShare" | "shares";
}

// Key XBRL concepts we track (all statements)
export const KEY_CONCEPTS = [
  // Balance Sheet
  "Assets",
  "AssetsCurrent",
  "CashAndCashEquivalentsAtCarryingValue",
  "ShortTermInvestments",
  "AccountsReceivableNetCurrent",
  "InventoryNet",
  "OtherAssetsCurrent",
  "PropertyPlantAndEquipmentNet",
  "OperatingLeaseRightOfUseAsset",
  "Goodwill",
  "OtherAssetsNoncurrent",
  "AccountsPayableCurrent",
  "AccruedLiabilitiesCurrent",
  "ContractWithCustomerLiabilityCurrent",
  "LiabilitiesCurrent",
  "LongTermDebt",
  "OperatingLeaseLiabilityNoncurrent",
  "OtherLiabilitiesNoncurrent",
  "Liabilities",
  "StockholdersEquity",
  "LiabilitiesAndStockholdersEquity",
  // Income Statement
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "CostOfRevenue",
  "CostOfGoodsAndServicesSold",
  "GrossProfit",
  "ResearchAndDevelopmentExpense",
  "SellingGeneralAndAdministrativeExpense",
  "SellingAndMarketingExpense",
  "GeneralAndAdministrativeExpense",
  "DepreciationAndAmortization",
  "OperatingExpenses",
  "OperatingIncomeLoss",
  "InterestExpense",
  "InvestmentIncomeInterest",
  "OtherNonoperatingIncomeExpense",
  "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
  "IncomeTaxExpenseBenefit",
  "NetIncomeLoss",
  "EarningsPerShareBasic",
  "EarningsPerShareDiluted",
  "WeightedAverageNumberOfShareOutstandingBasic",
  "WeightedAverageNumberOfDilutedSharesOutstanding",
  // Cash Flows
  "DepreciationDepletionAndAmortization",
  "ShareBasedCompensation",
  "IncreaseDecreaseInOperatingCapital",
  "NetCashProvidedByUsedInOperatingActivities",
  "PaymentsToAcquirePropertyPlantAndEquipment",
  "PaymentsToAcquireInvestments",
  "ProceedsFromSaleAndMaturityOfMarketableSecurities",
  "PaymentsToAcquireBusinessesNetOfCashAcquired",
  "NetCashProvidedByUsedInInvestingActivities",
  "PaymentsForRepurchaseOfCommonStock",
  "ProceedsFromIssuanceOfLongTermDebt",
  "RepaymentsOfLongTermDebt",
  "PaymentsOfDividends",
  "NetCashProvidedByUsedInFinancingActivities",
  "EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
  "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect",
  "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
  // Shares
  "CommonStockSharesOutstanding",
] as const;

export type KeyConcept = (typeof KEY_CONCEPTS)[number];
