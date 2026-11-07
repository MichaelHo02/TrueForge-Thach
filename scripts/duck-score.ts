import { readFileSync } from 'node:fs';
import { evaluatePuzzle } from '../evals/duck-score.js';
import type { Level } from '../sokoban/engine.js';

const [levelPath, submissionsPath] = process.argv.slice(2);
if (!levelPath || !submissionsPath) throw new Error('Usage: node --import tsx scripts/duck-score.ts level.json submissions.json');
const level = JSON.parse(readFileSync(levelPath, 'utf8')) as Level;
const submissions = JSON.parse(readFileSync(submissionsPath, 'utf8'));
if (!Array.isArray(submissions)) throw new Error('Submissions file must be an array of up to two plan objects or raw replies');
console.log(JSON.stringify(evaluatePuzzle(level, submissions), null, 2));
