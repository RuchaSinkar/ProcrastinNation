const mongoose=require("mongoose");
const mongoDB= async()=>{
    try{
        await mongoose.connect("mongodb://127.0.0.1:27017/procrastinationdb");
        console.log("MongoDB connected successfully");
    }
    catch{
        console.log("MongoDB connection failed");
        process.exit(1);
    }
}
module.exports=mongoDB;