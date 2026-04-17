/**
 * Project: XYZ Convent School Portal
 * Module: Student Dashboard Controller (v2.5)
 * Developer: Harsh Sen (Haren-Dev)
 */

import { db } from "./firebase.js";
import {
    collection, query, where, addDoc, onSnapshot, 
    orderBy, updateDoc, doc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Global Session States
const authUser = localStorage.getItem("username");
let currentClass = "";
let currentName = "";
let isListenersActive = false;

/**
 * 1. DASHBOARD INITIALIZATION
 */
async function startDashboard() {
    if (!authUser) {
        window.location.href = "login.html";
        return;
    }

    // Static UI components & Global Listeners
    fetchAvailableTeachers();
    renderHomeCal();
    syncAdminAlerts(); // Fixed Admin Alert Logic

    // User Profile Sync (Real-time)
    const userRef = query(collection(db, "users"), where("username", "==", authUser));
    
    onSnapshot(userRef, (snap) => {
        if (snap.empty) return;
        
        snap.forEach(userDoc => {
            const userData = userDoc.data();
            currentClass = userData.className || ""; 
            currentName = userData.name || authUser;
            
            // Sync UI with latest profile data
            refreshProfileUI(userData);

            // Data streams depend on student's class
            if (!isListenersActive && currentClass) {
                initStudentDataStreams();
                isListenersActive = true;
            }
        });
    }, (err) => console.log("Profile Sync Error:", err));
}

/**
 * 2. DROPDOWN LOADER: Populate teacher list for applications
 */
async function fetchAvailableTeachers() {
    const teacherSelect = document.getElementById("selectTeacher");
    if (!teacherSelect) return;

    try {
        const q = query(collection(db, "users"), where("role", "==", "teacher"));
        const snap = await getDocs(q);
        
        teacherSelect.innerHTML = `<option value="">Select Teacher...</option>`;
        snap.forEach(tDoc => {
            const t = tDoc.data();
            teacherSelect.innerHTML += `<option value="${t.username}">${t.name} (${t.subject || 'Staff'})</option>`;
        });
    } catch (e) { console.error("Teacher List Error:", e); }
}

/**
 * 3. REAL-TIME DATA STREAMS (Core Features)
 */
function initStudentDataStreams() {
    // Classroom specific content (Homework, TimeTable)
    streamContent("Homework", "studentHwList");
    streamContent("TimeTable", "studentTTList");
    
    // Classroom Diary Stream (Teacher's daily work)
    streamClassDiary();

    // Study Material Stream (Admin's PDFs/Links)
    streamStudyMaterial();

    // Personal Account Streams
    streamAttendance();
    streamResults();
    streamLeaveHistory();
    streamFeeStatus(); // New: Fee Tracking
}

// Fixed Global Admin Alert Sync
function syncAdminAlerts() {
    const q = query(
        collection(db, "notices"), 
        where("target", "in", ["All", "Student"]), 
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snap) => {
        const alertContainer = document.getElementById("studentNoticeList");
        if (!alertContainer) return;
        
        alertContainer.innerHTML = snap.empty ? `<p class="empty-msg">No alerts found.</p>` : "";
        
        snap.forEach(post => {
            const data = post.data();
            const isAdmin = data.postedBy === "Admin" ? "border-left:5px solid #ef4444; background:#fff5f5;" : "border-left:5px solid #0a134d;";
            
            alertContainer.innerHTML += `
                <div class="card" style="${isAdmin} padding:15px; margin-bottom:10px;">
                    <b style="color:#0a134d; font-size:14px;">${data.postedBy === "Admin" ? '📢 ADMIN: ' : ''}${data.title}</b>
                    <p style="font-size:12px; margin-top:5px; color:#444;">${data.message}</p>
                    <div style="text-align:right; margin-top:8px;"><small style="color:#999; font-size:10px;">${data.date}</small></div>
                </div>`;
        });
    });
}

// Generic Content Stream (Homework/TT)
function streamContent(category, containerId) {
    const q = query(
        collection(db, "notices"), 
        where("className", "==", currentClass), 
        where("category", "==", category), 
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snap) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = snap.empty ? `<p class="empty-msg">No ${category} found.</p>` : "";
        
        snap.forEach(doc => {
            const item = doc.data();
            container.innerHTML += `
                <div class="card" style="border-left:4px solid #f2a93b; padding:12px;">
                    <b style="color:#0a134d; font-size:13px;">${item.title}</b>
                    <p style="font-size:12px; color:#666; margin-top:4px;">${item.message}</p>
                    <small style="display:block; margin-top:5px; font-size:10px; color:#aaa;">By ${item.postedBy}</small>
                </div>`;
        });
    });
}

