export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  // If it's in YYYY-MM-DD style (or has time component like YYYY-MM-DDT...)
  const dateOnly = dateString.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`; // Trả về dạng dd-mm-yyyy
  }
  return dateString;
}