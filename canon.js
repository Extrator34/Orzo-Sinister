import mongoose from "mongoose";

const canonSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  order: { type: Number, required: true },
  assignedTo: { type: String, default: null }
});

export default mongoose.model("Canon", canonSchema);

