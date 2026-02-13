/**
 * Utility for handling dates in Ecuador Time (UTC-5)
 */

export const getEcuadorNow = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * -5)); // Ecuador UTC-5
};

export const getEcuadorDateRange = (filterMode: string, customDate?: string): { startDate: Date, endDate: Date } | null => {
  if (!filterMode || filterMode === "all") return null;

  const ecTime = getEcuadorNow();
  let targetDate = new Date(ecTime);

  if (filterMode === "yesterday") {
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (filterMode === "tomorrow") {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (filterMode === "custom" && customDate) {
    targetDate = new Date(customDate);
  }

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  // Create start and end dates in UTC but representing the full day in EC
  // Since we want to query MongoDB dates which are store in UTC.
  // A day in EC (UTC-5) starts at 05:00 UTC and ends at 04:59 UTC next day.
  // HOWEVER, the current implementation uses the YYYY-MM-DDT00:00:00.000Z format 
  // which implies "The date as stored in the DB". 
  // To avoid breaking existing deliveryDate logic, we'll stick to the "Date String" approach 
  // but ensure it's calculated from the EC reference.

  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    startDate: new Date(`${dateStr}T00:00:00.000Z`),
    endDate: new Date(`${dateStr}T23:59:59.999Z`)
  };
};
