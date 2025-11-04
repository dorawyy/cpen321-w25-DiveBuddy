import request from 'supertest';
import { describe, test, expect, beforeAll, afterEach, afterAll, jest } from '@jest/globals';
import dotenv from 'dotenv';
import { setupTestDB, teardownTestDB } from '../tests.setup';
import { eventModel } from '../../src/models/event.model';
import { CreateEventRequest, UpdateEventRequest } from '../../src/types/event.types';
import express from 'express';
import eventRoutes from '../../src/routes/event.routes';
import mongoose from 'mongoose';

dotenv.config();
const USER = process.env.USER_ID as string;

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock auth middleware to set req.user
app.use('/api/events', (req: any, res: any, next: any) => {
    req.user = { _id: new mongoose.Types.ObjectId(USER) };
    next();
}, eventRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
    res.status(500).json({
        message: err.message || 'Internal server error',
    });
});

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/events - mocked', () => {
    test('returns 500 when database query fails', async () => {
        // Mock eventModel.findAll to throw an error
        jest.spyOn(eventModel, 'findAll').mockRejectedValue(new Error('Database connection failed'));

        // Make request
        const res = await request(app).get('/api/events');

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findAll).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when unexpected error occurs', async () => {
        // Mock eventModel.findAll to throw an unexpected error
        jest.spyOn(eventModel, 'findAll').mockRejectedValue(new Error('Unexpected error'));

        // Make request
        const res = await request(app).get('/api/events');

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findAll).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when database timeout occurs', async () => {
        // Mock eventModel.findAll to throw a timeout error
        jest.spyOn(eventModel, 'findAll').mockRejectedValue(new Error('Connection timeout'));

        // Make request
        const res = await request(app).get('/api/events');

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findAll).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when null pointer exception occurs', async () => {
        // Mock eventModel.findAll to throw null error
        jest.spyOn(eventModel, 'findAll').mockRejectedValue(new TypeError('Cannot read property of null'));

        // Make request
        const res = await request(app).get('/api/events');

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findAll).toHaveBeenCalledTimes(1);
    });

    test('findAll throws "Failed to fetch events" when database operation fails', async () => {
        // Mock the Event model's find method directly
        const Event = mongoose.model('Event');
        const mockExec = (jest.fn() as any).mockRejectedValue(new Error('Database connection lost'));
        const mockSort = (jest.fn() as any).mockReturnValue({ exec: mockExec });
        jest.spyOn(Event, 'find').mockReturnValue({ sort: mockSort } as any);

        await expect(eventModel.findAll()).rejects.toThrow('Failed to fetch events');
    });
});

