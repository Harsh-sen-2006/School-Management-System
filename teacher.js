/**
 * Project: XYZ Convent School Portal
 * Module: Teacher Dashboard Controller (v2.5)
 * Developer: Harsh Sen (Haren-Dev)
 */

import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    addDoc,
    onSnapshot,
    orderBy,
    updateDoc,
    doc,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Global Session Variables
const authUser = localStorage.getItem("username");
let activeClass = "";
let teacherName = "";

/**
 * 1. INITIALIZATION: Portal Startup Logic
 */
function initTeacherApp() {
    if (!authUser) {
        window.location.href = "login.html";
        return;
    }

    // Real-time Profile Sync
    const userQuery = query(collection(db, "users"), where("username", "==", authUser));
    
    onSnapshot(userQuery, (snap) => {
        snap.forEach(userDoc => {
            const data = userDoc.data();
            localStorage.setItem("tDocId", userDoc.id);
            teacherName = data.name || authUser;

            // Header UI Update
            document.getElementById("t-name").innerText = teacherName;
            document.getElementById("t-subj-display").innerText = data.subject || "Staff Member";
            document.getElementById("t-img").src = data.profileImage || `https://ui-avatars.com/api/?name=${teacherName}`;
            
            // Profile Card View
            const profileView = document.getElementById("profileCardContent");
            if(profileView) {
                profileView.innerHTML = `
                    <center><img src="${data.profileImage || 'https://ui-avatars.com/api/?name=T'}" style="width:100px; height:100px; border-radius:50%; border:3px solid #f2a93b; object-fit:cover;"></center>
                    <h3 style="text-align:center; margin:15px 0;">${teacherName}</h3>
                    <div style="padding: 10px; font-size: 14px; color: #444;">
                        <p style="margin-bottom:8px;"><b>Subject:</b> ${data.subject || '-'}</p>
                        <p style="margin-bottom:8px;"><b>Mobile:</b> ${data.mobile || '-'}</p>
                        <p style="margin-bottom:8px;"><b>WhatsApp:</b> ${data.whatsapp || '-'}</p>
                        <p style="margin-bottom:8px;"><b>Email:</b> ${data.email || '-'}</p>
                        <p><b>DOB:</b> ${data.dob || '-'}</p>
                    </div>
                `;
            }

            // Sync Edit Modal Fields
            const editFields = ['editName', 'editSubj', 'editMobile', 'editWhatsapp', 'editEmail', 'editDob'];
            editFields.forEach(f => {
                const val = data[f.replace('edit', '').toLowerCase()];
                if(document.getElementById(f)) document.getElementById(f).value = val || "";
            });
            document.getElementById("t-edit-prev").src = data.profileImage || "https://ui-avatars.com/api/?name=T";
        });
    });

    renderCal();
    syncAdminBroadcasts();
}

/**
 * 2. CLASSROOM SWITCHER: Updates all contexts
 */
window.syncClassSelection = (val) => {
    activeClass = val;
    console.log("Teacher shifted context to:", activeClass);
    
    if (val) {
        fetchStudentsForAttendance();
        fetchStudentsForResults();
        streamLeaveRequests();
        syncClassFees(); // Load fee status for selected class
    }
};

/**
 * 3. ATTENDANCE & BULK ACTIONS
 */
