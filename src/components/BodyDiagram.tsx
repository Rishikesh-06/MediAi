import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const bodyPartsMap: Record<string, { label: string; category: string }> = {
  head: { label: "Head & Face", category: "Head" },
  neck: { label: "Neck & Throat", category: "Head" },
  "left-shoulder": { label: "Left Shoulder", category: "Arms" },
  "right-shoulder": { label: "Right Shoulder", category: "Arms" },
  chest: { label: "Chest & Heart", category: "Chest" },
  abdomen: { label: "Stomach & Abdomen", category: "Abdomen" },
  "left-upper-arm": { label: "Left Upper Arm", category: "Arms" },
  "right-upper-arm": { label: "Right Upper Arm", category: "Arms" },
  "left-forearm": { label: "Left Forearm", category: "Arms" },
  "right-forearm": { label: "Right Forearm", category: "Arms" },
  "left-hand": { label: "Left Hand", category: "Arms" },
  "right-hand": { label: "Right Hand", category: "Arms" },
  pelvis: { label: "Hips & Pelvis", category: "Abdomen" },
  "left-thigh": { label: "Left Thigh", category: "Legs" },
  "right-thigh": { label: "Right Thigh", category: "Legs" },
  "left-knee": { label: "Left Knee", category: "Legs" },
  "right-knee": { label: "Right Knee", category: "Legs" },
  "left-shin": { label: "Left Shin", category: "Legs" },
  "right-shin": { label: "Right Shin", category: "Legs" },
  "left-foot": { label: "Left Foot", category: "Legs" },
  "right-foot": { label: "Right Foot", category: "Legs" },
};

const backPartsMap: Record<string, { label: string; category: string }> = {
  "head-back": { label: "Back of Head", category: "Head" },
  "neck-back": { label: "Neck (Back)", category: "Head" },
  "upper-back": { label: "Upper Back", category: "Back" },
  "lower-back": { label: "Lower Back", category: "Back" },
  buttocks: { label: "Buttocks", category: "Back" },
  "left-calf": { label: "Left Calf", category: "Legs" },
  "right-calf": { label: "Right Calf", category: "Legs" },
  "left-heel": { label: "Left Heel", category: "Legs" },
  "right-heel": { label: "Right Heel", category: "Legs" },
};

const symptomSuggestions: Record<string, string[]> = {
  Head: ["Headache", "Dizziness", "Blurred Vision", "Ear Pain"],
  Chest: ["Chest Pain", "Breathlessness", "Palpitations", "Cough"],
  Abdomen: ["Abdominal Pain", "Nausea", "Vomiting", "Diarrhea"],
  Arms: ["Joint Pain", "Numbness", "Swelling"],
  Legs: ["Joint Pain", "Numbness", "Swelling", "Cramps"],
  Back: ["Back Pain", "Stiffness"],
};

interface BodyDiagramProps {
  selectedParts: string[];
  onTogglePart: (partId: string, label: string, category: string) => void;
  onSuggestSymptom?: (symptom: string) => void;
}

const BodyPart = ({
  id, selected, onSelect, children,
}: {
  id: string; selected: boolean; onSelect: () => void; children: React.ReactNode;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <g
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer", transition: "all 0.2s" }}
    >
      <g
        style={{
          filter: selected ? "drop-shadow(0 0 8px hsl(152, 100%, 45%))" : "none",
          transform: hovered && !selected ? "scale(1.03)" : "scale(1)",
          transformOrigin: "center",
        }}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child as React.ReactElement<any>, {
            fill: selected ? "hsl(152, 100%, 45%)" : hovered ? "hsl(152, 40%, 22%)" : "hsl(152, 40%, 15%)",
            stroke: selected ? "hsl(152, 100%, 55%)" : "hsl(152, 100%, 45%)",
            strokeWidth: selected ? 2.5 : 1.5,
            opacity: selected ? 1 : hovered ? 1 : 0.8,
          });
        })}
      </g>
    </g>
  );
};

import React from "react";