describe('GET /api/events/:id - mocked', () => {
    
    test('returns 404 when event not found', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(null);

        // Make request
        const res = await request(app).get(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Event not found');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 400 when invalid event ID provided', async () => {
        // Make request with invalid ID
        const res = await request(app).get('/api/events/invalid-id');

        // Assertions
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Invalid event id');
    });

    test('returns 500 when database query fails', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to throw an error
        jest.spyOn(eventModel, 'findById').mockRejectedValue(new Error('Database error'));

        // Make request
        const res = await request(app).get(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when network error occurs', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to throw a network error
        jest.spyOn(eventModel, 'findById').mockRejectedValue(new Error('Network error'));

        // Make request
        const res = await request(app).get(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when memory error occurs', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to throw a memory error
        jest.spyOn(eventModel, 'findById').mockRejectedValue(new Error('Out of memory'));

        // Make request
        const res = await request(app).get(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('findById throws "Failed to find event" when database operation fails', async () => {
        // Mock the Event model's findOne method directly
        const Event = mongoose.model('Event');
        jest.spyOn(Event, 'findOne').mockRejectedValue(new Error('Database connection lost'));

        const testId = new mongoose.Types.ObjectId();
        await expect(eventModel.findById(testId)).rejects.toThrow('Failed to find event');
    });
});

describe('POST /api/events - mocked', () => {

    test('returns 500 when event creation fails', async () => {
        const newEventData = {
            title: 'New Test Event',
            description: 'New Test Description',
            date: new Date().toISOString(),
            capacity: 20,
            skillLevel: 'Intermediate',
            location: 'New Location',
            latitude: 40.7128,
            longitude: -74.0060,
            attendees: [],
            photo: '',
        };

        // Mock eventModel.create to throw an error
        jest.spyOn(eventModel, 'create').mockRejectedValue(new Error('Database error'));

        // Make request
        const res = await request(app).post('/api/events').send(newEventData);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.create).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when validation error occurs in database', async () => {
        const newEventData = {
            title: 'New Test Event',
            description: 'New Test Description',
            date: new Date().toISOString(),
            capacity: 20,
            skillLevel: 'Intermediate',
            location: 'New Location',
            latitude: 40.7128,
            longitude: -74.0060,
            attendees: [],
            photo: '',
        };

        // Mock eventModel.create to throw a validation error
        jest.spyOn(eventModel, 'create').mockRejectedValue(new Error('Validation failed'));

        // Make request
        const res = await request(app).post('/api/events').send(newEventData);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.create).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when duplicate key error occurs', async () => {
        const newEventData = {
            title: 'New Test Event',
            description: 'New Test Description',
            date: new Date().toISOString(),
            capacity: 20,
            skillLevel: 'Intermediate',
            location: 'New Location',
            latitude: 40.7128,
            longitude: -74.0060,
            attendees: [],
            photo: '',
        };

        // Mock eventModel.create to throw a duplicate key error
        jest.spyOn(eventModel, 'create').mockRejectedValue(new Error('Duplicate key error'));

        // Make request
        const res = await request(app).post('/api/events').send(newEventData);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.create).toHaveBeenCalledTimes(1);
    });

    test('create throws "Failed to create event" when database operation fails', async () => {
        // Mock the Event model's create method directly
        const Event = mongoose.model('Event');
        jest.spyOn(Event, 'create').mockRejectedValue(new Error('Database connection lost'));

        const validEventData: any = {
            title: 'Test Event',
            description: 'Test Description',
            date: new Date(),
            capacity: 10,
            createdBy: new mongoose.Types.ObjectId().toString(),
            attendees: []
        };

        await expect(eventModel.create(validEventData)).rejects.toThrow('Failed to create event');
    });
});

describe('PUT /api/events/:id - mocked', () => {
    
    test('returns 404 when event not found', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const updateData = { 
            title: 'Updated Title',
            description: 'Updated Description',
            date: new Date().toISOString(),
            capacity: 15,
            attendees: [],
        };

        // Mock eventModel.findById to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(null);

        // Make request
        const res = await request(app).put(`/api/events/${mockEventId.toString()}`).send(updateData);

        // Assertions
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Event not found');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 400 when invalid data provided', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const updateData = { title: 123 }; // Invalid type

        // Make request with invalid data
        const res = await request(app).put(`/api/events/${mockEventId.toString()}`).send(updateData);

        // Assertions
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Invalid input data');
    });

    test('returns 500 when update fails', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const existingEvent = {
            _id: mockEventId,
            title: 'Old Title',
        };
        const updateData = { 
            title: 'Updated Title',
            description: 'Updated Description',
            date: new Date().toISOString(),
            capacity: 15,
            attendees: [],
        };

        // Mock eventModel.findById to succeed but update to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);
        jest.spyOn(eventModel, 'update').mockResolvedValue(null);

        // Make request
        const res = await request(app).put(`/api/events/${mockEventId.toString()}`).send(updateData);

        // Assertions
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Failed to update event');
    });

    test('returns 500 when database error occurs during findById', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const updateData = { 
            title: 'Updated Title',
            description: 'Updated Description',
            date: new Date().toISOString(),
            capacity: 15,
            attendees: [],
        };

        // Mock eventModel.findById to throw error
        jest.spyOn(eventModel, 'findById').mockRejectedValue(new Error('Database connection lost'));

        // Make request
        const res = await request(app).put(`/api/events/${mockEventId.toString()}`).send(updateData);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when update throws error', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const existingEvent = {
            _id: mockEventId,
            title: 'Old Title',
        };
        const updateData = { 
            title: 'Updated Title',
            description: 'Updated Description',
            date: new Date().toISOString(),
            capacity: 15,
            attendees: [],
        };

        // Mock eventModel.findById to succeed but update to throw error
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);
        jest.spyOn(eventModel, 'update').mockRejectedValue(new Error('Update failed'));

        // Make request
        const res = await request(app).put(`/api/events/${mockEventId.toString()}`).send(updateData);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.update).toHaveBeenCalledTimes(1);
    });

    test('update throws "Failed to update event" when database operation fails', async () => {
        // Mock the Event model's findByIdAndUpdate method directly
        const Event = mongoose.model('Event');
        jest.spyOn(Event, 'findByIdAndUpdate').mockRejectedValue(new Error('Database connection lost'));

        const testId = new mongoose.Types.ObjectId();
        const updateData: any = {
            title: 'Updated Title',
            description: 'Updated Description',
            date: new Date(),
            capacity: 15,
            attendees: []
        };

        await expect(eventModel.update(testId, updateData)).rejects.toThrow('Failed to update event');
    });
});