async function fetchStudentsForAttendance() {
    const q = query(collection(db, "users"), where("className", "==", activeClass));
    const snap = await getDocs(q);
    const list = document.getElementById("attList");
    list.innerHTML = "";
    
    if (snap.empty) {
        list.innerHTML = `<p style="text-align:center; color:#888; padding:30px;">No students found in ${activeClass}</p>`;
        document.getElementById("saveAttBtn").style.display = "none";
        return;
    }

    snap.forEach(entry => {
        const student = entry.data();
        list.innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:600; font-size:14px;">${student.name}</span>
                <div class="att-actions">
                    <button class="att-btn" style="width:40px; height:35px; border-radius:6px; border:1px solid #ddd;" onclick="markStatus('${student.username}', 'Present', this)">P</button>
                    <button class="att-btn" style="width:40px; height:35px; border-radius:6px; border:1px solid #ddd; margin-left:5px;" onclick="markStatus('${student.username}', 'Absent', this)">A</button>
                </div>
            </div>`;
    });
    document.getElementById("saveAttBtn").style.display = "block";
}

let tempAttendance = {};
window.markStatus = (uId, status, btn) => {
    tempAttendance[uId] = status;
    const parent = btn.parentElement;
    parent.querySelectorAll('button').forEach(b => {
        b.style.background = "#fff";
        b.style.color = "#333";
    });
    btn.style.background = (status === 'Present') ? "#16a34a" : "#dc2626";
    btn.style.color = "#fff";
};

window.saveBulkAtt = async () => {
    const dateStr = document.getElementById("attDate").value;
    if (!dateStr) return alert("Please select a date first!");
    
    const markedCount = Object.keys(tempAttendance).length;
    if (markedCount === 0) return alert("Mark at least one student!");

    try {
        for (let sId in tempAttendance) {
            await addDoc(collection(db, "attendance"), {
                studentUsername: sId,
                className: activeClass,
                date: dateStr,
                status: tempAttendance[sId],
                timestamp: Date.now()
            });
        }
        alert(`Records saved for ${markedCount} students.`);
    } catch(err) { alert("Execution failed."); }
};

/**
 * 4. CONTENT UPLOADER (Homework / Notice / Diary)
 */
window.handleUpload = async (category, titleId, msgId) => {
    const head = (titleId === 'Daily Work') ? 'Daily Work' : document.getElementById(titleId).value;
    const body = document.getElementById(msgId).value;

    if (!activeClass) return alert("Select class first!");
    if (!body) return alert("Message cannot be empty!");

    try {
        await addDoc(collection(db, "notices"), {
            category: category,
            className: activeClass,
            title: head,
            message: body,
            postedBy: teacherName,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        });
        alert(`${category} updated successfully.`);
        if(titleId !== 'Daily Work') document.getElementById(titleId).value = "";
        document.getElementById(msgId).value = "";
    } catch(e) { console.log(e); }
};

/**
 * 5. LEAVE WORKFLOW
 */
function streamLeaveRequests() {
    if(!activeClass) return;

    const q = query(
        collection(db, "leaves"), 
        where("className", "==", activeClass),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snap) => {
        const box = document.getElementById("leaveList");
        if(!box) return;
        box.innerHTML = snap.empty ? "<p style='text-align:center; color:#999;'>No pending leave requests.</p>" : "";

        snap.forEach(entry => {
            const leave = entry.data();
            const accent = leave.status === "Approved" ? "#16a34a" : (leave.status === "Rejected" ? "#dc2626" : "#f59e0b");
            
            box.innerHTML += `
                <div class="card" style="border-left: 5px solid ${accent};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b>${leave.studentName}</b>
                        <small style="color:#888;">${leave.date}</small>
                    </div>
                    <p style="font-size:12px; margin:8px 0; color:#555;">Reason: ${leave.reason}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:11px;">Status: <b style="color:${accent}">${leave.status}</b></span>
                        ${leave.status === 'Pending' ? `
                            <div>
                                <button onclick="processLeave('${entry.id}', 'Approved')" style="background:#16a34a; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-size:10px; cursor:pointer;">Approve</button>
                                <button onclick="processLeave('${entry.id}', 'Rejected')" style="background:#dc2626; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-size:10px; cursor:pointer; margin-left:4px;">Reject</button>
                            </div>
                        ` : ''}
                    </div>
                </div>`;
        });
    });
}

window.processLeave = async (docId, status) => {
    try {
        await updateDoc(doc(db, "leaves", docId), { status: status });
    } catch (err) { console.log(err); }
};

/**
 * 6. FEE STATUS TRACKER (Class specific)
 */
function syncClassFees() {
    const list = document.getElementById("classFeeList");
    if(!list) return;

    // Join Users and Fees logically via queries
    const q = query(collection(db, "users"), where("className", "==", activeClass), where("role", "==", "student"));
    
    onSnapshot(q, async (snap) => {
        list.innerHTML = "";
        if(snap.empty) {
            list.innerHTML = "<p style='text-align:center; padding:20px;'>No student data available.</p>";
            return;
        }

        snap.forEach(async (uDoc) => {
            const student = uDoc.data();
            // Get latest fee status for this student
            const feeQ = query(collection(db, "fees"), where("studentUsername", "==", student.username), orderBy("updatedAt", "desc"), where("month", "==", "April 2026")); // Or dynamic month
            const feeSnap = await getDocs(feeQ);
            
            let feeStatus = "Pending";
            if(!feeSnap.empty) feeStatus = feeSnap.docs[0].data().status;

            const statusClass = (feeStatus === 'Paid') ? 'paid' : 'pending';

            list.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:12px;">
                    <span style="font-size:13px; font-weight:600;">${student.name}</span>
                    <span class="fee-tag ${statusClass}">${feeStatus.toUpperCase()}</span>
                </div>`;
        });
    });
}

