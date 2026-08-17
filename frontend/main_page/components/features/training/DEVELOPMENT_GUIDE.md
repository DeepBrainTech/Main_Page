# Training Module Analysis & Development Recommendations

## Current Implementation Understanding

### Architecture Overview

Your training module implements a **Duolingo-style progression system** with:
- **12 themed worlds** (80 total stages)
- **7 levels per world** (mostly), with final level as "challenge-mix"
- **Linear strict progression** - unlock next level only after earning ≥1 star on previous
- **3-star rating system** per level
- **6 cognitive dimensions** tracking (memory, logic, focus, reaction, strategy, spatial)

### Current State (Frontend-Only)

**Tech Stack:**
```
Frontend: Next.js + TypeScript + Tailwind
Storage: localStorage (key: "dbt.training.progress.v1")
State: Client-side only, no backend sync yet
```

**Data Model:**
```typescript
TrainingProgressState {
  levels: {
    [worldId]: {
      [levelId]: {
        bestStars: 0-3,
        attempts: number,
        rewardedStars: 0-3  // Stars already converted to rewards
      }
    }
  },
  dimensionScores: {
    memory: 0,
    logic: 0,
    focus: 0,
    reaction: 0,
    strategy: 0,
    spatial: 0
  }
}
```

**Key Files:**
- Types: `types/training.ts`
- Config: `config/training/catalog.ts` + 12 world configs
- State: `lib/training/progress-local.ts`
- Components: `components/features/training/`
- Routes: `app/[locale]/(app)/training/`

### Game Mechanics Integration

**34 Mechanic Types** defined, including:
- **Memory**: sternberg, n-back (1-back, 2-back, 3-back), change-detection
- **Strategy**: hanoi, london, route-planning
- **Logic**: transitive-inference, analogical-reasoning, syllogistic-reasoning
- **Spatial**: mental-rotation, paper-fold, spatial-construction
- **Attention**: flanker, stroop, schulte-grid
- **Mixed**: challenge-mix, adaptive-mix

**Difficulty Scaling via Parameters:**
```typescript
// Example: N-back progression
{ mechanicId: "n-back", params: { n: 1 } }  // World 4 Level 1
{ mechanicId: "n-back", params: { n: 2, guided: true } }  // World 4 Level 2

// Example: Hanoi Tower
{ mechanicId: "hanoi", params: { discs: 3 } }  // World 7 Level 2
{ mechanicId: "hanoi", params: { discs: 4 } }  // Later world (harder)
```

**Current Placeholder:**
- `PlaceholderMechanic.tsx` - shows 4 buttons to simulate 0/1/2/3 stars
- Real game mechanics not yet implemented
- Designed to be swapped with actual game components

### Star & Reward System

**Star Grading:**
```typescript
0★ - Failed or not attempted
1★ - Basic completion (unlocks next level)
2★ - Good performance
3★ - Mastery (grants dimension rewards)
```

**Reward Rules:**
- Only **3-star completion** grants dimension points
- **+1 point per tagged dimension** when first achieving 3★
- Example: Level tags ["memory", "focus"] → +1 memory, +1 focus
- No rewards for 1-2 star upgrades (current design)
- No dimension score cap (configurable in `rewards.ts`)

**Challenge Mix Bonus:**
- Final level of each world tags all 6 dimensions
- Achieving 3★ on challenge level = +6 total points distributed

---

## Critical Gaps & Development Needs

### 1. Backend Integration (HIGH PRIORITY)

**Current State:**
- ✅ `UserCognitiveScores` model exists in backend (models.py:253)
- ❌ No training-specific models (progress, attempts, star ratings)
- ❌ No backend API endpoints for training
- ❌ No sync between localStorage and server

**Required Backend Models:**

