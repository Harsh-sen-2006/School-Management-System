import { db } from "./firebase.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// handle user login
const loginBtn = document.getElementById("loginBtn");
if(loginBtn) {
    loginBtn.addEventListener("click", async () => {
        const mobile = document.getElementById("loginUser").value;
        const pass = document.getElementById("loginPass").value;
        const pin = document.getElementById("loginMpin").value;
        
        const role = window.getSelectedRole(); 
        const loginType = window.getLoginMethod(); // pass or mpin

        // 1. MASTER ADMIN OVERRIDE
        // This allows you to login as Admin using specific credentials regardless of the selected role
        if (mobile === "9999999999" && pass === "ADMIN@786") {
            localStorage.setItem("username", "MasterAdmin");
            localStorage.setItem("userRole", "admin");
            alert("Welcome Master Admin!");
            window.location.href = "admin.html";
            return;
        }

        // basic validation
        if (!mobile || (loginType === 'pass' && !pass) || (loginType === 'mpin' && !pin)) {
            alert("Please enter mobile number and credentials");
            return;
        }

        try {
            // check database for existing user
            const userQuery = query(
                collection(db, "users"), 
                where("username", "==", mobile), 
                where("role", "==", role)
            );

            const snap = await getDocs(userQuery);
            
            if (snap.empty) {
                alert("User not found! Please check mobile number or role.");
                return;
            }

            let isAuth = false;
            let dbRole = role;

            snap.forEach((doc) => {
                const data = doc.data();
                // verify credentials based on method
                if (loginType === 'pass' && data.password === pass) {
                    isAuth = true;
                    dbRole = data.role; // Capture the actual role from DB
                }
                if (loginType === 'mpin' && data.mpin === pin) {
                    isAuth = true;
                    dbRole = data.role;
                }
            });

            if (isAuth) {
                localStorage.setItem("username", mobile);
                localStorage.setItem("userRole", dbRole);
                
                alert(`Login Successful as ${dbRole}!`);
                
                // Redirect based on the assigned role
                if (dbRole === "admin") {
                    window.location.href = "admin.html";
                } else if (dbRole === "teacher") {
                    window.location.href = "teacher.html";
                } else {
                    window.location.href = "student.html";
                }
            } else {
                alert("Invalid Password or PIN!");
            }
        } catch (err) {
            console.log("Login Error:", err);
        }
    });
}

// handle new registration
const regBtn = document.getElementById("regBtn");
if(regBtn) {
    regBtn.addEventListener("click", async () => {
        const userRole = window.getRegRole();
        const fullName = document.getElementById("regName").value;
        const phone = document.getElementById("regUser").value; 
        const pwd = document.getElementById("regPass").value;
        const mpinCode = document.getElementById("regMpin").value;
        const pic = window.getProfileImg();

        // mandatory checks
        if (!fullName || !phone || !pwd || !mpinCode) {
            alert("Please fill all basic details!");
            return;
        }

        if (phone.length !== 10) {
            alert("Please enter a valid 10-digit mobile number!");
            return;
        }

        const dupCheck = query(collection(db, "users"), where("username", "==", phone));
        const dupSnap = await getDocs(dupCheck);
        
        if (!dupSnap.empty) {
            alert("This mobile number is already registered!");
            return;
        }

        let newUser = {
            name: fullName,
            username: phone, 
            password: pwd,
            mpin: mpinCode,
            role: userRole,
            profileImage: pic || "",
            mobile: phone,
            created_at: Date.now()
        };

        if (userRole === 'student') {
            newUser.className = document.getElementById("regClass").value;
            newUser.rollNo = document.getElementById("regRoll")?.value || "";
            newUser.admNo = document.getElementById("regAdm").value;
            newUser.dob = document.getElementById("regDob")?.value || "";
            newUser.aadhar = document.getElementById("regAadhar")?.value || "";
            newUser.samagra = document.getElementById("regSamagra")?.value || "";
            
            newUser.bank = {
                name: document.getElementById("regBank")?.value || "",
                acc: document.getElementById("regAcc")?.value || "",
                ifsc: document.getElementById("regIfsc")?.value || ""
            };
        } else {
            const adminKey = document.getElementById("regSecret").value;
            if (adminKey !== "ADMIN123") { 
                alert("Invalid Admin Secret Key!");
                return;
            }
            newUser.subject = document.getElementById("regSubject").value;
        }

        try {
            await addDoc(collection(db, "users"), newUser);
            
            localStorage.setItem("username", phone);
            localStorage.setItem("userRole", userRole);
            
            alert("Registration Successful!");
            window.location.href = (userRole === "teacher") ? "teacher.html" : "student.html";
        } catch (error) {
            console.error("Firebase error:", error);
            alert("Registration Failed! Try again.");
        }
    });
}