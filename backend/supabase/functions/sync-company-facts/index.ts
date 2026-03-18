import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EDGAR_BASE = "https://data.sec.gov";
const USER_AGENT = Deno.env.get("EDGAR_USER_AGENT") || "TaglineAI admin@tagline.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function padCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

// Format number as dollar string (in millions)
function formatMillions(val: number): string {
  const millions = Math.round(val / 1000000);
  return "$" + millions.toLocaleString("en-US");
}

// Format per-share values
function formatPerShare(val: number): string {
  return "$" + val.toFixed(2);
}

// Format share counts (in millions)
function formatSharesMillions(val: number): string {
  const millions = Math.round(val / 1000000);
  return millions.toLocaleString("en-US");
}

// ── Statement Row Definitions ──

interface RowDef {
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

const statementRows: RowDef[] = [
  // ═══ BALANCE SHEET ═══
  { key: "bs-r1",  label: "Cash and cash equivalents",                concept: "CashAndCashEquivalentsAtCarryingValue", indent: 1, bold: false, statement: "bs" },
  { key: "bs-r2",  label: "Short-term investments",                   concept: "ShortTermInvestments",                  indent: 1, bold: false, statement: "bs" },
  { key: "bs-r3",  label: "Accounts receivable, net",                 concept: "AccountsReceivableNetCurrent",          indent: 1, bold: false, statement: "bs" },
  { key: "bs-r4",  label: "Inventories",                              concept: "InventoryNet",                          indent: 1, bold: false, statement: "bs" },
  { key: "bs-r5",  label: "Other current assets",                     concept: "OtherAssetsCurrent",                    indent: 1, bold: false, statement: "bs" },
  { key: "bs-r6",  label: "Total current assets",                     concept: "AssetsCurrent",                         indent: 0, bold: true,  borderTop: "single", statement: "bs" },
  { key: "bs-r7",  label: "Property and equipment, net",              concept: "PropertyPlantAndEquipmentNet",          indent: 1, bold: false, statement: "bs" },
  { key: "bs-r8",  label: "Operating lease right-of-use assets",      concept: "OperatingLeaseRightOfUseAsset",         indent: 1, bold: false, statement: "bs" },
  { key: "bs-r9",  label: "Goodwill",                                 concept: "Goodwill",                              indent: 1, bold: false, statement: "bs" },
  { key: "bs-r10", label: "Other assets",                             concept: "OtherAssetsNoncurrent",                 indent: 1, bold: false, statement: "bs" },
  { key: "bs-r11", label: "Total assets",                             concept: "Assets",                                indent: 0, bold: true,  borderTop: "double", sectionHeader: "ASSETS", statement: "bs" },
  { key: "bs-r12", label: "Accounts payable",                         concept: "AccountsPayableCurrent",                indent: 1, bold: false, statement: "bs" },
  { key: "bs-r13", label: "Accrued expenses",                         concept: "AccruedLiabilitiesCurrent",             indent: 1, bold: false, statement: "bs" },
  { key: "bs-r14", label: "Unearned revenue",                         concept: "ContractWithCustomerLiabilityCurrent",  indent: 1, bold: false, statement: "bs" },
  { key: "bs-r15", label: "Total current liabilities",                concept: "LiabilitiesCurrent",                    indent: 0, bold: true,  borderTop: "single", statement: "bs" },
  { key: "bs-r16", label: "Long-term debt",                           concept: "LongTermDebt",                          indent: 1, bold: false, statement: "bs" },
  { key: "bs-r17", label: "Operating lease liabilities",              concept: "OperatingLeaseLiabilityNoncurrent",     indent: 1, bold: false, statement: "bs" },
  { key: "bs-r18", label: "Other long-term liabilities",              concept: "OtherLiabilitiesNoncurrent",            indent: 1, bold: false, statement: "bs" },
  { key: "bs-r19", label: "Total liabilities",                        concept: "Liabilities",                           indent: 0, bold: true,  borderTop: "single", sectionHeader: "LIABILITIES AND STOCKHOLDERS' EQUITY", statement: "bs" },
  { key: "bs-r20", label: "Stockholders' equity",                     concept: "StockholdersEquity",                    indent: 0, bold: true,  statement: "bs" },
  { key: "bs-r21", label: "Total liabilities and stockholders' equity", concept: "LiabilitiesAndStockholdersEquity",   indent: 0, bold: true,  borderTop: "double", statement: "bs" },

  // ═══ INCOME STATEMENT ═══
  { key: "is-r1",  label: "Revenue",                                  concept: "RevenueFromContractWithCustomerExcludingAssessedTax", indent: 0, bold: true, sectionHeader: "REVENUE", statement: "is" },
  { key: "is-r1b", label: "Total revenues",                           concept: "Revenues",                              indent: 0, bold: true,  statement: "is" },
  { key: "is-r2",  label: "Cost of revenue",                          concept: "CostOfRevenue",                         indent: 1, bold: false, statement: "is" },
  { key: "is-r3",  label: "Cost of goods sold",                       concept: "CostOfGoodsAndServicesSold",            indent: 1, bold: false, statement: "is" },
  { key: "is-r4",  label: "Gross profit",                             concept: "GrossProfit",                           indent: 0, bold: true,  borderTop: "single", statement: "is" },
  { key: "is-r5",  label: "Research and development",                 concept: "ResearchAndDevelopmentExpense",          indent: 1, bold: false, sectionHeader: "OPERATING EXPENSES", statement: "is" },
  { key: "is-r6",  label: "Selling, general and administrative",      concept: "SellingGeneralAndAdministrativeExpense", indent: 1, bold: false, statement: "is" },
  { key: "is-r7",  label: "Selling and marketing",                    concept: "SellingAndMarketingExpense",             indent: 1, bold: false, statement: "is" },
  { key: "is-r8",  label: "General and administrative",               concept: "GeneralAndAdministrativeExpense",        indent: 1, bold: false, statement: "is" },
  { key: "is-r9",  label: "Depreciation and amortization",            concept: "DepreciationAndAmortization",            indent: 1, bold: false, statement: "is" },
  { key: "is-r10", label: "Total operating expenses",                 concept: "OperatingExpenses",                      indent: 0, bold: true,  borderTop: "single", statement: "is" },
  { key: "is-r11", label: "Operating income (loss)",                   concept: "OperatingIncomeLoss",                   indent: 0, bold: true,  borderTop: "single", statement: "is" },
  { key: "is-r12", label: "Interest expense",                         concept: "InterestExpense",                        indent: 1, bold: false, sectionHeader: "OTHER INCOME (EXPENSE)", statement: "is" },
  { key: "is-r13", label: "Interest income",                          concept: "InvestmentIncomeInterest",               indent: 1, bold: false, statement: "is" },
  { key: "is-r14", label: "Other income (expense), net",              concept: "OtherNonoperatingIncomeExpense",         indent: 1, bold: false, statement: "is" },
  { key: "is-r15", label: "Income before income taxes",               concept: "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest", indent: 0, bold: true, borderTop: "single", statement: "is" },
  { key: "is-r16", label: "Income tax expense (benefit)",             concept: "IncomeTaxExpenseBenefit",                indent: 1, bold: false, statement: "is" },
  { key: "is-r17", label: "Net income (loss)",                        concept: "NetIncomeLoss",                          indent: 0, bold: true,  borderTop: "double", statement: "is" },
  { key: "is-r18", label: "Earnings per share — basic",               concept: "EarningsPerShareBasic",                 indent: 1, bold: false, unitType: "perShare", sectionHeader: "EARNINGS PER SHARE", statement: "is" },
  { key: "is-r19", label: "Earnings per share — diluted",             concept: "EarningsPerShareDiluted",               indent: 1, bold: false, unitType: "perShare", statement: "is" },
  { key: "is-r20", label: "Weighted average shares — basic",          concept: "WeightedAverageNumberOfShareOutstandingBasic",   indent: 1, bold: false, unitType: "shares", statement: "is" },
  { key: "is-r21", label: "Weighted average shares — diluted",        concept: "WeightedAverageNumberOfDilutedSharesOutstanding", indent: 1, bold: false, unitType: "shares", statement: "is" },

  // ═══ CASH FLOW STATEMENT ═══
  { key: "cf-r1",  label: "Net income (loss)",                        concept: "NetIncomeLoss",                          indent: 1, bold: false, sectionHeader: "OPERATING ACTIVITIES", statement: "cf" },
  { key: "cf-r2",  label: "Depreciation and amortization",            concept: "DepreciationDepletionAndAmortization",   indent: 1, bold: false, statement: "cf" },
  { key: "cf-r3",  label: "Stock-based compensation",                 concept: "ShareBasedCompensation",                 indent: 1, bold: false, statement: "cf" },
  { key: "cf-r4",  label: "Changes in operating assets and liabilities", concept: "IncreaseDecreaseInOperatingCapital", indent: 1, bold: false, statement: "cf" },
  { key: "cf-r5",  label: "Net cash from operating activities",       concept: "NetCashProvidedByUsedInOperatingActivities", indent: 0, bold: true, borderTop: "single", statement: "cf" },
  { key: "cf-r6",  label: "Purchases of property and equipment",      concept: "PaymentsToAcquirePropertyPlantAndEquipment", indent: 1, bold: false, sectionHeader: "INVESTING ACTIVITIES", statement: "cf" },
  { key: "cf-r7",  label: "Purchases of investments",                 concept: "PaymentsToAcquireInvestments",           indent: 1, bold: false, statement: "cf" },
  { key: "cf-r8",  label: "Proceeds from investments",                concept: "ProceedsFromSaleAndMaturityOfMarketableSecurities", indent: 1, bold: false, statement: "cf" },
  { key: "cf-r9",  label: "Acquisitions, net of cash",                concept: "PaymentsToAcquireBusinessesNetOfCashAcquired", indent: 1, bold: false, statement: "cf" },
  { key: "cf-r10", label: "Net cash from investing activities",       concept: "NetCashProvidedByUsedInInvestingActivities", indent: 0, bold: true, borderTop: "single", statement: "cf" },
  { key: "cf-r11", label: "Repurchases of common stock",              concept: "PaymentsForRepurchaseOfCommonStock",     indent: 1, bold: false, sectionHeader: "FINANCING ACTIVITIES", statement: "cf" },
  { key: "cf-r12", label: "Proceeds from debt issuance",              concept: "ProceedsFromIssuanceOfLongTermDebt",     indent: 1, bold: false, statement: "cf" },
  { key: "cf-r13", label: "Repayment of debt",                        concept: "RepaymentsOfLongTermDebt",               indent: 1, bold: false, statement: "cf" },
  { key: "cf-r14", label: "Dividends paid",                           concept: "PaymentsOfDividends",                    indent: 1, bold: false, statement: "cf" },
  { key: "cf-r15", label: "Net cash from financing activities",       concept: "NetCashProvidedByUsedInFinancingActivities", indent: 0, bold: true, borderTop: "single", statement: "cf" },
  { key: "cf-r16", label: "Effect of exchange rate changes",          concept: "EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", indent: 1, bold: false, statement: "cf" },
  { key: "cf-r17", label: "Net change in cash and equivalents",       concept: "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect", indent: 0, bold: true, borderTop: "double", statement: "cf" },
  { key: "cf-r18", label: "Cash at beginning of period",              concept: "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", indent: 1, bold: false, statement: "cf" },
  { key: "cf-r19", label: "Cash at end of period",                    concept: "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", indent: 0, bold: true, borderTop: "single", statement: "cf" },
];

// ── 10-Q/10-K Checklist Items ──

interface ChecklistItemDef {
  part: string;
  item_number: string;
  name: string;
  description: string;
  sort_order: number;
}

const tenQChecklist: ChecklistItemDef[] = [
  { part: "Part I",  item_number: "1",  name: "Financial Statements",                   description: "Condensed consolidated financial statements (unaudited)",          sort_order: 1 },
  { part: "Part I",  item_number: "2",  name: "MD&A",                                   description: "Management's Discussion and Analysis of Financial Condition and Results of Operations", sort_order: 2 },
  { part: "Part I",  item_number: "3",  name: "Quantitative & Qualitative Disclosures",  description: "Quantitative and Qualitative Disclosures About Market Risk",       sort_order: 3 },
  { part: "Part I",  item_number: "4",  name: "Controls and Procedures",                description: "Controls and Procedures",                                           sort_order: 4 },
  { part: "Part II", item_number: "1",  name: "Legal Proceedings",                      description: "Legal Proceedings",                                                  sort_order: 5 },
  { part: "Part II", item_number: "1A", name: "Risk Factors",                           description: "Risk Factors",                                                       sort_order: 6 },
  { part: "Part II", item_number: "2",  name: "Unregistered Sales & Use of Proceeds",   description: "Unregistered Sales of Equity Securities and Use of Proceeds",        sort_order: 7 },
  { part: "Part II", item_number: "3",  name: "Defaults Upon Senior Securities",        description: "Defaults Upon Senior Securities",                                    sort_order: 8 },
  { part: "Part II", item_number: "4",  name: "Mine Safety Disclosures",                description: "Mine Safety Disclosures",                                            sort_order: 9 },
  { part: "Part II", item_number: "5",  name: "Other Information",                      description: "Other Information",                                                  sort_order: 10 },
  { part: "Part II", item_number: "6",  name: "Exhibits",                               description: "Exhibits, Financial Statement Schedules",                            sort_order: 11 },
];

const tenKChecklist: ChecklistItemDef[] = [
  { part: "Part I",   item_number: "1",  name: "Business",                               description: "Description of the registrant's business",                          sort_order: 1 },
  { part: "Part I",   item_number: "1A", name: "Risk Factors",                           description: "Risk Factors",                                                       sort_order: 2 },
  { part: "Part I",   item_number: "1B", name: "Unresolved Staff Comments",              description: "Unresolved Staff Comments",                                          sort_order: 3 },
  { part: "Part I",   item_number: "1C", name: "Cybersecurity",                          description: "Cybersecurity risk management, strategy, and governance",            sort_order: 4 },
  { part: "Part I",   item_number: "2",  name: "Properties",                             description: "Description of properties",                                          sort_order: 5 },
  { part: "Part I",   item_number: "3",  name: "Legal Proceedings",                      description: "Legal Proceedings",                                                  sort_order: 6 },
  { part: "Part I",   item_number: "4",  name: "Mine Safety Disclosures",                description: "Mine Safety Disclosures",                                            sort_order: 7 },
  { part: "Part II",  item_number: "5",  name: "Market for Registrant's Equity",         description: "Market Information, Holders, Dividends, Securities Repurchases",     sort_order: 8 },
  { part: "Part II",  item_number: "6",  name: "Reserved",                               description: "[Reserved]",                                                         sort_order: 9 },
  { part: "Part II",  item_number: "7",  name: "MD&A",                                   description: "Management's Discussion and Analysis of Financial Condition and Results of Operations", sort_order: 10 },
  { part: "Part II",  item_number: "7A", name: "Quantitative & Qualitative Disclosures", description: "Quantitative and Qualitative Disclosures About Market Risk",        sort_order: 11 },
  { part: "Part II",  item_number: "8",  name: "Financial Statements",                   description: "Financial Statements and Supplementary Data",                        sort_order: 12 },
  { part: "Part II",  item_number: "9",  name: "Changes & Disagreements with Accountants", description: "Changes in and Disagreements With Accountants on Accounting and Financial Disclosure", sort_order: 13 },
  { part: "Part II",  item_number: "9A", name: "Controls and Procedures",                description: "Controls and Procedures",                                            sort_order: 14 },
  { part: "Part II",  item_number: "9B", name: "Other Information",                      description: "Other Information",                                                  sort_order: 15 },
  { part: "Part II",  item_number: "9C", name: "Disclosure Regarding Foreign Jurisdictions", description: "Disclosure Regarding Foreign Jurisdictions that Prevent Inspections", sort_order: 16 },
  { part: "Part III", item_number: "10", name: "Directors & Executive Officers",         description: "Directors, Executive Officers and Corporate Governance",              sort_order: 17 },
  { part: "Part III", item_number: "11", name: "Executive Compensation",                 description: "Executive Compensation",                                             sort_order: 18 },
  { part: "Part III", item_number: "12", name: "Security Ownership",                     description: "Security Ownership of Certain Beneficial Owners and Management",     sort_order: 19 },
  { part: "Part III", item_number: "13", name: "Certain Relationships",                  description: "Certain Relationships and Related Transactions, and Director Independence", sort_order: 20 },
  { part: "Part III", item_number: "14", name: "Principal Accountant Fees",              description: "Principal Accountant Fees and Services",                              sort_order: 21 },
  { part: "Part IV",  item_number: "15", name: "Exhibits & Financial Statement Schedules", description: "Exhibits and Financial Statement Schedules",                       sort_order: 22 },
  { part: "Part IV",  item_number: "16", name: "Form 10-K Summary",                     description: "Form 10-K Summary",                                                  sort_order: 23 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { company_id, cik, filing_type } = await req.json();

    if (!company_id || !cik) {
      return new Response(
        JSON.stringify({ error: "Missing company_id or cik" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch all company facts from EDGAR
    const factsUrl = `${EDGAR_BASE}/api/xbrl/companyfacts/CIK${padCik(cik)}.json`;
    const factsRes = await fetch(factsUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });

    if (!factsRes.ok) {
      throw new Error(`EDGAR API returned ${factsRes.status}`);
    }

    const factsData = await factsRes.json();
    const usGaap = factsData.facts?.["us-gaap"] || {};
    const dei = factsData.facts?.["dei"] || {};

    // 2. Find filings for this company from EDGAR submissions
    const subUrl = `${EDGAR_BASE}/submissions/CIK${padCik(cik)}.json`;
    const subRes = await fetch(subUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    const subData = await subRes.json();
    const recent = subData.filings?.recent || {};

    // Get target form filings
    const targetForm = filing_type || "10-Q";
    const filingIndices: number[] = [];
    for (let i = 0; i < (recent.form?.length || 0); i++) {
      if (recent.form[i] === targetForm) {
        filingIndices.push(i);
      }
    }

    // Process the most recent 4 filings of this type
    const processedFilings = filingIndices.slice(0, 4).map((i) => ({
      accession: recent.accessionNumber[i],
      filingDate: recent.filingDate[i],
      periodOfReport: recent.reportDate?.[i] || recent.filingDate[i],
      form: recent.form[i],
    }));

    // Helper: get a value from EDGAR facts
    const getValue = (concept: string, end: string, unitType?: string): number | null => {
      // Check us-gaap first, then dei
      const factData = usGaap[concept] || dei[concept];
      if (!factData) return null;

      let units: any[];
      if (unitType === "perShare") {
        units = factData.units?.["USD/shares"] || [];
      } else if (unitType === "shares") {
        units = factData.units?.shares || [];
      } else {
        units = factData.units?.USD || factData.units?.shares || factData.units?.["USD/shares"] || [];
      }

      const match = units.find(
        (v: any) => v.end === end && v.form === targetForm
      );
      return match?.val ?? null;
    };

    // Format a value based on its unit type
    const formatValue = (val: number | null, unitType?: string): string | null => {
      if (val === null) return null;
      if (unitType === "perShare") return formatPerShare(val);
      if (unitType === "shares") return formatSharesMillions(val);
      return formatMillions(val);
    };

    let totalRows = 0;

    // 3. For each filing, extract values and upsert
    for (const pf of processedFilings) {
      const periodEnd = pf.periodOfReport;
      const periodLabel = targetForm === "10-K"
        ? `FY ${new Date(periodEnd).getFullYear()}`
        : `Q${Math.ceil((new Date(periodEnd).getMonth() + 1) / 3)} ${new Date(periodEnd).getFullYear()}`;

      // Calculate deadline (40 days for 10-Q LAF, 60 days for 10-K LAF)
      const deadlineDays = targetForm === "10-K" ? 60 : 40;
      const deadlineDate = new Date(periodEnd);
      deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

      // Upsert filing record
      const { data: filing, error: filingError } = await supabase
        .from("filings")
        .upsert(
          {
            company_id,
            filing_type: targetForm,
            period: periodLabel,
            period_end: periodEnd,
            filing_date: pf.filingDate,
            deadline: deadlineDate.toISOString().split("T")[0],
            status: "filed",
            progress_pct: 100,
            accession_number: pf.accession,
          },
          { onConflict: "company_id,period_end,filing_type", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (filingError) {
        console.error("Filing upsert error:", filingError);
        continue;
      }

      // Extract financial highlights
      const revenue = getValue("RevenueFromContractWithCustomerExcludingAssessedTax", periodEnd)
        || getValue("Revenues", periodEnd);
      const netIncome = getValue("NetIncomeLoss", periodEnd);
      const totalAssets = getValue("Assets", periodEnd);
      const eps = getValue("EarningsPerShareDiluted", periodEnd, "perShare");
      const grossProfit = getValue("GrossProfit", periodEnd);
      const operatingIncome = getValue("OperatingIncomeLoss", periodEnd);
      const operatingCashFlow = getValue("NetCashProvidedByUsedInOperatingActivities", periodEnd);

      // Update filing with financial highlights
      await supabase.from("filings").update({
        financial_data: {
          revenue: revenue ? formatMillions(revenue) : null,
          netIncome: netIncome ? formatMillions(netIncome) : null,
          totalAssets: totalAssets ? formatMillions(totalAssets) : null,
          eps: eps ? formatPerShare(eps) : null,
          grossProfit: grossProfit ? formatMillions(grossProfit) : null,
          operatingIncome: operatingIncome ? formatMillions(operatingIncome) : null,
          operatingCashFlow: operatingCashFlow ? formatMillions(operatingCashFlow) : null,
        },
      }).eq("id", filing.id);

      // Find prior period end for comparison (YoY)
      const priorDate = new Date(periodEnd);
      priorDate.setFullYear(priorDate.getFullYear() - 1);
      const priorEnd = priorDate.toISOString().split("T")[0];

      // 4. Create document rows for ALL THREE statements
      let sortIdx = 0;
      for (const row of statementRows) {
        const unitType = row.unitType || "monetary";
        const currentVal = getValue(row.concept, periodEnd, unitType);
        const priorVal = getValue(row.concept, priorEnd, unitType);

        // Skip rows where we have no data at all (keeps statements clean)
        // But always keep bold/total rows for structure
        if (!currentVal && !priorVal && !row.bold) continue;

        await supabase.from("document_rows").upsert(
          {
            filing_id: filing.id,
            row_key: row.key,
            label: row.label,
            value_current: formatValue(currentVal, unitType),
            value_prior: formatValue(priorVal, unitType),
            value_current_raw: currentVal,
            value_prior_raw: priorVal,
            unit_type: unitType,
            xbrl_concept: `us-gaap:${row.concept}`,
            indent_level: row.indent,
            is_bold: row.bold,
            border_top: row.borderTop || null,
            section_header: row.sectionHeader || null,
            statement_type: row.statement,
            sort_order: sortIdx++,
          },
          { onConflict: "filing_id,row_key" }
        );
        totalRows++;
      }

      // 5. Seed checklist items for this filing (skip if already seeded)
      const { count: existingItems } = await supabase
        .from("filing_items")
        .select("id", { count: "exact", head: true })
        .eq("filing_id", filing.id);

      if (!existingItems || existingItems === 0) {
        const checklist = targetForm === "10-K" ? tenKChecklist : tenQChecklist;
        const items = checklist.map((item) => ({
          filing_id: filing.id,
          part: item.part,
          item_number: item.item_number,
          name: item.name,
          description: item.description,
          status: "not-started",
          sort_order: item.sort_order,
        }));
        await supabase.from("filing_items").insert(items);
      }
    }

    // 6. Log the sync activity
    await supabase.from("activity_log").insert({
      company_id,
      action: "Synced",
      target: "EDGAR Company Facts",
      detail: `Imported ${processedFilings.length} ${targetForm} filings with ${totalRows} document rows (BS + IS + CF) and checklist items`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        filings_processed: processedFilings.length,
        document_rows: totalRows,
        message: `Synced ${processedFilings.length} ${targetForm} filings from EDGAR (balance sheet, income statement, cash flows, checklist)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
