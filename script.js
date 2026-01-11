const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");
const focusTime = document.getElementById("focusTime");
const roastMessage = document.getElementById("roastMessage");
const taskInput = document.getElementById("taskInput");
let isReEnteringFullscreen = false;

let timer = null;
let seconds = 0;

const roasts = [
  "A tortoise just lapped you!",
  "Stop scrolling memes and focus!",
  "Even your coffee is bored...",
  "Instagram won't pay your bills!"
];

document.querySelector(".status-panel").addEventListener("submit", (e) => {
  e.preventDefault();
});

taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    startBtn.click();
  }
});

function formatTime(totalSeconds) {
  let mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  let secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

async function showRandomRoast() {
  const taskName = taskInput.value.trim() || "task";
  const duration = Math.floor(seconds / 60) || 1;

  try {
    const res = await fetch(
      `http://localhost:7003/session/roast/${encodeURIComponent(taskName)}/${duration}`,
      { method: "POST" }
    );

    if (res.ok) {
      const text = await res.text();
      roastMessage.innerText = text;
    } else {
      const index = Math.floor(Math.random() * roasts.length);
      roastMessage.innerText = roasts[index];
    }
  } catch (err) {
    console.error("Error fetching AI roast:", err);
    const index = Math.floor(Math.random() * roasts.length);
    roastMessage.innerText = roasts[index];
  }
}


startBtn.addEventListener("click", () => {
  if (!taskInput.value.trim()) {
    alert("Please enter a task first!");
    return;
  }
  // Request fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    }

  seconds = 0;
  statusText.innerText = "Focused";
  stopBtn.classList.remove("hidden");
  startBtn.classList.add("hidden");

  timer = setInterval(() => {
    seconds++;
    focusTime.innerText = formatTime(seconds);

    if (seconds % 30 === 0 && seconds !== 0) {
      showRandomRoast();
    }
  }, 1000);
});

stopBtn.addEventListener("click", async () => {
  // Exit fullscreen if active
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }

  clearInterval(timer);
  statusText.innerText = "Stopped";
  stopBtn.classList.add("hidden");
  startBtn.classList.remove("hidden");

  const taskName = taskInput.value.trim();
  const duration = formatTime(seconds);

  if (!taskName) {
    alert("Please enter a task name before starting.");
    return;
  }

  alert(`Task "${taskName}" completed in ${formatTime(seconds)}!`);

  try {
    const res = await fetch(
      `http://localhost:7003/session/add/${encodeURIComponent(taskName)}/${duration}`, 
      { method: "POST" }
    );
    if (res.ok) {
      console.log("Backend:", await res.text());
      fetchSessionHistory();
      fetchStats();
    } else {
      console.error("Failed to save session");
    }
  } catch (err) {
    console.error("Error saving session:", err);
  }
});

async function fetchSessionHistory() {
  try {
    const res = await fetch("http://localhost:7003/session/list");
    const sessions = await res.json();

    const sessionOutput = document.getElementById("sessionOutput");

    if (sessions.length === 0) {
      sessionOutput.innerHTML = "<p>No past sessions yet.</p>";
      return;
    }

    let tableHTML = `
    <table class="session-table">
        <thead>
        <tr>
            <th>Task</th>
            <th>Duration</th>
            <th>Date</th>
        </tr>
        </thead>
        <tbody>
    `;


    sessions.forEach(s => {
      tableHTML += `
        <tr>
          <td>${s.taskName}</td>
          <td>${s.duration}</td>
          <td>${new Date(s.date).toLocaleString()}</td>
        </tr>
      `;
    });

    tableHTML += "</tbody></table>";
    sessionOutput.innerHTML = tableHTML;

  } catch (err) {
    console.error("Error fetching session history:", err);
  }
}


const base = "http://localhost:7003";
const viewBtn = document.getElementById("viewSessionsBtn");
const deleteBtn = document.getElementById("deleteSessionBtn");
const clearBtn = document.getElementById("clearSessionsBtn");
const deleteTaskInput = document.getElementById("deleteTaskInput");
const sessionOutput = document.getElementById("sessionOutput");

// View all sessions
viewBtn.addEventListener("click", async () => {
  fetchSessionHistory();
});

// Delete a specific session
deleteBtn.addEventListener("click", async () => {
  const taskName = deleteTaskInput.value.trim();
  if (!taskName) {
    alert("Please enter a task name to delete");
    return;
  }

  await fetch(`${base}/session/delete/${taskName}`, { method: "DELETE" });
  fetchSessionHistory();
});

// Clear all sessions
clearBtn.addEventListener("click", async () => {
  await fetch(`${base}/session/clear`, { method: "DELETE" });
  fetchSessionHistory();
});

// When window loses focus
window.addEventListener("blur", () => {
  if (statusText.innerText === "Focused") {
    setTimeout(() => {
      const stay = confirm("You left focus mode! Stay focused?");
      if (stay) {
        isReEnteringFullscreen = true; // flag to prevent duplicate confirm
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } else {
        clearInterval(timer);
        statusText.innerText = "Stopped";
        stopBtn.classList.add("hidden");
        startBtn.classList.remove("hidden");
      }
    }, 100);
  }
});

document.addEventListener("fullscreenchange", () => {
  if (isReEnteringFullscreen) {
    // Reset the flag so future fullscreen exits will work
    isReEnteringFullscreen = false;
    return; // Skip this confirm since it's from a blur recovery
  }

  if (!document.fullscreenElement && statusText.innerText === "Focused") {
    setTimeout(() => {
      const stay = confirm("You exited fullscreen! Do you want to stay focused?");
      if (stay) {
        isReEnteringFullscreen = true;
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } else {
        clearInterval(timer);
        statusText.innerText = "Stopped";
        stopBtn.classList.add("hidden");
        startBtn.classList.remove("hidden");
      }
    }, 100);
  }
});

async function fetchStats() {
    try {
        const res = await fetch(`${base}/session/stats`);
        const stats = await res.json();

        // Format total focus today
        const hours = Math.floor(stats.totalFocusToday / 60);
        const minutes = stats.totalFocusToday % 60;
        const formattedFocus = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        document.getElementById("todayFocus").innerText = formattedFocus;
        document.getElementById("currentStreak").innerText = `${stats.currentStreak} days`;
        document.getElementById("longestStreak").innerText = `${stats.longestStreak} days`;

        // Badges
        const badgeContainer = document.getElementById("badgesList");
        badgeContainer.innerHTML = "";
        if (stats.badges.length) {
            stats.badges.forEach(badge => {
                const badgeEl = document.createElement("div");
                badgeEl.className = "badge";
                badgeEl.innerText = badge;
                badgeContainer.appendChild(badgeEl);
            });
        } else {
            badgeContainer.innerHTML = "<p style='color:#bbb;'>No badges yet.</p>";
        }
    } catch (err) {
        console.error("Error fetching stats:", err);
    }
}

fetchStats();