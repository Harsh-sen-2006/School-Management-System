/**
 * Project: Kiddy's Corner
 * Module: Admin Master Controller
 */

import { db } from "./firebase.js";
import { 
    collection, addDoc, getDocs, doc, deleteDoc, 
    onSnapshot, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. BROADCAST SYSTEM ---
window.sendNotice = async () => {
    const head = document.getElementById("notTitle").value.trim();
    const body = document.getElementById("notMsg").value.trim();
    const target = document.getElementById("notTarget").value;

    if (!head || !body) return alert("Notice details are missing!");

    try {
        await addDoc(collection(db, "notices"), {
            category: "Notice",
            title: head,
            message: body,
            target: target,
            postedBy: "Admin",
            timestamp: Date.now(),
            date: new Date().toLocaleDateString()
        });
        alert("Broadcast sent successfully!");
        document.getElementById("notTitle").value = "";
        document.getElementById("notMsg").value = "";
    } catch(e) { console.error(e); }
};

// --- 2. STUDY MATERIAL SYSTEM ---
window.uploadMaterial = async () => {
    const title = document.getElementById("matTitle").value.trim();
    const link = document.getElementById("matLink").value.trim();
    const cls = document.getElementById("matClass").value;

    if(!title || !link) return alert("Material info missing!");

    try {
        await addDoc(collection(db, "study_material"), {
            title,
            link,
            className: cls,
            postedBy: "Admin",
            timestamp: Date.now()
        });
        alert("Study material added!");
        document.getElementById("matTitle").value = "";
        document.getElementById("matLink").value = "";
    } catch(e) { console.log(e); }
};

// --- 3. FEE UPDATE SYSTEM ---
window.updateFee = async () => {
    const sId = document.getElementById("feeStudent").value;
    const month = document.getElementById("feeMonth").value.trim();
    const status = document.getElementById("feeStatus").value;

    if(!sId || !month) return alert("Select student and month!");

    try {
        await addDoc(collection(db, "fees"), {
            studentUsername: sId,
            month: month,
            status: status,
            updatedAt: Date.now()
        });
        alert(`Fee status for ${sId} updated.`);
    } catch(e) { console.log(e); }
};

// --- 4. USER DIRECTORY ---
window.addUser = async () => {
    const mobile = document.getElementById("uMobile").value.trim();
    const pass = document.getElementById("uPass").value.trim();
    const role = document.getElementById("uRole").value;
    const cls = document.getElementById("uClass").value.trim();

    if(!mobile || !pass) return alert("Fields are empty!");

    try {
        await addDoc(collection(db, "users"), {
            username: mobile,
            password: pass,
            role: role,
            className: cls,
            createdAt: Date.now()
        });
        alert(`${role.toUpperCase()} account created.`);
        document.getElementById("uMobile").value = "";
        document.getElementById("uPass").value = "";
    } catch(e) { console.log(e); }
};

// --- 5. INITIALIZERS ---
function syncTeacherList() {
    const box = document.getElementById("teacherList");
    const q = query(collection(db, "users"), where("role", "==", "teacher"));
    
    onSnapshot(q, (snap) => {
        box.innerHTML = snap.empty ? "<p style='font-size:11px; color:#999;'>No teachers found.</p>" : "";
        snap.forEach(tDoc => {
            const t = tDoc.data();
            box.innerHTML += `
                <div class="list-item">
                    <span>${t.username}</span>
                    <button onclick="removeUser('${tDoc.id}')" style="border:none; background:none; color:red; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>`;
        });
    });
}

function loadStudentsForFees() {
    const drop = document.getElementById("feeStudent");
    const q = query(collection(db, "users"), where("role", "==", "student"));
    
    onSnapshot(q, (snap) => {
        drop.innerHTML = '<option value="">Select Student...</option>';
        snap.forEach(sDoc => {
            const s = sDoc.data();
            drop.innerHTML += `<option value="${s.username}">${s.username} (${s.className})</option>`;
        });
    });
}

// Global Delete for Directory
window.removeUser = async (id) => {
    if(confirm("Remove this user?")) {
        try { await deleteDoc(doc(db, "users", id)); } catch(e) { alert("Failed"); }
    }
}

// Fire!
syncTeacherList();
loadStudentsForFees();