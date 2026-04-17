// config.js

/**
 * Global Configuration for Kiddy's Corner School App
 * Used to maintain consistency across Admin, Teacher, and Student modules.
 */

export const SCHOOL_CONFIG = {
  // Brand Information
  name: "Kiddy’s Corner Hr. Sec. School",
  shortName: "KCS",
  logo: "./logo.png", // Path to your school logo
  
  // Theme Colors (Used for dynamic styling)
  theme: {
    primary: "#ff6b6b",    // Hero sections / Main branding
    secondary: "#f59e0b",  // Accents / Warning states
    admin: "#1d4ed8",      // Admin-specific buttons
    success: "#16a34a",    // Approval / Present attendance
    danger: "#ef4444",     // Rejection / Absent attendance
    background: "#f3f4f8"  // Light grey page background
  },

  // Role Definitions (Matches your Firestore "role" field)
  roles: {
    ADMIN: "admin",
    TEACHER: "teacher",
    STUDENT: "student"
  },

  // Contact Details
  contact: {
    email: "contact@kiddyscorner.edu",
    phone: "+91-0000000000",
    location: "Gwalior, India"
  }
};

/**
 * Utility function to set the school name in the UI automatically.
 * You can call this in any script to update the header.
 */
export function initializeBrand() {
  const schoolTitles = document.querySelectorAll(".school-title");
  schoolTitles.forEach(title => {
    title.innerText = SCHOOL_CONFIG.name.toUpperCase();
  });
}