/**
 * API Service Adapter Layer
 * Connects the React UI to the FastAPI backend.
 * Uses relative URLs so it works in both dev (via Vite proxy) and production (FastAPI static).
 */

const API_BASE = '';

/**
 * Format a number into Indian Rupee representation (e.g., ₹16,20,000 or ₹16.2 Lakh).
 */
export function formatINR(val, compact = false) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const num = Math.round(Number(val));
  if (compact) {
    if (Math.abs(num) >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(1)} Lakh`;
    }
  }
  // Standard Indian numbering grouping
  const str = Math.abs(num).toString();
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  const formatted = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree 
    : lastThree;
  return `${num < 0 ? '-' : ''}₹${formatted}`;
}

/**
 * Format CO2e emissions (in kg or tonnes).
 */
export function formatCO2e(kg, preferTonnes = false) {
  if (kg === undefined || kg === null || isNaN(kg)) return '0 kg CO₂e';
  const val = Number(kg);
  if (preferTonnes || Math.abs(val) >= 1000) {
    return `${(val / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} tCO₂e`;
  }
  return `${Math.round(val).toLocaleString()} kg CO₂e`;
}

/**
 * Health check.
 */
export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

/**
 * Database & Chroma status.
 */
export async function getDatabaseStatus() {
  const res = await fetch(`${API_BASE}/api/database/status`);
  if (!res.ok) throw new Error(`Failed to fetch database status: ${res.status}`);
  return res.json();
}

/**
 * Analyze structured activities.
 * @param {{ industry: string, activities: Array<{ name: string, quantity: number, unit: string }> }} payload
 */
export async function analyzeActivities(payload) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Analysis request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Analyze document (bill, PDF, image) with Gemini OCR & extraction.
 * @param {File} file
 * @param {string} industry
 */
export async function analyzeDocument(file, industry = 'Other') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('industry', industry);

  const res = await fetch(`${API_BASE}/api/analyze/document`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Document analysis failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Analyze natural language description via Chat Copilot.
 * @param {string} message
 */
export async function analyzeChat(message) {
  const res = await fetch(`${API_BASE}/api/analyze/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Chat analysis failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Direct circular economy recommendation for a single material.
 * @param {string} materialKey
 * @param {number} quantityKg
 * @param {number} [substitutionPercent=100]
 */
export async function recommendMaterial(materialKey, quantityKg, substitutionPercent = 100) {
  const res = await fetch(`${API_BASE}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material_key: materialKey,
      quantity_kg: quantityKg,
      substitution_percent: substitutionPercent,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Recommendation failed with status ${res.status}`);
  }
  return res.json();
}
