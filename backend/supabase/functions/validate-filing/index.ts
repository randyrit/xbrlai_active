import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Validate Filing Edge Function
 *
 * Runs XBRL validation rules against a filing's document rows and tags.
 * Populates the validation_issues table with errors, warnings, and info.
 *
 * Validation categories:
 *  1. Calculation checks (e.g., Total Assets = Current + Non-current)
 *  2. Required concept checks (must-have XBRL tags for 10-Q/10-K)
 *  3. Period consistency (all facts reference the same period)
 *  4. Sign/balance checks (debits positive, credits positive)
 *  5. Cross-statement checks (net income appears in IS and CF)
 */

interface ValidationIssue {
  filing_id: string;
  severity: "error" | "warning" | "info";
  section: string;
  message: string;
  rule: string;
}

// Calculation linkbase rules: parent concept should equal sum of children
const calcRules = [
  {
    rule: "BS-CALC-001",
    section: "Balance Sheet",
    parent: "Assets",
    children: ["AssetsCurrent", "PropertyPlantAndEquipmentNet", "OperatingLeaseRightOfUseAsset", "Goodwill", "OtherAssetsNoncurrent"],
    description: "Total Assets should approximate sum of asset line items",
    tolerance: 0.05,
  },
  {
    rule: "BS-CALC-002",
    section: "Balance Sheet",
    parent: "LiabilitiesAndStockholdersEquity",
    children: ["Liabilities", "StockholdersEquity"],
    description: "Total L&SE must equal Liabilities + Stockholders' Equity",
    tolerance: 0.001,
  },
  {
    rule: "BS-CALC-003",
    section: "Balance Sheet",
    parent: "Assets",
    children: ["LiabilitiesAndStockholdersEquity"],
    description: "Total Assets must equal Total Liabilities and Stockholders' Equity",
    tolerance: 0.001,
  },
  {
    rule: "IS-CALC-001",
    section: "Income Statement",
    parent: "GrossProfit",
    children: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues"],
    subtracted: ["CostOfRevenue", "CostOfGoodsAndServicesSold"],
    description: "Gross Profit should equal Revenue minus Cost of Revenue",
    tolerance: 0.02,
    useFirstAvailable: true,
  },
  {
    rule: "CF-CALC-001",
    section: "Cash Flows",
    parent: "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect",
    children: [
      "NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByUsedInInvestingActivities",
      "NetCashProvidedByUsedInFinancingActivities",
      "EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ],
    description: "Net change in cash should equal Operating + Investing + Financing + FX effect",
    tolerance: 0.02,
  },
];

// Required concepts by filing type
const requiredConcepts: Record<string, { concept: string; section: string }[]> = {
  "10-Q": [
    { concept: "Assets", section: "Balance Sheet" },
    { concept: "Liabilities", section: "Balance Sheet" },
    { concept: "StockholdersEquity", section: "Balance Sheet" },
    { concept: "LiabilitiesAndStockholdersEquity", section: "Balance Sheet" },
    { concept: "NetIncomeLoss", section: "Income Statement" },
    { concept: "EarningsPerShareBasic", section: "Income Statement" },
    { concept: "EarningsPerShareDiluted", section: "Income Statement" },
    { concept: "NetCashProvidedByUsedInOperatingActivities", section: "Cash Flows" },
    { concept: "NetCashProvidedByUsedInInvestingActivities", section: "Cash Flows" },
    { concept: "NetCashProvidedByUsedInFinancingActivities", section: "Cash Flows" },
  ],
  "10-K": [
    { concept: "Assets", section: "Balance Sheet" },
    { concept: "Liabilities", section: "Balance Sheet" },
    { concept: "StockholdersEquity", section: "Balance Sheet" },
    { concept: "LiabilitiesAndStockholdersEquity", section: "Balance Sheet" },
    { concept: "Revenues", section: "Income Statement" },
    { concept: "NetIncomeLoss", section: "Income Statement" },
    { concept: "EarningsPerShareBasic", section: "Income Statement" },
    { concept: "EarningsPerShareDiluted", section: "Income Statement" },
    { concept: "NetCashProvidedByUsedInOperatingActivities", section: "Cash Flows" },
    { concept: "NetCashProvidedByUsedInInvestingActivities", section: "Cash Flows" },
    { concept: "NetCashProvidedByUsedInFinancingActivities", section: "Cash Flows" },
  ],
};

// Cross-statement consistency checks
const crossStatementChecks = [
  {
    rule: "CROSS-001",
    description: "Net Income in Income Statement must match Net Income in Cash Flow Statement",
    isRow: "is-r17",
    cfRow: "cf-r1",
    section: "Cross-Statement",
  },
];

function parseDollarValue(val: string | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[$,]/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { filing_id } = await req.json();

    if (!filing_id) {
      return new Response(
        JSON.stringify({ error: "Missing filing_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get filing metadata
    const { data: filing } = await supabase
      .from("filings")
      .select("*")
      .eq("id", filing_id)
      .single();

    if (!filing) {
      return new Response(
        JSON.stringify({ error: "Filing not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all document rows for this filing
    const { data: rows } = await supabase
      .from("document_rows")
      .select("*")
      .eq("filing_id", filing_id)
      .order("sort_order");

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No document rows found for this filing" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build lookup maps
    const rowByKey = new Map<string, any>();
    const rowByConcept = new Map<string, any>();
    for (const row of rows) {
      rowByKey.set(row.row_key, row);
      if (row.xbrl_concept) {
        const concept = row.xbrl_concept.replace("us-gaap:", "");
        rowByConcept.set(concept, row);
      }
    }

    const issues: ValidationIssue[] = [];

    // ── 1. Calculation Checks ──
    for (const calc of calcRules) {
      const parentRow = rowByConcept.get(calc.parent);
      const parentVal = parseDollarValue(parentRow?.value_current);
      if (parentVal === null) continue; // Skip if parent not available

      let childSum = 0;
      let hasAnyChild = false;

      if ((calc as any).useFirstAvailable) {
        // For rules like Gross Profit = Revenue - COGS, use first available child
        let revenueVal = 0;
        for (const child of calc.children) {
          const val = parseDollarValue(rowByConcept.get(child)?.value_current);
          if (val !== null) { revenueVal = val; hasAnyChild = true; break; }
        }
        let costVal = 0;
        for (const sub of (calc as any).subtracted || []) {
          const val = parseDollarValue(rowByConcept.get(sub)?.value_current);
          if (val !== null) { costVal = val; hasAnyChild = true; break; }
        }
        childSum = revenueVal - costVal;
      } else {
        for (const child of calc.children) {
          const val = parseDollarValue(rowByConcept.get(child)?.value_current);
          if (val !== null) { childSum += val; hasAnyChild = true; }
        }
      }

      if (!hasAnyChild) continue;

      const diff = Math.abs(parentVal - childSum);
      const tolerance = Math.abs(parentVal) * calc.tolerance;

      if (diff > tolerance && diff > 1) {
        issues.push({
          filing_id,
          severity: calc.tolerance <= 0.001 ? "error" : "warning",
          section: calc.section,
          message: `${calc.description}. Expected $${childSum.toLocaleString()}, got $${parentVal.toLocaleString()} (diff: $${diff.toLocaleString()})`,
          rule: calc.rule,
        });
      }
    }

    // ── 2. Required Concept Checks ──
    const reqConcepts = requiredConcepts[filing.filing_type] || requiredConcepts["10-Q"];
    for (const req of reqConcepts) {
      const row = rowByConcept.get(req.concept);
      if (!row || !row.value_current) {
        issues.push({
          filing_id,
          severity: "error",
          section: req.section,
          message: `Required concept "${req.concept}" is missing or has no value`,
          rule: "REQ-001",
        });
      }
    }

    // ── 3. Period Consistency ──
    // Check that filing has both current and prior period for key items
    const keyRows = ["bs-r11", "is-r17", "cf-r5"];
    for (const key of keyRows) {
      const row = rowByKey.get(key);
      if (row && row.value_current && !row.value_prior) {
        issues.push({
          filing_id,
          severity: "warning",
          section: "General",
          message: `"${row.label}" has current period value but no prior period comparison`,
          rule: "PERIOD-001",
        });
      }
    }

    // ── 4. Sign/Reasonableness Checks ──
    // Total assets should be positive
    const totalAssets = parseDollarValue(rowByConcept.get("Assets")?.value_current);
    if (totalAssets !== null && totalAssets < 0) {
      issues.push({
        filing_id,
        severity: "error",
        section: "Balance Sheet",
        message: "Total Assets is negative, which is not valid",
        rule: "SIGN-001",
      });
    }

    // Revenue should typically be positive
    const revenue = parseDollarValue(rowByConcept.get("RevenueFromContractWithCustomerExcludingAssessedTax")?.value_current)
      || parseDollarValue(rowByConcept.get("Revenues")?.value_current);
    if (revenue !== null && revenue < 0) {
      issues.push({
        filing_id,
        severity: "warning",
        section: "Income Statement",
        message: "Revenue is negative — verify this is correct",
        rule: "SIGN-002",
      });
    }

    // ── 5. Cross-Statement Consistency ──
    for (const check of crossStatementChecks) {
      const isRow = rowByKey.get(check.isRow);
      const cfRow = rowByKey.get(check.cfRow);
      const isVal = parseDollarValue(isRow?.value_current);
      const cfVal = parseDollarValue(cfRow?.value_current);

      if (isVal !== null && cfVal !== null && isVal !== cfVal) {
        issues.push({
          filing_id,
          severity: "warning",
          section: check.section,
          message: `${check.description}. IS value: $${isVal.toLocaleString()}, CF value: $${cfVal.toLocaleString()}`,
          rule: check.rule,
        });
      }
    }

    // ── 6. Missing XBRL Tag Warnings ──
    const untaggedRows = rows.filter((r: any) => r.value_current && !r.xbrl_concept);
    if (untaggedRows.length > 0) {
      issues.push({
        filing_id,
        severity: "info",
        section: "XBRL Tagging",
        message: `${untaggedRows.length} row(s) have values but no XBRL concept assigned`,
        rule: "TAG-001",
      });
    }

    // ── Persist results ──
    // Clear previous validation issues for this filing
    await supabase
      .from("validation_issues")
      .delete()
      .eq("filing_id", filing_id)
      .eq("is_resolved", false);

    // Insert new issues
    if (issues.length > 0) {
      await supabase.from("validation_issues").insert(issues);
    }

    // Log activity
    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const infoCount = issues.filter((i) => i.severity === "info").length;

    await supabase.from("activity_log").insert({
      company_id: filing.company_id,
      filing_id,
      action: "Validated",
      target: `${filing.filing_type} ${filing.period}`,
      detail: `${errorCount} errors, ${warningCount} warnings, ${infoCount} info`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        filing_id,
        issues_found: issues.length,
        errors: errorCount,
        warnings: warningCount,
        info: infoCount,
        issues,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
