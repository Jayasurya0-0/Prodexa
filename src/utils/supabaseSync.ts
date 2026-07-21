import { createClient } from "./supabase/client";
import { ProductionLine, FactoryMetrics, LineStatus, RBACUser } from "../types";
import { supervisorsList } from "../mockData";
import { hashPasswordIfNeeded } from "./hash";
import { getProductionStartTime, getProductionInterval } from "./timeUtils";

const supabase = createClient();

const HOURS = [
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM"
];

// Database Seeding Lines definitions for fresh database setup
const SEED_LINES: any[] = [
  {
    lineNo: "L01",
    supervisor: "James Wilson",
    buyer: "ZARA",
    style: "ZRD-2405",
    targetPcs: 1000,
    currentProductionPcs: 450,
    currentHourPcs: 45,
    efficiency: 75.0,
    balancePcs: 550,
    status: "Running",
    hourlyLog: [40, 45, 50, 45, 45, 50, 40, 45, 45, 45],
  },
  {
    lineNo: "L02",
    supervisor: "Michael Brown",
    buyer: "H&M",
    style: "HM-1234",
    targetPcs: 800,
    currentProductionPcs: 380,
    currentHourPcs: 38,
    efficiency: 72.5,
    balancePcs: 420,
    status: "Running",
    hourlyLog: [35, 38, 40, 38, 38, 40, 35, 38, 38, 40],
  },
  {
    lineNo: "L03",
    supervisor: "David Lee",
    buyer: "NEXT",
    style: "NXT-9876",
    targetPcs: 1200,
    currentProductionPcs: 620,
    currentHourPcs: 65,
    efficiency: 81.2,
    balancePcs: 580,
    status: "Running",
    hourlyLog: [55, 60, 65, 60, 60, 65, 55, 65, 65, 70],
  },
  {
    lineNo: "L04",
    supervisor: "Robert Taylor",
    buyer: "M&S",
    style: "MS-5432",
    targetPcs: 950,
    currentProductionPcs: 410,
    currentHourPcs: 40,
    efficiency: 68.4,
    balancePcs: 540,
    status: "Running",
    hourlyLog: [35, 40, 42, 40, 40, 42, 35, 40, 42, 44],
  },
  {
    lineNo: "L05",
    supervisor: "Daniel Harris",
    buyer: "UNIQLO",
    style: "UQ-7788",
    targetPcs: 1100,
    currentProductionPcs: 0,
    currentHourPcs: 0,
    efficiency: 0.0,
    balancePcs: 1100,
    status: "Idle",
    hourlyLog: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    lineNo: "L06",
    supervisor: "Sarah Jenkins",
    buyer: "ADIDAS",
    style: "AD-8812",
    targetPcs: 1050,
    currentProductionPcs: 510,
    currentHourPcs: 52,
    efficiency: 76.5,
    balancePcs: 540,
    status: "Running",
    hourlyLog: [45, 50, 52, 50, 50, 52, 45, 52, 52, 52],
  },
  {
    lineNo: "L07",
    supervisor: "William Davis",
    buyer: "NIKE",
    style: "NK-9921",
    targetPcs: 1300,
    currentProductionPcs: 720,
    currentHourPcs: 75,
    efficiency: 83.1,
    balancePcs: 580,
    status: "Running",
    hourlyLog: [65, 70, 75, 70, 70, 75, 65, 75, 75, 80],
  },
  {
    lineNo: "L08",
    supervisor: "Emily Garcia",
    buyer: "GAP",
    style: "GP-0043",
    targetPcs: 900,
    currentProductionPcs: 390,
    currentHourPcs: 38,
    efficiency: 70.8,
    balancePcs: 510,
    status: "Running",
    hourlyLog: [35, 38, 40, 38, 38, 40, 35, 38, 38, 40],
  },
  {
    lineNo: "L09",
    supervisor: "Kevin Martinez",
    buyer: "LEVI'S",
    style: "LV-5541",
    targetPcs: 1000,
    currentProductionPcs: 460,
    currentHourPcs: 45,
    efficiency: 75.5,
    balancePcs: 540,
    status: "Running",
    hourlyLog: [40, 45, 48, 45, 45, 48, 40, 45, 45, 45],
  },
  {
    lineNo: "L10",
    supervisor: "Anna Kovacs",
    buyer: "PUMA",
    style: "PM-3311",
    targetPcs: 850,
    currentProductionPcs: 0,
    currentHourPcs: 0,
    efficiency: 0.0,
    balancePcs: 850,
    status: "Idle",
    hourlyLog: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }
];

