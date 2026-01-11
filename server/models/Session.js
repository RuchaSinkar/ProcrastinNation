const mongoose=require("mongoose");

const modelSchema=new mongoose.Schema({
    taskName:{
        type:String,
        required:true
    },
    duration:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports=mongoose.model("Session",modelSchema);