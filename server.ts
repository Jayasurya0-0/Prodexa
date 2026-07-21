import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import os from "os";

// Helper to check if a string is a valid UUID
function isValidUUID(str: any): boolean {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

dotenv.config();

const isVercel = process.env.VERCEL === "1";

const app = express();
const PORT = 3000;

app.use(express.json());

// Guarantee public/uploads directory exists and serve it statically
const UPLOADS_DIR = isVercel
  ? path.join(os.tmpdir(), "uploads")
  : path.join(process.cwd(), "public", "uploads");

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn("Failed to create uploads directory:", err.message);
}
app.use("/uploads", express.static(UPLOADS_DIR));

// Initialize Supabase Client Safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isPlaceholder = (url?: string, key?: string) => {
  if (!url || !key) return true;
  if (url.includes("placeholder") || key.includes("placeholder") || url.includes("your-") || key.includes("your-")) {
    return true;
  }
  return false;
};

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseKey && !isPlaceholder(supabaseUrl, supabaseKey)) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error("Failed to initialize Supabase admin client in server.ts:", err);
  }
}

// Local JSON File Database for Employees Fallback
const LOCAL_EMPLOYEES_FILE = isVercel
  ? path.join(os.tmpdir(), "employees_local.json")
  : path.join(process.cwd(), "employees_local.json");

