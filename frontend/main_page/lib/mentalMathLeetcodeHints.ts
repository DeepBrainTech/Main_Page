import type { MentalMathSecret } from "@/types/learning";

const MAX_HINTS = 3;

function parseNumbers(expression: string): number[] {
  const normalized = expression.replace(/×/g, "*").replace(/−/g, "-");
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) {
    return [];
  }
  return matches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function splitTensOnes(n: number): { tens: number; ones: number } {
  const abs = Math.abs(Math.trunc(n));
  return { tens: Math.floor(abs / 10) * 10, ones: abs % 10 };
}

function pickBenchmark(values: number[]): number {
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const candidates = [10, 20, 30, 40, 50, 100, 200, 1000];
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate - avg) < Math.abs(best - avg) ? candidate : best
  );
}

function parseFractionPair(expression: string): { left: string; right: string } | null {
  const match = expression.match(/^(.+?)\s*○\s*(.+)$/);
  if (!match) {
    return null;
  }
  return { left: match[1].trim(), right: match[2].trim() };
}

function parseSimpleFraction(raw: string): { n: number; d: number } | null {
  const match = raw.trim().match(/^(\d+)\/(\d+)$/);
  if (!match) {
    return null;
  }
  return { n: Number(match[1]), d: Number(match[2]) };
}

function triplet(h1: string, h2: string, h3: string): string[] {
  return [h1, h2, h3];
}

function getMagnitude(n: number): number {
  if (n >= 1000) {
    return 1000;
  }
  if (n >= 100) {
    return 100;
  }
  return 10;
}

function parseFractionTerms(expression: string): { n: number; d: number; raw: string }[] {
  const matches = expression.match(/(\d+)\/(\d+)/g);
  if (!matches) {
    return [];
  }
  return matches.map((raw) => {
    const [n, d] = raw.split("/").map(Number);
    return { n, d, raw };
  });
}

function findFriendlyPair(numbers: number[]): { i: number; j: number; sum: number } | null {
  let best: { i: number; j: number; sum: number; score: number } | null = null;
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      const sum = numbers[i] + numbers[j];
      const score = sum % 100 === 0 ? 3 : sum % 10 === 0 ? 2 : 1;
      if (!best || score > best.score || (score === best.score && sum > best.sum)) {
        best = { i, j, sum, score };
      }
    }
  }
  return best;
}

function multiplyCloseTo100(a: number, b: number): string[] {
  const gapA = a - 100;
  const gapB = b - 100;
  const signA = gapA >= 0 ? `+${gapA}` : `${gapA}`;
  const signB = gapB >= 0 ? `+${gapB}` : `${gapB}`;
  const adjusted = a + gapB;
  const cross = gapA * gapB;
  const crossOp = cross >= 0 ? `add ${cross}` : `subtract ${Math.abs(cross)}`;
  return triplet(
    `${a} is ${signA} from 100; ${b} is ${signB} from 100.`,
    `Adjust: ${a} + (${gapB}) = ${adjusted} — multiply ${adjusted} by 100 next.`,
    `Then ${crossOp} (${Math.abs(gapA)} × ${Math.abs(gapB)}) to account for both gaps.`,
  );
}

function identifySumTo10AndRepeated(
  a: number,
  b: number
): { sumTo10: number; repeated: number; lead: number; tail: number; repDigit: number } | null {
  const check = (x: number, y: number) => {
    const xs = String(x);
    const ys = String(y);
    if (xs.length !== 2 || ys.length !== 2) {
      return null;
    }
    const xRepeated = xs[0] === xs[1];
    const yRepeated = ys[0] === ys[1];
    const xSum10 = Number(xs[0]) + Number(xs[1]) === 10;
    const ySum10 = Number(ys[0]) + Number(ys[1]) === 10;
    if (xRepeated && ySum10) {
      return { sumTo10: y, repeated: x, lead: Number(ys[0]), tail: Number(ys[1]), repDigit: Number(xs[0]) };
    }
    if (yRepeated && xSum10) {
      return { sumTo10: x, repeated: y, lead: Number(xs[0]), tail: Number(xs[1]), repDigit: Number(ys[0]) };
    }
    return null;
  };
  return check(a, b) ?? check(b, a);
}

function identifySumTo9AndConsecutive(
  a: number,
  b: number
): { sumTo9: number; other: number; lead9: number; ones9: number; leadOther: number; onesOther: number } | null {
  const digitSum = (n: number) => String(n).split("").reduce((s, d) => s + Number(d), 0);
  const check = (x: number, y: number) => {
    if (String(x).length !== 2 || String(y).length !== 2) {
      return null;
    }
    if (digitSum(x) !== 9) {
      return null;
    }
    const xs = String(x);
    const ys = String(y);
    return {
      sumTo9: x,
      other: y,
      lead9: Number(xs[0]),
      ones9: Number(xs[1]),
      leadOther: Number(ys[0]),
      onesOther: Number(ys[1]),
    };
  };
  return check(a, b) ?? check(b, a);
}

function topic1AdditionWithin20(expression: string): string[] {
  if (/[−\-]/.test(expression) && expression.match(/[−\-]/g)!.length >= 2) {
    const [a, b, c] = parseNumbers(expression);
    const complement = 10 - b;
    if (b < 10) {
      return triplet(
        `Work left to right on ${expression}: focus on ${a} − ${b} first.`,
        `${b} is ${complement} below 10 — try ${a} − 10 + ${complement} (subtract 10, then add ${complement} back).`,
        `Take that result and subtract ${c} — one step at a time.`,
      );
    }
    return triplet(
      `Work left to right on ${expression}: tackle only ${a} − ${b} first.`,
      `${a} − ${b}: use a near-10 chunk instead of column subtraction.`,
      `Take that intermediate result and subtract ${c} — what is left?`,
    );
  }

  const numbers = parseNumbers(expression);
  const [a, b] = numbers;
  const complement = 10 - b;

  // Secret 1: a + b = a + 10 − (10 − b). Example: 7 + 6 = 7 + 10 − 4.
  if (b < 10) {
    return triplet(
      `In ${a} + ${b}, the ${b} is ${complement} away from 10.`,
      `Rewrite as ${a} + 10 − ${complement} — add 10 first, then subtract the gap.`,
      `Compute ${a} + 10, then subtract ${complement} — what do you get?`,
    );
  }

  return triplet(
    `Both addends in ${expression} are close to 10 — anchor on 10.`,
    `Express one addend as 10 minus a small number, then adjust.`,
    `Add 10 to the other addend and subtract that small gap — avoid carrying.`,
  );
}

