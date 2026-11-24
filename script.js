
// STUDENT FEEDBACK MANAGEMENT SYSTEM
// FRONTEND CONNECTED TO NODE.JS + MONGODB

const API_BASE = "http://localhost:5000/api";

let loggedIn = false;
let currentStudentId = "";
let currentRole = "";
let currentStaffFaculty = "";
let authToken = "";

// API REQUEST FUNCTION

async function apiRequest(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (authToken) {
        headers.Authorization = "Bearer " + authToken;
    }

    let response;

    try {
        response = await fetch(API_BASE + path, {
            ...options,
            headers
        });
    } catch (error) {
        console.error("Backend connection error:", error);
        throw new Error(
            "Cannot connect to backend. Check that server.js is running on port 5000."
        );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || `Server error: ${response.status}`
        );
    }

    return data;
}

// UPDATE LOGIN LABELS

function updateLoginLabels() {
    const role = document.getElementById("loginRole").value.toLowerCase();

    document.getElementById("loginHeading").textContent =
        role === "student" ? "Student Login" :
        role === "staff" ? "Staff Login" :
        "Admin Login";

    document.getElementById("userLabel").textContent =
        role === "student" ? "Student ID / Roll Number" : "Username";

    document.getElementById("studentId").placeholder =
        role === "student" ? "Enter Student ID" : "Enter Username";
}

// HIDE ALL PAGES

function hideAll() {
    const pages = [
        "loginPage",
        "dashboardPage",
        "feedbackPage",
        "successPage",
        "statusPage",
        "staffPage",
        "adminPage"
    ];

    pages.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add("hidden");
    });
}

// LOGIN

async function login() {
    const role = document.getElementById("loginRole").value.trim().toLowerCase();
    const id = document.getElementById("studentId").value.trim();
    const password = document.getElementById("password").value;

    if (!id || !password) {
        alert("Please enter username/ID and password.");
        return;
    }

    try {
        const result = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                role,
                username: id,
                password
            })
        });

        if (!result.token || !result.user) {
            throw new Error("Invalid login response from backend.");
        }

        authToken = result.token;
        currentRole = result.user.role;
        currentStudentId = result.user.studentId || "";
        currentStaffFaculty = result.user.faculty || "";
        loggedIn = true;

        if (currentRole === "student") {
            document.getElementById("dId").textContent = currentStudentId;

            hideAll();
            document.getElementById("dashboardPage").classList.remove("hidden");

            await updateDashboard();
        } else if (currentRole === "staff") {
            hideAll();
            document.getElementById("staffPage").classList.remove("hidden");

            document.getElementById("staffWelcome").textContent =
                "Welcome, " + currentStaffFaculty;

            document.getElementById("staffName").textContent =
                currentStaffFaculty;

            document.getElementById("staffAssignedFaculty").textContent =
                currentStaffFaculty;

            await renderStaffFeedback();
        } else if (currentRole === "admin") {
            hideAll();
            document.getElementById("adminPage").classList.remove("hidden");

            await updateAdminDashboard();
        } else {
            throw new Error("Unknown user role.");
        }

        document.getElementById("logoutBtn").classList.remove("hidden");
        document.getElementById("password").value = "";

    } catch (error) {
        console.error("Login error:", error);
        alert(error.message);
    }
}

// STUDENT DASHBOARD

async function updateDashboard() {
    try {
        const mine = await apiRequest("/feedback/mine");

        document.getElementById("submittedCount").textContent =
            String(mine.length).padStart(2, "0");

        document.getElementById("pendingCount").textContent =
            Math.max(0, 6 - mine.length);

    } catch (error) {
        alert(error.message);
    }
}

// OPEN FEEDBACK PAGE

function openFeedback() {
    if (!loggedIn || currentRole !== "student") return;

    hideAll();
    document.getElementById("feedbackPage").classList.remove("hidden");
}

// SUBMIT FEEDBACK

async function submitFeedback() {
    if (!loggedIn || currentRole !== "student") {
        alert("Please login as a student.");
        return;
    }

    const course = document.getElementById("course").value;
    const faculty = document.getElementById("faculty").value;
    const rating = document.querySelector('input[name="rating"]:checked');
    const contentRating = document.getElementById("contentRating").value;
    const teachingRating = document.getElementById("teachingRating").value;
    const comments = document.getElementById("comments").value.trim();

    if (!course || !faculty || !rating ||
        !contentRating || !teachingRating || !comments) {
        alert("Please complete all feedback fields.");
        return;
    }

    try {
        await apiRequest("/feedback", {
            method: "POST",
            body: JSON.stringify({
                course,
                faculty,
                rating: Number(rating.value),
                contentRating,
                teachingRating,
                comments
            })
        });

        alert("Feedback submitted successfully!");

        await updateDashboard();

        document.querySelectorAll('input[name="rating"]')
            .forEach(el => el.checked = false);

        document.getElementById("course").value = "";
        document.getElementById("faculty").value = "";
        document.getElementById("contentRating").value = "";
        document.getElementById("teachingRating").value = "";
        document.getElementById("comments").value = "";

        hideAll();
        document.getElementById("successPage").classList.remove("hidden");

    } catch (error) {
        alert(error.message);
    }
}

// STUDENT FEEDBACK STATUS

