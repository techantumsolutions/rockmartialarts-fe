import { promises as fs } from "fs"
import path from "path"
import { MongoClient } from "mongodb"
import { normalizePopupFormForCms, type PopupFormSettings, type ResolvedPopupForm } from "@/lib/popupForm"

/**
 * Persist homepage popup CMS settings outside FastAPI.
 * Backend HomepageSection (OpenAPI) has no `popup_form`, so PUT /api/cms strips it.
 *
 * File store is the source of truth (fast). Mongo is best-effort replication.
 */

const FILE_PATH = path.join(process.cwd(), "data", "cms-popup-form.json")
const DOC_ID = "homepage_popup_form"

type PopupFormDoc = { _id: string } & PopupFormSettings

declare global {
  // eslint-disable-next-line no-var
  var __popupFormMongoPromise: Promise<MongoClient> | undefined
}

function getMongoUri(): string | undefined {
  const uri = process.env.MONGO_URI?.trim() || process.env.MONGO_URL?.trim()
  return uri || undefined
}

function getMongoDbName(): string {
  return process.env.MONGO_DB?.trim() || process.env.MONGO_DATABASE?.trim() || "rockmartialarts"
}

async function mongoClient(): Promise<MongoClient | null> {
  const uri = getMongoUri()
  if (!uri) return null
  if (!global.__popupFormMongoPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 })
    global.__popupFormMongoPromise = client.connect().catch((err) => {
      global.__popupFormMongoPromise = undefined
      throw err
    })
  }
  try {
    return await global.__popupFormMongoPromise
  } catch (err) {
    console.warn("[popup-form] Mongo unavailable:", err)
    return null
  }
}

async function readFromFile(): Promise<ResolvedPopupForm | null> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8")
    const parsed = JSON.parse(raw) as PopupFormSettings
    return normalizePopupFormForCms(parsed)
  } catch {
    return null
  }
}

async function writeToFile(settings: ResolvedPopupForm): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(settings, null, 2), "utf8")
}

async function readFromMongo(): Promise<ResolvedPopupForm | null> {
  const client = await mongoClient()
  if (!client) return null
  try {
    const row = await client
      .db(getMongoDbName())
      .collection<PopupFormDoc>("cms_popup_form")
      .findOne({ _id: DOC_ID })
    if (!row) return null
    const { _id: _ignored, ...rest } = row
    return normalizePopupFormForCms(rest)
  } catch (err) {
    console.warn("[popup-form] Mongo read failed:", err)
    return null
  }
}

async function writeToMongo(settings: ResolvedPopupForm): Promise<void> {
  const client = await mongoClient()
  if (!client) return
  try {
    await client.db(getMongoDbName()).collection("cms_popup_form").updateOne(
      { _id: DOC_ID },
      { $set: { ...settings, updated_at: new Date().toISOString() } },
      { upsert: true }
    )
  } catch (err) {
    console.warn("[popup-form] Mongo write failed:", err)
  }
}

export async function readPopupFormSettings(): Promise<ResolvedPopupForm> {
  const fromFile = await readFromFile()
  if (fromFile) return fromFile
  const fromMongo = await readFromMongo()
  if (fromMongo) {
    await writeToFile(fromMongo).catch(() => {})
    return fromMongo
  }
  return normalizePopupFormForCms(null)
}

export async function writePopupFormSettings(raw: PopupFormSettings): Promise<ResolvedPopupForm> {
  const settings = normalizePopupFormForCms(raw)
  await writeToFile(settings)
  void writeToMongo(settings)
  return settings
}
