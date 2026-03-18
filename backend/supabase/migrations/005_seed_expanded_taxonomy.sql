-- ============================================
-- Expand taxonomy with Income Statement & Cash Flow concepts
-- ============================================

INSERT INTO taxonomy_elements (id, label, data_type, period_type, balance, documentation, parent_group, sort_order) VALUES

-- Income Statement — Operating Expenses
('us-gaap:CostOfGoodsAndServicesSold', 'Cost of Goods and Services Sold', 'monetaryItemType', 'duration', 'debit', 'The aggregate costs related to goods produced and sold and services rendered.', 'us-gaap-is', 32),
('us-gaap:ResearchAndDevelopmentExpense', 'Research and Development Expense', 'monetaryItemType', 'duration', 'debit', 'Costs incurred for research and development activities.', 'us-gaap-is', 38),
('us-gaap:SellingGeneralAndAdministrativeExpense', 'Selling, General and Administrative Expense', 'monetaryItemType', 'duration', 'debit', 'The aggregate total costs related to selling a product or service and expenses of managing and administering the enterprise.', 'us-gaap-is', 39),
('us-gaap:SellingAndMarketingExpense', 'Selling and Marketing Expense', 'monetaryItemType', 'duration', 'debit', 'Total costs relating to selling and marketing activities.', 'us-gaap-is', 40),
('us-gaap:GeneralAndAdministrativeExpense', 'General and Administrative Expense', 'monetaryItemType', 'duration', 'debit', 'General and administrative expenses not elsewhere specified.', 'us-gaap-is', 41),
('us-gaap:DepreciationAndAmortization', 'Depreciation and Amortization', 'monetaryItemType', 'duration', 'debit', 'Depreciation and amortization for the reporting period.', 'us-gaap-is', 42),
('us-gaap:OperatingExpenses', 'Total Operating Expenses', 'monetaryItemType', 'duration', 'debit', 'Generally recurring costs associated with normal operations.', 'us-gaap-is', 43),

-- Income Statement — Other Income/Expense
('us-gaap:InterestExpense', 'Interest Expense', 'monetaryItemType', 'duration', 'debit', 'Amount of the cost of borrowed funds accounted for as interest expense.', 'us-gaap-is', 44),
('us-gaap:InvestmentIncomeInterest', 'Interest Income', 'monetaryItemType', 'duration', 'credit', 'Amount of investment income earned from interest.', 'us-gaap-is', 45),
('us-gaap:OtherNonoperatingIncomeExpense', 'Other Non-operating Income (Expense)', 'monetaryItemType', 'duration', 'credit', 'Amount of income (expense) related to nonoperating activities.', 'us-gaap-is', 46),
('us-gaap:IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest', 'Income Before Income Taxes', 'monetaryItemType', 'duration', 'credit', 'Amount of income (loss) from continuing operations before deduction of income tax expense.', 'us-gaap-is', 47),
('us-gaap:IncomeTaxExpenseBenefit', 'Income Tax Expense (Benefit)', 'monetaryItemType', 'duration', 'debit', 'Amount of current and deferred income tax expense (benefit).', 'us-gaap-is', 48),

-- Income Statement — Share Data
('us-gaap:WeightedAverageNumberOfShareOutstandingBasic', 'Weighted Average Shares Outstanding — Basic', 'sharesItemType', 'duration', NULL, 'Number of basic weighted-average shares outstanding during the period.', 'us-gaap-is', 49),
('us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding', 'Weighted Average Shares Outstanding — Diluted', 'sharesItemType', 'duration', NULL, 'Number of diluted weighted-average shares outstanding during the period.', 'us-gaap-is', 50),

-- Cash Flow Statement — Operating Adjustments
('us-gaap:DepreciationDepletionAndAmortization', 'Depreciation, Depletion and Amortization', 'monetaryItemType', 'duration', 'debit', 'Total depreciation, depletion, and amortization (including asset retirement obligation).', 'us-gaap-cf', 51),
('us-gaap:ShareBasedCompensation', 'Stock-Based Compensation', 'monetaryItemType', 'duration', 'debit', 'Amount of noncash expense for share-based payment arrangement.', 'us-gaap-cf', 52),
('us-gaap:IncreaseDecreaseInOperatingCapital', 'Changes in Operating Assets and Liabilities', 'monetaryItemType', 'duration', 'credit', 'Net change during the reporting period in operating assets and liabilities.', 'us-gaap-cf', 53),

-- Cash Flow Statement — Investing Activities
('us-gaap:PaymentsToAcquirePropertyPlantAndEquipment', 'Purchases of Property and Equipment', 'monetaryItemType', 'duration', 'credit', 'Cash outflow for acquisition of long-lived physical assets.', 'us-gaap-cf', 54),
('us-gaap:PaymentsToAcquireInvestments', 'Purchases of Investments', 'monetaryItemType', 'duration', 'credit', 'Cash outflow for acquisition of investments.', 'us-gaap-cf', 55),
('us-gaap:ProceedsFromSaleAndMaturityOfMarketableSecurities', 'Proceeds from Investments', 'monetaryItemType', 'duration', 'debit', 'Cash inflow from sale and maturity of marketable securities.', 'us-gaap-cf', 56),
('us-gaap:PaymentsToAcquireBusinessesNetOfCashAcquired', 'Acquisitions, Net of Cash', 'monetaryItemType', 'duration', 'credit', 'Cash outflow for acquisition of businesses, net of cash acquired.', 'us-gaap-cf', 57),

-- Cash Flow Statement — Financing Activities
('us-gaap:PaymentsForRepurchaseOfCommonStock', 'Repurchases of Common Stock', 'monetaryItemType', 'duration', 'credit', 'Cash outflow for common stock repurchases.', 'us-gaap-cf', 58),
('us-gaap:ProceedsFromIssuanceOfLongTermDebt', 'Proceeds from Debt Issuance', 'monetaryItemType', 'duration', 'debit', 'Cash inflow from issuance of long-term debt.', 'us-gaap-cf', 59),
('us-gaap:RepaymentsOfLongTermDebt', 'Repayment of Long-Term Debt', 'monetaryItemType', 'duration', 'credit', 'Cash outflow for repayment of long-term debt.', 'us-gaap-cf', 60),
('us-gaap:PaymentsOfDividends', 'Dividends Paid', 'monetaryItemType', 'duration', 'credit', 'Cash outflow for dividends paid.', 'us-gaap-cf', 61),

-- Cash Flow Statement — FX and Net Change
('us-gaap:EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Effect of Exchange Rate Changes on Cash', 'monetaryItemType', 'duration', NULL, 'Amount of increase (decrease) from effect of exchange rate changes on cash and equivalents.', 'us-gaap-cf', 62),
('us-gaap:CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect', 'Net Change in Cash and Equivalents', 'monetaryItemType', 'duration', NULL, 'Amount of increase (decrease) in cash, equivalents, and restricted cash including exchange rate effect.', 'us-gaap-cf', 63),
('us-gaap:CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash and Equivalents at End of Period', 'monetaryItemType', 'instant', 'debit', 'Amount of cash, equivalents, and restricted cash reported on the balance sheet.', 'us-gaap-cf', 64)

ON CONFLICT (id) DO NOTHING;
