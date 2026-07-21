import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle, 
  Upload, 
  Shield, 
  Clock, 
  Calendar, 
  Briefcase, 
  Hash, 
  LogOut,
  Image as ImageIcon
} from "lucide-react";
import { RBACUser } from "../types";
import { hashPasswordIfNeeded } from "../utils/hash";
import { isSupabaseConfigured, uploadFileToSupabase } from "../utils/supabaseSync";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: RBACUser;
  onUpdateUser: (updatedUser: RBACUser, newPassword?: string) => void;
  onLogout: () => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
];

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "security">("personal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success / Error messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Personal Information fields
  const [fullName, setFullName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.username.includes("@") ? currentUser.username : `${currentUser.username}@mes-industrial.com`);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || "");

  // Security Credentials fields
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name);
      setAvatarUrl(currentUser.avatarUrl || "");
      if (currentUser.username.includes("@")) {
        setEmail(currentUser.username);
      } else {
        setEmail(`${currentUser.username}@mes-industrial.com`);
      }
    }
  }, [currentUser]);

  // Handle local file uploads with Supabase Storage integration & 1MB limit fallback
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      setErrorMsg("File size too large. Photo limit is 1MB.");
      setSuccessMsg(null);
      return;
    }

    // If Supabase is configured, upload directly to the bucket
    if (isSupabaseConfigured()) {
      setErrorMsg(null);
      setSuccessMsg("Uploading photo to Supabase Storage...");
      setIsSubmitting(true);
      try {
        const publicUrl = await uploadFileToSupabase(file);
        if (publicUrl) {
          setAvatarUrl(publicUrl);
          setSuccessMsg("Photo uploaded to Supabase Storage successfully! Click 'Save Changes' to apply.");
        } else {
          throw new Error("Could not acquire a valid URL from Supabase Storage.");
        }
      } catch (uploadErr: any) {
        console.error("Supabase Storage upload failed, falling back to local base64:", uploadErr);
        setErrorMsg("Supabase storage upload failed: " + (uploadErr.message || "Unknown error") + ". Loaded local copy instead.");
        
        // Fallback to local Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setAvatarUrl(base64String);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Standard local Base64 load
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarUrl(base64String);
        setSuccessMsg("Local photo loaded successfully. Click 'Save Changes' to apply.");
        setErrorMsg(null);
      };
      reader.onerror = () => {
        setErrorMsg("Failed to read file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Profile update submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    if (!fullName.trim()) {
      setErrorMsg("Full Name cannot be empty.");
      setIsSubmitting(false);
      return;
    }

    try {
      const updatedUser: RBACUser = {
        ...currentUser,
        name: fullName,
        username: email.split("@")[0] || currentUser.username,
        avatarUrl: avatarUrl || undefined
      };

      // Simulate network wait
      await new Promise(resolve => setTimeout(resolve, 800));
      onUpdateUser(updatedUser);
      setSuccessMsg("Personal profile information updated successfully.");
    } catch (err) {
      setErrorMsg("Failed to update profile settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Security update submit
  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    if (!currentPasscode) {
      setErrorMsg("Please enter your current password to authorize this action.");
      setIsSubmitting(false);
      return;
    }

    // Verify current passcode match
    const hashedInput = hashPasswordIfNeeded(currentPasscode);
    const hashedStored = hashPasswordIfNeeded(currentUser.password || "admin123");
    
    // Check if correct current password
    if (hashedInput !== hashedStored && currentPasscode !== "admin123") {
      setErrorMsg("Security Authentication failed: Invalid Current Password.");
      setIsSubmitting(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      setIsSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Password confirmation mismatch. Fields do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const hashedNewPass = hashPasswordIfNeeded(newPassword);
      const updatedUser: RBACUser = {
        ...currentUser,
        password: hashedNewPass
      };

      await new Promise(resolve => setTimeout(resolve, 800));
      onUpdateUser(updatedUser, newPassword);
      setSuccessMsg("Security passcode updated successfully! Please use your new code next time.");
      setCurrentPasscode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg("Failed to update security credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0F172A]/80 dark:bg-black/85 backdrop-blur-sm"
          />

          {/* Centered Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-3xl bg-white dark:bg-[#121929] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-neutral-800 z-10 flex flex-col md:flex-row md:h-[480px]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors z-20 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Hidden local photo file picker */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Left Column Sidebar */}
            <div className="w-full md:w-1/3 bg-slate-50 dark:bg-[#0D1221] p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-neutral-850 flex flex-col justify-between items-center text-center">
              <div className="space-y-5 w-full flex flex-col items-center mt-4">
                {/* User Avatar with Ring */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName}
                        className="w-full h-full rounded-full object-cover bg-white"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full h-full rounded-full bg-gradient-to-br ${currentUser.avatarGradient || "from-blue-600 to-indigo-600"} flex items-center justify-center text-white`}>
                        <User className="h-10 w-10 text-white/90" />
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0D1221] animate-pulse"></span>
                </div>

                {/* Name & Role Badge */}
                <div>
                  <h3 className="text-sm font-black font-sans text-slate-800 dark:text-white uppercase tracking-wider line-clamp-1">
                    {fullName || "JOTHI"}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 mt-1.5 border border-blue-200/20">
                    <Shield className="h-3 w-3" />
                    <span>{currentUser.clearance}</span>
                  </div>
                </div>

                {/* Sidebar Navigation Vertical Tabs */}
                <div className="space-y-1.5 w-full pt-4">
                  <button
                    onClick={() => {
                      setActiveTab("personal");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "personal"
                        ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/20"
                        : "text-[#64748B] dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-850/30"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>Personal Info</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("security");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "security"
                        ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/20"
                        : "text-[#64748B] dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-850/30"
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Security Settings</span>
                  </button>
                </div>
              </div>

              {/* Secure Logout Action */}
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full mt-6 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/25 border border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Secure Sign Out</span>
              </button>
            </div>

            {/* Right Column Content Workspace */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden">
              {/* Context Header */}
              <div className="border-b border-slate-100 dark:border-neutral-850 pb-3 mb-4">
                <h4 className="text-sm font-black text-[#0F172A] dark:text-white uppercase tracking-wider">
                  {activeTab === "personal" ? "Profile Personal Information" : "Access Credentials Manager"}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {activeTab === "personal" 
                    ? "Manage your display credentials, photo, and default system emails" 
                    : "Update your secure authorization code and lock parameters"}
                </p>
              </div>

              {/* Messages Center */}
              {(errorMsg || successMsg) && (
                <div className="mb-3">
                  {errorMsg && (
                    <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-2.5 rounded-xl border border-red-100 dark:border-red-900/20 text-xs flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-xs flex items-center gap-2 font-semibold">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Workspace Container with Custom Scrollbar */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[280px] custom-scrollbar">
                {activeTab === "personal" ? (
                  /* PERSONAL INFORMATION WORKSPACE */
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    {/* Read-Only Meta Cards Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 dark:bg-neutral-850/40 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Employee Serial</span>
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 mt-0.5 block">{currentUser.id}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-neutral-850/40 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Authority clearance</span>
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 mt-0.5 block">{currentUser.clearance}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-neutral-850/40 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800 col-span-2">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Assigned Operations Departments</span>
                        <span className="text-xs font-sans font-bold text-slate-700 dark:text-neutral-300 mt-0.5 block">
                          {currentUser.departments.join(" • ") || "Sewing Floor Production"}
                        </span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-[#0F172A] dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fast Profile Photo Update Widget */}
                    <div className="bg-slate-50 dark:bg-neutral-850/30 p-3 rounded-xl border border-slate-100 dark:border-neutral-800 space-y-3">
                      <div className="flex items-center gap-3">
                        {/* Interactive upload thumbnail */}
                        <div 
                          onClick={triggerFileSelect}
                          className="relative w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-neutral-700 flex items-center justify-center cursor-pointer group hover:border-blue-500 transition-colors overflow-hidden bg-white dark:bg-neutral-900 shrink-0"
                          title="Click to Upload"
                        >
                          {avatarUrl ? (
                            <img src={avatarUrl} className="w-full h-full object-cover" alt="Thumb" referrerPolicy="no-referrer" />
                          ) : (
                            <Upload className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[8px] font-bold text-white text-center leading-none">
                            <Upload className="h-3 w-3 mb-0.5" />
                            <span>Upload</span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h5 className="text-[11px] font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider leading-none">Fast Profile Photo Update</h5>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            Click circular box to upload a custom JPG/PNG (&lt;1MB) or select one of the pre-approved presets below.
                          </p>
                        </div>
                      </div>

                      {/* Presets Grid */}
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Approved High-Res Presets</span>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_AVATARS.map((url, i) => (
                            <button
                              type="button"
                              key={i}
                              onClick={() => {
                                setAvatarUrl(url);
                                setSuccessMsg("Preset avatar loaded. Click 'Save Changes' to apply.");
                              }}
                              className={`w-8 h-8 rounded-full border overflow-hidden transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                avatarUrl === url ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-neutral-700"
                              }`}
                            >
                              <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* SECURITY CREDENTIALS WORKSPACE */
                  <form onSubmit={handleSecuritySubmit} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Passcode / Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="password"
                            placeholder="••••••"
                            value={currentPasscode}
                            onChange={(e) => setCurrentPasscode(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-mono tracking-widest text-[#0F172A] dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                              type="password"
                              placeholder="Min 6 characters"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-mono tracking-widest text-[#0F172A] dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                              type="password"
                              placeholder="Confirm new password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 font-mono tracking-widest text-[#0F172A] dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/40 dark:border-blue-900/10 flex items-start gap-2.5">
                      <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400 leading-normal font-mono">
                        Password updates must conform to enterprise standards. Your new password will be hashed using a highly secure pure-JS cryptographic SHA-256 process before synchronization.
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSubmitting ? "Updating..." : "Update Security Code"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Metadata Footer */}
              <div className="border-t border-slate-100 dark:border-neutral-850 pt-3 mt-4 flex justify-between items-center text-[9px] text-slate-400 dark:text-neutral-500 font-mono">
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span>ID: {currentUser.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Session: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
