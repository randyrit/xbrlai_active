-- ============================================
-- Seed US GAAP Taxonomy Elements
-- ============================================

INSERT INTO taxonomy_elements (id, label, data_type, period_type, balance, documentation, parent_group, sort_order) VALUES
-- DEI (Document & Entity Information)
('dei:EntityRegistrantName', 'Entity Registrant Name', 'normalizedStringItemType', 'duration', NULL, 'The exact name of the entity filing the report as specified in its charter.', 'dei', 1),
('dei:EntityCentralIndexKey', 'Entity Central Index Key (CIK)', 'centralIndexKeyItemType', 'duration', NULL, 'A unique 10-digit SEC-issued value to identify entities that have filed disclosures with the SEC.', 'dei', 2),
('dei:DocumentPeriodEndDate', 'Document Period End Date', 'dateItemType', 'duration', NULL, 'For the EDGAR submission types of Form 10-Q and 10-K, the end date of the period covered by the document.', 'dei', 3),
('dei:DocumentType', 'Document Type', 'normalizedStringItemType', 'duration', NULL, 'The type of document being provided (such as 10-K, 10-Q, 485BPOS, etc).', 'dei', 4),
('dei:DocumentFiscalYearFocus', 'Document Fiscal Year Focus', 'gYearItemType', 'duration', NULL, 'The fiscal year of the document.', 'dei', 5),
('dei:DocumentFiscalPeriodFocus', 'Document Fiscal Period Focus', 'fiscalPeriodItemType', 'duration', NULL, 'Fiscal period values are FY, Q1, Q2, and Q3.', 'dei', 6),
('dei:CurrentFiscalYearEndDate', 'Current Fiscal Year End Date', 'gMonthDayItemType', 'duration', NULL, 'End date of current fiscal year in --MM-DD format.', 'dei', 7),

-- Balance Sheet — Assets
('us-gaap:CashAndCashEquivalentsAtCarryingValue', 'Cash and Cash Equivalents', 'monetaryItemType', 'instant', 'debit', 'Amount of currency on hand as well as demand deposits with banks or financial institutions.', 'us-gaap-bs', 10),
('us-gaap:ShortTermInvestments', 'Short-term Investments', 'monetaryItemType', 'instant', 'debit', 'Investments which are intended to be sold in the short term (usually less than one year).', 'us-gaap-bs', 11),
('us-gaap:AccountsReceivableNetCurrent', 'Accounts Receivable, Net', 'monetaryItemType', 'instant', 'debit', 'Amount due from customers for goods and services delivered, reduced by an allowance for doubtful accounts.', 'us-gaap-bs', 12),
('us-gaap:InventoryNet', 'Inventories', 'monetaryItemType', 'instant', 'debit', 'Carrying amount of inventories, after valuation and LIFO reserves.', 'us-gaap-bs', 13),
('us-gaap:OtherAssetsCurrent', 'Other Current Assets', 'monetaryItemType', 'instant', 'debit', 'Amount of current assets classified as other.', 'us-gaap-bs', 14),
('us-gaap:AssetsCurrent', 'Total Current Assets', 'monetaryItemType', 'instant', 'debit', 'Sum of the carrying amounts of all current assets.', 'us-gaap-bs', 15),
('us-gaap:PropertyPlantAndEquipmentNet', 'Property and Equipment, Net', 'monetaryItemType', 'instant', 'debit', 'Amount after accumulated depreciation and amortization of physical assets used in the normal conduct of business.', 'us-gaap-bs', 16),
('us-gaap:OperatingLeaseRightOfUseAsset', 'Operating Lease Right-of-Use Assets', 'monetaryItemType', 'instant', 'debit', 'Amount of lessee operating lease right-of-use asset.', 'us-gaap-bs', 17),
('us-gaap:Goodwill', 'Goodwill', 'monetaryItemType', 'instant', 'debit', 'Amount after accumulated impairment loss of an asset representing future economic benefits from other assets acquired in a business combination.', 'us-gaap-bs', 18),
('us-gaap:Assets', 'Total Assets', 'monetaryItemType', 'instant', 'debit', 'Sum of the carrying amounts of all assets.', 'us-gaap-bs', 19),