```python
# backend/api/models.py

class UserTrainingProgress(Base):
    """Per-level progress tracking for training module"""
    __tablename__ = "user_training_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "world_id", "level_id",
                        name="uq_user_training_level"),
        Index("idx_user_training_user", "user_id"),
        Index("idx_user_training_world", "world_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    world_id = Column(String(50), nullable=False)  # "foundations"
    level_id = Column(String(20), nullable=False)  # "level-01"
    global_stage = Column(Integer, nullable=False, index=True)  # 1-80

    # Progress tracking
    best_stars = Column(Integer, default=0, nullable=False)  # 0-3
    total_attempts = Column(Integer, default=0, nullable=False)
    rewarded_stars = Column(Integer, default=0, nullable=False)  # Stars settled

    # First completion tracking
    first_completed_at = Column(DateTime, nullable=True)
    first_stars = Column(Integer, nullable=True)  # Stars on first completion

    # Best performance tracking
    best_completed_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow,
                       onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="training_progress")


class UserTrainingAttempt(Base):
    """Individual attempt records for analytics"""
    __tablename__ = "user_training_attempts"
    __table_args__ = (
        Index("idx_training_attempt_user", "user_id"),
        Index("idx_training_attempt_level", "world_id", "level_id"),
        Index("idx_training_attempt_time", "started_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    world_id = Column(String(50), nullable=False)
    level_id = Column(String(20), nullable=False)
    global_stage = Column(Integer, nullable=False)
    mechanic_id = Column(String(50), nullable=False)  # "n-back", "hanoi"

    # Attempt details
    stars_earned = Column(Integer, nullable=False)  # 0-3
    is_new_best = Column(Boolean, default=False, nullable=False)
    dimension_points_granted = Column(JSON, nullable=True)  # {"memory": 1, "focus": 1}

    # Performance metrics (game-specific, stored as JSON)
    performance_data = Column(JSON, nullable=True)
    # Examples:
    # - n-back: {"accuracy": 0.85, "avgReactionTime": 650}
    # - hanoi: {"moves": 7, "optimalMoves": 7, "timeSeconds": 45}
    # - route-planning: {"pathLength": 8, "optimalPath": 8, "mistakes": 0}

    # Time tracking
    started_at = Column(DateTime, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, nullable=False)

    user = relationship("User", backref="training_attempts")


class UserTrainingDailyStreak(Base):
    """Daily training activity for streak tracking"""
    __tablename__ = "user_training_daily_streak"
    __table_args__ = (
        UniqueConstraint("user_id", "activity_date",
                        name="uq_user_training_daily"),
        Index("idx_training_daily_user", "user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_date = Column(Date, nullable=False, index=True)

    levels_completed = Column(Integer, default=0, nullable=False)
    stars_earned = Column(Integer, default=0, nullable=False)
    dimension_points_earned = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="training_daily_activity")
```

**Required API Endpoints:**

```python
# backend/api/routes/training.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from schemas import TrainingProgressResponse, RecordAttemptRequest

router = APIRouter(prefix="/api/training", tags=["training"])

@router.get("/progress", response_model=TrainingProgressResponse)
async def get_training_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all training progress for current user"""
    # Query all UserTrainingProgress for user
    # Return in TrainingProgressState format
    pass

@router.post("/attempt", response_model=AttemptRecordResponse)
async def record_attempt(
    request: RecordAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a training level attempt"""
    # 1. Create UserTrainingAttempt record
    # 2. Update/create UserTrainingProgress
    # 3. Calculate dimension rewards
    # 4. Update UserCognitiveScores
    # 5. Update UserTrainingDailyStreak
    # 6. Return updated progress
    pass

@router.get("/stats", response_model=TrainingStatsResponse)
async def get_training_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get training analytics (total attempts, avg performance, etc.)"""
    pass

@router.get("/leaderboard/{world_id}", response_model=List[LeaderboardEntry])
async def get_world_leaderboard(
    world_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get leaderboard for a specific world"""
    # Rank by total stars in world, then by completion time
    pass
```

---

### 2. Star Grading Standards (CRITICAL)

**Current Issue:**
- Placeholder mechanic only simulates stars
- No actual performance criteria defined
- Each mechanic needs specific grading thresholds

**Recommended Grading Framework:**

