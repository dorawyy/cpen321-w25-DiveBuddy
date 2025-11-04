import mongoose, { Schema } from 'mongoose';
import { z } from 'zod';

import {
  createEventSchema,
  IEvent,
  updateEventSchema,
  } from '../types/event.types';
import { SKILL_LEVELS } from '../constants/statics';
import logger from '../utils/logger.util';

const eventSchema = new Schema<IEvent>(
  {
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 1
    },
    date: {
        type: Date,
        required: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    skillLevel: {
      type: String,
      enum: SKILL_LEVELS,
      required: false,
      trim: true,
    },
    location: {
      type: String,
      required: false,
      trim: true,
    },
    latitude: {
      type: Number,
      required: false,
    },
    longitude: {
      type: Number,
      required: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    attendees: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    photo: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export class EventModel {
  private event: mongoose.Model<IEvent>;
    
  constructor() {
    this.event = mongoose.model<IEvent>('Event', eventSchema);
  }

  async create(eventData: z.infer<typeof createEventSchema>): Promise<IEvent> {
    try {
      const validatedData = createEventSchema.parse(eventData);

      return await this.event.create(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.issues);
        throw new Error('Invalid update data');
      }
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  async update(
    eventId: mongoose.Types.ObjectId,
    event: Partial<IEvent>
  ): Promise<IEvent | null> {
    try {
      const validatedData = updateEventSchema.parse(event);

      const updatedEvent = await this.event.findByIdAndUpdate(
        eventId,
        validatedData,
        {
          new: true,
        }
      );
      return updatedEvent;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.issues);
        throw new Error('Invalid update data');
      }
      logger.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  async delete(eventId: mongoose.Types.ObjectId): Promise<void> {
    try {
      await this.event.findByIdAndDelete(eventId);
    } catch (error) {
      logger.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  async findById(_id: mongoose.Types.ObjectId): Promise<IEvent | null> {
    try {
      const event = await this.event.findOne({ _id });

      if (!event) {
        return null;
      }

      return event;
    } catch (error) {
      console.error('Error finding event by event ID:', error);
      throw new Error('Failed to find event');
    }
  }

  async findAll(): Promise<IEvent[]> {
    try {
      return await this.event.find().sort({ date: -1 }).exec();
    } catch (error) {
      logger.error('Error fetching all events:', error);
      throw new Error('Failed to fetch events');
    }
  }
}

export const eventModel = new EventModel();
