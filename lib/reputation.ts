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
  const total = r.completed + r.cancelled + r.noShow;
  if (total === 0) {
    return { score: 0, label: "New", color: "#888", stars: 0, reliability: 0, total: 0 };
  }
  const reliability = (r.completed / total) * 100;
  const avgRating =
    r.reviews.length > 0
      ? r.reviews.reduce((a, b) => a + b, 0) / r.reviews.length
      : 5;
  const score = Math.round(reliability * 0.6 + avgRating * 20 * 0.4);

  let label = "Caution";
  let color = "#FF4757";
  if (score >= 90) { label = "Elite"; color = "#D1AD38"; }
  else if (score >= 75) { label = "Trusted"; color = "#2ED573"; }
  else if (score >= 50) { label = "Active"; color = "#0249B5"; }

  const stars = Math.min(5, Math.max(0, Math.round(score / 20)));
  return { score, label, color, stars, reliability: Math.round(reliability), total };
}
