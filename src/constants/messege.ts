export const MSG = {
    // System messages
    DB_CONNECTED: 'Database is connected successfully',
    SERVER_LISTENING: 'Server is listening on port',
    INTERNAL_SERVER_ERROR: 'Internal server error response',
    
    // Authentication messages
    LOGIN_SUCCESS: 'User is logged in successfully',
    USER_CREATED: 'User is created successfully',
    TOKEN_EXPIRED: 'Access token is not verified it may be expired',
    
    // Generic success message
    SUCCESS: (task: string) => `${task} completed successfully`,
  }
  
  export const ERROR_MSG = {
    // Database related
    DB_CONNECTION_FAILED: 'Database is not connected',
    INVALID_OBJECT_ID: 'Invalid object ID',
    
    // Field validation
    REQUIRED: (field: string) => `${field} is required to proceed`,
    EXISTS: (field: string) => `This ${field} already exists in our database`,
    NOT_FOUND: (field: string) => `${field} does not exist in our database`,
    
    // User related
    USER_EXISTS: 'Email ID already exists',
    USER_NOT_FOUND: 'User does not exist',
    USER_CREATE_FAILED: 'Failed to create user',
    USER_UPDATE_FAILED: 'Failed to update user',
    USER_RETRIEVE_FAILED: 'Failed to retrieve user',
    DELETED_USER_NOT_FOUND: 'No deleted user found',
    PASSWORD_MISMATCH: 'Password does not match',
    
    // Authorization
    INVALID_PERMISSION: (role: string, action: string = '') => 
      `${role} does not have permission to ${action}`,
      
    // Generic error messages
    DEFAULT_ERROR: 'Something went wrong',
    OPERATION_FAILED: {
      CREATE: (field: string) => `Failed to create ${field}`,
      UPDATE: (field: string) => `Failed to update ${field}`,
      DELETE: (field: string) => `Failed to delete ${field}`,
      RETRIEVE: (field: string) => `Failed to retrieve ${field}`,
    }
  }