```typescript
// config/training/grading.ts

interface GradingCriteria {
  mechanicId: TrainingMechanicId;
  criteria: {
    star1: GradingThreshold;  // Basic completion
    star2: GradingThreshold;  // Good performance
    star3: GradingThreshold;  // Mastery
  };
}

interface GradingThreshold {
  // Primary metric
  accuracy?: number;           // 0.0-1.0 (e.g., 0.7 = 70%)
  minCorrect?: number;         // Minimum correct answers
  maxErrors?: number;          // Maximum allowed errors
  maxTime?: number;            // Time limit in seconds

  // Secondary metrics (all must pass)
  minAccuracy?: number;        // Minimum accuracy threshold
  maxReactionTime?: number;    // Average reaction time (ms)
  completionRequired?: boolean; // Must finish all trials
}

export const GRADING_STANDARDS: Record<TrainingMechanicId, GradingCriteria> = {
  "n-back": {
    criteria: {
      star1: { minAccuracy: 0.60, completionRequired: true },
      star2: { minAccuracy: 0.75, maxReactionTime: 800 },
      star3: { minAccuracy: 0.90, maxReactionTime: 600 }
    }
  },

  "hanoi": {
    criteria: {
      star1: { completionRequired: true, maxTime: 300 },  // Just finish
      star2: {
        // movesRatio = actualMoves / optimalMoves
        custom: (data) => data.movesRatio <= 1.5 && data.timeSeconds < 180
      },
      star3: {
        custom: (data) => data.movesRatio <= 1.2 && data.timeSeconds < 120
      }
    }
  },

  "sternberg": {
    criteria: {
      star1: { minAccuracy: 0.65, completionRequired: true },
      star2: { minAccuracy: 0.80, maxReactionTime: 1000 },
      star3: { minAccuracy: 0.92, maxReactionTime: 750 }
    }
  },

  "mental-rotation": {
    criteria: {
      star1: { minAccuracy: 0.55 },
      star2: { minAccuracy: 0.70, maxReactionTime: 3000 },
      star3: { minAccuracy: 0.85, maxReactionTime: 2000 }
    }
  },

  // ... define for all 34 mechanics
};
```

**Dynamic Difficulty Adjustment (World 11):**

```typescript
// For adaptive-mix mechanic
interface AdaptiveDifficultyConfig {
  baselineAssessment: {
    mechanic: TrainingMechanicId;
    params: Record<string, unknown>;
    trials: number;
  }[];

  adjustmentRules: {
    // If accuracy > 0.9, increase difficulty
    performanceHigh: { threshold: 0.9, action: "increase" };
    // If accuracy < 0.6, decrease difficulty
    performanceLow: { threshold: 0.6, action: "decrease" };
  };

  difficultyLevels: {
    easy: Record<string, unknown>;
    medium: Record<string, unknown>;
    hard: Record<string, unknown>;
  };
}
```

---

### 3. Common Game Hooks Architecture

**Recommended Reusable Hooks:**