function topic2SubtractionWithin20(expression: string): string[] {
  if (expression.includes("+")) {
    const [a, b, c] = parseNumbers(expression);
    const complement = 10 - b;
    if (b < 10) {
      return triplet(
        `${expression}: compute ${a} + ${b} before subtracting ${c}.`,
        `For ${a} + ${b}: ${b} is ${complement} below 10 — rewrite as ${a} + 10 − ${complement}.`,
        `Take that sum, subtract ${c} — one step at a time.`,
      );
    }
    return triplet(
      `${expression} mixes + and − — handle ${a} + ${b} before touching − ${c}.`,
      `Add ${a} + ${b} first using near-10 adjustments.`,
      `Subtract ${c} from that running total — one step at a time.`,
    );
  }

  const [a, b] = parseNumbers(expression);
  if (b < 10 && b !== 9 && b !== 8 && b !== 7) {
    const addBack = 10 - b;
    return triplet(
      `${a} − ${b}: treat ${b} as 10 − ${addBack}.`,
      `Subtract 10 from ${a}, then add ${addBack} back.`,
      `What number do you land on after both adjustments?`,
    );
  }
  if (b === 9) {
    return triplet(
      `Subtracting 9 from ${a} is the same as subtracting 10, then adding 1.`,
      `Compute ${a} − 10 first — what do you get?`,
      `Add 1 back to fix the over-subtraction — what is the result?`,
    );
  }
  if (b === 8) {
    return triplet(
      `${a} − 8: treat 8 as 10 − 2.`,
      `Subtract 10 from ${a}, then add 2 back.`,
      `What number do you land on after both adjustments?`,
    );
  }
  if (b === 7) {
    return triplet(
      `${a} − 7: think “subtract 10, add 3”.`,
      `${a} − 10 = ? — write that intermediate value.`,
      `Now add 3 to recover — what is ${a} − 7?`,
    );
  }

  return triplet(
    `${a} − ${b}: both numbers are under 20 — avoid borrowing if you can.`,
    `Can you peel ${b} into a round chunk plus a small tail (e.g. 5 + …)?`,
    `Subtract the friendly chunk from ${a} first, then handle the tail.`,
  );
}

function topic3AdditionWithin100(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const left = splitTensOnes(a);
  const right = splitTensOnes(b);
  return triplet(
    `Split ${a} into ${left.tens} + ${left.ones} and ${b} into ${right.tens} + ${right.ones}.`,
    `Add tens first: ${left.tens} + ${right.tens} = ?`,
    `Add ones: ${left.ones} + ${right.ones} = ? — combine with your tens total.`,
  );
}

function topic4SubtractionWithin100(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const left = splitTensOnes(a);
  const right = splitTensOnes(b);
  return triplet(
    `Break ${a} into ${left.tens} + ${left.ones} and ${b} into ${right.tens} + ${right.ones}.`,
    `Subtract tens: ${left.tens} − ${right.tens} = ?`,
    `Subtract ones: ${left.ones} − ${right.ones} = ? — merge with the tens result.`,
  );
}

function topic5NumberMovingAddition(expression: string): string[] {
  const numbers = parseNumbers(expression);
  const pair = findFriendlyPair(numbers);
  if (pair) {
    const rest = numbers.filter((_, idx) => idx !== pair.i && idx !== pair.j);
    const restText = rest.length > 0 ? `, then add ${rest.join(" + ")}` : "";
    return triplet(
      `In ${expression}, ${numbers[pair.i]} + ${numbers[pair.j]} = ${pair.sum} — a friendly pair.`,
      `Group first: (${numbers[pair.i]} + ${numbers[pair.j]}) = ${pair.sum}.`,
      `Add ${pair.sum}${restText} — regroup so each step stays easy.`,
    );
  }
  return triplet(
    `In ${expression}, scan for two addends that make 10, 100, or another round total.`,
    `Reorder mentally so the friendly pair is added first.`,
    `Add any remaining numbers to that partial sum.`,
  );
}

function topic6NumberMovingSubtraction(expression: string): string[] {
  if (/[−\-]/.test(expression) && expression.match(/[−\-]/g)!.length >= 2) {
    const numbers = parseNumbers(expression);
    const first = numbers[0];
    const matchIdx = numbers.findIndex((n, idx) => idx > 0 && n % 10 === first % 10);
    if (matchIdx > 0) {
      const matched = numbers[matchIdx];
      const rest = numbers.filter((_, idx) => idx !== 0 && idx !== matchIdx);
      return triplet(
        `In ${expression}, ${first} and ${matched} share ending digit ${first % 10}.`,
        `Group first: ${first} − ${matched} — subtract matching endings.`,
        `Then subtract ${rest.join(" − ")} from that result.`,
      );
    }
    return triplet(
      `Chain ${expression}: look for subtractors with matching ending digits.`,
      `Group those pairs first to avoid messy borrowing.`,
      `Finish any remaining subtraction steps on the partial result.`,
    );
  }
  const [a, b] = parseNumbers(expression);
  return triplet(
    `${a} − ${b}: look for a rearrangement that avoids ugly borrowing.`,
    `Can you rewrite ${b} as a round number plus a small adjustment?`,
    `Subtract the round part from ${a} first, then handle the adjustment.`,
  );
}

