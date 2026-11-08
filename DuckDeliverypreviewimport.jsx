/* global React */
/* GENERATED ENGINE START: source=sokoban/engine.ts sha256=b1c7a7a9593b7ed1aa3c027f6daf99221571115f3d51632899e30ea1f3e4a8ae */
const __DUCK_DELIVERY_ENGINE__ = (() => {
const directionDelta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRECTIONS = new Set(Object.keys(directionDelta));
const key = ([x, y]) => `${x},${y}`;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const occupied = (parcels, p) => parcels.findIndex((parcel) => same(parcel, p));
function validateLevel(level) {
    const width = level.terrain[0]?.length ?? 0;
    if (!level.terrain.length || !width || level.terrain.some((row) => row.length !== width))
        throw new Error("terrain must be a nonempty rectangle");
    if (!level.parcels.length || level.parcels.length !== level.goals.length)
        throw new Error("parcel and goal counts must be nonempty and equal");
    const inBounds = (p) => Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < width;
    const floor = (p) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
    if (![level.duck, ...level.parcels, ...level.goals].every(floor))
        throw new Error("actors and goals must be on floor");
    const actors = [level.duck, ...level.parcels];
    if (actors.some((p, index) => actors.some((other, otherIndex) => index !== otherIndex && same(p, other))))
        throw new Error("actors cannot overlap");
}
function initialState(level) { validateLevel(level); return { duck: [...level.duck], parcels: level.parcels.map((p) => [...p]), moves: 0, pushes: 0 }; }
function step(level, state, direction) {
    const [dx, dy] = directionDelta[direction];
    const next = [state.duck[0] + dx, state.duck[1] + dy];
    const inBounds = (p) => p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < level.terrain[0].length;
    const isOpen = (p) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
    if (!isOpen(next))
        return state;
    const parcelIndex = occupied(state.parcels, next);
    if (parcelIndex < 0)
        return { duck: [...next], parcels: state.parcels.map((p) => [...p]), moves: state.moves + 1, pushes: state.pushes };
    const beyond = [next[0] + dx, next[1] + dy];
    if (!inBounds(beyond) || !isOpen(beyond) || occupied(state.parcels, beyond) >= 0)
        return state;
    return { duck: [...next], parcels: state.parcels.map((p, i) => i === parcelIndex ? [...beyond] : [...p]), moves: state.moves + 1, pushes: state.pushes + 1 };
}
function isWon(level, state) { return state.parcels.every((parcel) => level.goals.some((goal) => same(parcel, goal))); }
function serialize(state) { return JSON.stringify({ duck: state.duck, parcels: [...state.parcels].sort((a, b) => key(a).localeCompare(key(b))), moves: state.moves, pushes: state.pushes }); }
function hash(state) { return serialize(state); }
function plan(moves) { validatePlan(moves); return { moves: [...moves] }; }
function validatePlan(moves) {
    if (!Array.isArray(moves) || moves.length > 100 || moves.some((move) => typeof move !== "string" || !DIRECTIONS.has(move)))
        throw new Error("plan must contain at most 100 valid directions");
}
function replay(level, moves) {
    validatePlan(moves);
    let state = initialState(level);
    const trace = [serialize(state)];
    for (const direction of moves) {
        state = step(level, state, direction);
        trace.push(serialize(state));
    }
    return { trace: Object.freeze([...trace]), finalState: state, attempts: moves.length, won: isWon(level, state) };
}
function cornerDeadlocks(level, state) {
    const goalKeys = new Set(level.goals.map(key));
    const width = level.terrain[0].length;
    const isWall = (x, y) => y < 0 || y >= level.terrain.length || x < 0 || x >= width || level.terrain[y][x] === "#";
    return state.parcels.filter(([x, y]) => !goalKeys.has(key([x, y])) && ((isWall(x - 1, y) || isWall(x + 1, y)) && (isWall(x, y - 1) || isWall(x, y + 1))));
}
  return { directionDelta, validateLevel, initialState, step, isWon, serialize, hash, plan, validatePlan, replay, cornerDeadlocks };
})();
const { directionDelta, validateLevel, initialState, step, isWon, serialize, hash, plan, validatePlan, replay, cornerDeadlocks } = __DUCK_DELIVERY_ENGINE__;
/* GENERATED ENGINE END */

