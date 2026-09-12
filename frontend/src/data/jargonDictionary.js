/**
 * EcoLeak Comprehensive Industrial & Sustainability Jargon Dictionary
 * Extracted directly from official platform documentation, EcoLeak Stuff.pdf,
 * GHG Protocol, SPCB/CPCB regulatory manuals, and engineering scaling laws.
 */

export const JARGON_CATEGORIES = {
  CARBON: { label: 'Carbon & GHG', color: '#00b86b', bg: 'rgba(0, 184, 107, 0.12)' },
  SCOPES: { label: 'GHG Protocol Scopes', color: '#0284c7', bg: 'rgba(14, 165, 233, 0.12)' },
  CIRCULAR: { label: 'Circular Economy', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  MATERIALS: { label: 'Polymers & Materials', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  ENERGY: { label: 'Energy & Utilities', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  FINANCIAL: { label: 'Financial & ROI', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  COMPLIANCE: { label: 'Statutory & ESG', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },
  METHODOLOGY: { label: 'Engineering Math', color: '#0d9488', bg: 'rgba(13, 148, 136, 0.12)' }
};

export const JARGON_DICTIONARY = {
  // ── Carbon & Sustainability ──────────────────────────────────────────────
  'co2': {
    term: 'CO₂',
    fullName: 'Carbon Dioxide',
    category: 'CARBON',
    definition: 'Primary greenhouse gas released from burning fossil fuels like coal, diesel, natural gas, and petrol in industrial boilers and generators.',
    badge: '1 Molecule Carbon + 2 Oxygen'
  },
  'co2e': {
    term: 'CO₂e',
    fullName: 'Carbon Dioxide Equivalent',
    category: 'CARBON',
    definition: 'Universal measurement unit used to standardize the climate impact of all greenhouse gases (methane, nitrous oxide, refrigerants) into the equivalent warming effect of CO₂.',
    badge: 'Standard Metric (kg / MT)'
  },
  'tco2e': {
    term: 'tCO₂e',
    fullName: 'Tonnes of CO₂ Equivalent',
    category: 'CARBON',
    definition: 'International industrial carbon reporting unit equivalent to 1,000 kilograms (1 Metric Ton) of CO₂e.',
    badge: '1 tCO₂e = 1,000 kg CO₂e'
  },
  'ghg': {
    term: 'GHG',
    fullName: 'Greenhouse Gas',
    category: 'CARBON',
    definition: 'Atmospheric gases that absorb and emit radiant heat within the thermal infrared spectrum, including carbon dioxide (CO₂), methane (CH₄), nitrous oxide (N₂O), and fluorinated gases.',
    badge: 'Global Warming Driver'
  },
  'carbon footprint': {
    term: 'Carbon Footprint',
    fullName: 'Total Greenhouse Gas Inventory',
    category: 'CARBON',
    definition: 'Total volume of greenhouse gas emissions generated directly and indirectly across factory operations, energy consumption, and supply chain material procurement.',
    badge: 'Expressed in kg/MT CO₂e'
  },

  // ── Emission Scopes (GHG Protocol) ────────────────────────────────────────
  'scope 1': {
    term: 'Scope 1',
    fullName: 'Direct Operational Emissions',
    category: 'SCOPES',
    definition: 'Direct greenhouse emissions originating from company-owned or controlled assets—such as on-site diesel backup generators (DG sets), thermal boilers (LPG/furnace oil), and process heat reactions.',
    badge: 'On-Site Combustion'
  },
  'scope 2': {
    term: 'Scope 2',
    fullName: 'Indirect Purchased Utility Emissions',
    category: 'SCOPES',
    definition: 'Indirect emissions resulting from the off-site generation of purchased electricity, steam, heating, and cooling consumed in factory operations from state utility grids.',
    badge: 'Grid Electricity (CEA Factors)'
  },
  'scope 3': {
    term: 'Scope 3',
    fullName: 'Value Chain & Upstream Material Emissions',
    category: 'SCOPES',
    definition: 'All other indirect supply chain emissions—principally purchased virgin petrochemical raw materials, supplier logistics, freight, and post-consumer waste. Usually 70%–85% of total plant footprint.',
    badge: 'Raw Feedstocks & Supply Chain'
  },
  'ghg protocol': {
    term: 'GHG Protocol',
    fullName: 'Greenhouse Gas Protocol Corporate Standard',
    category: 'SCOPES',
    definition: 'The global standard framework established by WRI and WBCSD providing the foundational rules to classify, calculate, and audit Scope 1, 2, and 3 emissions.',
    badge: 'ISO 14064-1 Aligned'
  },

  // ── Circular Economy & Materials ──────────────────────────────────────────
  'ce': {
    term: 'CE',
    fullName: 'Circular Economy',
    category: 'CIRCULAR',
    definition: 'An industrial system that is restorative by design, eliminating linear waste through material recovery, closed-loop recycling, and high-efficiency substitution.',
    badge: 'Zero Waste to Landfill'
  },
  'circular economy': {
    term: 'Circular Economy',
    fullName: 'Closed-Loop Regenerative Manufacturing',
    category: 'CIRCULAR',
    definition: 'Transition from linear "take-make-dispose" manufacturing to a closed-loop model where factory scrap, purge waste, and post-consumer polymers are re-engineered as primary inputs.',
    badge: 'Resource Circulation'
  },
  'closed-loop': {
    term: 'Closed-Loop',
    fullName: 'Closed-Loop Manufacturing & Recycling',
    category: 'CIRCULAR',
    definition: 'Process where manufacturing scrap or end-of-life products are collected, reground, and reused directly within the same manufacturing cycle without property loss.',
    badge: 'Infinite In-House Recycling'
  },
  'open-loop': {
    term: 'Open-Loop',
    fullName: 'Open-Loop / Cascaded Recycling',
    category: 'CIRCULAR',
    definition: 'Material recycling where waste from one production stream is downcycled or repurposed into a different, often lower-specification secondary industry.',
    badge: 'Cascaded Diversion'
  },
  'circularity score': {
    term: 'Circularity Score',
    fullName: 'Circularity Index Metric',
    category: 'CIRCULAR',
    definition: 'Quantitative performance index (0%–100%) tracking the proportion of recycled inputs vs. virgin petrochemical feedstocks and internal scrap reuse rates.',
    badge: 'Target: >50% Closed Loop'
  },
  'material substitution': {
    term: 'Material Substitution',
    fullName: 'Engineering Feedstock Substitution',
    category: 'CIRCULAR',
    definition: 'Replacing carbon-heavy virgin polymer resins or virgin metals with high-grade post-consumer resins (PCR) or regrind without compromising tensile and impact strength.',
    badge: 'Up to 70% CO₂e Reduction'
  },
  'pet': {
    term: 'PET',
    fullName: 'Polyethylene Terephthalate',
    category: 'MATERIALS',
    definition: 'Common thermoplastic polyester resin widely used in packaging bottles, thermoformed trays, and synthetic textile fibers (Virgin EF: 2.15 kg CO₂e/kg).',
    badge: 'Virgin Factor: 2.15 kg/kg'
  },
  'rpet': {
    term: 'rPET',
    fullName: 'Recycled Polyethylene Terephthalate',
    category: 'MATERIALS',
    definition: 'Mechanically or chemically recycled PET resin with up to 75% lower embedded carbon emissions compared to virgin PET (Recycled EF: 0.45 kg CO₂e/kg).',
    badge: 'Cuts CO₂e by ~79%'
  },
  'hdpe': {
    term: 'HDPE',
    fullName: 'High-Density Polyethylene',
    category: 'MATERIALS',
    definition: 'Rigid, chemical-resistant thermoplastic polymer used in industrial drums, blow-moulded bottles, piping, and crates (Virgin EF: 1.90 kg CO₂e/kg).',
    badge: 'Virgin Factor: 1.90 kg/kg'
  },
  'ldpe': {
    term: 'LDPE',
    fullName: 'Low-Density Polyethylene',
    category: 'MATERIALS',
    definition: 'Flexible, ductile thermoplastic polymer synthesized under high pressure, predominantly used in industrial stretch film, plastic bags, and liner pouches.',
    badge: 'Virgin Factor: 1.85 kg/kg'
  },
  'pp': {
    term: 'PP',
    fullName: 'Polypropylene',
    category: 'MATERIALS',
    definition: 'Fatigue-resistant, lightweight polymer used extensively in automotive components, woven sacks, closures, and injection moulding (Virgin EF: 1.95 kg CO₂e/kg).',
    badge: 'Virgin Factor: 1.95 kg/kg'
  },
  'pvc': {
    term: 'PVC',
    fullName: 'Polyvinyl Chloride',
    category: 'MATERIALS',
    definition: 'Chlorinated synthetic polymer widely used in industrial construction, conduit piping, window profiles, and electrical cable sheathing (Virgin EF: 2.20 kg CO₂e/kg).',
    badge: 'High Chemical Durability'
  },
  'pcr': {
    term: 'PCR',
    fullName: 'Post-Consumer Resin',
    category: 'MATERIALS',
    definition: 'Pelletized polymer resin produced by washing, sorting, and compounding plastic waste discarded by end consumers after commercial usage.',
    badge: 'Certified Circular Feedstock'
  },
  'virgin material': {
    term: 'Virgin Material',
    fullName: 'Virgin Petrochemical Resin / Alloy',
    category: 'MATERIALS',
    definition: 'Freshly synthesized raw petrochemical plastic or primary smelted metal that has never been previously processed or recycled; highest carbon footprint.',
    badge: 'Maximum Carbon Intensity'
  },

  // ── Energy & Utilities ───────────────────────────────────────────────────
  'kwh': {
    term: 'kWh',
    fullName: 'Kilowatt Hour',
    category: 'ENERGY',
    definition: 'Standard metric measurement of electrical energy consumption equal to one kilowatt (1,000 watts) of power sustained continuously over one hour (1 kWh = 3.6 MJ).',
    badge: 'Electricity Billing Unit'
  },
  'mwh': {
    term: 'MWh',
    fullName: 'Megawatt Hour',
    category: 'ENERGY',
    definition: 'Industrial power metric equal to 1,000 kilowatt-hours (kWh); standard measurement for factory grid billing and electrical transformer loads.',
    badge: '1 MWh = 1,000 kWh'
  },
  'gwh': {
    term: 'GWh',
    fullName: 'Gigawatt Hour',
    category: 'ENERGY',
    definition: 'Utility-scale energy unit equal to 1,000,000 kilowatt-hours (kWh), representing regional transmission capacity or massive heavy-industrial annual consumption.',
    badge: '1,000,000 kWh'
  },
  'lpg': {
    term: 'LPG',
    fullName: 'Liquefied Petroleum Gas',
    category: 'ENERGY',
    definition: 'Pressurized hydrocarbon gas (propane/butane) stored as liquid and combusted in industrial boilers, furnaces, and paint ovens (EF: 2.98 kg CO₂e/kg).',
    badge: 'Scope 1 Thermal Fuel'
  },
  'png': {
    term: 'PNG',
    fullName: 'Piped Natural Gas',
    category: 'ENERGY',
    definition: 'Methane-rich natural gas delivered through pipeline networks for continuous furnace and boiler operations; cleaner burn than furnace oil (EF: 2.02 kg CO₂e/m³).',
    badge: 'Pipeline Clean Fuel'
  },
  'cng': {
    term: 'CNG',
    fullName: 'Compressed Natural Gas',
    category: 'ENERGY',
    definition: 'Methane compressed to over 200 bar, used as an environmentally cleaner alternative to diesel in industrial plant transport and internal yard forklifts.',
    badge: 'Low Particulate Alternative'
  },

  // ── Financial Metrics & Engineering Scaling ──────────────────────────────
  'capex': {
    term: 'CAPEX',
    fullName: 'Capital Expenditure',
    category: 'FINANCIAL',
    definition: 'One-time upfront capital investment required to purchase, install, and commission industrial assets—such as granulators, regrind blending silos, or boiler economizers.',
    badge: 'Upfront Asset Investment'
  },
  'opex': {
    term: 'OPEX',
    fullName: 'Operational Expenditure',
    category: 'FINANCIAL',
    definition: 'Ongoing recurring operating expenses required to run factory production, procure raw material resin, pay utility electricity tariffs, and service machinery.',
    badge: 'Recurring Annual Expenses'
  },
  'roi': {
    term: 'ROI',
    fullName: 'Return on Investment',
    category: 'FINANCIAL',
    definition: 'Financial performance ratio measuring the annual net cost savings generated by a circular technology transition relative to the upfront capital deployed.',
    badge: 'Cost Recovery Ratio'
  },
  'payback period': {
    term: 'Payback Period',
    fullName: 'Simple Capital Payback Period',
    category: 'FINANCIAL',
    definition: 'The calculated timeframe (in months or years) required for cumulative raw material and energy cost savings to fully recover initial equipment capital expenditure.',
    badge: 'Target: < 18 Months'
  },
  "williams' 0.65 rule": {
    term: "Williams' 0.65 Rule",
    fullName: "Williams' 0.65 Capacity Scaling Law",
    category: 'METHODOLOGY',
    definition: 'Classic chemical engineering power law scaling capital equipment cost non-linearly with plant capacity: C₂ = C₁ × (Q₂ / Q₁)^0.65, accounting for economies of scale.',
    badge: 'C₂ = C₁ × (Q₂ / Q₁)^0.65'
  },

  // ── Statutory, SPCB, CPCB & ESG Standards ────────────────────────────────
  'spcb': {
    term: 'SPCB',
    fullName: 'State Pollution Control Board',
    category: 'COMPLIANCE',
    definition: 'Statutory state authority in India (e.g. MPCB Maharashtra, GPCB Gujarat) responsible for enforcing Air and Water Acts, inspecting plants, and issuing Consent to Operate permits.',
    badge: 'State Statutory Authority'
  },
  'cpcb': {
    term: 'CPCB',
    fullName: 'Central Pollution Control Board',
    category: 'COMPLIANCE',
    definition: 'Apex statutory environmental authority under India’s Ministry of Environment (MoEFCC), establishing national pollution index standards and industry categorization.',
    badge: 'National Environmental Body'
  },
  'cto': {
    term: 'CTO',
    fullName: 'Consent to Operate',
    category: 'COMPLIANCE',
    definition: 'Mandatory statutory environmental permit issued by State Pollution Control Boards under Section 25/26 of the Water Act and Section 21 of the Air Act permitting plant manufacturing.',
    badge: 'Mandatory Operating License'
  },
  'orange category': {
    term: 'Orange Category',
    fullName: 'CPCB Orange Industrial Pollution Category',
    category: 'COMPLIANCE',
    definition: 'Manufacturing facilities with a Pollution Index (PI) score between 41 and 59, representing moderate environmental impact requiring quarterly compliance audits and periodic renewals.',
    badge: 'Pollution Index: 41–59'
  },
  'red category': {
    term: 'Red Category',
    fullName: 'CPCB Red Industrial Pollution Category',
    category: 'COMPLIANCE',
    definition: 'Heavy industrial operations with Pollution Index (PI) score of 60+, generating high emissions or hazardous effluent; requires continuous online emission monitoring systems (OCEMS).',
    badge: 'Pollution Index: 60+'
  },
  'brsr': {
    term: 'BRSR',
    fullName: 'Business Responsibility and Sustainability Reporting',
    category: 'COMPLIANCE',
    definition: 'SEBI-mandated ESG framework requiring Indian enterprises and their Tier-1/Tier-2 vendor supply chains to disclose Scope 1–3 GHG emissions and resource circularity metrics.',
    badge: 'SEBI ESG Mandate'
  },
  'cbam': {
    term: 'CBAM',
    fullName: 'Carbon Border Adjustment Mechanism',
    category: 'COMPLIANCE',
    definition: 'European Union climate regulation imposing carbon import tariffs on energy-intensive industrial exports (steel, aluminum, chemicals, polymers) based on verified embedded emissions.',
    badge: 'EU Carbon Border Tariff'
  },
  'lca': {
    term: 'LCA',
    fullName: 'Life Cycle Assessment',
    category: 'COMPLIANCE',
    definition: 'Standardized ISO 14040/44 methodology assessing the environmental and carbon impacts of a product through its entire lifecycle from cradle to grave.',
    badge: 'ISO 14040 / 14044'
  },
  'epd': {
    term: 'EPD',
    fullName: 'Environmental Product Declaration',
    category: 'COMPLIANCE',
    definition: 'Third-party verified ISO 14025 document providing transparent, comparable data regarding the lifecycle environmental and carbon footprint of manufactured goods.',
    badge: 'ISO 14025 Verified'
  },
  'dqi': {
    term: 'DQI',
    fullName: 'Data Quality Index',
    category: 'METHODOLOGY',
    definition: 'Auditability rating (0%–100%) grading entered plant telemetry based on primary utility invoices, calibrated flow meters, and verified supplier certifications.',
    badge: 'Audit Reliability Metric'
  },
  'pareto 80/20': {
    term: 'Pareto 80/20',
    fullName: 'Pareto 80/20 Emission Distribution Principle',
    category: 'METHODOLOGY',
    definition: 'Statistical principle observed across manufacturing facilities where roughly 80% of total operational carbon emissions originate from just 20% of dominant input streams.',
    badge: '80% Impact from 20% Inputs'
  },
  'leak point': {
    term: 'Leak Point',
    fullName: 'Industrial Emission Leak Point',
    category: 'METHODOLOGY',
    definition: 'An isolated high-emission operational node or virgin material feedstock identified by Pareto ranking as driving the lion’s share of factory greenhouse footprint.',
    badge: 'Primary Decarbonization Target'
  },
  'digital twin': {
    term: 'Digital Twin',
    fullName: 'Process Stream Digital Twin',
    category: 'METHODOLOGY',
    definition: 'A physics-grounded computational model simulating industrial factory energy, material mass balances, and emission reductions before physical capital deployment.',
    badge: 'Physics-Grounded Simulation'
  },
  'what-if analysis': {
    term: 'What-If Analysis',
    fullName: 'Dynamic Scenario Simulation',
    category: 'METHODOLOGY',
    definition: 'Predictive modeling allowing plant operators to test operational changes (e.g. 30% vs 50% PCR substitution) to evaluate projected CAPEX, OPEX savings, and emission cuts.',
    badge: 'Scenario Modeling'
  },
  'emission factor': {
    term: 'Emission Factor',
    fullName: 'Greenhouse Gas Emission Factor (EF)',
    category: 'CARBON',
    definition: 'Representative engineering coefficient relating operational activity data (kg material purchased, kWh electricity, or liter fuel burned) to greenhouse gas volume released: CO₂e = Q × EF.',
    badge: 'CO₂e = Q × EF'
  },
  'iso 14064-1': {
    term: 'ISO 14064-1',
    fullName: 'ISO 14064-1 GHG Inventory Standard',
    category: 'COMPLIANCE',
    definition: 'International standard specifying principles and requirements at organizational level for quantification, monitoring, and third-party auditing of greenhouse gas inventories and removals.',
    badge: 'Global Audit Standard'
  },
  'iso 14001': {
    term: 'ISO 14001',
    fullName: 'ISO 14001 Environmental Management System',
    category: 'COMPLIANCE',
    definition: 'Internationally agreed management framework helping industrial organizations improve resource efficiency, reduce waste, and comply with state and national environmental regulations.',
    badge: 'EMS Certification'
  }
};

/**
 * Common Aliases Mapping
 */
export const JARGON_ALIASES = {
  'co₂': 'co2',
  'co₂e': 'co2e',
  'tco₂': 'tco2e',
  'tco₂e': 'tco2e',
  'mt co2e': 'tco2e',
  'hotspot': 'leak point',
  'hotspots': 'leak point',
  'emission leaks': 'leak point',
  'emission leak': 'leak point',
  'pareto': 'pareto 80/20',
  '80/20': 'pareto 80/20',
  '80/20 rule': 'pareto 80/20',
  'williams rule': "williams' 0.65 rule",
  "williams' rule": "williams' 0.65 rule",
  '0.65 rule': "williams' 0.65 rule",
  'consent to operate': 'cto',
  'consent': 'cto',
  'spcb cto': 'cto',
  'state pollution control board': 'spcb',
  'central pollution control board': 'cpcb',
  'circularity': 'circular economy',
  'virgin resin': 'virgin material',
  'virgin polymer': 'virgin material',
  'virgin plastic pellets': 'virgin material',
  'virgin plastic': 'virgin material',
  'recycled pcr': 'pcr',
  'pcr resin': 'pcr',
  'payback': 'payback period',
  'ef': 'emission factor',
  'emission factors': 'emission factor',
  'iso 14064': 'iso 14064-1',
  'iso14064': 'iso 14064-1',
  'iso14001': 'iso 14001',
  'brsr core': 'brsr'
};

/**
 * Helper to retrieve jargon metadata by term or acronym
 */
export function getJargon(term) {
  if (!term) return null;
  const rawKey = String(term).toLowerCase().trim();
  const normalizedKey = rawKey.replace(/₂/g, '2');
  
  if (JARGON_DICTIONARY[rawKey]) return JARGON_DICTIONARY[rawKey];
  if (JARGON_DICTIONARY[normalizedKey]) return JARGON_DICTIONARY[normalizedKey];

  const aliasKey = JARGON_ALIASES[rawKey] || JARGON_ALIASES[normalizedKey];
  if (aliasKey && JARGON_DICTIONARY[aliasKey]) return JARGON_DICTIONARY[aliasKey];

  return null;
}

