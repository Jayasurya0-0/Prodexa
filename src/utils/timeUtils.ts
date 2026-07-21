export function getProductionStartTime(): string {
  return localStorage.getItem("mes_production_start_time") || "08:00";
}

export function getProductionInterval(): number {
  const val = localStorage.getItem("mes_production_interval_mins");
  return val ? parseInt(val, 10) : 60;
}

export function saveProductionTimeConfig(startTime: string, intervalMins: number) {
  localStorage.setItem("mes_production_start_time", startTime);
  localStorage.setItem("mes_production_interval_mins", intervalMins.toString());
  // Dispatch a custom event so other components know they should reload configuration
  window.dispatchEvent(new Event("mes_time_config_changed"));
}

export function getHourlyLabels(
  startTimeStr: string = getProductionStartTime(),
  intervalMins: number = getProductionInterval()
): string[] {
  const labels: string[] = [];
  const [hourStr, minStr] = startTimeStr.split(":");
  const startHour = parseInt(hourStr, 10) || 8;
  const startMin = parseInt(minStr, 10) || 0;

  for (let i = 0; i < 10; i++) {
    const totalMinutes = startHour * 60 + startMin + i * intervalMins;
    const hour24 = Math.floor(totalMinutes / 60) % 24;
    const min = Math.floor(totalMinutes % 60);
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minFormatted = min === 0 ? "" : `:${min.toString().padStart(2, "0")}`;
    labels.push(`${hour12}${minFormatted} ${ampm}`);
  }
  return labels;
}
