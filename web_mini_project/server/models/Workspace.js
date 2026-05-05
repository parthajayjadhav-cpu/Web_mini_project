import mongoose from 'mongoose'
import { isMongoConnected } from '../db.js'

const { Schema } = mongoose

const PointHistorySchema = new Schema(
  {
    time: { type: Date, default: Date.now },
    points: { type: Number, required: true },
  },
  { _id: false },
)

const MemberSchema = new Schema(
  {
    name: { type: String, required: true },
    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    pointHistory: { type: [PointHistorySchema], default: [] },
    tasksCompleted: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    assignedTo: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    points: { type: Number, default: 25 },
    status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    urgent: { type: Boolean, default: false },
    note: { type: String, default: '' },
    completedBy: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const ActivitySchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        'task_added',
        'task_moved',
        'task_done',
        'urgent',
        'note',
        'streak',
        'rank_change',
        'clutch',
        'member_joined',
        'sprint_over',
      ],
      required: true,
    },
    message: { type: String, required: true },
    actor: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
)

const WorkspaceSchema = new Schema({
  code: { type: String, unique: true, required: true, uppercase: true, index: true },
  createdAt: { type: Date, default: Date.now },
  sessionDuration: { type: Number, default: 180 }, // minutes
  template: { type: String, enum: ['hackathon', 'college', 'blank'], default: 'blank' },
  members: { type: [MemberSchema], default: [] },
  tasks: { type: [TaskSchema], default: [] },
  activityLog: { type: [ActivitySchema], default: [] },
  lastCompletedBy: { type: String, default: '' },
  sprintOverNotified: { type: Boolean, default: false },
})

export const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema)

// ─────────────────────────────────────────────────────────────────────────────
// In-memory fallback store. Used when MONGODB_URI is unset or mongo is down.
// Mirrors the Mongoose document shape closely enough that route handlers can
// treat both the same way.
// ─────────────────────────────────────────────────────────────────────────────
const memStore = new Map()

function genId() {
  // ObjectId-ish 24-char hex; not real ObjectId but a fine string id.
  return [...crypto.getRandomValues(new Uint8Array(12))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function plainDoc(w) {
  return JSON.parse(JSON.stringify(w))
}

class MemDoc {
  constructor(data) {
    Object.assign(this, data)
  }
  async save() {
    memStore.set(this.code, this)
    return this
  }
  toObject() {
    return plainDoc(this)
  }
}

function memCreate(data) {
  const doc = new MemDoc({
    _id: genId(),
    code: data.code,
    createdAt: data.createdAt || new Date(),
    sessionDuration: data.sessionDuration ?? 180,
    template: data.template || 'blank',
    members: data.members || [],
    tasks: data.tasks || [],
    activityLog: data.activityLog || [],
    lastCompletedBy: '',
    sprintOverNotified: false,
  })
  memStore.set(data.code, doc)
  return doc
}

function memFindByCode(code) {
  return memStore.get(String(code).toUpperCase()) || null
}

function memFindAll() {
  return Array.from(memStore.values())
}

/**
 * Storage facade — chooses Mongo or in-memory transparently. All route
 * handlers should go through this rather than touching the model directly.
 */
export const Store = {
  async findByCode(code) {
    if (!code) return null
    const upper = String(code).toUpperCase()
    if (isMongoConnected()) {
      return Workspace.findOne({ code: upper })
    }
    return memFindByCode(upper)
  },
  async create(data) {
    const upper = String(data.code).toUpperCase()
    if (isMongoConnected()) {
      const doc = await Workspace.create({ ...data, code: upper })
      return doc
    }
    return memCreate({ ...data, code: upper })
  },
  async exists(code) {
    return Boolean(await this.findByCode(code))
  },
  async findAll() {
    if (isMongoConnected()) return Workspace.find({})
    return memFindAll()
  },
  // Helper used by activity helper to push and persist a new task subdoc id.
  newTaskId() {
    if (isMongoConnected()) return new mongoose.Types.ObjectId().toString()
    return genId()
  },
  newActivityId() {
    if (isMongoConnected()) return new mongoose.Types.ObjectId().toString()
    return genId()
  },
}