```typescript
// hooks/training/useMechanicRunner.ts

/**
 * Core hook for running any training mechanic
 * Handles timer, trial management, performance tracking
 */
export function useMechanicRunner(config: MechanicConfig) {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentTrial, setCurrentTrial] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);

  const startMechanic = () => { /* ... */ };
  const recordResponse = (response: Response) => { /* ... */ };
  const nextTrial = () => { /* ... */ };
  const finishMechanic = () => {
    const performance = calculatePerformance(responses);
    const stars = calculateStars(performance, config.mechanicId);
    return { performance, stars };
  };

  return {
    gameState,
    currentTrial,
    startMechanic,
    recordResponse,
    nextTrial,
    finishMechanic
  };
}


// hooks/training/useTrainingProgress.ts

/**
 * Hook to sync training progress with backend
 */
export function useTrainingProgress() {
  const [progress, setProgress] = useState<TrainingProgressState | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from backend (with localStorage fallback)
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch("/api/training/progress");
        const data = await response.json();
        setProgress(data);
        // Sync to localStorage
        saveTrainingProgress(data);
      } catch (error) {
        // Fallback to localStorage
        setProgress(loadTrainingProgress());
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, []);

  const recordAttempt = async (
    worldId: string,
    level: TrainingLevelDefinition,
    performance: PerformanceData,
    stars: TrainingStars
  ) => {
    // Optimistic update
    const newProgress = recordLevelAttempt(progress!, worldId, level, stars);
    setProgress(newProgress);
    saveTrainingProgress(newProgress);

    // Sync to backend
    try {
      const response = await fetch("/api/training/attempt", {
        method: "POST",
        body: JSON.stringify({
          worldId,
          levelId: level.id,
          globalStage: level.globalStage,
          mechanicId: level.mechanicId,
          stars,
          performanceData: performance,
          startedAt: performance.startedAt,
          completedAt: new Date().toISOString(),
          durationSeconds: performance.durationSeconds
        })
      });

      const serverProgress = await response.json();
      setProgress(serverProgress.progress);
      saveTrainingProgress(serverProgress.progress);
    } catch (error) {
      console.error("Failed to sync to backend:", error);
      // Keep local state
    }
  };

  return { progress, loading, recordAttempt };
}


// hooks/training/useReactionTimer.ts

/**
 * Precise reaction time measurement
 */
export function useReactionTimer() {
  const [startTime, setStartTime] = useState<number | null>(null);

  const start = () => setStartTime(performance.now());

  const measure = () => {
    if (!startTime) return null;
    return performance.now() - startTime;
  };

  const reset = () => setStartTime(null);

  return { start, measure, reset };
}


// hooks/training/useTrialSequence.ts

/**
 * Manage trial sequences for memory tasks (n-back, sternberg, etc.)
 */
export function useTrialSequence(config: {
  totalTrials: number;
  stimuliGenerator: () => Stimulus;
  interTrialInterval: number;
}) {
  const [currentTrial, setCurrentTrial] = useState(0);
  const [stimulusHistory, setStimulusHistory] = useState<Stimulus[]>([]);
  const [isShowingStimulus, setIsShowingStimulus] = useState(false);

  const presentStimulus = () => { /* ... */ };
  const advanceTrial = () => { /* ... */ };
  const isLastTrial = () => currentTrial >= config.totalTrials - 1;

  return {
    currentTrial,
    stimulusHistory,
    isShowingStimulus,
    presentStimulus,
    advanceTrial,
    isLastTrial
  };
}


// hooks/training/useAdaptiveDifficulty.ts

/**
 * Dynamically adjust difficulty based on performance (World 11)
 */
export function useAdaptiveDifficulty(mechanicId: TrainingMechanicId) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [performanceWindow, setPerformanceWindow] = useState<number[]>([]);

  const updatePerformance = (accuracy: number) => {
    const newWindow = [...performanceWindow, accuracy].slice(-5);  // Last 5 trials
    setPerformanceWindow(newWindow);

    const avgAccuracy = newWindow.reduce((a, b) => a + b, 0) / newWindow.length;

    // Adjust difficulty
    if (avgAccuracy > 0.9 && difficulty !== "hard") {
      setDifficulty("hard");
    } else if (avgAccuracy < 0.6 && difficulty !== "easy") {
      setDifficulty("easy");
    } else if (avgAccuracy >= 0.6 && avgAccuracy <= 0.9 && difficulty !== "medium") {
      setDifficulty("medium");
    }
  };

  return { difficulty, updatePerformance };
}
```

---

### 4. Performance Data Collection

**Required Metrics per Mechanic Type:**