// NEW: Study Material Listener
function streamStudyMaterial() {
    const q = query(
        collection(db, "study_material"), 
        where("className", "in", ["All", currentClass]),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snap) => {
        const box = document.getElementById("studentStudyList");
        if(!box) return;
        box.innerHTML = snap.empty ? "<p class='empty-msg'>No study material available.</p>" : "";

        snap.forEach(d => {
            const mat = d.data();
            box.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <b style="font-size:14px;">${mat.title}</b>
                        <p style="font-size:10px; color:#888;">Shared by Admin</p>
                    </div>
                    <a href="${mat.link}" target="_blank" class="study-btn">Download PDF</a>
                </div>`;
        });
    });
}

// NEW: Class Diary Listener
function streamClassDiary() {
    const q = query(
        collection(db, "notices"), 
        where("className", "==", currentClass),
        where("category", "==", "Diary"),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snap) => {
        const diaryBox = document.getElementById("studentDiaryList");
        if(!diaryBox) return;
        diaryBox.innerHTML = snap.empty ? "<p class='empty-msg'>Diary not updated for today.</p>" : "";

        snap.forEach(d => {
            const entry = d.data();
            diaryBox.innerHTML += `
                <div class="card" style="border-left: 5px solid var(--accent-gold);">
                    <div style="display:flex; justify-content:space-between;">
                        <b style="font-size:13px;">${entry.title}</b>
                        <small style="color:#999;">${entry.date}</small>
                    </div>
                    <p style="font-size:12px; margin-top:8px; line-height:1.4;">${entry.message}</p>
                </div>`;
        });
    });
}

// NEW: Fee Status Sync
function streamFeeStatus() {
    const q = query(
        collection(db, "fees"), 
        where("studentUsername", "==", authUser),
        orderBy("updatedAt", "desc")
    );

    onSnapshot(q, (snap) => {
        const feeBox = document.getElementById("studentFeeList");
        if(!feeBox) return;
        feeBox.innerHTML = snap.empty ? "<p class='empty-msg'>No fee records found.</p>" : "";

        snap.forEach(d => {
            const fee = d.data();
            const statusClass = fee.status === 'Paid' ? 'paid' : 'pending';
            feeBox.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <b style="font-size:14px;">${fee.month}</b>
                        <p style="font-size:10px; color:#888;">Updated on: ${new Date(fee.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <span class="status-badge ${statusClass}">${fee.status}</span>
                </div>`;
        });
    });
}