/**
 * 7. ADMIN FEED SYNC (Fix)
 */
function syncAdminBroadcasts() {
    const q = query(
        collection(db, "notices"), 
        where("target", "in", ["All", "Teacher"]),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snap) => {
        const box = document.getElementById("adminNotifList");
        if(!box) return;
        box.innerHTML = snap.empty ? "<p style='text-align:center; padding:15px; color:#bbb;'>No system alerts.</p>" : "";

        snap.forEach(item => {
            const alert = item.data();
            box.innerHTML += `
                <div class="card" style="border-left: 4px solid #ef4444; background:#fff5f5;">
                    <b style="font-size:11px; color:#ef4444; text-transform:uppercase;">Admin Notice</b>
                    <h4 style="margin:4px 0; font-size:14px;">${alert.title}</h4>
                    <p style="font-size:12px; color:#444;">${alert.message}</p>
                    <div style="text-align:right;"><small style="color:#999; font-size:10px;">${alert.date}</small></div>
                </div>`;
        });
    });
}

/**
 * 8. HELPERS & PROFILE
 */
function renderCal() {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => grid.innerHTML += `<b style="font-size:10px; color:#888;">${d}</b>`);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let i = 0; i < start; i++) grid.innerHTML += `<div></div>`;
    for (let d = 1; d <= days; d++) {
        const today = (d === now.getDate()) ? "background:#f2a93b; color:#fff; border-radius:50%; font-weight:700;" : "";
        grid.innerHTML += `<div style="font-size:11px; padding:6px; text-align:center; ${today}">${d}</div>`;
    }
}

async function fetchStudentsForResults() {
    const q = query(collection(db, "users"), where("className", "==", activeClass));
    const snap = await getDocs(q);
    const drop = document.getElementById("rStudent");
    if(!drop) return;
    
    drop.innerHTML = '<option value="">Choose Student</option>';
    snap.forEach(d => drop.innerHTML += `<option value="${d.data().username}">${d.data().name}</option>`);
}

window.saveResult = async () => {
    const sId = document.getElementById("rStudent").value;
    const marks = document.getElementById("rMarks").value;
    const total = document.getElementById("rTotal").value;

    if(!sId || !marks || !total) return alert("Fill result fields!");

    try {
        await addDoc(collection(db, "results"), {
            studentUsername: sId,
            className: activeClass,
            marks: marks,
            total: total,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        });
        alert("Result Published.");
        document.getElementById("rMarks").value = "";
    } catch(e) { console.log(e); }
};

window.saveTeacherProfile = async () => {
    const docId = localStorage.getItem("tDocId");
    if(!docId) return alert("Session expired.");

    try {
        await updateDoc(doc(db, "users", docId), {
            name: document.getElementById("editName").value,
            subject: document.getElementById("editSubj").value,
            mobile: document.getElementById("editMobile").value,
            whatsapp: document.getElementById("editWhatsapp").value,
            email: document.getElementById("editEmail").value,
            dob: document.getElementById("editDob").value,
            profileImage: document.getElementById("t-edit-prev").src
        });
        alert("Success: Profile Updated.");
        document.getElementById('editProfileModal').style.display = 'none';
    } catch(err) { console.log(err); }
};

// Initial Fire
initTeacherApp();