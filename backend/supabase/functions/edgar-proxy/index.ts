import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const EDGAR_BASE = "https://data.sec.gov";
const USER_AGENT = Deno.env.get("EDGAR_USER_AGENT") || "TaglineAI admin@tagline.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: SEC allows max 10 requests/second
let lastRequestTime = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 100) {
    await new Promise((r) => setTimeout(r, 100 - elapsed));
  }
  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
}

function padCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

// ── Submissions ──
async function getSubmissions(cik: string) {
  const url = `${EDGAR_BASE}/submissions/CIK${padCik(cik)}.json`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`EDGAR submissions failed: ${res.status}`);
  const data = await res.json();

  const recentFilings = data.filings?.recent || {};
  const filings = (recentFilings.accessionNumber || []).map(
    (_: string, i: number) => ({
      accessionNumber: recentFilings.accessionNumber[i],
      filingDate: recentFilings.filingDate[i],
      form: recentFilings.form[i],
      periodOfReport: recentFilings.reportDate?.[i] || recentFilings.filingDate[i],
      primaryDocument: recentFilings.primaryDocument?.[i],
    })
  );

  const relevantFilings = filings.filter(
    (f: any) => ["10-K", "10-Q", "10-K/A", "10-Q/A"].includes(f.form)
  );

  const fyEnd = data.fiscalYearEnd || "1231";
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const monthNum = parseInt(fyEnd.substring(0, 2)) - 1;
  const day = fyEnd.substring(2);

  return {
    company: {
      name: data.name,
      cik: data.cik,
      sic: data.sic,
      sicDescription: data.sicDescription,
      ticker: data.tickers?.[0] || "",
      stateOfIncorporation: data.stateOfIncorporation,
      fiscalYearEnd: `${monthNames[monthNum]} ${day}`,
      filerCategory: data.category || "Large Accelerated Filer",
    },
    filings: relevantFilings.slice(0, 20),
  };
}

// ── Company Facts ──
// All XBRL concepts we track across BS, IS, CF
const keyConcepts = [
  // Balance Sheet
  "Assets", "AssetsCurrent", "CashAndCashEquivalentsAtCarryingValue",
  "ShortTermInvestments", "AccountsReceivableNetCurrent", "InventoryNet",
  "OtherAssetsCurrent", "PropertyPlantAndEquipmentNet", "OperatingLeaseRightOfUseAsset",
  "Goodwill", "OtherAssetsNoncurrent",
  "AccountsPayableCurrent", "AccruedLiabilitiesCurrent", "ContractWithCustomerLiabilityCurrent",
  "LiabilitiesCurrent", "LongTermDebt", "OperatingLeaseLiabilityNoncurrent",
  "OtherLiabilitiesNoncurrent", "Liabilities",
  "StockholdersEquity", "LiabilitiesAndStockholdersEquity",
  // Income Statement
  "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
  "CostOfRevenue", "CostOfGoodsAndServicesSold", "GrossProfit",
  "ResearchAndDevelopmentExpense", "SellingGeneralAndAdministrativeExpense",
  "SellingAndMarketingExpense", "GeneralAndAdministrativeExpense",
  "DepreciationAndAmortization", "OperatingExpenses", "OperatingIncomeLoss",
  "InterestExpense", "InvestmentIncomeInterest", "OtherNonoperatingIncomeExpense",
  "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
  "IncomeTaxExpenseBenefit", "NetIncomeLoss",
  "EarningsPerShareBasic", "EarningsPerShareDiluted",
  "WeightedAverageNumberOfShareOutstandingBasic",
  "WeightedAverageNumberOfDilutedSharesOutstanding",
  // Cash Flows
  "DepreciationDepletionAndAmortization", "ShareBasedCompensation",
  "IncreaseDecreaseInOperatingCapital",
  "NetCashProvidedByUsedInOperatingActivities",
  "PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireInvestments",
  "ProceedsFromSaleAndMaturityOfMarketableSecurities",
  "PaymentsToAcquireBusinessesNetOfCashAcquired",
  "NetCashProvidedByUsedInInvestingActivities",
  "PaymentsForRepurchaseOfCommonStock", "ProceedsFromIssuanceOfLongTermDebt",
  "RepaymentsOfLongTermDebt", "PaymentsOfDividends",
  "NetCashProvidedByUsedInFinancingActivities",
  "EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
  "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect",
  "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
  // Shares
  "CommonStockSharesOutstanding",
];

async function getCompanyFacts(cik: string) {
  const url = `${EDGAR_BASE}/api/xbrl/companyfacts/CIK${padCik(cik)}.json`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`EDGAR company-facts failed: ${res.status}`);
  const data = await res.json();

  const usGaap = data.facts?.["us-gaap"] || {};
  const dei = data.facts?.["dei"] || {};
  const extracted: Record<string, any[]> = {};

  for (const concept of keyConcepts) {
    const factData = usGaap[concept];
    if (!factData) continue;

    const units = factData.units;
    const values = units?.USD || units?.shares || units?.["USD/shares"] || [];

    const filtered = values
      .filter((v: any) => ["10-K", "10-Q"].includes(v.form))
      .map((v: any) => ({
        value: v.val,
        end: v.end,
        filed: v.filed,
        form: v.form,
        fiscalYear: v.fy,
        fiscalPeriod: v.fp,
        accession: v.accn,
        frame: v.frame,
      }));

    extracted[concept] = filtered.slice(-12);
  }

  return {
    cik: data.cik,
    entityName: data.entityName,
    facts: extracted,
  };
}

// ── Company Concept ──
async function getCompanyConcept(cik: string, concept: string) {
  const url = `${EDGAR_BASE}/api/xbrl/companyconcept/CIK${padCik(cik)}/us-gaap/${concept}.json`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`EDGAR company-concept failed: ${res.status}`);
  const data = await res.json();

  const units = data.units?.USD || data.units?.shares || data.units?.["USD/shares"] || [];
  return {
    concept: data.tag,
    label: data.label,
    description: data.description,
    values: units
      .filter((v: any) => ["10-K", "10-Q"].includes(v.form))
      .map((v: any) => ({
        value: v.val,
        end: v.end,
        filed: v.filed,
        form: v.form,
        fiscalYear: v.fy,
        fiscalPeriod: v.fp,
        accession: v.accn,
      }))
      .slice(-20),
  };
}

// ── Handler ──
// Accepts both POST body and query params for flexibility
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let action: string | null = null;
    let cik: string | null = null;
    let concept: string | null = null;

    // Support POST body (from supabase.functions.invoke) and query params
    if (req.method === "POST") {
      const body = await req.json();
      action = body.action;
      cik = body.cik;
      concept = body.concept;
    } else {
      const url = new URL(req.url);
      action = url.searchParams.get("action");
      cik = url.searchParams.get("cik");
      concept = url.searchParams.get("concept");
    }

    if (!action || !cik) {
      return new Response(
        JSON.stringify({ error: "Missing action or cik parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any;

    switch (action) {
      case "submissions":
        result = await getSubmissions(cik);
        break;
      case "company-facts":
        result = await getCompanyFacts(cik);
        break;
      case "company-concept": {
        if (!concept) {
          return new Response(
            JSON.stringify({ error: "Missing concept parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getCompanyConcept(cik, concept);
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("EDGAR proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