// Personal Performance & Requests
function streamAttendance() {
    const q = query(collection(db, "attendance"), where("studentUsername", "==", authUser), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snap) => {
        const list = document.getElementById("studentAttList");
        if (!list) return;
        list.innerHTML = "";
        let presentCount = 0;

        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === "Present") presentCount++;
            const statusColor = data.status === "Present" ? "#16a34a" : "#dc2626";
            
            list.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:12px;">
                    <b style="font-size:13px;">${data.date}</b>
                    <span style="color:${statusColor}; font-weight:800; font-size:11px;">${data.status.toUpperCase()}</span>
                </div>`;
        });

        const total = snap.size;
        const perc = total > 0 ? ((presentCount / total) * 100).toFixed(1) : 0;
        
        if(document.getElementById("att-total-days")) document.getElementById("att-total-days").innerText = total;
        if(document.getElementById("att-present-days")) document.getElementById("att-present-days").innerText = presentCount;
        if(document.getElementById("att-absent-days")) document.getElementById("att-absent-days").innerText = total - presentCount;
        if(document.getElementById("att-percentage")) document.getElementById("att-percentage").innerText = perc + "%";
    });
}

function streamResults() {
    const q = query(collection(db, "results"), where("studentUsername", "==", authUser), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        const box = document.getElementById("studentResultList");
        if (!box) return;
        box.innerHTML = snap.empty ? `<p class="empty-msg">Results not declared yet.</p>` : "";
        
        snap.forEach(docSnap => {
            const res = docSnap.data();
            box.innerHTML += `
                <div class="card" style="border-left:5px solid #0a134d; padding:15px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-weight:700;">Academic Review</span>
                        <span style="color:#0a134d; font-weight:800;">${res.marks} / ${res.total}</span>
                    </div>
                    <small style="color:#888;">Published on: ${res.date}</small>
                </div>`;
        });
    });
}

/**
 * 4. LEAVE ACTIONS & HISTORY
 */
window.submitLeave = async () => {
    const teacher = document.getElementById('selectTeacher').value;
    const date = document.getElementById('leaveDate').value;
    const reason = document.getElementById('leaveReason').value;

    if (!teacher || !date || !reason) return alert("Please complete the form!");

    try {
        await addDoc(collection(db, "leaves"), {
            studentUsername: authUser,
            studentName: currentName,
            className: currentClass,
            assignedTo: teacher,
            date: date,
            reason: reason,
            status: "Pending",
            timestamp: Date.now()
        });
        alert("Leave request sent to teacher.");
        document.getElementById('leaveReason').value = "";
    } catch (err) { alert("Error: Could not send request."); }
};

function streamLeaveHistory() {
    const q = query(collection(db, "leaves"), where("studentUsername", "==", authUser), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snap) => {
        const history = document.getElementById("myLeaveList");
        if (!history) return;
        history.innerHTML = "";

        snap.forEach(docSnap => {
            const leave = docSnap.data();
            const color = leave.status === "Approved" ? "#16a34a" : (leave.status === "Rejected" ? "#dc2626" : "#f59e0b");
            
            history.innerHTML += `
                <div class="card" style="border-left: 5px solid ${color}; padding:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b>${leave.date}</b>
                        <small style="color:${color}; font-weight:bold;">${leave.status.toUpperCase()}</small>
                    </div>
                    <p style="font-size:11px; color:#777; margin-top:5px;">Reason: ${leave.reason}</p>
                </div>`;
        });
    });
}

/**
 * 5. UI CORE LOGIC
 */
function refreshProfileUI(data) {
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setImg = (id, url) => { if(document.getElementById(id)) document.getElementById(id).src = url; };

    setTxt("s-name", data.name || "Student");
    setTxt("s-class-display", "Class: " + (data.className || "-"));
    
    const pic = data.profileImage || `https://ui-avatars.com/api/?name=${data.name || 'S'}&background=0a134d&color=fff`;
    setImg("s-img", pic);
    setImg("s-img-large", pic);
    setImg("s-edit-prev", pic);

    setTxt("s-name-large", data.name || "Student");
    setTxt("p-class", data.className || "-");
    setTxt("p-roll", data.rollNo || "-");
    setTxt("p-mobile", data.mobile || "-");
    setTxt("p-email", data.email || "-");
    setTxt("p-dob", data.dob || "-");

    // Form Pre-fill
    if(document.getElementById("editName")) document.getElementById("editName").value = data.name || "";
    if(document.getElementById("editMobile")) document.getElementById("editMobile").value = data.mobile || "";
    if(document.getElementById("editEmail")) document.getElementById("editEmail").value = data.email || "";
    if(document.getElementById("editDob")) document.getElementById("editDob").value = data.dob || "";
}

function renderHomeCal() {
    const grid = document.getElementById("dashboard-calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    const now = new Date();
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(h => grid.innerHTML += `<b style="font-size:10px; color:#bbb;">${h}</b>`);

    const start = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let i = 0; i < start; i++) grid.innerHTML += `<div></div>`;
    for (let d = 1; d <= total; d++) {
        const active = d === now.getDate() ? "background:#0a134d; color:#fff; border-radius:50%; font-weight:bold;" : "";
        grid.innerHTML += `<div style="font-size:11px; padding:6px; text-align:center; ${active}">${d}</div>`;
    }
}

window.saveStudentProfile = async () => {
    try {
        const uRef = query(collection(db, "users"), where("username", "==", authUser));
        const res = await getDocs(uRef);
        if(res.empty) return;
        
        await updateDoc(doc(db, "users", res.docs[0].id), {
            name: document.getElementById("editName").value,
            mobile: document.getElementById("editMobile").value,
            email: document.getElementById("editEmail").value,
            dob: document.getElementById("editDob").value,
            profileImage: document.getElementById("s-edit-prev").src
        });

        alert("Profile update successful.");
        document.getElementById('editProfileModal').classList.remove('active');
    } catch (e) { console.error(e); }
};

window.logout = () => {
    if(confirm("Are you sure you want to exit?")) {
        localStorage.clear();
        window.location.href = "login.html";
    }
};

// Initial Start
startDashboard();