function getInitialEmployees() {
  const supervisorsList = [
    { id: "emp-101", employee_id: "EMP-1001", first_name: "James", last_name: "Wilson", designation: "Floor Supervisor", department: "Sewing", email: "james.wilson@prodexa.com", phone: "+1 (555) 019-2831", photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-102", employee_id: "EMP-1002", first_name: "Michael", last_name: "Brown", designation: "Floor Supervisor", department: "Sewing", email: "michael.brown@prodexa.com", phone: "+1 (555) 019-3242", photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-103", employee_id: "EMP-1003", first_name: "David", last_name: "Lee", designation: "Quality Supervisor", department: "Quality", email: "david.lee@prodexa.com", phone: "+1 (555) 019-4567", photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-104", employee_id: "EMP-1004", first_name: "Robert", last_name: "Taylor", designation: "IE Engineer", department: "Industrial Engineering", email: "robert.taylor@prodexa.com", phone: "+1 (555) 019-9988", photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-105", employee_id: "EMP-1005", first_name: "Daniel", last_name: "Harris", designation: "Floor Supervisor", department: "Sewing", email: "daniel.harris@prodexa.com", phone: "+1 (555) 019-5566", photo_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-106", employee_id: "EMP-1006", first_name: "Sarah", last_name: "Jenkins", designation: "Floor Supervisor", department: "Sewing", email: "sarah.jenkins@prodexa.com", phone: "+1 (555) 019-7711", photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-107", employee_id: "EMP-1007", first_name: "William", last_name: "Davis", designation: "Floor Supervisor", department: "Sewing", email: "william.davis@prodexa.com", phone: "+1 (555) 019-6633", photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-108", employee_id: "EMP-1008", first_name: "Emily", last_name: "Garcia", designation: "QA Lead", department: "Quality", email: "emily.garcia@prodexa.com", phone: "+1 (555) 019-2244", photo_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-109", employee_id: "EMP-1009", first_name: "Kevin", last_name: "Martinez", designation: "Maintenance Planner", department: "Maintenance", email: "kevin.martinez@prodexa.com", phone: "+1 (555) 019-8899", photo_url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80", status: "Active" },
    { id: "emp-110", employee_id: "EMP-1010", first_name: "Anna", last_name: "Kovacs", designation: "Floor Supervisor", department: "Sewing", email: "anna.kovacs@prodexa.com", phone: "+1 (555) 019-4400", photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80", status: "Active" }
  ];
  return supervisorsList.map(s => ({
    ...s,
    full_name: `${s.first_name} ${s.last_name}`,
    company_id: "COM-PRODEXA",
    factory_id: "FAC-UNIT1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}

function readLocalEmployees(): any[] {
  try {
    // If running in Vercel and the ephemeral temp file doesn't exist yet, try to pre-populate it from the checked-in workspace file.
    if (isVercel && !fs.existsSync(LOCAL_EMPLOYEES_FILE)) {
      const workspacePath = path.join(process.cwd(), "employees_local.json");
      if (fs.existsSync(workspacePath)) {
        try {
          fs.writeFileSync(LOCAL_EMPLOYEES_FILE, fs.readFileSync(workspacePath));
          console.log("Pre-populated ephemeral employees file from workspace.");
        } catch (copyErr: any) {
          console.warn("Could not copy workspace employees to temp directory:", copyErr.message);
        }
      }
    }

    if (fs.existsSync(LOCAL_EMPLOYEES_FILE)) {
      const data = fs.readFileSync(LOCAL_EMPLOYEES_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        const seen = new Set<string>();
        const uniqueList: any[] = [];
        for (const emp of list) {
          if (!emp || !emp.employee_id) continue;
          const normEmpId = emp.employee_id.trim().toLowerCase();
          if (!seen.has(normEmpId)) {
            seen.add(normEmpId);
            uniqueList.push(emp);
          }
        }
        if (uniqueList.length !== list.length) {
          console.log(`Deduplicated local employees list. Purged ${list.length - uniqueList.length} duplicate records.`);
          writeLocalEmployees(uniqueList);
        }
        return uniqueList;
      }
    }
  } catch (err) {
    console.error("Failed to read local employees:", err);
  }
  const initial = getInitialEmployees();
  writeLocalEmployees(initial);
  return initial;
}

function writeLocalEmployees(data: any[]) {
  try {
    fs.writeFileSync(LOCAL_EMPLOYEES_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local employees:", err);
  }
}

// Configure Multer for In-Memory Photo Storage & Limit to 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    const fileExt = (file.originalname.split(".").pop() || "").toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type (${file.mimetype}). Only JPG, JPEG, PNG, WEBP, GIF, and SVG are allowed.`));
    }
  }
});

// Helper to guarantee "employees" bucket existence in Supabase Storage with public access
async function ensureEmployeesBucket() {
  if (!supabaseAdmin) return;
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.warn("Could not list buckets:", listError.message);
      return;
    }
    const exists = buckets.some(b => b.name === "employees");
    if (!exists) {
      console.log("Bucket 'employees' does not exist. Creating it now...");
      const { error: createError } = await supabaseAdmin.storage.createBucket("employees", {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"]
      });
      if (createError) {
        console.warn("Failed to create 'employees' bucket:", createError.message);
      } else {
        console.log("Bucket 'employees' created successfully with public access.");
      }
    }
  } catch (err) {
    console.warn("Error during 'employees' bucket auto-creation:", err);
  }
}

// Initialize Gemini Client Lazily/Safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleTimeString(),
  });
});

// ==========================================
// ENTERPRISE EMPLOYEE PROFILE & PHOTO MANAGEMENT API
// ==========================================