```typescript
// types/training-performance.ts

interface BasePerformanceData {
  mechanicId: TrainingMechanicId;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  totalTrials: number;
  completedTrials: number;
}

interface MemoryTaskPerformance extends BasePerformanceData {
  mechanicId: "n-back" | "sternberg" | "change-detection";
  correctCount: number;
  incorrectCount: number;
  accuracy: number;  // 0.0-1.0
  avgReactionTime: number;  // milliseconds
  reactionTimes: number[];  // per-trial
  falsePositives: number;
  falseNegatives: number;
}

interface StrategyTaskPerformance extends BasePerformanceData {
  mechanicId: "hanoi" | "london" | "route-planning";
  movesTaken: number;
  optimalMoves: number;
  efficiency: number;  // movesTaken / optimalMoves
  mistakes: number;  // Invalid moves
  hintsUsed: number;
  planningTimeSeconds: number;  // Time before first move
}

interface ReactionTaskPerformance extends BasePerformanceData {
  mechanicId: "simple-reaction" | "choice-reaction" | "pvt";
  avgReactionTime: number;
  medianReactionTime: number;
  fastestReaction: number;
  slowestReaction: number;
  prematureResponses: number;  // Responses before stimulus
  missedResponses: number;
}

interface SpatialTaskPerformance extends BasePerformanceData {
  mechanicId: "mental-rotation" | "paper-fold" | "spatial-construction";
  correctCount: number;
  accuracy: number;
  avgRotationAngle: number;  // For mental rotation
  avgResponseTime: number;
  timePerDegree: number;  // Reaction time / rotation angle
}

type PerformanceData =
  | MemoryTaskPerformance
  | StrategyTaskPerformance
  | ReactionTaskPerformance
  | SpatialTaskPerformance;
```

---

### 5. Additional Backend Features

**Recommended Additions:**

```python
# 1. Training Analytics Endpoint
@router.get("/analytics/summary")
async def get_training_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns:
    - Total training time
    - Levels completed per world
    - Average stars per world
    - Strongest/weakest dimensions
    - Current streak
    - Recent activity
    """
    pass


# 2. World Unlock Status
@router.get("/unlock-status")
async def get_unlock_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns which levels are unlocked for the user"""
    # Useful for preemptive UI rendering
    pass


# 3. Dimension History
@router.get("/dimensions/history")
async def get_dimension_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns dimension score changes over time for graphs"""
    # Query UserTrainingAttempt.dimension_points_granted
    # Aggregate by date
    pass


# 4. Performance Benchmarking
@router.get("/benchmark/{mechanic_id}")
async def get_performance_benchmark(
    mechanic_id: str,
    difficulty_params: str = None,  # JSON string
    db: Session = Depends(get_db)
):
    """Returns percentile rankings for a mechanic"""
    # Example: "Your n-back accuracy is in the 73rd percentile"
    pass


# 5. Streak & Rewards
@router.get("/streak")
async def get_training_streak(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Current streak + potential rewards"""
    # Could integrate with UserRewards (coins/diamonds/flowers)
    pass
```

---

### 6. Data Migration Strategy

**Phase 1: Dual Write (Transitional)**
```typescript
// Write to both localStorage AND backend
const recordAttempt = async (stars: TrainingStars) => {
  // Local update (immediate)
  const newProgress = recordLevelAttempt(progress, worldId, level, stars);
  saveTrainingProgress(newProgress);
  setProgress(newProgress);

  // Backend sync (async, non-blocking)
  try {
    await fetch("/api/training/attempt", { method: "POST", ... });
  } catch (e) {
    console.warn("Backend sync failed, using local state");
  }
};
```

**Phase 2: Backend as Source of Truth**
```typescript
// Read from backend, cache in localStorage
const loadProgress = async () => {
  try {
    const response = await fetch("/api/training/progress");
    const serverProgress = await response.json();
    saveTrainingProgress(serverProgress);  // Cache locally
    return serverProgress;
  } catch (e) {
    return loadTrainingProgress();  // Fallback to cache
  }
};
```

**Phase 3: Merge Cognitive Scores**
```python
# When recording training attempt, update user_cognitive_scores
def record_training_attempt(...):
    # ... create UserTrainingAttempt

    if dimension_points_granted:
        cognitive_scores = db.query(UserCognitiveScores).filter_by(
            user_id=user.id
        ).first()

        for dim, points in dimension_points_granted.items():
            current_score = getattr(cognitive_scores, dim)
            setattr(cognitive_scores, dim, current_score + points)

        db.commit()
```