const FrontBody = ({ selectedParts, onSelect }: { selectedParts: string[]; onSelect: (id: string) => void }) => (
  <svg viewBox="0 0 200 430" width="200" height="430" className="mx-auto">
    {/* Head */}
    <BodyPart id="head" selected={selectedParts.includes("head")} onSelect={() => onSelect("head")}>
      <ellipse cx="100" cy="45" rx="35" ry="40" />
    </BodyPart>
    {/* Neck */}
    <BodyPart id="neck" selected={selectedParts.includes("neck")} onSelect={() => onSelect("neck")}>
      <rect x="88" y="83" width="24" height="20" rx="4" />
    </BodyPart>
    {/* Shoulders */}
    <BodyPart id="left-shoulder" selected={selectedParts.includes("left-shoulder")} onSelect={() => onSelect("left-shoulder")}>
      <ellipse cx="52" cy="115" rx="22" ry="15" />
    </BodyPart>
    <BodyPart id="right-shoulder" selected={selectedParts.includes("right-shoulder")} onSelect={() => onSelect("right-shoulder")}>
      <ellipse cx="148" cy="115" rx="22" ry="15" />
    </BodyPart>
    {/* Chest */}
    <BodyPart id="chest" selected={selectedParts.includes("chest")} onSelect={() => onSelect("chest")}>
      <rect x="65" y="103" width="70" height="55" rx="8" />
    </BodyPart>
    {/* Abdomen */}
    <BodyPart id="abdomen" selected={selectedParts.includes("abdomen")} onSelect={() => onSelect("abdomen")}>
      <rect x="65" y="158" width="70" height="50" rx="6" />
    </BodyPart>
    {/* Arms */}
    <BodyPart id="left-upper-arm" selected={selectedParts.includes("left-upper-arm")} onSelect={() => onSelect("left-upper-arm")}>
      <rect x="30" y="110" width="22" height="55" rx="10" />
    </BodyPart>
    <BodyPart id="right-upper-arm" selected={selectedParts.includes("right-upper-arm")} onSelect={() => onSelect("right-upper-arm")}>
      <rect x="148" y="110" width="22" height="55" rx="10" />
    </BodyPart>
    <BodyPart id="left-forearm" selected={selectedParts.includes("left-forearm")} onSelect={() => onSelect("left-forearm")}>
      <rect x="25" y="168" width="20" height="50" rx="10" />
    </BodyPart>
    <BodyPart id="right-forearm" selected={selectedParts.includes("right-forearm")} onSelect={() => onSelect("right-forearm")}>
      <rect x="155" y="168" width="20" height="50" rx="10" />
    </BodyPart>
    {/* Hands */}
    <BodyPart id="left-hand" selected={selectedParts.includes("left-hand")} onSelect={() => onSelect("left-hand")}>
      <ellipse cx="35" cy="228" rx="14" ry="12" />
    </BodyPart>
    <BodyPart id="right-hand" selected={selectedParts.includes("right-hand")} onSelect={() => onSelect("right-hand")}>
      <ellipse cx="165" cy="228" rx="14" ry="12" />
    </BodyPart>
    {/* Pelvis */}
    <BodyPart id="pelvis" selected={selectedParts.includes("pelvis")} onSelect={() => onSelect("pelvis")}>
      <rect x="58" y="208" width="84" height="35" rx="8" />
    </BodyPart>
    {/* Thighs */}
    <BodyPart id="left-thigh" selected={selectedParts.includes("left-thigh")} onSelect={() => onSelect("left-thigh")}>
      <rect x="63" y="243" width="32" height="70" rx="10" />
    </BodyPart>
    <BodyPart id="right-thigh" selected={selectedParts.includes("right-thigh")} onSelect={() => onSelect("right-thigh")}>
      <rect x="105" y="243" width="32" height="70" rx="10" />
    </BodyPart>
    {/* Knees */}
    <BodyPart id="left-knee" selected={selectedParts.includes("left-knee")} onSelect={() => onSelect("left-knee")}>
      <ellipse cx="79" cy="320" rx="17" ry="13" />
    </BodyPart>
    <BodyPart id="right-knee" selected={selectedParts.includes("right-knee")} onSelect={() => onSelect("right-knee")}>
      <ellipse cx="121" cy="320" rx="17" ry="13" />
    </BodyPart>
    {/* Shins */}
    <BodyPart id="left-shin" selected={selectedParts.includes("left-shin")} onSelect={() => onSelect("left-shin")}>
      <rect x="66" y="333" width="26" height="65" rx="10" />
    </BodyPart>
    <BodyPart id="right-shin" selected={selectedParts.includes("right-shin")} onSelect={() => onSelect("right-shin")}>
      <rect x="108" y="333" width="26" height="65" rx="10" />
    </BodyPart>
    {/* Feet */}
    <BodyPart id="left-foot" selected={selectedParts.includes("left-foot")} onSelect={() => onSelect("left-foot")}>
      <ellipse cx="79" cy="408" rx="20" ry="10" />
    </BodyPart>
    <BodyPart id="right-foot" selected={selectedParts.includes("right-foot")} onSelect={() => onSelect("right-foot")}>
      <ellipse cx="121" cy="408" rx="20" ry="10" />
    </BodyPart>
  </svg>
);

