import request from 'supertest';
import { describe, test, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import dotenv from 'dotenv';
import { setupTestDB, teardownTestDB } from '../tests.setup';
import { eventModel } from '../../src/models/event.model';
import { CreateEventRequest, UpdateEventRequest } from '../../src/types/event.types';
import express from 'express';
import eventRoutes from '../../src/routes/event.routes';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler.middleware';
import mongoose from 'mongoose';

dotenv.config();
const USER = process.env.USER_ID as string;

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock auth middleware - sets req.user for all routes
app.use((req: any, res, next) => {
	req.user = { 
		_id: new mongoose.Types.ObjectId(USER),
		email: 'test@example.com',
		name: 'Test User'
	};
	next();
});

app.use('/api/events', eventRoutes); // Mount event routes at /api/events
app.use('*', notFoundHandler);
app.use(errorHandler);

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('GET /api/events - unmocked (requires running server)', () => {
	test('returns list of events (200) when server is available', async () => {
		
		// make sure GET endpoint works
		const res = await request(app).get('/api/events');
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message');
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('events');
		expect(Array.isArray(res.body.data.events)).toBe(true);
	});
});

describe('GET /api/events/:eventId - unmocked (requires running server)', () => {
	test('returns event by ID (200) when server is available', async () => {
		
		// first create an event to ensure it exists
		const newEvent: CreateEventRequest = {
			title: "TEST GET EVENT",
			description: "TEST GET DESCRIPTION",
			date: new Date(),
			capacity: 10,
			skillLevel: "Expert",
			location: "Test Location",
			latitude: 37.7749,
			longitude: -122.4194,
			createdBy: USER,
			attendees: [],
			photo: ""
		};
		const created = await eventModel.create(newEvent);
		const createdId = created._id;
		
		// now fetch the event by ID through the API
		const res = await request(app).get(`/api/events/${createdId.toString()}`);

		// verify response
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message');
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('event');
		expect(res.body.data.event).toMatchObject({
			title: newEvent.title,
			description: newEvent.description,
			capacity: newEvent.capacity,
			skillLevel: newEvent.skillLevel,
			location: newEvent.location,
			latitude: newEvent.latitude,
			longitude: newEvent.longitude,
			createdBy: newEvent.createdBy,
			photo: newEvent.photo
		});
		
		// cleanup - delete the created event
		await eventModel.delete(createdId);
	});
});

describe('POST /api/events - unmocked (requires running server)', () => {
	test('creates a new event (201) when server is available', async () => {

		// new event data
		const newEvent = {
			title: "TEST EVENT",
			description: "TEST DESCRIPTION",
			date: new Date().toISOString(),
			capacity: 10,
			skillLevel: "Expert",
			location: "Test Location",
			latitude: 37.7749,
			longitude: -122.4194,
			createdBy: USER,
			attendees: [],
			photo: ""
		};

		// make sure POST endpoint works
		const res = (await request(app).post('/api/events').send(newEvent));
		expect(res.status).toBe(201);
		expect(res.body).toHaveProperty('message');
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('event');
		expect(res.body.data.event).toMatchObject(newEvent);

		// verify event was actually created in DB
		const eventInDb = await eventModel.findById(res.body.data.event._id);
		expect(eventInDb).not.toBeNull();
		expect(eventInDb?.title).toBe(newEvent.title);
		expect(eventInDb?.description).toBe(newEvent.description);
		expect(eventInDb?.date.toISOString()).toBe(newEvent.date);
		expect(eventInDb?.capacity).toBe(newEvent.capacity);
		expect(eventInDb?.skillLevel).toBe(newEvent.skillLevel);
		expect(eventInDb?.location).toBe(newEvent.location);
		expect(eventInDb?.latitude).toBe(newEvent.latitude);
		expect(eventInDb?.longitude).toBe(newEvent.longitude);
		expect(eventInDb?.createdBy.toString()).toBe(newEvent.createdBy);
		expect(eventInDb?.attendees.length).toBe(0);
		expect(eventInDb?.photo).toBe(newEvent.photo);

		// cleanup - delete the created event
		await eventModel.delete(eventInDb!._id);
	});

	test('returns error when creating event with invalid input - empty title', async () => {
		const invalidEvent: any = {
			title: "", // Invalid: empty string
			description: "TEST DESCRIPTION",
			date: new Date().toISOString(),
			capacity: 10,
			createdBy: USER,
			attendees: []
		};

		await expect(eventModel.create(invalidEvent)).rejects.toThrow('Invalid update data');
	});

	test('returns error when creating event with invalid input - negative capacity', async () => {
		const invalidEvent: any = {
			title: "Valid Title",
			description: "Valid Description",
			date: new Date().toISOString(),
			capacity: -5, // Invalid: negative capacity
			createdBy: USER,
			attendees: []
		};

		await expect(eventModel.create(invalidEvent)).rejects.toThrow('Invalid update data');
	});

	test('returns error when creating event with invalid input - capacity of 0', async () => {
		const invalidEvent: any = {
			title: "Valid Title",
			description: "Valid Description",
			date: new Date().toISOString(),
			capacity: 0, // Invalid: capacity must be at least 1
			createdBy: USER,
			attendees: []
		};

		await expect(eventModel.create(invalidEvent)).rejects.toThrow('Invalid update data');
	});

	test('returns error when creating event with invalid input - title exceeding max length', async () => {
		const invalidEvent: any = {
			title: "A".repeat(101), // Invalid: exceeds maxlength of 100
			description: "TEST DESCRIPTION",
			date: new Date().toISOString(),
			capacity: 10,
			createdBy: USER,
			attendees: []
		};

		await expect(eventModel.create(invalidEvent)).rejects.toThrow('Invalid update data');
	});
});

describe('PUT /api/events/join/:eventId - unmocked (requires running server)', () => {
	test('user joins an event (200) when server is available', async () => {
		
		// first create an event to ensure it exists
		const newEvent: CreateEventRequest = {
			title: "TEST JOIN EVENT",
			description: "TEST JOIN DESCRIPTION",
			date: new Date(),
			capacity: 10,
			skillLevel: "Beginner",
			location: "Join Location",
			latitude: 40.7128,
			longitude: -74.0060,
			createdBy: USER,
			attendees: [],
			photo: ""
		};
		const created = await eventModel.create(newEvent);
		const createdId = created._id;

		// make sure PUT join endpoint works
		const res = await request(app).put(`/api/events/join/${createdId.toString()}`);
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message');
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('event');

		// verify user was actually added to attendees in DB
		const eventInDb = await eventModel.findById(createdId);
		expect(eventInDb).not.toBeNull();
		expect(eventInDb?.attendees.map(a => a.toString())).toContain(USER);

		// cleanup - delete the created event
		await eventModel.delete(createdId);
	});
});

describe('PUT /api/events/leave/:eventId - unmocked (requires running server)', () => {
	test('user leaves an event (200) when server is available', async () => {
		
		// first create an event with the user as an attendee
		const newEvent: CreateEventRequest = {
			title: "TEST LEAVE EVENT",
			description: "TEST LEAVE DESCRIPTION",
			date: new Date(),
			capacity: 10,
			skillLevel: "Expert",
			location: "Leave Location",
			latitude: 51.5074,
			longitude: -0.1278,
			createdBy: USER,
			attendees: [USER],
			photo: ""
		};
		const created = await eventModel.create(newEvent);
		const createdId = created._id;

		// make sure PUT leave endpoint works
		const res = await request(app).put(`/api/events/leave/${createdId.toString()}`);
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message');
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('event');

		// verify user was actually removed from attendees in DB
		const eventInDb = await eventModel.findById(createdId);
		expect(eventInDb).not.toBeNull();
		expect(eventInDb?.attendees.map(a => a.toString())).not.toContain(USER);

		// cleanup - delete the created event
		await eventModel.delete(createdId);
	});
});

describe('PUT /api/events/:eventId - unmocked (requires running server)', () => {
	test('updates an event (200) when server is available', async () => {
		// first create an event to ensure it exists
		const newEvent: CreateEventRequest = {
			title: "TEST UPDATE EVENT",
			description: "TEST UPDATE DESCRIPTION",
			date: new Date(),
			capacity: 10,
			skillLevel: "Intermediate",
			location: "Initial Location",
			latitude: 34.0522,
			longitude: -118.2437,
			createdBy: USER,
			attendees: [],
			photo: ""
		};
		const created = await eventModel.create(newEvent);
		const createdId = created._id;

		// updated event data
		const updatedEvent: UpdateEventRequest = {
			title: "UPDATED TEST EVENT",
			description: "UPDATED TEST DESCRIPTION",
			date: new Date(),
			capacity: 20,
			skillLevel: "Expert",
			location: "Updated Location",
			latitude: 40.7128,
			longitude: -74.0060,
			attendees: [USER],
			photo: "updated_photo_url"
		};

		// make sure PUT endpoint works
		const res = await request(app).put(`/api/events/${createdId.toString()}`).send(updatedEvent);
		expect(res.body).toHaveProperty('message');
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveProperty('event');

		// verify event was actually updated in DB
		const eventInDb = await eventModel.findById(createdId);
		expect(eventInDb).not.toBeNull();
		expect(eventInDb?.title).toBe(updatedEvent.title);
		expect(eventInDb?.description).toBe(updatedEvent.description);
		// eventInDb.date is a Date object from mongoose — compare ISO strings
		expect(eventInDb?.date.toISOString()).toBe(updatedEvent.date.toISOString());
		expect(eventInDb?.capacity).toBe(updatedEvent.capacity);
		expect(eventInDb?.skillLevel).toBe(updatedEvent.skillLevel);
		expect(eventInDb?.location).toBe(updatedEvent.location);
		expect(eventInDb?.latitude).toBe(updatedEvent.latitude);
		expect(eventInDb?.longitude).toBe(updatedEvent.longitude);
		expect(eventInDb?.photo).toBe(updatedEvent.photo);
		expect(eventInDb?.attendees.map(a => a.toString())).toContain(USER);

		// cleanup - delete the created event
		await eventModel.delete(createdId);
	});

	test('returns error when updating event with invalid input - empty title', async () => {
		// first create an event to ensure it exists
		const newEvent: CreateEventRequest = {
			title: "TEST INVALID UPDATE EVENT",
			description: "TEST INVALID UPDATE DESCRIPTION",
			date: new Date(),
			capacity: 10,
			skillLevel: "Intermediate",
			location: "Initial Location",
			latitude: 34.0522,
			longitude: -118.2437,
			createdBy: USER,
			attendees: [],
			photo: ""
		};
		const created = await eventModel.create(newEvent);
		const createdId = created._id;
		
		const invalidUpdate: any = {
			title: "" // Empty string should fail validation
		};
		await expect(eventModel.update(createdId, invalidUpdate)).rejects.toThrow('Invalid update data');
		
		// cleanup - delete the created event
		await eventModel.delete(createdId);
	});
});

describe('DELETE /api/events/:eventId - unmocked (requires running server)', () => {
	test('delete an event (200) when server is available', async () => {
		
		// new event data (use CreateEventRequest shape: attendees and createdBy are strings)
		const newEvent: CreateEventRequest = {
			title: "TEST DELETE EVENT",
			description: "TEST DELETE DESCRIPTION",
			date: new Date(),
			capacity: 10,
			skillLevel: "Expert",
			location: "Test Location",
			latitude: 37.7749,
			longitude: -122.4194,
			createdBy: USER,
			attendees: [],
			photo: ""
		};

		// create via model (this will validate against createEventSchema)
		const created = await eventModel.create(newEvent);
		const createdId = created._id;

		// delete the event through the API (server must point to same DB when running)
		const delRes = await request(app)
			.delete(`/api/events/${createdId.toString()}`);

		expect(delRes.status).toBe(200);

		// verify deletion: event should no longer exist in DB
		const eventInDb = await eventModel.findById(createdId);
		expect(eventInDb).toBeNull();
	});
});
	
