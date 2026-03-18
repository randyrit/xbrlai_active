import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Seed Filing Items Edge Function
 *
 * Creates the checklist items (Part I/II/III/IV items) for a filing,
 * plus the disclosure sections (Cover Page, Financial Statements, Notes, etc.).
 * Call this after creating a new filing to populate its structure.
 */

interface ChecklistItem {
  part: string;
  item_number: string;
  name: string;
  description: string;
  sort_order: number;
}

const tenQChecklist: ChecklistItem[] = [
  { part: "Part I",  item_number: "1",  name: "Financial Statements",                    description: "Condensed consolidated financial statements (unaudited)",                                sort_order: 1 },
  { part: "Part I",  item_number: "2",  name: "MD&A",                                    description: "Management's Discussion and Analysis of Financial Condition and Results of Operations",   sort_order: 2 },
  { part: "Part I",  item_number: "3",  name: "Quantitative & Qualitative Disclosures",  description: "Quantitative and Qualitative Disclosures About Market Risk",                              sort_order: 3 },
  { part: "Part I",  item_number: "4",  name: "Controls and Procedures",                 description: "Controls and Procedures",                                                                  sort_order: 4 },
  { part: "Part II", item_number: "1",  name: "Legal Proceedings",                       description: "Legal Proceedings",                                                                        sort_order: 5 },
  { part: "Part II", item_number: "1A", name: "Risk Factors",                            description: "Risk Factors",                                                                             sort_order: 6 },
  { part: "Part II", item_number: "2",  name: "Unregistered Sales & Use of Proceeds",    description: "Unregistered Sales of Equity Securities and Use of Proceeds",                              sort_order: 7 },
  { part: "Part II", item_number: "3",  name: "Defaults Upon Senior Securities",         description: "Defaults Upon Senior Securities",                                                          sort_order: 8 },
  { part: "Part II", item_number: "4",  name: "Mine Safety Disclosures",                 description: "Mine Safety Disclosures",                                                                  sort_order: 9 },
  { part: "Part II", item_number: "5",  name: "Other Information",                       description: "Other Information",                                                                        sort_order: 10 },
  { part: "Part II", item_number: "6",  name: "Exhibits",                                description: "Exhibits, Financial Statement Schedules",                                                  sort_order: 11 },
];

const tenKChecklist: ChecklistItem[] = [
  { part: "Part I",   item_number: "1",  name: "Business",                                  description: "Description of the registrant's business",                                                sort_order: 1 },
  { part: "Part I",   item_number: "1A", name: "Risk Factors",                              description: "Risk Factors",                                                                             sort_order: 2 },
  { part: "Part I",   item_number: "1B", name: "Unresolved Staff Comments",                 description: "Unresolved Staff Comments",                                                                sort_order: 3 },
  { part: "Part I",   item_number: "1C", name: "Cybersecurity",                             description: "Cybersecurity risk management, strategy, and governance",                                  sort_order: 4 },
  { part: "Part I",   item_number: "2",  name: "Properties",                                description: "Description of properties",                                                                sort_order: 5 },
  { part: "Part I",   item_number: "3",  name: "Legal Proceedings",                         description: "Legal Proceedings",                                                                        sort_order: 6 },
  { part: "Part I",   item_number: "4",  name: "Mine Safety Disclosures",                   description: "Mine Safety Disclosures",                                                                  sort_order: 7 },
  { part: "Part II",  item_number: "5",  name: "Market for Registrant's Equity",            description: "Market Information, Holders, Dividends, Securities Repurchases",                           sort_order: 8 },
  { part: "Part II",  item_number: "6",  name: "Reserved",                                  description: "[Reserved]",                                                                               sort_order: 9 },
  { part: "Part II",  item_number: "7",  name: "MD&A",                                      description: "Management's Discussion and Analysis of Financial Condition and Results of Operations",     sort_order: 10 },
  { part: "Part II",  item_number: "7A", name: "Quantitative & Qualitative Disclosures",    description: "Quantitative and Qualitative Disclosures About Market Risk",                               sort_order: 11 },
  { part: "Part II",  item_number: "8",  name: "Financial Statements",                      description: "Financial Statements and Supplementary Data",                                              sort_order: 12 },
  { part: "Part II",  item_number: "9",  name: "Changes & Disagreements with Accountants",  description: "Changes in and Disagreements With Accountants on Accounting and Financial Disclosure",     sort_order: 13 },
  { part: "Part II",  item_number: "9A", name: "Controls and Procedures",                   description: "Controls and Procedures",                                                                  sort_order: 14 },
  { part: "Part II",  item_number: "9B", name: "Other Information",                         description: "Other Information",                                                                        sort_order: 15 },
  { part: "Part II",  item_number: "9C", name: "Disclosure Regarding Foreign Jurisdictions", description: "Disclosure Regarding Foreign Jurisdictions that Prevent Inspections",                      sort_order: 16 },
  { part: "Part III", item_number: "10", name: "Directors & Executive Officers",             description: "Directors, Executive Officers and Corporate Governance",                                   sort_order: 17 },
  { part: "Part III", item_number: "11", name: "Executive Compensation",                    description: "Executive Compensation",                                                                   sort_order: 18 },
  { part: "Part III", item_number: "12", name: "Security Ownership",                        description: "Security Ownership of Certain Beneficial Owners and Management",                           sort_order: 19 },
  { part: "Part III", item_number: "13", name: "Certain Relationships",                     description: "Certain Relationships and Related Transactions, and Director Independence",                sort_order: 20 },
  { part: "Part III", item_number: "14", name: "Principal Accountant Fees",                 description: "Principal Accountant Fees and Services",                                                   sort_order: 21 },
  { part: "Part IV",  item_number: "15", name: "Exhibits & Financial Statement Schedules",  description: "Exhibits and Financial Statement Schedules",                                               sort_order: 22 },
  { part: "Part IV",  item_number: "16", name: "Form 10-K Summary",                        description: "Form 10-K Summary",                                                                        sort_order: 23 },
];