const BackBody = ({ selectedParts, onSelect }: { selectedParts: string[]; onSelect: (id: string) => void }) => (
  <svg viewBox="0 0 200 430" width="200" height="430" className="mx-auto">
    <BodyPart id="head-back" selected={selectedParts.includes("head-back")} onSelect={() => onSelect("head-back")}>
      <ellipse cx="100" cy="45" rx="35" ry="40" />
    </BodyPart>
    <BodyPart id="neck-back" selected={selectedParts.includes("neck-back")} onSelect={() => onSelect("neck-back")}>
      <rect x="88" y="83" width="24" height="20" rx="4" />
    </BodyPart>
    <BodyPart id="upper-back" selected={selectedParts.includes("upper-back")} onSelect={() => onSelect("upper-back")}>
      <rect x="55" y="103" width="90" height="70" rx="8" />
    </BodyPart>
    <BodyPart id="lower-back" selected={selectedParts.includes("lower-back")} onSelect={() => onSelect("lower-back")}>
      <rect x="58" y="173" width="84" height="45" rx="6" />
    </BodyPart>
    <BodyPart id="buttocks" selected={selectedParts.includes("buttocks")} onSelect={() => onSelect("buttocks")}>
      <rect x="55" y="218" width="90" height="40" rx="10" />
    </BodyPart>
    <BodyPart id="left-calf" selected={selectedParts.includes("left-calf")} onSelect={() => onSelect("left-calf")}>
      <rect x="60" y="260" width="32" height="120" rx="12" />
    </BodyPart>
    <BodyPart id="right-calf" selected={selectedParts.includes("right-calf")} onSelect={() => onSelect("right-calf")}>
      <rect x="108" y="260" width="32" height="120" rx="12" />
    </BodyPart>
    <BodyPart id="left-heel" selected={selectedParts.includes("left-heel")} onSelect={() => onSelect("left-heel")}>
      <ellipse cx="76" cy="390" rx="18" ry="10" />
    </BodyPart>
    <BodyPart id="right-heel" selected={selectedParts.includes("right-heel")} onSelect={() => onSelect("right-heel")}>
      <ellipse cx="124" cy="390" rx="18" ry="10" />
    </BodyPart>
  </svg>
);

const BodyDiagram = ({ selectedParts, onTogglePart, onSuggestSymptom }: BodyDiagramProps) => {
  const [view, setView] = useState<"front" | "back">("front");

  const currentMap = view === "front" ? bodyPartsMap : backPartsMap;

  const handleSelect = (id: string) => {
    const info = currentMap[id];
    if (info) onTogglePart(id, info.label, info.category);
  };

  // Gather unique categories of selected parts
  const selectedCategories = new Set(
    selectedParts.map((p) => bodyPartsMap[p]?.category || backPartsMap[p]?.category).filter(Boolean)
  );
  const suggestions = Array.from(selectedCategories).flatMap((c) => symptomSuggestions[c] || []);
  const uniqueSuggestions = [...new Set(suggestions)];

  const selectedLabels = selectedParts
    .map((p) => bodyPartsMap[p]?.label || backPartsMap[p]?.label)
    .filter(Boolean);

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left: SVG body */}
      <div className="flex flex-col items-center gap-3 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setView("front")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === "front" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >Front</button>
          <button
            onClick={() => setView("back")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === "back" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >Back</button>
        </div>
        <p className="text-xs text-muted-foreground">Tap on body parts that hurt</p>
        {view === "front" ? (
          <FrontBody selectedParts={selectedParts} onSelect={handleSelect} />
        ) : (
          <BackBody selectedParts={selectedParts} onSelect={handleSelect} />
        )}
      </div>

      {/* Right: selected parts + suggestions */}
      <div className="flex-1 space-y-4 min-w-0">
        {selectedLabels.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Selected areas:</p>
            <div className="flex flex-wrap gap-2">
              {selectedParts.map((p) => {
                const info = bodyPartsMap[p] || backPartsMap[p];
                if (!info) return null;
                return (
                  <motion.span
                    key={p}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-medium"
                  >
                    {info.label} ✓
                    <button onClick={() => onTogglePart(p, info.label, info.category)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                );
              })}
            </div>
          </div>
        )}

        {uniqueSuggestions.length > 0 && onSuggestSymptom && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Common symptoms for selected areas:</p>
            <div className="flex flex-wrap gap-2">
              {uniqueSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSuggestSymptom(s)}
                  className="px-3 py-1.5 rounded-full text-xs bg-secondary/50 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedLabels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>👈 Tap on the body diagram to select affected areas</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BodyDiagram;
