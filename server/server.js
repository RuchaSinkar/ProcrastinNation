const express=require("express");
const mongoose=require("mongoose");
const cors=require("cors");
const connectDB=require("./db.js");
const Session=require("./models/Session.js");
require("dotenv").config();
console.log("API Key loaded?", process.env.OPENAI_API_KEY ? "Yes" : "No");

const OpenAI=require("openai");

const openai=new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

//create express app
const app=express();
const PORT=7003;

//middlewares
app.use(express.json());//get data frm backend
app.use(cors());//connect frontend to backend

connectDB();

//routes

//add
app.post("/session/add/:taskName/:duration",async (req,res)=>{
    try{
        const taskName=req.params.taskName;
        const duration=req.params.duration;
        await Session.create({
            taskName:taskName,
            duration:duration
        });
        res.status(200).send("Session saved");
    }
    catch(error){
        console.error("Error creating session:", error);
        res.status(500).send("Failed to create session");
    }
})

//list all sessions
app.get("/session/list", async (req, res) => {
    try {
        const sessions = await Session.find().sort({ date: -1 }); // newest first
        res.json(sessions);
    } catch (error) {
        res.status(500).send("Failed to fetch sessions");
    }
});


//clear
app.delete("/session/clear",async(req,res)=>{
    try{
        await Session.deleteMany({});
        res.status(200).send("All sessions cleared successfully");
    }catch(error){
        res.status(500).send("Failed to clear");
    }
})

//delete one session
app.delete("/session/delete/:taskName", async (req, res) => {
    try {
        const result = await Session.deleteOne({ taskName: req.params.taskName });

        if (result.deletedCount > 0) {
            res.status(200).send("Session deleted successfully");
        } else {
            res.status(404).send("No session found with that task name");
        }
    } catch (error) {
        res.status(500).send("Failed to delete session");
    }
});

app.post("/session/roast/:taskName/:duration",async(req,res)=>{
    try{
        const {taskName,duration}=req.params;
        const prompt=`Give me a short, funny, savage roast for someone who procrastinated on ${taskName} for ${duration} minutes.`;
        const completion=await openai.chat.completions.create({
            model:'gpt-4o-mini',
            messages:[
                {role: "system",content:"You are a witty roast generator."},
                {role:"user",content:prompt}
            ],
            max_tokens:50,
        });
        const roast=completion.choices[0].message.content.trim();
        res.send(roast);
    
    }
    catch(error){
        console.error("Error generating roast: ",error);
        res.status(500).send("Failed to generate roast");
    }
})

app.get("/session/stats", async (req, res) => {
    try {
        const sessions = await Session.find().sort({ date: 1 }); // oldest first

        if (!sessions.length) {
            return res.json({
                totalFocusToday: 0,
                currentStreak: 0,
                longestStreak: 0,
                badges: []
            });
        }

        // Convert duration (MM:SS) to minutes
        const parseDuration = (dur) => {
            if (typeof dur === 'string' && dur.includes(":")) {
                const [m, s] = dur.split(":").map(Number);
                return m + s / 60;
            }
            return Number(dur);
        };

        // Group by date
        const focusByDate = {};
        sessions.forEach(s => {
            const dateKey = s.date.toISOString().split("T")[0];
            const durMin = parseDuration(s.duration);
            focusByDate[dateKey] = (focusByDate[dateKey] || 0) + durMin;
        });

        const todayKey = new Date().toISOString().split("T")[0];
        const totalFocusToday = focusByDate[todayKey] || 0;

        // Calculate streaks
        const allDates = Object.keys(focusByDate).sort().reverse();
        const dateOnly = (d) => new Date(d + "T00:00:00Z");

        let longestStreak = 0;
        let tempStreak = 0;

        allDates.forEach((dateStr, i) => {
            if (i === 0) {
                tempStreak = 1;
            } else {
                const prev = dateOnly(allDates[i - 1]);
                const curr = dateOnly(dateStr);
                const diff = (prev - curr) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    tempStreak++;
                } else {
                    longestStreak = Math.max(longestStreak, tempStreak);
                    tempStreak = 1;
                }
            }
        });

        longestStreak = Math.max(longestStreak, tempStreak);

        // Calculate current streak
        const today = dateOnly(todayKey);
        let currentStreak = 0;
        let expectedDate = today;
        for (const d of allDates) {
            const dDate = dateOnly(d);
            const diff = (expectedDate - dDate) / (1000 * 60 * 60 * 24);
            if (diff === 0) {
                currentStreak++;
                expectedDate = new Date(expectedDate - 24 * 60 * 60 * 1000);
            } else {
                break;
            }
        }

        // Badges
        const badges = [];
        if (totalFocusToday >= 60) badges.push("First Hour Completed");
        if (currentStreak >= 3) badges.push("3-Day Focus Streak");
        if (currentStreak >= 7) badges.push("Weekly Warrior");
        if (longestStreak >= 14) badges.push("Consistency King");

        // Send JSON instead of plain text
        res.json({
            totalFocusToday: Math.round(totalFocusToday),
            currentStreak,
            longestStreak,
            badges
        });

    } catch (error) {
        console.error("Error generating stats:", error);
        res.status(500).send("Failed to fetch stats");
    }
});

app.listen(PORT,()=>{
    console.log(`Started at http://localhost:${PORT}`);
})