// Helper to determine if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || key.includes("placeholder")) {
    return false;
  }
  return true;
};

// Seed supervisor profiles if they are empty and keep them in perfect sync with the employees table
export const seedSupervisorsIfNeeded = async (): Promise<Record<string, string>> => {
  if (!isSupabaseConfigured()) return {};

  try {
    // 1. Fetch all employees from the DB to align status, names, and existence
    const { data: employeesData, error: empError } = await supabase
      .from("employees")
      .select("id, first_name, last_name, employee_id, designation, status");

    if (empError) throw empError;

    const supervisorDesignations = ["supervisor", "lead", "manager", "engineer", "admin", "analyst"];
    const activeDbSupervisors = (employeesData || []).filter(emp => {
      if (emp.status !== "Active") return false;
      const des = (emp.designation || "").toLowerCase();
      return supervisorDesignations.some(role => des.includes(role));
    });

    // 2. Fetch current profiles from supervisor_profiles
    const { data: currentProfiles, error: profError } = await supabase
      .from("supervisor_profiles")
      .select("id, name, badge_id");

    if (profError) throw profError;

    const profileByBadge = new Map<string, { id: string; name: string }>();
    if (currentProfiles) {
      currentProfiles.forEach(p => {
        if (p.badge_id) {
          profileByBadge.set(p.badge_id, { id: p.id, name: p.name });
        }
      });
    }

    const activeBadgeIds = new Set<string>();
    const supervisorIdMap: Record<string, string> = {};

    // 3. Ensure every active supervisor has a profile, and its name matches the employee's current name
    for (const emp of activeDbSupervisors) {
      const cleanName = emp.last_name ? `${emp.first_name} ${emp.last_name}`.trim() : emp.first_name.trim();
      activeBadgeIds.add(emp.employee_id);

      const existing = profileByBadge.get(emp.employee_id);
      if (existing) {
        supervisorIdMap[cleanName] = existing.id;
        // If name in supervisor_profiles has changed (e.g. they corrected it in workforce directory), update it
        if (existing.name !== cleanName) {
          console.log(`Dynamic Supervisor Sync: Updating name from "${existing.name}" to "${cleanName}" for badge ${emp.employee_id}`);
          const { error: updateError } = await supabase
            .from("supervisor_profiles")
            .update({ name: cleanName })
            .eq("id", existing.id);
          
          if (updateError) {
            console.error(`Failed to update supervisor profile name for badge ${emp.employee_id}:`, updateError);
          }
        }
      } else {
        // Create new supervisor profile
        console.log(`Dynamic Supervisor Sync: Auto-creating supervisor profile for active supervisor "${cleanName}"`);
        const { data: inserted, error: insertError } = await supabase
          .from("supervisor_profiles")
          .insert({
            id: emp.id, // Align UUID id
            name: cleanName,
            badge_id: emp.employee_id,
            factory_unit: "Prodexa Garments Ltd. (Unit 1)",
            active_lines: []
          })
          .select("id")
          .maybeSingle();

        if (!insertError && inserted) {
          supervisorIdMap[cleanName] = inserted.id;
        } else if (insertError) {
          console.error(`Failed to auto-create supervisor profile for "${cleanName}":`, insertError.message);
        }
      }
    }

    // 4. Delete supervisor profiles that are no longer active supervisor employees (deleted, status changed, etc.)
    if (currentProfiles) {
      for (const prof of currentProfiles) {
        if (prof.badge_id && !activeBadgeIds.has(prof.badge_id)) {
          console.log(`Dynamic Supervisor Sync: Cleaning up obsolete supervisor profile "${prof.name}" (badge: ${prof.badge_id})`);
          try {
            const { error: deleteError } = await supabase
              .from("supervisor_profiles")
              .delete()
              .eq("id", prof.id);
            
            if (deleteError) {
              console.warn(`Could not delete obsolete supervisor profile "${prof.name}" (likely because they are assigned to an active production line):`, deleteError.message);
            }
          } catch (delErr) {
            console.warn(`Exception during deletion of supervisor profile "${prof.name}":`, delErr);
          }
        }
      }
    }

    // 5. If everything is empty (first-time setup or no database employees loaded), seed static defaults
    if (Object.keys(supervisorIdMap).length === 0) {
      console.log("No supervisors found in database. Seeding default supervisorsList...");
      const seedData = supervisorsList.map((sup, idx) => ({
        name: sup.name,
        badge_id: `BADGE-${1000 + idx}`,
        factory_unit: "Prodexa Garments Ltd. (Unit 1)",
        active_lines: []
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("supervisor_profiles")
        .insert(seedData)
        .select("id, name");

      if (insertError) throw insertError;

      if (inserted) {
        inserted.forEach((sup) => {
          supervisorIdMap[sup.name] = sup.id;
        });
      }
    }

    return supervisorIdMap;
  } catch (err) {
    console.error("Error seeding/syncing supervisors:", err);
    return {};
  }
};

// Fetch all lines and hourly logs from Supabase
export const fetchProductionLinesFromSupabase = async (selectedDate?: string): Promise<ProductionLine[] | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Ensure supervisors exist
    const supervisorIdMap = await seedSupervisorsIfNeeded();

    // 1. Fetch lines from database
    const { data: dbLines, error: linesError } = await supabase
      .from("production_lines")
      .select("*")
      .order("line_no", { ascending: true });

    if (linesError) throw linesError;

    // 2. If no lines, seed default lines
    if (!dbLines || dbLines.length === 0) {
      console.log("Supabase production_lines is empty. Seeding initial lines...");
      await seedInitialLines(supervisorIdMap);
      
      // Fetch again after seeding
      const { data: reFetched, error: reError } = await supabase
        .from("production_lines")
        .select("*")
        .order("line_no", { ascending: true });
        
      if (reError) throw reError;
      return mapDbLinesToClient(reFetched || [], supervisorIdMap, selectedDate);
    }

    // 3. Map fetched lines and their hourly logs
    return mapDbLinesToClient(dbLines, supervisorIdMap, selectedDate);
  } catch (err) {
    console.error("Error fetching production lines from Supabase:", err);
    return null;
  }
};

// Map DB records to client-side interface
const mapDbLinesToClient = async (
  dbLines: any[], 
  supervisorIdMap: Record<string, string>,
  selectedDate?: string
): Promise<ProductionLine[]> => {
  // Build reverse supervisor lookup map { id: name }
  const supervisorLookup: Record<string, string> = {};
  Object.entries(supervisorIdMap).forEach(([name, id]) => {
    supervisorLookup[id] = name;
  });

  const lines: ProductionLine[] = [];
  const targetDateStr = selectedDate || new Date().toISOString().split("T")[0];
  const startOfDay = `${targetDateStr}T00:00:00.000Z`;
  const endOfDay = `${targetDateStr}T23:59:59.999Z`;

  // Fetch actual photo_urls from employees table
  const photoMap: Record<string, string> = {};
  try {
    const { data: empData, error: empError } = await supabase
      .from("employees")
      .select("first_name, last_name, photo_url");
    if (!empError && empData) {
      empData.forEach(emp => {
        const fullName = emp.last_name ? `${emp.first_name} ${emp.last_name}`.trim() : emp.first_name.trim();
        photoMap[fullName] = emp.photo_url || "";
      });
    }
  } catch (err) {
    console.error("Error fetching employee photos for lines map:", err);
  }

  // Fetch all daily production lines for this date to avoid N+1 queries
  let dailyLinesMap = new Map<string, any>();
  try {
    const { data: dailyLines, error: dailyError } = await supabase
      .from("daily_production_lines")
      .select("*")
      .eq("production_date", targetDateStr);

    if (!dailyError && dailyLines) {
      dailyLines.forEach(dl => {
        dailyLinesMap.set(dl.line_no, dl);
      });
    }
  } catch (err) {
    console.error("Error loading daily production lines:", err);
  }

  for (const dbLine of dbLines) {
    let supervisorId = dbLine.supervisor_id;
    let buyerName = dbLine.buyer_name;
    let styleCode = dbLine.style_code;
    let targetPcs = dbLine.target_pcs;

    // Check if daily record exists
    const dailyRecord = dailyLinesMap.get(dbLine.line_no);
    if (dailyRecord) {
      buyerName = dailyRecord.buyer_name;
      styleCode = dailyRecord.style_code;
      targetPcs = dailyRecord.target_pcs;
    } else {
      // Seed default daily configuration so it is registered in the DB
      try {
        await supabase
          .from("daily_production_lines")
          .insert({
            production_date: targetDateStr,
            line_no: dbLine.line_no,
            supervisor_id: supervisorId,
            buyer_name: buyerName,
            style_code: styleCode,
            target_pcs: targetPcs,
            current_output: 0,
            efficiency_rate: 0
          });
      } catch (insertErr) {
        console.error(`Failed to register line ${dbLine.line_no} on ${targetDateStr} in DB:`, insertErr);
      }
    }

    // Fetch hourly logs for this line
    const { data: dbLogs, error: logsError } = await supabase
      .from("hourly_logs")
      .select("*")
      .eq("line_id", dbLine.id)
      .gte("logged_at", startOfDay)
      .lte("logged_at", endOfDay);

    const hourlyLogArray = Array(10).fill(0);
    const hourlyTargetLogArray = Array(10).fill(Math.round(targetPcs / 10) || 0);
    let totalOutputForDay = 0;
    if (!logsError && dbLogs && dbLogs.length > 0) {
      dbLogs.forEach((log: any) => {
        const hourIndex = HOURS.indexOf(log.recorded_hour);
        if (hourIndex !== -1) {
          hourlyLogArray[hourIndex] = log.production_pcs;
          if (log.target_pcs !== undefined && log.target_pcs !== null) {
            hourlyTargetLogArray[hourIndex] = log.target_pcs;
          }
          totalOutputForDay += log.production_pcs;
        }
      });
    }

    const supervisorName = supervisorLookup[supervisorId] || "James Wilson";
    let avatar = "";
    if (photoMap[supervisorName] !== undefined) {
      avatar = photoMap[supervisorName];
    } else {
      avatar = supervisorsList.find(s => s.name === supervisorName)?.avatar || "";
    }

    const currentProductionPcs = totalOutputForDay;
    const efficiency = targetPcs > 0 ? parseFloat(((currentProductionPcs / targetPcs) * 100).toFixed(2)) : 0;
    const balancePcs = Math.max(0, targetPcs - currentProductionPcs);
    const status = currentProductionPcs > 0 ? "Running" : "Idle";

    // Update cumulative outputs and efficiency in daily_production_lines in DB
    try {
      await supabase
        .from("daily_production_lines")
        .update({
          current_output: currentProductionPcs,
          efficiency_rate: efficiency,
          updated_at: new Date().toISOString()
        })
        .eq("production_date", targetDateStr)
        .eq("line_no", dbLine.line_no);
    } catch (updateErr) {
      console.error("Failed to sync cumulative state to daily_production_lines table:", updateErr);
    }

    lines.push({
      lineNo: dbLine.line_no,
      supervisor: supervisorName,
      supervisorAvatar: avatar,
      buyer: buyerName,
      style: styleCode,
      targetPcs,
      currentProductionPcs,
      currentHourPcs: hourlyLogArray[hourlyLogArray.length - 1] || 0,
      efficiency,
      balancePcs,
      status,
      lastUpdated: "08:00 AM",
      hourlyLog: hourlyLogArray,
      hourlyTargetLog: hourlyTargetLogArray
    });
  }

  return lines;
};

// Seed initial lines and hourly logs in Supabase
const seedInitialLines = async (supervisorIdMap: Record<string, string>) => {
  try {
    for (const line of SEED_LINES) {
      const supervisorId = supervisorIdMap[line.supervisor] || Object.values(supervisorIdMap)[0];
      if (!supervisorId) continue;

      // 1. Insert line
      const { data: insertedLine, error: insertError } = await supabase
        .from("production_lines")
        .insert({
          line_no: line.lineNo,
          supervisor_id: supervisorId,
          buyer_name: line.buyer,
          style_code: line.style,
          target_pcs: line.targetPcs,
          current_output: line.currentProductionPcs,
          efficiency_rate: line.efficiency
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // 2. Insert hourly logs
      if (insertedLine) {
        const logsData = HOURS.map((hour, idx) => {
          const targetForHour = line.hourlyTargetLog?.[idx] || Math.round(line.targetPcs / 10) || 0;
          return {
            line_id: insertedLine.id,
            recorded_hour: hour,
            production_pcs: line.hourlyLog[idx] || 0,
            target_pcs: targetForHour,
            efficiency_pct: targetForHour > 0 ? parseFloat((((line.hourlyLog[idx] || 0) / targetForHour) * 100).toFixed(1)) : 0,
            unplanned_down_mins: 0
          };
        });

        const { error: logsError } = await supabase
          .from("hourly_logs")
          .insert(logsData);

        if (logsError) throw logsError;
      }
    }
  } catch (err) {
    console.error("Error seeding initial production lines:", err);
  }
};

// Save or Update a single ProductionLine and its hourly logs to Supabase
export const saveLineToSupabase = async (line: ProductionLine, selectedDate?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const supervisorIdMap = await seedSupervisorsIfNeeded();
    let supervisorId = supervisorIdMap[line.supervisor];
    
    if (!supervisorId) {
      console.warn(`Supervisor "${line.supervisor}" not found in database lookup. Attempting to create supervisor profile on the fly...`);
      const cleanSupervisorName = line.supervisor.trim();
      
      // Attempt to align with an existing employee record if possible
      let matchedEmpId = undefined;
      let matchedBadgeId = `BADGE-${1000 + Math.floor(Math.random() * 9000)}`;
      
      try {
        const { data: employees } = await supabase
          .from("employees")
          .select("id, employee_id, first_name, last_name");
        
        if (employees) {
          const match = employees.find(e => {
            const fullName = e.last_name ? `${e.first_name} ${e.last_name}`.trim() : e.first_name.trim();
            return fullName.toLowerCase() === cleanSupervisorName.toLowerCase() || 
                   e.first_name.toLowerCase() === cleanSupervisorName.toLowerCase();
          });
          if (match) {
            matchedEmpId = match.id;
            matchedBadgeId = match.employee_id;
          }
        }
      } catch (findErr) {
        console.warn("Failed to lookup matching employee for on-the-fly supervisor profile:", findErr);
      }

      const insertPayload: any = {
        name: cleanSupervisorName,
        badge_id: matchedBadgeId,
        factory_unit: "Prodexa Garments Ltd. (Unit 1)",
        active_lines: [line.lineNo]
      };
      if (matchedEmpId) {
        insertPayload.id = matchedEmpId;
      }

      const { data: newSup, error: insertError } = await supabase
        .from("supervisor_profiles")
        .insert([insertPayload])
        .select("id")
        .maybeSingle();
      
      if (!insertError && newSup) {
        supervisorId = newSup.id;
        console.log(`Successfully auto-provisioned supervisor profile for "${line.supervisor}" with ID: ${supervisorId}`);
      } else {
        // Check if profile actually exists (created concurrently)
        const { data: existingSup } = await supabase
          .from("supervisor_profiles")
          .select("id")
          .eq("name", cleanSupervisorName)
          .maybeSingle();
          
        if (existingSup) {
          supervisorId = existingSup.id;
        } else {
          console.error(`Supervisor "${line.supervisor}" not found and failed to auto-create profile:`, insertError?.message || insertError);
          return false;
        }
      }
    }

    // 1. Find if line already exists to get its ID, or insert it
    const { data: existingLine, error: findError } = await supabase
      .from("production_lines")
      .select("id")
      .eq("line_no", line.lineNo)
      .maybeSingle();

    if (findError) throw findError;

    let lineId = existingLine?.id;

    const linePayload = {
      line_no: line.lineNo,
      supervisor_id: supervisorId,
      buyer_name: line.buyer,
      style_code: line.style,
      target_pcs: line.targetPcs,
      current_output: line.currentProductionPcs,
      efficiency_rate: line.efficiency
    };

    if (lineId) {
      // Update
      const { error: updateError } = await supabase
        .from("production_lines")
        .update(linePayload)
        .eq("id", lineId);
        
      if (updateError) throw updateError;
    } else {
      // Insert
      const { data: inserted, error: insertError } = await supabase
        .from("production_lines")
        .insert(linePayload)
        .select("id")
        .single();
        
      if (insertError) throw insertError;
      lineId = inserted?.id;
    }

    if (!lineId) throw new Error("Could not acquire line ID.");

    // 2. Refresh/Upsert daily_production_lines specifically for the selected date
    const targetDateStr = selectedDate || new Date().toISOString().split("T")[0];
    const dailyPayload = {
      production_date: targetDateStr,
      line_no: line.lineNo,
      supervisor_id: supervisorId,
      buyer_name: line.buyer,
      style_code: line.style,
      target_pcs: line.targetPcs,
      current_output: line.currentProductionPcs,
      efficiency_rate: line.efficiency,
      updated_at: new Date().toISOString()
    };

    const { error: dailyUpsertErr } = await supabase
      .from("daily_production_lines")
      .upsert(dailyPayload, { onConflict: "production_date,line_no" });

    if (dailyUpsertErr) {
      console.warn("Could not upsert into daily_production_lines:", dailyUpsertErr.message);
    }

    // 3. Refresh/Upsert hourly logs specifically for the selected date
    const startOfDay = `${targetDateStr}T00:00:00.000Z`;
    const endOfDay = `${targetDateStr}T23:59:59.999Z`;

    // Delete existing hourly logs for the selected date
    const { error: deleteError } = await supabase
      .from("hourly_logs")
      .delete()
      .eq("line_id", lineId)
      .gte("logged_at", startOfDay)
      .lte("logged_at", endOfDay);

    if (deleteError) throw deleteError;

    // Insert new hourly logs
    const logsPayload = HOURS.map((hour, idx) => {
      const targetForHour = line.hourlyTargetLog?.[idx] || Math.round(line.targetPcs / 10) || 0;
      return {
        line_id: lineId,
        recorded_hour: hour,
        production_pcs: line.hourlyLog[idx] || 0,
        target_pcs: targetForHour,
        efficiency_pct: targetForHour > 0 ? parseFloat((((line.hourlyLog[idx] || 0) / targetForHour) * 100).toFixed(1)) : 0,
        unplanned_down_mins: line.status === "Breakdown" ? 12 : 0,
        logged_at: new Date(targetDateStr + "T12:00:00.000Z").toISOString()
      };
    });

    const { error: logsError } = await supabase
      .from("hourly_logs")
      .insert(logsPayload);

    if (logsError) throw logsError;

    // 3. Write an incident alert if status is Breakdown or Idle
    if (line.status !== "Running") {
      await supabase
        .from("floor_alerts")
        .insert({
          line_no: line.lineNo,
          severity: line.status === "Breakdown" ? "critical" : "warning",
          message: line.status === "Breakdown" 
            ? `Mechanical breakdown logged on Line ${line.lineNo}. Sewing operations paused.`
            : `Unplanned delay reported on Line ${line.lineNo}.`,
          is_resolved: false
        });
    }

    return true;
  } catch (err) {
    console.error(`Error saving line ${line.lineNo} to Supabase:`, err);
    return false;
  }
};

// Save Factory Metrics to Supabase
export const saveMetricsToSupabase = async (metrics: FactoryMetrics): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("factory_metrics")
      .upsert({
        id: 1,
        shift_target: metrics.shiftTarget,
        shift_output: metrics.shiftOutput,
        shift_achievement: metrics.shiftAchievement,
        current_efficiency: metrics.currentEfficiency,
        total_workers: metrics.totalWorkers,
        current_operators: metrics.currentOperators,
        needle_down_lines: metrics.needleDownLines,
        running_lines: metrics.runningLines,
        idle_lines: metrics.idleLines,
        running_machines: metrics.runningMachines,
        idle_machines: metrics.idleMachines,
        production_start_time: metrics.productionStartTime || getProductionStartTime(),
        production_interval_mins: metrics.productionIntervalMins || getProductionInterval(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving metrics to Supabase:", err);
    return false;
  }
};

// Fetch Production Time Config from Supabase
export const fetchTimeConfigFromSupabase = async (): Promise<{ productionStartTime: string; productionIntervalMins: number } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("factory_metrics")
      .select("production_start_time, production_interval_mins")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    if (data && data.production_start_time && typeof data.production_interval_mins === "number") {
      return {
        productionStartTime: data.production_start_time,
        productionIntervalMins: data.production_interval_mins
      };
    }
    return null;
  } catch (err) {
    console.error("Error fetching time config from Supabase:", err);
    return null;
  }
};

// Save Production Time Config to Supabase
export const saveTimeConfigToSupabase = async (startTime: string, intervalMins: number): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("factory_metrics")
      .upsert({
        id: 1,
        production_start_time: startTime,
        production_interval_mins: intervalMins,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving time config to Supabase:", err);
    return false;
  }
};

// Fetch all RBAC User Accounts from Supabase
export const fetchUsersFromSupabase = async (): Promise<RBACUser[] | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("user_accounts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("user_accounts table might not exist yet or there was an error:", error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      clearance: u.clearance,
      departments: u.departments || [],
      status: u.status as "Active" | "Suspended",
      avatarGradient: u.avatar_gradient,
      avatarUrl: u.avatar_url,
      password: u.password
    }));
  } catch (err) {
    console.error("Error fetching users from Supabase:", err);
    return null;
  }
};