// 1. Upload Employee Photo to Supabase Storage Bucket ("employees") with Local Fallback
app.post("/api/employees/upload-photo", (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      console.error("Multer file upload error:", err.message || err);
      return res.status(400).json({ error: err.message || "File upload failed. Please verify size and file format." });
    }
    next();
  });
}, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided in the request." });
    }

    const companyId = (req.body.companyId || "COM-PRODEXA").replace(/[^a-zA-Z0-9_-]/g, "");
    const factoryId = (req.body.factoryId || "FAC-UNIT1").replace(/[^a-zA-Z0-9_-]/g, "");
    const employeeId = (req.body.employeeId || "EMP-TEMP").replace(/[^a-zA-Z0-9_-]/g, "");

    // Generate unique UUID for filename to prevent duplication & conflict
    const uniqueId = crypto.randomUUID();
    const fileExt = req.file.originalname.split(".").pop() || "webp";
    const fileName = `${uniqueId}.${fileExt}`;
    
    // Structure: company_id/factory_id/employee_id/uniqueId.webp
    const folderPath = `${companyId}/${factoryId}/${employeeId}`;
    const filePath = `${folderPath}/${fileName}`;

    // Write file locally first as a guaranteed backup/source (if directory is writable)
    try {
      const localFilePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(localFilePath, req.file.buffer);
    } catch (writeErr: any) {
      console.warn("Could not write photo to local storage (read-only environment/Vercel):", writeErr.message);
    }

    // Default public URL is local route
    const appUrl = process.env.APP_URL || "";
    let publicUrl = appUrl 
      ? `${appUrl.replace(/\/$/, "")}/uploads/${fileName}` 
      : `/uploads/${fileName}`;
    
    let storageType = "local";

    if (supabaseAdmin) {
      try {
        // Proactively try to guarantee bucket existence
        await ensureEmployeesBucket();

        // Upload to Supabase Storage employees bucket
        const { data, error: uploadError } = await supabaseAdmin.storage
          .from("employees")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            cacheControl: "3600",
            upsert: true
          });

        if (!uploadError) {
          // Acquire cloud public URL
          const { data: { publicUrl: cloudUrl } } = supabaseAdmin.storage
            .from("employees")
            .getPublicUrl(filePath);
          
          if (cloudUrl) {
            publicUrl = cloudUrl;
            storageType = "supabase";
          }
        } else {
          console.warn("Supabase Storage upload failed, utilizing local file server fallback. Error:", uploadError.message);
        }
      } catch (err: any) {
        console.warn("Exception uploading to Supabase Storage, using local fallback:", err.message || err);
      }
    }

    res.json({
      success: true,
      publicUrl,
      filePath,
      fileName,
      storageType
    });
  } catch (error: any) {
    console.error("Upload error in server route:", error);
    res.status(500).json({ error: error.message || "Internal server error during photo upload." });
  }
});

// 2. Delete Employee Photo from Storage Bucket / Local Server
app.post("/api/employees/delete-photo", async (req: express.Request, res: express.Response) => {
  try {
    const { filePath, publicUrl } = req.body;
    
    // Also extract file name to delete local file if relevant
    if (publicUrl && publicUrl.includes("/uploads/")) {
      try {
        const parts = publicUrl.split("/uploads/");
        if (parts.length > 1) {
          const localFile = path.join(UPLOADS_DIR, decodeURIComponent(parts[1]));
          if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
            console.log("Deleted local copy of employee photo:", localFile);
          }
        }
      } catch (err: any) {
        console.warn("Failed to delete local copy of file:", err.message);
      }
    }

    if (!supabaseAdmin) {
      return res.json({ success: true, message: "File deleted successfully locally." });
    }

    if (filePath) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from("employees")
        .remove([filePath]);

      if (deleteError) {
        console.error("Error deleting file from Supabase Storage:", deleteError);
        // Do not return 500 if it was a bucket mismatch, as we have a local version deleted
      }
    }

    res.json({ success: true, message: "File deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error during file deletion." });
  }
});

// 3. GET /api/employees - Fetch all employee profile records (Supabase with Local Fallback)
app.get("/api/employees", async (req: express.Request, res: express.Response) => {
  try {
    if (!supabaseAdmin) {
      return res.json(readLocalEmployees());
    }
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "P0001" || error.message.includes("does not exist") || error.code === "42P01" || error.message.includes("schema cache")) {
        console.warn("Employees table does not exist in Supabase DB. Falling back to local file.");
        return res.json(readLocalEmployees());
      }
      throw error;
    }
    // Sync the local file with cloud content
    if (data && data.length > 0) {
      writeLocalEmployees(data);
    }
    res.json(data || []);
  } catch (error: any) {
    console.error("Error fetching employees, falling back to local file storage:", error);
    res.json(readLocalEmployees());
  }
});