---

## Strategic Recommendations

### Priority 1: Star Grading Implementation (IMMEDIATE)

**Why Critical:**
- Current placeholder doesn't validate actual performance
- Need real grading to balance difficulty across 80 levels
- Required before playtesting can begin

**Action Items:**
1. Define grading criteria for all 34 mechanics
2. Implement `calculateStars()` function in each game component
3. Create grading config file (`config/training/grading.ts`)
4. Build performance data collection into each mechanic

**Example Implementation:**
```typescript
// mechanics/NBackGame.tsx
export function NBackGame({ params, onComplete }) {
  const { recordResponse, finishGame } = useMechanicRunner({
    mechanicId: "n-back",
    totalTrials: 20,
    params
  });

  const handleFinish = () => {
    const performance = finishGame();  // Returns MemoryTaskPerformance
    const stars = calculateStars("n-back", performance, params);
    onComplete(stars);
  };

  // ... game logic
}

// lib/training/grading.ts
export function calculateStars(
  mechanicId: TrainingMechanicId,
  performance: PerformanceData,
  params?: Record<string, unknown>
): TrainingStars {
  const criteria = GRADING_STANDARDS[mechanicId];

  if (performance.accuracy >= criteria.star3.minAccuracy &&
      performance.avgReactionTime <= criteria.star3.maxReactionTime) {
    return 3;
  }
  // ... check star2, star1
  return 0;
}
```

### Priority 2: Backend Infrastructure (NEAR-TERM)

**Why Important:**
- Prevents data loss (localStorage can be cleared)
- Enables cross-device progress sync
- Required for leaderboards and analytics
- Allows admin monitoring of user progress

**Action Items:**
1. Create database models (UserTrainingProgress, UserTrainingAttempt, UserTrainingDailyStreak)
2. Build API endpoints (/progress, /attempt, /stats)
3. Implement backend→cognitive scores sync
4. Add Alembic migration scripts

**Migration Script Example:**
```python
# backend/alembic/versions/xxx_add_training_tables.py

def upgrade():
    op.create_table(
        'user_training_progress',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('world_id', sa.String(50), nullable=False),
        sa.Column('level_id', sa.String(20), nullable=False),
        sa.Column('global_stage', sa.Integer(), nullable=False),
        sa.Column('best_stars', sa.Integer(), default=0),
        sa.Column('total_attempts', sa.Integer(), default=0),
        sa.Column('rewarded_stars', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), onupdate=sa.func.now()),
    )

    op.create_unique_constraint(
        'uq_user_training_level',
        'user_training_progress',
        ['user_id', 'world_id', 'level_id']
    )

    # ... create other tables
```

### Priority 3: Common Game Components (MEDIUM-TERM)

**Reusable UI Components:**
```
components/features/training/mechanics/shared/
├── StimulusDisplay.tsx       # Show letters/numbers/shapes
├── ResponseButtons.tsx        # Yes/No, A/B/C/D, Arrow keys
├── TrialCounter.tsx           # "Trial 12/20"
├── ProgressBar.tsx            # Visual progress
├── InstructionScreen.tsx      # Pre-game instructions
├── FeedbackDisplay.tsx        # Correct/Incorrect feedback
├── TimerDisplay.tsx           # Countdown timer
└── PauseOverlay.tsx           # Pause menu
```

**Reusable Game Logic:**
```
lib/training/mechanics/
├── memoryTasks.ts             # n-back, Sternberg stimulus generation
├── spatialTasks.ts            # Rotation matrices, fold patterns
├── reactionTasks.ts           # Timer utils, response validation
└── strategyTasks.ts           # Pathfinding, constraint checking
```

### Priority 4: Analytics & Insights (LONG-TERM)

**User-Facing Analytics:**
- Training time per world
- Performance trends (accuracy/speed over time)
- Dimension growth charts
- Comparison to user's own baseline
- "Insights" like "Your reaction time improved 15% this week"