/* GENERATED VARIANTS START: sha256=8fc1688fa9e9b7f09847b3ca69730b55dc34ca48101fdb1b029b1beb6939424f */
const __DUCK_VARIANTS__ = globalThis.__DUCK_VARIANTS__ = (engine => {
const { initialState, isWon, step, validateLevel } = engine;
const VARIANT_VERSION = "reverse-pull-v2";
const DIRECTIONS = ["up", "right", "down", "left"];
const MAX_ATTEMPTS = 48;
const MAX_WORK = 8_000;
const MIN_SCRAMBLE_TARGET = 48;
const MAX_SCRAMBLE_TARGET = 80;
const MIN_VALID_WITNESS = 2;
const MAX_SEED_LENGTH = 128;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const key = ([x, y]) => `${x},${y}`;
const copy = (p) => [p[0], p[1]];
const hashSeed = (base, seed) => {
    const text = `${VARIANT_VERSION}\0${base.name}\0${base.terrain.join("\n")}\0${seed}`;
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        value ^= text.charCodeAt(i);
        value = Math.imul(value, 16777619);
    }
    return value >>> 0 || 1;
};
function rngFor(base, seed, attempt) {
    let value = (hashSeed(base, seed) ^ Math.imul(attempt + 1, 0x9e3779b9)) >>> 0;
    return () => {
        value ^= value << 13;
        value ^= value >>> 17;
        value ^= value << 5;
        value >>>= 0;
        return value / 0x100000000;
    };
}
function shuffle(items, random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
function floorCells(base) {
    const cells = [];
    for (let y = 0; y < base.terrain.length; y += 1) {
        for (let x = 0; x < base.terrain[y].length; x += 1) {
            if (base.terrain[y][x] !== "#")
                cells.push([x, y]);
        }
    }
    return cells;
}
function occupied(state, position) {
    return state.parcels.some((parcel) => same(parcel, position)) || same(state.duck, position);
}
function reverseWalk(base, goals, duck, random) {
    const state = { duck: copy(duck), parcels: goals.map(copy) };
    const witness = [];
    const steps = MIN_SCRAMBLE_TARGET + Math.floor(random() * (MAX_SCRAMBLE_TARGET - MIN_SCRAMBLE_TARGET + 1));
    let work = 0;
    for (let i = 0; i < steps; i += 1) {
        const candidates = [];
        for (const direction of shuffle(DIRECTIONS, random)) {
            work += 1;
            if (work > MAX_WORK)
                break;
            const [dx, dy] = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[direction];
            const adjacent = [state.duck[0] + dx, state.duck[1] + dy];
            const behind = [state.duck[0] - dx, state.duck[1] - dy];
            const inFloor = (p) => p[1] >= 0 && p[1] < base.terrain.length && p[0] >= 0 && p[0] < base.terrain[0].length && base.terrain[p[1]][p[0]] !== "#";
            const parcelIndex = state.parcels.findIndex((parcel) => same(parcel, adjacent));
            if (parcelIndex >= 0 && inFloor(behind) && !state.parcels.some((parcel, index) => index !== parcelIndex && same(parcel, behind))) {
                const parcels = state.parcels.map(copy);
                parcels[parcelIndex] = copy(state.duck);
                candidates.push({ state: { duck: copy(behind), parcels }, direction, push: true });
            }
            else if (inFloor(adjacent) && !occupied(state, adjacent)) {
                const opposite = direction === "up" ? "down" : direction === "down" ? "up" : direction === "left" ? "right" : "left";
                candidates.push({ state: { duck: copy(adjacent), parcels: state.parcels.map(copy) }, direction: opposite, push: false });
            }
        }
        const pulling = candidates.filter((candidate) => candidate.push);
        if (!candidates.length)
            break;
        const pool = pulling.length ? pulling : candidates;
        const chosen = pool[Math.floor(random() * pool.length)];
        state.duck = chosen.state.duck;
        state.parcels = chosen.state.parcels;
        witness.push(chosen.direction);
    }
    const offGoal = state.parcels.filter((parcel) => !goals.some((goal) => same(parcel, goal))).length;
    const offGoalParcels = state.parcels.filter((parcel) => !goals.some((goal) => same(parcel, goal)));
    const minPushDistance = offGoal ? Math.min(...offGoalParcels.map((parcel) => Math.min(...goals.map((goal) => Math.abs(parcel[0] - goal[0]) + Math.abs(parcel[1] - goal[1]))))) : 0;
    return { puzzle: state, witness: witness.reverse(), moved: offGoal, minPushDistance };
}
function normalizedPositions(positions) {
    return positions.map(key).sort().join(";");
}
function minimumAssignmentDistance(parcels, goals) {
    const used = new Set();
    let best = Number.POSITIVE_INFINITY;
    const visit = (index, total) => {
        if (total >= best)
            return;
        if (index === parcels.length) {
            best = total;
            return;
        }
        for (let goal = 0; goal < goals.length; goal += 1) {
            if (used.has(goal))
                continue;
            used.add(goal);
            visit(index + 1, total + Math.abs(parcels[index][0] - goals[goal][0]) + Math.abs(parcels[index][1] - goals[goal][1]));
            used.delete(goal);
        }
    };
    visit(0, 0);
    return best;
}
function verified(base, goals, candidate, witness, moved, minPushDistance) {
    const puzzle = { ...base, goals, duck: candidate.duck, parcels: candidate.parcels };
    const requiredMoved = Math.min(2, candidate.parcels.length);
    const lowerBound = minimumAssignmentDistance(candidate.parcels, goals);
    if (witness.length < MIN_VALID_WITNESS || witness.length > 100 || moved < requiredMoved || lowerBound < Math.max(2, candidate.parcels.length) || minPushDistance < 1 || isWon(puzzle, initialState(puzzle)))
        return false;
    let state = initialState(puzzle);
    for (const direction of witness)
        state = step(puzzle, state, direction);
    return isWon(puzzle, state);
}
function normalizeSeed(seed) {
    return String(seed).slice(0, MAX_SEED_LENGTH);
}
function generateVariant(base, seed) {
    validateLevel(base);
    const normalizedSeed = normalizeSeed(seed);
    const metadata = { version: VARIANT_VERSION, seed: normalizedSeed };
    const floors = floorCells(base);
    if (floors.length <= base.parcels.length + 1)
        return { ok: false, metadata, reason: "unavailable" };
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const random = rngFor(base, normalizedSeed, attempt);
        const selected = shuffle(floors, random);
        const goals = selected.slice(0, base.parcels.length);
        const duck = selected.find((cell) => !goals.some((goal) => same(goal, cell)));
        if (!duck)
            continue;
        const scrambled = reverseWalk(base, goals, duck, random);
        if (scrambled.witness.length > 100)
            continue;
        const puzzle = { ...base, baseName: base.name, duck: copy(scrambled.puzzle.duck), parcels: scrambled.puzzle.parcels.map(copy), goals: goals.map(copy) };
        if (normalizedPositions(puzzle.parcels) === normalizedPositions(base.parcels) && normalizedPositions(puzzle.goals) === normalizedPositions(base.goals))
            continue;
        if (!verified(base, goals, scrambled.puzzle, scrambled.witness, scrambled.moved, scrambled.minPushDistance))
            continue;
        return { ok: true, metadata, puzzle };
    }
    return { ok: false, metadata, reason: "unavailable" };
}

return { generateVariant, VARIANT_VERSION };
})(__DUCK_DELIVERY_ENGINE__);
const { generateVariant, VARIANT_VERSION } = __DUCK_VARIANTS__;
/* GENERATED VARIANTS END */

