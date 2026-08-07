export interface Company {
  id: string;
  name: string;
  domain: string;
  country: string;
  industry: string;
  employees: number;
}

export const REGISTERED_COMPANIES: Company[] = [
  { id: 'saveetha', name: 'Saveetha University', domain: 'saveetha.com', country: 'India', industry: 'Education', employees: 4500 },
  { id: 'infosys', name: 'Infosys Ltd', domain: 'infosys.com', country: 'India', industry: 'IT Services', employees: 315000 },
  { id: 'tcs', name: 'Tata Consultancy Services', domain: 'tcs.com', country: 'India', industry: 'IT Services', employees: 616000 },
  { id: 'wipro', name: 'Wipro Ltd', domain: 'wipro.com', country: 'India', industry: 'IT Services', employees: 230000 },
  { id: 'google', name: 'Google LLC', domain: 'google.com', country: 'United States', industry: 'Technology', employees: 182000 },
  { id: 'microsoft', name: 'Microsoft Corp', domain: 'microsoft.com', country: 'United States', industry: 'Technology', employees: 228000 },
  { id: 'amazon', name: 'Amazon.com Inc', domain: 'amazon.com', country: 'United States', industry: 'E-Commerce', employees: 1500000 },
  { id: 'meta', name: 'Meta Platforms', domain: 'meta.com', country: 'United States', industry: 'Social Media', employees: 72000 },
  { id: 'apple', name: 'Apple Inc', domain: 'apple.com', country: 'United States', industry: 'Technology', employees: 164000 },
  { id: 'ibm', name: 'IBM Corp', domain: 'ibm.com', country: 'United States', industry: 'Technology', employees: 282000 },
  { id: 'oracle', name: 'Oracle Corp', domain: 'oracle.com', country: 'United States', industry: 'Software', employees: 143000 },
  { id: 'sap', name: 'SAP SE', domain: 'sap.com', country: 'Germany', industry: 'Software', employees: 108000 },
  { id: 'siemens', name: 'Siemens AG', domain: 'siemens.com', country: 'Germany', industry: 'Industrial', employees: 320000 },
  { id: 'accenture', name: 'Accenture PLC', domain: 'accenture.com', country: 'Ireland', industry: 'Consulting', employees: 733000 },
  { id: 'samsung', name: 'Samsung Electronics', domain: 'samsung.com', country: 'South Korea', industry: 'Electronics', employees: 270000 },
  { id: 'sony', name: 'Sony Group Corp', domain: 'sony.com', country: 'Japan', industry: 'Electronics', employees: 113000 },
  { id: 'toyota', name: 'Toyota Motor Corp', domain: 'toyota.com', country: 'Japan', industry: 'Automotive', employees: 375000 },
  { id: 'hitachi', name: 'Hitachi Ltd', domain: 'hitachi.com', country: 'Japan', industry: 'Conglomerate', employees: 350000 },
  { id: 'tencent', name: 'Tencent Holdings', domain: 'tencent.com', country: 'China', industry: 'Technology', employees: 110000 },
  { id: 'huawei', name: 'Huawei Technologies', domain: 'huawei.com', country: 'China', industry: 'Telecom', employees: 207000 },
  { id: 'alibaba', name: 'Alibaba Group', domain: 'alibaba.com', country: 'China', industry: 'E-Commerce', employees: 235000 },
  { id: 'dbs', name: 'DBS Bank', domain: 'dbs.com', country: 'Singapore', industry: 'Banking', employees: 32000 },
  { id: 'ubisoft', name: 'Ubisoft Entertainment', domain: 'ubisoft.com', country: 'France', industry: 'Gaming', employees: 19000 },
  { id: 'airbus', name: 'Airbus SE', domain: 'airbus.com', country: 'Netherlands', industry: 'Aerospace', employees: 134000 },
  { id: 'netflix', name: 'Netflix Inc', domain: 'netflix.com', country: 'United States', industry: 'Media', employees: 13000 },
  { id: 'uber', name: 'Uber Technologies', domain: 'uber.com', country: 'United States', industry: 'Mobility', employees: 33000 },
  { id: 'nvidia', name: 'NVIDIA Corp', domain: 'nvidia.com', country: 'United States', industry: 'Semiconductors', employees: 30000 },
  { id: 'salesforce', name: 'Salesforce Inc', domain: 'salesforce.com', country: 'United States', industry: 'Software', employees: 72000 },
  { id: 'teleperformance', name: 'Teleperformance', domain: 'teleperformance.com', country: 'France', industry: 'BPO Services', employees: 410000 },
  { id: 'cognizant', name: 'Cognizant Technology', domain: 'cognizant.com', country: 'United States', industry: 'IT Services', employees: 347000 },
];

export function getCompanyByDomain(domain?: string): Company | undefined {
  if (!domain) return undefined;
  const normalized = domain.toLowerCase().trim();
  return REGISTERED_COMPANIES.find(
    (c) => c.domain === normalized || normalized.endsWith(`.${c.domain}`)
  );
}