describe('PUT /api/events/join/:id - mocked', () => {

    test('returns 400 when user already joined', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const mockUserId = new mongoose.Types.ObjectId(USER);
        
        // Create a mock attendees array with includes method
        const mockAttendees = [mockUserId];
        (mockAttendees as any).includes = function(id: any) {
            return this.some((attendeeId: any) => attendeeId.equals(id));
        };
        
        const existingEvent = {
            _id: mockEventId,
            attendees: mockAttendees,
            capacity: 10,
        };

        // Mock eventModel.findById
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);

        // Make request
        const res = await request(app).put(`/api/events/join/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('User already joined the event');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 400 when event is at full capacity', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const existingEvent = {
            _id: mockEventId,
            attendees: [
                new mongoose.Types.ObjectId(),
                new mongoose.Types.ObjectId(),
            ],
            capacity: 2,
        };

        // Mock eventModel.findById
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);

        // Make request
        const res = await request(app).put(`/api/events/join/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Event is at full capacity');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 404 when event not found', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(null);

        // Make request
        const res = await request(app).put(`/api/events/join/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Event not found');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when database error occurs during join', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to throw error
        jest.spyOn(eventModel, 'findById').mockRejectedValue(new Error('Database error'));

        // Make request
        const res = await request(app).put(`/api/events/join/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when update fails after join', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const mockUserId = new mongoose.Types.ObjectId(USER);
        const existingEvent = {
            _id: mockEventId,
            title: 'Test Event',
            attendees: [],
            capacity: 10,
            toObject: () => ({
                _id: mockEventId,
                title: 'Test Event',
                attendees: [],
                capacity: 10,
                __v: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
        };

        // Mock eventModel.findById to succeed but update to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);
        jest.spyOn(eventModel, 'update').mockResolvedValue(null);

        // Make request
        const res = await request(app).put(`/api/events/join/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Failed to update event');
    });
});

describe('PUT /api/events/leave/:id - mocked', () => {

    test('returns 400 when user is not an attendee', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const existingEvent = {
            _id: mockEventId,
            attendees: [],
        };

        // Mock eventModel.findById
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);

        // Make request
        const res = await request(app).put(`/api/events/leave/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('User is not an attendee of the event');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 404 when event not found', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(null);

        // Make request
        const res = await request(app).put(`/api/events/leave/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Event not found');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when database error occurs during leave', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to throw error
        jest.spyOn(eventModel, 'findById').mockRejectedValue(new Error('Database connection error'));

        // Make request
        const res = await request(app).put(`/api/events/leave/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when update fails after leave', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const mockUserId = new mongoose.Types.ObjectId(USER);
        
        // Create mock attendees array with all needed methods
        const mockAttendees = [mockUserId];
        (mockAttendees as any).includes = function(id: any) {
            return this.some((attendeeId: any) => attendeeId.equals(id));
        };
        (mockAttendees as any).filter = function(callback: any) {
            return Array.prototype.filter.call(this, callback);
        };
        (mockAttendees as any).map = function(callback: any) {
            return Array.prototype.map.call(this, callback);
        };
        
        const existingEvent = {
            _id: mockEventId,
            title: 'Test Event',
            description: 'Test Description',
            date: new Date(),
            capacity: 10,
            skillLevel: 'Beginner',
            location: 'Test Location',
            latitude: 37.7749,
            longitude: -122.4194,
            createdBy: new mongoose.Types.ObjectId(),
            attendees: mockAttendees,
            photo: '',
            toObject: () => ({
                _id: mockEventId,
                title: 'Test Event',
                description: 'Test Description',
                date: new Date(),
                capacity: 10,
                skillLevel: 'Beginner',
                location: 'Test Location',
                latitude: 37.7749,
                longitude: -122.4194,
                createdBy: new mongoose.Types.ObjectId(),
                attendees: mockAttendees,
                photo: '',
                __v: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
        };

        // Mock eventModel.findById to succeed but update to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);
        jest.spyOn(eventModel, 'update').mockResolvedValue(null);

        // Make request
        const res = await request(app).put(`/api/events/leave/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Failed to update event');
    });
});

describe('DELETE /api/events/:id - mocked', () => {

    test('returns 404 when event not found', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to return null
        jest.spyOn(eventModel, 'findById').mockResolvedValue(null);

        // Make request
        const res = await request(app).delete(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Event not found');
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 400 when invalid event ID provided', async () => {
        // Make request with invalid ID
        const res = await request(app).delete('/api/events/invalid-id');

        // Assertions
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Invalid event id');
    });

    test('returns 500 when delete fails', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const existingEvent = {
            _id: mockEventId,
            title: 'Test Event',
        };

        // Mock eventModel.findById to succeed but delete to fail
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);
        jest.spyOn(eventModel, 'delete').mockRejectedValue(new Error('Database error'));

        // Make request
        const res = await request(app).delete(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
        expect(eventModel.delete).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when database error occurs during findById for delete', async () => {
        const mockEventId = new mongoose.Types.ObjectId();

        // Mock eventModel.findById to throw error
        jest.spyOn(eventModel, 'findById').mockRejectedValue(new Error('Cannot connect to database'));

        // Make request
        const res = await request(app).delete(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.findById).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when permission error occurs', async () => {
        const mockEventId = new mongoose.Types.ObjectId();
        const existingEvent = {
            _id: mockEventId,
            title: 'Test Event',
        };

        // Mock eventModel.findById to succeed but delete to throw permission error
        jest.spyOn(eventModel, 'findById').mockResolvedValue(existingEvent as any);
        jest.spyOn(eventModel, 'delete').mockRejectedValue(new Error('Permission denied'));

        // Make request
        const res = await request(app).delete(`/api/events/${mockEventId.toString()}`);

        // Assertions
        expect(res.status).toBe(500);
        expect(eventModel.delete).toHaveBeenCalledTimes(1);
    });

    test('delete throws "Failed to delete event" when database operation fails', async () => {
        // Mock the Event model's findByIdAndDelete method directly
        const Event = mongoose.model('Event');
        jest.spyOn(Event, 'findByIdAndDelete').mockRejectedValue(new Error('Database connection lost'));

        const testId = new mongoose.Types.ObjectId();
        await expect(eventModel.delete(testId)).rejects.toThrow('Failed to delete event');
    });
});