function topic7BenchmarkAddition(expression: string): string[] {
  const numbers = parseNumbers(expression);
  const benchmark = pickBenchmark(numbers);
  const deltas = numbers.map((n) => n - benchmark);
  const deltaText = numbers.map((n, i) => `${n} is ${deltas[i] >= 0 ? "+" : ""}${deltas[i]} from ${benchmark}`).join("; ");
  return triplet(
    `${numbers.length} addends in ${expression} — try benchmark ${benchmark}.`,
    `${deltaText}.`,
    `Compute ${benchmark} × ${numbers.length} plus the sum of those gaps — what do you get?`,
  );
}

function topic8ReverseAddition(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const d1 = Math.floor(a / 10);
  const d2 = a % 10;
  const digitSum = d1 + d2;
  if (digitSum < 10) {
    return triplet(
      `${a} and ${b} are digit reverses — the digits ${d1} and ${d2} swap places.`,
      `Add those digits: ${d1} + ${d2} = ${digitSum}.`,
      `A one-digit sum gives a repeated pair: think ${digitSum} × 11 — what three-digit number is that?`,
    );
  }
  const outerTens = Math.floor(digitSum / 10);
  const outerOnes = digitSum % 10;
  const middle = outerTens + outerOnes;
  return triplet(
    `${a} + ${b} are reverses with digits ${d1} and ${d2}.`,
    `Add the digits: ${d1} + ${d2} = ${digitSum} — split into ${outerTens} and ${outerOnes} for the outside.`,
    `Middle digit is ${outerTens} + ${outerOnes} = ${middle} — place outside–middle–outside to form the answer.`,
  );
}

function topic9CompensationAddition(expression: string): string[] {
  const numbers = parseNumbers(expression);
  if (numbers.length > 2) {
    return topic7BenchmarkAddition(expression);
  }
  const [a, b] = parseNumbers(expression);
  const tryCompensation = (low: number, high: number) => {
    const mag = getMagnitude(low);
    const rem = low % mag;
    if (rem === 0) {
      return null;
    }
    const gapUp = mag - rem;
    const friendly = low + gapUp;
    return { low, high, gapUp, friendly };
  };
  const compA = tryCompensation(a, b);
  const compB = tryCompensation(b, a);
  const pick = compA && compB ? (compA.gapUp <= compB.gapUp ? compA : compB) : compA ?? compB;
  if (pick) {
    return triplet(
      `${pick.low} is ${pick.gapUp} below ${pick.friendly} — compensate on that addend.`,
      `Add ${pick.gapUp} to ${pick.low} and subtract ${pick.gapUp} from ${pick.high}: (${pick.low} + ${pick.gapUp}) + (${pick.high} − ${pick.gapUp}).`,
      `Compute ${pick.friendly} + ${pick.high - pick.gapUp} mentally — keep both adjustments equal.`,
    );
  }
  const mag = getMagnitude(b);
  const rem = b % mag;
  const friendly = b - rem;
  const comp = rem;
  return triplet(
    `${b} = ${friendly} + ${comp} — rewrite using the friendly number.`,
    `Compute ${a} + ${friendly} + ${comp} (add ${friendly} first).`,
    `Add the compensation ${comp} after the friendly sum — what is ${a} + ${b}?`,
  );
}

function topic10CompensationSubtraction(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const round = Math.ceil(b / 100) * 100 || Math.ceil(b / 10) * 10;
  const diff = round - b;
  return triplet(
    `${b} is close to ${round} — subtracting ${round} is easier than subtracting ${b}.`,
    `Compute ${a} − ${round} first.`,
    `You subtracted ${diff} too much — add ${diff} back to fix the answer.`,
  );
}

function topic11RoundingUpAddition(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const mag = getMagnitude(a);
  const rem = a % mag;
  const needed = rem === 0 ? 0 : mag - rem;
  const friendly = a + needed;
  const remaining = b - needed;
  return triplet(
    `${a} needs ${needed} more to reach ${friendly} — split ${b} to supply that.`,
    `Rewrite as ${a} + ${needed} + ${remaining} (split ${b} into ${needed} + ${remaining}).`,
    `Add ${a} + ${needed} = ${friendly}, then add ${remaining} — what is ${a} + ${b}?`,
  );
}

function topic12RoundingUpSubtraction(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const aOnes = a % 10;
  const bOnes = b % 10;
  if (bOnes > aOnes) {
    const mid = Math.ceil((a - b) / 100) * 100;
    const chunk = a - mid;
    const extra = b - chunk;
    return triplet(
      `${b}'s ending digit (${bOnes}) is larger than ${a}'s (${aOnes}) — split ${b}.`,
      `Rewrite ${b} as ${chunk} + ${extra}; compute ${a} − ${chunk} − ${extra}.`,
      `${a} − ${chunk} = ${mid} — finish by subtracting ${extra} from ${mid}.`,
    );
  }
  const ceilB = Math.ceil(b / 10) * 10;
  const extra = ceilB - b;
  return triplet(
    `Round ${b} up to ${ceilB} to make subtraction cleaner.`,
    `Subtract ${ceilB} from ${a} first.`,
    `You subtracted ${extra} too much — add ${extra} back.`,
  );
}

function topic13RoundingAddition(expression: string): string[] {
  const numbers = parseNumbers(expression);
  if (numbers.length === 2) {
    const [a, b] = numbers;
    for (const [target, other] of [
      [a, b],
      [b, a],
    ] as const) {
      const mag = getMagnitude(target);
      const rem = target % mag;
      if (rem > 0) {
        const friendly = target + (mag - rem);
        const extra = friendly - target;
        return triplet(
          `${target} is ${extra} below ${friendly} — rewrite as ${friendly} − ${extra}.`,
          `Compute ${other} + ${friendly} first, then subtract ${extra}.`,
          `What is (${other} + ${friendly}) − ${extra}? That equals ${a} + ${b}.`,
        );
      }
    }
  }
  return triplet(
    `In ${expression}, rewrite one addend as a friendly number ± a small extra.`,
    `Add the friendly part first, then adjust for the extra.`,
    `Track overshoot vs undershoot to recover the exact total.`,
  );
}

