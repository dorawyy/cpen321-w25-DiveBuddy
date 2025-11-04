import request from 'supertest';
import { describe, test, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import dotenv from 'dotenv';
import { setupTestDB, teardownTestDB } from '../tests.setup';
import { eventModel } from '../../src/models/event.model';
import { CreateEventRequest, UpdateEventRequest } from '../../src/types/event.types';
import { CreateUserRequest, UpdateProfileRequest } from '../../src/types/user.types';
import { userModel } from '../../src/models/user.model';
import { AuthenticateUserRequest } from '../../src/types/auth.types';
import express from 'express';
import userRoutes from '../../src/routes/user.routes';
import authRoutes from '../../src/routes/auth.routes';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler.middleware';
import { authenticateToken } from '../../src/middleware/auth.middleware';
import mongoose from 'mongoose';

dotenv.config();
const USER = process.env.USER_ID as string;

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock auth middleware - sets req.user for all routes EXCEPT /api/auth and DELETE /api/users
app.use((req: any, res, next) => {
    // Skip mock auth for /api/auth routes (they handle their own auth)
    if (req.path.startsWith('/api/auth')) {
        return next();
    }

    // Skip mock auth for DELETE /api/users - will use real authenticateToken instead
    if (req.method === 'DELETE' && req.path === '/api/users') {
        return authenticateToken(req, res, next);
    }
    
    req.user = { 
        _id: new mongoose.Types.ObjectId(USER),
        email: 'test@example.com',
        name: 'Test User'
    };
    next();
});

app.use('/api/users', userRoutes); // Mount user routes at /api/users
app.use('/api/auth', authRoutes); // Mount auth routes at /api/auth
app.use('*', notFoundHandler);
app.use(errorHandler);

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('GET /api/users - unmocked (requires running server)', () => {
    test('returns list of users (200) when server is available', async () => {
        
        // make sure GET endpoint works
        const res = await request(app).get('/api/users');//.set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('users');
        expect(Array.isArray(res.body.data.users)).toBe(true);
    });
});

describe('GET /api/users/profile - unmocked (requires running server)', () => {
    test('returns current user (200) when server is available', async () => {
        // call the endpoint
        const res = await request(app).get('/api/users/profile');//.set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data.user).toHaveProperty('_id');

        // verify returned user is the expected one
        expect(res.body.data.user._id).toBe(USER);
      });
});

describe('GET /api/users/:id - unmocked (requires running server)', () => {
    test('returns user by ID (200) when server is available', async () => {
        // call the endpoint
        const res = await request(app).get(`/api/users/${USER}`);//.set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data.user).toHaveProperty('_id');

        // verify returned user is the expected one
        expect(res.body.data.user._id).toBe(USER);
      });
});

describe('PUT /api/users/:id - unmocked (requires running server)', () => {
    test('returns user by ID (200) when server is available', async () => {

        const updateData: UpdateProfileRequest = {
            name: "Updated Name PUT",
            age: 30,
            bio: "This is an updated bio PUT request.",
            location: "Updated Location",
            latitude: 40.7128,
            longitude: -74.0060,
            profilePicture: "http://example.com/updated-profile-pic.jpg",
            skillLevel: "Intermediate"
        };
        
        // call the endpoint
        const res = await request(app).put(`/api/users/${USER}`).send(updateData);//.set('Authorization', `Bearer ${TOKEN}`).send(updateData);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data.user).toHaveProperty('_id');

        // verify returned user is the expected one
        expect(res.body.data.user._id).toBe(USER);
        expect(res.body.data.user.name).toBe(updateData.name);
        expect(res.body.data.user.age).toBe(updateData.age);
        expect(res.body.data.user.bio).toBe(updateData.bio);
        expect(res.body.data.user.location).toBe(updateData.location);
        expect(res.body.data.user.latitude).toBe(updateData.latitude);
        expect(res.body.data.user.longitude).toBe(updateData.longitude);
        expect(res.body.data.user.profilePicture).toBe(updateData.profilePicture);
        expect(res.body.data.user.skillLevel).toBe(updateData.skillLevel);
      });
});

describe('POST /api/users/ - unmocked (requires running server)', () => {
    test('returns user (200) when server is available', async () => {

        const updateData: UpdateProfileRequest = {
            name: "Updated Name POST",
            age: 30,
            bio: "This is an updated bio POST request.",
            location: "Updated Location",
            latitude: 40.7128,
            longitude: -74.0060,
            profilePicture: "http://example.com/updated-profile-pic.jpg",
            skillLevel: "Intermediate"
        };
        
        // call the endpoint
        const res = await request(app).post(`/api/users/`).send(updateData);//.set('Authorization', `Bearer ${TOKEN}`).send(updateData);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data.user).toHaveProperty('_id');

        // verify returned user is the expected one
        expect(res.body.data.user._id).toBe(USER);
        expect(res.body.data.user.name).toBe(updateData.name);
        expect(res.body.data.user.age).toBe(updateData.age);
        expect(res.body.data.user.bio).toBe(updateData.bio);
        expect(res.body.data.user.location).toBe(updateData.location);
        expect(res.body.data.user.latitude).toBe(updateData.latitude);
        expect(res.body.data.user.longitude).toBe(updateData.longitude);
        expect(res.body.data.user.profilePicture).toBe(updateData.profilePicture);
        expect(res.body.data.user.skillLevel).toBe(updateData.skillLevel);
      });

    test('returns 400 validation error with invalid payload', async () => {
        const invalidData = {
            name: "", // Invalid: empty string
            age: -5, // Invalid: negative age
            bio: "a".repeat(501), // Invalid: exceeds max length (assuming 500 char limit)
            bad_data: "InvalidLevel" // Invalid: not a valid skill level
        };
        
        const res = await request(app).post(`/api/users/`).send(invalidData);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });
});

describe('DELETE /api/users/:id - unmocked (requires running server)', () => {
    test('returns success (200) when server is available and user deleted', async () => {

        const createData: CreateUserRequest = {
            email: "test@example.com",
            name: "Test User",
            googleId: "test-google-id",
            age: 25,
            profilePicture: "http://example.com/profile-pic.jpg",
            bio: "This is a test bio.",
            location: "Test Location",
            latitude: 34.0522,
            longitude: -118.2437,
            skillLevel: "Beginner"

        };

        const createdUser = await userModel.create(createData);
        const deletedUserId = createdUser._id;
        
        // call the endpoint
        const res = await request(app).delete(`/api/users/${deletedUserId.toString()}`);//.set('Authorization', `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        
        // verify user is deleted
        const fetchedUser = await userModel.findById(deletedUserId);
        expect(fetchedUser).toBeNull();
      });
});

describe('DELETE /api/users/ - unmocked (requires running server)', () => {
    test('returns success (200) when server is available and user deleted', async () => {

        // Generate unique googleId to avoid duplicates
        const uniqueGoogleId = `test-google-id-delete-${Date.now()}`;
        
        // Create user directly in DB instead of using Google auth
        const createData: CreateUserRequest = {
            email: `test-delete-${Date.now()}@example.com`,
            name: "Test Delete User",
            googleId: uniqueGoogleId,
            age: 25,
            profilePicture: "http://example.com/profile-pic.jpg",
            bio: "This is a test bio for deletion.",
            location: "Test Location",
            latitude: 34.0522,
            longitude: -118.2437,
            skillLevel: "Beginner"
        };

        const createdUser = await userModel.create(createData);
        const deletedUserId = createdUser._id;
        
        // Generate a token for this user
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: deletedUserId }, process.env.JWT_SECRET!, {
            expiresIn: '1h',
        });
        
        // call the endpoint with the generated token
        const deleteRes = await request(app).delete('/api/users').set('Authorization', `Bearer ${token}`);
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body).toHaveProperty('message');
        
        // verify user is deleted
        const fetchedUser = await userModel.findById(deletedUserId);
        expect(fetchedUser).toBeNull();
      });
});
