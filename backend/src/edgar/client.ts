/**
 * SEC EDGAR API Client
 *
 * Server-side client for the SEC EDGAR API. Must be used from a backend
 * environment because EDGAR requires a User-Agent header that browsers
 * cannot reliably set, and CORS blocks direct browser requests.
 *
 * Rate limit: max 10 requests/second per SEC guidelines.
 * User-Agent format: "CompanyName AdminEmail@company.com"
 */

import {
  EdgarSubmissionsResponse,
  EdgarCompanyFactsResponse,
  EdgarCompanyConceptResponse,
  EdgarFact,
  KEY_CONCEPTS,
} from "./types.ts";

const EDGAR_BASE = "https://data.sec.gov";

export class EdgarClient {
  private userAgent: string;
  private lastRequestTime = 0;

  constructor(userAgent: string) {
    if (!userAgent || !userAgent.includes("@")) {
      throw new Error(
        'EDGAR User-Agent must include a contact email, e.g. "MyApp admin@myapp.com"'
      );
    }
    this.userAgent = userAgent;
  }

  private async fetch(url: string): Promise<any> {
    // Rate limit: minimum 100ms between requests (10/sec)
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < 100) {
      await new Promise((r) => setTimeout(r, 100 - elapsed));
    }
    this.lastRequestTime = Date.now();

    const res = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`EDGAR API error: ${res.status} ${res.statusText} for ${url}`);
    }

    return res.json();
  }

  private padCik(cik: string): string {
    return cik.replace(/^0+/, "").padStart(10, "0");
  }

  /**
   * Get company metadata and recent filings list.
   * Endpoint: /submissions/CIK{padded_cik}.json
   */
  async getSubmissions(cik: string): Promise<EdgarSubmissionsResponse> {
    const data = await this.fetch(
      `${EDGAR_BASE}/submissions/CIK${this.padCik(cik)}.json`
    );

    const recent = data.filings?.recent || {};
    const filings = (recent.accessionNumber || [])
      .map((_: string, i: number) => ({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        form: recent.form[i],
        periodOfReport: recent.reportDate?.[i] || recent.filingDate[i],
        primaryDocument: recent.primaryDocument?.[i],
      }))
      .filter((f: any) =>
        ["10-K", "10-Q", "10-K/A", "10-Q/A"].includes(f.form)
      )
      .slice(0, 20);

    const fyEnd = data.fiscalYearEnd || "1231";
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
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
      filings,
    };
  }

  /**
   * Get all XBRL facts for a company, filtered to key concepts.
   * Endpoint: /api/xbrl/companyfacts/CIK{padded_cik}.json
   *
   * This is the most valuable endpoint — it returns every fact the
   * company has ever reported, organized by concept.
   */
  async getCompanyFacts(cik: string): Promise<EdgarCompanyFactsResponse> {
    const data = await this.fetch(
      `${EDGAR_BASE}/api/xbrl/companyfacts/CIK${this.padCik(cik)}.json`
    );

    const usGaap = data.facts?.["us-gaap"] || {};
    const extracted: Record<string, EdgarFact[]> = {};

    for (const concept of KEY_CONCEPTS) {
      const factData = usGaap[concept];
      if (!factData) continue;

      const units =
        factData.units?.USD ||
        factData.units?.shares ||
        factData.units?.["USD/shares"] ||
        [];

      extracted[concept] = units
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
        }))
        .slice(-12);
    }

    return {
      cik: data.cik,
      entityName: data.entityName,
      facts: extracted,
    };
  }

  /**
   * Get historical values for a single concept.
   * Endpoint: /api/xbrl/companyconcept/CIK{padded_cik}/us-gaap/{concept}.json
   */
  async getCompanyConcept(
    cik: string,
    concept: string
  ): Promise<EdgarCompanyConceptResponse> {
    const data = await this.fetch(
      `${EDGAR_BASE}/api/xbrl/companyconcept/CIK${this.padCik(cik)}/us-gaap/${concept}.json`
    );

    const units =
      data.units?.USD ||
      data.units?.shares ||
      data.units?.["USD/shares"] ||
      [];

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

  /**
   * Convenience: get the latest balance sheet values for a specific period.
   * Returns a map of concept → value for matching period end date.
   */
  async getBalanceSheetForPeriod(
    cik: string,
    periodEnd: string,
    form: "10-K" | "10-Q" = "10-Q"
  ): Promise<Record<string, number>> {
    const facts = await this.getCompanyFacts(cik);
    const result: Record<string, number> = {};

    for (const [concept, values] of Object.entries(facts.facts)) {
      const match = values.find(
        (v) => v.end === periodEnd && v.form === form
      );
      if (match) {
        result[concept] = match.value;
      }
    }

    return result;
  }
}