async function openStatus() {
    if (!loggedIn || currentRole !== "student") return;

    hideAll();
    await updateStatus();
    document.getElementById("statusPage").classList.remove("hidden");
}

async function updateStatus() {
    try {
        const mine = await apiRequest("/feedback/mine");
        const f = mine[mine.length - 1];
        const badge = document.getElementById("badge");

        if (!f) {
            badge.textContent = "NO FEEDBACK SUBMITTED";

            [
                "sId", "sCourse", "sFaculty", "sRating",
                "sContent", "sTeaching", "sComments", "sDate"
            ].forEach(id => {
                document.getElementById(id).textContent = "---";
            });

            return;
        }

        badge.textContent = "✓ FEEDBACK SUBMITTED";

        document.getElementById("sId").textContent = currentStudentId;
        document.getElementById("sCourse").textContent = f.course;
        document.getElementById("sFaculty").textContent = f.faculty;
        document.getElementById("sRating").textContent = f.rating + "/5";
        document.getElementById("sContent").textContent = f.contentRating;
        document.getElementById("sTeaching").textContent = f.teachingRating;
        document.getElementById("sComments").textContent = f.comments;
        document.getElementById("sDate").textContent = f.date || "---";

    } catch (error) {
        alert(error.message);
    }
}

// BACK TO DASHBOARD

function backDashboard() {
    if (!loggedIn || currentRole !== "student") return;

    hideAll();
    document.getElementById("dashboardPage").classList.remove("hidden");
    updateDashboard();
}

// SAFE HTML

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

// FEEDBACK TABLE

function fillFeedbackTable(targetId, records) {
    const target = document.getElementById(targetId);

    if (!target) return;

    if (!records.length) {
        target.innerHTML =
            '<tr><td colspan="7">No feedback has been submitted yet.</td></tr>';
        return;
    }

    target.innerHTML = records.slice().reverse().map(f => `
        <tr>
            <td>${safe(f.course)}</td>
            <td>${safe(f.faculty)}</td>
            <td>${"★".repeat(Math.max(0, Math.min(5, Number(f.rating))))} (${safe(f.rating)}/5)</td>
            <td>${safe(f.contentRating)}</td>
            <td>${safe(f.teachingRating)}</td>
            <td>${safe(f.comments)}</td>
            <td>${safe(f.date)}</td>
        </tr>
    `).join("");
}

// STAFF DASHBOARD

async function renderStaffFeedback() {
    if (currentRole !== "staff" || !currentStaffFaculty) return;

    try {
        const records = await apiRequest("/feedback/staff");
        const courseSelect = document.getElementById("staffCourseFilter");

        const oldCourse = courseSelect.value;

        const courses = [
            ...new Set(records.map(f => f.course).filter(Boolean))
        ].sort();

        courseSelect.innerHTML =
            '<option value="">All Your Courses</option>' +
            courses.map(course => `
                <option value="${safe(course)}">${safe(course)}</option>
            `).join("");

        courseSelect.value = courses.includes(oldCourse) ? oldCourse : "";

        const filtered = records.filter(f =>
            !courseSelect.value || f.course === courseSelect.value
        );

        const uniqueStudents = new Set(
            records.map(f => f.studentId).filter(Boolean)
        );

        document.getElementById("staffTotal").textContent = records.length;
        document.getElementById("staffStudents").textContent = uniqueStudents.size;
        document.getElementById("staffCourses").textContent = courses.length;

        document.getElementById("staffAverage").textContent =
            records.length
                ? (records.reduce((sum, f) => sum + Number(f.rating || 0), 0)
                    / records.length).toFixed(1) + "/5"
                : "—";

        fillFeedbackTable("staffFeedbackRows", filtered);

    } catch (error) {
        alert(error.message);
    }
}

// ADMIN DASHBOARD

async function updateAdminDashboard() {
    try {
        const records = await apiRequest("/feedback");

        document.getElementById("adminTotal").textContent = records.length;
        document.getElementById("adminCourses").textContent =
            new Set(records.map(f => f.course)).size;
        document.getElementById("adminFaculty").textContent =
            new Set(records.map(f => f.faculty)).size;

        document.getElementById("adminAverage").textContent =
            records.length
                ? (records.reduce((sum, f) => sum + Number(f.rating || 0), 0)
                    / records.length).toFixed(1) + "/5"
                : "—";

    } catch (error) {
        alert(error.message);
    }
}

// ADMIN VIEW ALL FEEDBACK

async function showAdminFeedback() {
    if (currentRole !== "admin") return;

    try {
        const records = await apiRequest("/feedback");
        fillFeedbackTable("adminFeedbackRows", records);

        document.getElementById("adminFeedbackArea")
            .classList.remove("hidden");

    } catch (error) {
        alert(error.message);
    }
}

// LOGOUT

function logout() {
    loggedIn = false;
    currentStudentId = "";
    currentRole = "";
    currentStaffFaculty = "";
    authToken = "";

    hideAll();

    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("studentId").value = "";
    document.getElementById("password").value = "";
    document.getElementById("logoutBtn").classList.add("hidden");
    document.getElementById("adminFeedbackArea").classList.add("hidden");
}

// INITIAL PAGE SETUP

window.onload = function() {
    updateLoginLabels();
    hideAll();
    document.getElementById("loginPage").classList.remove("hidden");
};
