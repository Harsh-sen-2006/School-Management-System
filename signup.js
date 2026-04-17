import { db } from "./firebase.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.registerStudent = async function () {
  const fields = ["username", "email", "admissionNo", "rollNo", "className", "section", "gender", "password", "bio"];
  const data = {};
  fields.forEach(f => data[f] = document.getElementById(f).value.trim());

  const message = document.getElementById("message");
  message.innerText = "Processing...";
  message.style.color = "blue";

  // Validation
  if (!data.username || !data.email || !data.className || !data.password) {
    message.innerText = "⚠️ Please fill all required fields!";
    message.style.color = "red";
    return;
  }

  try {
    // Check for Duplicates
    const snap = await getDocs(collection(db, "users"));
    let exists = false;
    snap.forEach(doc => {
        if (doc.data().username.toLowerCase() === data.username.toLowerCase()) exists = true;
    });

    if (exists) {
        message.innerText = "❌ Username already taken!";
        message.style.color = "red";
        return;
    }

    // Save Student Data
    await addDoc(collection(db, "users"), {
      ...data,
      username: data.username.toLowerCase(), // Always small for easy login
      role: "student",
      status: "pending", // Admin must approve
      createdAt: new Date().toISOString()
    });

    message.style.color = "green";
    message.innerText = "✅ Registration Success! Wait for Admin approval.";
    
    // Clear Form
    fields.forEach(f => document.getElementById(f).value = "");

  } catch (error) {
    console.error(error);
    message.innerText = "❌ Error. Try again.";
  }
};