function topic14ReverseSubtraction(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const sA = String(a);
  const sB = String(b);
  const d1 = Number(sA[0]);
  const d2 = Number(sB[0]);
  const diff = Math.abs(d1 - d2);
  const mult = sA.length === 3 ? 99 : 9;
  return triplet(
    `${a} − ${b} are digit reverses — leading digits are ${d1} and ${d2}.`,
    `Leading digit difference: |${d1} − ${d2}| = ${diff}.`,
    `Multiply ${diff} × ${mult} — that shortcut gives the answer for reverse subtraction.`,
  );
}

function topic15ConsecutiveSum(expression: string): string[] {
  const numbers = parseNumbers(expression);
  const n = numbers.length;
  const first = numbers[0];
  const last = numbers[n - 1];
  return triplet(
    `These are ${n} consecutive numbers from ${first} to ${last}.`,
    `Average is (${first} + ${last}) ÷ 2 — what is that middle value?`,
    `Multiply the average by ${n} — that is the sum of ${expression}.`,
  );
}

function topic16MultiplyBy5(expression: string): string[] {
  const [a] = parseNumbers(expression);
  if (a % 2 === 0) {
    const halved = a / 2;
    return triplet(
      `${a} is even — halve first, then append a zero (×10).`,
      `${a} ÷ 2 = ${halved}.`,
      `Append 0 to ${halved} — what is ${a} × 5?`,
    );
  }
  const times10 = a * 10;
  return triplet(
    `${a} is odd — multiply by 10 first, then halve.`,
    `${a} × 10 = ${times10}.`,
    `Halve ${times10} mentally — what is ${a} × 5?`,
  );
}

function topic17MultiplyBy9(expression: string): string[] {
  const [a, multiplier] = parseNumbers(expression);
  const m = multiplier ?? 9;
  if (m === 9) {
    return triplet(
      `Rewrite ${a} × 9 as ${a} × (10 − 1).`,
      `Compute ${a} × 10 = ${a * 10}.`,
      `Subtract one ${a} from ${a * 10} — do not multiply digit by digit.`,
    );
  }
  const benchmark = m === 99 ? 100 : 1000;
  const group = m === 99 ? 1 : 1;
  return triplet(
    `${a} × ${m}: use benchmark ${benchmark} — think ${a} × (${benchmark} − ${group}).`,
    `First compute ${a} × ${benchmark} = ${a * benchmark}.`,
    `Subtract ${group} copy of ${a} from that product — what remains?`,
  );
}

function topic18DivideBy5(expression: string): string[] {
  const [a] = parseNumbers(expression);
  return triplet(
    `${a} ÷ 5: multiply by 2, then divide by 10.`,
    `${a} × 2 = ${a * 2}.`,
    `Shift ${a * 2} one place for ÷10 — that is ${a} ÷ 5.`,
  );
}

function topic19TeenMultiplication(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const teen = a >= 10 && a <= 19 ? a : b;
  const other = teen === a ? b : a;
  const ones = teen % 10;
  const base = teen - ones;
  return triplet(
    `Teen number ${teen} in ${expression} — split as ${base} + ${ones}.`,
    `Multiply ${other} × ${base}, then ${other} × ${ones}.`,
    `Add those two partial products — track each piece before combining.`,
  );
}

function topic20TwoDigitSplit(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const left = splitTensOnes(a);
  const right = splitTensOnes(b);
  return triplet(
    `Split ${a} → ${left.tens} + ${left.ones} and ${b} → ${right.tens} + ${right.ones}.`,
    `Four partial products: (${left.tens}×${right.tens}), (${left.tens}×${right.ones}), (${left.ones}×${right.tens}), (${left.ones}×${right.ones}).`,
    `Add the partials in a comfortable order — use the largest chunk first.`,
  );
}

function topic21MultiplyBy11(expression: string): string[] {
  const [a] = parseNumbers(expression);
  const digits = String(a).padStart(2, "0").split("").map(Number);
  const [d1, d2] = digits.length === 2 ? digits : [digits[0], digits[digits.length - 1]];
  const middle = d1 + d2;
  if (middle < 10) {
    return triplet(
      `${a} × 11: separate the digits ${d1} and ${d2}.`,
      `Middle digit is ${d1} + ${d2} = ${middle}.`,
      `Read the three digits in order — no carry needed.`,
    );
  }
  return triplet(
    `${a} × 11: outer digits ${d1} and ${d2}, middle is ${d1} + ${d2} = ${middle}.`,
    `Middle ${middle} is two digits — carry the 1 to the left.`,
    `Place ones of ${middle} in the center; bump the left digit by 1.`,
  );
}

function topic22EndingIn1(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const leadA = Math.floor(a / 10);
  const leadB = Math.floor(b / 10);
  const front = leadA * leadB;
  const sumLeads = leadA + leadB;
  const carry = sumLeads >= 10 ? 1 : 0;
  return triplet(
    `Both factors end in 1: multiply leading digits ${leadA} × ${leadB} = ${front}.`,
    `Add leading digits: ${leadA} + ${leadB} = ${sumLeads}${carry ? " — carry 1" : ""}.`,
    `Place ${front} at the front, ${sumLeads % 10} in the middle, and 1 at the end — assemble the product.`,
  );
}

function topic23MultiplyBy25(expression: string): string[] {
  const [a] = parseNumbers(expression);
  if (a % 4 === 0) {
    const quarter = a / 4;
    return triplet(
      `${a} is divisible by 4 — rewrite ${a} × 25 as ${a} ÷ 4 × 100.`,
      `Divide ${a} ÷ 4 = ${quarter}.`,
      `Multiply ${quarter} × 100 — what is ${a} × 25?`,
    );
  }
  return triplet(
    `${a} × 25: rewrite as ${a} × 100 ÷ 4.`,
    `Multiply ${a} × 100 = ${a * 100}.`,
    `Divide by 4 mentally — split into halves twice.`,
  );
}

function topic24SameHeadSum10(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const headA = Math.floor(a / 10);
  const tailA = a % 10;
  const tailB = b % 10;
  return triplet(
    `${a} and ${b} share leading digit ${headA}; tails ${tailA} + ${tailB} = 10.`,
    `Partial product: ${headA} × (${headA} + 1) = ${headA * (headA + 1)} — place in the hundreds.`,
    `Ones place is ${tailA} × ${tailB} = ${tailA * tailB} — append to the partial.`,
  );
}

