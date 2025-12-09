import mongoose from "mongoose";

const familySchema = new mongoose.Schema(
  {
    location: String,
    status: String,
    type: String,
    fatherName: String,
    fatherOccupation: String,
    motherOccupation: String,
    brothers: String,
    sisters: String,
    about: String,
  },
  { _id: false } // ✅ prevents creating an _id for the subdocument
);

const userSchema = new mongoose.Schema({
  profileFor: {
    type: String,
    enum: ["Self", "Son", "Daughter", "Brother", "Sister", "Friend", "Other"],
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },

  dob: {
    day: String,
    month: String,
    year: String,
  },

  height: {
    ft: String,
    inch: String,
  },
  family: familySchema,

  religion: { type: String, default: "Muslim" },
  sect: String,
  caste: String,
  maslak: String,

  state: String,
  city: String,
  about: String,
  maritalStatus: String,
  mobile: String,
  whatsapp: String,
  motherTongue: String,
  institute: String,
  qualification: String,
  workSector: String,
  profession: String,
  income: String,

  profilePic: {
    url: String,
    isHidden: { type: Boolean, default: false }, // hide/show control
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  images: [String],
  religiousDetail: [String],
  interest: [String],

  subscription: {
    plan: {
      type: String,
      enum: ["Free", "Monthly", "Quarterly", "Yearly"],
      default: "Free",
    },
    expiry: Date,
  },

  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