// Save a User Account (upsert) to Supabase
export const saveUserToSupabase = async (user: RBACUser, password?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const payload: any = {
      id: user.id,
      name: user.name,
      username: user.username,
      clearance: user.clearance,
      departments: user.departments || [],
      status: user.status,
      avatar_gradient: user.avatarGradient,
      avatar_url: user.avatarUrl || null
    };

    // Only set password if provided or if user object has it
    const pass = password || user.password;
    if (pass) {
      payload.password = hashPasswordIfNeeded(pass);
    } else {
      payload.password = hashPasswordIfNeeded("admin123"); // default password
    }

    const { error } = await supabase
      .from("user_accounts")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error saving user ${user.username} to Supabase:`, err);
    return false;
  }
};

// Seed batch of users to Supabase
export const seedUsersToSupabaseBatch = async (users: RBACUser[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const payloads = users.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      clearance: u.clearance,
      departments: u.departments || [],
      status: u.status,
      avatar_gradient: u.avatarGradient,
      avatar_url: u.avatarUrl || null,
      password: hashPasswordIfNeeded(u.password || "admin123")
    }));

    const { error } = await supabase
      .from("user_accounts")
      .upsert(payloads, { onConflict: "id" });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error seeding batch of users to Supabase:", err);
    return false;
  }
};

// Delete a User Account from Supabase
export const deleteUserFromSupabase = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("user_accounts")
      .delete()
      .eq("id", userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error deleting user ${userId} from Supabase:`, err);
    return false;
  }
};