function topic25RepeatedDigits(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const pattern = identifySumTo10AndRepeated(a, b);
  if (pattern) {
    const front = (pattern.lead + 1) * pattern.repDigit;
    const back = pattern.repDigit * pattern.tail;
    const backText = back < 10 ? `0${back}` : String(back);
    return triplet(
      `${pattern.sumTo10}'s digits sum to 10; ${pattern.repeated} is a repeated-digit factor.`,
      `Front: (${pattern.lead} + 1) × ${pattern.repDigit} = ${front}. Back: ${pattern.repDigit} × ${pattern.tail} = ${back}.`,
      `Place ${front} at the front and ${backText} at the back — pad with 0 if the back product is one digit.`,
    );
  }
  return triplet(
    `Find the repeated-digit factor and the partner whose digits sum to 10.`,
    `Front = (leading digit + 1) × repeated digit; back = repeated digit × ending digit.`,
    `Assemble front and back — add a leading zero if the back product is less than 10.`,
  );
}

function topic26SameEnding(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const tail = a % 10;
  const leadA = Math.floor(a / 10);
  const leadB = Math.floor(b / 10);
  const front = leadA * leadB + tail;
  const back = tail * tail;
  const backText = back < 10 ? `0${back}` : String(back);
  return triplet(
    `${a} and ${b} share ending digit ${tail}.`,
    `Front: ${leadA} × ${leadB} + ${tail} = ${front}. Back: ${tail} × ${tail} = ${back}.`,
    `Place ${front} at the front and ${backText} at the back — pad with 0 if needed.`,
  );
}

function topic27SumTo9Pattern(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const pattern = identifySumTo9AndConsecutive(a, b);
  if (pattern) {
    const smallOnes = Math.min(pattern.ones9, pattern.onesOther);
    const largeOnes = Math.max(pattern.ones9, pattern.onesOther);
    const front = (pattern.lead9 + 1) * pattern.leadOther;
    const back = (10 - largeOnes) * (10 - smallOnes);
    const backText = back < 10 ? `0${back}` : String(back);
    return triplet(
      `${pattern.sumTo9}'s digits sum to 9 — pair with ${pattern.other}.`,
      `Front: (${pattern.lead9} + 1) × ${pattern.leadOther} = ${front}. Back: ${10 - largeOnes} × ${10 - smallOnes} = ${back}.`,
      `Place ${front} at the front and ${backText} at the back — pad with 0 if the back product is one digit.`,
    );
  }
  return triplet(
    `Find the sum-to-9 factor and its consecutive partner.`,
    `Front = (leading digit + 1) × partner's leading digit.`,
    `Back = complement of smaller ones × complement of larger ones.`,
  );
}

function topic28CloseTo100TwoDigit(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  return multiplyCloseTo100(a, b);
}

function topic29MiddleNumber(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const middle = Math.round((a + b) / 20) * 10;
  const diff = Math.abs(a - middle);
  const sq = diff * diff;
  return triplet(
    `${a} and ${b} bracket middle multiple ${middle} — each is ${diff} away.`,
    `Use ${middle} × ${middle} − ${diff} × ${diff} (difference-squared formula).`,
    `Compute ${middle * middle} − ${sq} — what is ${a} × ${b}?`,
  );
}

function topic30ThreeDigitBy11(expression: string): string[] {
  const [a] = parseNumbers(expression);
  const digits = String(a).split("").map(Number);
  const left = digits[0];
  const right = digits[digits.length - 1];
  const neighborSums = digits.slice(0, -1).map((d, i) => `${d} + ${digits[i + 1]}`).join(", ");
  return triplet(
    `${a} × 11: place ${left} at the front and ${right} at the back.`,
    `Add neighboring digits (${neighborSums}) for the middle positions.`,
    `Write those sums between the outer digits — carry to the left if any sum ≥ 10.`,
  );
}

function topic31FactorDivision(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  return triplet(
    `${a} ÷ ${b}: factor ${b} into 2, 3, and/or 5 only.`,
    `Divide ${a} by one factor at a time — choose the easiest factor first.`,
    `Chain the divisions mentally — stop when no factors remain.`,
  );
}

function topic32DivideBy25(expression: string): string[] {
  const [a] = parseNumbers(expression);
  if (a % 100 === 0) {
    const quarter = a / 100;
    return triplet(
      `${a} ends in two zeros — rewrite ÷25 as ÷100 × 4.`,
      `${a} ÷ 100 = ${quarter}.`,
      `Multiply ${quarter} × 4 — what is ${a} ÷ 25?`,
    );
  }
  return triplet(
    `${a} ÷ 25 = ${a} × 4 ÷ 100.`,
    `Multiply ${a} × 4 = ${a * 4}.`,
    `Shift two places for ÷100 — that is ${a} ÷ 25.`,
  );
}

function topic33DivisorEndsIn5(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  return triplet(
    `Divisor ${b} ends in 5 — multiply top and bottom by 2.`,
    `${a} × 2 = ${a * 2}; ${b} × 2 = ${b * 2} — now ÷ without a 5 in the divisor.`,
    `Divide ${a * 2} by ${b * 2} mentally — simpler than ${a} ÷ ${b} directly.`,
  );
}

function topic34LargeBy11(expression: string): string[] {
  return topic30ThreeDigitBy11(expression);
}

function topic35MultiplyBy111(expression: string): string[] {
  const [a] = parseNumbers(expression);
  const digits = String(a).split("").map(Number);
  const right = digits[digits.length - 1];
  return triplet(
    `${a} × 111: each middle digit comes from adding neighboring digits of ${a}.`,
    `Ones digit of the answer matches ${right} (the ones digit of ${a}).`,
    `Work left to right, placing neighbor sums between outer digits — carry as needed.`,
  );
}

