import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import i18nextMiddleware from 'i18next-http-middleware';
import i18n from '~/i18n/config';
import { TranscriptModel } from '~/models/transcript.model';
import { UserModel } from '~/models/user.model';
import { createTranscript, getTranscripts } from '~/controllers/transcript.controller';
import { transcribeAudio } from '~/services/groq.service';
import { utcDay } from '~/services/usage.service';
import { asyncHandler } from '~/utils/asyncHandler';

vi.mock('~/config/env', () => ({ env: {} }));
// Provider SDKs construct clients at import time (no keys in tests); STT results are stubbed per test
vi.mock('~/services/groq.service', () => ({ transcribeAudio: vi.fn() }));
vi.mock('~/services/deepgram.service', () => ({ transcribeAudio: vi.fn() }));
vi.mock('~/services/translation.service', () => ({ translateText: vi.fn() }));
vi.mock('~/config/paddle', () => ({ paddle: {} }));

const USER_ID = 'user-1';

function buildApp(userId = USER_ID) {
  const app = express();
  app.use(i18nextMiddleware.handle(i18n));
  app.use((req, _res, next) => {
    req.user = { id: userId, email: 'test@example.com' };
    next();
  });
  app.get('/transcripts', asyncHandler(getTranscripts));
  // Stands in for multer: a real temp file, since the controller deletes it after STT
  app.post('/transcripts', (req, _res, next) => {
    const filePath = path.join(os.tmpdir(), `voca-test-${Date.now()}-${Math.random()}.webm`);
    fs.writeFileSync(filePath, 'audio');
    req.file = { path: filePath } as Express.Multer.File;
    next();
  }, asyncHandler(createTranscript));
  return app;
}

let userCounter = 0;
async function createUser(privacyMode: boolean) {
  userCounter++;
  return UserModel.create({
    email: `tr${userCounter}@example.com`,
    name: 'Test User',
    provider: 'google',
    providerId: `google_tr_${userCounter}`,
    settings: { privacyMode },
  });
}

function mockStt(hallucination = false) {
  vi.mocked(transcribeAudio).mockResolvedValueOnce({
    text: 'hello world',
    language: 'en',
    duration: 42,
    cost: 0.001,
    hallucination,
  });
}

async function seed(count: number, userId = USER_ID) {
  // Sequential inserts so ObjectIds (and createdAt) are strictly increasing
  for (let i = 0; i < count; i++) {
    await TranscriptModel.create({ text: `t${i}`, duration: 1, language: 'en', userId });
  }
}

describe('GET /transcripts', () => {
  it('should page newest first with limit and before', async () => {
    await seed(5);
    await seed(2, 'someone-else');
    const app = buildApp();

    const first = await request(app).get('/transcripts?limit=2');
    expect(first.status).toBe(200);
    expect(first.body.data.map((t: { text: string }) => t.text)).toEqual(['t4', 't3']);

    const second = await request(app).get(`/transcripts?limit=2&before=${first.body.data[1].id}`);
    expect(second.body.data.map((t: { text: string }) => t.text)).toEqual(['t2', 't1']);

    const last = await request(app).get(`/transcripts?limit=2&before=${second.body.data[1].id}`);
    expect(last.body.data.map((t: { text: string }) => t.text)).toEqual(['t0']);
  });

  it('should return the whole (capped) list to clients that send no params', async () => {
    await seed(3);
    const res = await request(buildApp()).get('/transcripts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0]).toMatchObject({ text: 't2', duration: 1, language: 'en' });
    expect(res.body.data[0]).not.toHaveProperty('_id');
  });

  it.each(['limit=0', 'limit=101', 'limit=abc', 'before=nope'])('should 400 on invalid query %s', async (query) => {
    const res = await request(buildApp()).get(`/transcripts?${query}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /transcripts', () => {
  it('should save the transcript and count its audio', async () => {
    const user = await createUser(false);
    mockStt();

    const res = await request(buildApp(user._id.toString())).post('/transcripts');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ text: 'hello world', duration: 42 });
    expect(await TranscriptModel.findById(res.body.data.id)).not.toBeNull();

    const updated = await UserModel.findById(user._id).lean();
    expect(updated).toMatchObject({ usageDay: utcDay(), usageSeconds: 42 });
  });

  it('should never write the transcript in privacy mode', async () => {
    const user = await createUser(true);
    mockStt();

    const res = await request(buildApp(user._id.toString())).post('/transcripts');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ text: 'hello world', duration: 42 });
    expect(res.body.data.id).toMatch(/^[0-9a-f]{24}$/);
    expect(Date.parse(res.body.data.createdAt)).not.toBeNaN();
    expect(await TranscriptModel.countDocuments()).toBe(0);
  });

  it('should count no-speech audio too, since STT was billed', async () => {
    const user = await createUser(false);
    mockStt(true);

    const res = await request(buildApp(user._id.toString())).post('/transcripts');
    expect(res.status).toBe(422);
    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.usageSeconds).toBe(42);
  });
});
