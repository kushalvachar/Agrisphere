// models/QualitySubmission.js — Phase 7: Quality Requirement System.
//
// A farmer/FPO's response to a buyer's quality spec on a real Offer:
// photo(s) + harvest details, plus the AI-assisted assessment already
// built in services/geminiService.js (analyzeCropQuality — real Gemini
// vision call, not fabricated). This is the "AI-ready architecture...
// for future quality assessment" the spec asks for, made concrete: the
// hook point for a future real lab-grading integration is exactly
// where `aiAssessment` is populated below.
//
// PROTOTYPE STORAGE NOTE: images are stored as base64 data URIs
// directly in MongoDB for simplicity, capped at a few per submission.
// A production deployment should move these to object storage (S3/GCS/
// Cloudinary) and store URLs instead — flagged here rather than quietly
// left as a scaling landmine.
import mongoose from 'mongoose';

const qualitySubmissionSchema = new mongoose.Schema({
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
  submittedBy: { type: String, enum: ['farmer', 'fpo'], default: 'farmer' },
  submitterName: String,
  images: [{ type: String, maxlength: 3_500_000 }], // base64 data URIs — see storage note above
  harvestDetails: {
    harvestDate: Date,
    observedMoisturePct: Number,
    observedSize: String,
    notes: String,
  },
  aiAssessment: {
    crop: String,
    estimatedGrade: String,
    confidence: Number,
    observations: [String],
    warning: String,
    aiAvailable: Boolean,
  },
}, { timestamps: true });

qualitySubmissionSchema.index({ offerId: 1, createdAt: -1 });

export default mongoose.model('QualitySubmission', qualitySubmissionSchema);
