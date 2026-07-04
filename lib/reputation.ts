export interface RepData {
  completed: number;
  cancelled: number;
  noShow: number;
  reviews: number[];
}

export interface RepScore {
  score: number;
  label: string;
  color: string;
  stars: number;
  reliability: number;
  total: number;
}

export function calcScore(r: RepData): RepScore {
  // Trust v2 recalibration. Labels only mean something if they're hard to
  // farm: fewer than 3 settled swaps → "New" (no label farming); ratings only
  // count once there are 3+ reviews (no phantom 5.0 default propping up
  // review-less accounts); Elite additionally requires 10+ settled swaps.
  const total = r.completed + r.cancelled + r.noShow;
  if (total < 3) {
    return { score: 0, label: "New", color: "#888", stars: 0, reliability: 0, total };
  }
  const reliability = (r.completed / total) * 100;
  const hasReviews = r.reviews.length >= 3;
  const avgRating = hasReviews
    ? r.reviews.reduce((a, b) => a + b, 0) / r.reviews.length
    : null;
  const score = Math.round(
    hasReviews ? reliability * 0.6 + avgRating! * 20 * 0.4 : reliability
  );

  let label = "Caution";
  let color = "#FF4757";
  if (score >= 90 && total >= 10) { label = "Elite"; color = "#D1AD38"; }
  else if (score >= 75) { label = "Trusted"; color = "#2ED573"; }
  else if (score >= 50) { label = "Active"; color = "#0249B5"; }

  const stars = Math.min(5, Math.max(0, Math.round(score / 20)));
  return { score, label, color, stars, reliability: Math.round(reliability), total };
}