const DUCK_LEVELS=[
 {name:'Dock 01 · First Parcel',terrain:['########','#      #','########'],duck:[1,1],parcels:[[3,1]],goals:[[6,1]]},
 {name:'Dock 02 · Pairing Order',terrain:['#########','#       #','#       #','#       #','#########'],duck:[1,1],parcels:[[3,1],[5,1]],goals:[[7,1],[2,1]]},
 {name:'Dock 03 · Wall Pocket',terrain:['#########','#       #','# ###   #','#       #','#########'],duck:[1,3],parcels:[[3,3]],goals:[[7,3]]},
  {name:'Dock 04 · Three Wide',terrain:['###########','#         #','#         #','#         #','###########'],duck:[1,1],parcels:[[3,1],[5,1],[7,1]],goals:[[9,1],[4,1],[2,1]]},
 {name:'Dock 05 · Turnaround',terrain:['#########','#   #   #','#       #','#   #   #','#########'],duck:[1,2],parcels:[[2,2],[6,2]],goals:[[2,3],[6,1]]},
 {name:'Dock 06 · Final Sort',terrain:['###########','#         #','#         #','#         #','###########'],duck:[1,3],parcels:[[3,3],[5,3],[8,3]],goals:[[9,3],[2,3],[6,3]]}
];
const RECORDED_AGENT_DEMOS = [
  {
    "taskId": "duck-01",
    "level": {
      "name": "Benchmark 01",
      "terrain": [
        "#########",
        "#       #",
        "#  #    #",
        "#       #",
        "#    #  #",
        "#       #",
        "#########"
      ],
      "duck": [
        7,
        4
      ],
      "parcels": [
        [
          2,
          4
        ],
        [
          6,
          4
        ]
      ],
      "goals": [
        [
          2,
          1
        ],
        [
          6,
          5
        ]
      ]
    },
    "baselineSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wf2sq10xaahj4ck2kjjw4x?try_agent_name=duck-delivery-planner",
    "improvedSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wjvxchxn1xrhgvx19j5gz0?try_agent_name=duck-delivery-planner-v3",
    "learningSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wjea7n7e4ktr984x9x60hg",
    "skillUrl": "https://github.com/MichaelHo02/TrueForge-Thach/blob/8ce41b4/runs/duck-improvement-02/candidate-SKILL.md",
    "reportUrl": "https://github.com/MichaelHo02/TrueForge-Thach/blob/877c2b9/VERDICT.md",
    "moves": [
      "down",
      "left",
      "left",
      "left",
      "left",
      "left",
      "up",
      "up",
      "up",
      "down",
      "right",
      "right",
      "right",
      "right",
      "down"
    ],
    "trace": [
      "{\"duck\":[7,4],\"parcels\":[[2,4],[6,4]],\"moves\":0,\"pushes\":0}",
      "{\"duck\":[7,5],\"parcels\":[[2,4],[6,4]],\"moves\":1,\"pushes\":0}",
      "{\"duck\":[6,5],\"parcels\":[[2,4],[6,4]],\"moves\":2,\"pushes\":0}",
      "{\"duck\":[5,5],\"parcels\":[[2,4],[6,4]],\"moves\":3,\"pushes\":0}",
      "{\"duck\":[4,5],\"parcels\":[[2,4],[6,4]],\"moves\":4,\"pushes\":0}",
      "{\"duck\":[3,5],\"parcels\":[[2,4],[6,4]],\"moves\":5,\"pushes\":0}",
      "{\"duck\":[2,5],\"parcels\":[[2,4],[6,4]],\"moves\":6,\"pushes\":0}",
      "{\"duck\":[2,4],\"parcels\":[[2,3],[6,4]],\"moves\":7,\"pushes\":1}",
      "{\"duck\":[2,3],\"parcels\":[[2,2],[6,4]],\"moves\":8,\"pushes\":2}",
      "{\"duck\":[2,2],\"parcels\":[[2,1],[6,4]],\"moves\":9,\"pushes\":3}",
      "{\"duck\":[2,3],\"parcels\":[[2,1],[6,4]],\"moves\":10,\"pushes\":3}",
      "{\"duck\":[3,3],\"parcels\":[[2,1],[6,4]],\"moves\":11,\"pushes\":3}",
      "{\"duck\":[4,3],\"parcels\":[[2,1],[6,4]],\"moves\":12,\"pushes\":3}",
      "{\"duck\":[5,3],\"parcels\":[[2,1],[6,4]],\"moves\":13,\"pushes\":3}",
      "{\"duck\":[6,3],\"parcels\":[[2,1],[6,4]],\"moves\":14,\"pushes\":3}",
      "{\"duck\":[6,4],\"parcels\":[[2,1],[6,5]],\"moves\":15,\"pushes\":4}"
    ],
    "skillRule": "5. **Plan completely before testing. Complete exactly one tool call that (a) loads the puzzle, (b) saves your full move sequence to /tmp/plan.json, (c) calls the canonical adapter, and (d) checks if solved==true. If solved==true, immediately print the JSON plan and stop. If solved==false, do not test again—submit your best effort immediately as JSON with no further iteration.**",
    "holdout": false,
    "baselineRound": 1,
    "improvedRound": 2
  },
  {
    "taskId": "duck-02",
    "level": {
      "name": "Benchmark 02",
      "terrain": [
        "#########",
        "#       #",
        "#  #    #",
        "#       #",
        "#    #  #",
        "#       #",
        "#########"
      ],
      "duck": [
        2,
        1
      ],
      "parcels": [
        [
          2,
          2
        ],
        [
          5,
          2
        ]
      ],
      "goals": [
        [
          2,
          1
        ],
        [
          6,
          5
        ]
      ]
    },
    "baselineSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wfjh79x3aecn6mwwx4n06g?try_agent_name=duck-delivery-planner",
    "improvedSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wjvxx0ns7q1t4g6qpm202y?try_agent_name=duck-delivery-planner-v3",
    "learningSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wjea7n7e4ktr984x9x60hg",
    "skillUrl": "https://github.com/MichaelHo02/TrueForge-Thach/blob/8ce41b4/runs/duck-improvement-02/candidate-SKILL.md",
    "reportUrl": "https://github.com/MichaelHo02/TrueForge-Thach/blob/877c2b9/VERDICT.md",
    "moves": [
      "right",
      "right",
      "down",
      "down",
      "left",
      "left",
      "up",
      "down",
      "right",
      "right",
      "up",
      "right",
      "down",
      "right",
      "right",
      "up",
      "up",
      "left",
      "down",
      "down",
      "down"
    ],
    "trace": [
      "{\"duck\":[2,1],\"parcels\":[[2,2],[5,2]],\"moves\":0,\"pushes\":0}",
      "{\"duck\":[3,1],\"parcels\":[[2,2],[5,2]],\"moves\":1,\"pushes\":0}",
      "{\"duck\":[4,1],\"parcels\":[[2,2],[5,2]],\"moves\":2,\"pushes\":0}",
      "{\"duck\":[4,2],\"parcels\":[[2,2],[5,2]],\"moves\":3,\"pushes\":0}",
      "{\"duck\":[4,3],\"parcels\":[[2,2],[5,2]],\"moves\":4,\"pushes\":0}",
      "{\"duck\":[3,3],\"parcels\":[[2,2],[5,2]],\"moves\":5,\"pushes\":0}",
      "{\"duck\":[2,3],\"parcels\":[[2,2],[5,2]],\"moves\":6,\"pushes\":0}",
      "{\"duck\":[2,2],\"parcels\":[[2,1],[5,2]],\"moves\":7,\"pushes\":1}",
      "{\"duck\":[2,3],\"parcels\":[[2,1],[5,2]],\"moves\":8,\"pushes\":1}",
      "{\"duck\":[3,3],\"parcels\":[[2,1],[5,2]],\"moves\":9,\"pushes\":1}",
      "{\"duck\":[4,3],\"parcels\":[[2,1],[5,2]],\"moves\":10,\"pushes\":1}",
      "{\"duck\":[4,2],\"parcels\":[[2,1],[5,2]],\"moves\":11,\"pushes\":1}",
      "{\"duck\":[5,2],\"parcels\":[[2,1],[6,2]],\"moves\":12,\"pushes\":2}",
      "{\"duck\":[5,3],\"parcels\":[[2,1],[6,2]],\"moves\":13,\"pushes\":2}",
      "{\"duck\":[6,3],\"parcels\":[[2,1],[6,2]],\"moves\":14,\"pushes\":2}",
      "{\"duck\":[7,3],\"parcels\":[[2,1],[6,2]],\"moves\":15,\"pushes\":2}",
      "{\"duck\":[7,2],\"parcels\":[[2,1],[6,2]],\"moves\":16,\"pushes\":2}",
      "{\"duck\":[7,1],\"parcels\":[[2,1],[6,2]],\"moves\":17,\"pushes\":2}",
      "{\"duck\":[6,1],\"parcels\":[[2,1],[6,2]],\"moves\":18,\"pushes\":2}",
      "{\"duck\":[6,2],\"parcels\":[[2,1],[6,3]],\"moves\":19,\"pushes\":3}",
      "{\"duck\":[6,3],\"parcels\":[[2,1],[6,4]],\"moves\":20,\"pushes\":4}",
      "{\"duck\":[6,4],\"parcels\":[[2,1],[6,5]],\"moves\":21,\"pushes\":5}"
    ],
    "skillRule": "5. **Plan completely before testing. Complete exactly one tool call that (a) loads the puzzle, (b) saves your full move sequence to /tmp/plan.json, (c) calls the canonical adapter, and (d) checks if solved==true. If solved==true, immediately print the JSON plan and stop. If solved==false, do not test again—submit your best effort immediately as JSON with no further iteration.**",
    "holdout": false,
    "baselineRound": 2,
    "improvedRound": 1
  },
  {
    "taskId": "duck-06",
    "level": {
      "name": "Benchmark 06",
      "terrain": [
        "#########",
        "#       #",
        "#  #    #",
        "#       #",
        "#    #  #",
        "#       #",
        "#########"
      ],
      "duck": [
        6,
        5
      ],
      "parcels": [
        [
          2,
          1
        ],
        [
          6,
          4
        ],
        [
          2,
          4
        ]
      ],
      "goals": [
        [
          2,
          1
        ],
        [
          6,
          1
        ],
        [
          6,
          5
        ]
      ]
    },
    "baselineSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wg6rbgxmxzegdd8a76e9qx?try_agent_name=duck-delivery-planner",
    "improvedSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wk7yzwp06h39rqf4cnkmmn?try_agent_name=duck-delivery-planner-v3",
    "learningSession": "https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wjea7n7e4ktr984x9x60hg",
    "skillUrl": "https://github.com/MichaelHo02/TrueForge-Thach/blob/8ce41b4/runs/duck-improvement-02/candidate-SKILL.md",
    "reportUrl": "https://github.com/MichaelHo02/TrueForge-Thach/blob/877c2b9/VERDICT.md",
    "moves": [
      "up",
      "up",
      "up",
      "down",
      "left",
      "left",
      "left",
      "left",
      "down",
      "left",
      "down",
      "right",
      "right",
      "right",
      "right"
    ],
    "trace": [
      "{\"duck\":[6,5],\"parcels\":[[2,1],[2,4],[6,4]],\"moves\":0,\"pushes\":0}",
      "{\"duck\":[6,4],\"parcels\":[[2,1],[2,4],[6,3]],\"moves\":1,\"pushes\":1}",
      "{\"duck\":[6,3],\"parcels\":[[2,1],[2,4],[6,2]],\"moves\":2,\"pushes\":2}",
      "{\"duck\":[6,2],\"parcels\":[[2,1],[2,4],[6,1]],\"moves\":3,\"pushes\":3}",
      "{\"duck\":[6,3],\"parcels\":[[2,1],[2,4],[6,1]],\"moves\":4,\"pushes\":3}",
      "{\"duck\":[5,3],\"parcels\":[[2,1],[2,4],[6,1]],\"moves\":5,\"pushes\":3}",
      "{\"duck\":[4,3],\"parcels\":[[2,1],[2,4],[6,1]],\"moves\":6,\"pushes\":3}",
      "{\"duck\":[3,3],\"parcels\":[[2,1],[2,4],[6,1]],\"moves\":7,\"pushes\":3}",
      "{\"duck\":[2,3],\"parcels\":[[2,1],[2,4],[6,1]],\"moves\":8,\"pushes\":3}",
      "{\"duck\":[2,4],\"parcels\":[[2,1],[2,5],[6,1]],\"moves\":9,\"pushes\":4}",
      "{\"duck\":[1,4],\"parcels\":[[2,1],[2,5],[6,1]],\"moves\":10,\"pushes\":4}",
      "{\"duck\":[1,5],\"parcels\":[[2,1],[2,5],[6,1]],\"moves\":11,\"pushes\":4}",
      "{\"duck\":[2,5],\"parcels\":[[2,1],[3,5],[6,1]],\"moves\":12,\"pushes\":5}",
      "{\"duck\":[3,5],\"parcels\":[[2,1],[4,5],[6,1]],\"moves\":13,\"pushes\":6}",
      "{\"duck\":[4,5],\"parcels\":[[2,1],[5,5],[6,1]],\"moves\":14,\"pushes\":7}",
      "{\"duck\":[5,5],\"parcels\":[[2,1],[6,1],[6,5]],\"moves\":15,\"pushes\":8}"
    ],
    "skillRule": "5. **Plan completely before testing. Complete exactly one tool call that (a) loads the puzzle, (b) saves your full move sequence to /tmp/plan.json, (c) calls the canonical adapter, and (d) checks if solved==true. If solved==true, immediately print the JSON plan and stop. If solved==false, do not test again—submit your best effort immediately as JSON with no further iteration.**",
    "holdout": true,
    "baselineRound": 1,
    "improvedRound": 2
  }
];
DUCK_LEVELS.forEach(validateLevel);
  const createGame=(levelIndex=0,generation=0,activeLevel=DUCK_LEVELS[levelIndex],activeSeed=null)=>({levelIndex,activeLevel,activeSeed,benchmarkTask:null,state:initialState(activeLevel),history:[],replay:null,recordedDemo:null,recordedDemoIndex:null,generation,variantError:null});
 function gameReducer(game,a){
  const reset=(levelIndex,activeLevel=DUCK_LEVELS[levelIndex],activeSeed=null,variantError=null)=>({levelIndex,activeLevel,activeSeed,benchmarkTask:null,state:initialState(activeLevel),history:[],replay:null,recordedDemo:null,recordedDemoIndex:null,generation:game.generation+1,variantError});
  if(a.type==='benchmark'){
   const task=globalThis.__DUCK_BENCHMARK_TASKS__?.find(task=>task.id===a.taskId);
   if(!task)return game;
   return {...reset(game.levelIndex,task.level),benchmarkTask:task.id};
  }
  if(a.type==='recorded-demo'||(a.type==='restart'&&game.recordedDemo)){
   const kind=a.type==='restart'?game.recordedDemo:a.kind;
   if(!['baseline','improved'].includes(kind))return game;
   const demoIndex=a.demoIndex??game.recordedDemoIndex??0,demo=RECORDED_AGENT_DEMOS[demoIndex];
   if(!demo)return game;
   const fresh={...reset(game.levelIndex,demo.level),recordedDemoIndex:demoIndex};
   if(kind==='baseline')return {...fresh,recordedDemo:kind};
   const result=replay(demo.level,demo.moves);
   if(!result.won||JSON.stringify(result.trace)!==JSON.stringify(demo.trace))throw new Error('Recorded agent trace does not match the canonical engine');
   const states=[initialState(demo.level)];for(const direction of demo.moves)states.push(step(demo.level,states.at(-1),direction));
   return {...fresh,recordedDemo:kind,replay:{trace:result.trace,states,index:0}};
  }
  if(game.recordedDemo&&['move','undo','variant','load-replay','unload-replay'].includes(a.type))return game;
  if(a.type==='select'||a.type==='original')return reset(a.type==='select'?a.levelIndex:game.levelIndex);
  if(a.type==='restart')return {...reset(game.levelIndex,game.activeLevel,game.activeSeed),benchmarkTask:game.benchmarkTask};
  if(a.type==='variant'){
   const result=globalThis.__DUCK_VARIANTS__?.generateVariant?.(DUCK_LEVELS[game.levelIndex],a.seed);
   if(!result?.ok)return {...game,history:[],replay:null,generation:game.generation+1,variantError:'That seed is unavailable for this route. Try another seed.'};
   initialState(result.puzzle);
   return reset(game.levelIndex,result.puzzle,result.metadata.seed);
  }
   if(a.type==='undo'&&game.history.length)return {...game,state:game.history.at(-1),history:game.history.slice(0,-1),replay:null,generation:game.generation+1};
   if(a.type==='move'){const n=step(game.activeLevel,game.state,a.direction);return n===game.state?{...game,replay:null,generation:game.generation+1}:{...game,state:n,history:[...game.history,game.state],replay:null,generation:game.generation+1};}
    if(a.type==='load-replay')return {...game,state:a.states[0],history:[],replay:{trace:a.trace,states:a.states,index:0},generation:game.generation+1};
    if(a.type==='unload-replay')return {...game,replay:null,generation:game.generation+1};
    if(a.type==='replay-step'){return !game.replay||a.generation!==game.generation||a.index>=game.replay.trace.length?game:{...game,state:a.state,replay:{...game.replay,index:a.index}};}
   return game;
  }
 function PreviewPage(){
   const[game,dispatch]=React.useReducer(gameReducer,0,createGame),[planText,setPlanText]=React.useState(''),[message,setMessage]=React.useState(''),[playing,setPlaying]=React.useState(false),[seedDraft,setSeedDraft]=React.useState(''),[benchmarkChoice,setBenchmarkChoice]=React.useState('duck-01'),[recordedChoice,setRecordedChoice]=React.useState(0),[replayDelay,setReplayDelay]=React.useState(260),timer=React.useRef(null);
   const gameRef=React.useRef(game),[webMCP,setWebMCP]=React.useState({status:'checking',calls:0,lastCall:null});
   React.useLayoutEffect(()=>{gameRef.current=game;},[game]);
   React.useEffect(()=>{
    const register=globalThis.__DUCK_REGISTER_WEBMCP__;
    if(!register){setWebMCP(s=>({...s,status:'unsupported'}));return;}
    return register({getGame:()=>gameRef.current,commit:action=>{setPlaying(false);setMessage('');dispatch(action);},engine:{isWon,cornerDeadlocks},onStatus:update=>setWebMCP(s=>({...s,...update})),onCall:call=>setWebMCP(s=>({...s,calls:s.calls+1,lastCall:call}))});
   },[]);
   const recordedDemo=game.recordedDemo, demo=RECORDED_AGENT_DEMOS[game.recordedDemoIndex??recordedChoice];
   const level=game.activeLevel||DUCK_LEVELS[game.levelIndex], state=game.state, won=isWon(level,state), dead=cornerDeadlocks(level,state).length>0;
   const move=d=>{setPlaying(false);dispatch({type:'move',direction:d});};
   const loadSeed=seed=>{setPlaying(false);dispatch({type:'variant',seed:String(seed).slice(0,128)});setMessage('');};
   const shuffleSeed=()=>{if(!globalThis.crypto?.getRandomValues){setMessage('Secure randomness is unavailable; enter a seed manually.');return;}const bytes=new Uint32Array(2);globalThis.crypto.getRandomValues(bytes);loadSeed(`${bytes[0].toString(36)}-${bytes[1].toString(36)}`);};
   const originalRoute=()=>{setPlaying(false);dispatch({type:'original'});setSeedDraft('');setMessage('');};
  React.useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  React.useEffect(()=>{if(!playing||!game.replay||game.replay.index>=game.replay.states.length-1){setPlaying(false);return;}const generation=game.generation;timer.current=setTimeout(()=>{const i=game.replay.index+1;dispatch({type:'replay-step',generation,index:i,state:game.replay.states[i]});},recordedDemo?replayDelay:260);return()=>clearTimeout(timer.current);},[playing,game.replay,game.generation,replayDelay,recordedDemo]);
  React.useEffect(()=>{const keys={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'},onKey=e=>{const t=e.target instanceof Element?e.target:null;if(t?.closest('select, input, textarea, [contenteditable]:not([contenteditable="false"])'))return;const d=keys[e.key];if(d){e.preventDefault();move(d);}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);});
  const reset=()=>{setPlaying(false);dispatch({type:'restart'});setMessage('');};
   const showRecorded=(kind,demoIndex=recordedChoice)=>{setPlaying(false);dispatch({type:'recorded-demo',kind,demoIndex});setPlanText(kind==='improved'?JSON.stringify({moves:RECORDED_AGENT_DEMOS[demoIndex].moves}):'');setMessage('');};
   const importReplay=()=>{try{const parsed=JSON.parse(planText),moves=Array.isArray(parsed)?parsed:parsed.moves,result=replay(level,moves);const initial=initialState(level),states=[initial];let s=initial;for(const d of moves){s=step(level,s,d);states.push(s);}if(states.some((item,i)=>serialize(item)!==result.trace[i]))throw new Error('trace serialization mismatch');setPlaying(false);dispatch({type:'load-replay',trace:result.trace,states});setMessage(`Verified trace: ${result.attempts} attempts${result.won?' · solved':''}. Press play or step.`);}catch(e){setMessage(`Replay rejected: ${e.message}`);}};
  const replayData=game.replay, stepReplay=()=>{if(replayData&&replayData.index<replayData.states.length-1){const i=replayData.index+1;dispatch({type:'replay-step',generation:game.generation,index:i,state:replayData.states[i]});}};
 return <main className={`duck-app${recordedDemo?' agent-demo-active':''}`}><header className="duck-header"><div><p className="eyebrow">DUCK DELIVERY / SORTING FLOOR</p><h1>Duck Delivery</h1><p className="intro">A classic Sokoban shift. Order every parcel onto its teal pad without trapping the route.</p></div><div className="duck-mark" aria-hidden="true">🦆</div></header>
  <section className="game-shell" aria-label="Sokoban game">
 <section className="webmcp-panel" aria-label="Live WebMCP agent control"><b>Live agent control · WebMCP</b><p>{webMCP.status==='ready'?'Connected · 3 tools available. Ask your browser agent to solve the current route.':webMCP.status==='checking'?'Checking browser support…':webMCP.status==='error'?'WebMCP registration failed. Reload to retry; manual play is available.':'WebMCP is unavailable in this browser. Manual play and recorded demos still work.'} {recordedDemo&&'Exit agent demo to allow live moves.'}</p>{webMCP.status==='ready'&&<p className="webmcp-receipt">{webMCP.calls} tool calls{webMCP.lastCall&&` · ${webMCP.lastCall.tool}${webMCP.lastCall.direction?' '+webMCP.lastCall.direction:''}: ${webMCP.lastCall.outcome}`} · Live calls control this board; the recordings below are historical.</p>}</section>
 <section className="recorded-demo" aria-label="Live benchmark"><div className="demo-heading"><b>Live benchmark</b><span>Eight frozen puzzles · fresh agent plans · no saved answers</span></div><div className="demo-actions"><label className="demo-picker">Benchmark puzzle <select aria-label="Benchmark puzzle" value={benchmarkChoice} onChange={e=>setBenchmarkChoice(e.target.value)}>{(globalThis.__DUCK_BENCHMARK_TASKS__||[]).map(task=><option key={task.id} value={task.id}>{task.id} · {task.level.parcels.length} parcels{task.holdout?' · held out':''}</option>)}</select></label><button onClick={()=>{setPlaying(false);dispatch({type:'benchmark',taskId:benchmarkChoice});setPlanText('');setMessage('');}}>Load live benchmark</button>{game.benchmarkTask&&<button className="secondary" onClick={originalRoute}>Exit live benchmark</button>}</div>{game.benchmarkTask&&<p>Live {game.benchmarkTask} · starts from the frozen initial board. The connected agent reads this board and sends new moves through WebMCP. No recorded answer is loaded.</p>}</section>
 {!game.benchmarkTask&&<section className="recorded-demo" aria-label="Recorded agent demo"><div className="demo-heading"><b>Recorded agent demo</b><span>Shelled AI built the game · TrueForge ran the skill-learning experiments</span></div><div className="demo-actions"><label className="demo-picker">Recorded puzzle <select aria-label="Recorded puzzle" value={recordedChoice} onChange={e=>{const i=Number(e.target.value);setRecordedChoice(i);if(recordedDemo)showRecorded(recordedDemo,i);}}>{RECORDED_AGENT_DEMOS.map((x,i)=><option key={x.taskId} value={i}>{x.taskId} · {x.level.parcels.length} parcels{x.holdout?' · held out':''}</option>)}</select></label><button className="secondary" onClick={()=>showRecorded('baseline')}>Watch baseline failure</button><button onClick={()=>showRecorded('improved')}>Watch improved agent</button>{recordedDemo==='improved'&&<><label className="demo-picker">Playback pace <select aria-label="Playback pace" value={replayDelay} onChange={e=>setReplayDelay(Number(e.target.value))}><option value={260}>Normal</option><option value={650}>Slow</option></select></label><button onClick={()=>setPlaying(true)} disabled={playing||replayData?.index===replayData?.states.length-1}>Play agent plan</button><button className="secondary" onClick={()=>setPlaying(false)}>Pause agent</button></>}{recordedDemo&&<button className="secondary" onClick={originalRoute}>Exit agent demo</button>}</div>
 {recordedDemo&&<div className="demo-evidence"><p className="demo-outcome">{recordedDemo==='baseline'?`Baseline v1 · round ${demo.baselineRound} · ${demo.taskId}: iteration limit 12 reached; no valid final plan was submitted.`:`Improved v3 · round ${demo.improvedRound} · ${demo.taskId}: exact recorded ${demo.moves.length}-move plan, validated by the canonical engine.${demo.holdout?' Held-out arrangement.':''}`} {recordedDemo==='improved'&&`Replay ${replayData.index}/${demo.moves.length}.`}</p><p>Recorded experiment, not a live inference. {recordedDemo==='baseline'?'The board remains at its initial state because the agent submitted no plan.':'Every replay move comes from the saved agent response; manual movement is disabled in this mode.'}</p><div className="demo-sources"><a href={demo.baselineSession} target="_blank" rel="noreferrer">Baseline run</a><a href={demo.learningSession} target="_blank" rel="noreferrer">Skill learning session</a><a href={demo.improvedSession} target="_blank" rel="noreferrer">Improved run</a><a href={demo.reportUrl} target="_blank" rel="noreferrer">All results</a></div><details className="demo-receipt"><summary>{recordedDemo==='baseline'?'Baseline tool receipt':'Recorded agent answer'}</summary>{recordedDemo==='baseline'?<><p>Archived tool command: <code>cat /opt/tf/skills/duck-planning/SKILL.md</code>. The baseline loaded its registered v1 skill, then exhausted its planning/testing budget.</p><pre>{'You have reached iteration limit of 12, please request again\nFinal submitted reply: empty\nCanonical result: unsolved'}</pre></>:<pre>{JSON.stringify({moves:demo.moves},null,2)}</pre>}</details><details className="demo-learning"><summary>How the agent learned</summary><p>A separate TrueForge agent reviewed failed development traces and diagnosed repeated planning/testing loops. V2 failed both comparisons. V3 rewrote one planning procedure; model weights stayed unchanged.</p><blockquote>{demo.skillRule}</blockquote><a href={demo.skillUrl} target="_blank" rel="noreferrer">Exact agent-authored skill</a><p>Overall baselines: 25%, 0%, 37.5%. V2: 0%, 0%. V3: 75%, 75%; held out: 50%, 50%. Eight fixed puzzles on familiar terrain; four held-out arrangements. No unseen-map claim.</p></details></div>}
 </section>}<div className="game-toolbar">{game.benchmarkTask?<strong>{game.benchmarkTask} · {level.name} · LIVE</strong>:recordedDemo?<strong>{demo.level.name} · recorded {recordedDemo}</strong>:<label htmlFor="level">ROUTE <select id="level" value={game.levelIndex} onChange={e=>{setPlaying(false);dispatch({type:'select',levelIndex:Number(e.target.value)});setSeedDraft('');setMessage('');}}>{DUCK_LEVELS.map((x,i)=><option key={x.name} value={i}>{x.name}</option>)}</select></label>}{!recordedDemo&&!game.benchmarkTask&&<div className="variant-controls"><input id="seed" maxLength={128} value={seedDraft} onChange={e=>setSeedDraft(e.target.value)} placeholder="seed" aria-label="Variant seed"/><button className="secondary" onClick={()=>loadSeed(seedDraft)}>Load seed</button><button className="secondary" onClick={shuffleSeed}>Shuffle challenge</button><button className="secondary" onClick={originalRoute}>Original route</button></div>}<div className="stats"><span><b>{state.moves}</b> moves</span><span><b>{state.pushes}</b> pushes</span><span><b>{level.parcels.length}</b> parcels</span></div></div>
 <div className="board-wrap"><div className="board" style={{'--cols':level.terrain[0].length}} role="grid" aria-label={`${level.name} warehouse`}>{level.terrain.flatMap((row,y)=>[...row].map((tile,x)=>{const p=[x,y],parcel=state.parcels.some(q=>q[0]===x&&q[1]===y),duck=state.duck[0]===x&&state.duck[1]===y,goal=level.goals.some(q=>q[0]===x&&q[1]===y);return <div key={`${x}-${y}`} className={`tile ${tile==='#'?'wall':'floor'} ${goal?'goal':''}`} role="gridcell">{goal&&<span className="pad">✦</span>}{parcel&&<span className="box">▣</span>}{duck&&<span className="duck">●</span>}</div>;}))}</div></div>
  <div className="variant-meta">{game.benchmarkTask?`Live benchmark · ${game.benchmarkTask}`:recordedDemo?`Recorded TrueForge benchmark · ${demo.taskId}`:game.activeSeed===null?'Original route':`Seed: ${game.activeSeed} · ${globalThis.__DUCK_VARIANTS__?.VARIANT_VERSION||'variant'}`} <span>{game.benchmarkTask?'Fresh model execution via WebMCP.':recordedDemo?'Same initial puzzle as the source run.':'Same route + seed reproduces this challenge.'}</span></div><div className={`status ${won?'complete':''}`} role="status">{recordedDemo==='baseline'?'Baseline stopped without a final plan; see the failure receipt above.':game.variantError|| (won?'Route complete! Every parcel is delivered.':dead?'Corner trap: a parcel is off a goal in a static corner. Undo or restart to recover.':'Push every parcel onto a teal star. Plan the order before pushing.')}</div>
 <div className="controls"><button className="secondary" onClick={()=>dispatch({type:'undo'})} disabled={!!recordedDemo||!game.history.length}>↶ Undo</button><div className="dpad"><button onClick={()=>move('up')} disabled={!!recordedDemo} aria-label="Move up">↑</button><div><button onClick={()=>move('left')} disabled={!!recordedDemo} aria-label="Move left">←</button><button onClick={()=>move('down')} disabled={!!recordedDemo} aria-label="Move down">↓</button><button onClick={()=>move('right')} disabled={!!recordedDemo} aria-label="Move right">→</button></div></div><button className="secondary" onClick={reset}>Restart</button></div>
 {!recordedDemo&&!game.benchmarkTask&&<details className="replay-panel"><summary>Verified replay lab</summary><p>Import a JSON array or {`{"moves":[...]}`} of directions. Only validated traces can be watched.</p><textarea value={planText} onChange={e=>setPlanText(e.target.value)} placeholder='["right", "right"]' aria-label="Replay plan"/><div className="replay-actions"><button onClick={importReplay}>Verify trace</button><button onClick={()=>{setPlaying(true);}} disabled={!replayData}>Play</button><button onClick={()=>{setPlaying(false);}}>Pause</button><button onClick={stepReplay} disabled={!replayData}>Step</button><button onClick={()=>{setPlaying(false);setMessage('');}}>Clear message</button><button onClick={()=>{setPlaying(false);dispatch({type:'unload-replay'});setMessage('');}}>Unload</button></div>{message&&<p className="replay-message">{message}</p>}</details>}
</section><footer className="duck-footer"><span>ARROW KEYS / WASD TO MOVE</span><span>Pure engine · verified replay traces · no canned gains</span></footer></main>;
}
globalThis.__DUCK_GAME_REDUCER__={createGame,gameReducer};
globalThis.__DUCK_PREVIEW_PAGE__=PreviewPage;