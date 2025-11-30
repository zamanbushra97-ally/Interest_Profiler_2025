# backend/services/recommender.py

from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

MBTI_CLUSTER_PRIOR_CSV = DATA_DIR / "mbti_cluster_prior.csv"
RIASEC_CLUSTER_MATRIX_CSV = DATA_DIR / "riasec_cluster_matrix.csv"
CAREER_CLUSTERS_CSV = DATA_DIR / "career_clusters.csv"


@dataclass
class ClusterRecommendation:
    cluster: str
    probability: float
    explanation: str
    # Additional fields for detailed card display
    icon: str = "🎯"
    short_description: str = ""
    why_it_fits: str = ""
    natural_skills: List[str] = None
    growth_skills: List[str] = None
    spark_interest: str = ""
    
    def __post_init__(self):
        if self.natural_skills is None:
            self.natural_skills = []
        if self.growth_skills is None:
            self.growth_skills = []


class CareerClusterRecommender:
    """
    Implements boxes 4–10 of your flow diagram:

      4. MBTI → RIASEC bridge (hint)
      5. Re-normalize adjusted RIASEC
      6. MBTI → Cluster Prior Table
      7. RIASEC → Cluster Matrix (dot product similarity)
      8. Combine both signals: P_final = α P_MBTI + (1-α) P_RIASEC
      9. Sort by final probability
      10. Take Top K clusters + explanation
    """

    def __init__(self, alpha: float = 0.3, beta: float = 0.7):
        """
        alpha = weight for MBTI→cluster prior  (step 8)
        beta  = weight for RIASEC_raw in the bridge (step 3.4)
        """
        self.alpha = alpha
        self.beta = beta

        # 6. load MBTI → cluster prior table
        self.mbti_prior_df = pd.read_csv(MBTI_CLUSTER_PRIOR_CSV)
        self.mbti_prior_df.set_index("MBTI", inplace=True)

        # 7. load RIASEC → cluster weight matrix
        self.riasec_matrix_df = pd.read_csv(RIASEC_CLUSTER_MATRIX_CSV)
        self.riasec_matrix_df.set_index("Cluster", inplace=True)

        # Load career clusters CSV for descriptions
        self._load_cluster_descriptions()

        # sanity: columns must be R,I,A,S,E,C
        self.riasec_codes = ["R", "I", "A", "S", "E", "C"]
        assert all(c in self.riasec_matrix_df.columns for c in self.riasec_codes)

    def _load_cluster_descriptions(self):
        """
        Load cluster descriptions from career_clusters.csv.
        Creates a dictionary mapping cluster names to their descriptions.
        Handles duplicate cluster names by taking the first valid description.
        """
        self.cluster_descriptions: Dict[str, str] = {}
        
        if not CAREER_CLUSTERS_CSV.exists():
            print(f"[warn] career_clusters.csv not found at {CAREER_CLUSTERS_CSV}")
            return
        
        try:
            clusters_df = pd.read_csv(CAREER_CLUSTERS_CSV, encoding='utf-8')
            
            # Handle case-insensitive column names
            cluster_col = None
            about_col = None
            
            for col in clusters_df.columns:
                col_lower = col.lower().strip().replace('_', ' ').replace('-', ' ')
                if 'career' in col_lower and 'cluster' in col_lower:
                    cluster_col = col
                elif col_lower == 'about':
                    about_col = col
            
            if not cluster_col:
                # Try alternative column name patterns
                for col in clusters_df.columns:
                    if 'cluster' in col.lower():
                        cluster_col = col
                        break
            
            if cluster_col and about_col:
                # Group by cluster name (in case of duplicates) and take the first description
                seen_clusters = set()
                for _, row in clusters_df.iterrows():
                    cluster_name = str(row[cluster_col]).strip()
                    if not cluster_name or cluster_name.lower() == 'nan':
                        continue
                    
                    # Skip if we've already seen this cluster (handle duplicates)
                    cluster_normalized_key = cluster_name.upper().strip()
                    if cluster_normalized_key in seen_clusters:
                        continue
                    
                    description = str(row[about_col]).strip()
                    if description and description.lower() != 'nan' and len(description) > 0:
                        # Store with multiple key formats for flexible lookup
                        self.cluster_descriptions[cluster_name] = description
                        self.cluster_descriptions[cluster_normalized_key] = description
                        seen_clusters.add(cluster_normalized_key)
                
                unique_count = len(seen_clusters)
                print(f"[info] Loaded {unique_count} unique cluster descriptions from {CAREER_CLUSTERS_CSV.name}")
            else:
                print(f"[warn] Could not find required columns in career_clusters.csv")
                print(f"[warn] Available columns: {clusters_df.columns.tolist()}")
                
        except Exception as e:
            print(f"[warn] Failed to load cluster descriptions: {e}")
            import traceback
            traceback.print_exc()

    # ---------- Step 4: MBTI → RIASEC bridge -----------

    def _mbti_to_riasec_hint(self, mbti_type: str) -> Dict[str, float]:
        """
        Build an MBTI-based RIASEC hint vector following the exact specification:
        Each MBTI letter contributes +1 to specific RIASEC traits as documented.
        
        Mapping:
        - E -> +1 to S, +1 to E
        - I -> +1 to I, +1 to C
        - S -> +1 to R, +1 to C
        - N -> +1 to I, +1 to A
        - T -> +1 to R, +1 to I, +1 to C
        - F -> +1 to A, +1 to S
        - J -> +1 to I, +1 to C
        - P -> +1 to A, +1 to S, +1 to E
        """
        scores = {k: 0.0 for k in self.riasec_codes}
        mt = mbti_type.upper()

        # Start from zeros (already initialized)
        # Process each letter of the MBTI type
        
        # -------- E vs I --------
        if "E" in mt:
            # E -> higher S, E
            scores["S"] += 1.0
            scores["E"] += 1.0
        elif "I" in mt:
            # I -> higher I, C
            scores["I"] += 1.0
            scores["C"] += 1.0

        # -------- S vs N --------
        if "S" in mt:
            # S -> higher R, C
            scores["R"] += 1.0
            scores["C"] += 1.0
        elif "N" in mt:
            # N -> higher I, A
            scores["I"] += 1.0
            scores["A"] += 1.0

        # -------- T vs F --------
        if "T" in mt:
            # T -> higher R, I, C
            scores["R"] += 1.0
            scores["I"] += 1.0
            scores["C"] += 1.0
        elif "F" in mt:
            # F -> higher A, S
            scores["A"] += 1.0
            scores["S"] += 1.0

        # -------- J vs P --------
        if "J" in mt:
            # J -> higher I, C
            scores["I"] += 1.0
            scores["C"] += 1.0
        elif "P" in mt:
            # P -> higher A, S, E
            scores["A"] += 1.0
            scores["S"] += 1.0
            scores["E"] += 1.0

        # Normalize to sum to 1.0
        total = sum(scores.values())
        if total == 0.0:
            # Fallback: uniform distribution if no scores
            return {k: 1.0 / len(self.riasec_codes) for k in self.riasec_codes}
        
        return {k: v / total for k, v in scores.items()}

    # ---------- Public API: main recommendation call -----------

    def recommend(
        self,
        mbti_type: str,
        riasec_raw: Dict[str, float],
        top_k: int = 3,
    ) -> List[ClusterRecommendation]:
        """
        mbti_type: e.g. "ENFJ"
        riasec_raw: raw R,I,A,S,E,C sums from quiz, e.g. {"R":8, "I":14, ...}
        """

        mbti_type = (mbti_type or "").upper().strip()
        if not mbti_type:
            raise ValueError("mbti_type is required")

        # ---------- 2. Normalize raw RIASEC quiz scores ----------
        total_raw = sum(float(riasec_raw.get(c, 0.0)) for c in self.riasec_codes) or 1.0
        riasec_raw_norm = {
            c: float(riasec_raw.get(c, 0.0)) / total_raw for c in self.riasec_codes
        }

        # ---------- 3. MBTI → RIASEC adjustment bridge ----------
        riasec_mbti = self._mbti_to_riasec_hint(mbti_type)

        # Blend: RIASEC_final = β * raw + (1-β) * mbti_hint
        riasec_final = {
            c: self.beta * riasec_raw_norm[c] + (1.0 - self.beta) * riasec_mbti[c]
            for c in self.riasec_codes
        }

        # tiny numerical clean-up
        s = sum(riasec_final.values()) or 1.0
        riasec_final = {c: v / s for c, v in riasec_final.items()}

        # ---------- 6. MBTI → cluster prior P_MBTI ----------
        try:
            mbti_row = self.mbti_prior_df.loc[mbti_type]
        except KeyError:
            # fallback: uniform if MBTI not found
            mbti_row = pd.Series(
                [1.0] * len(self.mbti_prior_df.columns),
                index=self.mbti_prior_df.columns,
            )
        mbti_scores = mbti_row.to_dict()
        sum_mbti = sum(mbti_scores.values()) or 1.0
        p_mbti = {cluster: v / sum_mbti for cluster, v in mbti_scores.items()}

        # ---------- 7. RIASEC → cluster similarity P_RIASEC ----------
        p_riasec: Dict[str, float] = {}
        for cluster, row in self.riasec_matrix_df.iterrows():
            # dot product score(cluster)
            s_val = 0.0
            for c in self.riasec_codes:
                s_val += riasec_final[c] * float(row[c])
            p_riasec[cluster] = s_val

        # normalize
        sum_r = sum(p_riasec.values()) or 1.0
        p_riasec = {cluster: v / sum_r for cluster, v in p_riasec.items()}

        # ---------- 8. Combine signals ----------
        alpha = self.alpha
        p_final: Dict[str, float] = {}
        for cluster in p_mbti.keys():
            p_final[cluster] = (
                alpha * p_mbti[cluster] + (1.0 - alpha) * p_riasec.get(cluster, 0.0)
            )

        # renormalize one last time
        z = sum(p_final.values()) or 1.0
        for k in list(p_final.keys()):
            p_final[k] = p_final[k] / z

        # ---------- 9–10. Sort + top-k with tie-breaking and deduplication ----------
        # Create tuples with multiple sort keys for deterministic tie-breaking:
        # 1. Primary: final probability (descending)
        # 2. Secondary: RIASEC similarity score (descending) 
        # 3. Tertiary: MBTI prior score (descending)
        # 4. Quaternary: cluster name (ascending for deterministic ordering)
        # This ensures that even if probabilities are identical, the order is stable and unique.
        cluster_tuples = []
        for cluster, prob in p_final.items():
            # Normalize cluster name for aggressive duplicate detection
            # Remove all non-alphanumeric characters and convert to lowercase
            # This handles "Arts, AV..." vs "Arts AV" or "STEM" vs "S.T.E.M."
            cluster_str = str(cluster)
            cluster_normalized = "".join(c.lower() for c in cluster_str if c.isalnum())
            
            # Get tie-breaking scores
            riasec_secondary = p_riasec.get(cluster, 0.0)
            mbti_secondary = p_mbti.get(cluster, 0.0)
            
            cluster_tuples.append((
                prob,                    # Primary: final probability
                riasec_secondary,        # Secondary: RIASEC similarity
                mbti_secondary,          # Tertiary: MBTI prior
                cluster_normalized,      # Quaternary: normalized name for sorting
                cluster                  # Original cluster name for output
            ))
        
        # Sort with multiple keys: all descending except cluster name (ascending for determinism)
        sorted_clusters = sorted(
            cluster_tuples,
            key=lambda x: (-x[0], -x[1], -x[2], x[3])  # Negative for descending
        )

        # Deduplicate and select top-k unique clusters
        seen_clusters = set()
        recommendations: List[ClusterRecommendation] = []
        
        for final_prob, riasec_sec, mbti_sec, cluster_norm, cluster_orig in sorted_clusters:
            # Skip if we've already seen this cluster (based on aggressive normalization)
            if cluster_norm in seen_clusters:
                continue
            
            # Check if we have enough recommendations
            if len(recommendations) >= top_k:
                break
            
            # Add to seen set
            seen_clusters.add(cluster_norm)
            
            # Build detailed cluster information
            full_description = self._get_cluster_description(cluster_orig)
            short_desc = self._get_short_description(full_description, cluster_orig)
            icon = self._get_cluster_icon(cluster_orig)
            why_fits = self._build_why_it_fits(
                cluster=cluster_orig,
                mbti_type=mbti_type,
                riasec_final=riasec_final,
            )
            natural_skills = self._get_natural_skills(cluster_orig, mbti_type, riasec_final)
            growth_skills = self._get_growth_skills(cluster_orig)
            spark_interest = self._get_spark_interest(cluster_orig)
            
            recommendations.append(
                ClusterRecommendation(
                    cluster=cluster_orig,
                    probability=final_prob,
                    explanation=full_description,
                    icon=icon,
                    short_description=short_desc,
                    why_it_fits=why_fits,
                    natural_skills=natural_skills,
                    growth_skills=growth_skills,
                    spark_interest=spark_interest,
                )
            )

        return recommendations

    # ---------- Explanation helper ----------

    def _get_cluster_description(self, cluster: str) -> str:
        """
        Get cluster description from career_clusters.csv.
        Returns the description if found, otherwise returns a fallback message.
        Uses multiple matching strategies to handle variations in cluster names.
        """
        if not cluster or not isinstance(cluster, str):
            return "This career cluster aligns with your personality and interests."
        
        cluster = cluster.strip()
        if not cluster:
            return "This career cluster aligns with your personality and interests."
        
        # Strategy 1: Try exact match first
        if cluster in self.cluster_descriptions:
            return self.cluster_descriptions[cluster]
        
        # Strategy 2: Try case-insensitive match
        cluster_upper = cluster.upper()
        if cluster_upper in self.cluster_descriptions:
            return self.cluster_descriptions[cluster_upper]
        
        # Strategy 3: Try normalized match (remove special characters and compare)
        cluster_normalized = "".join(c.upper() for c in cluster if c.isalnum() or c.isspace())
        cluster_normalized = " ".join(cluster_normalized.split())  # Normalize whitespace
        
        for key in self.cluster_descriptions.keys():
            key_normalized = "".join(c.upper() for c in str(key) if c.isalnum() or c.isspace())
            key_normalized = " ".join(key_normalized.split())
            if cluster_normalized == key_normalized:
                return self.cluster_descriptions[key]
        
        # Strategy 4: Try substring match (check if cluster name contains key or vice versa)
        for key in self.cluster_descriptions.keys():
            key_str = str(key).upper()
            cluster_str = cluster.upper()
            # Check if either is a substring of the other (for partial matches)
            if len(key_str) > 5 and len(cluster_str) > 5:  # Avoid too short matches
                if key_str in cluster_str or cluster_str in key_str:
                    return self.cluster_descriptions[key]
        
        # Fallback: return a generic message
        print(f"[warn] Could not find description for cluster: '{cluster}'")
        return "This career cluster aligns with your personality and interests."

    def _build_explanation(
        self,
        cluster: str,
        mbti_type: str,
        riasec_final: Dict[str, float],
        p_mbti: float,
        p_riasec: float,
    ) -> str:
        """
        Returns cluster description from career_clusters.csv instead of statistical explanation.
        """
        description = self._get_cluster_description(cluster)
        return description
    
    def _get_cluster_icon(self, cluster: str) -> str:
        """Get icon for cluster based on cluster name."""
        cluster_lower = cluster.lower()
        
        # Icon mapping based on cluster keywords
        icon_map = {
            "education": "👩‍🏫",
            "training": "🎓",
            "hospitality": "🏨",
            "tourism": "🧳",
            "health": "🩺",
            "science": "⚕️",
            "stem": "🔬",
            "technology": "💻",
            "engineering": "⚙️",
            "mathematics": "📊",
            "art": "🎨",
            "arts": "🎭",
            "av": "🎬",
            "business": "💼",
            "finance": "💰",
            "marketing": "📈",
            "agriculture": "🌾",
            "food": "🍽️",
            "natural": "🌿",
            "resources": "🌍",
            "government": "🏛️",
            "public": "📋",
            "human": "👥",
            "services": "🤝",
            "law": "⚖️",
            "public safety": "🚨",
            "corrections": "🔒",
            "security": "🛡️",
            "manufacturing": "🏭",
            "construction": "🏗️",
            "transportation": "🚛",
            "distribution": "📦",
            "logistics": "🚚",
        }
        
        for keyword, icon in icon_map.items():
            if keyword in cluster_lower:
                return icon
        
        return "🎯"  # Default icon
    
    def _get_short_description(self, full_description: str, cluster: str) -> str:
        """Extract first 2-3 sentences from full description."""
        if not full_description:
            return f"{cluster} offers diverse career opportunities that align with your interests and personality."
        
        # Split by sentences (periods followed by space)
        sentences = full_description.split('. ')
        if len(sentences) <= 1:
            # Try splitting by newlines
            sentences = full_description.split('\n')
        
        # Take first 2-3 sentences (or first paragraph)
        if len(sentences) >= 3:
            short = '. '.join(sentences[:2]) + '.'
        elif len(sentences) >= 2:
            short = '. '.join(sentences[:2])
        else:
            short = sentences[0] if sentences else full_description[:200]
        
        # Limit to 300 characters
        if len(short) > 300:
            short = short[:297] + '...'
        
        return short
    
    def _build_why_it_fits(
        self,
        cluster: str,
        mbti_type: str,
        riasec_final: Dict[str, float],
    ) -> str:
        """Build personalized 'Why It Fits' line based on MBTI and RIASEC."""
        # Get top 2 RIASEC traits
        top_traits = sorted(
            self.riasec_codes,
            key=lambda c: riasec_final.get(c, 0.0),
            reverse=True
        )[:2]
        top_trait_str = ' / '.join(top_traits)
        
        # MBTI personality traits
        mbti_traits = []
        if 'E' in mbti_type:
            mbti_traits.append("social interaction")
        if 'I' in mbti_type:
            mbti_traits.append("focused work")
        if 'F' in mbti_type:
            mbti_traits.append("helping others")
        if 'T' in mbti_type:
            mbti_traits.append("analytical thinking")
        if 'S' in mbti_type:
            mbti_traits.append("practical approaches")
        if 'N' in mbti_type:
            mbti_traits.append("creative solutions")
        
        trait_desc = ", ".join(mbti_traits[:2]) if mbti_traits else "your personality"
        
        return f"Aligned with: {mbti_type} • High {top_trait_str} interest"
    
    def _get_natural_skills(
        self,
        cluster: str,
        mbti_type: str,
        riasec_final: Dict[str, float],
    ) -> List[str]:
        """Get natural skills based on cluster and personality."""
        cluster_lower = cluster.lower()
        skills = []
        
        # Base skills by cluster type
        if "education" in cluster_lower or "training" in cluster_lower:
            skills.extend(["Clear communication", "Patience with learners", "Listening and empathy", "Organizing information"])
        elif "hospitality" in cluster_lower or "tourism" in cluster_lower:
            skills.extend(["Friendliness and warmth", "Teamwork and cooperation", "Handling new situations", "Paying attention to guests' needs"])
        elif "health" in cluster_lower or "science" in cluster_lower:
            skills.extend(["Caring for others", "Following rules and procedures", "Noticing details", "Staying calm in serious situations"])
        elif "stem" in cluster_lower or "technology" in cluster_lower or "engineering" in cluster_lower:
            skills.extend(["Problem-solving", "Analytical thinking", "Attention to detail", "Logical reasoning"])
        elif "business" in cluster_lower or "finance" in cluster_lower:
            skills.extend(["Organization", "Data analysis", "Strategic thinking", "Communication"])
        elif "art" in cluster_lower or "creative" in cluster_lower:
            skills.extend(["Creative expression", "Visual thinking", "Innovation", "Imagination"])
        else:
            skills.extend(["Problem-solving", "Communication", "Adaptability", "Teamwork"])
        
        # Adjust based on MBTI
        if 'F' in mbti_type and "empathy" not in str(skills).lower():
            skills.append("Understanding others' needs")
        if 'T' in mbti_type and "analytical" not in str(skills).lower():
            skills.append("Logical analysis")
        
        return skills[:4]  # Return max 4 skills
    
    def _get_growth_skills(self, cluster: str) -> List[str]:
        """Get skills user can develop in this cluster."""
        cluster_lower = cluster.lower()
        skills = []
        
        # Growth skills by cluster
        if "education" in cluster_lower or "training" in cluster_lower:
            skills.extend(["Classroom or group management", "Creative lesson design", "Using digital tools for teaching", "Giving constructive feedback"])
        elif "hospitality" in cluster_lower or "tourism" in cluster_lower:
            skills.extend(["Time and stress management", "Planning and coordination", "Intercultural understanding", "Customer service strategies"])
        elif "health" in cluster_lower or "science" in cluster_lower:
            skills.extend(["Scientific thinking", "Decision-making under pressure", "Health communication", "Using medical or lab technology"])
        elif "stem" in cluster_lower or "technology" in cluster_lower:
            skills.extend(["Advanced technical skills", "Research methodology", "Collaborative problem-solving", "Staying updated with technology"])
        elif "business" in cluster_lower or "finance" in cluster_lower:
            skills.extend(["Leadership", "Financial analysis", "Strategic planning", "Market understanding"])
        elif "art" in cluster_lower or "creative" in cluster_lower:
            skills.extend(["Advanced techniques", "Professional presentation", "Industry networking", "Business skills for artists"])
        else:
            skills.extend(["Industry-specific knowledge", "Advanced problem-solving", "Leadership", "Professional networking"])
        
        return skills[:4]  # Return max 4 skills
    
    def _get_spark_interest(self, cluster: str) -> str:
        """Get spark interest line for cluster."""
        cluster_lower = cluster.lower()
        
        if "education" in cluster_lower or "training" in cluster_lower:
            return "If you enjoy helping friends understand topics or guiding others, this cluster can turn that strength into a meaningful career path."
        elif "hospitality" in cluster_lower or "tourism" in cluster_lower:
            return "If you like the idea of working with people, events, and travel, this cluster lets you turn those interests into exciting real-world experiences."
        elif "health" in cluster_lower or "science" in cluster_lower:
            return "If you're curious about how the body works or like supporting others when they're unwell, Health Science offers many meaningful paths to explore."
        elif "stem" in cluster_lower or "technology" in cluster_lower:
            return "If you're fascinated by how things work and enjoy solving complex problems, this cluster offers endless opportunities to innovate and create."
        elif "business" in cluster_lower or "finance" in cluster_lower:
            return "If you're drawn to strategy, organization, and making things happen, this cluster lets you turn those interests into impactful career paths."
        elif "art" in cluster_lower or "creative" in cluster_lower:
            return "If you're drawn to creative expression and visual storytelling, this cluster lets you turn your artistic interests into professional opportunities."
        else:
            return f"If you're interested in {cluster}, this cluster offers diverse paths that align with your personality and interests."