// 4. GET /api/employees/:id - Fetch single employee profile (Supabase with Local Fallback)
app.get("/api/employees/:id", async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    if (!supabaseAdmin) {
      const locals = readLocalEmployees();
      const found = locals.find(e => e.id === id);
      if (!found) return res.status(404).json({ error: "Employee not found." });
      return res.json(found);
    }
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01" || error.message.includes("does not exist") || error.message.includes("schema cache")) {
        const locals = readLocalEmployees();
        const found = locals.find(e => e.id === id);
        if (!found) return res.status(404).json({ error: "Employee not found." });
        return res.json(found);
      }
      throw error;
    }
    if (!data) {
      const locals = readLocalEmployees();
      const found = locals.find(e => e.id === id);
      if (found) return res.json(found);
      return res.status(404).json({ error: "Employee not found." });
    }
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching employee detail, trying local fallback:", error);
    const locals = readLocalEmployees();
    const found = locals.find(e => e.id === req.params.id);
    if (found) return res.json(found);
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/employees - Create employee profile (Supabase with Local Fallback)
app.post("/api/employees", async (req: express.Request, res: express.Response) => {
  try {
    const employeeData = req.body || {};
    
    const cleanFirstName = (employeeData.first_name || "").trim();
    const cleanLastName = (employeeData.last_name !== undefined && employeeData.last_name !== null) 
      ? (employeeData.last_name || "").trim() 
      : "";
    const cleanEmpId = (employeeData.employee_id || "").trim();
    const cleanDesignation = (employeeData.designation || "").trim();
    const cleanDepartment = (employeeData.department || "").trim();

    // Server-side validation (last_name is optional)
    if (!cleanFirstName || !cleanEmpId || !cleanDesignation || !cleanDepartment) {
      return res.status(400).json({ error: "Missing required employee attributes (first_name, employee_id, designation, department)." });
    }

    const fullName = cleanLastName ? `${cleanFirstName} ${cleanLastName}` : cleanFirstName;

    const locals = readLocalEmployees();
    const existingIndex = locals.findIndex(e => e.employee_id && e.employee_id.trim().toLowerCase() === cleanEmpId.toLowerCase());

    const newId = employeeData.id || (existingIndex !== -1 ? locals[existingIndex].id : `emp-${Date.now()}`);
    const newEmp = {
      ...employeeData,
      id: newId,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      full_name: fullName,
      employee_id: cleanEmpId,
      designation: cleanDesignation,
      department: cleanDepartment,
      created_at: existingIndex !== -1 ? locals[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert locally first to prevent duplicates
    if (existingIndex !== -1) {
      locals[existingIndex] = newEmp;
    } else {
      locals.unshift(newEmp);
    }
    writeLocalEmployees(locals);

    if (!supabaseAdmin) {
      return res.json({ success: true, data: newEmp, source: "local" });
    }

    // Omit generated column 'full_name' and non-UUID 'id' for Supabase insert/upsert
    const { id: originalId, full_name, created_at, ...supabasePayload } = newEmp;
    if (originalId && isValidUUID(originalId)) {
      (supabasePayload as any).id = originalId;
    }

    const { data, error } = await supabaseAdmin
      .from("employees")
      .upsert([supabasePayload], { onConflict: "employee_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase upsert failed, utilizing local storage fallback. Error details:", error.message);
      return res.json({ success: true, data: newEmp, source: "local_fallback" });
    }
    res.json({ success: true, data: data || newEmp });
  } catch (error: any) {
    console.error("Error creating employee, falling back to local database:", error);
    res.status(500).json({ error: error.message || "Failed to save employee profile." });
  }
});

// 6. PUT /api/employees/:id - Update employee profile (Supabase with Local Fallback)
app.put("/api/employees/:id", async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const employeeData = req.body;

    const locals = readLocalEmployees();
    const index = locals.findIndex(e => e.id === id);

    const cleanFirstName = (employeeData.first_name || "").trim();
    const cleanLastName = (employeeData.last_name !== undefined && employeeData.last_name !== null) 
      ? (employeeData.last_name || "").trim() 
      : (index !== -1 ? locals[index].last_name : "");
    
    const fName = cleanFirstName || (index !== -1 ? locals[index].first_name : "");
    const lName = cleanLastName;
    const fullName = lName ? `${fName} ${lName}` : fName;

    let updatedEmp = { 
      ...employeeData, 
      id, 
      first_name: fName,
      last_name: lName,
      full_name: fullName,
      updated_at: new Date().toISOString() 
    };

    if (index !== -1) {
      locals[index] = { ...locals[index], ...updatedEmp };
      updatedEmp = locals[index];
    } else {
      locals.unshift(updatedEmp);
    }
    writeLocalEmployees(locals);

    if (!supabaseAdmin) {
      return res.json({ success: true, data: updatedEmp, source: "local" });
    }

    // Omit generated column 'full_name', ID, and read-only attributes
    const { id: _, full_name, created_at, ...supabaseUpdatePayload } = updatedEmp;
    const { data, error } = await supabaseAdmin
      .from("employees")
      .update({ ...supabaseUpdatePayload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase update failed, utilizing local storage fallback. Error details:", error.message);
      return res.json({ success: true, data: updatedEmp, source: "local_fallback" });
    }
    res.json({ success: true, data: data || updatedEmp });
  } catch (error: any) {
    console.error("Error updating employee, falling back to local database:", error);
    res.status(500).json({ error: error.message || "Failed to update employee profile." });
  }
});

// 7. DELETE /api/employees/:id - Delete employee and their photo in storage (Supabase with Local Fallback)
app.delete("/api/employees/:id", async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const locals = readLocalEmployees();
    const index = locals.findIndex(e => e.id === id);
    let targetPhotoUrl = "";
    if (index !== -1) {
      targetPhotoUrl = locals[index].photo_url || "";
      locals.splice(index, 1);
      writeLocalEmployees(locals);
    }

    // Attempt deleting their local photo if it's stored in public/uploads
    let photoUrl = targetPhotoUrl;
    if (photoUrl && photoUrl.includes("/uploads/")) {
      try {
        const parts = photoUrl.split("/uploads/");
        if (parts.length > 1) {
          const localFile = path.join(UPLOADS_DIR, decodeURIComponent(parts[1]));
          if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
            console.log("Deleted local copy of employee photo on record deletion:", localFile);
          }
        }
      } catch (err: any) {
        console.warn("Failed to delete local copy of file:", err.message);
      }
    }

    if (!supabaseAdmin) {
      return res.json({ success: true, message: "Employee deleted locally." });
    }

    if (!photoUrl) {
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("photo_url")
        .eq("id", id)
        .maybeSingle();
      if (employee) {
        photoUrl = employee.photo_url || "";
      }
    }

    // Try deleting their photo in cloud storage if it exists in employees bucket
    if (photoUrl && photoUrl.includes("/storage/v1/object/public/employees/")) {
      try {
        const urlParts = photoUrl.split("/storage/v1/object/public/employees/");
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabaseAdmin.storage.from("employees").remove([filePath]);
          console.log(`Deleted storage image: ${filePath}`);
        }
      } catch (err) {
        console.warn("Failed to delete employee's photo in storage during deletion:", err);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.warn("Supabase delete failed, utilizing local storage fallback. Error details:", deleteError.message);
      return res.json({ success: true, message: "Employee deleted from local fallback." });
    }

    res.json({ success: true, message: "Employee and photo deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting employee, using fallback:", error);
    res.status(500).json({ error: error.message || "Failed to delete employee." });
  }
});