function topic36NinetiesTimesOver100(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const gap = 100 - a;
  const bOnes = b % 10;
  const adjusted = b - gap;
  return triplet(
    `${a} is ${gap} below 100; ${b} is just above 100.`,
    `Subtract ${gap} from ${b}: ${b} − ${gap} = ${adjusted}.`,
    `Multiply ${adjusted} × 100, then subtract ${gap} × ${bOnes} (complement × ones digit of ${b}).`,
  );
}

function topic37BothCloseTo100(expression: string): string[] {
  return topic28CloseTo100TwoDigit(expression);
}

function topic38HundredAsMiddle(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const gapA = a - 100;
  const gapB = b - 100;
  const dist = Math.abs(gapA);
  const gapProduct = dist * dist;
  return triplet(
    `${a} is ${dist} ${gapA > 0 ? "above" : "below"} 100; ${b} is ${dist} ${gapB > 0 ? "above" : "below"} 100 — equal distance.`,
    `Multiply the two gaps: ${dist} × ${dist} = ${gapProduct}.`,
    `Compute 100 × 100 − ${gapProduct} — subtract the gap product from 10000.`,
  );
}

function topic39MultiDigitSplit(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const left = splitTensOnes(b);
  return triplet(
    `Split ${b} into ${left.tens} + ${left.ones} for ${a} × ${b}.`,
    `Compute ${a} × ${left.tens} and ${a} × ${left.ones}.`,
    `Add the two products — the large partial usually comes first.`,
  );
}

function topic40CloseTo200(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const compA = 200 - a;
  const compB = 200 - b;
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const smallComp = smaller === a ? compA : compB;
  const largeComp = larger === a ? compA : compB;
  const otherComp = smaller === a ? compB : compA;
  if (a < 200 && b < 200) {
    const adjusted = larger - otherComp;
    return triplet(
      `${a} is ${compA} below 200; ${b} is ${compB} below 200 — complements from 200.`,
      `Compute (${larger} − ${otherComp}) × 200 = ${adjusted} × 200.`,
      `Add ${largeComp} × ${otherComp} = ${largeComp * otherComp} to that product.`,
    );
  }
  const largeEnd = larger % 100;
  const adjusted = larger - smallComp;
  return triplet(
    `${a} and ${b} straddle 200 — complement of ${smaller} from 200 is ${smallComp}.`,
    `Compute (${larger} − ${smallComp}) × 200 = ${adjusted} × 200.`,
    `Subtract ${smallComp} × ${largeEnd} = ${smallComp * largeEnd} from that product.`,
  );
}

function topic41AdvancedNines(expression: string): string[] {
  const [a, multiplier] = parseNumbers(expression);
  const nineStr = String(multiplier);
  const nineCount = nineStr.length;
  const benchmark = 10 ** nineCount;
  const front = a - 1;
  const complement = benchmark - a;
  return triplet(
    `${a} × ${multiplier}: subtract 1 from ${a} → ${front}.`,
    `Complement of ${a} to ${benchmark} is ${complement}.`,
    `Place ${front} at the front and ${complement} at the back — join for the product.`,
  );
}

function offsetFromBenchmark(n: number, benchmark: number): number {
  if (n >= benchmark) {
    return n % benchmark;
  }
  return benchmark - n;
}

function topic42HundredsThousandsBenchmark(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const benchmark = Math.max(a, b) >= 1000 ? 1000 : 100;
  const offA = offsetFromBenchmark(a, benchmark);
  const offB = offsetFromBenchmark(b, benchmark);
  if (a >= benchmark && b >= benchmark) {
    const adjusted = a + offB;
    return triplet(
      `${a} and ${b} are above ${benchmark} — ending parts ${offA} and ${offB}.`,
      `Compute (${a} + ${offB}) × ${benchmark} = ${adjusted} × ${benchmark}.`,
      `Add ${offA} × ${offB} = ${offA * offB} to that product.`,
    );
  }
  if (a < benchmark && b < benchmark) {
    const larger = Math.max(a, b);
    const smaller = Math.min(a, b);
    const largeOff = larger === a ? offA : offB;
    const smallOff = smaller === a ? offA : offB;
    const adjusted = larger - smallOff;
    return triplet(
      `${a} and ${b} are below ${benchmark} — complements ${offA} and ${offB}.`,
      `Compute (${larger} − ${smallOff}) × ${benchmark} = ${adjusted} × ${benchmark}.`,
      `Add ${largeOff} × ${smallOff} = ${largeOff * smallOff} to that product.`,
    );
  }
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const smallOff = offsetFromBenchmark(smaller, benchmark);
  const largeOff = offsetFromBenchmark(larger, benchmark);
  const adjusted = larger - smallOff;
  return triplet(
    `${a} and ${b} straddle ${benchmark} — complement of ${smaller} is ${smallOff}.`,
    `Compute (${larger} − ${smallOff}) × ${benchmark} = ${adjusted} × ${benchmark}.`,
    `Subtract ${smallOff} × ${largeOff} = ${smallOff * largeOff} from that product.`,
  );
}

function topic43DecimalRoundingAdd(expression: string): string[] {
  const numbers = parseNumbers(expression);
  const rounded = numbers.map((n) => Math.round(n));
  return triplet(
    `Round each decimal in ${expression} to the nearest whole: ${rounded.join(", ")}.`,
    `Sum the rounded values first — track how far each original was from its round.`,
    `Apply the net adjustment (overshoot vs undershoot) to fix the total.`,
  );
}

function topic44DecimalRoundingSub(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  const roundB = Math.round(b);
  const diff = roundB - b;
  return triplet(
    `Round ${b} to ${roundB} — difference is ${diff >= 0 ? "+" : ""}${diff}.`,
    `Subtract ${roundB} from ${a} instead of ${b}.`,
    `Correct by ${diff >= 0 ? "adding" : "subtracting"} ${Math.abs(diff)} — you ${diff >= 0 ? "subtracted too much" : "subtracted too little"}.`,
  );
}

function topic45DecimalEndingCombination(expression: string): string[] {
  const numbers = parseNumbers(expression);
  return triplet(
    `In ${expression}, group decimals that sum to whole numbers (e.g. .25 + .75).`,
    `Pair complementary tails first — which two terms make 1.0?`,
    `Add whole-number groups, then handle any leftover decimal tails.`,
  );
}

