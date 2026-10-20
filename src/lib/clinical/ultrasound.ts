export function isUltrasoundDescription(description: string) {
  const hay = description.toLowerCase();
  return (
    hay.includes("ultrasound") ||
    hay.includes("usg") ||
    hay.includes("sono") ||
    hay.includes("diagnostic imaging")
  );
}