// ==========================================
// MASTER FACTORY CONFIGURATION API (Buyers & Styles Master Lists)
// ==========================================
const LOCAL_FACTORY_CONFIG_FILE = isVercel
  ? path.join(os.tmpdir(), "factory_config_local.json")
  : path.join(process.cwd(), "factory_config_local.json");
const INITIAL_BUYERS = ["ZARA", "H&M", "NEXT", "M&S", "UNIQLO", "ADIDAS", "NIKE", "GAP", "LEVI'S", "PUMA"];
const INITIAL_STYLES = ["ZRD-2405", "HM-1234", "NXT-9876", "MS-5432", "UQ-7788", "AD-8812", "NK-9921", "GP-0043", "LV-5541", "PM-3311"];

function readLocalFactoryConfig() {
  try {
    // If running in Vercel and the ephemeral temp file doesn't exist yet, try to pre-populate it from the checked-in workspace file.
    if (isVercel && !fs.existsSync(LOCAL_FACTORY_CONFIG_FILE)) {
      const workspacePath = path.join(process.cwd(), "factory_config_local.json");
      if (fs.existsSync(workspacePath)) {
        try {
          fs.writeFileSync(LOCAL_FACTORY_CONFIG_FILE, fs.readFileSync(workspacePath));
          console.log("Pre-populated ephemeral factory config file from workspace.");
        } catch (copyErr: any) {
          console.warn("Could not copy workspace factory config to temp directory:", copyErr.message);
        }
      }
    }

    if (fs.existsSync(LOCAL_FACTORY_CONFIG_FILE)) {
      const data = fs.readFileSync(LOCAL_FACTORY_CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read local factory config:", err);
  }
  const initial = { buyers: INITIAL_BUYERS, styles: INITIAL_STYLES };
  writeLocalFactoryConfig(initial);
  return initial;
}

function writeLocalFactoryConfig(data: { buyers: string[]; styles: string[] }) {
  try {
    fs.writeFileSync(LOCAL_FACTORY_CONFIG_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local factory config:", err);
  }
}

// 1. GET /api/factory-config
app.get("/api/factory-config", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.json(readLocalFactoryConfig());
    }

    const { data: buyersDb, error: buyersError } = await supabaseAdmin
      .from("master_buyers")
      .select("name")
      .order("name", { ascending: true });

    const { data: stylesDb, error: stylesError } = await supabaseAdmin
      .from("master_styles")
      .select("code")
      .order("code", { ascending: true });

    if (buyersError || stylesError) {
      console.warn("Could not fetch factory config from Supabase. Falling back to local file.");
      return res.json(readLocalFactoryConfig());
    }

    let buyers = buyersDb?.map(b => b.name) || [];
    let styles = stylesDb?.map(s => s.code) || [];

    if (buyers.length === 0 && styles.length === 0) {
      const local = readLocalFactoryConfig();
      console.log("Seeding database master_buyers and master_styles tables from local factory config file...");
      if (local.buyers && local.buyers.length > 0) {
        const buyersPayload = local.buyers.map((name: string) => ({ name }));
        await supabaseAdmin.from("master_buyers").upsert(buyersPayload, { onConflict: "name" });
        buyers = local.buyers;
      }
      if (local.styles && local.styles.length > 0) {
        const stylesPayload = local.styles.map((code: string) => ({ code }));
        await supabaseAdmin.from("master_styles").upsert(stylesPayload, { onConflict: "code" });
        styles = local.styles;
      }
      return res.json(local);
    }

    writeLocalFactoryConfig({ buyers, styles });
    res.json({ buyers, styles });
  } catch (err: any) {
    console.error("Error in GET /api/factory-config:", err);
    res.json(readLocalFactoryConfig());
  }
});