function topic46DecimalMultProperties(expression: string): string[] {
  const [a, b] = parseNumbers(expression);
  return triplet(
    `${a} × ${b}: reorder factors — can one decimal become a whole number?`,
    `Example: split so you multiply a whole × a simpler decimal first.`,
    `Use commutative/associative moves to avoid long decimal multiplication.`,
  );
}

function topic47FractionWholeCompare(expression: string): string[] {
  const pair = parseFractionPair(expression);
  if (!pair) {
    return triplet(
      `Compare ${expression}: pick one denominator to multiply both sides.`,
      `Turn one fraction into a whole number — the other becomes easier to read.`,
      `Compare the two products — larger product means larger fraction.`,
    );
  }
  const left = parseSimpleFraction(pair.left);
  const right = parseSimpleFraction(pair.right);
  const denom = left?.d ?? right?.d ?? 1;
  return triplet(
    `Compare ${pair.left} ○ ${pair.right} — multiply both by ${denom}.`,
    `${pair.left} × ${denom} = ? and ${pair.right} × ${denom} = ?`,
    `Which product is larger? That side wins ○ — no common denominator needed.`,
  );
}

function topic48CrossMultiplication(expression: string): string[] {
  const pair = parseFractionPair(expression);
  if (!pair) {
    return triplet(`Cross-multiply to compare ${expression}.`, `Left × right denominator vs right × left denominator.`, `Larger cross product → larger fraction.`);
  }
  const left = parseSimpleFraction(pair.left);
  const right = parseSimpleFraction(pair.right);
  if (!left || !right) {
    return topic47FractionWholeCompare(expression);
  }
  return triplet(
    `Compare ${pair.left} ○ ${pair.right} by cross multiplication.`,
    `Compute ${left.n} × ${right.d} vs ${right.n} × ${left.d}.`,
    `Larger cross product wins — fill in ○ without converting to decimals.`,
  );
}

function topic49ReciprocalCompare(expression: string): string[] {
  const pair = parseFractionPair(expression);
  return triplet(
    `Reciprocal trick for ${pair ? `${pair.left} ○ ${pair.right}` : expression}.`,
    `Flip both fractions mentally — the inequality reverses.`,
    `Compare the reciprocals — smaller original means larger reciprocal.`,
  );
}

function topic50FractionDivisionCompare(expression: string): string[] {
  return topic47FractionWholeCompare(expression);
}

function topic51FractionRoundingAdd(expression: string): string[] {
  const pair = parseFractionPair(expression);
  if (pair) {
    return triplet(
      `Each fraction in ${pair.left} ○ ${pair.right} is near 1 or ½ — round first.`,
      `Benchmark to 1 or ½ before exact arithmetic.`,
      `Decide ○ using rounded estimates, then sanity-check with exact gaps.`,
    );
  }
  const fracs = parseFractionTerms(expression);
  const byDenom = new Map<number, { n: number; d: number; raw: string }[]>();
  for (const f of fracs) {
    const list = byDenom.get(f.d) ?? [];
    list.push(f);
    byDenom.set(f.d, list);
  }
  const likeGroup = [...byDenom.entries()].find(([, terms]) => terms.length >= 2);
  if (likeGroup) {
    const [denom, terms] = likeGroup;
    const sumExpr = terms.map((t) => t.raw).join(" + ");
    const rest = fracs.filter((f) => f.d !== denom).map((f) => f.raw);
    const restText = rest.length > 0 ? `, then add ${rest.join(" + ")}` : "";
    return triplet(
      `In ${expression}, group fractions with denominator ${denom} first.`,
      `Add like fractions: ${sumExpr}.`,
      `Simplify that partial sum${restText} — rearrange before final combining.`,
    );
  }
  return triplet(
    `Fraction sum ${expression} — look for fractions sharing a denominator.`,
    `Group like fractions and add them first.`,
    `Combine with unlike terms and simplify the result.`,
  );
}

function topic52FractionRoundingSub(expression: string): string[] {
  const fracs = parseFractionTerms(expression);
  if (fracs.length >= 2) {
    const first = fracs[0];
    const match = fracs.find((f, idx) => idx > 0 && f.d === first.d);
    if (match) {
      const sameDenomRest = fracs.filter((f, idx) => idx > 0 && f.d === first.d);
      if (sameDenomRest.length >= 2) {
        const sumExpr = sameDenomRest.map((f) => f.raw).join(" + ");
        return triplet(
          `In ${expression}, add subtrahends with denominator ${first.d} first.`,
          `Group: ${first.raw} − (${sumExpr}).`,
          `Subtract that combined fraction from ${first.raw}, then handle unlike denominators.`,
        );
      }
      return triplet(
        `In ${expression}, ${first.raw} and ${match.raw} share denominator ${first.d}.`,
        `Subtract like fractions first: ${first.raw} − ${match.raw}.`,
        `Simplify the result, then handle any remaining unlike terms.`,
      );
    }
  }
  return triplet(
    `Fraction chain ${expression} — look for matching denominators.`,
    `Subtract or combine like fractions before unlike ones.`,
    `Simplify each step before moving to the next subtraction.`,
  );
}

function topic53ButterflyAdd(expression: string): string[] {
  const parts = expression.split("+").map((s) => s.trim());
  if (parts.length === 2) {
    const left = parseSimpleFraction(parts[0]);
    const right = parseSimpleFraction(parts[1]);
    if (left && right) {
      return triplet(
        `Butterfly for ${left.n}/${left.d} + ${right.n}/${right.d}: cross-multiply for numerator.`,
        `Denominator is ${left.d} × ${right.d}; numerator is ${left.n}×${right.d} + ${right.n}×${left.d}.`,
        `Form the single fraction — simplify only after combining.`,
      );
    }
  }
  return triplet(
    `Butterfly method on ${expression}: X across the two fractions.`,
    `Multiply diagonally for the top; multiply bottoms for the denominator.`,
    `Combine the two wing products — keep denominator as product of bottoms.`,
  );
}

