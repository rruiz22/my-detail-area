/**
 * Formats vehicle information into a consistent display format
 * @param year - Vehicle year
 * @param make - Vehicle make
 * @param model - Vehicle model
 * @param trim - Vehicle trim (optional)
 * @returns Formatted string like "2025 BMW X6 (xDrive40i)" or "2025 BMW X6"
 */
export const formatVehicleDisplay = (
  year?: string | number,
  make?: string,
  model?: string,
  trim?: string
): string => {
  const parts = [year, make, model].filter(Boolean);
  
  if (parts.length === 0) {
    return '';
  }
  
  const baseInfo = parts.join(' ');
  const trimInfo = trim ? ` (${trim})` : '';
  
  return `${baseInfo}${trimInfo}`;
};

/**
 * Creates a real-time vehicle display that updates as fields change
 * @param formData - Object containing vehicle fields
 * @returns Formatted vehicle display string
 */
export const createVehicleDisplay = (formData: {
  vehicleYear?: string | number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
}): string => {
  // Extract trim from vehicleInfo if it contains parentheses
  const trimMatch = formData.vehicleInfo?.match(/\(([^)]+)\)/);
  const trim = trimMatch ? trimMatch[1] : '';
  
  return formatVehicleDisplay(
    formData.vehicleYear,
    formData.vehicleMake,
    formData.vehicleModel,
    trim
  );
};