// 2. POST /api/factory-config/buyers
app.post("/api/factory-config/buyers", async (req, res) => {
  try {
    const { buyers } = req.body;
    if (!Array.isArray(buyers)) {
      return res.status(400).json({ error: "buyers must be an array of strings." });
    }

    const local = readLocalFactoryConfig();
    local.buyers = buyers;
    writeLocalFactoryConfig(local);

    if (!supabaseAdmin) {
      return res.json({ success: true, buyers, source: "local" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("master_buyers")
      .delete()
      .neq("name", "FORCE_NONE");

    if (deleteError) {
      console.warn("Failed to delete buyers from Supabase:", deleteError.message);
    }

    if (buyers.length > 0) {
      const payload = buyers.map(name => ({ name }));
      const { error: insertError } = await supabaseAdmin
        .from("master_buyers")
        .insert(payload);

      if (insertError) {
        console.warn("Failed to insert buyers into Supabase:", insertError.message);
        return res.json({ success: true, buyers, source: "local_fallback" });
      }
    }

    res.json({ success: true, buyers });
  } catch (err: any) {
    console.error("Error in POST /api/factory-config/buyers:", err);
    res.status(500).json({ error: err.message || "Failed to update buyers." });
  }
});

// 3. POST /api/factory-config/styles
app.post("/api/factory-config/styles", async (req, res) => {
  try {
    const { styles } = req.body;
    if (!Array.isArray(styles)) {
      return res.status(400).json({ error: "styles must be an array of strings." });
    }

    const local = readLocalFactoryConfig();
    local.styles = styles;
    writeLocalFactoryConfig(local);

    if (!supabaseAdmin) {
      return res.json({ success: true, styles, source: "local" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("master_styles")
      .delete()
      .neq("code", "FORCE_NONE");

    if (deleteError) {
      console.warn("Failed to delete styles from Supabase:", deleteError.message);
    }

    if (styles.length > 0) {
      const payload = styles.map(code => ({ code }));
      const { error: insertError } = await supabaseAdmin
        .from("master_styles")
        .insert(payload);

      if (insertError) {
        console.warn("Failed to insert styles into Supabase:", insertError.message);
        return res.json({ success: true, styles, source: "local_fallback" });
      }
    }

    res.json({ success: true, styles });
  } catch (err: any) {
    console.error("Error in POST /api/factory-config/styles:", err);
    res.status(500).json({ error: err.message || "Failed to update styles." });
  }
});

// AI Advisory Endpoint
app.post("/api/advisory", async (req: express.Request, res: express.Response) => {
  try {
    const { linesData, factoryOverview, selectedLineNo } = req.body;
    
    const client = getGeminiClient();
    
    const systemPrompt = `You are the PRODEXA AI Industrial Advisor, a high-end enterprise manufacturing execution intelligence.
Your task is to analyze real-time garment production line metrics and provide highly professional, actionable recommendations for supervisors and floor managers.
The recommendations must look like executive industrial advice: crisp, precise, and practical. No high-level generic advice, but clear calculations or staff re-allocation suggestions.
Format your response in structured Markdown. Always include:
1. Executive Summary (2 sentences max)
2. Immediate Action Items (bullet points with specific line numbers and supervisor tags)
3. Resource Re-allocation Suggestion (e.g., move 2 operators from Line X to Line Y)
4. Style & Performance Advisory (brief insight based on the Buyer/Style currently being produced)`;

    let lineContext = "";
    if (selectedLineNo) {
      const line = linesData.find((l: any) => l.lineNo === selectedLineNo);
      if (line) {
        lineContext = `The user is specifically asking for advice on ${line.lineNo} (Supervisor: ${line.supervisor}, Style: ${line.style}, Buyer: ${line.buyer}, Current Efficiency: ${line.efficiency}%, Target Pcs: ${line.targetPcs}, Output: ${line.currentProductionPcs}, Balance: ${line.balancePcs}, Status: ${line.status}).`;
      }
    }

    const prompt = `Here is the current factory production line status data:
${JSON.stringify(linesData, null, 2)}

Overall Factory Performance:
- Target: ${factoryOverview.shiftTarget} Pcs
- Actual: ${factoryOverview.shiftOutput} Pcs
- Achievement: ${factoryOverview.shiftAchievement}%
- Efficiency: ${factoryOverview.currentEfficiency}%
- Running Lines: ${factoryOverview.runningLines}
- Idle/Breakdown Lines: ${factoryOverview.idleLines}
- Needle Down Events: ${factoryOverview.needleDownLines}

${lineContext}

Please analyze this data and return the professional factory advisory. Make sure it mentions actual supervisors by name and references their style/buyer tags (e.g. Zara, H&M, Nike) so the advice is highly contextual.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    res.json({
      success: true,
      text: response.text || "No analysis could be generated. Please try again.",
    });
  } catch (error: any) {
    console.error("AI Advisory Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during AI analysis.",
    });
  }
});

// Global error-handling middleware to prevent HTML error fallbacks
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "An unexpected server error occurred."
  });
});

// Setup Vite Dev Server / Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PRODEXA server listening at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;