function topic54ButterflySub(expression: string): string[] {
  const parts = expression.split("−").map((s) => s.trim());
  if (parts.length === 2) {
    const left = parseSimpleFraction(parts[0]);
    const right = parseSimpleFraction(parts[1]);
    if (left && right) {
      return triplet(
        `Butterfly for ${left.n}/${left.d} − ${right.n}/${right.d}.`,
        `Top: ${left.n}×${right.d} − ${right.n}×${left.d}; bottom: ${left.d}×${right.d}.`,
        `Subtract the cross products — same denominator from the butterfly.`,
      );
    }
  }
  return topic53ButterflyAdd(expression);
}

function topic55ButterflyDiv(expression: string): string[] {
  const parts = expression.split("÷").map((s) => s.trim());
  if (parts.length === 2) {
    const left = parseSimpleFraction(parts[0]);
    const right = parseSimpleFraction(parts[1]);
    if (left && right) {
      return triplet(
        `Divide ${left.n}/${left.d} ÷ ${right.n}/${right.d} — flip the second fraction.`,
        `Multiply: (${left.n}×${right.d}) / (${left.d}×${right.n}).`,
        `Compute the cross products — simplify the resulting fraction.`,
      );
    }
  }
  return triplet(
    `Fraction division ${expression}: rewrite as multiply by reciprocal.`,
    `Flip the divisor fraction, then use butterfly-style cross multiply.`,
    `Numerator and denominator come from diagonal products.`,
  );
}

function topic56MixedFractionRounding(expression: string): string[] {
  const fracs = parseFractionTerms(expression);
  const byDenom = new Map<number, string[]>();
  for (const f of fracs) {
    const list = byDenom.get(f.d) ?? [];
    list.push(f.raw);
    byDenom.set(f.d, list);
  }
  const likeGroup = [...byDenom.entries()].find(([, terms]) => terms.length >= 2);
  if (likeGroup) {
    const [denom, terms] = likeGroup;
    return triplet(
      `In ${expression}, spot fractions with denominator ${denom}: ${terms.join(", ")}.`,
      `Group like denominators first — follow order of operations on the rest.`,
      `Simplify each grouped part before combining with other terms.`,
    );
  }
  return triplet(
    `Mixed expression ${expression} — look for fractions that combine to whole numbers.`,
    `Group friendly pairs first, then follow order of operations.`,
    `Simplify each stage before the next operation.`,
  );
}

const TOPIC_GENERATORS: Record<number, (expression: string) => string[]> = {
  1: topic1AdditionWithin20,
  2: topic2SubtractionWithin20,
  3: topic3AdditionWithin100,
  4: topic4SubtractionWithin100,
  5: topic5NumberMovingAddition,
  6: topic6NumberMovingSubtraction,
  7: topic7BenchmarkAddition,
  8: topic8ReverseAddition,
  9: topic9CompensationAddition,
  10: topic10CompensationSubtraction,
  11: topic11RoundingUpAddition,
  12: topic12RoundingUpSubtraction,
  13: topic13RoundingAddition,
  14: topic14ReverseSubtraction,
  15: topic15ConsecutiveSum,
  16: topic16MultiplyBy5,
  17: topic17MultiplyBy9,
  18: topic18DivideBy5,
  19: topic19TeenMultiplication,
  20: topic20TwoDigitSplit,
  21: topic21MultiplyBy11,
  22: topic22EndingIn1,
  23: topic23MultiplyBy25,
  24: topic24SameHeadSum10,
  25: topic25RepeatedDigits,
  26: topic26SameEnding,
  27: topic27SumTo9Pattern,
  28: topic28CloseTo100TwoDigit,
  29: topic29MiddleNumber,
  30: topic30ThreeDigitBy11,
  31: topic31FactorDivision,
  32: topic32DivideBy25,
  33: topic33DivisorEndsIn5,
  34: topic34LargeBy11,
  35: topic35MultiplyBy111,
  36: topic36NinetiesTimesOver100,
  37: topic37BothCloseTo100,
  38: topic38HundredAsMiddle,
  39: topic39MultiDigitSplit,
  40: topic40CloseTo200,
  41: topic41AdvancedNines,
  42: topic42HundredsThousandsBenchmark,
  43: topic43DecimalRoundingAdd,
  44: topic44DecimalRoundingSub,
  45: topic45DecimalEndingCombination,
  46: topic46DecimalMultProperties,
  47: topic47FractionWholeCompare,
  48: topic48CrossMultiplication,
  49: topic49ReciprocalCompare,
  50: topic50FractionDivisionCompare,
  51: topic51FractionRoundingAdd,
  52: topic52FractionRoundingSub,
  53: topic53ButterflyAdd,
  54: topic54ButterflySub,
  55: topic55ButterflyDiv,
  56: topic56MixedFractionRounding,
};

function expressionFallback(expression: string): string[] {
  const numbers = parseNumbers(expression);
  if (expression.includes("○") && numbers.length >= 2) {
    return triplet(
      `Before deciding ○ in ${expression}, simplify each side mentally.`,
      `Use the secret's comparison move on these exact numerators/denominators.`,
      `Only choose ○ after both sides are in a comparable form.`,
    );
  }
  if (numbers.length >= 2) {
    return triplet(
      `Look at the structure of ${expression} — which number is awkward?`,
      `Apply the secret technique to rewrite the awkward part first.`,
      `Finish the remaining step — keep intermediates visible, not the final answer.`,
    );
  }
  return triplet(
    `Study ${expression} — what makes this calculation hard by standard methods?`,
    `Find the one rewrite that turns it into mental math.`,
    `Execute that rewrite step by step without writing the final result.`,
  );
}

/** Generate three LeetCode-style progressive hints for one question. */
export function generateLeetcodeHints(secret: MentalMathSecret, expression: string): string[] {
  const generator = TOPIC_GENERATORS[secret.sourceTopicNumber];
  const hints = generator ? generator(expression) : expressionFallback(expression);
  return hints.slice(0, MAX_HINTS);
}
