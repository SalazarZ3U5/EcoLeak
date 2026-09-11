export const INDUSTRY_PRESETS = {
  'Plastic manufacturing': {
    avgMonthlyKwh: 45000,
    fuel: 'Diesel',
    leakPoint: 'Extruder Thermal Loss & Motor Idle',
    co2Intensity: '540 tCO₂e/yr',
    potentialSaving: '₹6.8L/yr',
    circularIntervention: 'Closed-loop polymer regrind & heat recycling',
    reduction: '38%',
    payback: '11 months'
  },
  'Textile': {
    avgMonthlyKwh: 32000,
    fuel: 'Coal',
    leakPoint: 'Steam Boiler Flue Exhaust & Dyehouse Effluent',
    co2Intensity: '610 tCO₂e/yr',
    potentialSaving: '₹8.4L/yr',
    circularIntervention: 'Biomass boiler retrofit & condensate heat recovery',
    reduction: '44%',
    payback: '9 months'
  },
  'Food processing': {
    avgMonthlyKwh: 28000,
    fuel: 'Natural gas',
    leakPoint: 'Refrigeration Chiller Inefficiency & Washdown Waste',
    co2Intensity: '320 tCO₂e/yr',
    potentialSaving: '₹4.2L/yr',
    circularIntervention: 'Variable speed compressor + anaerobic digestor biogas',
    reduction: '29%',
    payback: '14 months'
  },
  'Metal fabrication': {
    avgMonthlyKwh: 58000,
    fuel: 'LPG',
    leakPoint: 'Induction Furnace Radiation & Scrap Oxidation',
    co2Intensity: '720 tCO₂e/yr',
    potentialSaving: '₹11.2L/yr',
    circularIntervention: 'Pre-heating scrap feed with furnace exhaust',
    reduction: '35%',
    payback: '8 months'
  },
  'Packaging': {
    avgMonthlyKwh: 22000,
    fuel: 'Diesel',
    leakPoint: 'Compressed Air Line Leaks & Drying Tunnels',
    co2Intensity: '280 tCO₂e/yr',
    potentialSaving: '₹3.9L/yr',
    circularIntervention: 'Ultrasonic acoustic leak fixing & IR drying upgrade',
    reduction: '32%',
    payback: '6 months'
  }
};

export const COPILOT_QUESTIONS = [
  {
    q: "Why are our Scope 2 electricity emissions spiking this quarter?",
    a: "Based on sub-metering data, your Extrusion Line #2 had a 34% drop in power factor during night shifts (0.78 vs 0.95 nominal). Adding capacitor banks or staging motor starts will cut 42 tCO₂e and ~₹1.8L in peak demand surcharges."
  },
  {
    q: "What is the fastest payback circular intervention for our boiler?",
    a: "Recovering boiler blowdown heat using a flash tank economizer offers a 7-month payback. It preheats feedwater from 25°C to 72°C, saving 14,000L of fuel oil annually and slashing 38.6 tCO₂e."
  },
  {
    q: "How does our circularity score compare to regional peers?",
    a: "At 68%, your facility ranks in the top 22nd percentile for medium fabrication plants in your cluster. Moving scrap metal recycling in-house can push your score to 81%."
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Plug In Telemetry & Bills',
    subtitle: 'Automated Ingestion',
    desc: 'Connect smart meters, ERP logs, or drop monthly electricity and fuel invoices. Our OCR and API adaptors normalize raw consumption data instantly.',
    stat: '10 min setup',
    tag: 'Non-invasive'
  },
  {
    step: '02',
    title: 'Pinpoint Emission Leak Points',
    subtitle: 'Thermal & Process Analytics',
    desc: 'The CarbonLoop engine isolates high-intensity thermal losses, idle motors, and unrecovered steam leaks with pinpoint sub-process granularity.',
    stat: '±3% precision',
    tag: 'GHG Protocol Aligned'
  },
  {
    step: '03',
    title: 'Simulate Circular Alternatives',
    subtitle: 'Techno-Economic Modeling',
    desc: 'Evaluate biomass retrofits, waste-heat recuperators, or closed-loop material cascades with dynamic CAPEX, OPEX, and carbon ROI simulations.',
    stat: '180+ Interventions',
    tag: 'Pre-vetted Tech'
  },
  {
    step: '04',
    title: 'Execute & Quantify Payback',
    subtitle: 'Closed-Loop Verification',
    desc: 'Track verified reductions in real-time, generate audit-ready BRSR / CSRD compliance reports, and claim certified energy savings.',
    stat: 'Audit-ready',
    tag: 'Measurable ROI'
  }
];
