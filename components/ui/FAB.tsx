"use client";

import Icon from "./Icon";

export default function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Post a swap"
      style={{ position: "fixed", bottom: 76, right: 20, zIndex: 199, width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#D1AD38,#D1AD38dd)", color: "#010028", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(209,173,56,.4)" }}
    >
      <Icon n="plus" s={24} c="#010028" />
    </button>
  );
}