// Standard disclosure sections for financial statements
const disclosureSections = [
  { category: "Cover",      name: "Cover Page",                         sort_order: 1 },
  { category: "Statements", name: "Balance Sheets",                     sort_order: 2 },
  { category: "Statements", name: "Income Statements",                  sort_order: 3 },
  { category: "Statements", name: "Comprehensive Income",               sort_order: 4 },
  { category: "Statements", name: "Stockholders' Equity",               sort_order: 5 },
  { category: "Statements", name: "Cash Flows",                         sort_order: 6 },
  { category: "Notes",      name: "Summary of Significant Accounting Policies", sort_order: 7 },
  { category: "Notes",      name: "Revenue Recognition",                sort_order: 8 },
  { category: "Notes",      name: "Fair Value Measurements",            sort_order: 9 },
  { category: "Notes",      name: "Commitments and Contingencies",      sort_order: 10 },
  { category: "Notes",      name: "Debt",                               sort_order: 11 },
  { category: "Notes",      name: "Income Taxes",                       sort_order: 12 },
  { category: "Notes",      name: "Earnings Per Share",                 sort_order: 13 },
  { category: "Notes",      name: "Segment Information",                sort_order: 14 },
  { category: "Notes",      name: "Stockholders' Equity (Note)",        sort_order: 15 },
  { category: "Notes",      name: "Subsequent Events",                  sort_order: 16 },
];

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

    // Get the filing to determine type
    const { data: filing, error: filingError } = await supabase
      .from("filings")
      .select("id, filing_type, company_id, period")
      .eq("id", filing_id)
      .single();

    if (filingError || !filing) {
      return new Response(
        JSON.stringify({ error: "Filing not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let itemsCreated = 0;
    let sectionsCreated = 0;

    // 1. Seed checklist items (skip if already exist)
    const { count: existingItems } = await supabase
      .from("filing_items")
      .select("id", { count: "exact", head: true })
      .eq("filing_id", filing_id);

    if (!existingItems || existingItems === 0) {
      const checklist = filing.filing_type === "10-K" ? tenKChecklist : tenQChecklist;
      const items = checklist.map((item) => ({
        filing_id,
        part: item.part,
        item_number: item.item_number,
        name: item.name,
        description: item.description,
        status: "not-started",
        sort_order: item.sort_order,
      }));

      const { error: insertError } = await supabase.from("filing_items").insert(items);
      if (insertError) {
        console.error("Insert filing items error:", insertError);
      } else {
        itemsCreated = items.length;
      }
    }

    // 2. Seed disclosure sections (skip if already exist)
    const { count: existingSections } = await supabase
      .from("disclosure_sections")
      .select("id", { count: "exact", head: true })
      .eq("filing_id", filing_id);

    if (!existingSections || existingSections === 0) {
      const sections = disclosureSections.map((s) => ({
        filing_id,
        category: s.category,
        name: s.name,
        status: "not-started",
        tag_count: 0,
        error_count: 0,
        sort_order: s.sort_order,
      }));

      const { error: secError } = await supabase.from("disclosure_sections").insert(sections);
      if (secError) {
        console.error("Insert disclosure sections error:", secError);
      } else {
        sectionsCreated = sections.length;
      }
    }

    // 3. Log activity
    if (itemsCreated > 0 || sectionsCreated > 0) {
      await supabase.from("activity_log").insert({
        company_id: filing.company_id,
        filing_id,
        action: "Initialized",
        target: `${filing.filing_type} ${filing.period}`,
        detail: `Created ${itemsCreated} checklist items and ${sectionsCreated} disclosure sections`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        filing_id,
        items_created: itemsCreated,
        sections_created: sectionsCreated,
        message: itemsCreated > 0 || sectionsCreated > 0
          ? `Seeded ${itemsCreated} items and ${sectionsCreated} sections`
          : "Filing already has items and sections — no changes made",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