// Toggle or update status of user in Supabase
export const updateUserStatusInSupabase = async (userId: string, status: "Active" | "Suspended"): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("user_accounts")
      .update({ status })
      .eq("id", userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error updating user ${userId} status to ${status} in Supabase:`, err);
    return false;
  }
};

// Delete a production line from Supabase
export const deleteLineFromSupabase = async (lineNo: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("production_lines")
      .delete()
      .eq("line_no", lineNo);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error deleting line ${lineNo} from Supabase:`, err);
    return false;
  }
};

// Upload a file to Supabase Storage with fallback buckets
export const uploadFileToSupabase = async (file: File, bucketName: string = "avatars"): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Clean filename: timestamp + sanitized name
    const fileExt = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${Date.now()}-${cleanFileName}.${fileExt}`;
    const filePath = `supervisor_photos/${fileName}`;

    // Upload to target bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn(`Upload to bucket '${bucketName}' failed, trying alternative buckets...`, error.message);
      
      const alternatives = ["photos", "images", "operators", "profiles"];
      for (const altBucket of alternatives) {
        if (altBucket === bucketName) continue;
        try {
          const { error: altError } = await supabase.storage
            .from(altBucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });
          if (!altError) {
            const { data: { publicUrl } } = supabase.storage
              .from(altBucket)
              .getPublicUrl(filePath);
            return publicUrl;
          }
        } catch (e) {
          // ignore alternative bucket failures and keep trying
        }
      }
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err: any) {
    console.error("Error uploading photo to Supabase Storage:", err);
    throw err;
  }
};

// =======================================================
// ENTERPRISE EMPLOYEE API INTEGRATIONS
// =======================================================

export const fetchEmployeesFromApi = async (): Promise<any[] | null> => {
  try {
    const res = await fetch("/api/employees");
    if (!res.ok) throw new Error("Failed to fetch employees from API");
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    const text = await res.text();
    console.warn("Expected JSON response from fetchEmployeesFromApi but received:", text.slice(0, 100));
    return null;
  } catch (error) {
    console.error("Error fetching employees from API:", error);
    return null;
  }
};

export const createEmployeeInApi = async (employee: any): Promise<any> => {
  try {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employee)
    });
    if (!res.ok) {
      let errorMessage = "Failed to create employee";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage = errData.error || errorMessage;
        } else {
          const textData = await res.text();
          errorMessage = textData.slice(0, 200) || errorMessage;
        }
      } catch (parseErr) {
        console.warn("Failed to parse error response from createEmployeeInApi:", parseErr);
      }
      throw new Error(errorMessage);
    }
    return await res.json();
  } catch (error) {
    console.error("Error creating employee in API:", error);
    throw error;
  }
};

export const updateEmployeeInApi = async (id: string, employee: any): Promise<any> => {
  try {
    const res = await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employee)
    });
    if (!res.ok) {
      let errorMessage = "Failed to update employee";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage = errData.error || errorMessage;
        } else {
          const textData = await res.text();
          errorMessage = textData.slice(0, 200) || errorMessage;
        }
      } catch (parseErr) {
        console.warn("Failed to parse error response from updateEmployeeInApi:", parseErr);
      }
      throw new Error(errorMessage);
    }
    return await res.json();
  } catch (error) {
    console.error("Error updating employee in API:", error);
    throw error;
  }
};

export const deleteEmployeeInApi = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/employees/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      let errorMessage = "Failed to delete employee";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage = errData.error || errorMessage;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }
    return true;
  } catch (error) {
    console.error("Error deleting employee from API:", error);
    return false;
  }
};

export const uploadEmployeePhotoToApi = async (
  file: File, 
  companyId: string, 
  factoryId: string, 
  employeeId: string
): Promise<{ success: boolean; publicUrl: string; filePath: string } | null> => {
  try {
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("companyId", companyId);
    formData.append("factoryId", factoryId);
    formData.append("employeeId", employeeId);

    const res = await fetch("/api/employees/upload-photo", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      let errorMessage = "Upload failed";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage = errData.error || errorMessage;
        } else {
          const textData = await res.text();
          errorMessage = textData.slice(0, 200) || errorMessage;
        }
      } catch (parseErr) {
        console.warn("Failed to parse error response from uploadEmployeePhotoToApi:", parseErr);
      }
      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error) {
    console.error("Error in uploadEmployeePhotoToApi:", error);
    throw error;
  }
};

// Fetch daily target from Supabase date-wise
export const fetchDailyTargetFromSupabase = async (date: string): Promise<number | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("daily_targets")
      .select("shift_target")
      .eq("target_date", date)
      .maybeSingle();

    if (error) {
      console.warn(`Could not fetch daily target for ${date} from Supabase:`, error.message);
      return null;
    }

    return data ? data.shift_target : null;
  } catch (err) {
    console.error(`Exception while fetching daily target for ${date}:`, err);
    return null;
  }
};

// Save daily target to Supabase date-wise
export const saveDailyTargetToSupabase = async (date: string, target: number): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("daily_targets")
      .upsert({
        target_date: date,
        shift_target: target,
        updated_at: new Date().toISOString()
      }, { onConflict: "target_date" });

    if (error) {
      console.warn(`Could not save daily target for ${date} to Supabase:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Exception while saving daily target for ${date}:`, err);
    return false;
  }
};

// Fetch daily metrics from Supabase date-wise
export const fetchDailyMetricsFromSupabase = async (date: string): Promise<FactoryMetrics | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("daily_factory_metrics")
      .select("*")
      .eq("metric_date", date)
      .maybeSingle();

    if (error) {
      console.warn(`Could not fetch daily metrics for ${date} from Supabase:`, error.message);
      return null;
    }

    if (data) {
      return {
        shiftTarget: data.shift_target,
        shiftOutput: data.shift_output,
        shiftAchievement: parseFloat(data.shift_achievement || 0),
        currentEfficiency: parseFloat(data.current_efficiency || 0),
        totalWorkers: data.total_workers,
        current_operators: data.current_operators, // Wait! We'll map standard key
        currentOperators: data.current_operators,
        needleDownLines: data.needle_down_lines,
        runningLines: data.running_lines,
        idleLines: data.idle_lines,
        runningMachines: data.running_machines,
        idleMachines: data.idle_machines
      } as FactoryMetrics;
    }
    return null;
  } catch (err) {
    console.error(`Exception while fetching daily metrics for ${date}:`, err);
    return null;
  }
};

// Save daily metrics to Supabase date-wise
export const saveDailyMetricsToSupabase = async (date: string, metrics: FactoryMetrics): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("daily_factory_metrics")
      .upsert({
        metric_date: date,
        shift_target: metrics.shiftTarget,
        shift_output: metrics.shiftOutput,
        shift_achievement: metrics.shiftAchievement,
        current_efficiency: metrics.currentEfficiency,
        total_workers: metrics.totalWorkers,
        current_operators: metrics.currentOperators,
        needle_down_lines: metrics.needleDownLines,
        running_lines: metrics.runningLines,
        idle_lines: metrics.idleLines,
        running_machines: metrics.runningMachines,
        idle_machines: metrics.idleMachines,
        updated_at: new Date().toISOString()
      }, { onConflict: "metric_date" });

    if (error) {
      console.warn(`Could not save daily metrics for ${date} to Supabase:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Exception while saving daily metrics for ${date}:`, err);
    return false;
  }
};