-- Balance Sheet — Liabilities
('us-gaap:AccountsPayableCurrent', 'Accounts Payable', 'monetaryItemType', 'instant', 'credit', 'Carrying value of obligations incurred and payable for goods and services received.', 'us-gaap-bs', 20),
('us-gaap:AccruedLiabilitiesCurrent', 'Accrued Expenses', 'monetaryItemType', 'instant', 'credit', 'Carrying value of obligations incurred and payable, including accrued salaries and taxes.', 'us-gaap-bs', 21),
('us-gaap:ContractWithCustomerLiabilityCurrent', 'Unearned Revenue', 'monetaryItemType', 'instant', 'credit', 'Amount of obligation to transfer good or service for which consideration has been received.', 'us-gaap-bs', 22),
('us-gaap:LiabilitiesCurrent', 'Total Current Liabilities', 'monetaryItemType', 'instant', 'credit', 'Total obligations incurred as part of normal operations expected to be paid during the following twelve months.', 'us-gaap-bs', 23),
('us-gaap:LongTermDebt', 'Long-term Debt', 'monetaryItemType', 'instant', 'credit', 'Amount of long-term debt and capital lease obligations.', 'us-gaap-bs', 24),
('us-gaap:OperatingLeaseLiabilityNoncurrent', 'Operating Lease Liabilities (Non-current)', 'monetaryItemType', 'instant', 'credit', 'Present value of lessee operating lease liability, classified as noncurrent.', 'us-gaap-bs', 25),
('us-gaap:OtherLiabilitiesNoncurrent', 'Other Long-term Liabilities', 'monetaryItemType', 'instant', 'credit', 'Amount of liabilities classified as other, due after one year.', 'us-gaap-bs', 26),
('us-gaap:Liabilities', 'Total Liabilities', 'monetaryItemType', 'instant', 'credit', 'Sum of the carrying amounts of all liabilities.', 'us-gaap-bs', 27),
('us-gaap:StockholdersEquity', 'Stockholders'' Equity', 'monetaryItemType', 'instant', 'credit', 'Total of all stockholders equity items, net of receivables from officers and directors.', 'us-gaap-bs', 28),
('us-gaap:LiabilitiesAndStockholdersEquity', 'Total Liabilities and Stockholders'' Equity', 'monetaryItemType', 'instant', 'credit', 'Amount of liabilities and equity items.', 'us-gaap-bs', 29),

-- Income Statement
('us-gaap:Revenues', 'Revenues', 'monetaryItemType', 'duration', 'credit', 'Amount of revenue recognized from goods sold, services rendered, and other revenue sources.', 'us-gaap-is', 30),
('us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenue from Contracts with Customers', 'monetaryItemType', 'duration', 'credit', 'Amount of revenue from contracts with customers, excluding taxes collected.', 'us-gaap-is', 31),
('us-gaap:CostOfRevenue', 'Cost of Revenue', 'monetaryItemType', 'duration', 'debit', 'The aggregate cost of goods produced and sold and services rendered during the reporting period.', 'us-gaap-is', 32),
('us-gaap:GrossProfit', 'Gross Profit', 'monetaryItemType', 'duration', 'credit', 'Revenue less cost of revenue.', 'us-gaap-is', 33),
('us-gaap:OperatingIncomeLoss', 'Operating Income (Loss)', 'monetaryItemType', 'duration', 'credit', 'The net result from operating activities.', 'us-gaap-is', 34),
('us-gaap:NetIncomeLoss', 'Net Income (Loss)', 'monetaryItemType', 'duration', 'credit', 'The portion of profit or loss for the period attributable to the parent entity.', 'us-gaap-is', 35),
('us-gaap:EarningsPerShareBasic', 'Earnings Per Share, Basic', 'perShareItemType', 'duration', NULL, 'The amount of net income (loss) for the period per each share of common stock outstanding.', 'us-gaap-is', 36),
('us-gaap:EarningsPerShareDiluted', 'Earnings Per Share, Diluted', 'perShareItemType', 'duration', NULL, 'The amount of net income (loss) for the period per each share of common stock and dilutive equivalents.', 'us-gaap-is', 37),

-- Cash Flows
('us-gaap:NetCashProvidedByUsedInOperatingActivities', 'Net Cash from Operating Activities', 'monetaryItemType', 'duration', NULL, 'Amount of cash inflow (outflow) from operating activities.', 'us-gaap-cf', 40),
('us-gaap:NetCashProvidedByUsedInInvestingActivities', 'Net Cash from Investing Activities', 'monetaryItemType', 'duration', NULL, 'Amount of cash inflow (outflow) from investing activities.', 'us-gaap-cf', 41),
('us-gaap:NetCashProvidedByUsedInFinancingActivities', 'Net Cash from Financing Activities', 'monetaryItemType', 'duration', NULL, 'Amount of cash inflow (outflow) from financing activities.', 'us-gaap-cf', 42),
('us-gaap:CommonStockSharesOutstanding', 'Common Stock Shares Outstanding', 'sharesItemType', 'instant', NULL, 'Number of shares of common stock outstanding.', 'us-gaap-cf', 43)

ON CONFLICT (id) DO NOTHING;