**Admin Analytics:**
- Level completion rates (identify too-hard levels)
- Average attempts before 3-star (difficulty calibration)
- Drop-off points (where users quit)
- Mechanic popularity
- Performance distribution per level

---

## Recommended Next Steps

### Immediate (Week 1-2)
1. ✅ Define star grading criteria for 10 most-used mechanics
2. ✅ Implement one complete mechanic (e.g., n-back) with real grading
3. ✅ Create `useMechanicRunner` hook
4. ✅ Test full flow: play → grade → record → update UI

### Short-term (Week 3-4)
1. ✅ Design backend database schema
2. ✅ Create Alembic migration
3. ✅ Build `/api/training/progress` and `/attempt` endpoints
4. ✅ Implement frontend→backend sync
5. ✅ Test data persistence

### Medium-term (Month 2)
1. ✅ Implement 15+ mechanics (prioritize early worlds)
2. ✅ Build reusable component library
3. ✅ Add analytics endpoints
4. ✅ Create admin dashboard for monitoring
5. ✅ Playtest worlds 1-3, adjust difficulty

### Long-term (Month 3+)
1. ✅ Complete all 34 mechanics
2. ✅ Implement adaptive difficulty (World 11)
3. ✅ Build leaderboard system
4. ✅ Add social features (share progress, compete with friends)
5. ✅ Mobile optimization
6. ✅ A/B test grading thresholds

---

## Design Philosophy Recommendations

### 1. Progressive Disclosure
- Don't overwhelm users with all 80 levels upfront
- Show only current world + next locked world
- Reveal mechanics gradually

### 2. Balanced Difficulty Curve
- Early levels (Worlds 1-2): High success rate (>80% get 2+ stars)
- Mid levels (Worlds 3-7): Moderate challenge (60-70% get 2+ stars)
- Late levels (Worlds 8-10): Real challenge (40-50% get 2+ stars)
- Mastery (Worlds 11-12): Hard but achievable (30-40% get 3 stars)

### 3. Reward Psychology
- **Frequent small wins** (1-star unlocks) keep momentum
- **Meaningful achievements** (3-star mastery) feel earned
- **Dimension points** provide long-term growth metric
- Consider additional rewards (badges, titles, cosmetics)

### 4. Adaptive Learning
- World 11 "Adaptive Mastery" should feel personalized
- Use performance data to recommend practice areas
- "You're strong in strategy but memory needs work - try these levels"

### 5. Accessibility
- Keyboard shortcuts for all games
- Colorblind-friendly palettes
- Adjustable timing for users with different reaction speeds
- Screen reader support where possible

---

## Technical Debt & Future Considerations

### Current Debt
- No error boundaries in training components
- No loading states for slow localStorage reads
- No validation of `params` in level definitions
- No TypeScript strict mode enforcement

### Future Features
- **Multiplayer challenge levels** - compete in real-time
- **Custom level builder** - community content
- **Training plans** - "30-day memory boost"
- **Achievements** - "Complete all strategy levels"
- **Daily challenges** - bonus levels with time limits
- **Training history** - calendar view of activity
- **Export progress** - download CSV/JSON of all attempts

---

## Conclusion

Your training module has a **solid architectural foundation** with:
- ✅ Clean separation of config/logic/UI
- ✅ Extensible mechanic system
- ✅ Well-designed progression structure
- ✅ Type-safe implementation

**Critical gaps:**
- ❌ No real grading system (just placeholder)
- ❌ No backend persistence (localStorage only)
- ❌ No actual game mechanics implemented

**Recommended focus order:**
1. **Grading criteria** - Define and implement star thresholds
2. **Backend integration** - Build API + database models
3. **Game mechanics** - Implement actual games (start with Worlds 1-2)
4. **Polish & analytics** - Add insights, leaderboards, streaks

The Duolingo-style progression is excellent for user retention. With proper grading, backend sync, and engaging game mechanics, this could be a highly effective cognitive training platform.
