import mongoose , {Schema}  from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
const VideoSchema = new Schema({
    videofile :{
       type : String,
       required : true
    },
    videoPublicId: {
        type: String,
    },
    thumbnail :{
        type : String,
        required : true
    },
    thumbnailPublicId: {
        type: String,
    },
    owner :{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    title :{
        type : String,
        required : true
    },
    description :{
        type: String,

    },
    maker: {
        type: String,
        default: "",
        maxlength: 80
    },
    place: {
        type: String,
        default: "",
        maxlength: 80
    },
    year: {
        type: Number,
        default: null
    },
    rights: {
        type: String,
        default: "",
        maxlength: 160
    },
    duration :{
        type : Number,
        required: true
    },
    width: {
        type: Number,
        default: null
    },
    height: {
        type: Number,
        default: null
    },
    codec: {
        type: String,
        default: ""
    },
    captions: {
        type: String,
        default: ""
    },
    captionsPublicId: {
        type: String,
        default: ""
    },
    views :{
        type : Number,
         required : true,
         default:0
    },
    isPublish:{
        type : Boolean,
        default : true
    },
   
},{timestamps:true})
VideoSchema.index({ title: "text", description: "text", place: "text", maker: "text" })
VideoSchema.plugin(mongooseAggregatePaginate)



export const Video = mongoose.model("Video", VideoSchema)