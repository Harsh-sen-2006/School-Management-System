/**
 * XYZ Convent School - Attendance Controller
 * Developer: Harsh Sen (Haren-Dev)
 * Logic: Real-time student tracking and data visualization
 */

import { db } from "./firebase.js";
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Global Chart instance variable
let attendanceChart;

/**
 * 1. COMPONENT LOADER: Students list for selection
 */
async function loadStudentDropdown() {
    const studentSelector = document.getElementById("studentName");
    if (!studentSelector) return;
    
    studentSelector.innerHTML = '<option value="">Searching students...</option>';

    try {
        // Fetching only active student accounts
        const studentQuery = query(collection(db, "users"), where("role", "==", "student"));
        const snapshot = await getDocs(studentQuery);
        
        studentSelector.innerHTML = '<option value="">Select Student</option>';
        
        snapshot.forEach(docSnap => {
            const student = docSnap.data();
            const option = document.createElement("option");
            
            // Using username as the identifier for simplicity
            option.value = student.username; 
            option.textContent = student.username;
            studentSelector.appendChild(option);
        });
    } catch (err) {
        console.error("Critical: Failed to sync students list", err);
    }
}

/**
 * 2. ACTION: Submit Attendance
 */
window.markAttendance = async function() {
    const studentId = document.getElementById("studentName").value;
    const currentStatus = document.getElementById("status").value;
    const todayDate = new Date().toLocaleDateString(); 

    if (!studentId || !currentStatus) {
        alert("Pehle student aur status select karein.");
        return;
    }

    try {
        // Validation: Preventing double entry for the same day
        const duplicateQuery = query(
            collection(db, "attendance"), 
            where("name", "==", studentId), 
            where("date", "==", todayDate)
        );
        const checkSnap = await getDocs(duplicateQuery);
        
        if (!checkSnap.empty) {
            alert("Aaj ki attendance pehle hi bhari ja chuki hai!");
            return;
        }

        // Push to Cloud
        await addDoc(collection(db, "attendance"), {
            name: studentId,
            status: currentStatus,
            date: todayDate,
            created_at: new Date().toISOString()
        });

        alert("Record updated successfully!");
    } catch (e) {
        console.error("Upload Error:", e);
    }
};

/**
 * 3. ACTION: Remove Entry
 */
window.deleteAttendance = async function(docId) {
    if (confirm("Kya aap ye record hatana chahte hain?")) {
        try {
            await deleteDoc(doc(db, "attendance", docId));
        } catch (err) {
            alert("Delete failed. Check permission.");
        }
    }
};

/**
 * 4. OBSERVER: Real-time UI & Stats Update
 */
function listenToAttendanceFeed() {
    const listUI = document.getElementById("attendanceList");
    
    // Live listener for the attendance collection
    onSnapshot(collection(db, "attendance"), (snapshot) => {
        if (!listUI) return;
        
        listUI.innerHTML = "";
        let present = 0;
        let absent = 0;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const recordId = docSnap.id;

            // Stats calculation for the chart
            if (data.status === "Present") present++;
            if (data.status === "Absent") absent++;

            const listItem = document.createElement("li");
            listItem.className = "att-item";
            listItem.style = "display:flex; justify-content:space-between; margin:12px 0; font-size:14px; color:#333;";
            
            listItem.innerHTML = `
                <span>${data.name} - <b style="color:${data.status === 'Present' ? '#16a34a' : '#ef4444'}">${data.status}</b></span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <small style="color:#888;">${data.date}</small>
                    <button onclick="deleteAttendance('${recordId}')" style="background:none; border:none; cursor:pointer; color:red;">❌</button>
                </div>
            `;
            listUI.appendChild(listItem);
        });

        // Sync visual analytics
        syncAttendanceChart(present, absent);
    });
}

/**
 * 5. ANALYTICS: Visual Chart rendering
 */
function syncAttendanceChart(p, a) {
    const canvas = document.getElementById("chart");
    if(!canvas) return;
    
    const ctx = canvas.getContext("2d");

    // Clear previous instance to avoid memory leak
    if (attendanceChart) attendanceChart.destroy();

    attendanceChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Present", "Absent"],
            datasets: [{
                data: [p, a],
                backgroundColor: ["#16a34a", "#ef4444"],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

/**
 * START APPLICATION
 */
window.addEventListener("DOMContentLoaded", () => {
    loadStudentDropdown();
    listenToAttendanceFeed();
});