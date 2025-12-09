// utils/dateRangeFromAge.js
export const dateRangeFromAge = (minAge, maxAge) => {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - minAge;
  const minYear = currentYear - maxAge;
  return { minYear, maxYear };
};