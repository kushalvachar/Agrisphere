// controllers/qualityController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import { analyzeCropQuality } from '../services/geminiService.js';
import QualitySubmission from '../models/QualitySubmission.js';
import Offer from '../models/Offer.js';

// POST /api/quality/analyze  { imageBase64, mimeType, cropHint }
// Stateless one-off estimate — kept exactly as-is for the standalone
// "try a quality estimate" flow that isn't tied to any specific offer.
export const analyzeQuality = asyncHandler(async (req, res) => {
  const { imageBase64, mimeType, cropHint } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'imageBase64 is required' });
  }
  const result = await analyzeCropQuality(imageBase64, mimeType || 'image/jpeg', cropHint);
  res.json({ success: true, ...result });
});

// POST /api/quality/submissions  { offerId, submittedBy, submitterName, images: [{data,mimeType}], harvestDetails }
// Phase 7: Quality Requirement System. Requires a REAL offer id (rejects
// otherwise — "linked to actual transaction records" applies here too),
// runs the same real Gemini vision assessment as analyzeQuality above on
// the first image, and persists the whole submission against that offer
// so the buyer can see it without the farmer needing to resend it.
export const submitQuality = asyncHandler(async (req, res) => {
  const { offerId, submittedBy, submitterName, images, harvestDetails } = req.body;
  if (!offerId || !images?.length) {
    return res.status(400).json({ success: false, message: 'offerId and at least one image are required' });
  }

  const offer = await Offer.findById(offerId).lean();
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

  const primary = images[0];
  const aiAssessment = await analyzeCropQuality(primary.data, primary.mimeType || 'image/jpeg', offer.crop);

  const submission = await QualitySubmission.create({
    offerId,
    submittedBy: submittedBy || 'farmer',
    submitterName: submitterName || offer.farmerName,
    images: images.map((i) => i.data),
    harvestDetails,
    aiAssessment,
  });

  res.status(201).json({ success: true, submission });
});

// GET /api/quality/submissions?offerId=
export const listQualitySubmissions = asyncHandler(async (req, res) => {
  const { offerId } = req.query;
  if (!offerId) return res.status(400).json({ success: false, message: 'offerId is required' });
  const submissions = await QualitySubmission.find({ offerId })
    .select('-images') // thumbnails aren't needed for the list view — keeps this endpoint light
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, submissions });
});

// GET /api/quality/submissions/:id  — full record including images
export const getQualitySubmission = asyncHandler(async (req, res) => {
  const submission = await QualitySubmission.findById(req.params.id).lean();
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
  res.json({ success: true, submission });
});
