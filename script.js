/**
 * XYZ Convent School - Student Management System
 * Developer: Harsh Sen (Haren-Dev)
 * Description: CRUD operations for student list with real-time Firestore sync
 */

import { db } from "./firebase.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc, 
    onSnapshot,
    query,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. STUDENT REGISTRATION ---
window.addStudent = async function() {
    const nameInput = document.getElementById("name");
    const classInput = document.getElementById("classInput");
    const rollInput = document.getElementById("roll");
    const msgBox = document.getElementById("message");

    const studentData = {
        name: nameInput.value.trim(),
        className: classInput.value.trim(),
        roll: rollInput.value.trim(),
        createdAt: new Date().toISOString()
    };

    // Basic Form Validation
    if (!studentData.name || !studentData.className || !studentData.roll) {
        alert("Saari fields bharna zaroori hai!");
        return;
    }

    try {
        await addDoc(collection(db, "students_list"), studentData);
        
        // Resetting UI
        nameInput.value = "";
        classInput.value = "";
        rollInput.value = "";
        
        msgBox.style.color = "#16a34a";
        msgBox.innerText = "Student records updated successfully!";
        
        // Clear message after 3 seconds
        setTimeout(() => msgBox.innerText = "", 3000);

    } catch (err) {
        console.error("Firestore Write Error:", err);
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "Cloud sync failed. Check connection.";
    }
};

// --- 2. REAL-TIME STUDENT FEED ---
function listenToStudentUpdates() {
    const listContainer = document.getElementById("studentList");
    const counter = document.getElementById("totalStudents");

    // Querying students ordered by latest entry
    const q = query(collection(db, "students_list"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        listContainer.innerHTML = "";
        counter.innerText = snapshot.size;

        if (snapshot.empty) {
            listContainer.innerHTML = "<p style='text-align:center; color:#999;'>Abhi tak koi data nahi hai.</p>";
            return;
        }

        snapshot.forEach((item) => {
            const student = item.data();
            const docId = item.id;

            const card = document.createElement("div");
            card.className = "student-card";
            // Manual styling for the card
            card.style = "background:#ffffff; padding:15px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #eee; transition: 0.3s;";

            card.innerHTML = `
                <div>
                    <strong style="font-size:15px; color:#333;">${student.name}</strong> <br>
                    <small style="color:#888;">Class: ${student.className} | Roll: ${student.roll}</small>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="editStudent('${docId}', '${student.name}', '${student.className}')" style="cursor:pointer; opacity:0.7;">✏️</button>
                    <button onclick="deleteStudent('${docId}')" style="cursor:pointer; opacity:0.7;">❌</button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    });
}

// --- 3. RECORD REMOVAL ---
window.deleteStudent = async function(id) {
    if (confirm("Kya aap is record ko delete karna chahte hain?")) {
        try {
            await deleteDoc(doc(db, "students_list", id));
        } catch (err) {
            console.log("Delete error:", err);
            alert("Record delete nahi ho paya.");
        }
    }
};

// --- 4. RECORD MODIFICATION ---
window.editStudent = async function(id, currentName, currentClass) {
    const updatedName = prompt("Student ka naya naam:", currentName);
    const updatedClass = prompt("Nayi class set karein:", currentClass);

    // Only update if inputs are not empty
    if (updatedName && updatedClass) {
        try {
            const studentRef = doc(db, "students_list", id);
            await updateDoc(studentRef, {
                name: updatedName,
                className: updatedClass
            });
        } catch (err) {
            alert("Update failed! Please try again.");
        }
    }
};

// --- 5. CLIENT-SIDE SEARCH FILTER ---
window.searchStudent = function() {
    const searchTerm = document.getElementById("search").value.toLowerCase();
    const allCards = document.querySelectorAll(".student-card");

    allCards.forEach(card => {
        const content = card.innerText.toLowerCase();
        // Toggle visibility based on match
        card.style.display = content.includes(searchTerm) ? "flex" : "none";
    });
};

// --- 6. VISUAL ANALYTICS ---
window.renderAttendanceChart = function() {
    const canvas = document.getElementById("chart");
    if(!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Initializing Chart.js
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Present", "Absent"],
            datasets: [{
                label: "Student Attendance",
                data: [42, 8], // Example static data
                backgroundColor: ["#16a34a", "#dc2626"],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
};

// --- STARTUP LOGIC ---
window.addEventListener("DOMContentLoaded", () => {
    listenToStudentUpdates();
    renderAttendanceChart();
});