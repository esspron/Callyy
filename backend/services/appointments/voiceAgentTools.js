/**
 * Voice Agent Appointment Booking Tool
 * 
 * Tool definition for AI voice agents to book appointments during calls.
 * This enables real-time appointment scheduling through voice conversations.
 */

/**
 * Appointment booking tool definition for voice agents
 * Compatible with function calling APIs (OpenAI, Vapi, etc.)
 */
const appointmentBookingTool = {
  type: 'function',
  function: {
    name: 'book_appointment',
    description: 'Book a showing, consultation, or meeting appointment with the real estate agent. Use this when the lead expresses interest in scheduling a meeting.',
    parameters: {
      type: 'object',
      properties: {
        appointment_type: {
          type: 'string',
          enum: [
            'showing',
            'listing_appointment',
            'buyer_consultation',
            'seller_consultation',
            'market_analysis',
            'open_house',
            'follow_up',
            'general',
          ],
          description: 'The type of appointment to schedule',
        },
        preferred_date: {
          type: 'string',
          description: 'The preferred date for the appointment in YYYY-MM-DD format',
        },
        preferred_time: {
          type: 'string',
          description: 'The preferred time in HH:MM format (24-hour)',
        },
        attendee_name: {
          type: 'string',
          description: "The name of the person to meet with (the lead's name)",
        },
        attendee_phone: {
          type: 'string',
          description: "The lead's phone number",
        },
        attendee_email: {
          type: 'string',
          description: "The lead's email address (optional)",
        },
        property_address: {
          type: 'string',
          description: 'The property address for showings or listing appointments',
        },
        notes: {
          type: 'string',
          description: 'Any additional notes or context from the conversation',
        },
        location_type: {
          type: 'string',
          enum: ['in_person', 'video', 'phone'],
          description: 'How the meeting will be conducted',
        },
      },
      required: ['appointment_type', 'preferred_date', 'preferred_time', 'attendee_name'],
    },
  },
};

/**
 * Check availability tool definition
 * Allows the voice agent to check available time slots before booking
 */
const checkAvailabilityTool = {
  type: 'function',
  function: {
    name: 'check_availability',
    description: 'Check available appointment times for a specific date. Use this when the lead wants to know what times are available.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to check availability for in YYYY-MM-DD format',
        },
        appointment_type: {
          type: 'string',
          enum: [
            'showing',
            'listing_appointment',
            'buyer_consultation',
            'seller_consultation',
            'market_analysis',
            'open_house',
            'follow_up',
            'general',
          ],
          description: 'The type of appointment (affects duration)',
        },
      },
      required: ['date'],
    },
  },
};

/**
 * Reschedule appointment tool definition
 */
const rescheduleAppointmentTool = {
  type: 'function',
  function: {
    name: 'reschedule_appointment',
    description: 'Reschedule an existing appointment to a new date and time.',
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'The ID of the appointment to reschedule',
        },
        new_date: {
          type: 'string',
          description: 'The new date in YYYY-MM-DD format',
        },
        new_time: {
          type: 'string',
          description: 'The new time in HH:MM format (24-hour)',
        },
        reason: {
          type: 'string',
          description: 'The reason for rescheduling',
        },
      },
      required: ['appointment_id', 'new_date', 'new_time'],
    },
  },
};

/**
 * Cancel appointment tool definition
 */
const cancelAppointmentTool = {
  type: 'function',
  function: {
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment.',
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'The ID of the appointment to cancel',
        },
        reason: {
          type: 'string',
          description: 'The reason for cancellation',
        },
      },
      required: ['appointment_id'],
    },
  },
};

/**
 * Get all appointment-related tools for voice agents
 */
function getAppointmentTools() {
  return [
    appointmentBookingTool,
    checkAvailabilityTool,
    rescheduleAppointmentTool,
    cancelAppointmentTool,
  ];
}

/**
 * Handle appointment tool calls from voice agents
 * 
 * @param {string} toolName - The name of the tool being called
 * @param {Object} args - The arguments passed to the tool
 * @param {Object} context - Context including userId, assistantId, callId, etc.
 * @returns {Object} - The result of the tool call
 */
async function handleAppointmentToolCall(toolName, args, context) {
  const { userId, assistantId, callId, leadId } = context;
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    switch (toolName) {
      case 'book_appointment': {
        const response = await fetch(`${baseUrl}/api/appointments/book-via-voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            assistantId,
            callId,
            appointmentType: args.appointment_type,
            preferredDate: args.preferred_date,
            preferredTime: args.preferred_time,
            attendeeName: args.attendee_name,
            attendeePhone: args.attendee_phone,
            attendeeEmail: args.attendee_email,
            propertyAddress: args.property_address,
            notes: args.notes,
            location: args.location_type || 'in_person',
            leadId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: result.error || 'Failed to book appointment',
            suggestion: result.suggestion || 'Please try a different time',
          };
        }

        return {
          success: true,
          message: `Great! I've scheduled your ${args.appointment_type.replace(/_/g, ' ')} for ${formatDateTime(args.preferred_date, args.preferred_time)}. You'll receive a confirmation shortly.`,
          appointment: result.appointment,
        };
      }

      case 'check_availability': {
        const response = await fetch(
          `${baseUrl}/api/appointments/availability?date=${args.date}&appointmentTypeId=${args.appointment_type || ''}`,
          {
            headers: {
              'x-user-id': userId,
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: 'Unable to check availability at the moment',
          };
        }

        const slots = result.slots || [];
        if (slots.length === 0) {
          return {
            success: true,
            message: `I'm sorry, there are no available times on ${formatDate(args.date)}. Would you like to try another day?`,
            slots: [],
          };
        }

        // Format available times for speech
        const timeList = slots.slice(0, 5).map((s) => formatTime(s.startTime)).join(', ');
        return {
          success: true,
          message: `On ${formatDate(args.date)}, I have the following times available: ${timeList}. Which works best for you?`,
          slots,
        };
      }

      case 'reschedule_appointment': {
        const response = await fetch(
          `${baseUrl}/api/appointments/${args.appointment_id}/reschedule`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              newDate: args.new_date,
              newTime: args.new_time,
              reason: args.reason,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: result.error || 'Unable to reschedule the appointment',
          };
        }

        return {
          success: true,
          message: `Done! I've rescheduled your appointment to ${formatDateTime(args.new_date, args.new_time)}. You'll receive an updated confirmation.`,
          appointment: result.appointment,
        };
      }

      case 'cancel_appointment': {
        const response = await fetch(`${baseUrl}/api/appointments/${args.appointment_id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            reason: args.reason,
            cancelledBy: 'attendee',
            notifyAttendee: false, // Already on call
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: result.error || 'Unable to cancel the appointment',
          };
        }

        return {
          success: true,
          message:
            "I've cancelled that appointment for you. Is there anything else I can help you with?",
        };
      }

      default:
        return {
          success: false,
          message: 'Unknown appointment tool',
        };
    }
  } catch (error) {
    console.error('Appointment tool call error:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error while processing your request. Please try again.',
    };
  }
}

// Helper functions for formatting
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr) {
  try {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function formatDateTime(dateStr, timeStr) {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`;
}

module.exports = {
  appointmentBookingTool,
  checkAvailabilityTool,
  rescheduleAppointmentTool,
  cancelAppointmentTool,
  getAppointmentTools,
  handleAppointmentToolCall,
};
